-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create subscriptions table to track Stripe subscription status
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'inactive',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Subscriptions policies
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Create genograms table to save user projects
CREATE TABLE public.genograms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Novo Genograma',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.genograms ENABLE ROW LEVEL SECURITY;

-- Genograms policies
CREATE POLICY "Users can view own genograms"
  ON public.genograms FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own genograms"
  ON public.genograms FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own genograms"
  ON public.genograms FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own genograms"
  ON public.genograms FOR DELETE
  USING (auth.uid() = user_id);

-- Create genogram_elements table to save elements of each genogram
CREATE TABLE public.genogram_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  genogram_id UUID NOT NULL REFERENCES public.genograms(id) ON DELETE CASCADE,
  element_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.genogram_elements ENABLE ROW LEVEL SECURITY;

-- Elements policies (access through genogram ownership)
CREATE POLICY "Users can view elements of own genograms"
  ON public.genogram_elements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.genograms
      WHERE genograms.id = genogram_elements.genogram_id
      AND genograms.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert elements to own genograms"
  ON public.genogram_elements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.genograms
      WHERE genograms.id = genogram_elements.genogram_id
      AND genograms.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update elements of own genograms"
  ON public.genogram_elements FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.genograms
      WHERE genograms.id = genogram_elements.genogram_id
      AND genograms.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete elements of own genograms"
  ON public.genogram_elements FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.genograms
      WHERE genograms.id = genogram_elements.genogram_id
      AND genograms.user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_genograms_updated_at
  BEFORE UPDATE ON public.genograms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_genogram_elements_updated_at
  BEFORE UPDATE ON public.genogram_elements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário')
  );
  
  INSERT INTO public.subscriptions (user_id, status)
  VALUES (NEW.id, 'inactive');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();