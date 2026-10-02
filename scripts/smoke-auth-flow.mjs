import { execFileSync, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { createClient } from "@supabase/supabase-js";

const ENV_PATH = resolve(process.cwd(), ".env.bootstrap.local");
const LOCAL_URLS = new Set(["http://127.0.0.1:54321", "http://localhost:54321"]);
if (existsSync(ENV_PATH)) loadEnvFile(ENV_PATH);

function fail(message) {
  throw new Error(message);
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) fail(`Falta la variable local ${name}.`);
  return value;
}

function readLocalStatus() {
  const executable = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "npx";
  const args = process.platform === "win32"
    ? ["/d", "/s", "/c", "npx.cmd supabase status --output json"]
    : ["supabase", "status", "--output", "json"];
  const output = execFileSync(executable, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start < 0 || end < start) fail("Supabase local no devolvió un estado válido.");
  return JSON.parse(output.slice(start, end + 1));
}

function createLocalClient(url, key) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function main() {
  const url = required("SUPABASE_URL");
  if (!LOCAL_URLS.has(url)) fail("El smoke test sólo admite Supabase local en el puerto 54321.");

  const adminEmail = required("LOCAL_ADMIN_EMAIL").toLowerCase();
  const adminPassword = required("LOCAL_ADMIN_PASSWORD");
  required("LOCAL_ADMIN_DISPLAY_NAME");
  required("SUPABASE_SERVICE_ROLE_KEY");

  const nodeExecutable = process.execPath;
  const bootstrap = spawnSync(nodeExecutable, ["scripts/bootstrap-local-admin.mjs"], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (bootstrap.status !== 0) fail("Falló el bootstrap local previo al smoke test.");

  const status = readLocalStatus();
  const anonKey = status.ANON_KEY ?? status.PUBLISHABLE_KEY;
  const apiUrl = status.API_URL;
  if (!anonKey || !LOCAL_URLS.has(apiUrl)) fail("No se pudo obtener la configuración pública local.");

  const adminClient = createLocalClient(apiUrl, anonKey);
  const { error: adminLoginError } = await adminClient.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });
  if (adminLoginError) {
    fail(`El admin local no pudo iniciar sesión (${adminLoginError.code ?? adminLoginError.status ?? "sin código"}).`);
  }

  const suffix = `${Date.now()}-${randomBytes(4).toString("hex")}`;
  const guestEmail = `smoke-${suffix}@example.invalid`;
  const guestPassword = `Local-${randomBytes(12).toString("base64url")}!`;

  const { data: invitation, error: invitationError } = await adminClient.functions.invoke(
    "create-registration-invitation",
    { body: { email: guestEmail, role_key: "viewer", personal_id: null } },
  );
  if (invitationError || typeof invitation?.invite_url !== "string") {
    fail("No se pudo crear la invitación del smoke test.");
  }

  const inviteUrl = new URL(invitation.invite_url);
  const token = new URLSearchParams(inviteUrl.hash.slice(1)).get("token");
  if (!token) fail("La invitación local no devolvió un token utilizable.");

  const guestClient = createLocalClient(apiUrl, anonKey);
  const { data: acceptance, error: acceptanceError } = await guestClient.functions.invoke(
    "accept-registration-invitation",
    { body: { token, password: guestPassword, display_name: "Usuario Smoke" } },
  );
  if (acceptanceError || acceptance?.accepted !== true) fail("No se pudo aceptar la invitación del smoke test.");

  const { error: guestLoginError } = await guestClient.auth.signInWithPassword({
    email: guestEmail,
    password: guestPassword,
  });
  if (guestLoginError) fail("El usuario invitado no pudo iniciar sesión.");

  const { data: permissionRows, error: permissionError } = await guestClient
    .schema("api")
    .rpc("current_user_permissions");
  if (permissionError || !Array.isArray(permissionRows)) fail("No se pudieron leer los permisos efectivos.");

  const permissions = permissionRows.map((row) => row.permission_key).sort();
  const expected = ["personal.view", "users.view"];
  if (JSON.stringify(permissions) !== JSON.stringify(expected)) {
    fail("Los permisos efectivos del viewer no coinciden con el catálogo esperado.");
  }

  process.stdout.write(`${JSON.stringify({
    bootstrap: "ok",
    admin_login: "ok",
    invitation_creation: "ok",
    invitation_acceptance: "ok",
    guest_login: "ok",
    permissions,
  })}\n`);
}

main().catch((error) => {
  process.stderr.write(`[smoke-auth-flow] ${error.message}\n`);
  process.exitCode = 1;
});
