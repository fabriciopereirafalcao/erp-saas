import { useState, useEffect } from 'react';
import { Users, Plus, Pencil, Trash2, RefreshCw, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { projectId } from '../utils/supabase/info';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export function Salespeople() {
  const { accessToken } = useAuth();
  const [salespeopleFromDB, setSalespeopleFromDB] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<any | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [personToDelete, setPersonToDelete] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    commissionRate: 0,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ==================== CARREGAR VENDEDORES DO BACKEND ====================
  useEffect(() => {
    loadSalespeople();
  }, [accessToken]);

  const loadSalespeople = async () => {
    if (!accessToken) return;

    setIsLoading(true);
    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/salespeople`;
      console.log('🔵 [SALESPEOPLE] Carregando vendedores...', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      console.log('🔵 [SALESPEOPLE] Resposta recebida:', result);

      if (result.success) {
        setSalespeopleFromDB(result.data);
        console.log('✅ [SALESPEOPLE] Vendedores carregados:', result.data.length, result.data);
      } else {
        console.error('❌ [SALESPEOPLE] Erro ao carregar vendedores:', result.error);
        toast.error('Erro ao carregar vendedores');
      }
    } catch (error) {
      console.error('❌ [SALESPEOPLE] Erro ao carregar vendedores:', error);
      toast.error('Erro ao conectar com o servidor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (person?: any) => {
    if (person) {
      setEditingPerson(person);
      setFormData({
        name: person.name,
        email: person.email || '',
        phone: person.phone || '',
        commissionRate: person.commission_rate || 0,
      });
    } else {
      setEditingPerson(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        commissionRate: 0,
      });
    }
    setFormErrors({});
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPerson(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      commissionRate: 0,
    });
    setFormErrors({});
  };

  // ✅ VALIDAÇÃO NO FRONTEND (PROBLEMA 3)
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validar nome
    if (!formData.name || formData.name.trim() === '') {
      errors.name = 'Nome é obrigatório';
    }

    // Validar email
    if (!formData.email || formData.email.trim() === '') {
      errors.email = 'Email é obrigatório';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = 'Email inválido. Use o formato: email@exemplo.com';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ✅ VALIDAR ANTES DE ENVIAR (PROBLEMA 3)
    if (!validateForm()) {
      return;
    }

    try {
      if (editingPerson) {
        // ==================== ATUALIZAR ====================
        const url = `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/salespeople/${editingPerson.id}`;
        const response = await fetch(url, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        const result = await response.json();

        if (result.success) {
          toast.success(result.message);
          // Atualizar lista local
          setSalespeopleFromDB(prev =>
            prev.map(p => p.id === editingPerson.id ? result.data : p)
          );
          handleCloseDialog();
        } else {
          // Mostrar erro no formulário
          toast.error(result.error || 'Erro ao atualizar vendedor');
        }
      } else {
        // ==================== CRIAR ====================
        const url = `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/salespeople`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        const result = await response.json();

        if (result.success) {
          toast.success(result.message);
          // Adicionar à lista local
          setSalespeopleFromDB(prev => [...prev, result.data]);
          handleCloseDialog();
        } else {
          // Mostrar erro no formulário
          toast.error(result.error || 'Erro ao criar vendedor');
        }
      }
    } catch (error) {
      console.error('❌ Erro ao salvar vendedor:', error);
      toast.error('Erro ao conectar com o servidor');
    }
  };

  // ✅ MELHORAR UX DE DELETE (PROBLEMA 1)
  const handleDeleteClick = (person: any) => {
    setPersonToDelete(person);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!personToDelete) return;

    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/salespeople/${personToDelete.id}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        // Remover da lista local
        setSalespeopleFromDB(prev => prev.filter(p => p.id !== personToDelete.id));
      } else {
        toast.error(result.error || 'Erro ao remover vendedor');
      }
    } catch (error) {
      console.error('❌ Erro ao deletar vendedor:', error);
      toast.error('Erro ao conectar com o servidor');
    } finally {
      setDeleteDialogOpen(false);
      setPersonToDelete(null);
    }
  };

  // ✅ REATIVAR VENDEDOR (PROBLEMA 2)
  const handleReactivate = async (id: string) => {
    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/salespeople/${id}/reactivate`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Vendedor reativado com sucesso');
        loadSalespeople();
      } else {
        toast.error(result.error || 'Erro ao reativar vendedor');
      }
    } catch (error) {
      console.error('❌ Erro ao reativar vendedor:', error);
      toast.error('Erro ao conectar com o servidor');
    }
  };

  // ✅ FILTRAR VENDEDORES (PROBLEMA 2)
  const filteredSalespeople = showInactive
    ? salespeopleFromDB
    : salespeopleFromDB.filter(p => p.is_active !== false);

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-green-600" />
            <h1 className="text-gray-900">Vendedores</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* ✅ TOGGLE MOSTRAR INATIVOS (PROBLEMA 2) */}
            <Button
              variant={showInactive ? "default" : "outline"}
              onClick={() => setShowInactive(!showInactive)}
              className="gap-2"
            >
              {showInactive ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  Ocultar Inativos
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Mostrar Inativos
                </>
              )}
            </Button>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Vendedor
            </Button>
          </div>
        </div>
        <p className="text-gray-500">Cadastre e gerencie a equipe de vendas</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Comissão (%)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              /* ========== ESTADO DE LOADING ========== */
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="w-8 h-8 text-green-600 animate-spin" />
                    <p className="text-gray-600">Carregando vendedores...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredSalespeople.length === 0 ? (
              /* ========== ESTADO VAZIO ========== */
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  {showInactive ? 'Nenhum vendedor inativo' : 'Nenhum vendedor cadastrado'}
                </TableCell>
              </TableRow>
            ) : (
              /* ========== VENDEDORES CARREGADOS ========== */
              filteredSalespeople.map((person) => (
                <TableRow 
                  key={person.id}
                  className={person.is_active === false ? 'opacity-50 bg-gray-50' : ''}
                >
                  <TableCell className="font-mono text-sm">{person.code}</TableCell>
                  <TableCell className="font-medium">{person.name}</TableCell>
                  <TableCell className="text-gray-600">{person.email || '-'}</TableCell>
                  <TableCell className="text-gray-600">{person.phone || '-'}</TableCell>
                  <TableCell>{person.commission_rate ? `${person.commission_rate}%` : '-'}</TableCell>
                  <TableCell>
                    {person.is_active === false ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Inativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Ativo
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {person.is_active === false ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReactivate(person.id)}
                          title="Reativar vendedor"
                        >
                          <RotateCcw className="w-4 h-4 text-green-600" />
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(person)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(person)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ✅ DIALOG DE CADASTRO/EDIÇÃO (COM VALIDAÇÃO - PROBLEMA 3) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPerson ? 'Editar Vendedor' : 'Novo Vendedor'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (formErrors.name) {
                      setFormErrors({ ...formErrors, name: '' });
                    }
                  }}
                  placeholder="Nome do vendedor"
                  className={formErrors.name ? 'border-red-500' : ''}
                />
                {formErrors.name && (
                  <p className="text-sm text-red-600">{formErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (formErrors.email) {
                      setFormErrors({ ...formErrors, email: '' });
                    }
                  }}
                  placeholder="email@exemplo.com"
                  className={formErrors.email ? 'border-red-500' : ''}
                />
                {formErrors.email && (
                  <p className="text-sm text-red-600">{formErrors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="commissionRate">Taxa de Comissão (%)</Label>
                <Input
                  id="commissionRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.commissionRate}
                  onChange={(e) =>
                    setFormData({ ...formData, commissionRate: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingPerson ? 'Salvar Alterações' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ✅ DIALOG DE CONFIRMAÇÃO DE EXCLUSÃO (PROBLEMA 1) */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja realmente desativar este vendedor?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Você está prestes a desativar o vendedor:
              </p>
              <p className="font-semibold text-gray-900">
                {personToDelete?.code} - {personToDelete?.name}
              </p>
              <p className="text-sm text-gray-600">
                O vendedor será desativado mas seus dados serão mantidos no sistema. 
                Você poderá reativá-lo posteriormente se necessário.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPersonToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Desativar Vendedor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
