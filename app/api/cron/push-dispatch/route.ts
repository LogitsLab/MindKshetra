import { NextResponse, type NextRequest } from "next/server";
import { getVerseOfTheDaySelection } from "@/lib/day-seed";
import {
  filterStreakEligible,
  selectDueCandidates,
  type Candidate,
  type PrefRow,
} from "@/lib/push-cohort";
import {
  dailyVerseCopy,
  normalizePushLang,
  streakReminderCopy,
} from "@/lib/push-copy";
import { sendExpoPush, type PushMessage } from "@/lib/push";
import { formatVerseRef } from "@/lib/sloka-utils";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Half-hourly push dispatcher, driven by .github/workflows/push-dispatch.yml
 * (Vercel cron is day-granular on this plan; local-hour windows need ~30-min
 * ticks and GitHub cron jitter of a few minutes is fine for a morning verse).
 *
 * Cohorts per tick:
 *   daily_verse     — notif_daily_verse at the user's chosen local hour
 *   streak_reminder — notif_streak_reminder at 20:00 local when yesterday
 *                     was the last visit and a streak >= 2 is alive
 *
 * Each keyset page is processed END-TO-END (ledger → tokens → send) before
 * the next page is fetched: no query ever serializes more than one page of
 * user ids (PostgREST URL limits), and a mid-run timeout burns the send
 * ledger for at most the in-flight page instead of the whole cohort.
 * push_sends (user, kind, local-day) is inserted BEFORE that page's send:
 * a rerun can skip a user, never double-ping them.
 */
/** Keyset page size for the prefs scan; a flat cap froze out user_ids sorting past it. */
const PAGE_SIZE = 1000;
/** Safety ceiling (20k opted-in rows/tick) — hitting it warns instead of looping forever. */
const MAX_PAGES = 20;
/** Newest tokens per user actually sent to — bounds the blast radius of one account. */
const MAX_TOKENS_PER_USER = 3;
/** PostgREST .in() lists ride the query string — keep them well under URL limits. */
const IN_CHUNK = 200;
/** Ledger upsert batch size. */
const UPSERT_CHUNK = 500;

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();

  const selection = await getVerseOfTheDaySelection(now);
  const ref = selection ? formatVerseRef(selection.sloka) : "";

  const totals = {
    sent: 0,
    attempted: 0,
    stale: 0,
    deduped: 0,
    cohorts: { daily_verse: 0, streak_reminder: 0 },
  };

  let lastId: string | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    let filters = admin
      .from("user_preferences")
      .select(
        "user_id, timezone, preferred_language, notif_daily_verse, notif_daily_verse_hour, notif_streak_reminder"
      )
      .or("notif_daily_verse.eq.true,notif_streak_reminder.eq.true");
    if (lastId) filters = filters.gt("user_id", lastId);

    const { data: prefs, error } = await filters
      .order("user_id", { ascending: true })
      .limit(PAGE_SIZE);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const batch = (prefs ?? []) as PrefRow[];
    if (batch.length) {
      const pageResult = await dispatchPage(admin, batch, now, ref);
      totals.sent += pageResult.sent;
      totals.attempted += pageResult.attempted;
      totals.stale += pageResult.stale;
      totals.deduped += pageResult.deduped;
      totals.cohorts.daily_verse += pageResult.cohorts.daily_verse;
      totals.cohorts.streak_reminder += pageResult.cohorts.streak_reminder;
      lastId = batch[batch.length - 1].user_id;
    }

    if (batch.length < PAGE_SIZE) break;
    if (page === MAX_PAGES - 1) {
      // Warn only when someone actually sorts beyond the ceiling — an
      // exactly-full final page with nothing after it is not a skip.
      const { data: probe } = await admin
        .from("user_preferences")
        .select("user_id")
        .or("notif_daily_verse.eq.true,notif_streak_reminder.eq.true")
        .gt("user_id", lastId ?? "")
        .limit(1);
      if (probe?.length) {
        console.warn(
          `[push-dispatch] hit the ${MAX_PAGES}-page scan ceiling; user_ids beyond ${lastId} were skipped this tick`
        );
      }
    }
  }

  return NextResponse.json({ ok: true, ...totals });
}

