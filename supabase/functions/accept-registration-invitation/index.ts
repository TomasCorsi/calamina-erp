import { corsHeaders, hasOnlyKeys, jsonResponse, readJsonObject, requireLocalOrigin } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { decodeInvitationToken, sha256Bytea } from "../_shared/token.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  if (request.method !== "POST" || !requireLocalOrigin(request)) {
    return jsonResponse(request, { error: "Solicitud no permitida." }, 405);
  }

  let createdUserId: string | null = null;
  let invitationId: string | null = null;
  let reservationId: string | null = null;

  try {
    const body = await readJsonObject(request);
    if (!hasOnlyKeys(body, ["token", "password", "display_name"])) {
      return jsonResponse(request, { error: "Solicitud inválida." }, 400);
    }

    const token = typeof body.token === "string" ? body.token : "";
    const password = typeof body.password === "string" ? body.password : "";
    const displayName = typeof body.display_name === "string" ? body.display_name.trim() : "";
    const tokenBytes = decodeInvitationToken(token);

    if (!tokenBytes || password.length < 8 || password.length > 128 || displayName.length < 1 || displayName.length > 120) {
      return jsonResponse(request, { error: "La invitación o los datos ingresados no son válidos." }, 400);
    }

    const client = createServiceClient();
    const tokenHash = await sha256Bytea(tokenBytes);
    const { data: reservationData, error: reservationError } = await client
      .schema("api")
      .rpc("reserve_registration_invitation", { p_token_hash: tokenHash });

    if (reservationError || !Array.isArray(reservationData) || reservationData.length !== 1) {
      return jsonResponse(request, { error: "La invitación no está disponible o venció." }, 400);
    }

    const reservation = reservationData[0];
    invitationId = reservation.invitation_id;
    reservationId = reservation.reservation_id;

    const { data: created, error: createError } = await client.auth.admin.createUser({
      email: reservation.email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });

    if (createError || !created.user) {
      await client.schema("api").rpc("release_registration_reservation", {
        p_invitation_id: invitationId,
        p_reservation_id: reservationId,
      });
      return jsonResponse(request, { error: "No se pudo completar el registro." }, 400);
    }

    createdUserId = created.user.id;

    const finalize = () => client.schema("api").rpc("finalize_registration_invitation", {
      p_invitation_id: invitationId,
      p_reservation_id: reservationId,
      p_auth_user_id: createdUserId,
      p_display_name: displayName,
    });

    let { error: finalizeError } = await finalize();
    if (finalizeError) {
      ({ error: finalizeError } = await finalize());
    }

    if (finalizeError) {
      const { error: deleteError } = await client.auth.admin.deleteUser(createdUserId);
      if (!deleteError) {
        await client.schema("api").rpc("release_registration_reservation", {
          p_invitation_id: invitationId,
          p_reservation_id: reservationId,
        });
      }
      return jsonResponse(request, { error: "No se pudo completar el registro." }, 500);
    }

    return jsonResponse(request, { accepted: true });
  } catch {
    if (createdUserId && invitationId && reservationId) {
      try {
        const client = createServiceClient();
        const { error: deleteError } = await client.auth.admin.deleteUser(createdUserId);
        if (!deleteError) {
          await client.schema("api").rpc("release_registration_reservation", {
            p_invitation_id: invitationId,
            p_reservation_id: reservationId,
          });
        }
      } catch {
        // Keep the reservation bounded by its five-minute expiration.
      }
    }
    return jsonResponse(request, { error: "No se pudo completar el registro." }, 500);
  }
});
