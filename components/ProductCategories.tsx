import { useState, useEffect } from 'react';
import { Tags, Plus, Trash2, Loader2, AlertCircle, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
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
  const [showInactive, setShowInactive] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<ProductCategory | null>(null);

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

  const handleDeleteClick = (category: ProductCategory) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;

    try {
      const response = await authFetch(`https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/product-categories/${categoryToDelete.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || 'Categoria desativada com sucesso!');
        // Atualizar estado local marcando como inativo
        setCategories(prev =>
          prev.map(cat => cat.id === categoryToDelete.id ? { ...cat, isActive: false } : cat)
        );
        setDeleteDialogOpen(false);
        setCategoryToDelete(null);
      } else {
        throw new Error(result.error || 'Erro ao desativar categoria');
      }
    } catch (err: any) {
      console.error('[PRODUCT CATEGORIES] Erro ao desativar:', err);
      toast.error(err.message || 'Erro ao desativar categoria');
    }
  };

  const handleReactivate = async (category: ProductCategory) => {
    try {
      const response = await authFetch(`https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/product-categories/${category.id}/reactivate`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || 'Categoria reativada com sucesso!');
        // Atualizar estado local marcando como ativo
        setCategories(prev =>
          prev.map(cat => cat.id === category.id ? { ...cat, isActive: true } : cat)
        );
      } else {
        throw new Error(result.error || 'Erro ao reativar categoria');
      }
    } catch (err: any) {
      console.error('[PRODUCT CATEGORIES] Erro ao reativar:', err);
      toast.error(err.message || 'Erro ao reativar categoria');
    }
  };

  // Filtrar categorias
  const filteredCategories = showInactive
    ? categories
    : categories.filter(cat => cat.isActive !== false);

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
          <div className="flex items-center gap-2">
            {/* Toggle Mostrar Inativos */}
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
            <Button onClick={handleOpenDialog} className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Categoria
            </Button>
          </div>
        </div>
        <p className="text-gray-500">
          Organize produtos por categorias ({filteredCategories.length} {filteredCategories.length === 1 ? 'categoria' : 'categorias'})
        </p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                  {showInactive ? 'Nenhuma categoria cadastrada' : 'Nenhuma categoria ativa'}
                </TableCell>
              </TableRow>
            ) : (
              filteredCategories.map((category) => (
                <TableRow key={category.id} className={category.isActive === false ? 'opacity-50' : ''}>
                  <TableCell>{category.name}</TableCell>
                  <TableCell className="text-gray-500">
                    {category.description || '-'}
                  </TableCell>
                  <TableCell>
                    {category.isActive === false ? (
                      <Badge variant="outline" className="bg-gray-100 text-gray-600">
                        Inativo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Ativo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {category.isActive !== false && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(category)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    )}
                    {category.isActive === false && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReactivate(category)}
                      >
                        <RotateCcw className="w-4 h-4 text-green-600" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de Cadastro */}
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

      {/* Dialog de Confirmação de Desativação */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja realmente desativar esta categoria?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Você está prestes a desativar a categoria:
              </p>
              <p className="font-semibold text-gray-900">
                {categoryToDelete?.name}
              </p>
              <p className="text-sm text-gray-600">
                A categoria será desativada mas seus dados serão mantidos no sistema. 
                Você poderá reativá-la posteriormente se necessário.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCategoryToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Desativar Categoria
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}