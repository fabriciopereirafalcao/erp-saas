import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, User, Shield, Trash2, Lock, Check, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import { NavigationView } from '../App';

interface ProfileViewProps {
  onNavigate: (view: NavigationView) => void;
}

// Configuração de perfis e permissões
const ROLE_CONFIG = {
  owner: {
    label: 'Proprietário',
    description: 'Acesso total ao sistema com controle completo sobre todos os módulos e configurações.',
    color: 'bg-purple-600',
    permissions: {
      dashboard: true,
      sales: true,
      purchases: true,
      inventory: true,
      customers: true,
      suppliers: true,
      financial: true,
      reports: true,
      settings: true,
      users: true,
      approvals: true,
    }
  },
  admin: {
    label: 'Administrador',
    description: 'Acesso completo ao sistema, exceto configurações críticas de empresa e planos.',
    color: 'bg-red-600',
    permissions: {
      dashboard: true,
      sales: true,
      purchases: true,
      inventory: true,
      customers: true,
      suppliers: true,
      financial: true,
      reports: true,
      settings: true,
      users: true,
      approvals: true,
    }
  },
  manager: {
    label: 'Gerente',
    description: 'Acesso às operações e relatórios com poder de aprovação de transações.',
    color: 'bg-blue-600',
    permissions: {
      dashboard: true,
      sales: true,
      purchases: true,
      inventory: true,
      customers: true,
      suppliers: true,
      financial: true,
      reports: true,
      settings: false,
      users: false,
      approvals: true,
    }
  },
  financial: {
    label: 'Financeiro',
    description: 'Acesso aos módulos financeiros, contas a pagar/receber e relatórios financeiros.',
    color: 'bg-green-600',
    permissions: {
      dashboard: true,
      sales: false,
      purchases: false,
      inventory: false,
      customers: false,
      suppliers: false,
      financial: true,
      reports: true,
      settings: false,
      users: false,
      approvals: false,
    }
  },
  salesperson: {
    label: 'Vendedor',
    description: 'Acesso a vendas, clientes e consulta de estoque.',
    color: 'bg-orange-600',
    permissions: {
      dashboard: true,
      sales: true,
      purchases: false,
      inventory: 'read-only',
      customers: true,
      suppliers: false,
      financial: false,
      reports: false,
      settings: false,
      users: false,
      approvals: false,
    }
  },
  buyer: {
    label: 'Comprador',
    description: 'Acesso a compras, fornecedores e gerenciamento de estoque.',
    color: 'bg-indigo-600',
    permissions: {
      dashboard: true,
      sales: false,
      purchases: true,
      inventory: true,
      customers: false,
      suppliers: true,
      financial: false,
      reports: false,
      settings: false,
      users: false,
      approvals: false,
    }
  },
  viewer: {
    label: 'Visualizador',
    description: 'Acesso somente leitura a todos os módulos, sem permissão para criar ou editar.',
    color: 'bg-gray-600',
    permissions: {
      dashboard: 'read-only',
      sales: 'read-only',
      purchases: 'read-only',
      inventory: 'read-only',
      customers: 'read-only',
      suppliers: 'read-only',
      financial: 'read-only',
      reports: 'read-only',
      settings: false,
      users: false,
      approvals: false,
    }
  },
};

