import { corsHeaders, hasOnlyKeys, jsonResponse, readJsonObject, requireLocalOrigin } from "../_shared/http.ts";
import { createUserClient, requireAuthenticatedUser } from "../_shared/supabase.ts";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  if (request.method !== "POST" || !requireLocalOrigin(request)) {
    return jsonResponse(request, { error: "Solicitud no permitida." }, 405);
  }

  try {
    const body = await readJsonObject(request);
    const invitationId = typeof body.invitation_id === "string" ? body.invitation_id : "";
    if (!hasOnlyKeys(body, ["invitation_id"]) || !uuidPattern.test(invitationId)) {
      return jsonResponse(request, { error: "Solicitud inválida." }, 400);
    }

    const client = createUserClient(request);
    await requireAuthenticatedUser(request, client);
    const { data, error } = await client.schema("api").rpc("revoke_registration_invitation", {
      p_invitation_id: invitationId,
    });

    if (error || data !== true) {
      return jsonResponse(request, { error: "No se pudo revocar la invitación." }, error?.code === "42501" ? 403 : 400);
    }

    return jsonResponse(request, { revoked: true });
  } catch {
    return jsonResponse(request, { error: "No se pudo revocar la invitación." }, 401);
  }
});
