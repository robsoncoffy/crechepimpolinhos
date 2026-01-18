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

interface EmployeeOvertimeInfo {
  employee_id: string;
  employee_name: string;
  user_id: string;
  overtimeHours: number;
  limitHours: number;
}

// Weekly work limit in hours (40h per week = 8h/day * 5 days)
const WEEKLY_WORK_LIMIT_HOURS = 40;

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

    console.log("Starting time clock checks...");

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

    // ========= CHECK 1: Missing Clock-out =========
    console.log("Checking for employees with missing clock-out...");

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

    // Create notifications for each employee with missing clock-out
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

    // ========= CHECK 2: Weekly Overtime Limit Exceeded =========
    console.log("Checking for weekly overtime limit violations...");

    // Get start of current week (Monday)
    const dayOfWeek = brazilTime.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 6 days back, else subtract 1
    const weekStart = new Date(brazilTime);
    weekStart.setDate(brazilTime.getDate() - diffToMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    // Get all employees
    const { data: allEmployees, error: empError } = await supabase
      .from('employee_profiles')
      .select('id, full_name, user_id');

    if (empError) {
      console.error("Error fetching employees:", empError);
    }

    // Get time clock config for work hours calculation
    const { data: timeConfig } = await supabase
      .from('time_clock_config')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    // Get weekly records
    const { data: weekRecords, error: weekError } = await supabase
      .from('employee_time_clock')
      .select('*')
      .gte('timestamp', `${weekStartStr}T00:00:00`)
      .lte('timestamp', `${todayStr}T23:59:59`)
      .order('timestamp', { ascending: true });

    if (weekError) {
      console.error("Error fetching week records:", weekError);
    }

    const overtimeAlerts: EmployeeOvertimeInfo[] = [];
    const overtimeNotificationsCreated: string[] = [];

    if (allEmployees && weekRecords) {
      for (const emp of allEmployees) {
        const empRecords = weekRecords.filter((r: any) => r.employee_id === emp.id);
        
        // Group by day
        const dailyRecords: Record<string, any[]> = {};
        for (const record of empRecords) {
          const day = record.timestamp.split('T')[0];
          if (!dailyRecords[day]) {
            dailyRecords[day] = [];
          }
          dailyRecords[day].push(record);
        }

        let totalWorkedMinutes = 0;

        // Calculate total hours worked this week
        for (const [, records] of Object.entries(dailyRecords)) {
          const entry = records.find((r: any) => r.clock_type === 'entry');
          const exit = records.find((r: any) => r.clock_type === 'exit');
          const breakStart = records.find((r: any) => r.clock_type === 'break_start');
          const breakEnd = records.find((r: any) => r.clock_type === 'break_end');

          if (entry && exit) {
            const entryTime = new Date(entry.timestamp).getTime();
            const exitTime = new Date(exit.timestamp).getTime();
            let workedMinutes = (exitTime - entryTime) / (1000 * 60);

            // Subtract break
            if (breakStart && breakEnd) {
              const breakDuration = (new Date(breakEnd.timestamp).getTime() - new Date(breakStart.timestamp).getTime()) / (1000 * 60);
              workedMinutes -= breakDuration;
            } else {
              workedMinutes -= timeConfig?.break_duration_minutes || 60;
            }

            workedMinutes = Math.max(0, workedMinutes);
            totalWorkedMinutes += workedMinutes;
          }
        }

        const totalWorkedHours = totalWorkedMinutes / 60;
        const overtimeHours = Math.max(0, totalWorkedHours - WEEKLY_WORK_LIMIT_HOURS);

        // Check if exceeded weekly limit
        if (totalWorkedHours > WEEKLY_WORK_LIMIT_HOURS) {
          overtimeAlerts.push({
            employee_id: emp.id,
            employee_name: emp.full_name,
            user_id: emp.user_id,
            overtimeHours: Math.round(overtimeHours * 10) / 10,
            limitHours: WEEKLY_WORK_LIMIT_HOURS,
          });

          // Check if notification was already sent this week for this employee
          const { data: existingOvertimeNotif } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', emp.user_id)
            .eq('type', 'overtime_exceeded')
            .gte('created_at', `${weekStartStr}T00:00:00`)
            .maybeSingle();

          if (!existingOvertimeNotif) {
            // Notify employee
            await supabase
              .from('notifications')
              .insert({
                user_id: emp.user_id,
                title: '⚠️ Limite Semanal de Horas Excedido',
                message: `Você trabalhou ${Math.round(totalWorkedHours * 10) / 10}h esta semana, excedendo o limite de ${WEEKLY_WORK_LIMIT_HOURS}h (+${Math.round(overtimeHours * 10) / 10}h extra). Converse com a administração.`,
                type: 'overtime_exceeded',
                link: '/painel/ponto',
              });

            overtimeNotificationsCreated.push(emp.full_name);
            console.log(`Overtime notification created for ${emp.full_name}`);

            // Send email if Resend is configured
            if (resendApiKey) {
              try {
                const { data: userData } = await supabase.auth.admin.getUserById(emp.user_id);
                
                if (userData?.user?.email) {
                  await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${resendApiKey}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      from: "Creche Pimpolinhos <onboarding@resend.dev>",
                      to: [userData.user.email],
                      subject: "⚠️ Limite Semanal de Horas Excedido - Creche Pimpolinhos",
                      html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                          <h2 style="color: #f59e0b;">⚠️ Limite Semanal de Horas Excedido</h2>
                          <p>Olá <strong>${emp.full_name}</strong>,</p>
                          <p>Identificamos que você trabalhou <strong>${Math.round(totalWorkedHours * 10) / 10} horas</strong> esta semana.</p>
                          <p style="color: #dc2626;"><strong>O limite semanal de ${WEEKLY_WORK_LIMIT_HOURS} horas foi excedido em ${Math.round(overtimeHours * 10) / 10}h.</strong></p>
                          <p>Por favor, entre em contato com a administração para regularização e ajuste do seu banco de horas.</p>
                          <div style="margin: 30px 0;">
                            <a href="https://crechepimpolinhos.lovable.app/painel/ponto" 
                               style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                              Ver Meu Ponto
                            </a>
                          </div>
                          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                          <p style="color: #999; font-size: 12px;">
                            Creche Pimpolinhos - Sistema de Gestão
                          </p>
                        </div>
                      `,
                    }),
                  });
                }
              } catch (emailError) {
                console.error(`Error sending overtime email to ${emp.full_name}:`, emailError);
              }
            }
          }
        }
      }

      // Notify admins about overtime violations
      if (overtimeAlerts.length > 0) {
        const { data: admins } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin');

        if (admins && admins.length > 0) {
          const alertDetails = overtimeAlerts.map(e => `${e.employee_name} (${e.overtimeHours}h)`).join(', ');
          
          for (const admin of admins) {
            // Check if admin notification already sent today for overtime
            const { data: existingAdminOvertimeNotif } = await supabase
              .from('notifications')
              .select('id')
              .eq('user_id', admin.user_id)
              .eq('type', 'admin_overtime_exceeded')
              .gte('created_at', `${todayStr}T00:00:00`)
              .maybeSingle();

            if (!existingAdminOvertimeNotif) {
              await supabase
                .from('notifications')
                .insert({
                  user_id: admin.user_id,
                  title: '⚠️ Funcionários com Hora Extra Excedida',
                  message: `${overtimeAlerts.length} funcionário(s) excederam o limite de hora extra: ${alertDetails}`,
                  type: 'admin_overtime_exceeded',
                  link: '/painel/ponto',
                });
            }
          }
        }
      }
    }

    console.log(`Found ${overtimeAlerts.length} employees exceeding overtime limit`);

    return new Response(
      JSON.stringify({
        message: "Check completed",
        missingClockouts: {
          count: employeesWithMissingClockout.length,
          notificationsCreated,
          emailsSent,
        },
        overtimeExceeded: {
          count: overtimeAlerts.length,
          employees: overtimeAlerts,
          notificationsCreated: overtimeNotificationsCreated,
        },
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