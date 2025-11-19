import { useState } from 'react';
import { Users, Plus, Pencil, Trash2 } from 'lucide-react';
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
import { Salesperson } from '../contexts/ERPContext';

export function Salespeople() {
  const { salespeople, addSalesperson, updateSalesperson, deleteSalesperson } = useERP();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Salesperson | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    commissionRate: 0,
  });

  const handleOpenDialog = (person?: Salesperson) => {
    if (person) {
      setEditingPerson(person);
      setFormData({
        name: person.name,
        email: person.email || '',
        phone: person.phone || '',
        commissionRate: person.commissionRate || 0,
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
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingPerson) {
      updateSalesperson(editingPerson.id, formData);
    } else {
      addSalesperson(formData);
    }
    
    handleCloseDialog();
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja realmente excluir este vendedor?')) {
      deleteSalesperson(id);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-green-600" />
            <h1 className="text-gray-900">Vendedores</h1>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Vendedor
          </Button>
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
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {salespeople.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  Nenhum vendedor cadastrado
                </TableCell>
              </TableRow>
            ) : (
              salespeople.map((person) => (
                <TableRow key={person.id}>
                  <TableCell>{person.id}</TableCell>
                  <TableCell>{person.name}</TableCell>
                  <TableCell className="text-gray-600">{person.email || '-'}</TableCell>
                  <TableCell className="text-gray-600">{person.phone || '-'}</TableCell>
                  <TableCell>{person.commissionRate ? `${person.commissionRate}%` : '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
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
                        onClick={() => handleDelete(person.id)}
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
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome do vendedor"
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
    </div>
  );
}
