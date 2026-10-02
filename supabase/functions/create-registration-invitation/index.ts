import { corsHeaders, hasOnlyKeys, jsonResponse, readJsonObject, requireLocalOrigin } from "../_shared/http.ts";
import { createUserClient, requireAuthenticatedUser } from "../_shared/supabase.ts";
import { generateInvitationToken, sha256Bytea } from "../_shared/token.ts";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const rolePattern = /^[a-z][a-z0-9_]{0,63}$/u;
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
    if (!hasOnlyKeys(body, ["email", "role_key", "personal_id"])) {
      return jsonResponse(request, { error: "Solicitud inválida." }, 400);
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const roleKey = typeof body.role_key === "string" ? body.role_key.trim() : "";
    const personalId = body.personal_id === null || body.personal_id === undefined || body.personal_id === ""
      ? null
      : body.personal_id;

    if (
      email.length > 320 || !emailPattern.test(email) ||
      !rolePattern.test(roleKey) || roleKey === "admin" ||
      (personalId !== null && (typeof personalId !== "string" || !uuidPattern.test(personalId)))
    ) {
      return jsonResponse(request, { error: "Datos de invitación inválidos." }, 400);
    }

    const client = createUserClient(request);
    await requireAuthenticatedUser(request, client);

    const { token, bytes } = generateInvitationToken();
    const tokenHash = await sha256Bytea(bytes);
    const { data, error } = await client.schema("api").rpc("create_registration_invitation", {
      p_email: email,
      p_role_key: roleKey,
      p_personal_id: personalId,
      p_token_hash: tokenHash,
    });

    if (error || !Array.isArray(data) || data.length !== 1) {
      return jsonResponse(request, { error: "No se pudo crear la invitación." }, error?.code === "42501" ? 403 : 400);
    }

    const origin = request.headers.get("origin") ?? "http://localhost:5173";
    const inviteUrl = `${origin}/aceptar-invitacion#token=${encodeURIComponent(token)}`;

    return jsonResponse(request, {
      invitation_id: data[0].invitation_id,
      expires_at: data[0].expires_at,
      invite_url: inviteUrl,
    }, 201);
  } catch {
    return jsonResponse(request, { error: "No se pudo crear la invitación." }, 401);
  }
});
