import "server-only";
import {
  Expo,
  type ExpoPushMessage,
  type ExpoPushReceipt,
  type ExpoPushTicket,
} from "expo-server-sdk";

/**
 * Thin wrapper over expo-server-sdk: chunked sends that keep every ticket
 * paired with the token it targeted, plus receipt fetching. No database and
 * no business logic here — lib/notifications/dispatch.ts decides what a
 * DeviceNotRegistered means for a row.
 */

let client: Expo | null = null;

function getExpo(): Expo {
  if (!client) client = new Expo();
  return client;
}

export function isExpoPushToken(value: unknown): value is string {
  return typeof value === "string" && Expo.isExpoPushToken(value);
}

export type TicketWithToken = {
  token: string;
  ticket: ExpoPushTicket;
};

export type SendResult = {
  /** One entry per message, in send order; chunk-level failures excluded. */
  tickets: TicketWithToken[];
  /** Tokens whose whole chunk failed (network/5xx) — retryable, not dead. */
  undelivered: string[];
};

/**
 * Send messages in Expo-sized chunks (SDK decides the size). Each message
 * must target exactly one token in `to` so tickets can be paired back.
 */
export async function sendPushMessages(
  messages: ExpoPushMessage[]
): Promise<SendResult> {
  const expo = getExpo();
  const tickets: TicketWithToken[] = [];
  const undelivered: string[] = [];

  for (const chunk of expo.chunkPushNotifications(messages)) {
    try {
      const chunkTickets = await expo.sendPushNotificationsAsync(chunk);
      chunkTickets.forEach((ticket, i) => {
        const to = chunk[i]?.to;
        const token = Array.isArray(to) ? to[0] : to;
        if (token) tickets.push({ token, ticket });
      });
    } catch (err) {
      console.warn(
        "[notify/expo] chunk send failed:",
        err instanceof Error ? err.message : err
      );
      for (const message of chunk) {
        const to = message.to;
        undelivered.push(...(Array.isArray(to) ? to : [to]));
      }
    }
  }

  return { tickets, undelivered };
}

/** Ticket ids from successful tickets (error tickets carry no id). */
export function ticketIds(tickets: TicketWithToken[]): string[] {
  return tickets
    .map(({ ticket }) => ("id" in ticket ? ticket.id : null))
    .filter((id): id is string => Boolean(id));
}

/** Tokens Expo already flagged dead at SEND time (ticket-level errors). */
export function deadTokensFromTickets(tickets: TicketWithToken[]): string[] {
  return tickets
    .filter(
      ({ ticket }) =>
        ticket.status === "error" &&
        ticket.details?.error === "DeviceNotRegistered"
    )
    .map(({ token }) => token);
}

/** Fetch receipts for ticket ids, chunked per the SDK. Keyed by ticket id. */
export async function fetchReceipts(
  ids: string[]
): Promise<Record<string, ExpoPushReceipt>> {
  const expo = getExpo();
  const receipts: Record<string, ExpoPushReceipt> = {};
  for (const chunk of expo.chunkPushNotificationReceiptIds(ids)) {
    try {
      Object.assign(
        receipts,
        await expo.getPushNotificationReceiptsAsync(chunk)
      );
    } catch (err) {
      console.warn(
        "[notify/expo] receipt fetch failed:",
        err instanceof Error ? err.message : err
      );
    }
  }
  return receipts;
}

const TOKEN_IN_MESSAGE_RE = /Expo(?:nent)?PushToken\[[A-Za-z0-9_-]+\]/;

/**
 * The token a DeviceNotRegistered receipt refers to: the SDK surfaces it in
 * details.expoPushToken; older payloads only embed it in the message text.
 * Null for healthy receipts or when the token is unrecoverable.
 */
export function deadTokenFromReceipt(receipt: ExpoPushReceipt): string | null {
  if (receipt.status !== "error") return null;
  if (receipt.details?.error !== "DeviceNotRegistered") return null;
  if (receipt.details.expoPushToken) return receipt.details.expoPushToken;
  return receipt.message?.match(TOKEN_IN_MESSAGE_RE)?.[0] ?? null;
}

/** Compact status string persisted to notification_log.expo_receipt_status. */
export function receiptStatus(receipt: ExpoPushReceipt): string {
  if (receipt.status === "ok") return "ok";
  return receipt.details?.error ?? "error";
}
