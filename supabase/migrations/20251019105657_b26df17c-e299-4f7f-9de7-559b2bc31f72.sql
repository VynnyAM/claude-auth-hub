-- Update the handle_new_user function to include phone field
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    NEW.raw_user_meta_data->>'phone'
  );
  
  INSERT INTO public.subscriptions (user_id, status)
  VALUES (NEW.id, 'inactive');
  
  RETURN NEW;
END;
$function$;