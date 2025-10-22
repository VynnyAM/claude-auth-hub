-- Criar enum para papéis de usuário
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Criar tabela de papéis de usuário
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Criar função security definer para verificar se usuário tem um papel
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Política RLS para user_roles - usuários podem ver seus próprios papéis
CREATE POLICY "Users can view own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Atualizar políticas RLS de support_tickets para permitir que admins vejam todos
DROP POLICY IF EXISTS "Users can view own tickets" ON public.support_tickets;
CREATE POLICY "Users can view own tickets or admins can view all" 
ON public.support_tickets 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Permitir que admins atualizem qualquer ticket (para mudança de status)
CREATE POLICY "Admins can update all tickets" 
ON public.support_tickets 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Atualizar políticas RLS de ticket_responses
DROP POLICY IF EXISTS "Users can view responses to own tickets" ON public.ticket_responses;
CREATE POLICY "Users can view responses to own tickets or admins can view all" 
ON public.ticket_responses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets 
    WHERE support_tickets.id = ticket_responses.ticket_id 
    AND support_tickets.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Permitir que admins criem respostas em qualquer ticket
CREATE POLICY "Admins can create responses to all tickets" 
ON public.ticket_responses 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Inserir papel de admin para o usuário especificado
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'vrollsing@yahoo.com.br'
ON CONFLICT (user_id, role) DO NOTHING;