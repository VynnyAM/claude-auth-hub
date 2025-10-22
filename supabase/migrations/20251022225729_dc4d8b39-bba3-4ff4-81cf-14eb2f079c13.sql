-- Criar tabela de tickets de suporte
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de respostas aos tickets
CREATE TABLE public.ticket_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_staff BOOLEAN NOT NULL DEFAULT false,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS nas tabelas
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_responses ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para support_tickets
CREATE POLICY "Users can view own tickets" 
ON public.support_tickets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tickets" 
ON public.support_tickets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tickets" 
ON public.support_tickets 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Políticas RLS para ticket_responses
CREATE POLICY "Users can view responses to own tickets" 
ON public.ticket_responses 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.support_tickets 
  WHERE support_tickets.id = ticket_responses.ticket_id 
  AND support_tickets.user_id = auth.uid()
));

CREATE POLICY "Users can create responses to own tickets" 
ON public.ticket_responses 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.support_tickets 
  WHERE support_tickets.id = ticket_responses.ticket_id 
  AND support_tickets.user_id = auth.uid()
));

-- Criar índices para melhor desempenho
CREATE INDEX idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_ticket_responses_ticket_id ON public.ticket_responses(ticket_id);

-- Criar função para atualizar timestamp
CREATE OR REPLACE FUNCTION public.update_ticket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar timestamp automaticamente
CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_ticket_updated_at();