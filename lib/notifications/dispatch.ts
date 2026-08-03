import "server-only";
import type { ExpoPushMessage } from "expo-server-sdk";
import { getVerseOfTheDay } from "@/lib/day-seed";
import {
  deadTokenFromReceipt,
  deadTokensFromTickets,
  fetchReceipts,
  receiptStatus,
  sendPushMessages,
  ticketIds,
} from "@/lib/notifications/expo-push";
import {
  dailyVerseDedupeKey,
  isDueAtLocalHour,
  resolveTimezone,
} from "@/lib/notifications/scheduling";
import { dailyVerseCopy, normalizePushLang } from "@/lib/push-copy";
import { formatVerseRef } from "@/lib/sloka-utils";
import type { createAdminClient } from "@/lib/supabase/admin";

/**
 * Claim-then-send dispatch on notification_log.
 *
 * Every send is gated by an INSERT ... ON CONFLICT DO NOTHING claim against
 * UNIQUE(user_id, channel, dedupe_key): only the run that wins the insert
 * sends, so overlapping crons and mid-run restarts can never double-send.
 * A row stuck `pending` (crash between claim and send) is re-claimed by the
 * sweeper once it is >10 minutes old, up to MAX_ATTEMPTS total tries.
 */

type Admin = ReturnType<typeof createAdminClient>;

export const CATEGORY_DAILY_VERSE = "daily-verse";
const MAX_ATTEMPTS = 3;
/** A pending row younger than this may still be in-flight in another run. */
const STALE_PENDING_MINUTES = 10;
/** A pending daily-verse row this old refers to a stale morning — drop it. */
const ABANDON_PENDING_HOURS = 6;
/** Keyset page size over notification_preferences. */
const PAGE_SIZE = 1000;
const MAX_PAGES = 20;
/** PostgREST .in() lists ride the query string — keep them small. */
const IN_CHUNK = 200;
/** Newest active tokens per user actually sent to. */
const MAX_TOKENS_PER_USER = 3;
/** Receipt rows examined per run. */
const RECEIPT_BATCH = 300;

export class MissingNotificationTablesError extends Error {
  constructor(detail: string) {
    super(
      `Notification tables are missing — apply supabase/migrations/020_notifications.sql in the Supabase SQL editor (${detail})`
    );
    this.name = "MissingNotificationTablesError";
  }
}

