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

Sua função é interpretar o texto enviado pelo usuário e gerar uma estrutura de dados com as pessoas e suas relações familiares.

REGRAS OBRIGATÓRIAS:
1. Identifique as pessoas citadas e relacione-as corretamente (pais, filhos, irmãos, avós etc.).
2. Sempre inclua o campo "type" nas relações, indicando o tipo correto de relação.
3. Quando o texto mencionar qualquer palavra indicando separação ou divórcio (ex: "separados", "divorciados", "ex-marido", "ex-esposa", "ex-companheiro", "não estão mais juntos", "não moram juntos"), o tipo da relação deve ser "separation" ou "divorce".
4. Se aparecer tanto palavras de casamento quanto de separação, priorize SEMPRE "separation" ou "divorce".
5. Só use "marriage" quando o texto indicar claramente que o casal ainda está junto (ex: "casados", "vivem juntos", "unidos", "moram juntos", "marido e mulher").
6. Se o texto não deixar claro o tipo de relação conjugal, use "unknown".
7. Para "namorados" use "living-together", para "união estável" também use "living-together".
8. Para "ex-namorados", "ex-companheiros" use "breakup".

IDENTIFICAÇÃO DE PESSOAS:
- Se o usuário não informar nome, deixe vazio
- Se não informar idade, deixe vazio
- Identifique o gênero pelo papel (pai=male, mãe=female, filho/irmão=male, filha/irmã=female)
- Identifique status se mencionado (falecido, adotado, etc.)

IMPORTANTE: 
- Sempre garanta que pais separados NÃO apareçam com símbolo de casamento.
- Para relações entre pais e filhos, identifique a relação conjugal dos pais SEPARADAMENTE da relação de parentesco.
- Gere IDs únicos para cada pessoa (p1, p2, p3...) e relação (r1, r2, r3...).

FORMATO DE SAÍDA ESPERADO (sempre em JSON estruturado):
{
  "pessoas": [
    {"id":"p1","nome":"José","genero":"male","papel":"pai"},
    {"id":"p2","nome":"Maria","genero":"female","papel":"mãe"},
    {"id":"p3","nome":"Vinicius","genero":"male","papel":"filho"}
  ],
  "relacoes": [
    {"id":"r1","pessoas":["p1","p2"],"tipo":"separados"},
    {"id":"r2","pessoas":["p3","p1"],"tipo":"filho"},
    {"id":"r3","pessoas":["p3","p2"],"tipo":"filho"}
  ]
}

EXEMPLOS:
- Entrada: "Sou filho de José e Maria, que são separados." → Relação José–Maria: type "separation"
- Entrada: "Meus pais são casados e têm dois filhos." → Relação pais: type "marriage"
- Entrada: "Meu pai é José, ex-marido de Maria." → Relação José–Maria: type "divorce" ou "breakup"

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
              description: "Extrai dados estruturados sobre membros da família e relações com IDs únicos",
              parameters: {
                type: "object",
                properties: {
                  members: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", description: "ID único da pessoa (ex: p1, p2, p3)" },
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
                          enum: ["alive", "deceased", "index-person", "adopted", "foster", "stillborn", "miscarriage", "abortion", "substance-abuse", "recovering", "mental-disorder"],
                          description: "Status da pessoa (opcional)"
                        },
                        personType: {
                          type: "string",
                          enum: ["male", "female", "undefined", "pregnancy", "twins", "fraternal-twins", "identical-twins"],
                          description: "Tipo de pessoa - use 'twins' ou 'fraternal-twins' para gêmeos fraternos, 'identical-twins' para gêmeos idênticos"
                        }
                      },
                      required: ["id", "gender", "role"]
                    }
                  },
                  relations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", description: "ID único da relação (ex: r1, r2, r3)" },
                        type: { 
                          type: "string",
                          enum: ["marriage", "divorce", "separation", "back-together", "living-together", "breakup", "distant", "conflict", "very-close", "fused-conflictual", "alliance", "harmonic", "vulnerable", "physical-abuse", "emotional-abuse", "caregiver", "hostility", "manipulation", "children", "siblings", "unknown"],
                          description: "Tipo de relação - PRIORIDADE ABSOLUTA: palavras de separação/divórcio prevalecem sobre casamento. Use 'back-together' para casais que voltaram juntos após separação. Use 'unknown' quando não houver informação clara sobre o tipo de relação conjugal."
                        },
                        members: {
                          type: "array",
                          items: { type: "string" },
                          description: "IDs dos membros envolvidos na relação (ex: ['p1', 'p2'])"
                        }
                      },
                      required: ["id", "type", "members"]
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
    const conversationalPrompt = `Você é um especialista em genogramas familiares que ajuda pessoas a descrever suas famílias.

SEU OBJETIVO: Coletar informações completas sobre a família do usuário para criar um genograma preciso.

REGRAS IMPORTANTES:
1. SEMPRE faça perguntas de esclarecimento quando as informações não estiverem claras
2. NUNCA invente ou assuma informações que não foram mencionadas
3. Quando faltar informações, pergunte especificamente sobre:
   - Nomes das pessoas
   - Gênero (masculino/feminino)
   - Tipo de relação entre casais (casados, separados, divorciados, namorando, união estável)
   - Quem são os pais e quem são os filhos
   - Status especial (falecido, adotado, etc.)

EXEMPLOS DE PERGUNTAS A FAZER:
- "Seus pais estão casados ou separados?"
- "Qual o nome de seu pai e sua mãe?"
- "Quantos irmãos você tem? São homens ou mulheres?"
- "Existe alguma pessoa com situação especial (falecido, adotado, etc.)?"

QUANDO VOCÊ TIVER INFORMAÇÕES SUFICIENTES:
- Resuma as informações coletadas
- Pergunte se está tudo correto
- Diga: "Se estiver tudo certo, clique no botão 'Gerar Genograma' abaixo."

SEJA CONVERSACIONAL E AMIGÁVEL, mas sempre busque clareza nas informações.`;

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
- 'twins' ou 'fraternal-twins': Gêmeos Fraternos (dois círculos conectados na base ciano)
- 'identical-twins': Gêmeos Idênticos (dois círculos conectados com triângulo ciano)
- 'pet': Animal de Estimação (pentágono verde)

STATUS (propriedade status do elemento):
- 'alive': Vivo (padrão)
- 'deceased': Falecido (X vermelho)
- 'index-person': Pessoa Índice / PI (borda preta destacada)
- 'substance-abuse': Abuso de Álcool/Drogas (símbolo totalmente preenchido preto)
- 'recovering': Em Recuperação (metade inferior preenchida)
- 'mental-disorder': Transtorno Mental (metade esquerda preenchida)
- 'adopted': Filho Adotado (colchetes roxos ao redor)
- 'foster': Filho de Criação (cantos marcados roxos)
- 'stillborn': Natimorto (X pequeno)
- 'miscarriage': Aborto Espontâneo (círculo pequeno preenchido)
- 'abortion': Aborto Provocado (X maior)

RELAÇÕES (em src/pages/Index.tsx, função addRelation):
- 'children': Filhos (linha verde - 2 pais + filhos)
- 'marriage': Casamento (linha verde esmeralda sólida)
- 'divorce': Divórcio (linha vermelha com 2 barras)
- 'separation': Separação (linha laranja com 1 barra)
- 'back-together': Voltaram Juntos (linha verde com 1 barra vermelha)
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
- 'siblings': Irmãos (linha azul simples)

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
          { role: "system", content: conversationalPrompt },
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
