import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Plus, Clock, CheckCircle, XCircle } from 'lucide-react';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
}

interface SupportTicketsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SupportTickets = ({ open, onOpenChange }: SupportTicketsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && user) {
      loadTickets();
    }
  }, [open, user]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets((data || []) as Ticket[]);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar tickets',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha o título e a descrição.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase
        .from('support_tickets')
        .insert({
          title: title.trim(),
          description: description.trim(),
          priority,
          user_id: user!.id,
        });

      if (error) throw error;

      toast({
        title: 'Ticket criado!',
        description: 'Seu ticket foi enviado com sucesso.',
      });

      setTitle('');
      setDescription('');
      setPriority('medium');
      setShowNewTicket(false);
      loadTickets();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar ticket',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: Ticket['status']) => {
    const statusConfig = {
      open: { label: 'Aberto', variant: 'default' as const, icon: Clock },
      in_progress: { label: 'Em Andamento', variant: 'secondary' as const, icon: Clock },
      resolved: { label: 'Resolvido', variant: 'default' as const, icon: CheckCircle },
      closed: { label: 'Fechado', variant: 'outline' as const, icon: XCircle },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: Ticket['priority']) => {
    const priorityConfig = {
      low: { label: 'Baixa', className: 'bg-blue-100 text-blue-800' },
      medium: { label: 'Média', className: 'bg-yellow-100 text-yellow-800' },
      high: { label: 'Alta', className: 'bg-orange-100 text-orange-800' },
      urgent: { label: 'Urgente', className: 'bg-red-100 text-red-800' },
    };

    const config = priorityConfig[priority];

    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            Suporte - Tickets
          </DialogTitle>
          <DialogDescription>
            Crie e acompanhe seus tickets de suporte
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {showNewTicket ? (
            <div className="space-y-4 p-4">
              <div className="space-y-2">
                <Label htmlFor="ticket-title">Título *</Label>
                <Input
                  id="ticket-title"
                  placeholder="Descreva brevemente o problema"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticket-description">Descrição *</Label>
                <Textarea
                  id="ticket-description"
                  placeholder="Descreva detalhadamente o problema ou solicitação"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={submitting}
                  className="min-h-[150px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticket-priority">Prioridade</Label>
                <Select value={priority} onValueChange={(value: any) => setPriority(value)} disabled={submitting}>
                  <SelectTrigger id="ticket-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
                  {submitting ? 'Enviando...' : 'Criar Ticket'}
                </Button>
                <Button variant="outline" onClick={() => setShowNewTicket(false)} disabled={submitting}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 p-4">
              <Button onClick={() => setShowNewTicket(true)} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Novo Ticket
              </Button>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando tickets...
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum ticket encontrado</p>
                  <p className="text-sm">Crie um ticket para solicitar suporte</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-lg">{ticket.title}</h3>
                        <div className="flex gap-2">
                          {getStatusBadge(ticket.status)}
                          {getPriorityBadge(ticket.priority)}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {ticket.description}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Criado em: {formatDate(ticket.created_at)}</span>
                        <span>Atualizado em: {formatDate(ticket.updated_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
