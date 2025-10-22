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
import { MessageSquare, Plus, Clock, CheckCircle, XCircle, Shield, Send } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface TicketResponse {
  id: string;
  ticket_id: string;
  user_id: string;
  is_staff: boolean;
  message: string;
  created_at: string;
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [responses, setResponses] = useState<TicketResponse[]>([]);
  const [responseMessage, setResponseMessage] = useState('');
  const [sendingResponse, setSendingResponse] = useState(false);

  useEffect(() => {
    if (open && user) {
      checkAdminStatus();
      loadTickets();
    }
  }, [open, user]);

  const checkAdminStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id)
        .eq('role', 'admin')
        .single();

      if (!error && data) {
        setIsAdmin(true);
      }
    } catch (error) {
      // Não é admin
      setIsAdmin(false);
    }
  };

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

  const loadTicketResponses = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('ticket_responses')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setResponses((data || []) as TicketResponse[]);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar respostas',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleTicketClick = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    await loadTicketResponses(ticket.id);
  };

  const handleSendResponse = async () => {
    if (!responseMessage.trim() || !selectedTicket) return;

    try {
      setSendingResponse(true);
      const { error } = await supabase
        .from('ticket_responses')
        .insert({
          ticket_id: selectedTicket.id,
          user_id: user!.id,
          is_staff: isAdmin,
          message: responseMessage.trim(),
        });

      if (error) throw error;

      toast({
        title: 'Resposta enviada!',
        description: 'Sua mensagem foi adicionada ao ticket.',
      });

      setResponseMessage('');
      await loadTicketResponses(selectedTicket.id);
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar resposta',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSendingResponse(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, newStatus: Ticket['status']) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: newStatus })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: 'Status atualizado!',
        description: 'O status do ticket foi alterado.',
      });

      await loadTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            Suporte - Tickets
            {isAdmin && <Badge variant="default" className="ml-2"><Shield className="w-3 h-3 mr-1" />Admin</Badge>}
          </DialogTitle>
          <DialogDescription>
            {isAdmin ? 'Gerencie todos os tickets de suporte' : 'Crie e acompanhe seus tickets de suporte'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {selectedTicket ? (
            <div className="space-y-4 p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-xl mb-2">{selectedTicket.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{selectedTicket.description}</p>
                  <div className="flex gap-2">
                    {getStatusBadge(selectedTicket.status)}
                    {getPriorityBadge(selectedTicket.priority)}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedTicket(null)}>
                    Voltar
                  </Button>
                  {isAdmin && (
                    <Select
                      value={selectedTicket.status}
                      onValueChange={(value: any) => handleUpdateTicketStatus(selectedTicket.id, value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Aberto</SelectItem>
                        <SelectItem value="in_progress">Em Andamento</SelectItem>
                        <SelectItem value="resolved">Resolvido</SelectItem>
                        <SelectItem value="closed">Fechado</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <ScrollArea className="h-96 border rounded-lg p-4">
                <div className="space-y-4">
                  {responses.map((response) => (
                    <div
                      key={response.id}
                      className={`p-3 rounded-lg ${
                        response.is_staff
                          ? 'bg-primary/10 border-l-4 border-primary'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant={response.is_staff ? 'default' : 'outline'}>
                          {response.is_staff ? 'Equipe de Suporte' : 'Usuário'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(response.created_at)}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{response.message}</p>
                    </div>
                  ))}
                  {responses.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma resposta ainda</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="space-y-2">
                <Label htmlFor="response-message">Adicionar resposta</Label>
                <Textarea
                  id="response-message"
                  placeholder={isAdmin ? 'Digite sua resposta como equipe de suporte...' : 'Digite sua mensagem...'}
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  disabled={sendingResponse}
                  className="min-h-[100px]"
                />
                <Button onClick={handleSendResponse} disabled={sendingResponse || !responseMessage.trim()} className="w-full">
                  <Send className="w-4 h-4 mr-2" />
                  {sendingResponse ? 'Enviando...' : 'Enviar Resposta'}
                </Button>
              </div>
            </div>
          ) : showNewTicket ? (
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
                      className="border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => handleTicketClick(ticket)}
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
