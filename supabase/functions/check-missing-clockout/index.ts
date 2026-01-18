import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmployeeWithMissingClockout {
  employee_id: string;
  employee_name: string;
  user_id: string;
  entry_time: string;
  phone?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Checking for employees with missing clock-out...");

    // Get today's date in Brazil timezone (UTC-3)
    const now = new Date();
    const brazilOffset = -3 * 60; // UTC-3
    const brazilTime = new Date(now.getTime() + (brazilOffset - now.getTimezoneOffset()) * 60000);
    const todayStr = brazilTime.toISOString().split('T')[0];

    // Get current hour in Brazil time
    const currentHour = brazilTime.getHours();

    // Only run checks after 18:00 (6 PM) to avoid false positives during work hours
    if (currentHour < 18) {
      console.log(`Current hour in Brazil: ${currentHour}. Skipping check (only runs after 18:00)`);
      return new Response(
        JSON.stringify({ message: "Check skipped - too early in the day", currentHour }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find employees who have an entry today but no exit
    const { data: todayRecords, error: recordsError } = await supabase
      .from('employee_time_clock')
      .select(`
        *,
        employee:employee_profiles!employee_time_clock_employee_id_fkey(
          id,
          full_name,
          user_id,
          phone
        )
      `)
      .gte('timestamp', `${todayStr}T00:00:00`)
      .lte('timestamp', `${todayStr}T23:59:59`)
      .order('timestamp', { ascending: true });

    if (recordsError) {
      console.error("Error fetching time clock records:", recordsError);
      throw recordsError;
    }

    console.log(`Found ${todayRecords?.length || 0} time clock records for today`);

    // Group records by employee
    const employeeRecords: Record<string, typeof todayRecords> = {};
    for (const record of todayRecords || []) {
      const empId = record.employee_id;
      if (!empId) continue;
      if (!employeeRecords[empId]) {
        employeeRecords[empId] = [];
      }
      employeeRecords[empId].push(record);
    }

    // Find employees with entry but no exit
    const employeesWithMissingClockout: EmployeeWithMissingClockout[] = [];

    for (const [empId, records] of Object.entries(employeeRecords)) {
      const hasEntry = records.some(r => r.clock_type === 'entry');
      const hasExit = records.some(r => r.clock_type === 'exit');

      if (hasEntry && !hasExit) {
        const entryRecord = records.find(r => r.clock_type === 'entry');
        if (entryRecord?.employee) {
          employeesWithMissingClockout.push({
            employee_id: empId,
            employee_name: entryRecord.employee.full_name,
            user_id: entryRecord.employee.user_id,
            entry_time: entryRecord.timestamp,
            phone: entryRecord.employee.phone,
          });
        }
      }
    }

    console.log(`Found ${employeesWithMissingClockout.length} employees with missing clock-out`);

    if (employeesWithMissingClockout.length === 0) {
      return new Response(
        JSON.stringify({ message: "No missing clock-outs found", checked: Object.keys(employeeRecords).length }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create notifications for each employee
    const notificationsCreated: string[] = [];
    const emailsSent: string[] = [];

    for (const emp of employeesWithMissingClockout) {
      // Check if notification was already sent today for this employee
      const { data: existingNotification } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', emp.user_id)
        .eq('type', 'missing_clockout')
        .gte('created_at', `${todayStr}T00:00:00`)
        .maybeSingle();

      if (existingNotification) {
        console.log(`Notification already sent today for ${emp.employee_name}`);
        continue;
      }

      // Create in-app notification
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: emp.user_id,
          title: 'Ponto de Saída Pendente',
          message: `Olá ${emp.employee_name}, você ainda não registrou o ponto de saída hoje. Por favor, regularize seu registro.`,
          type: 'missing_clockout',
          link: '/painel/ponto',
        });

      if (notifError) {
        console.error(`Error creating notification for ${emp.employee_name}:`, notifError);
      } else {
        notificationsCreated.push(emp.employee_name);
        console.log(`Notification created for ${emp.employee_name}`);
      }

      // Send email notification if Resend is configured
      if (resendApiKey) {
        try {
          // Get user email from auth
          const { data: userData } = await supabase.auth.admin.getUserById(emp.user_id);
          
          if (userData?.user?.email) {
            const entryTime = new Date(emp.entry_time).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'America/Sao_Paulo'
            });

            // Send email using fetch to Resend API
            const emailResponse = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: "Creche Pimpolinhos <onboarding@resend.dev>",
                to: [userData.user.email],
                subject: "⚠️ Ponto de Saída Pendente - Creche Pimpolinhos",
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #e11d48;">⚠️ Ponto de Saída Pendente</h2>
                    <p>Olá <strong>${emp.employee_name}</strong>,</p>
                    <p>Identificamos que você registrou entrada às <strong>${entryTime}</strong> hoje, mas ainda não registrou o ponto de saída.</p>
                    <p>Por favor, acesse o sistema para regularizar seu registro de ponto.</p>
                    <div style="margin: 30px 0;">
                      <a href="https://crechepimpolinhos.lovable.app/painel/ponto" 
                         style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                        Acessar Sistema de Ponto
                      </a>
                    </div>
                    <p style="color: #666; font-size: 14px;">
                      Se você já saiu e esqueceu de bater o ponto, entre em contato com a administração para regularização.
                    </p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="color: #999; font-size: 12px;">
                      Creche Pimpolinhos - Sistema de Gestão
                    </p>
                  </div>
                `,
              }),
            });

            if (emailResponse.ok) {
              emailsSent.push(emp.employee_name);
              console.log(`Email sent to ${userData.user.email} for ${emp.employee_name}`);
            } else {
              const errorText = await emailResponse.text();
              console.error(`Failed to send email: ${errorText}`);
            }
          }
        } catch (emailError) {
          console.error(`Error sending email to ${emp.employee_name}:`, emailError);
        }
      }
    }

    // Also notify admins about missing clock-outs
    if (employeesWithMissingClockout.length > 0) {
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (admins && admins.length > 0) {
        const employeeNames = employeesWithMissingClockout.map(e => e.employee_name).join(', ');
        
        for (const admin of admins) {
          // Check if admin notification already sent today
          const { data: existingAdminNotif } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', admin.user_id)
            .eq('type', 'admin_missing_clockout')
            .gte('created_at', `${todayStr}T00:00:00`)
            .maybeSingle();

          if (!existingAdminNotif) {
            await supabase
              .from('notifications')
              .insert({
                user_id: admin.user_id,
                title: 'Funcionários sem Ponto de Saída',
                message: `${employeesWithMissingClockout.length} funcionário(s) ainda não registraram saída: ${employeeNames}`,
                type: 'admin_missing_clockout',
                link: '/painel/ponto',
              });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: "Check completed",
        employeesWithMissingClockout: employeesWithMissingClockout.length,
        notificationsCreated,
        emailsSent,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in check-missing-clockout function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
