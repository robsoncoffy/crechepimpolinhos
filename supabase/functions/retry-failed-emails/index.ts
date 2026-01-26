import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FailedEmail {
  id: string;
  to_address: string;
  subject: string;
  body_html: string;
  template_type: string;
  retry_count: number;
  metadata: Record<string, unknown> | null;
  ghl_contact_id: string | null;
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

async function resendEmailViaGHL(
  email: FailedEmail,
  apiKey: string,
  locationId: string,
  logger: ReturnType<typeof createLogger>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const sendStart = Date.now();
  
  let contactId = email.ghl_contact_id;
  
  // If no contact ID stored, search for it
  if (!contactId) {
    const searchResponse = await fetch(
      `https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${locationId}&email=${encodeURIComponent(email.to_address)}`,
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
      logger.error("retry_no_contact", "Contact not found for retry", { emailId: email.id });
      return { success: false, error: "Contact not found" };
    }
  }

  // Retry sending the email
  const emailResponse = await fetch(
    "https://services.leadconnectorhq.com/conversations/messages",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Version: "2021-04-15",
      },
      body: JSON.stringify({
        type: "Email",
        contactId,
        emailTo: email.to_address,
        subject: email.subject,
        html: email.body_html,
      }),
    }
  );

  if (!emailResponse.ok) {
    const errorText = await emailResponse.text();
    logger.error("retry_send_failed", errorText, {
      emailId: email.id,
      status: emailResponse.status,
      duration: Date.now() - sendStart
    });
    return { success: false, error: `GHL error: ${emailResponse.status}` };
  }

  const sendResult = await emailResponse.json();
  const messageId = sendResult.messageId || sendResult.id;
  
  logger.info("retry_send_success", {
    emailId: email.id,
    messageId,
    duration: Date.now() - sendStart
  });

  return { success: true, messageId };
}

serve(async (req: Request): Promise<Response> => {
  const logger = createLogger("retry-failed-emails");
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
    // Fetch failed emails that are eligible for retry
    const { data: failedEmails, error: fetchError } = await adminClient
      .from("email_logs")
      .select("id, to_address, subject, body_html, template_type, retry_count, metadata, ghl_contact_id")
      .eq("status", "error")
      .eq("provider", "ghl")
      .lt("retry_count", 3)
      .or("next_retry_at.is.null,next_retry_at.lte.now()")
      .order("created_at", { ascending: true })
      .limit(10);

    if (fetchError) {
      logger.error("fetch_failed", fetchError.message);
      throw fetchError;
    }

    if (!failedEmails || failedEmails.length === 0) {
      logger.info("no_pending_retries");
      return new Response(
        JSON.stringify({ success: true, message: "No emails to retry", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logger.info("found_emails_to_retry", { count: failedEmails.length });

    let successCount = 0;
    let failCount = 0;

    for (const email of failedEmails as FailedEmail[]) {
      // Skip if no body_html (can't resend without content)
      if (!email.body_html || !email.to_address || !email.subject) {
        logger.warn("skip_incomplete_email", { emailId: email.id });
        
        // Mark as permanently failed
        await adminClient
          .from("email_logs")
          .update({
            status: "failed_permanent",
            error_message: "Missing required fields for retry",
            updated_at: new Date().toISOString()
          })
          .eq("id", email.id);
        
        continue;
      }

      const result = await resendEmailViaGHL(email, GHL_API_KEY, GHL_LOCATION_ID, logger);
      const newRetryCount = email.retry_count + 1;

      if (result.success) {
        // Update as sent
        await adminClient
          .from("email_logs")
          .update({
            status: "sent",
            ghl_message_id: result.messageId,
            retry_count: newRetryCount,
            last_retry_at: new Date().toISOString(),
            error_message: null,
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("id", email.id);

        successCount++;
        logger.info("email_retry_success", { emailId: email.id, attempt: newRetryCount });
      } else {
        // Calculate next retry time with exponential backoff (5min, 15min, 45min)
        const backoffMinutes = Math.pow(3, newRetryCount) * 5;
        const nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

        const updateData: Record<string, unknown> = {
          retry_count: newRetryCount,
          last_retry_at: new Date().toISOString(),
          error_message: result.error,
          updated_at: new Date().toISOString()
        };

        // If max retries reached, mark as permanently failed
        if (newRetryCount >= 3) {
          updateData.status = "failed_permanent";
          updateData.next_retry_at = null;
          logger.warn("email_max_retries", { emailId: email.id, attempt: newRetryCount });
        } else {
          updateData.next_retry_at = nextRetryAt.toISOString();
          logger.info("email_retry_scheduled", { 
            emailId: email.id, 
            attempt: newRetryCount, 
            nextRetryAt: nextRetryAt.toISOString() 
          });
        }

        await adminClient
          .from("email_logs")
          .update(updateData)
          .eq("id", email.id);

        failCount++;
      }

      // Small delay between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    logger.info("job_completed", { 
      processed: failedEmails.length, 
      success: successCount, 
      failed: failCount,
      duration: Date.now() - logger.startTime
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: failedEmails.length,
        successCount,
        failCount,
        requestId: logger.requestId
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
