import { useState, useEffect } from 'react';
import { Warehouse, Plus, Pencil, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
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

interface StockLocation {
  id: string;
  code: string;
  name: string;
  description?: string;
  address?: string;
  type: 'Depósito' | 'Loja' | 'Armazém' | 'Outro';
  capacityM3?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function StockLocations() {
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<StockLocation | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    type: 'Depósito' as 'Depósito' | 'Loja' | 'Armazém' | 'Outro',
    capacityM3: '',
  });

  // Carregar locais ao montar
  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authFetch(`https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/stock-locations`);
      const result = await response.json();
      
      if (result.success) {
        setLocations(result.data || []);
      } else {
        throw new Error(result.error || 'Erro ao carregar locais de estoque');
      }
    } catch (err: any) {
      console.error('[STOCK LOCATIONS] Erro ao carregar:', err);
      setError(err.message || 'Erro ao carregar locais de estoque');
      toast.error('Erro ao carregar locais de estoque');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (location?: StockLocation) => {
    if (location) {
      setEditingLocation(location);
      setFormData({
        name: location.name,
        description: location.description || '',
        address: location.address || '',
        type: location.type,
        capacityM3: location.capacityM3?.toString() || '',
      });
    } else {
      setEditingLocation(null);
      setFormData({
        name: '',
        description: '',
        address: '',
        type: 'Depósito',
        capacityM3: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingLocation(null);
    setFormData({
      name: '',
      description: '',
      address: '',
      type: 'Depósito',
      capacityM3: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Nome do local é obrigatório');
      return;
    }

    try {
      setSaving(true);

      if (editingLocation) {
        // ATUALIZAR
        const response = await authFetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/stock-locations/${editingLocation.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: formData.name.trim(),
              description: formData.description.trim() || null,
              address: formData.address.trim() || null,
              type: formData.type,
              capacityM3: formData.capacityM3 ? parseFloat(formData.capacityM3) : null,
            }),
          }
        );

        const result = await response.json();

        if (result.success) {
          toast.success(`Local "${formData.name.trim()}" atualizado com sucesso!`);
          handleCloseDialog();
          await loadLocations();
        } else {
          throw new Error(result.error || 'Erro ao atualizar local');
        }
      } else {
        // CRIAR
        const response = await authFetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/stock-locations/create`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: formData.name.trim(),
              description: formData.description.trim() || null,
              address: formData.address.trim() || null,
              type: formData.type,
              capacityM3: formData.capacityM3 ? parseFloat(formData.capacityM3) : null,
            }),
          }
        );

        const result = await response.json();

        if (result.success) {
          toast.success(`Local "${formData.name.trim()}" criado com sucesso!`);
          handleCloseDialog();
          await loadLocations();
        } else {
          throw new Error(result.error || 'Erro ao criar local');
        }
      }
    } catch (err: any) {
      console.error('[STOCK LOCATIONS] Erro ao salvar:', err);
      toast.error(err.message || 'Erro ao salvar local');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (location: StockLocation) => {
    if (!confirm(`Deseja realmente excluir o local "${location.name}"?`)) {
      return;
    }

    try {
      const response = await authFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/stock-locations/${location.id}`,
        {
          method: 'DELETE',
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success(`Local "${location.name}" removido com sucesso!`);
        await loadLocations();
      } else {
        throw new Error(result.error || 'Erro ao remover local');
      }
    } catch (err: any) {
      console.error('[STOCK LOCATIONS] Erro ao deletar:', err);
      toast.error(err.message || 'Erro ao remover local');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Carregando locais de estoque...</span>
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
              onClick={loadLocations}
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
            <Warehouse className="w-8 h-8 text-blue-600" />
            <h1 className="text-gray-900">Locais de Estoque</h1>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Local
          </Button>
        </div>
        <p className="text-gray-500">
          Gerencie seus locais de armazenamento ({locations.length} {locations.length === 1 ? 'local' : 'locais'})
        </p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Endereço</TableHead>
              <TableHead>Capacidade (m³)</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  Nenhum local cadastrado
                </TableCell>
              </TableRow>
            ) : (
              locations.map((location) => (
                <TableRow key={location.id}>
                  <TableCell className="font-mono text-sm">{location.code}</TableCell>
                  <TableCell>{location.name}</TableCell>
                  <TableCell>{location.type}</TableCell>
                  <TableCell className="text-gray-500">
                    {location.address || '-'}
                  </TableCell>
                  <TableCell>
                    {location.capacityM3 ? `${location.capacityM3.toFixed(2)} m³` : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(location)}
                      >
                        <Pencil className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(location)}
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
              {editingLocation ? 'Editar Local de Estoque' : 'Novo Local de Estoque'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Local *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Depósito Central"
                    required
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Tipo *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                    disabled={saving}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Depósito">Depósito</SelectItem>
                      <SelectItem value="Loja">Loja</SelectItem>
                      <SelectItem value="Armazém">Armazém</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Endereço completo"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacityM3">Capacidade (m³)</Label>
                <Input
                  id="capacityM3"
                  type="number"
                  step="0.01"
                  value={formData.capacityM3}
                  onChange={(e) => setFormData({ ...formData, capacityM3: e.target.value })}
                  placeholder="0.00"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição adicional do local"
                  disabled={saving}
                  rows={3}
                />
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
                ) : editingLocation ? (
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