/** One page, end-to-end: eligibility → ledger claim → tokens → send. */
async function dispatchPage(
  admin: ReturnType<typeof createAdminClient>,
  rows: PrefRow[],
  now: Date,
  ref: string
): Promise<{
  sent: number;
  attempted: number;
  stale: number;
  deduped: number;
  cohorts: { daily_verse: number; streak_reminder: number };
}> {
  const empty = {
    sent: 0,
    attempted: 0,
    stale: 0,
    deduped: 0,
    cohorts: { daily_verse: 0, streak_reminder: 0 },
  };

  const due = selectDueCandidates(rows, now);
  if (!due.length) return empty;

  // Streak eligibility: yesterday-local was the last visit, streak alive.
  const streakUserIds = due
    .filter((d) => d.kind === "streak_reminder")
    .map((d) => d.row.user_id);
  const streakByUser = new Map<string, { current: number; last: string }>();
  for (const ids of chunk(streakUserIds, IN_CHUNK)) {
    const { data: streaks } = await admin
      .from("user_streaks")
      .select("user_id, current_streak, last_visit_date")
      .in("user_id", ids)
      .gte("current_streak", 2);
    for (const s of streaks ?? []) {
      streakByUser.set(s.user_id, {
        current: s.current_streak,
        last: s.last_visit_date,
      });
    }
  }

  const candidates = filterStreakEligible(due, streakByUser);
  if (!candidates.length) return empty;

  // Idempotency gate: claim send rows first; conflicts drop out silently.
  const insertedKeys = new Set<string>();
  for (const batch of chunk(candidates, UPSERT_CHUNK)) {
    const { data: inserted } = await admin
      .from("push_sends")
      .upsert(
        batch.map((c) => ({
          user_id: c.row.user_id,
          kind: c.kind,
          sent_on: c.day,
        })),
        { onConflict: "user_id,kind,sent_on", ignoreDuplicates: true }
      )
      .select("user_id, kind");
    for (const r of inserted ?? []) {
      insertedKeys.add(`${r.user_id}:${r.kind}`);
    }
  }

  const toSend = candidates.filter((c) =>
    insertedKeys.has(`${c.row.user_id}:${c.kind}`)
  );
  if (!toSend.length) {
    return { ...empty, deduped: candidates.length };
  }

  const userIds = Array.from(new Set(toSend.map((c) => c.row.user_id)));
  const tokensByUser = new Map<string, string[]>();
  for (const ids of chunk(userIds, IN_CHUNK)) {
    const { data: tokens } = await admin
      .from("push_tokens")
      .select("user_id, token")
      .in("user_id", ids)
      .is("disabled_at", null)
      .order("last_seen_at", { ascending: false })
      .limit(ids.length * MAX_TOKENS_PER_USER * 2);
    // Rows arrive newest-first, so per-user insertion order preserves that:
    // keeping the first MAX_TOKENS_PER_USER per user keeps the newest devices.
    for (const t of tokens ?? []) {
      const list = tokensByUser.get(t.user_id) ?? [];
      if (list.length >= MAX_TOKENS_PER_USER) continue;
      list.push(t.token);
      tokensByUser.set(t.user_id, list);
    }
  }

  const messages: PushMessage[] = [];
  const cohorts = { daily_verse: 0, streak_reminder: 0 };
  for (const c of toSend) {
    const userTokens = tokensByUser.get(c.row.user_id) ?? [];
    if (!userTokens.length) continue;
    const lang = normalizePushLang(c.row.preferred_language);
    const copy =
      c.kind === "daily_verse"
        ? dailyVerseCopy(lang, ref)
        : streakReminderCopy(
            lang,
            streakByUser.get(c.row.user_id)?.current ?? 2
          );
    const url =
      c.kind === "daily_verse"
        ? "mindkshetra://verse-of-the-day"
        : "mindkshetra://sadhana";
    cohorts[c.kind] += userTokens.length;
    for (const token of userTokens) {
      messages.push({
        to: token,
        title: copy.title,
        body: copy.body,
        data: { url, kind: c.kind },
      });
    }
  }

  const result = await sendExpoPush(messages);
  let stale = 0;
  for (const tokens of chunk(result.staleTokens, IN_CHUNK)) {
    if (!tokens.length) continue;
    await admin
      .from("push_tokens")
      .update({ disabled_at: new Date().toISOString() })
      .in("token", tokens);
    stale += tokens.length;
  }

  return {
    sent: result.ok,
    attempted: result.attempted,
    stale,
    deduped: candidates.length - toSend.length,
    cohorts,
  };
}
