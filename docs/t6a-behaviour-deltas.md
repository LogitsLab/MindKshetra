# T6a — behaviour deltas from retiring /api/astrology/chat

The plan called T6a a "merge with zero behaviour change". That was never
achievable: the two routes had genuinely different contracts. Enumerating them
is more useful than asserting an equivalence that does not hold.

`/api/astrology/chat` is now a shim that invokes `/api/chat`, so these are the
observable changes for a client that was talking to the old route.

| Behaviour | Old `/api/astrology/chat` | Now (merged `/api/chat`) | Impact |
|---|---|---|---|
| Missing chart | `404 Chart not found` | Answers Gita-only | **Improvement.** A chart-less request used to be a dead end; it now degrades to a normal reply. |
| SSE events | `token`, `done` | `session`, `reading`, `chartContext`, `citations`, `token`, `replace`, `done` | Additive. Old clients ignore unknown types; `lib/chat-stream.ts` handles all of them. |
| Temperature | 0.4 for the whole reply | 0.4 reading / 0.7 teaching | **Improvement.** Neither voice is forced onto the other's setting. |
| max_tokens | 1100 for the whole reply | 220 reading / 900 teaching | Chart voice is capped to 1-2 sentences (des/D1). |
| History window | `slice(-12)` | `slice(-8)` | Slightly shorter context on the chart path. |
| Persistence | none | `chat_messages` unless `incognito` | AstroChat sends `incognito: true`, so the embedded panel is unchanged. |
| Citations | none | verified verse citations | **Improvement.** The astrology route never ran `verifyAndFixCitations`. |
| Crisis intercept | none until Wave 0 | always, before any chart work | **Safety fix.** |
| Rate limit | own 20/min bucket | shares `chat:` 20/min | A user who worked both surfaces now shares one budget. See note below. |
| `dynamic` | `force-dynamic` | inherited from `/api/chat` | No observable difference for POST. |

## Rate limit — still open

Eng decision 3 set 30/min for the merged route. It is still **20/min**: raising
it is a spend decision, and the merge landed without any traffic data to justify
a number. A user who previously had 20+20 across two surfaces now has 20 total.

`lib/rateLimit.ts` keys on IP, and Indian carrier NAT means many users can share
a bucket, so raising this blindly is not obviously safe either. Revisit with real
usage data.
