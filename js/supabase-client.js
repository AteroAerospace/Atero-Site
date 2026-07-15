import { createClient } from
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL =
  "https://iahpxnxrapqptzkolckk.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_qUB77LmwZZauQK97p8ZiLw_cP6TS_Jn";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
