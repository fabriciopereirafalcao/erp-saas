import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, User, Shield, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
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
      </Tabs>
    </div>
  );
}