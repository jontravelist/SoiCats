import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY")!;

export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Returns an authenticated client that respects the caller's JWT (and therefore RLS).
export function userClient(authHeader: string | null): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: authHeader ? { Authorization: authHeader } : {} },
  });
}

export async function requireUser(req: Request): Promise<{ id: string; client: SupabaseClient }> {
  const auth = req.headers.get("Authorization");
  if (!auth) throw new HttpError(401, "Missing Authorization header");
  const client = userClient(auth);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new HttpError(401, "Invalid token");
  return { id: data.user.id, client };
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
