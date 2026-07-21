-- Extend user_preferences with profile fields (safe if 004 already applied)

alter table user_preferences
  add column if not exists display_name text;

alter table user_preferences
  add column if not exists date_of_birth date;

alter table user_preferences
  add column if not exists place text;

alter table user_preferences
  add column if not exists preferred_language text;

alter table user_preferences
  add column if not exists about text;

-- Soft check for preferred_language (Postgres may already have rows)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'user_preferences_preferred_language_check'
  ) then
    alter table user_preferences
      add constraint user_preferences_preferred_language_check
      check (
        preferred_language is null or preferred_language in ('en', 'hi')
      );
  end if;
end $$;
