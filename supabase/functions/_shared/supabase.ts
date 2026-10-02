import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.90.1";

function requiredEnvironment(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`missing ${name}`);
  }
  return value;
}

export function createUserClient(request: Request): SupabaseClient {
  return createClient(
    requiredEnvironment("SUPABASE_URL"),
    requiredEnvironment("SUPABASE_ANON_KEY"),
    {
      global: {
        headers: {
          Authorization: request.headers.get("authorization") ?? "",
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

export function createServiceClient(): SupabaseClient {
  return createClient(
    requiredEnvironment("SUPABASE_URL"),
    requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

export async function requireAuthenticatedUser(
  request: Request,
  client: SupabaseClient,
): Promise<void> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    throw new Error("authentication required");
  }

  const token = authorization.slice(7);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    throw new Error("authentication required");
  }
}
