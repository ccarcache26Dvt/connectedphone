import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { VAPID_PUBLIC_KEY } from "./push-config";

export const notifyNewMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ conversationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // RLS ensures the caller belongs to the conversation
    const { data: conv } = await supabase
      .from("conversations")
      .select("user_a, user_b")
      .eq("id", data.conversationId)
      .maybeSingle();
    if (!conv) return { sent: 0 };
    const recipient = conv.user_a === userId ? conv.user_b : conv.user_a;
    const { data: me } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();

    const privateKey = process.env["VAPID_PRIVATE_KEY"];
    if (!privateKey) return { sent: 0 };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", recipient);
    if (!subs?.length) return { sent: 0 };

    const { buildPushPayload } = await import("@block65/webcrypto-web-push");
    const vapid = {
      subject: "mailto:soporte@connected.app",
      publicKey: VAPID_PUBLIC_KEY,
      privateKey,
    };
    const payloadData = JSON.stringify({
      title: (me as { display_name?: string } | null)?.display_name || "Connected",
      body: "Nuevo mensaje",
      data: { url: `/chats?c=${data.conversationId}` },
    });

    let sent = 0;
    await Promise.all(
      subs.map(async (s) => {
        try {
          const req = await buildPushPayload(
            { data: payloadData, options: { ttl: 86400, urgency: "high" } },
            { endpoint: s.endpoint, expirationTime: null, keys: { p256dh: s.p256dh, auth: s.auth } },
            vapid,
          );
          const res = await fetch(s.endpoint, req);
          if (res.status === 404 || res.status === 410) {
            await supabaseAdmin.from("push_subscriptions").delete().eq("id", s.id);
          } else if (res.ok) sent++;
          else console.error("push failed", res.status, await res.text());
        } catch (e) {
          console.error("push error", e);
        }
      }),
    );
    return { sent };
  });
