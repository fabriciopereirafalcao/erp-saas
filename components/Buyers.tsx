import { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
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
import { projectId } from '../utils/supabase/info';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export function Buyers() {
  const { accessToken } = useAuth();
  const [buyersFromDB, setBuyersFromDB] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBuyer, setEditingBuyer] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
  });

  // ==================== CARREGAR COMPRADORES DO BACKEND ====================
  useEffect(() => {
    const loadBuyers = async () => {
      if (!accessToken) return;

      setIsLoading(true);
      try {
        const url = `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/buyers`;
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        const result = await response.json();

        if (result.success) {
          setBuyersFromDB(result.data);
          console.log('✅ Compradores carregados:', result.data.length);
        } else {
          console.error('❌ Erro ao carregar compradores:', result.error);
          toast.error('Erro ao carregar compradores');
        }
      } catch (error) {
        console.error('❌ Erro ao carregar compradores:', error);
        toast.error('Erro ao conectar com o servidor');
      } finally {
        setIsLoading(false);
      }
    };

    loadBuyers();
  }, [accessToken]);

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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
        } else {
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
        } else {
          toast.error(result.error || 'Erro ao criar comprador');
        }
      }

      handleCloseDialog();
    } catch (error) {
      console.error('❌ Erro ao salvar comprador:', error);
      toast.error('Erro ao conectar com o servidor');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este comprador?')) {
      return;
    }

    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/buyers/${id}`;
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
        setBuyersFromDB(prev => prev.filter(b => b.id !== id));
      } else {
        toast.error(result.error || 'Erro ao remover comprador');
      }
    } catch (error) {
      console.error('❌ Erro ao deletar comprador:', error);
      toast.error('Erro ao conectar com o servidor');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-green-600" />
            <h1 className="text-gray-900">Compradores</h1>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Comprador
          </Button>
        </div>
        <p className="text-gray-500">Cadastre e gerencie a equipe de compras</p>
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
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              /* ========== ESTADO DE LOADING ========== */
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="w-8 h-8 text-green-600 animate-spin" />
                    <p className="text-gray-600">Carregando compradores...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : buyersFromDB.length === 0 ? (
              /* ========== ESTADO VAZIO ========== */
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  Nenhum comprador cadastrado
                </TableCell>
              </TableRow>
            ) : (
              /* ========== COMPRADORES CARREGADOS ========== */
              buyersFromDB.map((buyer) => (
                <TableRow key={buyer.id}>
                  <TableCell className="font-mono text-sm">{buyer.code}</TableCell>
                  <TableCell className="font-medium">{buyer.name}</TableCell>
                  <TableCell className="text-gray-600">{buyer.email || '-'}</TableCell>
                  <TableCell className="text-gray-600">{buyer.phone || '-'}</TableCell>
                  <TableCell className="text-gray-600">{buyer.department || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
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
                        onClick={() => handleDelete(buyer.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome do comprador"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
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
                  placeholder="Ex: Compras, Logística"
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
    </div>
  );
}
