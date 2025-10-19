import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Download, Trash2, Users, Save, FolderOpen, Plus, Lock, CreditCard, Check, X, Network } from 'lucide-react';
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
import { AIChatbot } from '@/components/AIChatbot';

const PRICE_IDS = {
  basic: 'price_1SJs8NBOrcC2OeBV6wUbq4o4',
  standard: 'price_1SJs8oBOrcC2OeBV1YD4gVv8',
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
  const [genogramTitle, setGenogramTitle] = useState('Novo Genograma');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 });
  const [draggingMultiple, setDraggingMultiple] = useState(false);
  const [draggedElements, setDraggedElements] = useState<{ id: number; offsetX: number; offsetY: number }[]>([]);

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
      if (e.key === 'Delete' && selectedElement) {
        deleteElement();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElement]);

  const handleSubscribe = async (plan: 'basic' | 'standard') => {
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

  const addElement = (type: string) => {
    const newElement: GenogramElement = {
      id: Date.now(),
      type,
      x: 200,
      y: 200,
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
    if (selectedElement) {
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
      return x >= el.x - 30 && x <= el.x + 30 && y >= el.y - 30 && y <= el.y + 30;
    });
    
    if (clicked) {
      if (e.ctrlKey || e.metaKey) {
        toggleSelection(clicked.id);
      } else {
        const selectedElements = elements.filter(el => el.selected && el.type !== 'relation');
        
        // Se clicou em um elemento selecionado e há múltiplos selecionados, arrastar todos
        if (clicked.selected && selectedElements.length > 1) {
          setDraggingMultiple(true);
          setDraggedElements(
            selectedElements.map(el => ({
              id: el.id,
              offsetX: x - el.x,
              offsetY: y - el.y
            }))
          );
        } else {
          // Arrastar apenas o elemento clicado
          setIsDragging(true);
          setDragOffset({ x: x - clicked.x, y: y - clicked.y });
          setSelectedElement(clicked.id);
          // Desselecionar outros
          setElements(elements.map(el => ({ ...el, selected: el.id === clicked.id })));
        }
      }
    } else {
      // Iniciar seleção por arrastar
      setIsSelecting(true);
      setSelectionStart({ x, y });
      setSelectionEnd({ x, y });
      setSelectedElement(null);
      setElements(elements.map(el => ({ ...el, selected: false })));
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (isDragging && selectedElement) {
      updateElement(selectedElement, { x: x - dragOffset.x, y: y - dragOffset.y });
    } else if (draggingMultiple) {
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
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (elements.length === 0) return;

    // Draw relations
    elements.filter(e => e.type === 'relation').forEach(rel => {
      const from = elements.find(e => e.id === rel.from);
      const to = elements.find(e => e.id === rel.to);
      
      // Relação de filhos (linhas verticais)
      if (rel.relationType === 'children' && rel.children) {
        if (from && to) {
          // Linha horizontal entre os pais
          const midX = (from.x + to.x) / 2;
          const midY = Math.min(from.y, to.y) + 40;
          
          ctx.strokeStyle = '#4ade80';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(from.x, from.y + 25);
          ctx.lineTo(from.x, midY);
          ctx.lineTo(to.x, midY);
          ctx.lineTo(to.x, to.y + 25);
          ctx.stroke();
          
          // Linhas verticais para cada filho
          rel.children.forEach((childId: number) => {
            const child = elements.find(e => e.id === childId);
            if (child) {
              ctx.beginPath();
              ctx.moveTo(midX, midY);
              ctx.lineTo(child.x, child.y - 25);
              ctx.stroke();
            }
          });
        } else if (from && rel.children.length > 0) {
          // Apenas um pai selecionado
          const baseY = from.y + 40;
          
          rel.children.forEach((childId: number) => {
            const child = elements.find(e => e.id === childId);
            if (child) {
              ctx.strokeStyle = '#4ade80';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(from.x, from.y + 25);
              ctx.lineTo(from.x, baseY);
              ctx.lineTo(child.x, baseY);
              ctx.lineTo(child.x, child.y - 25);
              ctx.stroke();
            }
          });
        }
        return;
      }
      
      if (from && to) {
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        
        if (rel.relationType === 'marriage') {
          ctx.strokeStyle = '#4ade80';
          ctx.lineWidth = 3;
          ctx.lineTo(to.x, to.y);
        } else if (rel.relationType === 'divorce') {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.lineTo(to.x, to.y);
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
          ctx.lineTo(to.x, to.y);
          ctx.stroke();
          // Uma barra no meio
          ctx.beginPath();
          ctx.moveTo(midX, midY - 10);
          ctx.lineTo(midX, midY + 10);
        } else if (rel.relationType === 'living-together') {
          ctx.strokeStyle = '#4ade80';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.lineTo(to.x, to.y);
        } else if (rel.relationType === 'distant') {
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1;
          ctx.setLineDash([8, 8]);
          ctx.lineTo(to.x, to.y);
        } else if (rel.relationType === 'conflict') {
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          // Linha ondulada
          const segments = 8;
          const amplitude = 8;
          for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const x = from.x + (to.x - from.x) * t;
            const y = from.y + (to.y - from.y) * t;
            const offset = Math.sin(t * Math.PI * 4) * amplitude;
            const angle = Math.atan2(to.y - from.y, to.x - from.x);
            const perpX = x - Math.sin(angle) * offset;
            const perpY = y + Math.cos(angle) * offset;
            if (i === 0) ctx.moveTo(perpX, perpY);
            else ctx.lineTo(perpX, perpY);
          }
        } else if (rel.relationType === 'breakup') {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3;
          ctx.lineTo(to.x, to.y);
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
          for (let offset = -3; offset <= 3; offset += 3) {
            ctx.beginPath();
            const angle = Math.atan2(to.y - from.y, to.x - from.x);
            const perpX = -Math.sin(angle) * offset;
            const perpY = Math.cos(angle) * offset;
            ctx.moveTo(from.x + perpX, from.y + perpY);
            ctx.lineTo(to.x + perpX, to.y + perpY);
            ctx.stroke();
          }
          ctx.beginPath();
        } else if (rel.relationType === 'fused-conflictual') {
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          // Três linhas onduladas
          for (let offset = -3; offset <= 3; offset += 3) {
            ctx.beginPath();
            const segments = 8;
            const amplitude = 6;
            for (let i = 0; i <= segments; i++) {
              const t = i / segments;
              const x = from.x + (to.x - from.x) * t;
              const y = from.y + (to.y - from.y) * t;
              const waveOffset = Math.sin(t * Math.PI * 4) * amplitude;
              const angle = Math.atan2(to.y - from.y, to.x - from.x);
              const perpX = x - Math.sin(angle) * (waveOffset + offset);
              const perpY = y + Math.cos(angle) * (waveOffset + offset);
              if (i === 0) ctx.moveTo(perpX, perpY);
              else ctx.lineTo(perpX, perpY);
            }
            ctx.stroke();
          }
          ctx.beginPath();
        } else if (rel.relationType === 'alliance') {
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2;
          // Duas linhas paralelas
          const angle = Math.atan2(to.y - from.y, to.x - from.x);
          for (let offset = -2; offset <= 2; offset += 4) {
            ctx.beginPath();
            const perpX = -Math.sin(angle) * offset;
            const perpY = Math.cos(angle) * offset;
            ctx.moveTo(from.x + perpX, from.y + perpY);
            ctx.lineTo(to.x + perpX, to.y + perpY);
            ctx.stroke();
          }
          ctx.beginPath();
        } else if (rel.relationType === 'harmonic') {
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2;
          ctx.lineTo(to.x, to.y);
          ctx.stroke();
          // Setas duplas
          const angle = Math.atan2(to.y - from.y, to.x - from.x);
          // Seta para 'to'
          ctx.beginPath();
          ctx.moveTo(to.x, to.y);
          ctx.lineTo(to.x - 10 * Math.cos(angle - Math.PI / 6), to.y - 10 * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(to.x, to.y);
          ctx.lineTo(to.x - 10 * Math.cos(angle + Math.PI / 6), to.y - 10 * Math.sin(angle + Math.PI / 6));
          // Seta para 'from'
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(from.x + 10 * Math.cos(angle - Math.PI / 6), from.y + 10 * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(from.x + 10 * Math.cos(angle + Math.PI / 6), from.y + 10 * Math.sin(angle + Math.PI / 6));
        } else if (rel.relationType === 'vulnerable') {
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 2;
          ctx.lineTo(to.x, to.y);
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
          ctx.lineTo(to.x, to.y);
          ctx.stroke();
          // Linha com espinhos (triângulos ao longo da linha)
          ctx.beginPath();
          const numSpikes = 5;
          for (let i = 0; i <= numSpikes; i++) {
            const t = i / numSpikes;
            const x = from.x + (to.x - from.x) * t;
            const y = from.y + (to.y - from.y) * t;
            const angle = Math.atan2(to.y - from.y, to.x - from.x);
            const spikeLength = 8;
            const perpX = x - Math.sin(angle) * spikeLength;
            const perpY = y + Math.cos(angle) * spikeLength;
            ctx.moveTo(x, y);
            ctx.lineTo(perpX, perpY);
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
            const x = from.x + (to.x - from.x) * t;
            const y = from.y + (to.y - from.y) * t;
            const offset = Math.sin(t * Math.PI * 6) * amplitude;
            const angle = Math.atan2(to.y - from.y, to.x - from.x);
            const perpX = x - Math.sin(angle) * offset;
            const perpY = y + Math.cos(angle) * offset;
            if (i === 0) ctx.moveTo(perpX, perpY);
            else ctx.lineTo(perpX, perpY);
          }
        } else if (rel.relationType === 'caregiver') {
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 2;
          ctx.lineTo(to.x, to.y);
          ctx.stroke();
          // Seta apontando para o dependente (to)
          const angle = Math.atan2(to.y - from.y, to.x - from.x);
          ctx.beginPath();
          ctx.moveTo(to.x, to.y);
          ctx.lineTo(to.x - 15 * Math.cos(angle - Math.PI / 6), to.y - 15 * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(to.x, to.y);
          ctx.lineTo(to.x - 15 * Math.cos(angle + Math.PI / 6), to.y - 15 * Math.sin(angle + Math.PI / 6));
          ctx.strokeStyle = '#0284c7';
        } else if (rel.relationType === 'hostility') {
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 3;
          // Linha com X's ao longo
          ctx.lineTo(to.x, to.y);
          ctx.stroke();
          ctx.beginPath();
          const numX = 4;
          for (let i = 1; i < numX; i++) {
            const t = i / numX;
            const x = from.x + (to.x - from.x) * t;
            const y = from.y + (to.y - from.y) * t;
            const size = 6;
            ctx.moveTo(x - size, y - size);
            ctx.lineTo(x + size, y + size);
            ctx.moveTo(x + size, y - size);
            ctx.lineTo(x - size, y + size);
          }
          ctx.strokeStyle = '#dc2626';
        } else if (rel.relationType === 'manipulation') {
          ctx.strokeStyle = '#4f46e5';
          ctx.lineWidth = 2;
          // Linha espiral
          const spirals = 3;
          const radius = 8;
          for (let i = 0; i <= 100; i++) {
            const t = i / 100;
            const spiralT = t * spirals * Math.PI * 2;
            const x = from.x + (to.x - from.x) * t;
            const y = from.y + (to.y - from.y) * t;
            const angle = Math.atan2(to.y - from.y, to.x - from.x);
            const r = radius * (1 - t);
            const offsetX = r * Math.cos(spiralT);
            const offsetY = r * Math.sin(spiralT);
            const perpX = x - Math.sin(angle) * offsetY + Math.cos(angle) * offsetX;
            const perpY = y + Math.cos(angle) * offsetY + Math.sin(angle) * offsetX;
            if (i === 0) ctx.moveTo(perpX, perpY);
            else ctx.lineTo(perpX, perpY);
          }
        }
        
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    // Draw elements
    elements.filter(e => e.type !== 'relation').forEach(element => {
      ctx.strokeStyle = element.selected ? '#10b981' : '#64748b';
      ctx.lineWidth = element.selected ? 3 : 2;
      ctx.fillStyle = element.status === 'deceased' ? '#cbd5e1' : '#ffffff';

      // Pessoa índice masculina (quadrado preenchido)
      if (element.type === 'index') {
        ctx.fillStyle = '#7c3aed';
        ctx.fillRect(element.x - 25, element.y - 25, 50, 50);
        ctx.strokeStyle = '#5b21b6';
        ctx.lineWidth = 4;
        ctx.strokeRect(element.x - 25, element.y - 25, 50, 50);
        ctx.strokeRect(element.x - 22, element.y - 22, 44, 44);
      } else if (element.type === 'index-female') {
        // Pessoa índice feminina (círculo preenchido com borda dupla)
        ctx.fillStyle = '#7c3aed';
        ctx.beginPath();
        ctx.arc(element.x, element.y, 25, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#5b21b6';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(element.x, element.y, 22, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (element.type === 'male') {
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
      } else if (element.type === 'twins') {
        // Gêmeos (dois círculos conectados)
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

      // Status especiais
      if (element.status === 'deceased') {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(element.x - 20, element.y - 20);
        ctx.lineTo(element.x + 20, element.y + 20);
        ctx.moveTo(element.x + 20, element.y - 20);
        ctx.lineTo(element.x - 20, element.y + 20);
        ctx.stroke();
      } else if (element.status === 'substance-abuse') {
        // Linha preta embaixo do símbolo
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(element.x - 25, element.y + 30);
        ctx.lineTo(element.x + 25, element.y + 30);
        ctx.stroke();
      } else if (element.status === 'adopted') {
        // Linha pontilhada ao redor
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 2;
        if (element.type === 'male' || element.type === 'index' || element.type === 'index-female') {
          ctx.strokeRect(element.x - 28, element.y - 28, 56, 56);
        } else if (element.type === 'female') {
          ctx.beginPath();
          ctx.arc(element.x, element.y, 28, 0, 2 * Math.PI);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      } else if (element.status === 'stillborn') {
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

      if (element.name) {
        ctx.fillStyle = '#1e293b';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(element.name, element.x, element.y + 45);
        if (element.age) {
          ctx.fillText(element.age + ' anos', element.x, element.y + 60);
        }
      }
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
  }, [elements, selectedElement, isSelecting, selectionStart, selectionEnd]);

  const autoOrganize = () => {
    if (elements.length === 0) return;

    // Encontrar todos os elementos que não são relações
    const people = elements.filter(e => e.type !== 'relation');
    const relations = elements.filter(e => e.type === 'relation');
    
    // Mapa para rastrear níveis (gerações)
    const levels = new Map<number, number>();
    const processed = new Set<number>();
    
    // Função para determinar o nível de cada pessoa
    const determineLevel = (personId: number, level: number) => {
      if (processed.has(personId)) return;
      processed.add(personId);
      levels.set(personId, Math.max(levels.get(personId) || 0, level));
      
      // Encontrar filhos dessa pessoa
      relations.forEach(rel => {
        if (rel.relationType === 'children' && rel.children) {
          if (rel.from === personId || rel.to === personId) {
            rel.children.forEach((childId: number) => {
              determineLevel(childId, level + 1);
            });
          }
        }
      });
    };
    
    // Encontrar pessoas sem pais (geração 0)
    const peopleWithParents = new Set<number>();
    relations.forEach(rel => {
      if (rel.relationType === 'children' && rel.children) {
        rel.children.forEach((childId: number) => peopleWithParents.add(childId));
      }
    });
    
    // Iniciar com pessoas que não têm pais
    people.forEach(person => {
      if (!peopleWithParents.has(person.id)) {
        determineLevel(person.id, 0);
      }
    });
    
    // Agrupar por nível
    const byLevel = new Map<number, GenogramElement[]>();
    people.forEach(person => {
      const level = levels.get(person.id) || 0;
      if (!byLevel.has(level)) {
        byLevel.set(level, []);
      }
      byLevel.get(level)!.push(person);
    });
    
    // Organizar posições
    const startY = 100;
    const levelHeight = 150;
    const horizontalSpacing = 120;
    
    const updatedElements = [...elements];
    
    byLevel.forEach((peopleInLevel, level) => {
      const y = startY + level * levelHeight;
      const totalWidth = (peopleInLevel.length - 1) * horizontalSpacing;
      const startX = 450 - totalWidth / 2; // Centralizar
      
      peopleInLevel.forEach((person, index) => {
        const x = startX + index * horizontalSpacing;
        const elementIndex = updatedElements.findIndex(e => e.id === person.id);
        if (elementIndex !== -1) {
          updatedElements[elementIndex] = { ...updatedElements[elementIndex], x, y };
        }
      });
    });
    
    setElements(updatedElements);
    toast({
      title: "Árvore organizada!",
      description: "Os elementos foram reorganizados automaticamente.",
    });
  };

  const exportImage = () => {
    if (!canDownload) {
      toast({
        title: "Recurso bloqueado",
        description: "Faça upgrade para o plano Profissional para baixar imagens.",
        variant: "destructive",
      });
      return;
    }
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'genograma-familiar.png';
    link.href = url;
    link.click();
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
                  onClick={() => addElement('index')}
                  className="w-full bg-purple-600/10 hover:bg-purple-600/20 border-purple-600/30 text-purple-700"
                  variant="outline"
                  size="sm"
                >
                  ⬛ Pessoa Índice (M)
                </Button>
                <Button
                  onClick={() => addElement('index-female')}
                  className="w-full bg-purple-600/10 hover:bg-purple-600/20 border-purple-600/30 text-purple-700"
                  variant="outline"
                  size="sm"
                >
                  ⚫ Pessoa Índice (F)
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
                  👥 Gêmeos
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
              <p className="text-xs text-muted-foreground mb-2">Arraste para selecionar ou Ctrl + clique</p>
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
                        <SelectItem value="adopted">Adotivo</SelectItem>
                        <SelectItem value="stillborn">Nascimento Morto</SelectItem>
                        <SelectItem value="miscarriage">Aborto Espontâneo</SelectItem>
                        <SelectItem value="abortion">Aborto Induzido</SelectItem>
                        <SelectItem value="substance-abuse">Abuso de Substância</SelectItem>
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
                  onClick={autoOrganize}
                  className="w-full bg-primary/10 hover:bg-primary/20 border-primary/30 text-primary"
                  variant="outline"
                  size="sm"
                  disabled={elements.length === 0}
                >
                  <Network className="w-4 h-4 mr-2" />
                  Organizar Automaticamente
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
                  onClick={exportImage}
                  className="w-full bg-muted/50 hover:bg-muted border-muted-foreground/30"
                  variant="outline"
                  size="sm"
                  disabled={!canDownload}
                >
                  {!canDownload && <Lock className="w-4 h-4 mr-2" />}
                  {canDownload && <Download className="w-4 h-4 mr-2" />}
                  Baixar Imagem
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
                ? `Você está no plano ${subscription.plan === 'basic' ? 'Básico' : 'Profissional'}` 
                : 'Escolha um plano para desbloquear todos os recursos'}
            </DialogDescription>
          </DialogHeader>

          {subscription?.status === 'active' && (
            <div className="mb-4">
              <Button 
                onClick={handleManageSubscription}
                disabled={subscribing}
                variant="outline"
                className="w-full"
              >
                Gerenciar Minha Assinatura no Stripe
              </Button>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {/* Plano Básico */}
            <div className={`bg-card rounded-xl shadow-lg p-6 border-2 transition-all ${
              subscription?.plan === 'basic' 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}>
              {subscription?.plan === 'basic' && (
                <div className="mb-2">
                  <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">
                    SEU PLANO ATUAL
                  </span>
                </div>
              )}
              <div className="mb-4">
                <h3 className="text-2xl font-semibold text-foreground mb-2">Básico</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-primary">R$ 40</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Criar apenas 1 genograma</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">Salvar e carregar genogramas</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">Baixar imagens</span>
                </li>
              </ul>
              {subscription?.plan !== 'basic' && (
                <Button
                  onClick={() => handleSubscribe('basic')}
                  disabled={subscribing}
                  className="w-full"
                  variant="outline"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Assinar Plano Básico
                </Button>
              )}
            </div>

            {/* Plano Profissional */}
            <div className={`bg-card rounded-xl shadow-lg p-6 border-2 transition-all ${
              subscription?.plan === 'standard' 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}>
              {subscription?.plan === 'standard' && (
                <div className="mb-2">
                  <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">
                    SEU PLANO ATUAL
                  </span>
                </div>
              )}
              <div className="mb-4">
                <h3 className="text-2xl font-semibold text-foreground mb-2">Profissional</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-primary">R$ 50</span>
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
                  <span className="text-sm font-medium">Baixar imagens em alta qualidade</span>
                </li>
              </ul>
              {subscription?.plan !== 'standard' && (
                <Button
                  onClick={() => handleSubscribe('standard')}
                  disabled={subscribing}
                  className="w-full"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {subscription?.plan === 'basic' ? 'Fazer Upgrade' : 'Assinar Plano Profissional'}
                </Button>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlansModal(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AIChatbot />
    </div>
  );
};

export default Index;
