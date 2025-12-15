import { useState, useEffect } from 'react';
import { Target, Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
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
import { useERP } from '../contexts/ERPContext';
import { CostCenter } from '../contexts/ERPContext';
import { projectId } from '../utils/supabase/info';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export function CostCenters() {
  const { companySettings, addCostCenter, updateCostCenter, deleteCostCenter } = useERP();
  const costCenters = companySettings?.costCenters || [];
  const { accessToken } = useAuth();
  const [costCentersFromDB, setCostCentersFromDB] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  // ==================== CARREGAR CENTROS DO BACKEND ====================
  useEffect(() => {
    const loadCostCenters = async () => {
      if (!accessToken) return;

      setIsLoading(true);
      try {
        const url = `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/cost-centers`;
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        const result = await response.json();

        if (result.success) {
          setCostCentersFromDB(result.data);
          console.log('✅ Centros de custo carregados:', result.data.length);
        } else {
          console.error('❌ Erro ao carregar centros:', result.error);
          toast.error('Erro ao carregar centros de custo');
        }
      } catch (error) {
        console.error('❌ Erro ao carregar centros:', error);
        toast.error('Erro ao conectar com o servidor');
      } finally {
        setIsLoading(false);
      }
    };

    loadCostCenters();
  }, [accessToken]);

  const handleOpenDialog = (center?: CostCenter) => {
    if (center) {
      setEditingCenter(center);
      setFormData({
        name: center.name,
        description: center.description || '',
      });
    } else {
      setEditingCenter(null);
      setFormData({
        name: '',
        description: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCenter(null);
    setFormData({
      name: '',
      description: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingCenter) {
        // ==================== ATUALIZAR ====================
        const url = `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/cost-centers/${editingCenter.id}`;
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
          setCostCentersFromDB(prev =>
            prev.map(c => c.id === editingCenter.id ? result.data : c)
          );
        } else {
          toast.error(result.error || 'Erro ao atualizar centro de custo');
        }
      } else {
        // ==================== CRIAR ====================
        const url = `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/cost-centers`;
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
          setCostCentersFromDB(prev => [...prev, result.data]);
        } else {
          toast.error(result.error || 'Erro ao criar centro de custo');
        }
      }

      handleCloseDialog();
    } catch (error) {
      console.error('❌ Erro ao salvar centro:', error);
      toast.error('Erro ao conectar com o servidor');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este centro de custo?')) {
      return;
    }

    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/cost-centers/${id}`;
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
        setCostCentersFromDB(prev => prev.filter(c => c.id !== id));
      } else {
        toast.error(result.error || 'Erro ao remover centro de custo');
      }
    } catch (error) {
      console.error('❌ Erro ao deletar centro:', error);
      toast.error('Erro ao conectar com o servidor');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Target className="w-8 h-8 text-green-600" />
            <h1 className="text-gray-900">Centros de Custo</h1>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Centro de Custo
          </Button>
        </div>
        <p className="text-gray-500">Cadastre e organize os centros de custo</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              /* ========== ESTADO DE LOADING ========== */
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="w-8 h-8 text-green-600 animate-spin" />
                    <p className="text-gray-600">Carregando centros de custo...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : costCentersFromDB.length === 0 ? (
              /* ========== ESTADO VAZIO ========== */
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                  Nenhum centro de custo cadastrado
                </TableCell>
              </TableRow>
            ) : (
              /* ========== CENTROS CARREGADOS ========== */
              costCentersFromDB.map((center) => (
                <TableRow key={center.id}>
                  <TableCell className="font-mono text-sm">{center.code}</TableCell>
                  <TableCell className="font-medium">{center.name}</TableCell>
                  <TableCell className="text-gray-600">{center.description || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(center)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(center.id)}
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
              {editingCenter ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Centro de Custo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Administrativo, Vendas, Produção"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição do centro de custo"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingCenter ? 'Salvar Alterações' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}