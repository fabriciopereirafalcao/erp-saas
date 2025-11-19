import { useState } from 'react';
import { Tags, Plus, Trash2 } from 'lucide-react';
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

export function ProductCategories() {
  const { productCategories, addProductCategory, deleteProductCategory } = useERP();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');

  const handleOpenDialog = () => {
    setCategoryName('');
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setCategoryName('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (categoryName.trim()) {
      addProductCategory(categoryName.trim());
      handleCloseDialog();
    }
  };

  const handleDelete = (category: string) => {
    if (confirm(`Deseja realmente excluir a categoria "${category}"?`)) {
      deleteProductCategory(category);
    }
  };

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
        <p className="text-gray-500">Organize produtos por categorias</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-8 text-gray-500">
                  Nenhuma categoria cadastrada
                </TableCell>
              </TableRow>
            ) : (
              productCategories.map((category, index) => (
                <TableRow key={index}>
                  <TableCell>{category}</TableCell>
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
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit">Cadastrar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
