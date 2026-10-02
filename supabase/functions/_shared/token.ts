export function generateInvitationToken(): { token: string; bytes: Uint8Array } {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const binary = String.fromCharCode(...bytes);
  const token = btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
  return { token, bytes };
}

export function decodeInvitationToken(token: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]{43}$/u.test(token)) {
    return null;
  }

  try {
    const base64 = token.replaceAll("-", "+").replaceAll("_", "/") + "=";
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return bytes.length === 32 ? bytes : null;
  } catch {
    return null;
  }
}

export async function sha256Bytea(bytes: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return `\\x${Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}
