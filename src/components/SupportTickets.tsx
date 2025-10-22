import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
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
import { MessageSquare, Plus, Clock, CheckCircle, XCircle, Send, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
  user_id: string | null;
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
  const { isAdmin } = useUserRole(user?.id);
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [responses, setResponses] = useState<TicketResponse[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [submitting, setSubmitting] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [sendingResponse, setSendingResponse] = useState(false);

  useEffect(() => {
    if (open && user) {
      loadTickets();
    }
  }, [open, user]);

  useEffect(() => {
    if (selectedTicket) {
      loadResponses(selectedTicket.id);
    }
  }, [selectedTicket]);

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

  const loadResponses = async (ticketId: string) => {
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
      loadResponses(selectedTicket.id);
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

  const handleUpdateStatus = async (ticketId: string, newStatus: Ticket['status']) => {
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

      loadTickets();
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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            Suporte - Tickets
            {isAdmin && (
              <Badge variant="secondary" className="ml-2">
                <Shield className="w-3 h-3 mr-1" />
                Administrador
              </Badge>
            )}
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
                  <div className="flex gap-2 flex-wrap">
                    {getStatusBadge(selectedTicket.status)}
                    {getPriorityBadge(selectedTicket.priority)}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedTicket(null)}>
                  Voltar
                </Button>
              </div>

              {isAdmin && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Ações de Administrador</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Select
                        value={selectedTicket.status}
                        onValueChange={(value: any) => handleUpdateStatus(selectedTicket.id, value)}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Aberto</SelectItem>
                          <SelectItem value="in_progress">Em Andamento</SelectItem>
                          <SelectItem value="resolved">Resolvido</SelectItem>
                          <SelectItem value="closed">Fechado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Conversação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[300px] overflow-y-auto">
                  {responses.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma resposta ainda
                    </p>
                  ) : (
                    responses.map((response) => (
                      <div
                        key={response.id}
                        className={`p-3 rounded-lg ${
                          response.is_staff
                            ? 'bg-primary/10 border-l-4 border-primary'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {response.is_staff && (
                            <Badge variant="secondary" className="text-xs">
                              <Shield className="w-3 h-3 mr-1" />
                              Suporte
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDate(response.created_at)}
                          </span>
                        </div>
                        <p className="text-sm">{response.message}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label htmlFor="response-message">Sua resposta</Label>
                <Textarea
                  id="response-message"
                  placeholder="Digite sua resposta..."
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  disabled={sendingResponse}
                  className="min-h-[100px]"
                />
                <Button
                  onClick={handleSendResponse}
                  disabled={sendingResponse || !responseMessage.trim()}
                  className="w-full"
                >
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
                      onClick={() => setSelectedTicket(ticket)}
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
