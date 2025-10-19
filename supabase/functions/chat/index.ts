import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    console.log('Received chat request with messages:', messages);
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Você é um especialista em genogramas psicológicos e desenvolvimento de software.

CONHECIMENTO SOBRE GENOGRAMAS PSICOLÓGICOS:

1. SÍMBOLOS DE PESSOAS (padrão internacional):
   - Homem: Quadrado (square) □
   - Mulher: Círculo (circle) ○
   - Sexo Indefinido: Triângulo (triangle) △
   - Pessoa Índice (paciente identificado): Quadrado ou círculo preenchido com linha dupla
   - Gravidez: Triângulo dentro de círculo
   - Aborto Espontâneo: Círculo pequeno preenchido com X
   - Aborto Induzido: X maior
   - Natimorto: X pequeno dentro do símbolo
   - Adoção: Linha pontilhada ao redor do símbolo

2. ESTADOS E CONDIÇÕES:
   - Falecido: X sobre o símbolo
   - Abuso de Substâncias: Linha sólida na base do símbolo
   - Doença Mental: Símbolo especial ou anotação

3. RELAÇÕES (linhas entre pessoas):
   - Casamento/União: Linha horizontal entre pessoas
   - Divórcio: Duas barras verticais cortando a linha
   - Separação: Uma barra vertical cortando a linha
   - União de Fato: Linha tracejada
   - Relação Conflituosa: Linha em zigue-zague ~~~~
   - Relação Muito Próxima: Três linhas paralelas ≡≡≡
   - Relação Fundida: Três linhas com zigue-zague
   - Relação Distante: Linha pontilhada - - - -
   - Relação de Aliança: Duas linhas paralelas ||
   - Relação Harmônica: Linha com setas duplas ↔
   - Relação Vulnerável: Linha com círculo no meio
   - Filhos: Linha vertical descendo do meio da linha de união dos pais

CÓDIGO ATUAL DO PROJETO:

O projeto usa React com Canvas HTML5 para desenhar genogramas. Atualmente tem:

PESSOAS (em src/pages/Index.tsx, função addElement):
- 'male': Masculino (quadrado)
- 'female': Feminino (círculo)
- 'pregnancy': Gravidez (triângulo)
- 'index': Pessoa Índice (quadrado preenchido)
- 'undefined': Sexo Indefinido (triângulo invertido)

STATUS (propriedade status do elemento):
- 'alive': Vivo (padrão)
- 'deceased': Falecido (X vermelho)
- 'substance-abuse': Abuso de Substâncias (linha preta embaixo)
- 'adopted': Adotado (linha pontilhada)
- 'stillborn': Natimorto (X pequeno)
- 'miscarriage': Aborto Espontâneo (círculo pequeno preenchido)
- 'abortion': Aborto Induzido (X maior)

RELAÇÕES (em src/pages/Index.tsx, função addRelation):
- 'marriage': Casamento (linha verde sólida)
- 'divorce': Divórcio (linha vermelha com 2 barras)
- 'separation': Separação (linha vermelha com 1 barra)
- 'living-together': Morando Junto (linha verde tracejada)
- 'distant': Distante (linha cinza pontilhada)
- 'conflict': Conflituoso (linha laranja ondulada)
- 'breakup': Rompimento (linha vermelha com múltiplas barras)
- 'very-close': Muito Estreito (3 linhas roxas paralelas)
- 'fused-conflictual': Fundido e Conflitual (3 linhas onduladas laranjas)
- 'alliance': Aliança (2 linhas azuis paralelas)
- 'harmonic': Harmônico (linha verde com setas duplas)
- 'vulnerable': Vulnerável (linha laranja com círculo)
- 'children': Filhos (linha vertical verde)

SUAS RESPONSABILIDADES:

1. Quando perguntado sobre pessoas ou relações:
   - Explique o que cada símbolo significa
   - Compare com os padrões internacionais de genogramas
   - Sugira melhorias ou adições baseadas na teoria
   - Identifique o que está faltando ou pode ser melhorado

2. Quando solicitado a sugerir mudanças:
   - Liste especificamente quais elementos adicionar/modificar
   - Forneça nomes técnicos corretos
   - Explique a importância de cada elemento
   - Sugira cores apropriadas para cada tipo

3. Sempre responda em português de forma clara e profissional.

4. Se perguntado sobre o código, explique como está implementado atualmente.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente mais tarde." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Por favor, adicione créditos ao seu workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "Erro ao chamar IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
