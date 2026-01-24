import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { menuType, dayOfWeek, previousMenus } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const menuTypeDescription = menuType === 'bercario_0_6' 
      ? 'bebês de 0 a 6 meses (apenas leite materno ou fórmula)'
      : menuType === 'bercario_6_24'
        ? 'bebês de 6 meses a 2 anos (papinhas, frutas amassadas, sopas leves)'
        : 'crianças de 2 a 5 anos (refeições completas, variedade de alimentos)';

    const dayNames = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];
    const dayName = dayNames[dayOfWeek - 1] || 'Segunda-feira';

    const previousMenusContext = previousMenus && previousMenus.length > 0
      ? `\n\nCardápios anteriores para referência de preferências:\n${previousMenus.map((m: any) => 
          `- ${m.day}: Café: ${m.breakfast || 'N/A'}, Almoço: ${m.lunch || 'N/A'}, Lanche: ${m.snack || 'N/A'}`
        ).join('\n')}`
      : '';

    const systemPrompt = `Você é uma nutricionista brasileira especializada em alimentação infantil.
    
Sua tarefa é sugerir um cardápio completo para ${dayName} para ${menuTypeDescription}.

${previousMenusContext}

REGRAS IMPORTANTES:
1. Siga as recomendações do PNAE (Programa Nacional de Alimentação Escolar)
2. Varie os alimentos em relação aos cardápios anteriores
3. Use ingredientes típicos brasileiros e sazonais
4. Considere a faixa etária e textura adequada dos alimentos
5. Evite alimentos ultraprocessados
6. Inclua proteínas, carboidratos, vitaminas e minerais de forma equilibrada

Retorne APENAS um JSON válido no formato:
{
  "breakfast": "descrição do café da manhã",
  "breakfast_time": "07:30",
  "morning_snack": "descrição do lanche da manhã",
  "morning_snack_time": "09:30",
  "lunch": "descrição do almoço",
  "lunch_time": "11:30",
  "snack": "descrição do lanche da tarde",
  "snack_time": "14:30",
  "dinner": "descrição do jantar",
  "dinner_time": "17:00"
}

${menuType === 'bercario_0_6' ? 'Para bebês de 0-6 meses, use apenas "Leite materno" ou "Fórmula infantil" em todas as refeições.' : ''}
${menuType === 'bercario_6_24' ? 'Adicione também "bottle": "Fórmula ou leite" e "bottle_time": "16:00" no JSON.' : ''}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Gere um cardápio saudável e balanceado para ${dayName}.` }
        ],
        temperature: 0.7,
        max_tokens: 800
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições atingido. Tente novamente em alguns segundos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Erro ao gerar sugestão' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';
    
    // Extract JSON from AI response
    let suggestion = null;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        suggestion = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Content:', aiContent);
    }

    if (!suggestion) {
      return new Response(
        JSON.stringify({ error: 'Não foi possível processar a sugestão' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ suggestion }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in suggest-daily-menu:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
