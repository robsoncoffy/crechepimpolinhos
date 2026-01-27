import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncContactRequest {
  preEnrollmentId: string;
}

interface UpdateStageRequest {
  ghl_contact_id: string;
  stage?: string;
  tags?: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GHL_API_KEY = Deno.env.get("GHL_API_KEY");
    const GHL_LOCATION_ID = Deno.env.get("GHL_LOCATION_ID");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GHL_API_KEY || !GHL_LOCATION_ID) {
      throw new Error("GHL credentials not configured");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    // Handle stage/tag update endpoint
    if (path === "update-stage") {
      const { ghl_contact_id, stage, tags } = await req.json() as UpdateStageRequest;

      if (!ghl_contact_id) {
        throw new Error("Missing ghl_contact_id");
      }

      if (!stage && (!tags || tags.length === 0)) {
        throw new Error("Missing stage or tags");
      }

      // Map stage names to GHL pipeline stage IDs (these need to be configured in GHL)
      const stageMap: Record<string, string> = {
        "Novo Lead": "new_lead",
        "Primeiro Contato": "first_contact",
        "Visita Agendada": "visit_scheduled",
        "Proposta Enviada": "proposal_sent",
        "Matriculado": "enrolled",
      };

      // Build tags array
      const allTags: string[] = [...(tags || [])];
      if (stage) {
        const pipelineStage = stageMap[stage] || stage;
        allTags.push(pipelineStage);
      }

      // Update contact in GHL with new tags
      const ghlResponse = await fetch(
        `https://services.leadconnectorhq.com/contacts/${ghl_contact_id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${GHL_API_KEY}`,
            "Content-Type": "application/json",
            Version: "2021-07-28",
          },
          body: JSON.stringify({
            tags: allTags,
          }),
        }
      );

      if (!ghlResponse.ok) {
        const errorText = await ghlResponse.text();
        console.error("GHL stage/tag update failed:", errorText);
        throw new Error(`GHL API error: ${ghlResponse.status}`);
      }

      return new Response(
        JSON.stringify({ success: true, tags: allTags }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle contact sync endpoint
    const { preEnrollmentId } = await req.json() as SyncContactRequest;

    if (!preEnrollmentId) {
      throw new Error("Missing preEnrollmentId");
    }

    // Fetch pre-enrollment data
    const { data: preEnrollment, error: fetchError } = await supabase
      .from("pre_enrollments")
      .select("*")
      .eq("id", preEnrollmentId)
      .single();

    if (fetchError || !preEnrollment) {
      throw new Error(`Pre-enrollment not found: ${fetchError?.message}`);
    }

    // Skip municipal vacancies - they should not be synced to GHL
    if (preEnrollment.vacancy_type === "municipal") {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Municipal vacancy - not synced to GHL",
          skipped: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Skip if already synced
    if (preEnrollment.ghl_contact_id) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          ghl_contact_id: preEnrollment.ghl_contact_id,
          message: "Already synced" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse parent name into first and last name
    const nameParts = preEnrollment.parent_name.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Map class types to Portuguese labels
    const classTypeLabels: Record<string, string> = {
      bercario1: "Berçário 1",
      bercario2: "Berçário 2",
      maternal1: "Maternal 1",
      maternal2: "Maternal 2",
      jardim1: "Jardim 1",
      jardim2: "Jardim 2",
    };

    const shiftTypeLabels: Record<string, string> = {
      manha: "Manhã",
      tarde: "Tarde",
      integral: "Integral",
    };

    // Create contact in GHL
    const ghlPayload = {
      locationId: GHL_LOCATION_ID,
      firstName,
      lastName,
      email: preEnrollment.email,
      phone: preEnrollment.phone,
      source: "Site Pimpolinhos",
      tags: ["pré-matrícula", "site", "novo-lead", "pre-matricula-completa"],
      customFields: [
        { key: "child_name", field_value: preEnrollment.child_name },
        { key: "child_birth_date", field_value: preEnrollment.child_birth_date },
        { key: "turma_desejada", field_value: classTypeLabels[preEnrollment.desired_class_type] || preEnrollment.desired_class_type },
        { key: "turno_desejado", field_value: shiftTypeLabels[preEnrollment.desired_shift_type] || preEnrollment.desired_shift_type },
        { key: "como_conheceu", field_value: preEnrollment.how_heard_about || "" },
        { key: "observacoes", field_value: preEnrollment.notes || "" },
      ],
    };

    console.log("Creating GHL contact:", JSON.stringify(ghlPayload));

    const ghlResponse = await fetch(
      "https://services.leadconnectorhq.com/contacts/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
          "Content-Type": "application/json",
          Version: "2021-07-28",
        },
        body: JSON.stringify(ghlPayload),
      }
    );

    const ghlResult = await ghlResponse.json();

    if (!ghlResponse.ok) {
      console.error("GHL API error:", ghlResult);
      
      // Update pre-enrollment with error
      await supabase
        .from("pre_enrollments")
        .update({
          ghl_sync_error: ghlResult.message || JSON.stringify(ghlResult),
        })
        .eq("id", preEnrollmentId);

      throw new Error(`GHL API error: ${ghlResult.message || ghlResponse.status}`);
    }

    const ghlContactId = ghlResult.contact?.id;

    if (!ghlContactId) {
      throw new Error("GHL did not return a contact ID");
    }

    // Update pre-enrollment with GHL contact ID
    const { error: updateError } = await supabase
      .from("pre_enrollments")
      .update({
        ghl_contact_id: ghlContactId,
        ghl_synced_at: new Date().toISOString(),
        ghl_sync_error: null,
      })
      .eq("id", preEnrollmentId);

    if (updateError) {
      console.error("Failed to update pre-enrollment:", updateError);
    }

    console.log("Successfully synced contact:", ghlContactId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        ghl_contact_id: ghlContactId 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in ghl-sync-contact:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});