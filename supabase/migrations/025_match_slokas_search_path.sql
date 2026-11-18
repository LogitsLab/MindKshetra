-- Harden match_slokas against mutable search_path (advisor 0011).
-- Idempotent recreate with an explicit search_path.

create or replace function public.match_slokas(
  query_embedding vector(1024),
  match_count int default 8
)
returns table (sloka_id int, similarity float)
language sql
stable
set search_path = public
as $$
  select
    sloka_id,
    1 - (embedding <=> query_embedding) as similarity
  from sloka_embeddings
  order by embedding <=> query_embedding
  limit match_count;
$$;
