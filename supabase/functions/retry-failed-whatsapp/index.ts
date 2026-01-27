import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FailedMessage {
  id: string;
  ghl_contact_id: string | null;
  phone: string;
  message_preview: string | null;
  template_type: string | null;
  retry_count: number;
  metadata: Record<string, unknown> | null;
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
    startTime,
    info: (step: string, data?: Record<string, unknown>) => log("info", step, data),
    warn: (step: string, data?: Record<string, unknown>) => log("warn", step, data),
    error: (step: string, error: Error | string, data?: Record<string, unknown>) =>
      log("error", step, { error: typeof error === "string" ? error : error.message, ...data }),
  };
}

async function resendWhatsAppViaGHL(
  message: FailedMessage,
  apiKey: string,
  locationId: string,
  logger: ReturnType<typeof createLogger>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const sendStart = Date.now();

  let contactId = message.ghl_contact_id;

  // If no contact ID stored, search for it by phone
  if (!contactId) {
    const formattedPhone = message.phone.replace(/\D/g, "").replace(/^0+/, "");
    const phoneWithCountry = formattedPhone.startsWith("55") ? `+${formattedPhone}` : `+55${formattedPhone}`;

    const searchResponse = await fetch(
      `https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${locationId}&phone=${encodeURIComponent(phoneWithCountry)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Version: "2021-07-28",
        },
      }
    );

    if (searchResponse.ok) {
      const searchResult = await searchResponse.json();
      contactId = searchResult.contact?.id;
    }

    if (!contactId) {
      logger.error("retry_no_contact", "Contact not found for retry", { messageId: message.id });
      return { success: false, error: "Contact not found" };
    }
  }

  // Get the full message from metadata if available
  const fullMessage = (message.metadata as Record<string, string>)?.full_message || message.message_preview || "";

  if (!fullMessage) {
    logger.error("retry_no_message", "No message content for retry", { messageId: message.id });
    return { success: false, error: "No message content" };
  }

  // Retry sending the WhatsApp message
  const sendResponse = await fetch(
    "https://services.leadconnectorhq.com/conversations/messages",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Version: "2021-04-15",
      },
      body: JSON.stringify({
        type: "WhatsApp",
        contactId,
        message: fullMessage,
        body: fullMessage,
      }),
    }
  );

  if (!sendResponse.ok) {
    const errorText = await sendResponse.text();
    logger.error("retry_send_failed", errorText, {
      messageId: message.id,
      status: sendResponse.status,
      duration: Date.now() - sendStart,
    });
    return { success: false, error: `GHL error: ${sendResponse.status}` };
  }

  const sendResult = await sendResponse.json();
  const messageId = sendResult.messageId || sendResult.id;

  logger.info("retry_send_success", {
    messageId: message.id,
    ghlMessageId: messageId,
    duration: Date.now() - sendStart,
  });

  return { success: true, messageId };
}

serve(async (req: Request): Promise<Response> => {
  const logger = createLogger("retry-failed-whatsapp");
  logger.info("job_started");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const GHL_API_KEY = Deno.env.get("GHL_API_KEY");
  const GHL_LOCATION_ID = Deno.env.get("GHL_LOCATION_ID");

  if (!GHL_API_KEY || !GHL_LOCATION_ID) {
    logger.error("config_error", "GHL credentials not configured");
    return new Response(
      JSON.stringify({ error: "GHL credentials not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Fetch failed messages that are eligible for retry
    // Criteria:
    // 1. status = 'error' OR (status = 'sent' AND created_at > 10 minutes ago without delivery confirmation)
    // 2. retry_count < max_retries (default 3)
    // 3. next_retry_at is null or in the past
    const { data: failedMessages, error: fetchError } = await adminClient
      .from("whatsapp_message_logs")
      .select("id, ghl_contact_id, phone, message_preview, template_type, retry_count, metadata")
      .or(`status.eq.error,and(status.eq.sent,created_at.lt.${new Date(Date.now() - 10 * 60 * 1000).toISOString()})`)
      .lt("retry_count", 3)
      .or("next_retry_at.is.null,next_retry_at.lte.now()")
      .order("created_at", { ascending: true })
      .limit(10);

    if (fetchError) {
      logger.error("fetch_failed", fetchError.message);
      throw fetchError;
    }

    if (!failedMessages || failedMessages.length === 0) {
      logger.info("no_pending_retries");
      return new Response(
        JSON.stringify({ success: true, message: "No messages to retry", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logger.info("found_messages_to_retry", { count: failedMessages.length });

    let successCount = 0;
    let failCount = 0;

    for (const message of failedMessages as FailedMessage[]) {
      // Skip if no phone
      if (!message.phone) {
        logger.warn("skip_no_phone", { messageId: message.id });

        await adminClient
          .from("whatsapp_message_logs")
          .update({
            status: "failed_permanent",
            error_message: "No phone number",
            updated_at: new Date().toISOString(),
          })
          .eq("id", message.id);

        continue;
      }

      const result = await resendWhatsAppViaGHL(message, GHL_API_KEY, GHL_LOCATION_ID, logger);
      const newRetryCount = message.retry_count + 1;

      if (result.success) {
        // Update as sent with new message ID
        await adminClient
          .from("whatsapp_message_logs")
          .update({
            status: "sent",
            ghl_message_id: result.messageId,
            retry_count: newRetryCount,
            last_retry_at: new Date().toISOString(),
            error_message: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", message.id);

        successCount++;
        logger.info("message_retry_success", { messageId: message.id, attempt: newRetryCount });
      } else {
        // Calculate next retry time with exponential backoff (5min, 15min, 45min)
        const backoffMinutes = Math.pow(3, newRetryCount) * 5;
        const nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

        const updateData: Record<string, unknown> = {
          retry_count: newRetryCount,
          last_retry_at: new Date().toISOString(),
          error_message: result.error,
          updated_at: new Date().toISOString(),
        };

        // If max retries reached, mark as permanently failed
        if (newRetryCount >= 3) {
          updateData.status = "failed_permanent";
          updateData.next_retry_at = null;
          logger.warn("message_max_retries", { messageId: message.id, attempt: newRetryCount });
        } else {
          updateData.status = "error";
          updateData.next_retry_at = nextRetryAt.toISOString();
          logger.info("message_retry_scheduled", {
            messageId: message.id,
            attempt: newRetryCount,
            nextRetryAt: nextRetryAt.toISOString(),
          });
        }

        await adminClient
          .from("whatsapp_message_logs")
          .update(updateData)
          .eq("id", message.id);

        failCount++;
      }

      // Small delay between messages to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    logger.info("job_completed", {
      processed: failedMessages.length,
      success: successCount,
      failed: failCount,
      duration: Date.now() - logger.startTime,
    });

    return new Response(
      JSON.stringify({
        success: true,
        processed: failedMessages.length,
        successCount,
        failCount,
        requestId: logger.requestId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("job_failed", errorMessage);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
