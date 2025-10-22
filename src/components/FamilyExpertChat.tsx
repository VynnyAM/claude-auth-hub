import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { MessageCircle, Send, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GenogramElement } from '@/hooks/useGenogram';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface FamilyData {
  members: Array<{
    name?: string;
    age?: string;
    gender: 'male' | 'female' | 'undefined';
    role: string;
    status?: 'alive' | 'deceased' | 'adopted' | 'stillborn' | 'miscarriage' | 'abortion' | 'substance-abuse';
  }>;
  relations: Array<{
    type: string;
    members: string[];
  }>;
}

interface FamilyExpertChatProps {
  onGenerateGenogram: (elements: GenogramElement[]) => void;
  isButton?: boolean;
}

export const FamilyExpertChat = ({ onGenerateGenogram, isButton = false }: FamilyExpertChatProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateGenogramFromData = (familyData: FamilyData) => {
    // Defesa adicional: limpar relações contraditórias vindas do backend
    try {
      if (Array.isArray(familyData.relations)) {
        const grouped = new Map<string, any[]>();
        familyData.relations.forEach(r => {
          const members = r.members || [];
          if (!Array.isArray(members)) return;
          const key = members.slice().sort().join('|');
          if (!grouped.has(key)) grouped.set(key, []);
          grouped.get(key)!.push(r);
        });

        const cleaned: any[] = [];
        for (const [key, rels] of grouped.entries()) {
          const hasSeparation = rels.some(rr => ['divorce', 'separation', 'breakup'].includes(rr.type));
          if (hasSeparation) {
            rels.forEach(rr => { if (rr.type !== 'marriage') cleaned.push(rr); });
          } else {
            rels.forEach(rr => cleaned.push(rr));
          }
        }

        familyData = { ...familyData, relations: cleaned };
      }
    } catch (e) {
      console.error('Erro ao normalizar relações no frontend:', e);
    }

    const elements: GenogramElement[] = [];
    const baseId = Date.now();
    let idCounter = 0;
    
    // Map para armazenar IDs dos membros
    const memberIds = new Map<string, number>();
    
    // Posições base
    const centerX = 450;
    const parentY = 150;
    const childrenY = 300;
    const spacing = 150;
    
    // Separar membros por papel
    const parents = familyData.members.filter(m => 
      m.role.toLowerCase().includes('pai') || 
      m.role.toLowerCase().includes('mãe') ||
      m.role.toLowerCase().includes('mae')
    );
    
    const children = familyData.members.filter(m => 
      m.role.toLowerCase().includes('filho') || 
      m.role.toLowerCase().includes('filha') ||
      m.role.toLowerCase().includes('irmão') ||
      m.role.toLowerCase().includes('irmã') ||
      m.role.toLowerCase().includes('irmao')
    );
    
    // Criar pais
    const father = parents.find(p => p.gender === 'male' || p.role.toLowerCase().includes('pai'));
    const mother = parents.find(p => p.gender === 'female' || p.role.toLowerCase().includes('mãe') || p.role.toLowerCase().includes('mae'));
    
    let fatherId: number | undefined;
    let motherId: number | undefined;
    
    if (father) {
      fatherId = baseId + idCounter++;
      memberIds.set('father', fatherId);
      elements.push({
        id: fatherId,
        type: 'male',
        x: centerX - spacing / 2,
        y: parentY,
        name: father.name || 'Pai',
        age: father.age || '',
        status: father.status || 'alive'
      });
    }
    
    if (mother) {
      motherId = baseId + idCounter++;
      memberIds.set('mother', motherId);
      elements.push({
        id: motherId,
        type: 'female',
        x: centerX + spacing / 2,
        y: parentY,
        name: mother.name || 'Mãe',
        age: mother.age || '',
        status: mother.status || 'alive'
      });
    }
    
    // Criar filhos
    const childIds: number[] = [];
    const childSpacing = 100;
    const startX = centerX - (children.length - 1) * childSpacing / 2;
    
    children.forEach((child, index) => {
      const childId = baseId + idCounter++;
      childIds.push(childId);
      memberIds.set(`child${index}`, childId);
      
      elements.push({
        id: childId,
        type: child.gender === 'female' ? 'female' : child.gender === 'male' ? 'male' : 'undefined',
        x: startX + index * childSpacing,
        y: childrenY,
        name: child.name || `${child.role}`,
        age: child.age || '',
        status: child.status || 'alive'
      });
    });
    
    // Criar relações
    if (fatherId && motherId) {
      // Verificar tipo de relação entre os pais — aceitar outputs em português e inglês
      const parentsRelation = familyData.relations.find(r => {
        if (!r?.type) return false;
        const t = String(r.type).toLowerCase();
        return /marri|casad|casamento|separ|separação|separados|separated|divorc|divórcio|divorciad|ex-|breakup|living-together|uni[oó]n|união|namorad/.test(t);
      });

      let relationType: string = 'marriage';
      if (parentsRelation && parentsRelation.type) {
        const t = String(parentsRelation.type).toLowerCase();

        // Priorizar palavras que indicam divórcio/rompimento
        if (/divorc|divórc|divorciad/.test(t) || /ex-/.test(t) || /breakup/.test(t)) {
          relationType = 'divorce';
        } else if (/separ|separação|separados|separated/.test(t)) {
          relationType = 'separation';
        } else if (/marri|casad|casamento|vivem juntos|moram juntos|unidos/.test(t)) {
          relationType = 'marriage';
        } else if (/living-together|living together|uni[oó]n|união|namorad/.test(t)) {
          relationType = 'living-together';
        } else if (/breakup/.test(t)) {
          relationType = 'breakup';
        } else if (/unknown/.test(t)) {
          relationType = 'unknown';
        }
      }

      elements.push({
        id: baseId + idCounter++,
        type: 'relation',
        relationType,
        from: fatherId,
        to: motherId,
        x: 0,
        y: 0
      });
      
      // Relação com filhos
      if (childIds.length > 0) {
        elements.push({
          id: baseId + idCounter++,
          type: 'relation',
          relationType: 'children',
          from: fatherId,
          to: motherId,
          x: 0,
          y: 0,
          children: childIds
        });
      }
    }
    
    // Adicionar relações entre irmãos se mencionadas
    const siblingRelations = familyData.relations.filter(r => 
      r.type.includes('distante') || 
      r.type.includes('próximo') ||
      r.type.includes('conflito')
    );
    
    siblingRelations.forEach(rel => {
      if (childIds.length >= 2) {
        let relType = 'distant';
        if (rel.type.includes('próximo') || rel.type.includes('proximo')) {
          relType = 'very-close';
        } else if (rel.type.includes('conflito')) {
          relType = 'conflict';
        }
        
        // Criar relação entre primeiro e segundo filho como exemplo
        elements.push({
          id: baseId + idCounter++,
          type: 'relation',
          relationType: relType,
          from: childIds[0],
          to: childIds[1],
          x: 0,
          y: 0
        });
      }
    });
    
    return elements;
  };

  const extractFamilyData = async (userMessages: Message[]): Promise<FamilyData | null> => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
    
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: userMessages,
          extractFamily: true // Flag para o backend usar tool calling
        }),
      });

      if (!resp.ok) {
        throw new Error("Falha ao processar informações");
      }

      const data = await resp.json();
      return data.familyData || null;
    } catch (error) {
      console.error('Erro ao extrair dados da família:', error);
      return null;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Extrair dados da família
      const familyData = await extractFamilyData(newMessages);
      
      // Adicionar resposta do assistente
      const assistantMessage: Message = { 
        role: 'assistant', 
        content: 'Vou criar as linhas da vida agora.' 
      };
      setMessages([...newMessages, assistantMessage]);
      
      // Aguardar um momento para o usuário ver a mensagem
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (familyData && familyData.members.length > 0) {
        // Gerar genograma
        const elements = generateGenogramFromData(familyData);
        onGenerateGenogram(elements);
        
        toast({
          title: "Genograma criado!",
          description: "A estrutura familiar foi gerada com base nas informações fornecidas.",
        });
        
        setIsOpen(false);
        setMessages([]);
      } else {
        toast({
          title: "Informações insuficientes",
          description: "Por favor, descreva sua família com mais detalhes.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Erro no chat:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível processar a mensagem",
        variant: "destructive",
      });
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className={isButton ? "w-full" : "fixed bottom-6 left-6 shadow-lg"}
        variant={isButton ? "default" : "default"}
      >
        <MessageCircle className="w-5 h-5 mr-2" />
        Descreva sua família
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 left-6 w-96 h-[600px] flex flex-col shadow-2xl">
      <div className="flex items-center justify-between p-4 border-b bg-green-600 text-white rounded-t-lg">
        <h3 className="font-semibold flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Especialista em Genogramas
        </h3>
        <Button
          onClick={() => setIsOpen(false)}
          variant="ghost"
          size="icon"
          className="hover:bg-green-700"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium mb-2">Olá! Sou o especialista em genogramas.</p>
            <p className="text-sm">Descreva sua família e vou criar o genograma para você.</p>
            <p className="text-xs mt-4 text-muted-foreground">
              Exemplo: "Tenho um pai chamado José de 50 anos e mãe Maria de 48 anos. Meus pais são separados."
            </p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-green-600 text-white'
                  : 'bg-muted text-foreground'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg p-3">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Descreva sua família..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="bg-green-600 hover:bg-green-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};