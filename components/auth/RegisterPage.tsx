import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert } from '../ui/alert';
import { Package, Loader2, CheckCircle2 } from 'lucide-react';

interface RegisterPageProps {
  onNavigateToLogin: () => void;
}

export function RegisterPage({ onNavigateToLogin }: RegisterPageProps) {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validações
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const { error } = await signUp(email, password, name, companyName);
      
      if (error) {
        setError(error.message || 'Erro ao criar conta. Tente novamente.');
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-green-600 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Conta criada com sucesso!</CardTitle>
            <CardDescription className="text-center">
              Sua conta foi criada e você já pode começar a usar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <div className="space-y-2">
                  <p className="text-sm text-green-800">
                    ✅ Conta criada com sucesso
                  </p>
                  <p className="text-sm text-green-800">
                    ✅ Empresa configurada
                  </p>
                  <p className="text-sm text-green-800">
                    ✅ Trial de 7 dias ativado
                  </p>
                </div>
              </Alert>

              <Button
                onClick={onNavigateToLogin}
                className="w-full"
              >
                Ir para o sistema
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-green-600 rounded-xl flex items-center justify-center">
              <Package className="w-10 h-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Criar sua conta</CardTitle>
          <CardDescription className="text-center">
            Comece seu trial gratuito de 7 dias
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                {error}
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                type="text"
                placeholder="João Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">Nome da empresa</Label>
              <Input
                id="companyName"
                type="text"
                placeholder="Minha Empresa LTDA"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando conta...
                </>
              ) : (
                'Criar conta grátis'
              )}
            </Button>

            <div className="text-center text-sm text-gray-600">
              Já tem uma conta?{' '}
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="text-green-600 hover:text-green-700"
                disabled={loading}
              >
                Fazer login
              </button>
            </div>

            <p className="text-xs text-center text-gray-500">
              Ao criar uma conta, você concorda com nossos{' '}
              <a href="#" className="text-green-600 hover:text-green-700">
                Termos de Uso
              </a>{' '}
              e{' '}
              <a href="#" className="text-green-600 hover:text-green-700">
                Política de Privacidade
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}