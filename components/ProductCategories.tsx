import { useState, useEffect } from 'react';
import { Tags, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';
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
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner@2.0.3';
import { authFetch } from '../utils/authFetch';
import { projectId } from '../utils/supabase/info';

interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  defaultNcm?: string;
  defaultCest?: string;
  defaultOrigin?: string;
  defaultCfop?: string;
  defaultIcmsRate?: number;
  defaultPisRate?: number;
  defaultCofinsRate?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function ProductCategories() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Carregar categorias ao montar
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authFetch(`https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/product-categories`);
      const result = await response.json();
      
      if (result.success) {
        setCategories(result.data || []);
      } else {
        throw new Error(result.error || 'Erro ao carregar categorias');
      }
    } catch (err: any) {
      console.error('[PRODUCT CATEGORIES] Erro ao carregar:', err);
      setError(err.message || 'Erro ao carregar categorias');
      toast.error('Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setCategoryName('');
    setCategoryDescription('');
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setCategoryName('');
    setCategoryDescription('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!categoryName.trim()) {
      toast.error('Nome da categoria é obrigatório');
      return;
    }

    try {
      setSaving(true);
      
      const response = await authFetch(`https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/product-categories/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: categoryName.trim(),
          description: categoryDescription.trim() || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Categoria "${categoryName.trim()}" criada com sucesso!`);
        handleCloseDialog();
        await loadCategories(); // Recarregar lista
      } else {
        throw new Error(result.error || 'Erro ao criar categoria');
      }
    } catch (err: any) {
      console.error('[PRODUCT CATEGORIES] Erro ao criar:', err);
      toast.error(err.message || 'Erro ao criar categoria');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category: ProductCategory) => {
    if (!confirm(`Deseja realmente excluir a categoria "${category.name}"?`)) {
      return;
    }

    try {
      const response = await authFetch(`https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/product-categories/${category.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Categoria "${category.name}" removida com sucesso!`);
        await loadCategories(); // Recarregar lista
      } else {
        throw new Error(result.error || 'Erro ao remover categoria');
      }
    } catch (err: any) {
      console.error('[PRODUCT CATEGORIES] Erro ao deletar:', err);
      toast.error(err.message || 'Erro ao remover categoria');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Carregando categorias...</span>
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
              onClick={loadCategories}
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
            <Tags className="w-8 h-8 text-green-600" />
            <h1 className="text-gray-900">Categorias de Produtos</h1>
          </div>
          <Button onClick={handleOpenDialog} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Categoria
          </Button>
        </div>
        <p className="text-gray-500">
          Organize produtos por categorias ({categories.length} {categories.length === 1 ? 'categoria' : 'categorias'})
        </p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                  Nenhuma categoria cadastrada
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>{category.name}</TableCell>
                  <TableCell className="text-gray-500">
                    {category.description || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(category)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
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
            <DialogTitle>Nova Categoria de Produto</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="category">Nome da Categoria *</Label>
                <Input
                  id="category"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Ex: Eletrônicos, Alimentos, Vestuário"
                  required
                  disabled={saving}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Input
                  id="description"
                  value={categoryDescription}
                  onChange={(e) => setCategoryDescription(e.target.value)}
                  placeholder="Descrição da categoria"
                  disabled={saving}
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