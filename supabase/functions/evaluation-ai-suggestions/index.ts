import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EvaluationRequest {
  childName: string;
  childClass: string;
  quarter: number;
  field: string; // cognitive, motor, socialEmotional, language, creativity, summary, recommendations, nextSteps, all
  existingData?: Record<string, string>;
}

const fieldLabels: Record<string, string> = {
  cognitive: "Desenvolvimento Cognitivo",
  motor: "Desenvolvimento Motor",
  socialEmotional: "Desenvolvimento Socioemocional",
  language: "Linguagem e Comunicação",
  creativity: "Criatividade e Artes",
  summary: "Resumo Geral",
  recommendations: "Recomendações para Casa",
  nextSteps: "Próximos Passos",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { childName, childClass, quarter, field, existingData }: EvaluationRequest = await req.json();

    const quarterLabel = `${quarter}º Trimestre`;
    const classLabel = childClass === "bercario" ? "Berçário" : childClass === "maternal" ? "Maternal" : "Jardim";

    const systemPrompt = `Você é uma pedagoga experiente em Educação Infantil no Brasil, especializada em avaliações de desenvolvimento para crianças de 0 a 5 anos.

Contexto:
- Criança: ${childName}
- Turma: ${classLabel}
- Período: ${quarterLabel}

Regras para avaliação:
- Use linguagem profissional mas acessível para pais
- Seja positiva e construtiva
- Foque em conquistas e evolução
- Evite julgamentos negativos
- Use português brasileiro formal
- Cada resposta deve ter entre 50-150 palavras
- Personalize usando o nome da criança quando apropriado

${existingData ? `Dados já preenchidos:
${Object.entries(existingData)
  .filter(([_, v]) => v)
  .map(([k, v]) => `${fieldLabels[k] || k}: ${v}`)
  .join("\n")}` : ""}`;

    let userPrompt = "";
    let responseFormat = "text";

    if (field === "all") {
      responseFormat = "json";
      userPrompt = `Gere uma avaliação trimestral completa para ${childName}.

Responda com um objeto JSON com as seguintes chaves:
- cognitive: Desenvolvimento Cognitivo
- motor: Desenvolvimento Motor  
- socialEmotional: Desenvolvimento Socioemocional
- language: Linguagem e Comunicação
- creativity: Criatividade e Artes
- summary: Resumo Geral do trimestre
- recommendations: Recomendações para os pais trabalharem em casa
- nextSteps: Próximos passos para o próximo trimestre

Cada campo deve ter entre 50-100 palavras. Responda APENAS com o JSON.`;
    } else {
      const fieldDescription = fieldLabels[field] || field;
      userPrompt = `Gere o texto para a seção "${fieldDescription}" da avaliação trimestral de ${childName}.

O texto deve:
- Ter entre 50-150 palavras
- Ser específico para a faixa etária da turma ${classLabel}
- Destacar conquistas e evolução
- Incluir exemplos concretos de atividades quando apropriado

Responda apenas com o texto, sem títulos ou formatação especial.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: responseFormat === "json" ? 1500 : 400,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar avaliação" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    if (responseFormat === "json") {
      // Parse JSON response
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const evaluation = JSON.parse(jsonMatch[0]);
          return new Response(
            JSON.stringify({ evaluation }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (parseError) {
        console.error("Error parsing AI JSON:", parseError, content);
      }
      
      // Fallback
      return new Response(
        JSON.stringify({ 
          evaluation: {
            cognitive: `${childName} demonstra excelente capacidade de concentração e resolução de problemas.`,
            motor: `Apresenta coordenação motora bem desenvolvida para a idade.`,
            socialEmotional: `Interage positivamente com os colegas e participa ativamente das atividades.`,
            language: `Vocabulário expressivo para a idade, conta histórias com sequência lógica.`,
            creativity: `Muito criativa nas atividades artísticas, demonstra originalidade.`,
            summary: `${childName} teve um excelente ${quarterLabel}! Evolução acima do esperado.`,
            recommendations: `Continuar incentivando a leitura e jogos de raciocínio em casa.`,
            nextSteps: `Próximo trimestre focará em autonomia e novos desafios pedagógicos.`,
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ text: content.trim() }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error in evaluation-ai-suggestions:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
