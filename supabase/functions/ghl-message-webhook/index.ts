import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GHLMessageWebhook {
  type?: string;
  locationId?: string;
  contactId?: string;
  messageId?: string;
  message?: {
    id?: string;
    type?: string;
    status?: string;
    direction?: string;
    dateAdded?: string;
  };
  status?: string;
  direction?: string;
}

function createLogger(functionName: string) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  const log = (level: "info" | "warn" | "error", step: string, data?: Record<string, unknown>) => {
    const entry = {
      requestId,
      timestamp: new Date().toISOString(),
      function: functionName,
      step,
      level,
      duration: Date.now() - startTime,
      ...data,
    };
    if (level === "error") {
      console.error(JSON.stringify(entry));
    } else {
      console.log(JSON.stringify(entry));
    }
  };

  return {
    requestId,
    info: (step: string, data?: Record<string, unknown>) => log("info", step, data),
    warn: (step: string, data?: Record<string, unknown>) => log("warn", step, data),
    error: (step: string, error: Error | string, data?: Record<string, unknown>) =>
      log("error", step, { error: typeof error === "string" ? error : error.message, ...data }),
  };
}

serve(async (req: Request): Promise<Response> => {
  const logger = createLogger("ghl-message-webhook");
  logger.info("webhook_received");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const payload: GHLMessageWebhook = await req.json();
    logger.info("payload_parsed", { 
      type: payload.type,
      messageId: payload.messageId || payload.message?.id,
      status: payload.status || payload.message?.status,
      direction: payload.direction || payload.message?.direction
    });

    // Extract message details
    const messageId = payload.messageId || payload.message?.id;
    const status = payload.status || payload.message?.status;
    const direction = payload.direction || payload.message?.direction;

    // Only process outbound messages
    if (direction !== "outbound") {
      logger.info("skipped_inbound_message");
      return new Response(
        JSON.stringify({ success: true, message: "Skipped inbound message" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!messageId) {
      logger.warn("missing_message_id");
      return new Response(
        JSON.stringify({ success: false, error: "Missing message ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map GHL status to our status
    let mappedStatus: string;
    switch (status?.toLowerCase()) {
      case "delivered":
      case "read":
        mappedStatus = "delivered";
        break;
      case "sent":
        mappedStatus = "sent";
        break;
      case "failed":
      case "undelivered":
      case "error":
        mappedStatus = "error";
        break;
      default:
        mappedStatus = status?.toLowerCase() || "unknown";
    }

    // Update the message log
    const { data, error } = await adminClient
      .from("whatsapp_message_logs")
      .update({
        status: mappedStatus,
        updated_at: new Date().toISOString(),
        // Clear retry fields if delivered
        ...(mappedStatus === "delivered" && {
          next_retry_at: null,
          error_message: null
        }),
        // Set error message if failed
        ...(mappedStatus === "error" && {
          error_message: `GHL status: ${status}`
        })
      })
      .eq("ghl_message_id", messageId)
      .select();

    if (error) {
      logger.error("update_failed", error.message);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!data || data.length === 0) {
      logger.info("message_not_found", { messageId });
      // Not an error - message might have been sent before we started tracking
      return new Response(
        JSON.stringify({ success: true, message: "Message not found in logs" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logger.info("status_updated", { 
      messageId, 
      newStatus: mappedStatus,
      recordsUpdated: data.length 
    });

    return new Response(
      JSON.stringify({ success: true, updated: data.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("webhook_error", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
