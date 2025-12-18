import { useState, useEffect } from 'react';
import { PackageCheck, Plus, Pencil, Trash2, Loader2, AlertCircle } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner@2.0.3';
import { authFetch } from '../utils/authFetch';
import { projectId } from '../utils/supabase/info';

interface ManufacturingBatch {
  id: string;
  productName: string;
  batchNumber: string;
  manufacturingDate?: string;
  expiryDate?: string;
  initialQuantity: number;
  currentQuantity: number;
  status: 'Ativo' | 'Bloqueado' | 'Vencido' | 'Esgotado';
  createdAt: string;
  updatedAt: string;
}

export function ManufacturingBatches() {
  const [batches, setBatches] = useState<ManufacturingBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<ManufacturingBatch | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    batchNumber: '',
    productName: '',
    quantity: '',
    manufacturingDate: '',
    expiryDate: '',
    status: 'Ativo' as 'Ativo' | 'Bloqueado' | 'Vencido' | 'Esgotado',
  });

  // Carregar lotes ao montar
  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authFetch(`https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/product-batches`);
      const result = await response.json();
      
      if (result.success) {
        setBatches(result.data || []);
      } else {
        throw new Error(result.error || 'Erro ao carregar lotes');
      }
    } catch (err: any) {
      console.error('[MANUFACTURING BATCHES] Erro ao carregar:', err);
      setError(err.message || 'Erro ao carregar lotes');
      toast.error('Erro ao carregar lotes');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (batch?: ManufacturingBatch) => {
    if (batch) {
      setEditingBatch(batch);
      setFormData({
        batchNumber: batch.batchNumber,
        productName: batch.productName,
        quantity: batch.currentQuantity.toString(),
        manufacturingDate: batch.manufacturingDate || '',
        expiryDate: batch.expiryDate || '',
        status: batch.status,
      });
    } else {
      setEditingBatch(null);
      setFormData({
        batchNumber: '',
        productName: '',
        quantity: '',
        manufacturingDate: '',
        expiryDate: '',
        status: 'Ativo',
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingBatch(null);
    setFormData({
      batchNumber: '',
      productName: '',
      quantity: '',
      manufacturingDate: '',
      expiryDate: '',
      status: 'Ativo',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.batchNumber.trim()) {
      toast.error('Número do lote é obrigatório');
      return;
    }
    if (!formData.productName.trim()) {
      toast.error('Nome do produto é obrigatório');
      return;
    }
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }

    try {
      setSaving(true);

      if (editingBatch) {
        // ATUALIZAR
        const response = await authFetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/product-batches/${editingBatch.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              batchNumber: formData.batchNumber.trim(),
              productName: formData.productName.trim(),
              quantity: parseFloat(formData.quantity),
              manufacturingDate: formData.manufacturingDate || null,
              expiryDate: formData.expiryDate || null,
              status: formData.status,
            }),
          }
        );

        const result = await response.json();

        if (result.success) {
          toast.success(`Lote "${formData.batchNumber.trim()}" atualizado com sucesso!`);
          handleCloseDialog();
          await loadBatches();
        } else {
          throw new Error(result.error || 'Erro ao atualizar lote');
        }
      } else {
        // CRIAR
        const response = await authFetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/product-batches/create`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              batchNumber: formData.batchNumber.trim(),
              productName: formData.productName.trim(),
              quantity: parseFloat(formData.quantity),
              manufacturingDate: formData.manufacturingDate || null,
              expiryDate: formData.expiryDate || null,
              status: formData.status,
            }),
          }
        );

        const result = await response.json();

        if (result.success) {
          toast.success(`Lote "${formData.batchNumber.trim()}" criado com sucesso!`);
          handleCloseDialog();
          await loadBatches();
        } else {
          throw new Error(result.error || 'Erro ao criar lote');
        }
      }
    } catch (err: any) {
      console.error('[MANUFACTURING BATCHES] Erro ao salvar:', err);
      toast.error(err.message || 'Erro ao salvar lote');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (batch: ManufacturingBatch) => {
    if (!confirm(`Deseja realmente excluir o lote "${batch.batchNumber}"?`)) {
      return;
    }

    try {
      const response = await authFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/product-batches/${batch.id}`,
        {
          method: 'DELETE',
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success(`Lote "${batch.batchNumber}" removido com sucesso!`);
        await loadBatches();
      } else {
        throw new Error(result.error || 'Erro ao remover lote');
      }
    } catch (err: any) {
      console.error('[MANUFACTURING BATCHES] Erro ao deletar:', err);
      toast.error(err.message || 'Erro ao remover lote');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'Ativo': 'text-green-600 bg-green-50',
      'Bloqueado': 'text-yellow-600 bg-yellow-50',
      'Vencido': 'text-red-600 bg-red-50',
      'Esgotado': 'text-gray-600 bg-gray-50',
    };
    return colors[status as keyof typeof colors] || colors['Ativo'];
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Carregando lotes...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadBatches}
              className="ml-4"
            >
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <PackageCheck className="w-8 h-8 text-purple-600" />
            <h1 className="text-gray-900">Lotes de Fabricação</h1>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Lote
          </Button>
        </div>
        <p className="text-gray-500">
          Controle de lotes de produção ({batches.length} {batches.length === 1 ? 'lote' : 'lotes'})
        </p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número do Lote</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Quantidade</TableHead>
              <TableHead>Fabricação</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  Nenhum lote cadastrado
                </TableCell>
              </TableRow>
            ) : (
              batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-mono text-sm">{batch.batchNumber}</TableCell>
                  <TableCell>{batch.productName}</TableCell>
                  <TableCell>{batch.currentQuantity.toFixed(3)}</TableCell>
                  <TableCell>{formatDate(batch.manufacturingDate)}</TableCell>
                  <TableCell>{formatDate(batch.expiryDate)}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(batch.status)}`}>
                      {batch.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(batch)}
                      >
                        <Pencil className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(batch)}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingBatch ? 'Editar Lote de Fabricação' : 'Novo Lote de Fabricação'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="batchNumber">Número do Lote *</Label>
                  <Input
                    id="batchNumber"
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                    placeholder="Ex: LOTE-001"
                    required
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="productName">Nome do Produto *</Label>
                  <Input
                    id="productName"
                    value={formData.productName}
                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                    placeholder="Ex: Arroz Integral"
                    required
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantidade *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.001"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="0.000"
                    required
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manufacturingDate">Data de Fabricação</Label>
                  <Input
                    id="manufacturingDate"
                    type="date"
                    value={formData.manufacturingDate}
                    onChange={(e) => setFormData({ ...formData, manufacturingDate: e.target.value })}
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Data de Validade</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Bloqueado">Bloqueado</SelectItem>
                    <SelectItem value="Vencido">Vencido</SelectItem>
                    <SelectItem value="Esgotado">Esgotado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCloseDialog}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : editingBatch ? (
                  'Atualizar'
                ) : (
                  'Cadastrar'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
