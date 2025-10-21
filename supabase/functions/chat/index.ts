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
    const { messages, extractFamily } = await req.json();
    console.log('Received chat request with messages:', messages);
    console.log('Extract family mode:', extractFamily);
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Se extractFamily for true, usar modo de extração de dados
    if (extractFamily) {
      const extractionPrompt = `Você é um assistente especialista em genogramas familiares.
Seu papel é interpretar o texto enviado pelo usuário e gerar automaticamente a estrutura do genograma, identificando pessoas, relações familiares e o tipo de vínculo entre elas.

REGRAS PARA IDENTIFICAR RELAÇÕES:

1. Se o texto mencionar "casados", "marido e mulher", "casal", "juntos", "cônjuges", "pais" → use "marriage" (casamento/união).

2. Se mencionar "separados", "divorciados", "ex-marido", "ex-esposa", "ex-cônjuge" → use "separation" (separação/relação encerrada).

3. Se o texto mencionar "namorados", "união estável", "moram juntos", "companheiros" → use "living-together" (união não formalizada).

4. Se o texto disser apenas "pai" e "mãe" sem contexto adicional → assuma "marriage" SOMENTE se não houver menção explícita de separação ou divórcio.

5. Quando gerar o genograma, garanta que pais separados NÃO apareçam como casados. A relação entre eles deve usar o tipo "separation", mesmo que tenham filhos em comum.

OUTRAS INSTRUÇÕES:
- Se o usuário não informar nome, deixe vazio
- Se não informar idade, deixe vazio
- Identifique o gênero pelo papel (pai=male, mãe=female, filho/irmão=male, filha/irmã=female)
- Identifique outras relações mencionadas (distante, próximo, conflito, falecido, etc.)
- Irmãos podem ser chamados de filho/filha também

OBJETIVO: Representar com precisão o tipo de relação familiar e emocional entre as pessoas, não apenas o parentesco biológico.

Retorne os dados estruturados usando a ferramenta extract_family_data.`;

      const requestBody: any = {
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: extractionPrompt },
          ...messages,
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_family_data",
              description: "Extrai dados estruturados sobre membros da família e relações",
              parameters: {
                type: "object",
                properties: {
                  members: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Nome da pessoa (opcional)" },
                        age: { type: "string", description: "Idade (opcional)" },
                        gender: { 
                          type: "string", 
                          enum: ["male", "female", "undefined"],
                          description: "Gênero da pessoa"
                        },
                        role: { 
                          type: "string",
                          description: "Papel familiar (pai, mãe, filho, filha, irmão, irmã)"
                        },
                        status: {
                          type: "string",
                          enum: ["alive", "deceased", "adopted", "stillborn", "miscarriage", "abortion", "substance-abuse"],
                          description: "Status da pessoa (opcional)"
                        }
                      },
                      required: ["gender", "role"]
                    }
                  },
                  relations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { 
                          type: "string",
                          description: "Tipo de relação (casamento, separação, divórcio, distante, próximo, conflito, etc.)"
                        },
                        members: {
                          type: "array",
                          items: { type: "string" },
                          description: "Papéis dos membros envolvidos"
                        }
                      },
                      required: ["type", "members"]
                    }
                  }
                },
                required: ["members", "relations"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_family_data" } }
      };

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
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

      const data = await response.json();
      console.log('AI response:', JSON.stringify(data, null, 2));
      
      // Extrair dados da família do tool call
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      let familyData = null;
      
      if (toolCall?.function?.arguments) {
        try {
          familyData = JSON.parse(toolCall.function.arguments);
          console.log('Extracted family data:', familyData);
        } catch (e) {
          console.error('Error parsing family data:', e);
        }
      }

      return new Response(JSON.stringify({ familyData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Modo normal de chat (código original)
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
   - Gêmeos: Símbolos conectados
   - Animal de Estimação: Pentágono ou diamante

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
   - Abuso Físico: Linha com espinhos/triângulos
   - Abuso Emocional: Linha ondulada tracejada
   - Cuidador/Dependente: Linha com seta unidirecional
   - Hostilidade: Linha com X's
   - Manipulação: Linha espiral

CÓDIGO ATUAL DO PROJETO:

O projeto usa React com Canvas HTML5 para desenhar genogramas. Atualmente tem:

PESSOAS (em src/pages/Index.tsx, função addElement):
- 'male': Masculino (quadrado azul)
- 'female': Feminino (círculo rosa)
- 'pregnancy': Gravidez (triângulo amarelo)
- 'undefined': Sexo Indefinido (triângulo invertido cinza)
- 'twins': Gêmeos (dois círculos conectados ciano)
- 'pet': Animal de Estimação (pentágono verde)

STATUS (propriedade status do elemento):
- 'alive': Vivo (padrão)
- 'deceased': Falecido (X vermelho)
- 'substance-abuse': Abuso de Substâncias (linha preta embaixo)
- 'adopted': Adotado (linha pontilhada roxa)
- 'stillborn': Natimorto (X pequeno)
- 'miscarriage': Aborto Espontâneo (círculo pequeno preenchido)
- 'abortion': Aborto Induzido (X maior)

RELAÇÕES (em src/pages/Index.tsx, função addRelation):
- 'children': Filhos (linha verde - 2 pais + filhos)
- 'marriage': Casamento (linha verde esmeralda sólida)
- 'divorce': Divórcio (linha vermelha com 2 barras)
- 'separation': Separação (linha laranja com 1 barra)
- 'living-together': Morando Junto (linha verde água tracejada)
- 'distant': Distante (linha cinza pontilhada)
- 'conflict': Conflituoso (linha âmbar ondulada)
- 'breakup': Rompimento (linha rosa com múltiplas barras)
- 'very-close': Muito Estreito (3 linhas roxas paralelas)
- 'fused-conflictual': Fundido e Conflitual (3 linhas amarelas onduladas)
- 'alliance': Aliança (2 linhas azuis paralelas)
- 'harmonic': Harmônico (linha lima com setas duplas)
- 'vulnerable': Vulnerável (linha laranja escuro com círculo)
- 'physical-abuse': Abuso Físico (linha vermelha escura com espinhos)
- 'emotional-abuse': Abuso Emocional (linha violeta ondulada tracejada)
- 'caregiver': Cuidador/Dependente (linha azul céu com seta)
- 'hostility': Hostilidade (linha vermelha com X's)
- 'manipulation': Manipulação (linha índigo espiral)

SUAS RESPONSABILIDADES:

1. Quando perguntado sobre pessoas ou relações:
   - Explique o que cada símbolo significa com suas cores
   - Compare com os padrões internacionais de genogramas
   - Sugira melhorias ou adições baseadas na teoria
   - Identifique o que está faltando ou pode ser melhorado

2. Quando solicitado a sugerir mudanças:
   - Liste especificamente quais elementos adicionar/modificar
   - Forneça nomes técnicos corretos
   - Explique a importância de cada elemento
   - Sugira cores apropriadas para cada tipo

3. Sempre responda em português de forma clara e profissional.

4. Se perguntado sobre o código, explique como está implementado atualmente com todas as cores e formas.`;


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
