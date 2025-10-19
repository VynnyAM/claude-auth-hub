-- Atualizar subscription para plano padrão de teste
UPDATE subscriptions
SET 
  status = 'active',
  plan = 'standard',
  stripe_customer_id = 'cus_TGPQJJ4iCEPC23',
  current_period_end = NOW() + INTERVAL '30 days',
  updated_at = NOW()
WHERE user_id = 'd3f00a79-c65f-4534-9e9c-b2d81765b44a';