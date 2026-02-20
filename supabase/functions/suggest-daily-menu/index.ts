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

    const dayNames = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];
    const dayName = dayNames[dayOfWeek - 1] || 'Segunda-feira';

    // Random seed to ensure variety
    const randomSeed = Math.random().toString(36).substring(7);
    const seasonalFoods = ['abóbora', 'batata doce', 'cenoura', 'chuchu', 'mandioquinha', 'beterraba', 'abobrinha'];
    const randomSeasonal = seasonalFoods[Math.floor(Math.random() * seasonalFoods.length)];

    const previousMenusContext = previousMenus && previousMenus.length > 0
      ? `\n\nCardápios anteriores (EVITE repetir esses alimentos):\n${previousMenus.map((m: any) => 
          `- ${m.day}: ${m.breakfast || ''}, ${m.lunch || ''}, ${m.snack || ''}`
        ).join('\n')}`
      : '';

    let systemPrompt = '';
    let jsonFormat = '';

    if (menuType === 'bercario_0_6') {
      // For 0-6 months - only milk but with variations in quantity and type
      const milkOptions = [
        { desc: 'Leite materno exclusivo', qty: 'sob demanda' },
        { desc: 'Fórmula infantil NAN 1', qty: '120ml' },
        { desc: 'Fórmula infantil Aptamil 1', qty: '150ml' },
        { desc: 'Leite materno', qty: '100-150ml' },
        { desc: 'Fórmula infantil Nestogeno 1', qty: '130ml' },
        { desc: 'Leite materno ou fórmula', qty: '120-180ml' },
      ];
      
      // Generate different random options for each meal
      const getRandomMilk = () => milkOptions[Math.floor(Math.random() * milkOptions.length)];
      const breakfast = getRandomMilk();
      const morningSnack = getRandomMilk();
      const lunch = getRandomMilk();
      const bottle = getRandomMilk();
      const snack = getRandomMilk();
      const preDinner = getRandomMilk();
      const dinner = getRandomMilk();

      // Return directly without AI call for 0-6 months
      const suggestion = {
        breakfast: breakfast.desc,
        breakfast_qty: breakfast.qty,
        breakfast_time: '07:30',
        morning_snack: morningSnack.desc,
        morning_snack_qty: morningSnack.qty,
        morning_snack_time: '09:30',
        lunch: lunch.desc,
        lunch_qty: lunch.qty,
        lunch_time: '11:30',
        bottle: bottle.desc,
        bottle_qty: bottle.qty,
        bottle_time: '13:00',
        snack: snack.desc,
        snack_qty: snack.qty,
        snack_time: '14:30',
        pre_dinner: preDinner.desc,
        pre_dinner_qty: preDinner.qty,
        pre_dinner_time: '16:30',
        dinner: dinner.desc,
        dinner_qty: dinner.qty,
        dinner_time: '17:30'
      };

      return new Response(
        JSON.stringify({ suggestion }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (menuType === 'bercario_6_12') {
      // For 6 months to 1 year
      systemPrompt = `Você é uma nutricionista brasileira especializada em alimentação infantil para bebês de 6 meses a 1 ano.

REGRAS OBRIGATÓRIAS:
1. Sugira papinhas de frutas e legumes bem amassados
2. Introduza proteínas em pequenas quantidades: frango desfiado fino, carne moída bem cozida
3. Texturas: purês, papinhas bem amassadas
4. Use ingredientes brasileiros: ${randomSeasonal}, banana amassada, maçã raspada, pera cozida
5. Mamadeira ainda é importante nessa faixa
6. EVITE: mel, açúcar, sal, alimentos duros ou com risco de engasgo
7. Cada descrição deve ter NO MÁXIMO 40 caracteres

${previousMenusContext}

Gere um cardápio DIFERENTE e CRIATIVO para ${dayName}. Código de variação: ${randomSeed}`;

      jsonFormat = `{
  "breakfast": "descrição curta (max 40 chars)",
  "breakfast_qty": "quantidade por criança (ex: 80g, 120ml)",
  "breakfast_time": "07:30",
  "morning_snack": "descrição curta",
  "morning_snack_qty": "quantidade",
  "morning_snack_time": "09:30",
  "lunch": "descrição curta",
  "lunch_qty": "quantidade",
  "lunch_time": "11:00",
  "bottle": "tipo de leite/fórmula",
  "bottle_qty": "quantidade em ml",
  "bottle_time": "13:00",
  "snack": "descrição curta",
  "snack_qty": "quantidade",
  "snack_time": "15:00",
  "pre_dinner": "descrição curta",
  "pre_dinner_qty": "quantidade",
  "pre_dinner_time": "16:30",
  "dinner": "descrição curta",
  "dinner_qty": "quantidade",
  "dinner_time": "17:30"
}`;
    } else if (menuType === 'bercario_12_24') {
      // For 1 year to 2 years
      systemPrompt = `Você é uma nutricionista brasileira especializada em alimentação infantil para crianças de 1 a 2 anos.

REGRAS OBRIGATÓRIAS:
1. Criança já mastiga bem - ofereça texturas mais firmes
2. Varie as preparações: arroz, feijão amassado, carnes em pedaços pequenos
3. Use ingredientes brasileiros: ${randomSeasonal}, arroz, feijão, carne, frango, legumes variados
4. Inclua: frutas em pedaços, legumes cozidos, proteínas variadas
5. Mamadeira complementar, mas foco em comida sólida
6. EVITE: ultraprocessados, frituras, excesso de sal
7. Cada descrição deve ter NO MÁXIMO 50 caracteres

${previousMenusContext}

Gere um cardápio DIFERENTE e CRIATIVO para ${dayName}. Código de variação: ${randomSeed}`;

      jsonFormat = `{
  "breakfast": "descrição curta (max 50 chars)",
  "breakfast_qty": "quantidade por criança (ex: 120g, 150ml)",
  "breakfast_time": "07:30",
  "morning_snack": "descrição curta",
  "morning_snack_qty": "quantidade",
  "morning_snack_time": "09:30",
  "lunch": "descrição curta",
  "lunch_qty": "quantidade",
  "lunch_time": "11:00",
  "bottle": "tipo de leite ou complemento",
  "bottle_qty": "quantidade em ml",
  "bottle_time": "13:00",
  "snack": "descrição curta",
  "snack_qty": "quantidade",
  "snack_time": "15:00",
  "pre_dinner": "descrição curta",
  "pre_dinner_qty": "quantidade",
  "pre_dinner_time": "16:30",
  "dinner": "descrição curta",
  "dinner_qty": "quantidade",
  "dinner_time": "17:30"
}`;
    } else {
      // maternal (2-5 years)
      systemPrompt = `Você é uma nutricionista brasileira especializada em alimentação escolar para crianças de 2 a 5 anos.

REGRAS OBRIGATÓRIAS:
1. Siga as recomendações do PNAE
2. Inclua: arroz, feijão, proteínas variadas, legumes, frutas
3. Use ingredientes brasileiros e sazonais como ${randomSeasonal}
4. Varie as preparações: grelhado, cozido, assado, refogado
5. Evite ultraprocessados e frituras
6. Cada descrição deve ter NO MÁXIMO 60 caracteres

${previousMenusContext}

Gere um cardápio DIFERENTE e CRIATIVO para ${dayName}. Código de variação: ${randomSeed}`;

      jsonFormat = `{
  "breakfast": "descrição do café (max 60 chars)",
  "breakfast_qty": "quantidade por criança (ex: 200ml, 80g)",
  "breakfast_time": "08:00",
  "morning_snack": "descrição do lanche",
  "morning_snack_qty": "quantidade",
  "morning_snack_time": "09:30",
  "lunch": "descrição do almoço",
  "lunch_qty": "porção por criança",
  "lunch_time": "11:30",
  "snack": "descrição do lanche da tarde",
  "snack_qty": "quantidade",
  "snack_time": "15:30",
  "dinner": "descrição do jantar",
  "dinner_qty": "porção por criança",
  "dinner_time": "18:00"
}`;
    }

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
          { role: 'user', content: `Gere um cardápio saudável para ${dayName}. Retorne APENAS o JSON no formato:\n${jsonFormat}` }
        ],
        temperature: 1.0,
        max_tokens: 1000
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