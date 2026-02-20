import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailHealthMetrics {
  totalEmails: number;
  sentEmails: number;
  errorEmails: number;
  permanentFailures: number;
  pendingRetries: number;
  errorRate: number;
  avgResponseTime: number | null;
}

interface ThresholdConfig {
  errorRateThreshold: number; // percentage (e.g., 20 = 20%)
  minEmailsForAlert: number;  // minimum emails to consider for alert
  timeWindowMinutes: number;  // time window to analyze
}

const DEFAULT_CONFIG: ThresholdConfig = {
  errorRateThreshold: 20,
  minEmailsForAlert: 5,
  timeWindowMinutes: 60,
};

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

// deno-lint-ignore no-explicit-any
async function getEmailHealthMetrics(
  adminClient: any,
  timeWindowMinutes: number
): Promise<EmailHealthMetrics> {
  const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000).toISOString();

  // Get email counts by status
  const { data: statusCounts, error: countError } = await adminClient
    .from("email_logs")
    .select("status")
    .eq("provider", "ghl")
    .eq("direction", "outbound")
    .gte("created_at", cutoffTime);

  if (countError) {
    throw new Error(`Failed to fetch email stats: ${countError.message}`);
  }

  interface EmailStatus { status: string }
  const emails = (statusCounts || []) as EmailStatus[];
  const totalEmails = emails.length;
  const sentEmails = emails.filter(e => e.status === "sent").length;
  const errorEmails = emails.filter(e => e.status === "error").length;
  const permanentFailures = emails.filter(e => e.status === "failed_permanent").length;
  const pendingRetries = emails.filter(e => e.status === "error").length;

  const errorRate = totalEmails > 0 
    ? ((errorEmails + permanentFailures) / totalEmails) * 100 
    : 0;

  // Get average response time from metadata
  const { data: metadataEmails } = await adminClient
    .from("email_logs")
    .select("metadata")
    .eq("provider", "ghl")
    .eq("status", "sent")
    .gte("created_at", cutoffTime)
    .not("metadata", "is", null);

  let avgResponseTime: number | null = null;
  interface EmailMetadata { metadata: Record<string, unknown> }
  const metadataList = (metadataEmails || []) as EmailMetadata[];
  if (metadataList.length > 0) {
    const responseTimes = metadataList
      .map(e => e.metadata?.duration as number)
      .filter(d => typeof d === "number");
    
    if (responseTimes.length > 0) {
      avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    }
  }

  return {
    totalEmails,
    sentEmails,
    errorEmails,
    permanentFailures,
    pendingRetries,
    errorRate: Math.round(errorRate * 100) / 100,
    avgResponseTime: avgResponseTime ? Math.round(avgResponseTime) : null,
  };
}

// deno-lint-ignore no-explicit-any
async function checkAndCreateAlert(
  adminClient: any,
  metrics: EmailHealthMetrics,
  config: ThresholdConfig,
  logger: ReturnType<typeof createLogger>
): Promise<boolean> {
  // Check if we have enough emails to evaluate
  if (metrics.totalEmails < config.minEmailsForAlert) {
    logger.info("skip_alert_low_volume", { 
      totalEmails: metrics.totalEmails, 
      minRequired: config.minEmailsForAlert 
    });
    return false;
  }

  // Check if error rate exceeds threshold
  if (metrics.errorRate < config.errorRateThreshold) {
    logger.info("health_ok", { 
      errorRate: metrics.errorRate, 
      threshold: config.errorRateThreshold 
    });
    return false;
  }

  // Check if we already sent an alert in the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: recentAlerts } = await adminClient
    .from("notifications")
    .select("id")
    .eq("type", "email_health_alert")
    .gte("created_at", oneHourAgo)
    .limit(1);

  if (recentAlerts && recentAlerts.length > 0) {
    logger.info("skip_alert_recent_exists", { 
      errorRate: metrics.errorRate,
      lastAlertWithinHour: true
    });
    return false;
  }

  // Get all admin user IDs
  const { data: adminRoles, error: adminError } = await adminClient
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");

  if (adminError || !adminRoles || adminRoles.length === 0) {
    logger.error("no_admins_found", adminError?.message || "No admin users");
    return false;
  }

  // Create alert notifications for all admins
  const alertTitle = "⚠️ Alta Taxa de Erro de E-mail";
  const alertMessage = `Taxa de erro: ${metrics.errorRate.toFixed(1)}% (${metrics.errorEmails + metrics.permanentFailures} de ${metrics.totalEmails} e-mails falharam na última hora)`;
  
  interface AdminRole { user_id: string }
  const notifications = (adminRoles as AdminRole[]).map(admin => ({
    user_id: admin.user_id,
    title: alertTitle,
    message: alertMessage,
    type: "email_health_alert",
    link: "/painel/emails",
  }));

  const { error: insertError } = await adminClient
    .from("notifications")
    .insert(notifications);

  if (insertError) {
    logger.error("alert_insert_failed", insertError.message);
    return false;
  }

  logger.warn("alert_created", {
    errorRate: metrics.errorRate,
    threshold: config.errorRateThreshold,
    adminsNotified: adminRoles.length,
    metrics,
  });

  return true;
}

serve(async (req: Request): Promise<Response> => {
  const logger = createLogger("check-email-health");
  logger.info("check_started");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Parse optional config from request body
    let config = { ...DEFAULT_CONFIG };
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body.errorRateThreshold) config.errorRateThreshold = body.errorRateThreshold;
        if (body.minEmailsForAlert) config.minEmailsForAlert = body.minEmailsForAlert;
        if (body.timeWindowMinutes) config.timeWindowMinutes = body.timeWindowMinutes;
      } catch {
        // Use default config if body parsing fails
      }
    }

    logger.info("config_loaded", { config });

    // Get metrics
    const metrics = await getEmailHealthMetrics(adminClient, config.timeWindowMinutes);
    logger.info("metrics_collected", { metrics });

    // Check and create alert if needed
    const alertCreated = await checkAndCreateAlert(adminClient, metrics, config, logger);

    // Store health check result for dashboard
    const healthStatus = metrics.errorRate >= config.errorRateThreshold ? "warning" : "healthy";

    logger.info("check_completed", {
      healthStatus,
      alertCreated,
      duration: Date.now() - logger.startTime,
    });

    return new Response(
      JSON.stringify({
        success: true,
        healthStatus,
        alertCreated,
        metrics,
        config,
        requestId: logger.requestId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("check_failed", errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
