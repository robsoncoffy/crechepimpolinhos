import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// GHL Pipeline Configuration - Jornada de Matrícula
const GHL_PIPELINE = {
  id: "gfqyCfBI23CDEkJk9gwC",
  stages: {
    NOVO_LEAD: "3c964fcf-2df2-4547-9446-2f503d51fe85",
    PRE_MATRICULA_RECEBIDA: "ebe92739-d1c6-4721-8d05-129658cf3a36",
  },
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

    // Format phone to international format (+55)
    const formatPhoneForGHL = (phone: string | null): string => {
      if (!phone) return "";
      // Remove all non-digits
      let digits = phone.replace(/\D/g, "");
      // If starts with 0, remove it
      if (digits.startsWith("0")) {
        digits = digits.substring(1);
      }
      // If doesn't start with 55, add it
      if (!digits.startsWith("55")) {
        digits = "55" + digits;
      }
      return "+" + digits;
    };

    const formattedPhone = formatPhoneForGHL(preEnrollment.phone);

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
      phone: formattedPhone,
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

    let ghlContactId = ghlResult.contact?.id;

    // Handle duplicate contact - use existing contact ID and update tags
    if (!ghlResponse.ok) {
      if (ghlResult.meta?.contactId) {
        // Contact already exists, use existing ID and update tags
        console.log("Contact already exists, updating tags for:", ghlResult.meta.contactId);
        ghlContactId = ghlResult.meta.contactId;

        // Update existing contact with tags
        const updateResponse = await fetch(
          `https://services.leadconnectorhq.com/contacts/${ghlContactId}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${GHL_API_KEY}`,
              "Content-Type": "application/json",
              Version: "2021-07-28",
            },
            body: JSON.stringify({
              tags: ["pré-matrícula", "site", "novo-lead", "pre-matricula-completa"],
              customFields: ghlPayload.customFields,
            }),
          }
        );

        if (!updateResponse.ok) {
          const updateError = await updateResponse.text();
          console.error("GHL update error:", updateError);
        } else {
          console.log("Successfully updated existing contact with tags");
        }
      } else {
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
    }

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

    // Send WhatsApp welcome message directly (bypassing GHL workflows)
    const classTypeLabelsWhatsApp: Record<string, string> = {
      bercario: "Berçário",
      bercario1: "Berçário 1",
      bercario2: "Berçário 2",
      maternal_1: "Maternal 1",
      maternal_2: "Maternal 2",
      jardim_1: "Jardim 1",
      jardim_2: "Jardim 2",
    };

    const childFirstName = preEnrollment.child_name.split(" ")[0];
    const turmaDesejada = classTypeLabelsWhatsApp[preEnrollment.desired_class_type] || preEnrollment.desired_class_type;
    
    const whatsappMessage = `🎈 *Olá, ${firstName}!*

Recebemos a pré-matrícula de *${childFirstName}* para a turma de *${turmaDesejada}* na Creche Pimpolinhos!

✅ Nossa equipe vai analisar sua solicitação e em breve você receberá uma resposta.

📞 Se tiver dúvidas, é só responder esta mensagem!

💜 Creche Pimpolinhos`;

    // Send WhatsApp message via GHL Conversations API
    try {
      const whatsappResponse = await fetch(
        "https://services.leadconnectorhq.com/conversations/messages",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GHL_API_KEY}`,
            "Content-Type": "application/json",
            Version: "2021-04-15",
          },
          body: JSON.stringify({
            type: "WhatsApp",
            contactId: ghlContactId,
            message: whatsappMessage,
            body: whatsappMessage,
          }),
        }
      );

      if (whatsappResponse.ok) {
        const whatsappResult = await whatsappResponse.json();
        console.log("WhatsApp message sent successfully:", whatsappResult.messageId || whatsappResult.id);
      } else {
        const errorText = await whatsappResponse.text();
        console.warn("WhatsApp message failed (will retry via workflow):", errorText);
      }
    } catch (whatsappError) {
      console.warn("WhatsApp send error:", whatsappError);
    }

    // Create opportunity in pipeline - Stage: Pré-Matrícula Recebida
    try {
      const createOppResponse = await fetch(
        `https://services.leadconnectorhq.com/opportunities/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GHL_API_KEY}`,
            "Content-Type": "application/json",
            Version: "2021-07-28",
          },
          body: JSON.stringify({
            locationId: GHL_LOCATION_ID,
            contactId: ghlContactId,
            pipelineId: GHL_PIPELINE.id,
            pipelineStageId: GHL_PIPELINE.stages.PRE_MATRICULA_RECEBIDA,
            name: `Matrícula - ${preEnrollment.child_name}`,
            status: "open",
          }),
        }
      );

      if (createOppResponse.ok) {
        console.log("Created opportunity in pipeline: Pré-Matrícula Recebida");
      } else {
        const oppError = await createOppResponse.text();
        console.warn("Failed to create opportunity:", oppError);
      }
    } catch (oppError) {
      console.warn("Error creating opportunity:", oppError);
    }

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