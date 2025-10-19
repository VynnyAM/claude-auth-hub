import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Download, Trash2, Users, Save, FolderOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
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

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
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
      if (e.shiftKey) {
        toggleSelection(clicked.id);
      } else {
        setIsDragging(true);
        setDragOffset({ x: x - clicked.x, y: y - clicked.y });
        setSelectedElement(clicked.id);
      }
    } else {
      setSelectedElement(null);
      setElements(elements.map(el => ({ ...el, selected: false })));
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging && selectedElement) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      updateElement(selectedElement, { x: x - dragOffset.x, y: y - dragOffset.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
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
      if (from && to) {
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        
        if (rel.relationType === 'marriage') {
          ctx.strokeStyle = '#4ade80';
          ctx.lineWidth = 3;
        } else if (rel.relationType === 'divorce') {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
        } else if (rel.relationType === 'conflict') {
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          ctx.setLineDash([10, 5]);
        } else if (rel.relationType === 'close') {
          ctx.strokeStyle = '#8b5cf6';
          ctx.lineWidth = 4;
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

      if (element.type === 'male') {
        ctx.fillRect(element.x - 25, element.y - 25, 50, 50);
        ctx.strokeRect(element.x - 25, element.y - 25, 50, 50);
      } else if (element.type === 'female') {
        ctx.beginPath();
        ctx.arc(element.x, element.y, 25, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      } else if (element.type === 'pregnancy') {
        ctx.beginPath();
        ctx.moveTo(element.x, element.y - 25);
        ctx.lineTo(element.x + 25, element.y + 25);
        ctx.lineTo(element.x - 25, element.y + 25);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

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
  }, [elements, selectedElement]);

  const exportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'genograma-familiar.png';
    link.href = url;
    link.click();
  };


  const handleSave = async () => {
    await saveGenogram(genogramTitle);
    setShowSaveModal(false);
  };

  const handleLoad = async (genogramId: string) => {
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
          <Button onClick={handleLogout} variant="ghost" size="sm">
            <LogOut className="w-5 h-5 mr-2" />
            Sair
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <div className="flex gap-4">
          <div className="w-64 space-y-4 flex-shrink-0">
            <div className="bg-card rounded-xl shadow-md p-4">
              <h3 className="font-medium text-foreground mb-3">Gerenciar</h3>
              <div className="space-y-2">
                <Button
                  onClick={createNewGenogram}
                  className="w-full"
                  variant="outline"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Genograma
                </Button>
                <Button
                  onClick={() => setShowSaveModal(true)}
                  className="w-full"
                  variant="outline"
                  size="sm"
                  disabled={genogramLoading}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </Button>
                <Button
                  onClick={() => setShowLoadModal(true)}
                  className="w-full"
                  variant="outline"
                  size="sm"
                >
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Carregar
                </Button>
              </div>
            </div>

            <div className="bg-card rounded-xl shadow-md p-4">
              <h3 className="font-medium text-foreground mb-3">Adicionar Pessoa</h3>
              <div className="space-y-2">
                <Button
                  onClick={() => addElement('male')}
                  className="w-full bg-primary/10 hover:bg-primary/20 border-primary/30 text-primary"
                  variant="outline"
                  size="sm"
                >
                  ⬜ Masculino
                </Button>
                <Button
                  onClick={() => addElement('female')}
                  className="w-full bg-primary/10 hover:bg-primary/20 border-primary/30 text-primary"
                  variant="outline"
                  size="sm"
                >
                  ⚪ Feminino
                </Button>
                <Button
                  onClick={() => addElement('pregnancy')}
                  className="w-full bg-primary/10 hover:bg-primary/20 border-primary/30 text-primary"
                  variant="outline"
                  size="sm"
                >
                  🔺 Gravidez
                </Button>
              </div>
            </div>

            <div className="bg-card rounded-xl shadow-md p-4">
              <h3 className="font-medium text-foreground mb-3">Relações</h3>
              <p className="text-xs text-muted-foreground mb-2">Shift + clique em 2 pessoas</p>
              <div className="space-y-2">
                <Button
                  onClick={() => addRelation('marriage')}
                  className="w-full bg-accent/10 hover:bg-accent/20 border-accent/30 text-accent"
                  variant="outline"
                  size="sm"
                >
                  Casamento
                </Button>
                <Button
                  onClick={() => addRelation('divorce')}
                  className="w-full bg-accent/10 hover:bg-accent/20 border-accent/30 text-accent"
                  variant="outline"
                  size="sm"
                >
                  Divórcio
                </Button>
                <Button
                  onClick={() => addRelation('conflict')}
                  className="w-full bg-accent/10 hover:bg-accent/20 border-accent/30 text-accent"
                  variant="outline"
                  size="sm"
                >
                  Conflito
                </Button>
                <Button
                  onClick={() => addRelation('close')}
                  className="w-full bg-accent/10 hover:bg-accent/20 border-accent/30 text-accent"
                  variant="outline"
                  size="sm"
                >
                  Relação Próxima
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
                >
                  <Download className="w-4 h-4 mr-2" />
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
    </div>
  );
};

export default Index;
