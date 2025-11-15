import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Mail, Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { inviteUser } from '../utils/userManagement';
import { supabase } from '../utils/supabase/client';

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function InviteUserDialog({ open, onOpenChange, onSuccess }: InviteUserDialogProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'manager' | 'salesperson' | 'buyer' | 'financial' | 'viewer'>('viewer');
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const handleInvite = async () => {
    if (!email) {
      toast.error('Preencha o email do usuário');
      return;
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Email inválido');
      return;
    }

    if (!role) {
      toast.error('Selecione uma permissão');
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Você precisa estar logado');
        setLoading(false);
        return;
      }

      const invite = await inviteUser(session.access_token, email, role);
      
      setInviteLink(invite.invite_link);
      setEmailSent(invite.email_sent || false);
      
      if (invite.email_sent) {
        toast.success('Convite criado e email enviado!', {
          description: `Um email foi enviado para ${email} com o link de convite.`,
        });
      } else {
        toast.success('Convite criado com sucesso!', {
          description: 'Copie o link abaixo e envie para o usuário.',
        });
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Erro ao convidar usuário:', error);
      toast.error('Erro ao criar convite', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast.success('Link copiado!');
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole('viewer');
    setInviteLink(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Convidar Novo Usuário</DialogTitle>
          <DialogDescription>
            Envie um convite para adicionar um novo membro à sua equipe. O usuário receberá um link para criar sua conta.
          </DialogDescription>
        </DialogHeader>

        {!inviteLink ? (
          <>
            <div className="space-y-4 py-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email do usuário <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Permissão */}
              <div className="space-y-2">
                <Label htmlFor="role">
                  Nível de Permissão <span className="text-red-500">*</span>
                </Label>
                <Select value={role} onValueChange={(value: any) => setRole(value)} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Visualizador</span>
                        <span className="text-xs text-gray-500">Acesso somente leitura aos principais módulos</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="salesperson">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Vendedor</span>
                        <span className="text-xs text-gray-500">Acesso aos módulos de vendas, clientes e estoque</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="buyer">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Comprador</span>
                        <span className="text-xs text-gray-500">Acesso aos módulos de compras, fornecedores e estoque</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="financial">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Financeiro</span>
                        <span className="text-xs text-gray-500">Acesso aos módulos financeiros e relatórios</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="manager">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Gerente</span>
                        <span className="text-xs text-gray-500">Acesso a operações e relatórios, com poder de aprovação</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Administrador</span>
                        <span className="text-xs text-gray-500">Acesso completo a todos os módulos do sistema</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  O convite expira em 7 dias. Após criado, você poderá copiar o link e enviar manualmente.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancelar
              </Button>
              <Button 
                onClick={handleInvite} 
                disabled={loading}
                className="bg-[#20FBE1] hover:bg-[#1AC9B4] text-gray-900"
              >
                {loading ? 'Criando...' : 'Criar Convite'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4 py-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {emailSent ? (
                    <>
                      📧 <strong>Email enviado!</strong> Um convite foi enviado automaticamente para <strong>{email}</strong>.
                    </>
                  ) : (
                    <>
                      Convite criado com sucesso! Copie o link abaixo e envie para <strong>{email}</strong>.
                    </>
                  )}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Link de Convite</Label>
                <div className="flex gap-2">
                  <Input
                    value={inviteLink}
                    readOnly
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    onClick={copyToClipboard}
                    variant="outline"
                    size="icon"
                    title="Copiar link"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {!emailSent && (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 text-sm">
                    ⚠️ <strong>Email automático não configurado.</strong> Copie o link acima e envie manualmente para o usuário.
                  </AlertDescription>
                </Alert>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Próximos passos:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {emailSent ? (
                      <>
                        <li>O usuário receberá o email em alguns minutos</li>
                        <li>Ele criará nome e senha ao acessar o link</li>
                        <li>Após criar a conta, já entrará logado na empresa</li>
                      </>
                    ) : (
                      <>
                        <li>Copie o link acima</li>
                        <li>Envie por email, WhatsApp ou outro canal</li>
                        <li>O usuário criará nome e senha ao acessar o link</li>
                        <li>Após criar a conta, ele já entrará logado na empresa</li>
                      </>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="bg-[#20FBE1] hover:bg-[#1AC9B4] text-gray-900">
                Fechar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}