import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ActivityRequest {
  classType: string;
  dayOfWeek: number;
  activityType: "morning" | "afternoon" | "materials" | "objectives";
  theme?: string;
}

const classLabels: Record<string, string> = {
  bercario: "Berçário (0-2 anos)",
  maternal: "Maternal (2-4 anos)",
  jardim: "Jardim (4-6 anos)",
};

const activityLabels: Record<string, string> = {
  morning: "atividades da manhã",
  afternoon: "atividades da tarde",
  materials: "materiais necessários",
  objectives: "objetivos pedagógicos",
};

const dayLabels = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"];

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { classType, dayOfWeek, activityType, theme }: ActivityRequest = await req.json();

    const classLabel = classLabels[classType] || classType;
    const activityLabel = activityLabels[activityType];
    const dayLabel = dayLabels[dayOfWeek] || "dia da semana";

    const systemPrompt = `Você é uma pedagoga especializada em educação infantil no Brasil. 
Você cria planos de atividades criativos, lúdicos e pedagogicamente adequados para crianças em creches.
Sempre considere:
- A faixa etária da turma
- Atividades que desenvolvam múltiplas habilidades (motor, cognitivo, social, linguagem)
- Materiais acessíveis e seguros para crianças
- Atividades práticas e engajadoras

Responda em português brasileiro, de forma clara e organizada.`;

    let userPrompt: string;

    if (activityType === "morning" || activityType === "afternoon") {
      userPrompt = `Crie 3 sugestões de ${activityLabel} para a turma ${classLabel} na ${dayLabel}.
${theme ? `Tema sugerido: ${theme}` : ""}

Cada sugestão deve ter:
- Nome da atividade
- Breve descrição (1-2 frases)
- Duração aproximada

Retorne as sugestões em formato JSON como um array:
[
  {"title": "Nome da Atividade", "description": "Descrição da atividade", "duration": "30 min"},
  ...
]`;
    } else if (activityType === "materials") {
      userPrompt = `Liste os materiais necessários para atividades pedagógicas da turma ${classLabel}.
${theme ? `Tema: ${theme}` : ""}

Retorne em formato JSON como um array de strings com os materiais:
["Material 1", "Material 2", ...]`;
    } else {
      userPrompt = `Sugira 3 objetivos pedagógicos para atividades da turma ${classLabel} na ${dayLabel}.
${theme ? `Tema: ${theme}` : ""}

Os objetivos devem seguir a BNCC (Base Nacional Comum Curricular) para educação infantil.

Retorne em formato JSON como um array:
[
  {"objective": "Objetivo pedagógico", "bncc_code": "EI01EO01"},
  ...
]`;
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
        max_tokens: 1024,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Por favor, adicione créditos à sua conta." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Erro ao gerar sugestões com IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    let suggestions: any[] = [];

    if (jsonMatch) {
      try {
        suggestions = JSON.parse(jsonMatch[0]);
      } catch {
        console.error("Failed to parse JSON from AI response");
      }
    }

    // Fallback suggestions if parsing fails
    if (suggestions.length === 0) {
      if (activityType === "morning" || activityType === "afternoon") {
        suggestions = [
          { title: "Roda de conversa", description: "Momento de socialização e troca de experiências", duration: "15 min" },
          { title: "Atividade sensorial", description: "Exploração de texturas e materiais diversos", duration: "30 min" },
          { title: "Música e movimento", description: "Cantigas de roda com expressão corporal", duration: "20 min" },
        ];
      } else if (activityType === "materials") {
        suggestions = ["Papel colorido", "Giz de cera", "Massinha de modelar", "Tintas atóxicas", "Brinquedos de encaixe"];
      } else {
        suggestions = [
          { objective: "Desenvolver a coordenação motora fina", bncc_code: "EI02CG03" },
          { objective: "Estimular a linguagem oral e expressiva", bncc_code: "EI02EF01" },
          { objective: "Promover a socialização e cooperação", bncc_code: "EI02EO03" },
        ];
      }
    }

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in activity-ai-suggestions:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
