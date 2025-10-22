-- Fix 1: Add DENY policies to user_roles table to prevent privilege escalation
CREATE POLICY "Only system can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (false);

CREATE POLICY "Only system can update roles"
ON public.user_roles FOR UPDATE
USING (false);

CREATE POLICY "Only system can delete roles"
ON public.user_roles FOR DELETE
USING (false);

-- Fix 2: Add DENY policies to subscriptions table to prevent tampering
CREATE POLICY "Only system can insert subscriptions"
ON public.subscriptions FOR INSERT
WITH CHECK (false);

CREATE POLICY "Only system can update subscriptions"
ON public.subscriptions FOR UPDATE
USING (false);

CREATE POLICY "Only system can delete subscriptions"
ON public.subscriptions FOR DELETE
USING (false);

-- Fix 3: Create function to validate active subscription with expiration check
CREATE OR REPLACE FUNCTION public.has_valid_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.subscriptions 
    WHERE user_id = _user_id 
    AND status = 'active'
    AND current_period_end > now()
  )
$$;

-- Update genograms RLS policies to enforce subscription validation
DROP POLICY IF EXISTS "Users can view own genograms" ON public.genograms;
DROP POLICY IF EXISTS "Users can insert own genograms" ON public.genograms;
DROP POLICY IF EXISTS "Users can update own genograms" ON public.genograms;
DROP POLICY IF EXISTS "Users can delete own genograms" ON public.genograms;

CREATE POLICY "Users with valid subscription can view own genograms"
ON public.genograms FOR SELECT
USING (auth.uid() = user_id AND public.has_valid_subscription(auth.uid()));

CREATE POLICY "Users with valid subscription can insert own genograms"
ON public.genograms FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.has_valid_subscription(auth.uid()));

CREATE POLICY "Users with valid subscription can update own genograms"
ON public.genograms FOR UPDATE
USING (auth.uid() = user_id AND public.has_valid_subscription(auth.uid()));

CREATE POLICY "Users with valid subscription can delete own genograms"
ON public.genograms FOR DELETE
USING (auth.uid() = user_id AND public.has_valid_subscription(auth.uid()));

-- Update genogram_elements RLS policies to enforce subscription validation
DROP POLICY IF EXISTS "Users can view elements of own genograms" ON public.genogram_elements;
DROP POLICY IF EXISTS "Users can insert elements to own genograms" ON public.genogram_elements;
DROP POLICY IF EXISTS "Users can update elements of own genograms" ON public.genogram_elements;
DROP POLICY IF EXISTS "Users can delete elements of own genograms" ON public.genogram_elements;

CREATE POLICY "Users with valid subscription can view elements of own genograms"
ON public.genogram_elements FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.genograms
    WHERE genograms.id = genogram_elements.genogram_id 
    AND genograms.user_id = auth.uid()
    AND public.has_valid_subscription(auth.uid())
  )
);

CREATE POLICY "Users with valid subscription can insert elements to own genograms"
ON public.genogram_elements FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.genograms
    WHERE genograms.id = genogram_elements.genogram_id 
    AND genograms.user_id = auth.uid()
    AND public.has_valid_subscription(auth.uid())
  )
);

CREATE POLICY "Users with valid subscription can update elements of own genograms"
ON public.genogram_elements FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.genograms
    WHERE genograms.id = genogram_elements.genogram_id 
    AND genograms.user_id = auth.uid()
    AND public.has_valid_subscription(auth.uid())
  )
);

CREATE POLICY "Users with valid subscription can delete elements of own genograms"
ON public.genogram_elements FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.genograms
    WHERE genograms.id = genogram_elements.genogram_id 
    AND genograms.user_id = auth.uid()
    AND public.has_valid_subscription(auth.uid())
  )
);