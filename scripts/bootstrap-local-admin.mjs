import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { createClient } from "@supabase/supabase-js";

const ENV_PATH = resolve(process.cwd(), ".env.bootstrap.local");
const LOCAL_SUPABASE_URLS = new Set([
  "http://127.0.0.1:54321",
  "http://localhost:54321",
]);

if (existsSync(ENV_PATH)) {
  loadEnvFile(ENV_PATH);
}

function fail(message) {
  throw new Error(message);
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) fail(`Falta la variable local ${name}.`);
  return value;
}

function validateLocalUrl(rawValue) {
  if (!LOCAL_SUPABASE_URLS.has(rawValue)) {
    fail(
      "SUPABASE_URL debe ser exactamente http://127.0.0.1:54321 o http://localhost:54321.",
    );
  }

  const parsed = new URL(rawValue);
  if (
    parsed.protocol !== "http:" ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    fail("SUPABASE_URL contiene componentes no permitidos.");
  }

  return rawValue;
}

function validateEmail(rawValue) {
  const email = rawValue.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
    fail("LOCAL_ADMIN_EMAIL no tiene un formato válido.");
  }
  return email;
}

function validatePassword(rawValue) {
  if (rawValue.length < 8 || rawValue.length > 128) {
    fail("LOCAL_ADMIN_PASSWORD debe tener entre 8 y 128 caracteres.");
  }
  return rawValue;
}

function validateDisplayName(rawValue) {
  const displayName = rawValue.trim();
  if (displayName.length < 1 || displayName.length > 120) {
    fail("LOCAL_ADMIN_DISPLAY_NAME debe tener entre 1 y 120 caracteres.");
  }
  return displayName;
}

function isBootstrapMarked(user) {
  return user?.app_metadata?.calamina_bootstrap_admin_v2 === true;
}

async function findUserByEmail(adminApi, email) {
  let page = 1;

  while (true) {
    const { data, error } = await adminApi.listUsers({ page, perPage: 1000 });
    if (error) fail(`No se pudo consultar Auth Admin (${error.status ?? "sin código"}).`);

    const match = data.users.find(
      (user) => user.email?.trim().toLowerCase() === email,
    );
    if (match) return match;

    if (!data.nextPage) return null;
    page = data.nextPage;
  }
}

async function callBootstrap(client, userId, displayName, requestId) {
  return client.schema("api").rpc("bootstrap_initial_admin", {
    p_user_id: userId,
    p_display_name: displayName,
    p_request_id: requestId,
  });
}

async function main() {
  const supabaseUrl = validateLocalUrl(required("SUPABASE_URL"));
  const serviceRoleKey = required("SUPABASE_SERVICE_ROLE_KEY");
  const email = validateEmail(required("LOCAL_ADMIN_EMAIL"));
  const password = validatePassword(required("LOCAL_ADMIN_PASSWORD"));
  const displayName = validateDisplayName(required("LOCAL_ADMIN_DISPLAY_NAME"));
  const requestId = randomUUID();

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  let user = await findUserByEmail(supabase.auth.admin, email);
  let createdThisRun = false;

  if (user) {
    if (!isBootstrapMarked(user)) {
      fail("El email ya pertenece a un usuario no creado por el bootstrap local.");
    }
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
      app_metadata: { calamina_bootstrap_admin_v2: true },
    });

    if (error || !data.user) {
      fail(`No se pudo crear el usuario Auth (${error?.status ?? "sin código"}).`);
    }

    user = data.user;
    createdThisRun = true;
  }

  let bootstrap = await callBootstrap(supabase, user.id, displayName, requestId);

  if (bootstrap.error) {
    bootstrap = await callBootstrap(supabase, user.id, displayName, requestId);
  }

  if (bootstrap.error) {
    let recovery = "not_required";

    if (createdThisRun) {
      const { data: current, error: lookupError } =
        await supabase.auth.admin.getUserById(user.id);

      if (!lookupError && current.user?.id === user.id && isBootstrapMarked(current.user)) {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
        recovery = deleteError ? "manual_recovery_required" : "created_user_deleted";
      } else {
        recovery = "manual_recovery_required";
      }
    }

    fail(
      `La RPC de bootstrap falló (${bootstrap.error.code ?? "sin código"}); recuperación: ${recovery}.`,
    );
  }

  const row = bootstrap.data?.[0];
  if (!row) fail("La RPC de bootstrap no devolvió resultado.");

  process.stdout.write(
    `${JSON.stringify({
      result: row.result,
      user_id: user.id,
      membership_id: row.membership_id,
      role_id: row.role_id,
      request_id: requestId,
      auth_user_created: createdThisRun,
    })}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`[bootstrap-local-admin] ${error.message}\n`);
  process.exitCode = 1;
});