export function ProfileView({ onNavigate }: ProfileViewProps) {
  const { profile } = useAuth();
  
  // Dividir nome completo em primeiro e último nome
  const nameParts = profile?.name?.split(' ') || [''];
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Estados para os campos do formulário
  const [formData, setFormData] = useState({
    email: profile?.email || '',
    firstName: firstName,
    lastName: lastName,
    nickname: '',
    birthDate: '',
    gender: '',
    phoneAreaCode: '',
    phoneNumber: '',
    mobileAreaCode: '',
    mobileNumber: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // TODO: Implementar salvamento dos dados
    console.log('Dados a salvar:', formData);
  };

  const handleDeleteAccount = () => {
    // TODO: Implementar exclusão de conta
    console.log('Excluir conta');
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-[#1e3a5f] text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            onClick={() => onNavigate('dashboard')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl">Meu Perfil</h1>
        </div>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir conta
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso excluirá permanentemente sua conta
                e removerá seus dados de nossos servidores.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                className="bg-red-600 hover:bg-red-700"
              >
                Excluir conta
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="data" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b bg-white px-6">
          <TabsTrigger value="data" className="gap-2">
            <User className="w-4 h-4" />
            Meus Dados
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="w-4 h-4" />
            Segurança
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2">
            <Lock className="w-4 h-4" />
            Permissões
          </TabsTrigger>
        </TabsList>

        {/* Aba Meus Dados */}
        <TabsContent value="data" className="flex-1 p-6">
          <div className="max-w-4xl mx-auto bg-white rounded-lg border p-6 space-y-6">
            {/* E-mail (readonly) */}
            <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
              <Label className="text-right text-gray-700">E-mail</Label>
              <div className="text-gray-700">{formData.email}</div>
            </div>

            {/* Nome Completo (2 campos) */}
            <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
              <Label className="text-right text-gray-700">Nome Completo</Label>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  placeholder="PRIMEIRO NOME"
                  className="uppercase"
                />
                <Input
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  placeholder="SOBRENOME"
                  className="uppercase"
                />
              </div>
            </div>

            {/* Apelido */}
            <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
              <Label className="text-right text-gray-700">Apelido</Label>
              <Input
                value={formData.nickname}
                onChange={(e) => handleInputChange('nickname', e.target.value)}
                placeholder="APELIDO"
                className="uppercase"
              />
            </div>

            {/* Data de Nascimento */}
            <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
              <Label className="text-right text-gray-700">Data de Nascimento</Label>
              <Input
                type="date"
                value={formData.birthDate}
                onChange={(e) => handleInputChange('birthDate', e.target.value)}
              />
            </div>

            {/* Gênero */}
            <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
              <Label className="text-right text-gray-700">Gênero</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => handleInputChange('gender', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Masculino</SelectItem>
                  <SelectItem value="female">Feminino</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                  <SelectItem value="prefer-not-say">Prefiro não informar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Telefone Fixo */}
            <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
              <Label className="text-right text-gray-700">Telefone Fixo</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.phoneAreaCode}
                  onChange={(e) => handleInputChange('phoneAreaCode', e.target.value)}
                  placeholder="DDD"
                  maxLength={2}
                  className="w-20"
                />
                <Input
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  placeholder="Número"
                  className="flex-1"
                />
              </div>
            </div>

            {/* Celular */}
            <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
              <Label className="text-right text-gray-700">Celular</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.mobileAreaCode}
                  onChange={(e) => handleInputChange('mobileAreaCode', e.target.value)}
                  placeholder="DDD"
                  maxLength={2}
                  className="w-20"
                />
                <Input
                  value={formData.mobileNumber}
                  onChange={(e) => handleInputChange('mobileNumber', e.target.value)}
                  placeholder="Número"
                  className="flex-1"
                />
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => onNavigate('dashboard')}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                className="bg-[#20FBE1] hover:bg-[#1AC9B4] text-gray-900"
              >
                Salvar alterações
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Aba Segurança */}
        <TabsContent value="security" className="flex-1 p-6">
          <div className="max-w-4xl mx-auto bg-white rounded-lg border p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Alterar Senha</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
                    <Label className="text-right text-gray-700">Senha Atual</Label>
                    <Input type="password" placeholder="Digite sua senha atual" />
                  </div>
                  <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
                    <Label className="text-right text-gray-700">Nova Senha</Label>
                    <Input type="password" placeholder="Digite sua nova senha" />
                  </div>
                  <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
                    <Label className="text-right text-gray-700">Confirmar Senha</Label>
                    <Input type="password" placeholder="Confirme sua nova senha" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline">Cancelar</Button>
                <Button className="bg-[#20FBE1] hover:bg-[#1AC9B4] text-gray-900">
                  Atualizar senha
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Aba Permissões */}
        <TabsContent value="permissions" className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Card do Perfil */}
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${ROLE_CONFIG[profile?.role as keyof typeof ROLE_CONFIG]?.color || 'bg-gray-600'}`}>
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg">Perfil de Acesso</h3>
                    <Badge className={`${ROLE_CONFIG[profile?.role as keyof typeof ROLE_CONFIG]?.color || 'bg-gray-600'} text-white`}>
                      {ROLE_CONFIG[profile?.role as keyof typeof ROLE_CONFIG]?.label || 'Desconhecido'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    {ROLE_CONFIG[profile?.role as keyof typeof ROLE_CONFIG]?.description || 'Perfil não encontrado.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Matriz de Permissões */}
            <div className="bg-white rounded-lg border">
              <div className="p-6 border-b">
                <h3 className="text-lg">Suas Permissões</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Veja abaixo o que você pode fazer no sistema
                </p>
              </div>
              
              <div className="divide-y">
                {/* Dashboard */}
                <div className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="text-gray-700">Dashboard</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {ROLE_CONFIG[profile?.role as keyof typeof ROLE_CONFIG]?.permissions.dashboard === true && (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-600">Acesso Total</span>
                      </>
                    )}
                    {ROLE_CONFIG[profile?.role as keyof typeof ROLE_CONFIG]?.permissions.dashboard === 'read-only' && (
                      <>
                        <Check className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-blue-600">Somente Leitura</span>
                      </>
                    )}
                    {ROLE_CONFIG[profile?.role as keyof typeof ROLE_CONFIG]?.permissions.dashboard === false && (
                      <>
                        <X className="w-4 h-4 text-red-600" />
                        <span className="text-sm text-red-600">Sem Acesso</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Vendas */}
                <div className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="text-gray-700">Vendas e Pedidos</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {ROLE_CONFIG[profile?.role as keyof typeof ROLE_CONFIG]?.permissions.sales === true && (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-600">Acesso Total</span>
                      </>
                    )}
                    {ROLE_CONFIG[profile?.role as keyof typeof ROLE_CONFIG]?.permissions.sales === 'read-only' && (
                      <>
                        <Check className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-blue-600">Somente Leitura</span>
                      </>
                    )}
                    {ROLE_CONFIG[profile?.role as keyof typeof ROLE_CONFIG]?.permissions.sales === false && (
                      <>
                        <X className="w-4 h-4 text-red-600" />
                        <span className="text-sm text-red-600">Sem Acesso</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Compras */}
                <div className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="text-gray-700">Compras e Pedidos</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {ROLE_CONFIG[profile?.role as keyof typeof ROLE_CONFIG]?.permissions.purchases === true && (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-600">Acesso Total</span>
                      </>
                    )}
                    {ROLE_CONFIG[profile?.role as keyof typeof ROLE_CONFIG]?.permissions.purchases === 'read-only' && (
                      <>
                        <Check className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-blue-600">Somente Leitura</span>
                      </>
                    )}
                    {ROLE_CONFIG[profile?.role as keyof typeof ROLE_CONFIG]?.permissions.purchases === false && (
                      <>
                        <X className="w-4 h-4 text-red-600" />
                        <span className="text-sm text-red-600">Sem Acesso</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Estoque */}
                <div className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="text-gray-700">Estoque e Inventário</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {ROLE_CONFIG[profile?.role as keyof typeof ROLE_CONFIG]?.permissions.inventory === true && (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-600">Acesso Total</span>
                      </>
                    )}
                    {ROLE_CONFIG[profile?.role as keyof typeof ROLE_CONFIG]?.permissions.inventory === 'read-only' && (
                      <>
                        <Check className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-blue-600">Somente Leitura</span>
                      </>
                    )}
                    {ROLE_CONFIG[profile?.role as keyof typeof ROLE_CONFIG]?.permissions.inventory === false && (
                      <>
                        <X className="w-4 h-4 text-red-600" />
                        <span className="text-sm text-red-600">Sem Acesso</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Clientes */}
                <div className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="text-gray-700">Clientes</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {ROLE_CONFIG[profile?.role as keyof typeof ROLE_CONFIG]?.permissions.customers === true && (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-600">Acesso Total</span>
                      </>
                    )}
                    {ROLE_CONFIG[profile?.role as keyof typeof ROLE_CONFIG]?.permissions.customers === 'read-only' && (
                      <>
                        <Check className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-blue-600">Somente Leitura</span>
                      </>
                    )}
                    {ROLE_CONFIG[profile?.role as keyof typeof ROLE_CONFIG]?.permissions.customers === false && (
                      <>
                        <X className="w-4 h-4 text-red-600" />
                        <span className="text-sm text-red-600">Sem Acesso</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Fornecedores */}
                <div className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="text-gray-700">Fornecedores</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {ROLE_CONFIG[profile?.role as keyof typeof ROLE_CONFIG]?.permissions.suppliers === true && (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-600">Acesso Total</span>
                      </>
                    )}
                    {ROLE_CONFIG[profile?.role as keyof typeof ROLE_CONFIG]?.permissions.suppliers === 'read-only' && (
                      <>
                        <Check className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-blue-600">Somente Leitura</span>
                      </>
                    )}
                    {ROLE_CONFIG[profile?.role as keyof typeof ROLE_CONFIG]?.permissions.suppliers === false && (
                      <>
                        <X className="w-4 h-4 text-red-600" />
                        <span className="text-sm text-red-600">Sem Acesso</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Financeiro */}
                <div className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="text-gray-700">Módulos Financeiros</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {ROLE_CONFIG[profile?.role as keyof typeof ROLE_CONFIG]?.permissions.financial === true && (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-600">Acesso Total</span>
                      </>
                    )}
                    {ROLE_CONFIG[profile?.role as keyof typeof ROLE_CONFIG]?.permissions.financial === 'read-only' && (
                      <>
                        <Check className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-blue-600">Somente Leitura</span>
                      </>
                    )}
                    {ROLE_CONFIG[profile?.role as keyof typeof ROLE_CONFIG]?.permissions.financial === false && (
                      <>
                        <X className="w-4 h-4 text-red-600" />
                        <span className="text-sm text-red-600">Sem Acesso</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Relatórios */}
                <div className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="text-gray-700">Relatórios</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {ROLE_CONFIG[profile?.role as keyof typeof ROLE_CONFIG]?.permissions.reports === true && (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-600">Acesso Total</span>
                      </>
                    )}
                    {ROLE_CONFIG[profile?.role as keyof typeof ROLE_CONFIG]?.permissions.reports === 'read-only' && (
                      <>
                        <Check className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-blue-600">Somente Leitura</span>
                      </>
                    )}
                    {ROLE_CONFIG[profile?.role as keyof typeof ROLE_CONFIG]?.permissions.reports === false && (
                      <>
                        <X className="w-4 h-4 text-red-600" />
                        <span className="text-sm text-red-600">Sem Acesso</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Configurações */}
                <div className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="text-gray-700">Configurações do Sistema</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {ROLE_CONFIG[profile?.role as keyof typeof ROLE_CONFIG]?.permissions.settings === true && (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-600">Acesso Total</span>
                      </>
                    )}
                    {ROLE_CONFIG[profile?.role as keyof typeof ROLE_CONFIG]?.permissions.settings === false && (
                      <>
                        <X className="w-4 h-4 text-red-600" />
                        <span className="text-sm text-red-600">Sem Acesso</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Usuários e Permissões */}
                <div className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="text-gray-700">Usuários e Permissões</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {ROLE_CONFIG[profile?.role as keyof typeof ROLE_CONFIG]?.permissions.users === true && (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-600">Acesso Total</span>
                      </>
                    )}
                    {ROLE_CONFIG[profile?.role as keyof typeof ROLE_CONFIG]?.permissions.users === false && (
                      <>
                        <X className="w-4 h-4 text-red-600" />
                        <span className="text-sm text-red-600">Sem Acesso</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Aprovações */}
                <div className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="text-gray-700">Aprovação de Transações</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {ROLE_CONFIG[profile?.role as keyof typeof ROLE_CONFIG]?.permissions.approvals === true && (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-600">Pode Aprovar</span>
                      </>
                    )}
                    {ROLE_CONFIG[profile?.role as keyof typeof ROLE_CONFIG]?.permissions.approvals === false && (
                      <>
                        <X className="w-4 h-4 text-red-600" />
                        <span className="text-sm text-red-600">Sem Permissão</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Legenda */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="mb-2">
                    <strong>Importante:</strong> As permissões acima definem o que você pode fazer no sistema.
                  </p>
                  <p>
                    Se você precisa de acesso a módulos adicionais, entre em contato com o administrador da sua empresa.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}