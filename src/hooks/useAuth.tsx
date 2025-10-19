import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.functions.invoke('check-subscription');
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
      }
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Check subscription on auth state change
        if (session) {
          setTimeout(() => {
            checkSubscription();
          }, 0);
        } else {
          // Force redirect to login when signed out (robust for published domain)
          setTimeout(() => {
            if (window.location.pathname !== '/auth') {
              window.location.assign('/auth');
            }
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Initial subscription check
      if (session) {
        setTimeout(() => {
          checkSubscription();
        }, 0);
      } else {
        setTimeout(() => {
          if (window.location.pathname !== '/auth') {
            window.location.assign('/auth');
          }
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, plan: 'basic' | 'standard' | 'premium' = 'basic') => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          }
        }
      });

      if (error) throw error;

      // Update subscription plan after user is created
      if (data.user) {
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({ plan })
          .eq('user_id', data.user.id);

        if (updateError) {
          console.error('Error updating subscription plan:', updateError);
        }
      }

      toast({
        title: "Conta criada com sucesso!",
        description: "Você já pode fazer login.",
      });
      
      return { error: null };
    } catch (error: any) {
      toast({
        title: "Erro ao criar conta",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Login realizado!",
        description: "Bem-vindo de volta.",
      });
      
      return { error: null };
    } catch (error: any) {
      toast({
        title: "Erro ao fazer login",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error && !String((error as any).message || error).toLowerCase().includes('auth session missing')) {
        throw error;
      }

      // Limpa estados locais imediatamente para evitar flicker
      setSession(null);
      setUser(null);

      toast({
        title: "Logout realizado",
        description: "Até logo!",
      });

      // Redireciona de forma confiável para a página de login (hard redirect)
      window.location.assign('/auth');
      return;
    } catch (error: any) {
      const msg = String(error?.message || error || "");
      // Trate "Auth session missing" como sucesso idempotente
      if (msg.toLowerCase().includes('auth session missing')) {
        setSession(null);
        setUser(null);
        toast({ title: "Logout realizado", description: "Até logo!" });
        window.location.assign('/auth');
        return;
      }
      toast({
        title: "Erro ao fazer logout",
        description: msg,
        variant: "destructive",
      });
    }
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };
};
