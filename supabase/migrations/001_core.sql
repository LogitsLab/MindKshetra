-- MindKshetra v2.0 core schema
create extension if not exists vector;

-- Slokas
create table if not exists slokas (
  id integer primary key,
  chapter smallint not null,
  verse_number smallint not null,
  sanskrit_devanagari text not null,
  transliteration_iast text not null,
  hindi_translation text not null,
  english_translation text not null,
  english_meaning text,
  hindi_meaning text,
  word_meanings jsonb,
  created_at timestamptz default now(),
  unique (chapter, verse_number)
);

-- Tags
create table if not exists tags (
  id serial primary key,
  name text unique not null,
  category text default 'emotion'
);

create table if not exists sloka_tags (
  sloka_id integer references slokas(id) on delete cascade,
  tag_id integer references tags(id) on delete cascade,
  primary key (sloka_id, tag_id)
);

-- Moods
create table if not exists moods (
  id text primary key,
  label text not null,
  label_hi text not null,
  sort_order smallint default 0
);

create table if not exists mood_tags (
  mood_id text references moods(id) on delete cascade,
  tag_name text not null,
  primary key (mood_id, tag_name)
);

-- Stories (cached AI variants)
create table if not exists stories (
  id serial primary key,
  sloka_id integer references slokas(id) on delete cascade,
  language text not null check (language in ('en', 'hi')),
  story_text text not null,
  variant_index smallint not null default 0,
  created_at timestamptz default now(),
  unique (sloka_id, language, variant_index)
);

-- Embeddings for vector RAG
create table if not exists sloka_embeddings (
  sloka_id integer primary key references slokas(id) on delete cascade,
  embedding vector(1024) not null,
  model text not null default 'voyage-3',
  updated_at timestamptz default now()
);

create index if not exists sloka_embeddings_hnsw_idx
  on sloka_embeddings using hnsw (embedding vector_cosine_ops);

-- Public read for content tables
alter table slokas enable row level security;
alter table tags enable row level security;
alter table sloka_tags enable row level security;
alter table moods enable row level security;
alter table mood_tags enable row level security;
alter table stories enable row level security;
alter table sloka_embeddings enable row level security;

create policy "slokas_public_read" on slokas for select using (true);
create policy "tags_public_read" on tags for select using (true);
create policy "sloka_tags_public_read" on sloka_tags for select using (true);
create policy "moods_public_read" on moods for select using (true);
create policy "mood_tags_public_read" on mood_tags for select using (true);
create policy "stories_public_read" on stories for select using (true);
create policy "sloka_embeddings_public_read" on sloka_embeddings for select using (true);

-- Vector similarity search helper
create or replace function match_slokas(
  query_embedding vector(1024),
  match_count int default 8
)
returns table (sloka_id int, similarity float)
language sql stable
as $$
  select
    sloka_id,
    1 - (embedding <=> query_embedding) as similarity
  from sloka_embeddings
  order by embedding <=> query_embedding
  limit match_count;
$$;
