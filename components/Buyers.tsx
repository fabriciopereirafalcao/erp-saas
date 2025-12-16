import { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Pencil, Trash2, RefreshCw, RotateCcw, Eye, EyeOff } from 'lucide-react';
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

export function Buyers() {
  const { accessToken } = useAuth();
  const [buyersFromDB, setBuyersFromDB] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBuyer, setEditingBuyer] = useState<any | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [buyerToDelete, setBuyerToDelete] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ==================== CARREGAR COMPRADORES DO BACKEND ====================
  useEffect(() => {
    loadBuyers();
  }, [accessToken]);

  const loadBuyers = async () => {
    if (!accessToken) return;

    setIsLoading(true);
    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/buyers`;
      console.log('🔵 [BUYERS] Carregando compradores...', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      console.log('🔵 [BUYERS] Resposta recebida:', result);

      if (result.success) {
        setBuyersFromDB(result.data);
        console.log('✅ [BUYERS] Compradores carregados:', result.data.length, result.data);
      } else {
        console.error('❌ [BUYERS] Erro ao carregar compradores:', result.error);
        toast.error('Erro ao carregar compradores');
      }
    } catch (error) {
      console.error('❌ [BUYERS] Erro ao carregar compradores:', error);
      toast.error('Erro ao conectar com o servidor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (buyer?: any) => {
    if (buyer) {
      setEditingBuyer(buyer);
      setFormData({
        name: buyer.name,
        email: buyer.email || '',
        phone: buyer.phone || '',
        department: buyer.department || '',
      });
    } else {
      setEditingBuyer(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        department: '',
      });
    }
    setFormErrors({});
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingBuyer(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      department: '',
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
      if (editingBuyer) {
        // ==================== ATUALIZAR ====================
        const url = `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/buyers/${editingBuyer.id}`;
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
          setBuyersFromDB(prev =>
            prev.map(b => b.id === editingBuyer.id ? result.data : b)
          );
          handleCloseDialog();
        } else {
          // Mostrar erro no formulário
          toast.error(result.error || 'Erro ao atualizar comprador');
        }
      } else {
        // ==================== CRIAR ====================
        const url = `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/buyers`;
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
          setBuyersFromDB(prev => [...prev, result.data]);
          handleCloseDialog();
        } else {
          // Mostrar erro no formulário
          toast.error(result.error || 'Erro ao criar comprador');
        }
      }
    } catch (error) {
      console.error('❌ Erro ao salvar comprador:', error);
      toast.error('Erro ao conectar com o servidor');
    }
  };

  // ✅ MELHORAR UX DE DELETE (PROBLEMA 1)
  const handleDeleteClick = (buyer: any) => {
    setBuyerToDelete(buyer);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!buyerToDelete) return;

    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/buyers/${buyerToDelete.id}`;
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
        // ✅ ATUALIZAR estado local marcando como inativo (não remover)
        setBuyersFromDB(prev => prev.map(b => 
          b.id === buyerToDelete.id 
            ? { ...b, is_active: false } 
            : b
        ));
      } else {
        toast.error(result.error || 'Erro ao remover comprador');
      }
    } catch (error) {
      console.error('❌ Erro ao deletar comprador:', error);
      toast.error('Erro ao conectar com o servidor');
    } finally {
      setDeleteDialogOpen(false);
      setBuyerToDelete(null);
    }
  };

  // ✅ REATIVAR COMPRADOR (PROBLEMA 2)
  const handleReactivate = async (id: string) => {
    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/buyers/${id}/reactivate`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Comprador reativado com sucesso');
        loadBuyers();
      } else {
        toast.error(result.error || 'Erro ao reativar comprador');
      }
    } catch (error) {
      console.error('❌ Erro ao reativar comprador:', error);
      toast.error('Erro ao conectar com o servidor');
    }
  };

  // ✅ FILTRAR COMPRADORES (PROBLEMA 2)
  const filteredBuyers = showInactive
    ? buyersFromDB
    : buyersFromDB.filter(b => b.is_active !== false);

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-blue-600" />
            <h1 className="text-gray-900">Compradores</h1>
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
              Novo Comprador
            </Button>
          </div>
        </div>
        <p className="text-gray-500">Cadastre e gerencie os compradores</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Departamento</TableHead>
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
                    <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                    <p className="text-gray-600">Carregando compradores...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredBuyers.length === 0 ? (
              /* ========== ESTADO VAZIO ========== */
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  {showInactive ? 'Nenhum comprador inativo' : 'Nenhum comprador cadastrado'}
                </TableCell>
              </TableRow>
            ) : (
              /* ========== COMPRADORES CARREGADOS ========== */
              filteredBuyers.map((buyer) => (
                <TableRow 
                  key={buyer.id}
                  className={buyer.is_active === false ? 'opacity-50 bg-gray-50' : ''}
                >
                  <TableCell className="font-mono text-sm">{buyer.code}</TableCell>
                  <TableCell className="font-medium">{buyer.name}</TableCell>
                  <TableCell className="text-gray-600">{buyer.email || '-'}</TableCell>
                  <TableCell className="text-gray-600">{buyer.phone || '-'}</TableCell>
                  <TableCell className="text-gray-600">{buyer.department || '-'}</TableCell>
                  <TableCell>
                    {buyer.is_active === false ? (
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
                      {buyer.is_active === false ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReactivate(buyer.id)}
                          title="Reativar comprador"
                        >
                          <RotateCcw className="w-4 h-4 text-green-600" />
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(buyer)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(buyer)}
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
              {editingBuyer ? 'Editar Comprador' : 'Novo Comprador'}
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
                  placeholder="Nome do comprador"
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
                <Label htmlFor="department">Departamento</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="Ex: Compras, Logística..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingBuyer ? 'Salvar Alterações' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ✅ DIALOG DE CONFIRMAÇÃO DE EXCLUSÃO (PROBLEMA 1) */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja realmente desativar este comprador?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Você está prestes a desativar o comprador:
              </p>
              <p className="font-semibold text-gray-900">
                {buyerToDelete?.code} - {buyerToDelete?.name}
              </p>
              <p className="text-sm text-gray-600">
                O comprador será desativado mas seus dados serão mantidos no sistema. 
                Você poderá reativá-lo posteriormente se necessário.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBuyerToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Desativar Comprador
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}