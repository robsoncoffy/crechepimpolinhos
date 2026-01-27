// GHL Pipeline Configuration - Jornada de Matrícula
// This file centralizes all pipeline stage IDs for easy maintenance

export const GHL_PIPELINE = {
  id: "gfqyCfBI23CDEkJk9gwC",
  name: "Jornada de Matrícula",
  stages: {
    NOVO_LEAD: "3c964fcf-2df2-4547-9446-2f503d51fe85",
    PRE_MATRICULA_RECEBIDA: "ebe92739-d1c6-4721-8d05-129658cf3a36",
    AGUARDANDO_APROVACAO: "53392148-570b-449f-8326-e88ddb69751a",
    CADASTRO_EM_ANDAMENTO: "9eb929ad-0e14-48c9-aaea-b08b002d1792",
    CONTRATO_ENVIADO: "716d8093-2530-49d9-8b89-1956b028b973",
    CONTRATO_ASSINADO: "96393ddf-6958-4195-a063-872bfb57c250",
    AGUARDANDO_PAGAMENTO: "d83d3acb-f47c-4190-a958-ee26ed5d851b",
    MATRICULADO: "4a775fa7-06f2-4133-b0ac-2d0c47962973",
  },
};

// Helper function to move opportunity to a stage
export async function moveOpportunityToStage(
  ghlContactId: string,
  stageId: string,
  apiKey: string,
  locationId: string,
  tags?: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // First, find the opportunity for this contact
    const searchResponse = await fetch(
      `https://services.leadconnectorhq.com/opportunities/search`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Version: "2021-07-28",
        },
        body: JSON.stringify({
          locationId,
          contactId: ghlContactId,
          pipelineId: GHL_PIPELINE.id,
        }),
      }
    );

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.warn("GHL opportunity search failed:", errorText);
      
      // If no opportunity exists, create one
      const createResponse = await fetch(
        `https://services.leadconnectorhq.com/opportunities/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            Version: "2021-07-28",
          },
          body: JSON.stringify({
            locationId,
            contactId: ghlContactId,
            pipelineId: GHL_PIPELINE.id,
            pipelineStageId: stageId,
            name: "Matrícula",
            status: "open",
          }),
        }
      );

      if (!createResponse.ok) {
        const createError = await createResponse.text();
        console.error("Failed to create opportunity:", createError);
        return { success: false, error: createError };
      }

      console.log("Created new opportunity in stage:", stageId);
      
      // Update tags if provided
      if (tags && tags.length > 0) {
        await updateContactTags(ghlContactId, tags, apiKey);
      }
      
      return { success: true };
    }

    const searchResult = await searchResponse.json();
    const opportunities = searchResult.opportunities || [];

    if (opportunities.length === 0) {
      // Create new opportunity
      const createResponse = await fetch(
        `https://services.leadconnectorhq.com/opportunities/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            Version: "2021-07-28",
          },
          body: JSON.stringify({
            locationId,
            contactId: ghlContactId,
            pipelineId: GHL_PIPELINE.id,
            pipelineStageId: stageId,
            name: "Matrícula",
            status: "open",
          }),
        }
      );

      if (!createResponse.ok) {
        const createError = await createResponse.text();
        console.error("Failed to create opportunity:", createError);
        return { success: false, error: createError };
      }

      console.log("Created new opportunity in stage:", stageId);
    } else {
      // Move existing opportunity
      const opportunityId = opportunities[0].id;
      
      const updateResponse = await fetch(
        `https://services.leadconnectorhq.com/opportunities/${opportunityId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            Version: "2021-07-28",
          },
          body: JSON.stringify({
            pipelineStageId: stageId,
            pipelineId: GHL_PIPELINE.id,
          }),
        }
      );

      if (!updateResponse.ok) {
        const updateError = await updateResponse.text();
        console.error("Failed to move opportunity:", updateError);
        return { success: false, error: updateError };
      }

      console.log("Moved opportunity", opportunityId, "to stage:", stageId);
    }

    // Update tags if provided
    if (tags && tags.length > 0) {
      await updateContactTags(ghlContactId, tags, apiKey);
    }

    return { success: true };
  } catch (error) {
    console.error("Error moving opportunity:", error);
    return { success: false, error: String(error) };
  }
}

// Helper to update contact tags
async function updateContactTags(
  contactId: string,
  tags: string[],
  apiKey: string
): Promise<void> {
  try {
    await fetch(
      `https://services.leadconnectorhq.com/contacts/${contactId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Version: "2021-07-28",
        },
        body: JSON.stringify({ tags }),
      }
    );
    console.log("Updated contact tags:", tags);
  } catch (error) {
    console.warn("Failed to update tags:", error);
  }
}
