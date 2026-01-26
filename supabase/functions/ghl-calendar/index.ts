import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GHL_API_BASE = "https://services.leadconnectorhq.com";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GHL_API_KEY = Deno.env.get("GHL_API_KEY");
    const GHL_LOCATION_ID = Deno.env.get("GHL_LOCATION_ID");

    if (!GHL_API_KEY || !GHL_LOCATION_ID) {
      throw new Error("Missing GHL_API_KEY or GHL_LOCATION_ID");
    }

    const { action, ...params } = await req.json();

    const headers = {
      "Authorization": `Bearer ${GHL_API_KEY}`,
      "Content-Type": "application/json",
      "Version": "2021-07-28",
    };

    let response;

    switch (action) {
      case "calendars": {
        // List all calendars for the location
        response = await fetch(
          `${GHL_API_BASE}/calendars/?locationId=${GHL_LOCATION_ID}`,
          { method: "GET", headers }
        );
        break;
      }

      case "free-slots": {
        // Get available time slots for a calendar
        const { calendarId, startDate, endDate, timezone = "America/Sao_Paulo" } = params;
        
        if (!calendarId || !startDate || !endDate) {
          throw new Error("Missing required params: calendarId, startDate, endDate");
        }

        response = await fetch(
          `${GHL_API_BASE}/calendars/${calendarId}/free-slots?startDate=${startDate}&endDate=${endDate}&timezone=${timezone}`,
          { method: "GET", headers }
        );
        break;
      }

      case "create-appointment": {
        // Create a new appointment
        const { 
          calendarId, 
          contactId, 
          startTime, 
          endTime, 
          title = "Visita Escolar",
          notes = "",
          timezone = "America/Sao_Paulo"
        } = params;

        if (!calendarId || !contactId || !startTime || !endTime) {
          throw new Error("Missing required params: calendarId, contactId, startTime, endTime");
        }

        response = await fetch(
          `${GHL_API_BASE}/calendars/events/appointments`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              calendarId,
              locationId: GHL_LOCATION_ID,
              contactId,
              startTime,
              endTime,
              title,
              notes,
              appointmentStatus: "confirmed",
              timezone,
            }),
          }
        );
        break;
      }

      case "list-appointments": {
        // List appointments for a date range
        const { calendarId, startDate, endDate } = params;
        
        let url = `${GHL_API_BASE}/calendars/events?locationId=${GHL_LOCATION_ID}`;
        if (calendarId) url += `&calendarId=${calendarId}`;
        if (startDate) url += `&startTime=${startDate}`;
        if (endDate) url += `&endTime=${endDate}`;

        response = await fetch(url, { method: "GET", headers });
        break;
      }

      case "get-appointment": {
        // Get a single appointment by ID
        const { appointmentId } = params;
        
        if (!appointmentId) {
          throw new Error("Missing required param: appointmentId");
        }

        response = await fetch(
          `${GHL_API_BASE}/calendars/events/appointments/${appointmentId}`,
          { method: "GET", headers }
        );
        break;
      }

      case "update-appointment": {
        // Update an existing appointment
        const { 
          appointmentId, 
          startTime, 
          endTime, 
          title,
          notes,
          appointmentStatus 
        } = params;

        if (!appointmentId) {
          throw new Error("Missing required param: appointmentId");
        }

        const updateBody: Record<string, unknown> = {};
        if (startTime) updateBody.startTime = startTime;
        if (endTime) updateBody.endTime = endTime;
        if (title) updateBody.title = title;
        if (notes !== undefined) updateBody.notes = notes;
        if (appointmentStatus) updateBody.appointmentStatus = appointmentStatus;

        response = await fetch(
          `${GHL_API_BASE}/calendars/events/appointments/${appointmentId}`,
          {
            method: "PUT",
            headers,
            body: JSON.stringify(updateBody),
          }
        );
        break;
      }

      case "cancel-appointment": {
        // Cancel/delete an appointment
        const { appointmentId } = params;
        
        if (!appointmentId) {
          throw new Error("Missing required param: appointmentId");
        }

        response = await fetch(
          `${GHL_API_BASE}/calendars/events/appointments/${appointmentId}`,
          { method: "DELETE", headers }
        );

        // DELETE returns 200 with no body on success
        if (response.ok) {
          return new Response(
            JSON.stringify({ success: true, message: "Appointment cancelled" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    if (!response) {
      throw new Error("No response from GHL API");
    }

    const data = await response.json();

    if (!response.ok) {
      console.error("GHL API error:", data);
      throw new Error(data.message || data.error || "GHL API error");
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in ghl-calendar:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
