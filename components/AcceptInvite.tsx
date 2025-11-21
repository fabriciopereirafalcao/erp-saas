import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle2, AlertCircle, Mail, Lock, User, Loader2 } from 'lucide-react';
import { acceptInvite } from '../utils/userManagement';

interface AcceptInviteProps {
  onSuccess?: () => void;
}

export function AcceptInvite({ onSuccess }: AcceptInviteProps) {
  const [token, setToken] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [inviteEmail, setInviteEmail] = useState<string | null>(null);

  // Ler token da URL ao montar o componente
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('token');
    
    if (inviteToken) {
      setToken(inviteToken);
    } else {
      setError('Token de convite não encontrado na URL');
    }
  }, []);

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!name.trim()) {
      setError('Por favor, preencha seu nome completo');
      return;
    }

    if (name.trim().length < 3) {
      setError('Nome deve ter pelo menos 3 caracteres');
      return;
    }

    if (!password) {
      setError('Por favor, crie uma senha');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (!token) {
      setError('Token de convite inválido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await acceptInvite(token, name.trim(), password);
      
      setSuccess(true);
      setInviteEmail(result.user.email);
      
      // Redirecionar após 3 segundos ou chamar callback
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          // Redirecionar para login
          window.location.href = '/';
        }
      }, 3000);

    } catch (error: any) {
      console.error('Erro ao aceitar convite:', error);
      setError(error.message || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Tela de sucesso
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            
            <h1 className="text-gray-900 mb-2">Conta criada com sucesso!</h1>
            <p className="text-gray-600 mb-6">
              Bem-vindo(a) ao sistema, {name}!
            </p>

            <Alert className="border-green-200 bg-green-50 mb-6">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Conta ativada:</strong> {inviteEmail}
                <br />
                Você será redirecionado para fazer login em instantes...
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Redirecionando...
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Tela de erro (token não encontrado)
  if (!token && error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            
            <h1 className="text-gray-900 mb-2">Link inválido</h1>
            <p className="text-gray-600 mb-6">
              {error}
            </p>

            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 text-sm">
                Verifique se você copiou o link completo do convite ou solicite um novo convite ao administrador.
              </AlertDescription>
            </Alert>
          </div>
        </Card>
      </div>
    );
  }

  // Formulário de aceite de convite
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-[#1e3a5f] rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          
          <h1 className="text-gray-900 mb-2">Aceitar Convite</h1>
          <p className="text-gray-600">
            Você foi convidado para fazer parte da equipe!
            <br />
            Complete seu cadastro abaixo.
          </p>
        </div>

        <form onSubmit={handleAcceptInvite} className="space-y-5">
          {/* Nome Completo */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Nome Completo <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="name"
                type="text"
                placeholder="João Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-10"
                disabled={loading}
                autoFocus
              />
            </div>
          </div>

          {/* Senha */}
          <div className="space-y-2">
            <Label htmlFor="password">
              Senha <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                disabled={loading}
              />
            </div>
            {password && password.length < 6 && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                A senha deve ter pelo menos 6 caracteres
              </p>
            )}
          </div>

          {/* Confirmar Senha */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              Confirmar Senha <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Digite a senha novamente"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10"
                disabled={loading}
              />
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                As senhas não coincidem
              </p>
            )}
          </div>

          {/* Mensagem de Erro */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 text-sm">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Informações */}
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Ao criar sua conta, você terá acesso imediato ao sistema com as permissões definidas pelo administrador.
            </AlertDescription>
          </Alert>

          {/* Botão de Submit */}
          <Button
            type="submit"
            className="w-full bg-[#20FBE1] hover:bg-[#1AC9B4] text-gray-900"
            disabled={loading || !name || !password || !confirmPassword || password !== confirmPassword}
          >
            {loading ? 'Criando conta...' : 'Criar minha conta'}
          </Button>

          {/* Link de ajuda */}
          <p className="text-center text-sm text-gray-500">
            Problemas com o convite?{' '}
            <a href="mailto:suporte@empresa.com" className="text-[#1e3a5f] hover:underline">
              Entre em contato
            </a>
          </p>
        </form>
      </Card>
    </div>
  );
}