import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

interface Marcacao {
  cpf: string;
  hora?: string;
  tipo: string;
  timestamp?: string;
}

interface WebhookPayload {
  marcacoes: Marcacao[];
}

type ClockType = "entry" | "exit" | "break_start" | "break_end";

function mapTipoToClockType(tipo: string): ClockType | null {
  const tipoLower = tipo.toLowerCase().trim();
  
  const mapping: Record<string, ClockType> = {
    "entrada": "entry",
    "entry": "entry",
    "saida": "exit",
    "saída": "exit",
    "exit": "exit",
    "intervalo_inicio": "break_start",
    "intervalo_início": "break_start",
    "break_start": "break_start",
    "intervalo_fim": "break_end",
    "break_end": "break_end",
  };
  
  return mapping[tipoLower] || null;
}

function cleanCpf(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método não permitido. Use POST." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Optional: Validate webhook secret
    const webhookSecret = req.headers.get("x-webhook-secret");
    
    const { data: config } = await supabase
      .from("time_clock_config")
      .select("webhook_secret")
      .eq("is_active", true)
      .single();

    if (config?.webhook_secret && webhookSecret && config.webhook_secret !== webhookSecret) {
      console.error("Invalid webhook secret");
      return new Response(
        JSON.stringify({ error: "Webhook secret inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse payload
    const payload: WebhookPayload = await req.json();
    
    if (!payload.marcacoes || !Array.isArray(payload.marcacoes)) {
      return new Response(
        JSON.stringify({ error: "Formato inválido. Esperado: { marcacoes: [...] }" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Recebidas ${payload.marcacoes.length} marcações`);

    const results: Array<{ cpf: string; status: string; employee?: string; error?: string }> = [];
    let processed = 0;
    let failed = 0;

    for (const marcacao of payload.marcacoes) {
      const cpf = cleanCpf(marcacao.cpf || "");
      
      if (!cpf) {
        results.push({ cpf: marcacao.cpf || "N/A", status: "error", error: "CPF não informado" });
        failed++;
        continue;
      }

      // Map tipo to clock_type
      const clockType = mapTipoToClockType(marcacao.tipo || "");
      if (!clockType) {
        results.push({ cpf, status: "error", error: `Tipo inválido: ${marcacao.tipo}` });
        failed++;
        continue;
      }

      // Find employee by CPF
      const { data: employee, error: employeeError } = await supabase
        .from("employee_profiles")
        .select("id, user_id, full_name")
        .eq("cpf", cpf)
        .single();

      if (employeeError || !employee) {
        console.log(`CPF não encontrado: ${cpf}`);
        results.push({ cpf, status: "error", error: "CPF não encontrado no sistema" });
        failed++;
        continue;
      }

      // Parse timestamp
      let timestamp: string;
      if (marcacao.timestamp) {
        timestamp = new Date(marcacao.timestamp).toISOString();
      } else if (marcacao.hora) {
        // If only time provided, use today's date
        const today = new Date();
        const [hours, minutes] = marcacao.hora.split(":");
        today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        timestamp = today.toISOString();
      } else {
        timestamp = new Date().toISOString();
      }

      // Insert time clock record
      const { error: insertError } = await supabase
        .from("employee_time_clock")
        .insert({
          employee_id: employee.id,
          user_id: employee.user_id,
          clock_type: clockType,
          timestamp,
          source: "controlid",
          verified: true,
        });

      if (insertError) {
        console.error(`Erro ao inserir marcação para ${cpf}:`, insertError);
        results.push({ cpf, status: "error", error: insertError.message });
        failed++;
        continue;
      }

      console.log(`Marcação registrada: ${employee.full_name} - ${clockType} às ${timestamp}`);
      results.push({ cpf, status: "ok", employee: employee.full_name });
      processed++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        failed,
        total: payload.marcacoes.length,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro no webhook:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
