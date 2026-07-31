import { NextResponse, type NextRequest } from "next/server";
import { getVerseOfTheDaySelection } from "@/lib/day-seed";
import { localDayString, isValidTimezone, dayDiff } from "@/lib/practice-streaks";
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
 * push_sends (user, kind, local-day) is inserted BEFORE sending: a rerun can
 * skip a user, never double-ping them. Quiet failure is the worse of the two
 * only for a reminder, and the next day always comes.
 */
const FALLBACK_TZ = "Asia/Kolkata";
const STREAK_HOUR = 20;
const COHORT_CAP = 2000;

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

type PrefRow = {
  user_id: string;
  timezone: string | null;
  preferred_language: string | null;
  notif_daily_verse: boolean | null;
  notif_daily_verse_hour: number | null;
  notif_streak_reminder: boolean | null;
};

function localHour(tz: string, now: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      hour12: false,
    }).format(now)
  );
}

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();

  const { data: prefs, error } = await admin
    .from("user_preferences")
    .select(
      "user_id, timezone, preferred_language, notif_daily_verse, notif_daily_verse_hour, notif_streak_reminder"
    )
    .or("notif_daily_verse.eq.true,notif_streak_reminder.eq.true")
    .limit(COHORT_CAP);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (prefs ?? []) as PrefRow[];
  if (!rows.length) {
    return NextResponse.json({ ok: true, sent: 0, cohorts: {} });
  }

  const due: Array<{ row: PrefRow; kind: "daily_verse" | "streak_reminder"; day: string }> = [];
  for (const row of rows) {
    const tz = isValidTimezone(row.timezone) ? row.timezone! : FALLBACK_TZ;
    const hour = localHour(tz, now);
    const day = localDayString(tz, now);
    if (row.notif_daily_verse && hour === (row.notif_daily_verse_hour ?? 8)) {
      due.push({ row, kind: "daily_verse", day });
    }
    if (row.notif_streak_reminder && hour === STREAK_HOUR) {
      due.push({ row, kind: "streak_reminder", day });
    }
  }
  if (!due.length) {
    return NextResponse.json({ ok: true, sent: 0, cohorts: {} });
  }

  // Streak eligibility: yesterday-local was the last visit, streak alive.
  const streakUserIds = due
    .filter((d) => d.kind === "streak_reminder")
    .map((d) => d.row.user_id);
  const streakByUser = new Map<string, { current: number; last: string }>();
  if (streakUserIds.length) {
    const { data: streaks } = await admin
      .from("user_streaks")
      .select("user_id, current_streak, last_visit_date")
      .in("user_id", streakUserIds)
      .gte("current_streak", 2);
    for (const s of streaks ?? []) {
      streakByUser.set(s.user_id, {
        current: s.current_streak,
        last: s.last_visit_date,
      });
    }
  }

  const candidates = due.filter((d) => {
    if (d.kind !== "streak_reminder") return true;
    const s = streakByUser.get(d.row.user_id);
    return !!s && dayDiff(s.last, d.day) === 1;
  });
  if (!candidates.length) {
    return NextResponse.json({ ok: true, sent: 0, cohorts: {} });
  }

  // Idempotency gate: insert send rows first; conflicts drop out silently.
  const sendRows = candidates.map((c) => ({
    user_id: c.row.user_id,
    kind: c.kind,
    sent_on: c.day,
  }));
  const { data: inserted } = await admin
    .from("push_sends")
    .upsert(sendRows, {
      onConflict: "user_id,kind,sent_on",
      ignoreDuplicates: true,
    })
    .select("user_id, kind");

  const insertedKeys = new Set(
    (inserted ?? []).map((r) => `${r.user_id}:${r.kind}`)
  );
  const toSend = candidates.filter((c) =>
    insertedKeys.has(`${c.row.user_id}:${c.kind}`)
  );
  if (!toSend.length) {
    return NextResponse.json({ ok: true, sent: 0, deduped: candidates.length });
  }

  const { data: tokens } = await admin
    .from("push_tokens")
    .select("user_id, token")
    .in(
      "user_id",
      Array.from(new Set(toSend.map((c) => c.row.user_id)))
    )
    .is("disabled_at", null);

  const tokensByUser = new Map<string, string[]>();
  for (const t of tokens ?? []) {
    const list = tokensByUser.get(t.user_id) ?? [];
    list.push(t.token);
    tokensByUser.set(t.user_id, list);
  }

  const selection = await getVerseOfTheDaySelection(now);
  const ref = selection ? formatVerseRef(selection.sloka) : "";

  const messages: PushMessage[] = [];
  const counts = { daily_verse: 0, streak_reminder: 0 };
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
    counts[c.kind] += userTokens.length;
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
  if (result.staleTokens.length) {
    await admin
      .from("push_tokens")
      .update({ disabled_at: new Date().toISOString() })
      .in("token", result.staleTokens);
  }

  return NextResponse.json({
    ok: true,
    sent: result.ok,
    attempted: result.attempted,
    stale: result.staleTokens.length,
    cohorts: counts,
  });
}
