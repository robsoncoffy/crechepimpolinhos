import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  user_id?: string;
  user_ids?: string[];
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");

    if (!vapidPrivateKey || !vapidPublicKey) {
      console.log("VAPID keys not configured");
      return new Response(
        JSON.stringify({ 
          error: "VAPID keys not configured",
          message: "Push notifications require VAPID keys to be set up in secrets"
        }),
        { 
          status: 501, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: PushPayload = await req.json();
    const { user_id, user_ids, title, body, icon, url, tag } = payload;

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: "Title and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get target user IDs
    const targetUserIds = user_ids || (user_id ? [user_id] : []);

    if (targetUserIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "No target users specified" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch subscriptions for target users
    const { data: subscriptions, error: fetchError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", targetUserIds);

    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          sent: 0, 
          message: "No active subscriptions found" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${subscriptions.length} subscription(s) for push notification`);

    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title,
      body,
      icon: icon || "/pwa-512x512.png",
      badge: "/favicon.ico",
      tag: tag || "default",
      data: {
        url: url || "/painel",
      },
    });

    // Store notifications in database for in-app display
    // The actual push will be handled by the service worker when the app is open
    let notificationsCreated = 0;
    
    for (const subscription of subscriptions) {
      try {
        // Create in-app notification as fallback
        const { error: notifError } = await supabase
          .from("notifications")
          .insert({
            user_id: subscription.user_id,
            title,
            message: body,
            type: tag || "push",
            link: url || "/painel",
          });
        
        if (!notifError) {
          notificationsCreated++;
        }
      } catch (error) {
        console.error(`Error creating notification for user ${subscription.user_id}:`, error);
      }
    }

    // Log the push notification attempt
    console.log(`Created ${notificationsCreated} in-app notifications`);
    console.log(`VAPID keys are configured. To enable full web push, integrate with a web push service.`);

    return new Response(
      JSON.stringify({
        success: true,
        notificationsCreated,
        message: "Notifications created. Push notifications require browser service worker integration.",
        subscriptionsFound: subscriptions.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in send-push-notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