function throwIfMissingTables(error: {
  code?: string;
  message?: string;
} | null): void {
  if (!error) return;
  const message = error.message ?? "";
  if (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /could not find the table|relation .* does not exist/i.test(message)
  ) {
    throw new MissingNotificationTablesError(message);
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export type ClaimEntry = { userId: string; dedupeKey: string };
export type ClaimedRow = { id: string; user_id: string; dedupe_key: string };

/**
 * Claim send slots: INSERT ... ON CONFLICT DO NOTHING (supabase upsert with
 * ignoreDuplicates) returning only the rows THIS run inserted. Users whose
 * (channel, dedupe_key) already exists drop out silently — some other run
 * owns them.
 */
export async function claim(
  admin: Admin,
  entries: ClaimEntry[],
  channel: "push" | "email",
  category: string
): Promise<ClaimedRow[]> {
  const claimed: ClaimedRow[] = [];
  for (const batch of chunk(entries, IN_CHUNK)) {
    const { data, error } = await admin
      .from("notification_log")
      .upsert(
        batch.map((entry) => ({
          user_id: entry.userId,
          channel,
          category,
          dedupe_key: entry.dedupeKey,
          status: "pending",
        })),
        { onConflict: "user_id,channel,dedupe_key", ignoreDuplicates: true }
      )
      .select("id, user_id, dedupe_key");
    throwIfMissingTables(error);
    if (error) {
      console.warn("[notify/dispatch] claim failed:", error.message);
      continue;
    }
    claimed.push(...((data ?? []) as ClaimedRow[]));
  }
  return claimed;
}

/**
 * Receipt pass: rows sent on a PREVIOUS run whose tickets have no receipt
 * status yet. DeviceNotRegistered receipts disable the offending token.
 */
export async function processReceipts(admin: Admin): Promise<number> {
  const cutoff = new Date(
    Date.now() - STALE_PENDING_MINUTES * 60_000
  ).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 3_600_000).toISOString();

  const { data: rows, error } = await admin
    .from("notification_log")
    .select("id, expo_ticket_id")
    .eq("channel", "push")
    .eq("status", "sent")
    .is("expo_receipt_status", null)
    .not("expo_ticket_id", "is", null)
    .gt("created_at", dayAgo)
    .lt("updated_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(RECEIPT_BATCH);
  throwIfMissingTables(error);
  if (error) {
    console.warn("[notify/dispatch] receipt scan failed:", error.message);
    return 0;
  }
  if (!rows?.length) return 0;

  // A row's expo_ticket_id holds comma-separated ids (one per device).
  const idsByRow = new Map<string, string[]>();
  for (const row of rows) {
    const ids = String(row.expo_ticket_id)
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    if (ids.length) idsByRow.set(row.id as string, ids);
  }

  const receipts = await fetchReceipts(
    Array.from(idsByRow.values()).flat()
  );
  if (!Object.keys(receipts).length) return 0;

  let processed = 0;
  const deadTokens = new Set<string>();
  for (const [rowId, ids] of Array.from(idsByRow.entries())) {
    const rowReceipts = ids
      .map((id) => receipts[id])
      .filter((r): r is NonNullable<typeof r> => Boolean(r));
    if (!rowReceipts.length) continue;

    for (const receipt of rowReceipts) {
      const dead = deadTokenFromReceipt(receipt);
      if (dead) deadTokens.add(dead);
    }
    // One status per row: the first error wins, else ok.
    const firstError = rowReceipts.find((r) => r.status === "error");
    const status = receiptStatus(firstError ?? rowReceipts[0]);
    const { error: updateError } = await admin
      .from("notification_log")
      .update({
        expo_receipt_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", rowId);
    if (updateError) {
      console.warn(
        "[notify/dispatch] receipt update failed:",
        updateError.message
      );
      continue;
    }
    processed += 1;
  }

  await disableTokens(admin, Array.from(deadTokens));
  return processed;
}

async function disableTokens(admin: Admin, tokens: string[]): Promise<void> {
  for (const batch of chunk(tokens, IN_CHUNK)) {
    if (!batch.length) continue;
    const { error } = await admin
      .from("device_push_tokens")
      .update({ disabled_at: new Date().toISOString() })
      .in("expo_push_token", batch);
    if (error) {
      console.warn("[notify/dispatch] token disable failed:", error.message);
    }
  }
}

/**
 * Sweeper: re-claim pending rows stuck >10 minutes with attempts left
 * (crash/overlap recovery) and re-send them; expire the rest. Returns the
 * counts plus the send outcome of the re-claimed rows.
 */
export async function sweepStalePending(
  admin: Admin,
  now: Date
): Promise<{ swept: number; sent: number; failed: number }> {
  const staleBefore = new Date(
    now.getTime() - STALE_PENDING_MINUTES * 60_000
  ).toISOString();
  const abandonBefore = new Date(
    now.getTime() - ABANDON_PENDING_HOURS * 3_600_000
  ).toISOString();

  // Exhausted or ancient pending rows fail terminally (a six-hour-old
  // "daily" verse is no longer a morning verse).
  const { error: expireError } = await admin
    .from("notification_log")
    .update({
      status: "failed",
      error: "expired before send",
      updated_at: now.toISOString(),
    })
    .eq("channel", "push")
    .eq("status", "pending")
    .or(`attempts.gte.${MAX_ATTEMPTS},created_at.lt.${abandonBefore}`)
    .lt("updated_at", staleBefore);
  throwIfMissingTables(expireError);

  // Candidate scan, then a guarded per-attempts-group update. The update
  // repeats the stale conditions, so when two runs race Postgres re-checks
  // them under the row lock and only one run wins each row.
  const { data: candidates, error } = await admin
    .from("notification_log")
    .select("id, attempts")
    .eq("channel", "push")
    .eq("status", "pending")
    .eq("category", CATEGORY_DAILY_VERSE)
    .lt("attempts", MAX_ATTEMPTS)
    .lt("updated_at", staleBefore)
    .gt("created_at", abandonBefore)
    .limit(RECEIPT_BATCH);
  throwIfMissingTables(error);
  if (error) {
    console.warn("[notify/dispatch] sweep scan failed:", error.message);
    return { swept: 0, sent: 0, failed: 0 };
  }
  if (!candidates?.length) return { swept: 0, sent: 0, failed: 0 };

  const byAttempts = new Map<number, string[]>();
  for (const c of candidates) {
    const n = (c.attempts as number) ?? 0;
    byAttempts.set(n, [...(byAttempts.get(n) ?? []), c.id as string]);
  }

  const rows: ClaimedRow[] = [];
  for (const [attempts, ids] of Array.from(byAttempts.entries())) {
    const { data: won, error: claimError } = await admin
      .from("notification_log")
      .update({ attempts: attempts + 1, updated_at: now.toISOString() })
      .in("id", ids)
      .eq("status", "pending")
      .eq("attempts", attempts)
      .lt("updated_at", staleBefore)
      .select("id, user_id, dedupe_key");
    if (claimError) {
      console.warn("[notify/dispatch] sweep claim failed:", claimError.message);
      continue;
    }
    rows.push(...((won ?? []) as ClaimedRow[]));
  }
  if (!rows.length) return { swept: 0, sent: 0, failed: 0 };

  const outcome = await sendDailyVerseToClaimed(admin, rows, now);
  return { swept: rows.length, ...outcome };
}

type PrefTarget = {
  user_id: string;
  send_hour_local: number | null;
};

/**
 * The daily-verse pass: find users whose local hour matches their chosen
 * send hour, claim today's slot, build language-appropriate payloads and
 * send to their active devices. Stops cleanly at `deadline` between pages —
 * the claim gate makes the next run resume where this one stopped.
 */
export async function dispatchDailyVerse(
  admin: Admin,
  now: Date,
  deadline: number
): Promise<{ claimed: number; sent: number; failed: number }> {
  const totals = { claimed: 0, sent: 0, failed: 0 };

  let lastId: string | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    if (Date.now() > deadline) break;

    let query = admin
      .from("notification_preferences")
      .select("user_id, send_hour_local")
      .eq("push_enabled", true)
      .eq("daily_verse", true)
      .order("user_id", { ascending: true })
      .limit(PAGE_SIZE);
    if (lastId) query = query.gt("user_id", lastId);

    const { data, error } = await query;
    throwIfMissingTables(error);
    if (error) {
      console.warn("[notify/dispatch] prefs scan failed:", error.message);
      break;
    }
    const prefs = (data ?? []) as PrefTarget[];
    if (!prefs.length) break;
    lastId = prefs[prefs.length - 1].user_id;

    const tzByUser = await loadTimezones(
      admin,
      prefs.map((p) => p.user_id)
    );

    const due: ClaimEntry[] = [];
    for (const pref of prefs) {
      const tz = resolveTimezone(tzByUser.get(pref.user_id)?.timezone);
      if (isDueAtLocalHour(tz, now, pref.send_hour_local ?? 8)) {
        due.push({ userId: pref.user_id, dedupeKey: dailyVerseDedupeKey(tz, now) });
      }
    }

    if (due.length) {
      const claimedRows = await claim(admin, due, "push", CATEGORY_DAILY_VERSE);
      totals.claimed += claimedRows.length;
      if (claimedRows.length) {
        const outcome = await sendDailyVerseToClaimed(
          admin,
          claimedRows,
          now,
          tzByUser
        );
        totals.sent += outcome.sent;
        totals.failed += outcome.failed;
      }
    }

    if (prefs.length < PAGE_SIZE) break;
  }

  return totals;
}

type UserMeta = { timezone: string | null; preferred_language: string | null };

async function loadTimezones(
  admin: Admin,
  userIds: string[]
): Promise<Map<string, UserMeta>> {
  const byUser = new Map<string, UserMeta>();
  for (const ids of chunk(userIds, IN_CHUNK)) {
    const { data, error } = await admin
      .from("user_preferences")
      .select("user_id, timezone, preferred_language")
      .in("user_id", ids);
    if (error) {
      console.warn("[notify/dispatch] tz load failed:", error.message);
      continue;
    }
    for (const row of data ?? []) {
      byUser.set(row.user_id as string, {
        timezone: (row.timezone as string | null) ?? null,
        preferred_language: (row.preferred_language as string | null) ?? null,
      });
    }
  }
  return byUser;
}

/**
 * Send today's verse to the users behind already-claimed log rows and settle
 * each row to sent/failed. Also used by the sweeper for re-claimed rows.
 */
async function sendDailyVerseToClaimed(
  admin: Admin,
  rows: ClaimedRow[],
  now: Date,
  metaByUser?: Map<string, UserMeta>
): Promise<{ sent: number; failed: number }> {
  const outcome = { sent: 0, failed: 0 };

  const sloka = await getVerseOfTheDay(now);
  if (!sloka) {
    await settleRows(admin, rows.map((r) => r.id), {
      status: "failed",
      error: "verse of the day unavailable",
    });
    outcome.failed += rows.length;
    return outcome;
  }
  const ref = formatVerseRef(sloka);

  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const meta = metaByUser ?? (await loadTimezones(admin, userIds));

  // Newest active devices per user.
  const tokensByUser = new Map<string, string[]>();
  for (const ids of chunk(userIds, IN_CHUNK)) {
    const { data, error } = await admin
      .from("device_push_tokens")
      .select("user_id, expo_push_token")
      .in("user_id", ids)
      .is("disabled_at", null)
      .order("last_seen_at", { ascending: false });
    throwIfMissingTables(error);
    if (error) {
      console.warn("[notify/dispatch] token load failed:", error.message);
      continue;
    }
    for (const row of data ?? []) {
      const list = tokensByUser.get(row.user_id as string) ?? [];
      if (list.length >= MAX_TOKENS_PER_USER) continue;
      list.push(row.expo_push_token as string);
      tokensByUser.set(row.user_id as string, list);
    }
  }

  const messages: ExpoPushMessage[] = [];
  const rowByToken = new Map<string, ClaimedRow>();
  const rowsWithoutTokens: ClaimedRow[] = [];
  for (const row of rows) {
    const tokens = tokensByUser.get(row.user_id) ?? [];
    if (!tokens.length) {
      rowsWithoutTokens.push(row);
      continue;
    }
    const lang = normalizePushLang(meta.get(row.user_id)?.preferred_language);
    const copy = dailyVerseCopy(lang, ref);
    for (const token of tokens) {
      rowByToken.set(token, row);
      messages.push({
        to: token,
        title: copy.title,
        body: copy.body,
        data: { url: `/sloka/${sloka.id}` },
      });
    }
  }

  if (rowsWithoutTokens.length) {
    await settleRows(
      admin,
      rowsWithoutTokens.map((r) => r.id),
      { status: "failed", error: "no active push tokens" }
    );
    outcome.failed += rowsWithoutTokens.length;
  }
  if (!messages.length) return outcome;

  const result = await sendPushMessages(messages);

  // Ticket-level DeviceNotRegistered → disable those tokens immediately.
  await disableTokens(admin, deadTokensFromTickets(result.tickets));

  // Group tickets back onto their log rows.
  const ticketsByRow = new Map<
    string,
    { row: ClaimedRow; ids: string[]; errors: string[] }
  >();
  for (const { token, ticket } of result.tickets) {
    const row = rowByToken.get(token);
    if (!row) continue;
    const bucket = ticketsByRow.get(row.id) ?? { row, ids: [], errors: [] };
    if (ticket.status === "ok") bucket.ids.push(ticket.id);
    else bucket.errors.push(ticket.details?.error ?? ticket.message ?? "error");
    ticketsByRow.set(row.id, bucket);
  }
  const undeliveredRows = new Set(
    result.undelivered
      .map((token) => rowByToken.get(token)?.id)
      .filter((id): id is string => Boolean(id))
  );

  for (const { row, ids, errors } of Array.from(ticketsByRow.values())) {
    undeliveredRows.delete(row.id);
    if (ids.length) {
      await settleRows(admin, [row.id], {
        status: "sent",
        expo_ticket_id: ids.join(","),
      });
      outcome.sent += 1;
    } else {
      await settleRows(admin, [row.id], {
        status: "failed",
        error: errors.slice(0, 3).join("; ") || "all tickets errored",
      });
      outcome.failed += 1;
    }
  }

  // Whole-chunk transport failures stay pending: the sweeper retries them
  // after the stale window, up to MAX_ATTEMPTS.
  if (undeliveredRows.size) {
    console.warn(
      `[notify/dispatch] ${undeliveredRows.size} rows left pending after transport failure`
    );
  }

  return outcome;
}

/**
 * Terminal write for claimed rows. `attempts` counts sweeper re-claims, not
 * settles, so this is a plain batch update.
 */
async function settleRows(
  admin: Admin,
  ids: string[],
  fields: Record<string, unknown>
): Promise<void> {
  for (const batch of chunk(ids, IN_CHUNK)) {
    if (!batch.length) continue;
    const { error } = await admin
      .from("notification_log")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .in("id", batch);
    if (error) {
      console.warn("[notify/dispatch] settle write failed:", error.message);
    }
  }
}
