export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

export function isDbContentEnabled(): boolean {
  const source = process.env.CONTENT_SOURCE?.trim().toLowerCase();
  if (source === "json") return false;
  if (source === "db") return supabaseConfigured();
  // Auto: use DB when Supabase is configured
  return supabaseConfigured();
}
