// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface SendPushPayload {
  user_ids: string[];
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = (await req.json()) as SendPushPayload;

    if (!payload?.user_ids?.length || !payload?.title || !payload?.body) {
      return new Response(
        JSON.stringify({ error: "Missing user_ids, title, or body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: subs, error: subsErr } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .in("user_id", payload.user_ids);

    if (subsErr) {
      console.error("Failed to load subscriptions:", subsErr);
      return new Response(JSON.stringify({ error: subsErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || "/",
      tag: payload.tag,
      icon: payload.icon || "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
    });

    const deadEndpoints: string[] = [];
    let sent = 0;
    let failed = 0;

    await Promise.allSettled(
      (subs || []).map(async (s: any) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: s.endpoint,
              keys: { p256dh: s.p256dh, auth: s.auth },
            },
            notificationPayload,
            { TTL: 60 * 60 * 24 },
          );
          sent++;
        } catch (err: any) {
          failed++;
          const status = err?.statusCode;
          if (status === 404 || status === 410) {
            deadEndpoints.push(s.endpoint);
          } else {
            console.error("Push error", status, err?.body || err?.message);
          }
        }
      }),
    );

    if (deadEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", deadEndpoints);
    }

    return new Response(
      JSON.stringify({
        sent,
        failed,
        removed: deadEndpoints.length,
        total: subs?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("send-push error:", err);
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
