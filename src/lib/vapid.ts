import { runtimeEnv } from "@/config/runtimeEnv";

// Public browser key only. The VAPID private key must remain server-side.
export const VAPID_PUBLIC_KEY = runtimeEnv.vapidPublicKey;
