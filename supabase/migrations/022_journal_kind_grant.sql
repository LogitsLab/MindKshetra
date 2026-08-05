-- Extend 016 column insert grant for journal kinds (021).
-- 016 granted insert (user_id, sloka_id, reflection) only; the journal API
-- inserts `kind` via the authenticated client after 021. Re-apply after any
-- re-run of 016 (016 overwrites the column list without kind).
grant insert (user_id, sloka_id, reflection, kind) on journal_entries to authenticated;
