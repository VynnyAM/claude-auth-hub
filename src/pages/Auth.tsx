import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Heart, Lock, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    phone?: string;
  }>({});
  const [loadingContribution, setLoadingContribution] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { signIn, signUp, signInWithGoogle, user } = useAuth();

  const signupSchema = z.object({
    fullName: z.string().trim().min(1, "Nome completo é obrigatório"),
    email: z.string().trim().email("Email inválido"),
    password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
    phone: z.string().trim().min(1, "Telefone é obrigatório"),
  });

  const loginSchema = z.object({
    email: z.string().trim().email("Email inválido"),
    password: z.string().min(1, "Senha é obrigatória"),
  });

  useEffect(() => {
    if (user) {
      navigate('/');
    }
    
    // Check for donation status in URL
    const params = new URLSearchParams(window.location.search);
    const donationStatus = params.get('donation');
    
    if (donationStatus === 'success') {
      toast({
        title: "Obrigado pela sua contribuição! 💝",
        description: "Sua doação ajudará muito no desenvolvimento do projeto.",
      });
      // Remove the query parameter from URL
      window.history.replaceState({}, '', '/auth');
    } else if (donationStatus === 'canceled') {
      toast({
        title: "Doação cancelada",
        description: "Você pode contribuir quando quiser.",
        variant: "destructive",
      });
      // Remove the query parameter from URL
      window.history.replaceState({}, '', '/auth');
    }
  }, [user, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      if (isLogin) {
        const validation = loginSchema.safeParse({ email, password });
        if (!validation.success) {
          const fieldErrors: any = {};
          validation.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0]] = err.message;
            }
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }
        const { error } = await signIn(email, password);
        if (!error) {
          navigate('/');
        } else {
          toast({
            title: "Erro ao fazer login",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        const validation = signupSchema.safeParse({ fullName, email, password, phone });
        if (!validation.success) {
          const fieldErrors: any = {};
          validation.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0]] = err.message;
            }
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }
        const { error } = await signUp(email, password, fullName, phone, 'basic');
        if (!error) {
          toast({
            title: "Conta criada com sucesso!",
            description: "Você ganhou 3 dias de teste grátis do Plano Básico! Faça login para começar.",
          });
          setIsLogin(true);
          setPassword('');
        } else {
          toast({
            title: "Erro ao criar conta",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    await signInWithGoogle();
    setLoading(false);
  };

  const handleContribution = async () => {
    setLoadingContribution(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-donation', {
        body: { priceId: 'price_1SK9qJBOrcC2OeBVr9qHsUgs' }
      });
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: "Erro ao processar contribuição",
        description: error.message || "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    }
    setLoadingContribution(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-green-50 flex items-center justify-center py-8 px-4">
      <div className="max-w-6xl w-full mx-auto grid md:grid-cols-2 gap-8 items-center">
        <div className="text-center md:text-left space-y-6">
          <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
            <Users className="w-12 h-12 text-primary" />
            <Heart className="w-10 h-10 text-accent" />
          </div>
          <h1 className="text-4xl md:text-5xl font-light text-slate-800">
            Genograma Familiar
          </h1>
          <p className="text-xl text-slate-600 font-light">
            Ferramenta profissional para psicólogos e terapeutas de constelação familiar
          </p>
          <div className="space-y-3 text-slate-600">
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
              Crie genogramas interativos e profissionais
            </p>
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
              Salve e gerencie múltiplos genogramas
            </p>
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              Compartilhe com seus clientes facilmente
            </p>
          </div>
          
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-4 border-2 border-primary/20">
            <p className="text-primary font-medium text-center">
              🎁 Teste grátis de 3 dias do Plano Básico ao criar sua conta!
            </p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🚀</span>
              <div className="space-y-2">
                <p className="text-blue-900 font-medium">Sistema em Beta</p>
                <p className="text-sm text-blue-800 leading-relaxed">
                  Sua assinatura contribui diretamente para o avanço deste projeto! 
                  Você receberá feedbacks semanais sobre novos recursos implementados, 
                  correções realizadas e as próximas funcionalidades planejadas.
                </p>
                <p className="text-sm text-blue-800 leading-relaxed font-medium">
                  Não somos financiados por ninguém. Caso você queira contribuir com qualquer valor, será de grande ajuda.
                </p>
              </div>
            </div>
            <Button
              onClick={handleContribution}
              disabled={loadingContribution}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              size="sm"
            >
              {loadingContribution ? 'Processando...' : '💝 Contribuir com o Projeto'}
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-light text-foreground mb-6 text-center">
            {isLogin ? 'Acesso Profissional' : 'Criar Conta'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <Label htmlFor="fullName">Nome Completo *</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Dr. João Silva"
                    required={!isLogin}
                    className={errors.fullName ? "border-destructive" : ""}
                  />
                  {errors.fullName && (
                    <p className="text-sm text-destructive mt-1">{errors.fullName}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="phone">Telefone *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={`pl-10 ${errors.phone ? "border-destructive" : ""}`}
                      placeholder="(00) 00000-0000"
                      required={!isLogin}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-sm text-destructive mt-1">{errors.phone}</p>
                  )}
                </div>
              </>
            )}
            
            <div>
              <Label htmlFor="email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`pl-10 ${errors.email ? "border-destructive" : ""}`}
                  placeholder="seu@email.com"
                  required
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive mt-1">{errors.email}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="password">Senha *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`pl-10 ${errors.password ? "border-destructive" : ""}`}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              {errors.password && (
                <p className="text-sm text-destructive mt-1">{errors.password}</p>
              )}
            </div>
            
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Processando...' : (isLogin ? 'Entrar' : 'Criar Conta')}
            </Button>
          </form>
          
          <div className="mt-6 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Ou continue com</span>
              </div>
            </div>
            
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </Button>
          </div>
          
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-primary hover:underline"
            >
              {isLogin ? 'Não tem conta? Criar uma agora' : 'Já tem conta? Fazer login'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
