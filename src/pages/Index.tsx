import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Download, Trash2, Users, Save, FolderOpen, Plus, Lock, CreditCard, Check, X, BookOpen, Search, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useGenogram, GenogramElement } from '@/hooks/useGenogram';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { FamilyExpertChat } from '@/components/FamilyExpertChat';
import { GenogramLegend } from '@/components/GenogramLegend';

const PRICE_IDS = {
  monthly: 'price_1SKk0fBOrcC2OeBVSHvZPa7i',
  annual: 'price_1SKk0xBOrcC2OeBVV8jT9LPk',
};

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { subscription, canDownload, canSaveLoad, canCreateMultiple } = useSubscription(user?.id);
  const { toast } = useToast();
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const { 
    genograms, 
    currentGenogramId, 
    elements, 
    setElements, 
    loading: genogramLoading,
    loadGenogram,
    saveGenogram,
    deleteGenogram,
    createNewGenogram
  } = useGenogram(user?.id);

  const [selectedElement, setSelectedElement] = useState<number | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showLegendModal, setShowLegendModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [genogramTitle, setGenogramTitle] = useState('Novo Genograma');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 });
  const [draggingMultiple, setDraggingMultiple] = useState(false);
  const [draggedElements, setDraggedElements] = useState<{ id: number; offsetX: number; offsetY: number }[]>([]);
  const [clickedElement, setClickedElement] = useState<number | null>(null);
  const [hasMoved, setHasMoved] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Refresh subscription status when user returns from checkout
  useEffect(() => {
    const handleFocus = async () => {
      if (user) {
        await supabase.functions.invoke('check-subscription');
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user]);

  // Delete selected element with Delete key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const hasSelectedElements = elements.some(el => el.selected);
      if (e.key === 'Delete' && (selectedElement !== null || hasSelectedElements)) {
        deleteElement();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElement, elements]);

  const handleSubscribe = async (plan: 'monthly' | 'annual') => {
    try {
      setSubscribing(true);
      const priceId = PRICE_IDS[plan];
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId }
      });

      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: "Erro ao criar checkout",
        description: error.message || "Não foi possível iniciar o processo de pagamento.",
        variant: "destructive",
      });
    } finally {
      setSubscribing(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setSubscribing(true);
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: "Erro ao acessar portal",
        description: error.message || "Não foi possível acessar o portal de gerenciamento.",
        variant: "destructive",
      });
    } finally {
      setSubscribing(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    window.location.assign('/auth');
  };

  const handleCreateNew = () => {
    if (!canCreateMultiple) {
      toast({
        title: "Funcionalidade bloqueada",
        description: "O plano Básico não permite criar novos genogramas. Faça upgrade para o plano Profissional para criar genogramas ilimitados.",
        variant: "destructive",
      });
      return;
    }
    createNewGenogram();
  };

  const limparTela = () => {
    setElements([]);
    setSelectedElement(null);
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
    setShowClearModal(false);
  };

  const generateFamilyStructure = () => {
    // ESTRUTURA HIERÁRQUICA AUTOMÁTICA DE GENOGRAMA
    // Esta função cria uma família seguindo as convenções clássicas:
    // - Quadrado = homem (pai, filhos)
    // - Círculo = mulher (mãe, filhas)
    // - Linha horizontal verde = casamento/união
    // - Linhas verticais = conexão automática entre gerações
    // 
    // IMPORTANTE: As ligações são AUTOMÁTICAS e se adaptam quando os elementos são movidos.
    // O sistema mantém automaticamente:
    // 1. Linha horizontal do casamento entre pais
    // 2. Linha vertical central descendo do casamento
    // 3. Linha horizontal dos filhos (sempre conectada)
    // 4. Linhas verticais individuais para cada filho
    
    // Define as posições base para a estrutura hierárquica
    const centerX = 450; // Centro do canvas (900px / 2)
    const parentY = 150; // Altura dos pais (geração superior)
    const spacing = 120; // Espaçamento horizontal entre pai e mãe
    const childrenY = 310; // Altura dos filhos (geração inferior) - 160px abaixo dos pais para manter 80px de distância da linha de casamento
    const childSpacing = 100; // Espaçamento proporcional entre irmãos
    
    // Criar ID base único para todos os elementos da família
    const baseId = Date.now();
    
    // GERAÇÃO 1: PAIS
    // Criar o pai (quadrado - male) - posicionado à esquerda
    const father: GenogramElement = {
      id: baseId + 1,
      type: 'male',
      x: centerX - spacing / 2,
      y: parentY,
      name: 'Pai',
      age: '',
      status: 'alive'
    };
    
    // Criar a mãe (círculo - female) - posicionada à direita
    const mother: GenogramElement = {
      id: baseId + 2,
      type: 'female',
      x: centerX + spacing / 2,
      y: parentY,
      name: 'Mãe',
      age: '',
      status: 'alive'
    };
    
    // GERAÇÃO 2: FILHOS
    // Criar filhos alinhados horizontalmente e centralizados em relação aos pais
    // A posição vertical é calculada para manter 80px de distância da linha de casamento
    const child1: GenogramElement = {
      id: baseId + 3,
      type: 'male',
      x: centerX - childSpacing,
      y: childrenY,
      name: 'Filho 1',
      age: '',
      status: 'alive'
    };
    
    const child2: GenogramElement = {
      id: baseId + 4,
      type: 'female',
      x: centerX,
      y: childrenY,
      name: 'Filha',
      age: '',
      status: 'alive'
    };
    
    const child3: GenogramElement = {
      id: baseId + 5,
      type: 'male',
      x: centerX + childSpacing,
      y: childrenY,
      name: 'Filho 2',
      age: '',
      status: 'alive'
    };
    
    // RELAÇÕES FAMILIARES
    // Relação de casamento: linha horizontal verde conectando pai e mãe
    const marriage: GenogramElement = {
      id: baseId + 6,
      type: 'relation',
      relationType: 'marriage',
      from: father.id,
      to: mother.id,
      x: 0,
      y: 0
    };
    
    // Relação de filhos: cria automaticamente a estrutura hierárquica
    // - Linha vertical do casamento descendo
    // - Linha horizontal conectando todos os filhos
    // - Linhas verticais individuais para cada filho
    // Esta relação mantém AUTOMATICAMENTE todas as conexões mesmo quando elementos são movidos
    const childrenRelation: GenogramElement = {
      id: baseId + 7,
      type: 'relation',
      relationType: 'children',
      from: father.id,
      to: mother.id,
      x: 0,
      y: 0,
      children: [child1.id, child2.id, child3.id]
    };
    
    // Adicionar todos os elementos à estrutura
    // A ordem garante que as relações sejam desenhadas antes dos elementos
    const newElements = [
      father,
      mother,
      child1,
      child2,
      child3,
      marriage,
      childrenRelation
    ];
    
    setElements(newElements);
    setSelectedElement(null);
    
    toast({
      title: "Estrutura familiar gerada!",
      description: "Família com ligações automáticas criada. As conexões se mantêm mesmo ao mover os elementos.",
    });
  };

  const handleSendFeedback = async () => {
    if (!feedbackMessage.trim()) {
      toast({
        title: "Mensagem vazia",
        description: "Por favor, escreva sua mensagem de feedback.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSendingFeedback(true);
      
      const { error } = await supabase.functions.invoke('send-feedback', {
        body: {
          message: feedbackMessage,
          email: feedbackEmail.trim() || undefined,
        },
      });

      if (error) throw error;

      toast({
        title: "Feedback enviado!",
        description: "Obrigado pelo seu tempo! Certamente vamos avaliar a possibilidade de implantação.",
      });

      setFeedbackMessage('');
      setFeedbackEmail('');
      setShowFeedbackModal(false);
    } catch (error: any) {
      toast({
        title: "Erro ao enviar feedback",
        description: error.message || "Não foi possível enviar o feedback. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSendingFeedback(false);
    }
  };

  const addElement = (type: string) => {
    // Encontrar posição livre para evitar sobreposição
    const findFreePosition = () => {
      const baseX = 200;
      const baseY = 200;
      const spacing = 100;
      const checkRadius = 60; // Raio para verificar sobreposição
      
      // Se não houver elementos, usar posição base
      if (elements.length === 0) {
        return { x: baseX, y: baseY };
      }
      
      // Procurar posição livre em espiral
      for (let distance = 0; distance < 1000; distance += spacing) {
        for (let angle = 0; angle < 360; angle += 45) {
          const rad = (angle * Math.PI) / 180;
          const testX = baseX + distance * Math.cos(rad);
          const testY = baseY + distance * Math.sin(rad);
          
          // Verificar se há sobreposição com elementos existentes
          const hasOverlap = elements.some(el => {
            if (el.type === 'relation') return false;
            const dx = el.x - testX;
            const dy = el.y - testY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            return dist < checkRadius;
          });
          
          if (!hasOverlap) {
            return { x: testX, y: testY };
          }
        }
      }
      
      // Fallback: posição ao lado do último elemento
      const lastPerson = elements.filter(e => e.type !== 'relation').pop();
      if (lastPerson) {
        return { x: lastPerson.x + spacing, y: lastPerson.y };
      }
      
      return { x: baseX, y: baseY };
    };
    
    const { x, y } = findFreePosition();
    
    const newElement: GenogramElement = {
      id: Date.now(),
      type,
      x,
      y,
      name: '',
      age: '',
      status: 'alive'
    };
    setElements([...elements, newElement]);
    setSelectedElement(newElement.id);
  };

  const addRelation = (relationType: string) => {
    const selected = elements.filter(e => e.selected);
    
    // Para relação de filhos, permite seleção de pais + filhos
    if (relationType === 'children') {
      if (selected.length < 3) {
        alert('Selecione ao menos 2 pais e 1 filho (mínimo 3 pessoas)');
        return;
      }
      
      const newRelation: GenogramElement = {
        id: Date.now(),
        type: 'relation',
        relationType,
        from: selected[0].id, // Primeiro pai
        to: selected[1].id, // Segundo pai
        x: 0,
        y: 0,
        children: selected.slice(2).map(s => s.id) // Todos os outros são filhos
      };
      setElements([...elements.map(e => ({ ...e, selected: false })), newRelation]);
      setSelectedElement(null);
    } else {
      // Para outras relações, exige exatamente 2 pessoas
      if (selected.length === 2) {
        const newRelation: GenogramElement = {
          id: Date.now(),
          type: 'relation',
          relationType,
          from: selected[0].id,
          to: selected[1].id,
          x: 0,
          y: 0
        };
        setElements([...elements.map(e => ({ ...e, selected: false })), newRelation]);
        setSelectedElement(null);
      } else {
        alert('Selecione exatamente 2 pessoas para criar uma relação');
      }
    }
  };

  const deleteElement = () => {
    // Check if there are multiple selected elements
    const selectedElements = elements.filter(e => e.selected);
    
    if (selectedElements.length > 0) {
      // Delete all selected elements
      const selectedIds = selectedElements.map(e => e.id);
      setElements(elements.filter(e => !selectedIds.includes(e.id)));
      setSelectedElement(null);
    } else if (selectedElement) {
      // Delete single selected element (legacy behavior)
      setElements(elements.filter(e => e.id !== selectedElement));
      setSelectedElement(null);
    }
  };

  const updateElement = (id: number, updates: Partial<GenogramElement>) => {
    setElements(elements.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const toggleSelection = (id: number) => {
    updateElement(id, { selected: !elements.find(e => e.id === id)?.selected });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const clicked = elements.find(el => {
      if (el.type === 'relation') return false;
      return x >= el.x - 40 && x <= el.x + 40 && y >= el.y - 40 && y <= el.y + 40;
    });
    
    setHasMoved(false);
    
    if (clicked) {
      const selectedElements = elements.filter(el => el.selected && el.type !== 'relation');
      
      if (!clicked.selected) {
        // Se não está selecionado, seleciona imediatamente e prepara para arrastar
        setElements(elements.map(el => 
          el.id === clicked.id ? { ...el, selected: true } : el
        ));
        setIsDragging(true);
        setDragOffset({ x: x - clicked.x, y: y - clicked.y });
        setSelectedElement(clicked.id);
        setClickedElement(null); // Não fazer toggle no mouseUp
      } else {
        // Se já está selecionado, salvar para fazer toggle no mouseUp se não arrastar
        setClickedElement(clicked.id);
        
        // Preparar arrasto
        if (selectedElements.length > 1) {
          // Se há múltiplos selecionados, preparar para arrastar todos
          setDraggingMultiple(true);
          setDraggedElements(
            selectedElements.map(el => ({
              id: el.id,
              offsetX: x - el.x,
              offsetY: y - el.y
            }))
          );
        } else {
          // Se é o único selecionado, preparar para arrastar apenas ele
          setIsDragging(true);
          setDragOffset({ x: x - clicked.x, y: y - clicked.y });
          setSelectedElement(clicked.id);
        }
      }
    } else {
      // Clicou em espaço vazio: desselecionar tudo
      setSelectedElement(null);
      setClickedElement(null);
      setElements(elements.map(el => ({ ...el, selected: false })));
      
      // Iniciar seleção por arrastar
      setIsSelecting(true);
      setSelectionStart({ x, y });
      setSelectionEnd({ x, y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (isDragging && selectedElement) {
      setHasMoved(true);
      updateElement(selectedElement, { x: x - dragOffset.x, y: y - dragOffset.y });
    } else if (draggingMultiple) {
      setHasMoved(true);
      // Arrastar todos os elementos selecionados mantendo posições relativas
      const updatedElements = elements.map(el => {
        const draggedEl = draggedElements.find(d => d.id === el.id);
        if (draggedEl) {
          return { ...el, x: x - draggedEl.offsetX, y: y - draggedEl.offsetY };
        }
        return el;
      });
      setElements(updatedElements);
    } else if (isSelecting) {
      setSelectionEnd({ x, y });
    }
  };

  const handleMouseUp = () => {
    // Se clicou em um elemento e não arrastou, fazer toggle
    if (clickedElement !== null && !hasMoved) {
      toggleSelection(clickedElement);
    }
    
    if (isSelecting) {
      // Selecionar todos os elementos dentro do retângulo
      const minX = Math.min(selectionStart.x, selectionEnd.x);
      const maxX = Math.max(selectionStart.x, selectionEnd.x);
      const minY = Math.min(selectionStart.y, selectionEnd.y);
      const maxY = Math.max(selectionStart.y, selectionEnd.y);
      
      setElements(elements.map(el => {
        if (el.type === 'relation') return el;
        const isInside = el.x >= minX && el.x <= maxX && el.y >= minY && el.y <= maxY;
        return { ...el, selected: isInside };
      }));
      
      setIsSelecting(false);
    }
    
    setIsDragging(false);
    setDraggingMultiple(false);
    setDraggedElements([]);
    setClickedElement(null);
    setHasMoved(false);
  };

  // Filter elements based on search
  const filteredElements = useMemo(() => {
    if (!searchTerm.trim()) {
      // When no search, ensure all elements are unhighlighted (normal state)
      return elements.map(el => ({ ...el, highlighted: undefined }));
    }
    
    return elements.map(el => {
      if (el.type === 'relation') return el;
      const matches = el.name?.toLowerCase().includes(searchTerm.toLowerCase());
      return { ...el, highlighted: matches };
    });
  }, [elements, searchTerm]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid with two levels: major (100px) and minor (50px)
    
    // Minor grid lines (50px) - mais claras
    ctx.strokeStyle = 'rgba(200, 200, 220, 0.4)';
    ctx.lineWidth = 1;
    
    // Vertical minor lines
    for (let x = 0; x <= canvas.width; x += 50) {
      if (x % 100 !== 0) { // Skip major grid lines
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
    }
    
    // Horizontal minor lines
    for (let y = 0; y <= canvas.height; y += 50) {
      if (y % 100 !== 0) { // Skip major grid lines
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }
    
    // Major grid lines (100px) - mais escuras e grossas
    ctx.strokeStyle = 'rgba(180, 180, 200, 0.6)';
    ctx.lineWidth = 1.5;
    
    // Vertical major lines
    for (let x = 0; x <= canvas.width; x += 100) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    
    // Horizontal major lines
    for (let y = 0; y <= canvas.height; y += 100) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    
    if (filteredElements.length === 0) return;

    // Draw relations
    const relations = filteredElements.filter(e => e.type === 'relation');
    
    // Mapear múltiplas relações entre os mesmos elementos
    const relationCountMap = new Map<string, number>();
    const relationIndexMap = new Map<string, number>();
    
    relations.forEach(rel => {
      if (rel.relationType !== 'children') {
        const key = [rel.from, rel.to].sort().join('-');
        relationCountMap.set(key, (relationCountMap.get(key) || 0) + 1);
      }
    });
    
    relations.forEach(rel => {
      const from = filteredElements.find(e => e.id === rel.from);
      const to = filteredElements.find(e => e.id === rel.to);
      
      // RELAÇÃO DE FILHOS - ESTRUTURA HIERÁRQUICA AUTOMÁTICA
      // Este código mantém AUTOMATICAMENTE as ligações familiares sempre atualizadas
      // Mesmo quando os elementos são movidos, as linhas se recalculam e mantêm a estrutura:
      // 1. Linha horizontal verde do casamento
      // 2. Linha vertical central descendo do casamento
      // 3. Linha horizontal conectando todos os irmãos
      // 4. Linhas verticais individuais de cada filho
      // NENHUM FILHO FICA DESCONECTADO - o sistema garante que todos permanecem ligados
      if (rel.relationType === 'children' && rel.children && rel.children.length > 0) {
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 2;
        
        // Obter todos os filhos
        const children = rel.children
          .map((childId: number) => filteredElements.find(e => e.id === childId))
          .filter(Boolean);
        
        if (children.length === 0) return;
        
        // Caso 1: Casal (ambos os pais presentes)
        if (from && to) {
          // Verificar se já existe uma relação conjugal manual entre os pais.
          // Não desenhar a linha de casamento automática se já houver
          // uma relação de separação/divórcio/rompimento entre esses mesmos pais.
          const conjugalRelationsBetweenParents = filteredElements.filter(e =>
            e.type === 'relation' &&
            ((e.from === from.id && e.to === to.id) || (e.from === to.id && e.to === from.id)) &&
            (e.relationType === 'marriage' || e.relationType === 'divorce' || e.relationType === 'separation' || e.relationType === 'back-together' || e.relationType === 'living-together' || e.relationType === 'breakup')
          );

          const hasMarriageRelation = conjugalRelationsBetweenParents.some(e => e.relationType === 'marriage' || e.relationType === 'back-together' || e.relationType === 'living-together');
          const hasSeparationOrDivorce = conjugalRelationsBetweenParents.some(e => e.relationType === 'divorce' || e.relationType === 'separation' || e.relationType === 'breakup');
          
          const leftParent = from.x < to.x ? from : to;
          const rightParent = from.x < to.x ? to : from;
          const marriageLineY = (leftParent.y + rightParent.y) / 2;
          
          // ETAPA 1: Linha horizontal do casamento dos pais
          // Só desenhar a linha de casamento AUTOMÁTICA se NÃO existir
          // uma relação de casamento manual e também NÃO existir uma
          // relação de separação/divórcio entre os mesmos pais.
          if (!hasMarriageRelation && !hasSeparationOrDivorce) {
            ctx.beginPath();
            ctx.moveTo(leftParent.x, marriageLineY);
            ctx.lineTo(rightParent.x, marriageLineY);
            ctx.stroke();
          }
          
          // ETAPA 2: Ponto fixo de conexão no centro da linha do casamento
          const connectionPointX = (leftParent.x + rightParent.x) / 2;
          
          // ETAPA 3: Posição FIXA da linha horizontal dos irmãos
          // Esta linha está sempre a 80px abaixo da linha de casamento
          const FIXED_VERTICAL_DISTANCE = 80;
          const siblingsLineY = marriageLineY + FIXED_VERTICAL_DISTANCE;
          
          // ETAPA 4: Linha vertical principal - SEMPRE fixa do casamento até a linha dos irmãos
          // Esta linha é SEMPRE conectada ao ponto fixo da linha do casamento e tem comprimento fixo
          ctx.beginPath();
          ctx.moveTo(connectionPointX, marriageLineY);
          ctx.lineTo(connectionPointX, siblingsLineY);
          ctx.stroke();
          
          // ETAPA 5: Linha horizontal dos irmãos (garante conexão com a linha vertical central)
          // O sistema calcula AUTOMATICAMENTE o espaçamento proporcional entre irmãos
          // e mantém o alinhamento centralizado em relação aos pais
          const childrenXPositions = children.map(c => c!.x).sort((a, b) => a - b);
          const leftmostChildX = childrenXPositions[0];
          const rightmostChildX = childrenXPositions[childrenXPositions.length - 1];
          
          // Inclui o ponto de conexão central para GARANTIR que nenhum filho se desacople
          // Mesmo se os filhos forem movidos para longe dos pais, a conexão se mantém
          const siblingsStartX = Math.min(leftmostChildX, connectionPointX);
          const siblingsEndX = Math.max(rightmostChildX, connectionPointX);
          
          ctx.beginPath();
          ctx.moveTo(siblingsStartX, siblingsLineY);
          ctx.lineTo(siblingsEndX, siblingsLineY);
          ctx.stroke();
          
          // ETAPA 6: Linhas verticais individuais de cada filho
          // Estas linhas se adaptam da posição fixa até onde o filho estiver
          children.forEach((child) => {
            if (child) {
              ctx.beginPath();
              ctx.moveTo(child.x, siblingsLineY);
              ctx.lineTo(child.x, child.y - 25);
              ctx.stroke();
            }
          });
        } 
        // Caso 2: Pai/mãe solteiro(a)
        else if (from) {
          const parentY = from.y + 25;
          
          // Calcular posição da linha horizontal dos irmãos
          const minChildY = Math.min(...children.map(c => c!.y));
          const siblingsLineY = minChildY - 50;
          
          // Linha vertical do pai/mãe até os filhos
          ctx.beginPath();
          ctx.moveTo(from.x, parentY);
          ctx.lineTo(from.x, siblingsLineY);
          ctx.stroke();
          
          // Linha horizontal dos irmãos (garante conexão com a linha vertical do pai/mãe)
          const childrenXPositions = children.map(c => c!.x).sort((a, b) => a - b);
          const leftmostChildX = childrenXPositions[0];
          const rightmostChildX = childrenXPositions[childrenXPositions.length - 1];

          const siblingsStartX = Math.min(leftmostChildX, from.x);
          const siblingsEndX = Math.max(rightmostChildX, from.x);
          
          ctx.beginPath();
          ctx.moveTo(siblingsStartX, siblingsLineY);
          ctx.lineTo(siblingsEndX, siblingsLineY);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(leftmostChildX, siblingsLineY);
          ctx.lineTo(rightmostChildX, siblingsLineY);
          ctx.stroke();
          
          // Linhas verticais individuais de cada filho
          children.forEach((child) => {
            if (child) {
              ctx.beginPath();
              ctx.moveTo(child.x, siblingsLineY);
              ctx.lineTo(child.x, child.y - 25);
              ctx.stroke();
            }
          });
        }
        return;
      }
      
      if (from && to) {
        // Calcular offset para múltiplas relações
        const key = [rel.from, rel.to].sort().join('-');
        const totalRelations = relationCountMap.get(key) || 1;
        
        if (!relationIndexMap.has(key)) {
          relationIndexMap.set(key, 0);
        }
        const currentIndex = relationIndexMap.get(key)!;
        relationIndexMap.set(key, currentIndex + 1);
        
        // Calcular offset perpendicular à linha
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const perpX = -dy / length;
        const perpY = dx / length;
        
        // Offset baseado no índice e total de relações
        const spacing = 8;
        const totalOffset = (totalRelations - 1) * spacing;
        const offset = (currentIndex * spacing - totalOffset / 2);
        
        const fromX = from.x + perpX * offset;
        const fromY = from.y + perpY * offset;
        const toX = to.x + perpX * offset;
        const toY = to.y + perpY * offset;
        
        const midX = (fromX + toX) / 2;
        const midY = (fromY + toY) / 2;
        
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        
        if (rel.relationType === 'marriage') {
          ctx.strokeStyle = '#4ade80';
          ctx.lineWidth = 3;
          ctx.lineTo(toX, toY);
        } else if (rel.relationType === 'divorce') {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.lineTo(toX, toY);
          ctx.stroke();
          // Duas barras no meio
          ctx.beginPath();
          ctx.moveTo(midX - 5, midY - 10);
          ctx.lineTo(midX - 5, midY + 10);
          ctx.moveTo(midX + 5, midY - 10);
          ctx.lineTo(midX + 5, midY + 10);
        } else if (rel.relationType === 'separation') {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.lineTo(toX, toY);
          ctx.stroke();
          // Duas barras no meio (igual ao divórcio)
          ctx.beginPath();
          ctx.moveTo(midX - 5, midY - 10);
          ctx.lineTo(midX - 5, midY + 10);
          ctx.moveTo(midX + 5, midY - 10);
          ctx.lineTo(midX + 5, midY + 10);
        } else if (rel.relationType === 'back-together') {
          // Voltaram a morar juntos após separação
          ctx.strokeStyle = '#4ade80';
          ctx.lineWidth = 2;
          ctx.lineTo(toX, toY);
          ctx.stroke();
          // Uma barra no meio (indicando que houve separação)
          ctx.beginPath();
          ctx.strokeStyle = '#ef4444';
          ctx.moveTo(midX, midY - 10);
          ctx.lineTo(midX, midY + 10);
          ctx.stroke();
        } else if (rel.relationType === 'living-together') {
          ctx.strokeStyle = '#4ade80';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.lineTo(toX, toY);
        } else if (rel.relationType === 'distant') {
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1;
          ctx.setLineDash([8, 8]);
          ctx.lineTo(toX, toY);
        } else if (rel.relationType === 'conflict') {
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          // Linha ondulada
          const segments = 8;
          const amplitude = 8;
          for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const x = fromX + (toX - fromX) * t;
            const y = fromY + (toY - fromY) * t;
            const waveOffset = Math.sin(t * Math.PI * 4) * amplitude;
            const angle = Math.atan2(toY - fromY, toX - fromX);
            const perpWaveX = x - Math.sin(angle) * waveOffset;
            const perpWaveY = y + Math.cos(angle) * waveOffset;
            if (i === 0) ctx.moveTo(perpWaveX, perpWaveY);
            else ctx.lineTo(perpWaveX, perpWaveY);
          }
        } else if (rel.relationType === 'breakup') {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3;
          ctx.lineTo(toX, toY);
          ctx.stroke();
          // Múltiplas barras
          ctx.beginPath();
          for (let i = -10; i <= 10; i += 5) {
            ctx.moveTo(midX + i, midY - 10);
            ctx.lineTo(midX + i, midY + 10);
          }
        } else if (rel.relationType === 'very-close') {
          ctx.strokeStyle = '#8b5cf6';
          ctx.lineWidth = 2;
          // Três linhas paralelas
          for (let parallelOffset = -3; parallelOffset <= 3; parallelOffset += 3) {
            ctx.beginPath();
            const angle = Math.atan2(toY - fromY, toX - fromX);
            const perpParallelX = -Math.sin(angle) * parallelOffset;
            const perpParallelY = Math.cos(angle) * parallelOffset;
            ctx.moveTo(fromX + perpParallelX, fromY + perpParallelY);
            ctx.lineTo(toX + perpParallelX, toY + perpParallelY);
            ctx.stroke();
          }
          ctx.beginPath();
        } else if (rel.relationType === 'fused-conflictual') {
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          // Três linhas onduladas
          for (let parallelOffset = -3; parallelOffset <= 3; parallelOffset += 3) {
            ctx.beginPath();
            const segments = 8;
            const amplitude = 6;
            for (let i = 0; i <= segments; i++) {
              const t = i / segments;
              const x = fromX + (toX - fromX) * t;
              const y = fromY + (toY - fromY) * t;
              const waveOffset = Math.sin(t * Math.PI * 4) * amplitude;
              const angle = Math.atan2(toY - fromY, toX - fromX);
              const perpWaveX = x - Math.sin(angle) * (waveOffset + parallelOffset);
              const perpWaveY = y + Math.cos(angle) * (waveOffset + parallelOffset);
              if (i === 0) ctx.moveTo(perpWaveX, perpWaveY);
              else ctx.lineTo(perpWaveX, perpWaveY);
            }
            ctx.stroke();
          }
          ctx.beginPath();
        } else if (rel.relationType === 'alliance') {
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2;
          // Duas linhas paralelas
          const angle = Math.atan2(toY - fromY, toX - fromX);
          for (let parallelOffset = -2; parallelOffset <= 2; parallelOffset += 4) {
            ctx.beginPath();
            const perpParallelX = -Math.sin(angle) * parallelOffset;
            const perpParallelY = Math.cos(angle) * parallelOffset;
            ctx.moveTo(fromX + perpParallelX, fromY + perpParallelY);
            ctx.lineTo(toX + perpParallelX, toY + perpParallelY);
            ctx.stroke();
          }
          ctx.beginPath();
        } else if (rel.relationType === 'harmonic') {
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2;
          ctx.lineTo(toX, toY);
          ctx.stroke();
          // Setas duplas
          const angle = Math.atan2(toY - fromY, toX - fromX);
          // Seta para 'to'
          ctx.beginPath();
          ctx.moveTo(toX, toY);
          ctx.lineTo(toX - 10 * Math.cos(angle - Math.PI / 6), toY - 10 * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(toX, toY);
          ctx.lineTo(toX - 10 * Math.cos(angle + Math.PI / 6), toY - 10 * Math.sin(angle + Math.PI / 6));
          // Seta para 'from'
          ctx.moveTo(fromX, fromY);
          ctx.lineTo(fromX + 10 * Math.cos(angle - Math.PI / 6), fromY + 10 * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(fromX, fromY);
          ctx.lineTo(fromX + 10 * Math.cos(angle + Math.PI / 6), fromY + 10 * Math.sin(angle + Math.PI / 6));
        } else if (rel.relationType === 'vulnerable') {
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 2;
          ctx.lineTo(toX, toY);
          ctx.stroke();
          // Círculo no meio
          ctx.beginPath();
          ctx.arc(midX, midY, 6, 0, 2 * Math.PI);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.strokeStyle = '#f97316';
        } else if (rel.relationType === 'physical-abuse') {
          ctx.strokeStyle = '#991b1b';
          ctx.lineWidth = 3;
          ctx.lineTo(toX, toY);
          ctx.stroke();
          // Linha com espinhos (triângulos ao longo da linha)
          ctx.beginPath();
          const numSpikes = 5;
          for (let i = 0; i <= numSpikes; i++) {
            const t = i / numSpikes;
            const x = fromX + (toX - fromX) * t;
            const y = fromY + (toY - fromY) * t;
            const angle = Math.atan2(toY - fromY, toX - fromX);
            const spikeLength = 8;
            const perpSpikeX = x - Math.sin(angle) * spikeLength;
            const perpSpikeY = y + Math.cos(angle) * spikeLength;
            ctx.moveTo(x, y);
            ctx.lineTo(perpSpikeX, perpSpikeY);
          }
          ctx.strokeStyle = '#991b1b';
        } else if (rel.relationType === 'emotional-abuse') {
          ctx.strokeStyle = '#5b21b6';
          ctx.lineWidth = 2;
          // Linha ondulada com traços
          ctx.setLineDash([10, 5]);
          const segments = 10;
          const amplitude = 5;
          for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const x = fromX + (toX - fromX) * t;
            const y = fromY + (toY - fromY) * t;
            const waveOffset = Math.sin(t * Math.PI * 6) * amplitude;
            const angle = Math.atan2(toY - fromY, toX - fromX);
            const perpWaveX = x - Math.sin(angle) * waveOffset;
            const perpWaveY = y + Math.cos(angle) * waveOffset;
            if (i === 0) ctx.moveTo(perpWaveX, perpWaveY);
            else ctx.lineTo(perpWaveX, perpWaveY);
          }
        } else if (rel.relationType === 'caregiver') {
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 2;
          ctx.lineTo(toX, toY);
          ctx.stroke();
          // Seta apontando para o dependente (to)
          const angle = Math.atan2(toY - fromY, toX - fromX);
          ctx.beginPath();
          ctx.moveTo(toX, toY);
          ctx.lineTo(toX - 15 * Math.cos(angle - Math.PI / 6), toY - 15 * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(toX, toY);
          ctx.lineTo(toX - 15 * Math.cos(angle + Math.PI / 6), toY - 15 * Math.sin(angle + Math.PI / 6));
          ctx.strokeStyle = '#0284c7';
        } else if (rel.relationType === 'hostility') {
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 3;
          // Linha com X's ao longo
          ctx.lineTo(toX, toY);
          ctx.stroke();
          ctx.beginPath();
          const numX = 4;
          for (let i = 1; i < numX; i++) {
            const t = i / numX;
            const x = fromX + (toX - fromX) * t;
            const y = fromY + (toY - fromY) * t;
            const size = 6;
            ctx.moveTo(x - size, y - size);
            ctx.lineTo(x + size, y + size);
            ctx.moveTo(x + size, y - size);
            ctx.lineTo(x - size, y + size);
          }
          ctx.strokeStyle = '#dc2626';
        } else if (rel.relationType === 'manipulation') {
          ctx.strokeStyle = '#4f46e5';
          
          // Setas de pressão psicológica
          const manipArrowAngle = Math.atan2(toY - fromY, toX - fromX);
          const manipArrowDist = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
          const manipMidX = fromX + (manipArrowDist / 2) * Math.cos(manipArrowAngle);
          const manipMidY = fromY + (manipArrowDist / 2) * Math.sin(manipArrowAngle);
          
          // Seta principal
          ctx.moveTo(fromX, fromY);
          ctx.lineTo(toX, toY);
          ctx.stroke();
          
          // Desenhar seta na direção do manipulado
          ctx.beginPath();
          ctx.moveTo(manipMidX, manipMidY);
          ctx.lineTo(manipMidX - 10 * Math.cos(manipArrowAngle - Math.PI / 6), manipMidY - 10 * Math.sin(manipArrowAngle - Math.PI / 6));
          ctx.moveTo(manipMidX, manipMidY);
          ctx.lineTo(manipMidX - 10 * Math.cos(manipArrowAngle + Math.PI / 6), manipMidY - 10 * Math.sin(manipArrowAngle + Math.PI / 6));
          ctx.stroke();
          
          ctx.setLineDash([]);
          ctx.strokeStyle = '#dc2626';
        } else if (rel.relationType === 'hostility') {
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 2;
          // Linha espiral
          const spirals = 3;
          const radius = 8;
          for (let i = 0; i <= 100; i++) {
            const t = i / 100;
            const spiralT = t * spirals * Math.PI * 2;
            const x = fromX + (toX - fromX) * t;
            const y = fromY + (toY - fromY) * t;
            const angle = Math.atan2(toY - fromY, toX - fromX);
            const r = radius * (1 - t);
            const offsetSpiralX = r * Math.cos(spiralT);
            const offsetSpiralY = r * Math.sin(spiralT);
            const perpSpiralX = x - Math.sin(angle) * offsetSpiralY + Math.cos(angle) * offsetSpiralX;
            const perpSpiralY = y + Math.cos(angle) * offsetSpiralY + Math.sin(angle) * offsetSpiralX;
            if (i === 0) ctx.moveTo(perpSpiralX, perpSpiralY);
            else ctx.lineTo(perpSpiralX, perpSpiralY);
          }
        } else if (rel.relationType === 'siblings') {
          ctx.strokeStyle = '#3b82f6'; // Cor azul para irmãos
          ctx.lineWidth = 2;
          ctx.moveTo(fromX, fromY);
          ctx.lineTo(toX, toY);
        }
        
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    // Draw elements
    filteredElements.filter(e => e.type !== 'relation').forEach(element => {
      // Check if element is highlighted during search
      const isHighlighted = element.highlighted !== false;
      const hasSearch = searchTerm.trim().length > 0;
      
      // Darken non-matching elements when searching
      if (hasSearch && !isHighlighted) {
        ctx.globalAlpha = 0.2;
      }
      
      ctx.strokeStyle = element.selected ? '#10b981' : '#64748b';
      ctx.lineWidth = element.selected ? 3 : 2;
      ctx.fillStyle = element.status === 'deceased' ? '#cbd5e1' : '#ffffff';

      if (element.type === 'male') {
        ctx.fillStyle = element.status === 'deceased' ? '#cbd5e1' : '#dbeafe';
        ctx.fillRect(element.x - 25, element.y - 25, 50, 50);
        ctx.strokeStyle = element.selected ? '#10b981' : '#3b82f6';
        ctx.strokeRect(element.x - 25, element.y - 25, 50, 50);
      } else if (element.type === 'female') {
        ctx.fillStyle = element.status === 'deceased' ? '#cbd5e1' : '#fce7f3';
        ctx.beginPath();
        ctx.arc(element.x, element.y, 25, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = element.selected ? '#10b981' : '#ec4899';
        ctx.stroke();
      } else if (element.type === 'pregnancy') {
        ctx.fillStyle = '#fef3c7';
        ctx.beginPath();
        ctx.moveTo(element.x, element.y - 25);
        ctx.lineTo(element.x + 25, element.y + 25);
        ctx.lineTo(element.x - 25, element.y + 25);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = element.selected ? '#10b981' : '#f59e0b';
        ctx.stroke();
      } else if (element.type === 'undefined') {
        // Triângulo invertido para sexo indefinido
        ctx.fillStyle = '#f3f4f6';
        ctx.beginPath();
        ctx.moveTo(element.x, element.y + 25);
        ctx.lineTo(element.x + 25, element.y - 25);
        ctx.lineTo(element.x - 25, element.y - 25);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = element.selected ? '#10b981' : '#6b7280';
        ctx.stroke();
      } else if (element.type === 'twins' || element.type === 'fraternal-twins') {
        // Gêmeos fraternos (dois círculos conectados na base)
        ctx.fillStyle = '#cffafe';
        ctx.beginPath();
        ctx.arc(element.x - 12, element.y, 20, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = element.selected ? '#10b981' : '#06b6d4';
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(element.x + 12, element.y, 20, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // Linha conectando na base
        ctx.beginPath();
        ctx.moveTo(element.x - 12, element.y + 20);
        ctx.lineTo(element.x + 12, element.y + 20);
        ctx.stroke();
      } else if (element.type === 'identical-twins') {
        // Gêmeos idênticos (dois círculos com triângulo conectando)
        ctx.fillStyle = '#cffafe';
        ctx.beginPath();
        ctx.arc(element.x - 12, element.y, 20, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = element.selected ? '#10b981' : '#06b6d4';
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(element.x + 12, element.y, 20, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // Triângulo conectando na base
        ctx.beginPath();
        ctx.moveTo(element.x - 12, element.y + 20);
        ctx.lineTo(element.x, element.y + 30);
        ctx.lineTo(element.x + 12, element.y + 20);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (element.type === 'pet') {
        // Animal de estimação (pentágono)
        ctx.fillStyle = '#d1fae5';
        ctx.beginPath();
        const sides = 5;
        const radius = 25;
        for (let i = 0; i < sides; i++) {
          const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
          const x = element.x + radius * Math.cos(angle);
          const y = element.y + radius * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = element.selected ? '#10b981' : '#10b981';
        ctx.stroke();
      }

      // Status especiais - aplicar primeiro para não sobrepor
      // Pessoa índice (PI) - borda destacada
      if (element.status === 'index-person') {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        if (element.type === 'male') {
          ctx.strokeRect(element.x - 28, element.y - 28, 56, 56);
        } else if (element.type === 'female') {
          ctx.beginPath();
          ctx.arc(element.x, element.y, 28, 0, 2 * Math.PI);
          ctx.stroke();
        }
      }
      
      // Status de falecimento
      if (element.status === 'deceased') {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(element.x - 20, element.y - 20);
        ctx.lineTo(element.x + 20, element.y + 20);
        ctx.moveTo(element.x + 20, element.y - 20);
        ctx.lineTo(element.x - 20, element.y + 20);
        ctx.stroke();
      } 
      
      // Abuso de álcool ou drogas - símbolo preenchido
      if (element.status === 'substance-abuse') {
        if (element.type === 'male') {
          ctx.fillStyle = '#000000';
          ctx.fillRect(element.x - 25, element.y - 25, 50, 50);
          ctx.strokeStyle = element.selected ? '#10b981' : '#3b82f6';
          ctx.strokeRect(element.x - 25, element.y - 25, 50, 50);
        } else if (element.type === 'female') {
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(element.x, element.y, 25, 0, 2 * Math.PI);
          ctx.fill();
          ctx.strokeStyle = element.selected ? '#10b981' : '#ec4899';
          ctx.stroke();
        }
      }
      
      // Em recuperação - símbolo parcialmente preenchido (metade inferior)
      if (element.status === 'recovering') {
        if (element.type === 'male') {
          ctx.fillStyle = '#000000';
          ctx.fillRect(element.x - 25, element.y, 50, 25);
        } else if (element.type === 'female') {
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(element.x, element.y, 25, 0, Math.PI);
          ctx.fill();
        }
      }
      
      // Transtorno mental - metade preenchida
      if (element.status === 'mental-disorder') {
        if (element.type === 'male') {
          ctx.fillStyle = '#000000';
          ctx.fillRect(element.x - 25, element.y - 25, 25, 50);
        } else if (element.type === 'female') {
          ctx.save();
          ctx.beginPath();
          ctx.arc(element.x, element.y, 25, Math.PI / 2, 3 * Math.PI / 2);
          ctx.lineTo(element.x, element.y);
          ctx.closePath();
          ctx.fillStyle = '#000000';
          ctx.fill();
          ctx.restore();
        }
      }
      
      // Filho adotado - colchetes ao redor
      if (element.status === 'adopted') {
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 2;
        const bracketSize = 35;
        const bracketWidth = 8;
        
        // Colchete esquerdo
        ctx.beginPath();
        ctx.moveTo(element.x - bracketSize, element.y - bracketSize);
        ctx.lineTo(element.x - bracketSize - bracketWidth, element.y - bracketSize);
        ctx.lineTo(element.x - bracketSize - bracketWidth, element.y + bracketSize);
        ctx.lineTo(element.x - bracketSize, element.y + bracketSize);
        ctx.stroke();
        
        // Colchete direito
        ctx.beginPath();
        ctx.moveTo(element.x + bracketSize, element.y - bracketSize);
        ctx.lineTo(element.x + bracketSize + bracketWidth, element.y - bracketSize);
        ctx.lineTo(element.x + bracketSize + bracketWidth, element.y + bracketSize);
        ctx.lineTo(element.x + bracketSize, element.y + bracketSize);
        ctx.stroke();
      }
      
      // Filho de criação (foster) - similar aos colchetes mas diferente
      if (element.status === 'foster') {
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2;
        const bracketSize = 35;
        
        // Linhas nos cantos
        ctx.beginPath();
        // Canto superior esquerdo
        ctx.moveTo(element.x - bracketSize - 5, element.y - bracketSize);
        ctx.lineTo(element.x - bracketSize, element.y - bracketSize);
        ctx.lineTo(element.x - bracketSize, element.y - bracketSize + 5);
        // Canto superior direito
        ctx.moveTo(element.x + bracketSize + 5, element.y - bracketSize);
        ctx.lineTo(element.x + bracketSize, element.y - bracketSize);
        ctx.lineTo(element.x + bracketSize, element.y - bracketSize + 5);
        // Canto inferior esquerdo
        ctx.moveTo(element.x - bracketSize - 5, element.y + bracketSize);
        ctx.lineTo(element.x - bracketSize, element.y + bracketSize);
        ctx.lineTo(element.x - bracketSize, element.y + bracketSize - 5);
        // Canto inferior direito
        ctx.moveTo(element.x + bracketSize + 5, element.y + bracketSize);
        ctx.lineTo(element.x + bracketSize, element.y + bracketSize);
        ctx.lineTo(element.x + bracketSize, element.y + bracketSize - 5);
        ctx.stroke();
      }
      
      if (element.status === 'stillborn') {
        // Pequeno X
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(element.x - 10, element.y - 10);
        ctx.lineTo(element.x + 10, element.y + 10);
        ctx.moveTo(element.x + 10, element.y - 10);
        ctx.lineTo(element.x - 10, element.y + 10);
        ctx.stroke();
      } else if (element.status === 'miscarriage') {
        // Círculo preenchido pequeno
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(element.x, element.y, 8, 0, 2 * Math.PI);
        ctx.fill();
      } else if (element.status === 'abortion') {
        // X maior
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(element.x - 15, element.y - 15);
        ctx.lineTo(element.x + 15, element.y + 15);
        ctx.moveTo(element.x + 15, element.y - 15);
        ctx.lineTo(element.x - 15, element.y + 15);
        ctx.stroke();
      }

      // Reset global alpha after drawing element shape
      ctx.globalAlpha = 1.0;
      
      // Draw highlight ring for searched elements
      if (hasSearch && isHighlighted) {
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#10b981';
        
        if (element.type === 'male') {
          ctx.strokeRect(element.x - 30, element.y - 30, 60, 60);
        } else if (element.type === 'female') {
          ctx.beginPath();
          ctx.arc(element.x, element.y, 30, 0, 2 * Math.PI);
          ctx.stroke();
        } else if (element.type === 'pregnancy') {
          ctx.beginPath();
          ctx.moveTo(element.x, element.y - 30);
          ctx.lineTo(element.x + 30, element.y + 30);
          ctx.lineTo(element.x - 30, element.y + 30);
          ctx.closePath();
          ctx.stroke();
        } else if (element.type === 'undefined') {
          ctx.beginPath();
          ctx.moveTo(element.x, element.y + 30);
          ctx.lineTo(element.x + 30, element.y - 30);
          ctx.lineTo(element.x - 30, element.y - 30);
          ctx.closePath();
          ctx.stroke();
        } else if (element.type === 'twins') {
          ctx.beginPath();
          ctx.arc(element.x - 12, element.y, 25, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(element.x + 12, element.y, 25, 0, 2 * Math.PI);
          ctx.stroke();
        } else if (element.type === 'pet') {
          ctx.beginPath();
          const sides = 5;
          const radius = 30;
          for (let i = 0; i < sides; i++) {
            const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
            const x = element.x + radius * Math.cos(angle);
            const y = element.y + radius * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();
        }
        
        ctx.shadowBlur = 0;
      }
      
      // Apply darker text for non-highlighted when searching
      if (hasSearch && !isHighlighted) {
        ctx.fillStyle = '#64748b';
      } else {
        ctx.fillStyle = '#1e293b';
      }
      
      // Mostrar informações do elemento
      if (element.name || element.age || element.birthDate || element.deathDate) {
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        let yOffset = 45;
        
        if (element.name) {
          ctx.fillText(element.name, element.x, element.y + yOffset);
          yOffset += 15;
        }
        
        // Mostrar idade dentro do símbolo se fornecida
        if (element.age && !element.birthDate) {
          ctx.fillText(element.age, element.x, element.y + yOffset);
          yOffset += 15;
        }
        
        // Mostrar datas de nascimento e morte
        if (element.birthDate || element.deathDate) {
          const birthYear = element.birthDate || '';
          const deathYear = element.deathDate || '';
          const dateText = `${birthYear}${deathYear ? ' - ' + deathYear : ''}`;
          ctx.font = '10px Arial';
          ctx.fillText(dateText, element.x, element.y + yOffset);
        }
      }
      
      // Reset alpha for next element
      ctx.globalAlpha = 1.0;
    });

    // Desenhar retângulo de seleção
    if (isSelecting) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        selectionStart.x,
        selectionStart.y,
        selectionEnd.x - selectionStart.x,
        selectionEnd.y - selectionStart.y
      );
      ctx.setLineDash([]);
      
      // Preencher retângulo com transparência
      ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
      ctx.fillRect(
        selectionStart.x,
        selectionStart.y,
        selectionEnd.x - selectionStart.x,
        selectionEnd.y - selectionStart.y
      );
    }
  }, [elements, selectedElement, isSelecting, selectionStart, selectionEnd, filteredElements, searchTerm]);

  const exportToPDF = () => {
    if (!canDownload) {
      toast({
        title: "Recurso bloqueado",
        description: "Faça upgrade para o plano Profissional para baixar PDF.",
        variant: "destructive",
      });
      return;
    }
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Criar canvas temporário com fundo branco
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (!tempCtx) return;
    
    // Preencher com fundo branco
    tempCtx.fillStyle = '#FFFFFF';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Desenhar o canvas original por cima
    tempCtx.drawImage(canvas, 0, 0);
    
    // Converter para PDF
    const imgData = tempCanvas.toDataURL('image/png');
    
    // Importar jsPDF dinamicamente
    import('jspdf').then(({ jsPDF }) => {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [tempCanvas.width, tempCanvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, tempCanvas.width, tempCanvas.height);
      pdf.save('genograma-familiar.pdf');
      
      toast({
        title: "PDF baixado!",
        description: "O genograma foi baixado com sucesso.",
      });
    });
  };


  const handleSave = async () => {
    if (!canSaveLoad) {
      toast({
        title: "Recurso bloqueado",
        description: "Faça upgrade para o plano Profissional para salvar genogramas.",
        variant: "destructive",
      });
      setShowSaveModal(false);
      return;
    }
    
    await saveGenogram(genogramTitle);
    setShowSaveModal(false);
  };

  const handleLoad = async (genogramId: string) => {
    if (!canSaveLoad) {
      toast({
        title: "Recurso bloqueado",
        description: "Faça upgrade para o plano Profissional para carregar genogramas.",
        variant: "destructive",
      });
      setShowLoadModal(false);
      return;
    }
    
    await loadGenogram(genogramId);
    setShowLoadModal(false);
  };

  const selectedElementData = elements.find(e => e.id === selectedElement && e.type !== 'relation');

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-green-50">
      <div className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-xl font-light text-foreground">Genograma Familiar</h1>
              <p className="text-xs text-muted-foreground">
                {user?.email}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowPlansModal(true)} variant="outline" size="sm">
              <CreditCard className="w-5 h-5 mr-2" />
              Meu Plano
            </Button>
            <Button onClick={handleLogout} variant="ghost" size="sm">
              <LogOut className="w-5 h-5 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <div className="flex gap-4">
          <div className="w-64 space-y-4 flex-shrink-0">
            {/* Search Box */}
            <div className="bg-card rounded-xl shadow-md p-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar por nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <FamilyExpertChat 
                onGenerateGenogram={(newElements) => {
                  setElements(newElements);
                  setSelectedElement(null);
                }} 
                isButton={true} 
              />
            </div>

            <div className="bg-card rounded-xl shadow-md p-4">
              <h3 className="font-medium text-foreground mb-3">Gerenciar</h3>
              <div className="space-y-2">
                <Button
                  onClick={handleCreateNew}
                  className="w-full"
                  variant="outline"
                  size="sm"
                  disabled={!canCreateMultiple}
                >
                  {!canCreateMultiple ? <Lock className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Novo Genograma
                </Button>
                <Button
                  onClick={() => setShowSaveModal(true)}
                  className="w-full"
                  variant="outline"
                  size="sm"
                  disabled={genogramLoading || !canSaveLoad}
                >
                  {!canSaveLoad && <Lock className="w-4 h-4 mr-2" />}
                  {canSaveLoad && <Save className="w-4 h-4 mr-2" />}
                  Salvar
                </Button>
                <Button
                  onClick={() => setShowLoadModal(true)}
                  className="w-full"
                  variant="outline"
                  size="sm"
                  disabled={!canSaveLoad}
                >
                  {!canSaveLoad && <Lock className="w-4 h-4 mr-2" />}
                  {canSaveLoad && <FolderOpen className="w-4 h-4 mr-2" />}
                  Carregar
                </Button>
                <Button
                  onClick={() => setShowClearModal(true)}
                  className="w-full bg-muted/50 hover:bg-muted border-muted-foreground/30"
                  variant="outline"
                  size="sm"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpar Tela
                </Button>
                <Button
                  onClick={() => setShowLegendModal(true)}
                  className="w-full"
                  variant="outline"
                  size="sm"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Legenda
                </Button>
              </div>
            </div>

            <div className="bg-card rounded-xl shadow-md p-4">
              <h3 className="font-medium text-foreground mb-3">Adicionar Pessoa</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                <Button
                  onClick={() => addElement('male')}
                  className="w-full bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 text-blue-700"
                  variant="outline"
                  size="sm"
                >
                  ⬜ Masculino
                </Button>
                <Button
                  onClick={() => addElement('female')}
                  className="w-full bg-pink-500/10 hover:bg-pink-500/20 border-pink-500/30 text-pink-700"
                  variant="outline"
                  size="sm"
                >
                  ⚪ Feminino
                </Button>
                <Button
                  onClick={() => addElement('pregnancy')}
                  className="w-full bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-700"
                  variant="outline"
                  size="sm"
                >
                  🔺 Gravidez
                </Button>
                <Button
                  onClick={() => addElement('undefined')}
                  className="w-full bg-gray-500/10 hover:bg-gray-500/20 border-gray-500/30 text-gray-700"
                  variant="outline"
                  size="sm"
                >
                  🔻 Sexo Indefinido
                </Button>
                <Button
                  onClick={() => addElement('twins')}
                  className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 text-cyan-700"
                  variant="outline"
                  size="sm"
                >
                  👥 Gêmeos Fraternos
                </Button>
                <Button
                  onClick={() => addElement('identical-twins')}
                  className="w-full bg-cyan-600/10 hover:bg-cyan-600/20 border-cyan-600/30 text-cyan-800"
                  variant="outline"
                  size="sm"
                >
                  👯 Gêmeos Idênticos
                </Button>
                <Button
                  onClick={() => addElement('pet')}
                  className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-700"
                  variant="outline"
                  size="sm"
                >
                  🐾 Animal de Estimação
                </Button>
              </div>
            </div>

            <div className="bg-card rounded-xl shadow-md p-4">
              <h3 className="font-medium text-foreground mb-3">Relações</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                <Button
                  onClick={() => addRelation('children')}
                  className="w-full bg-green-500/10 hover:bg-green-500/20 border-green-500/30 text-green-700"
                  variant="outline"
                  size="sm"
                >
                  Filhos (2 pais + filhos)
                </Button>
                <Button
                  onClick={() => addRelation('marriage')}
                  className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-700"
                  variant="outline"
                  size="sm"
                >
                  Casamento
                </Button>
                <Button
                  onClick={() => addRelation('divorce')}
                  className="w-full bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-700"
                  variant="outline"
                  size="sm"
                >
                  Divórcio
                </Button>
                <Button
                  onClick={() => addRelation('separation')}
                  className="w-full bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/30 text-orange-700"
                  variant="outline"
                  size="sm"
                >
                  Separação Conjugal
                </Button>
                <Button
                  onClick={() => addRelation('back-together')}
                  className="w-full bg-emerald-400/10 hover:bg-emerald-400/20 border-emerald-400/30 text-emerald-600"
                  variant="outline"
                  size="sm"
                >
                  Voltaram Juntos
                </Button>
                <Button
                  onClick={() => addRelation('living-together')}
                  className="w-full bg-teal-500/10 hover:bg-teal-500/20 border-teal-500/30 text-teal-700"
                  variant="outline"
                  size="sm"
                >
                  Morando Junto
                </Button>
                <Button
                  onClick={() => addRelation('distant')}
                  className="w-full bg-gray-500/10 hover:bg-gray-500/20 border-gray-500/30 text-gray-700"
                  variant="outline"
                  size="sm"
                >
                  Distante
                </Button>
                <Button
                  onClick={() => addRelation('conflict')}
                  className="w-full bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-700"
                  variant="outline"
                  size="sm"
                >
                  Conflituoso
                </Button>
                <Button
                  onClick={() => addRelation('breakup')}
                  className="w-full bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-700"
                  variant="outline"
                  size="sm"
                >
                  Rompimento
                </Button>
                <Button
                  onClick={() => addRelation('very-close')}
                  className="w-full bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30 text-purple-700"
                  variant="outline"
                  size="sm"
                >
                  Muito Estreito
                </Button>
                <Button
                  onClick={() => addRelation('fused-conflictual')}
                  className="w-full bg-yellow-600/10 hover:bg-yellow-600/20 border-yellow-600/30 text-yellow-700"
                  variant="outline"
                  size="sm"
                >
                  Fundido e Conflitual
                </Button>
                <Button
                  onClick={() => addRelation('alliance')}
                  className="w-full bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 text-blue-700"
                  variant="outline"
                  size="sm"
                >
                  Aliança
                </Button>
                <Button
                  onClick={() => addRelation('harmonic')}
                  className="w-full bg-lime-500/10 hover:bg-lime-500/20 border-lime-500/30 text-lime-700"
                  variant="outline"
                  size="sm"
                >
                  Harmônico
                </Button>
                <Button
                  onClick={() => addRelation('vulnerable')}
                  className="w-full bg-orange-600/10 hover:bg-orange-600/20 border-orange-600/30 text-orange-700"
                  variant="outline"
                  size="sm"
                >
                  Vulnerável
                </Button>
                <Button
                  onClick={() => addRelation('physical-abuse')}
                  className="w-full bg-red-700/10 hover:bg-red-700/20 border-red-700/30 text-red-800"
                  variant="outline"
                  size="sm"
                >
                  Abuso Físico
                </Button>
                <Button
                  onClick={() => addRelation('emotional-abuse')}
                  className="w-full bg-violet-700/10 hover:bg-violet-700/20 border-violet-700/30 text-violet-800"
                  variant="outline"
                  size="sm"
                >
                  Abuso Emocional
                </Button>
                <Button
                  onClick={() => addRelation('caregiver')}
                  className="w-full bg-sky-500/10 hover:bg-sky-500/20 border-sky-500/30 text-sky-700"
                  variant="outline"
                  size="sm"
                >
                  Cuidador/Dependente
                </Button>
                <Button
                  onClick={() => addRelation('hostility')}
                  className="w-full bg-red-600/10 hover:bg-red-600/20 border-red-600/30 text-red-700"
                  variant="outline"
                  size="sm"
                >
                  Hostilidade
                </Button>
                <Button
                  onClick={() => addRelation('manipulation')}
                  className="w-full bg-indigo-600/10 hover:bg-indigo-600/20 border-indigo-600/30 text-indigo-700"
                  variant="outline"
                  size="sm"
                >
                  Manipulação
                </Button>
                {/* 'Irmãos' relation removed as requested */}
              </div>
            </div>

            {selectedElementData && (
              <div className="bg-card rounded-xl shadow-md p-4">
                <h3 className="font-medium text-foreground mb-3">Editar Pessoa</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Nome"
                      value={selectedElementData.name || ''}
                      onChange={(e) => updateElement(selectedElement!, { name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="age">Idade</Label>
                    <Input
                      id="age"
                      type="number"
                      placeholder="Idade"
                      value={selectedElementData.age || ''}
                      onChange={(e) => updateElement(selectedElement!, { age: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={selectedElementData.status || 'alive'}
                      onValueChange={(value) => updateElement(selectedElement!, { status: value })}
                    >
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alive">Vivo</SelectItem>
                        <SelectItem value="deceased">Falecido</SelectItem>
                        <SelectItem value="index-person">Pessoa Índice (PI)</SelectItem>
                        <SelectItem value="adopted">Filho Adotado</SelectItem>
                        <SelectItem value="foster">Filho de Criação</SelectItem>
                        <SelectItem value="stillborn">Natimorto</SelectItem>
                        <SelectItem value="miscarriage">Aborto Espontâneo</SelectItem>
                        <SelectItem value="abortion">Aborto Provocado</SelectItem>
                        <SelectItem value="substance-abuse">Abuso de Álcool/Drogas</SelectItem>
                        <SelectItem value="recovering">Em Recuperação</SelectItem>
                        <SelectItem value="mental-disorder">Transtorno Mental</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={deleteElement}
                    className="w-full"
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </Button>
                </div>
              </div>
            )}

            <div className="bg-card rounded-xl shadow-md p-4">
              <h3 className="font-medium text-foreground mb-3">Ações</h3>
              <div className="space-y-2">
                <Button
                  onClick={generateFamilyStructure}
                  className="w-full bg-green-600/10 hover:bg-green-600/20 border-green-600/30 text-green-700"
                  variant="outline"
                  size="sm"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Gerar Estrutura Familiar
                </Button>
                <Button
                  onClick={exportToPDF}
                  className="w-full bg-muted/50 hover:bg-muted border-muted-foreground/30"
                  variant="outline"
                  size="sm"
                  disabled={!canDownload}
                >
                  {!canDownload && <Lock className="w-4 h-4 mr-2" />}
                  {canDownload && <Download className="w-4 h-4 mr-2" />}
                  Baixar PDF
                </Button>
                <Button
                  onClick={() => setShowFeedbackModal(true)}
                  className="w-full bg-primary/10 hover:bg-primary/20 border-primary/30 text-primary"
                  variant="outline"
                  size="sm"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Feedback do Sistema
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <div className="bg-card rounded-xl shadow-md p-4">
              <canvas
                ref={canvasRef}
                width={900}
                height={700}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="border border-border rounded-lg cursor-crosshair w-full"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showClearModal} onOpenChange={setShowClearModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Limpar Tela</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir todas as pessoas e relações para iniciar um novo genograma?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearModal(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={limparTela}>
              Limpar Tudo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSaveModal} onOpenChange={setShowSaveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar Genograma</DialogTitle>
            <DialogDescription>
              Digite um título para o genograma:
            </DialogDescription>
          </DialogHeader>
          <Input
            type="text"
            value={genogramTitle}
            onChange={(e) => setGenogramTitle(e.target.value)}
            placeholder="Nome do genograma"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={genogramLoading}>
              {genogramLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showLoadModal} onOpenChange={setShowLoadModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Carregar Genograma</DialogTitle>
            <DialogDescription>
              Selecione um genograma salvo:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {genograms.map((gen) => (
              <div
                key={gen.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                onClick={() => handleLoad(gen.id)}
              >
                <div>
                  <p className="font-medium">{gen.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(gen.updated_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteGenogram(gen.id);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {genograms.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nenhum genograma salvo ainda
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLoadModal(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPlansModal} onOpenChange={setShowPlansModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Gerenciar Assinatura</DialogTitle>
            <DialogDescription>
              {subscription?.status === 'active' 
                ? 'Você possui uma assinatura ativa' 
                : 'Escolha um plano para desbloquear todos os recursos'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Plano Mensal */}
            <div className="bg-card rounded-xl shadow-lg p-6 border-2 border-border hover:border-primary/50 transition-all">
              <div className="mb-4">
                <h3 className="text-2xl font-semibold text-foreground mb-2">Plano Mensal</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-primary">R$ 80</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-medium">Criar genogramas ilimitados</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-medium">Salvar e carregar genogramas</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-medium">Baixar PDF em alta qualidade</span>
                </li>
              </ul>
              <Button
                onClick={() => handleSubscribe('monthly')}
                disabled={subscribing}
                className="w-full"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Assinar Plano Mensal
              </Button>
            </div>

            {/* Plano Anual */}
            <div className="bg-card rounded-xl shadow-lg p-6 border-2 border-primary bg-primary/5 transition-all relative">
              <div className="absolute -top-3 right-4">
                <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">
                  20% DE DESCONTO
                </span>
              </div>
              <div className="mb-4">
                <h3 className="text-2xl font-semibold text-foreground mb-2">Plano Anual</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-primary">R$ 768</span>
                  <span className="text-muted-foreground">/ano</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Economize R$ 192 por ano</p>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-medium">Criar genogramas ilimitados</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-medium">Salvar e carregar genogramas</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-medium">Baixar PDF em alta qualidade</span>
                </li>
              </ul>
              <Button
                onClick={() => handleSubscribe('annual')}
                disabled={subscribing}
                className="w-full"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Assinar Plano Anual
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlansModal(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback Modal */}
      <Dialog open={showFeedbackModal} onOpenChange={setShowFeedbackModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Feedback do Sistema</DialogTitle>
            <DialogDescription>
              Ajude-nos a melhorar! Envie sua sugestão de forma anônima ou com seu e-mail.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="feedback-email">E-mail (opcional - para resposta)</Label>
              <Input
                id="feedback-email"
                type="email"
                placeholder="seu@email.com"
                value={feedbackEmail}
                onChange={(e) => setFeedbackEmail(e.target.value)}
                disabled={sendingFeedback}
              />
            </div>
            
            <div>
              <Label htmlFor="feedback-message">Mensagem *</Label>
              <textarea
                id="feedback-message"
                className="w-full min-h-[150px] px-3 py-2 border border-border rounded-md bg-background text-foreground resize-y"
                placeholder="Compartilhe sua sugestão, problema ou ideia para melhorar o sistema..."
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                disabled={sendingFeedback}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowFeedbackModal(false)}
              disabled={sendingFeedback}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSendFeedback}
              disabled={sendingFeedback || !feedbackMessage.trim()}
            >
              {sendingFeedback ? "Enviando..." : "Enviar Feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Legend Modal */}
      <GenogramLegend open={showLegendModal} onOpenChange={setShowLegendModal} />
    </div>
  );
};

export default Index;
