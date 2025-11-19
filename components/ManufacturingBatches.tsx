import { useState } from 'react';
import { PackageCheck, Plus, Pencil, Trash2 } from 'lucide-react';
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

interface ManufacturingBatch {
  id: string;
  batchNumber: string;
  productName: string;
  quantity: number;
  manufacturingDate: string;
  expiryDate: string;
  status: 'Ativo' | 'Vencido' | 'Consumido';
}

export function ManufacturingBatches() {
  const [batches, setBatches] = useState<ManufacturingBatch[]>(() => {
    const saved = localStorage.getItem('erp_manufacturing_batches');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<ManufacturingBatch | null>(null);
  const [formData, setFormData] = useState({
    batchNumber: '',
    productName: '',
    quantity: 0,
    manufacturingDate: '',
    expiryDate: '',
    status: 'Ativo' as 'Ativo' | 'Vencido' | 'Consumido',
  });

  const saveBatches = (newBatches: ManufacturingBatch[]) => {
    setBatches(newBatches);
    localStorage.setItem('erp_manufacturing_batches', JSON.stringify(newBatches));
  };

  const handleOpenDialog = (batch?: ManufacturingBatch) => {
    if (batch) {
      setEditingBatch(batch);
      setFormData({
        batchNumber: batch.batchNumber,
        productName: batch.productName,
        quantity: batch.quantity,
        manufacturingDate: batch.manufacturingDate,
        expiryDate: batch.expiryDate,
        status: batch.status,
      });
    } else {
      setEditingBatch(null);
      setFormData({
        batchNumber: '',
        productName: '',
        quantity: 0,
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
      quantity: 0,
      manufacturingDate: '',
      expiryDate: '',
      status: 'Ativo',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingBatch) {
      const updated = batches.map((batch) =>
        batch.id === editingBatch.id ? { ...batch, ...formData } : batch
      );
      saveBatches(updated);
    } else {
      const maxId = batches.reduce((max, batch) => {
        const num = parseInt(batch.id.replace('BATCH-', ''));
        return Math.max(max, num);
      }, 0);
      
      const newBatch: ManufacturingBatch = {
        id: `BATCH-${String(maxId + 1).padStart(5, '0')}`,
        ...formData,
      };
      saveBatches([...batches, newBatch]);
    }
    
    handleCloseDialog();
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja realmente excluir este lote?')) {
      saveBatches(batches.filter((batch) => batch.id !== id));
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ativo':
        return 'bg-green-100 text-green-800';
      case 'Vencido':
        return 'bg-red-100 text-red-800';
      case 'Consumido':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <PackageCheck className="w-8 h-8 text-green-600" />
            <h1 className="text-gray-900">Lotes de Fabricação</h1>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Lote
          </Button>
        </div>
        <p className="text-gray-500">Gerencie os lotes de produção e rastreabilidade</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nº do Lote</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Quantidade</TableHead>
              <TableHead>Data de Fabricação</TableHead>
              <TableHead>Data de Validade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  Nenhum lote cadastrado
                </TableCell>
              </TableRow>
            ) : (
              batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell>{batch.id}</TableCell>
                  <TableCell>{batch.batchNumber}</TableCell>
                  <TableCell>{batch.productName}</TableCell>
                  <TableCell>{batch.quantity}</TableCell>
                  <TableCell>{formatDate(batch.manufacturingDate)}</TableCell>
                  <TableCell>{formatDate(batch.expiryDate)}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${getStatusColor(
                        batch.status
                      )}`}
                    >
                      {batch.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(batch)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(batch.id)}
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
              {editingBatch ? 'Editar Lote' : 'Novo Lote de Fabricação'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="batchNumber">Número do Lote *</Label>
                <Input
                  id="batchNumber"
                  value={formData.batchNumber}
                  onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                  placeholder="Ex: L20250101"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="productName">Nome do Produto *</Label>
                <Input
                  id="productName"
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  placeholder="Nome do produto"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="manufacturingDate">Data de Fabricação *</Label>
                  <Input
                    id="manufacturingDate"
                    type="date"
                    value={formData.manufacturingDate}
                    onChange={(e) =>
                      setFormData({ ...formData, manufacturingDate: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Data de Validade *</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Vencido">Vencido</option>
                  <option value="Consumido">Consumido</option>
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingBatch ? 'Salvar Alterações' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
