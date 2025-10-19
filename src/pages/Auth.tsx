import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Heart, Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
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
      const { error } = await signUp(email, password, fullName);
      if (!error) {
        setIsLogin(true);
        setPassword('');
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full grid md:grid-cols-2 gap-8 items-center">
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
  );
};

export default Auth;
