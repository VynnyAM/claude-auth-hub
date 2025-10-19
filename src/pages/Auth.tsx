import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Heart, Lock, Mail, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'standard' | 'premium'>('basic');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (!error) {
        navigate('/');
      }
    } else {
      const { error } = await signUp(email, password, fullName, selectedPlan);
      if (!error) {
        setIsLogin(true);
        setPassword('');
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-green-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Planos de Mensalidade */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-light text-slate-800">
            Escolha seu Plano
          </h2>
          <p className="text-lg text-slate-600">
            Ferramentas profissionais para psicólogos e terapeutas
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Plano Básico */}
          <div className="bg-card rounded-2xl shadow-lg p-6 border-2 border-border hover:border-primary/50 transition-all">
            <div className="text-center mb-4">
              <h3 className="text-2xl font-semibold text-foreground mb-2">Básico</h3>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold text-primary">R$ 40</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Criar genogramas ilimitados</span>
              </li>
              <li className="flex items-start gap-2">
                <X className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">Salvar e carregar genogramas</span>
              </li>
              <li className="flex items-start gap-2">
                <X className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">Baixar imagens</span>
              </li>
            </ul>
            <p className="text-xs text-center text-muted-foreground">
              Ideal para começar a criar genogramas profissionais
            </p>
          </div>

          {/* Plano Padrão - Destacado */}
          <div className="bg-primary/5 rounded-2xl shadow-xl p-6 border-2 border-primary relative transform md:scale-105">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-semibold">
                MAIS POPULAR
              </span>
            </div>
            <div className="text-center mb-4 mt-2">
              <h3 className="text-2xl font-semibold text-foreground mb-2">Padrão</h3>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold text-primary">R$ 50</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm font-medium">Criar genogramas ilimitados</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm font-medium">Salvar e carregar genogramas</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm font-medium">Baixar imagens em alta qualidade</span>
              </li>
            </ul>
            <p className="text-xs text-center text-foreground font-medium">
              Perfeito para profissionais que precisam salvar seus trabalhos
            </p>
          </div>

          {/* Plano Premium */}
          <div className="bg-card rounded-2xl shadow-lg p-6 border-2 border-border hover:border-primary/50 transition-all">
            <div className="text-center mb-4">
              <h3 className="text-2xl font-semibold text-foreground mb-2">Premium</h3>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-2xl font-bold text-muted-foreground">Em breve</span>
              </div>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Todos os recursos do Padrão</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Recursos exclusivos em desenvolvimento</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Suporte prioritário</span>
              </li>
            </ul>
            <p className="text-xs text-center text-muted-foreground">
              Recursos avançados para máxima produtividade
            </p>
          </div>
        </div>

        {/* Formulário de Login/Cadastro */}
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-center">
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
        </div>

        <div className="bg-card rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-light text-foreground mb-6 text-center">
            {isLogin ? 'Acesso Profissional' : 'Criar Conta'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <Label htmlFor="fullName">Nome Completo</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Dr. João Silva"
                    required={!isLogin}
                  />
                </div>
                
                <div className="space-y-3">
                  <Label>Escolha seu Plano</Label>
                  
                  <div 
                    onClick={() => setSelectedPlan('basic')}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedPlan === 'basic' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg">Básico</h3>
                      <span className="text-2xl font-bold text-primary">R$ 40</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">/mês</p>
                    <ul className="space-y-1 text-sm">
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                        Criar genogramas ilimitados
                      </li>
                      <li className="flex items-center gap-2 text-muted-foreground line-through">
                        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full"></span>
                        Salvar e carregar genogramas
                      </li>
                      <li className="flex items-center gap-2 text-muted-foreground line-through">
                        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full"></span>
                        Baixar imagens
                      </li>
                    </ul>
                  </div>

                  <div 
                    onClick={() => setSelectedPlan('standard')}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedPlan === 'standard' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg">Padrão</h3>
                      <span className="text-2xl font-bold text-primary">R$ 50</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">/mês</p>
                    <ul className="space-y-1 text-sm">
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                        Criar genogramas ilimitados
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                        Salvar e carregar genogramas
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                        Baixar imagens em alta qualidade
                      </li>
                    </ul>
                  </div>

                  <div 
                    onClick={() => setSelectedPlan('premium')}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedPlan === 'premium' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg">Premium</h3>
                      <span className="text-2xl font-bold text-primary">Em breve</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">Recursos exclusivos</p>
                    <ul className="space-y-1 text-sm">
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                        Todos os recursos do Padrão
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                        Recursos exclusivos em desenvolvimento
                      </li>
                    </ul>
                  </div>
                </div>
              </>
            )}
            
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>
            
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Processando...' : (isLogin ? 'Entrar' : 'Criar Conta')}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
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
    </div>
  );
};

export default Auth;
