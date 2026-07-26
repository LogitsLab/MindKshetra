-- eng/E10 — persist the two-voice reply.
--
-- chat_messages stored one flat `content` string. With a chart-grounded reply
-- that is not enough: the epigraph (chart reading) and the reply-level context
-- line are separate voices with separate rendering.
--
-- Persisting the teaching only would mean the SAME conversation renders in two
-- different visual grammars — two voices live, one voice after a reload. That
-- is the failure this migration exists to prevent.
--
-- Nullable on purpose. Every existing row, and every future Gita-only reply,
-- has no reading. NULL means "single voice", which is the correct default and
-- needs no backfill.

alter table chat_messages
  add column if not exists reading text,
  add column if not exists chart_context text;

comment on column chat_messages.reading is
  'Chart epigraph (des/D2). NULL for single-voice replies. Never spoken by TTS.';
comment on column chat_messages.chart_context is
  'Reply-level provenance line (des/D4). States context used, never causation.';
