-- Atualizar a função para dar 3 dias de teste no plano básico
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    NEW.raw_user_meta_data->>'phone'
  );
  
  -- Criar subscription com 3 dias de teste no plano básico
  INSERT INTO public.subscriptions (user_id, status, plan, current_period_end)
  VALUES (
    NEW.id, 
    'active', 
    'basic',
    NOW() + INTERVAL '3 days'
  );
  
  RETURN NEW;
END;
$$;