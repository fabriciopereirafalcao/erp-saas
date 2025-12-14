import { useState, useEffect } from 'react';
import { ListTree, Plus, Pencil, Trash2, Lock, AlertCircle } from 'lucide-react';
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
import { useERP } from '../contexts/ERPContext';
import { AccountCategory, DRELine } from '../contexts/ERPContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function ChartOfAccounts() {
  const { accountCategories, addAccountCategory, updateAccountCategory, deleteAccountCategory } = useERP();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AccountCategory | null>(null);
  const [dreLines, setDreLines] = useState<DRELine[]>([]);
  const [loadingDreLines, setLoadingDreLines] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Receita' as 'Receita' | 'Despesa',
    description: '',
    code: '',
    accountType: 'analitica' as 'sintetica' | 'analitica',
    dreLineId: '',
    parentId: '',
  });

  // ==================== BUSCAR LINHAS DRE ====================
  useEffect(() => {
    const fetchDRELines = async () => {
      setLoadingDreLines(true);
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/dre/structure`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            // Filtrar apenas linhas não calculadas (usuário pode vincular contas a elas)
            const nonCalculatedLines = result.data.filter((line: DRELine) => !line.isCalculated);
            setDreLines(nonCalculatedLines);
            console.log('✅ Linhas DRE carregadas:', nonCalculatedLines.length);
          }
        } else {
          console.error('❌ Erro ao buscar linhas DRE:', response.statusText);
        }
      } catch (error) {
        console.error('❌ Erro ao buscar linhas DRE:', error);
      } finally {
        setLoadingDreLines(false);
      }
    };

    fetchDRELines();
  }, []);

  // ==================== HANDLERS ====================
  const handleOpenDialog = (category?: AccountCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        type: category.type,
        description: category.description || '',
        code: category.code || '',
        accountType: category.accountType || 'analitica',
        dreLineId: category.dreLineId || '',
        parentId: category.parentId || '',
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        type: 'Receita',
        description: '',
        code: '',
        accountType: 'analitica',
        dreLineId: '',
        parentId: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      type: 'Receita',
      description: '',
      code: '',
      accountType: 'analitica',
      dreLineId: '',
      parentId: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação: conta analítica DEVE ter dreLineId
    if (formData.accountType === 'analitica' && !formData.dreLineId) {
      alert('Contas analíticas devem estar vinculadas a uma linha da DRE');
      return;
    }

    // Validação: conta sintética NÃO pode ter dreLineId
    if (formData.accountType === 'sintetica' && formData.dreLineId) {
      alert('Contas sintéticas não podem estar vinculadas a linhas da DRE');
      return;
    }
    
    if (editingCategory) {
      updateAccountCategory(editingCategory.id, formData);
    } else {
      addAccountCategory(formData);
    }
    
    handleCloseDialog();
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja realmente excluir esta categoria de conta?')) {
      deleteAccountCategory(id);
    }
  };

  // ==================== HELPER: Encontrar nome da linha DRE ====================
  const getDRELineName = (dreLineId?: string): string => {
    if (!dreLineId) return '-';
    const line = dreLines.find(l => l.id === dreLineId);
    return line ? `${line.code} - ${line.name}` : '-';
  };

  // ==================== HELPER: Verificar se é sintética (bloqueada) ====================
  const isSyntheticAccount = (category: AccountCategory): boolean => {
    return category.accountType === 'sintetica';
  };

  // ==================== HELPER: Ordenar contas por código ====================
  const sortedAccounts = [...accountCategories].sort((a, b) => {
    const codeA = a.code || '9999';
    const codeB = b.code || '9999';
    return codeA.localeCompare(codeB);
  });

  // ==================== HELPER: Renderizar hierarquia ====================
  const getIndentation = (level?: number): string => {
    if (!level) return '';
    return '├─ '.repeat(level - 1);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <ListTree className="w-8 h-8 text-green-600" />
            <h1 className="text-gray-900">Plano de Contas</h1>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Conta Analítica
          </Button>
        </div>
        <p className="text-gray-500">Gerencie a estrutura contábil da empresa</p>
        
        {/* Alerta informativo */}
        <Alert className="mt-4 border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-900">
            <strong>Contas Sintéticas</strong> (grupos) são <strong>somente leitura</strong> e fazem parte da estrutura padrão. 
            Você pode criar apenas <strong>Contas Analíticas</strong> (detalhadas) vinculadas a uma linha da DRE.
          </AlertDescription>
        </Alert>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Natureza</TableHead>
              <TableHead>Linha DRE</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAccounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  Nenhuma conta cadastrada
                </TableCell>
              </TableRow>
            ) : (
              sortedAccounts.map((category) => {
                const isSynthetic = isSyntheticAccount(category);
                return (
                  <TableRow key={category.id} className={isSynthetic ? 'bg-gray-50' : ''}>
                    <TableCell className="font-mono text-sm">{category.code || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isSynthetic && <Lock className="w-3 h-3 text-gray-400" />}
                        <span className={`${category.level ? 'text-gray-600' : ''}`}>
                          {getIndentation(category.level)}
                          {category.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${
                          category.type === 'Receita'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {category.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${
                          isSynthetic
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {isSynthetic ? 'Sintética' : 'Analítica'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {isSynthetic ? (
                        <span className="text-gray-400 text-sm">-</span>
                      ) : (
                        <span className="text-sm">
                          {category.dreLineName || getDRELineName(category.dreLineId)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${
                          category.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {category.isActive ? 'Ativa' : 'Inativa'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isSynthetic ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled
                            title="Contas sintéticas não podem ser editadas"
                          >
                            <Lock className="w-4 h-4 text-gray-400" />
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(category)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(category.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ==================== DIALOG DE CRIAÇÃO/EDIÇÃO ==================== */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Editar Conta Analítica' : 'Nova Conta Analítica'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {/* Código */}
              <div className="space-y-2">
                <Label htmlFor="code">Código da Conta *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Ex: 3.1.01.01"
                  required
                />
                <p className="text-xs text-gray-500">
                  Utilize o formato hierárquico: 3.1.01.01 (último nível = analítica)
                </p>
              </div>

              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Conta *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Vendas de Produtos - Alimentos"
                  required
                />
              </div>

              {/* Tipo */}
              <div className="space-y-2">
                <Label htmlFor="type">Tipo *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value as 'Receita' | 'Despesa' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Receita">Receita</SelectItem>
                    <SelectItem value="Despesa">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Linha DRE (obrigatório para analítica) */}
              <div className="space-y-2">
                <Label htmlFor="dreLineId">Linha da DRE * (obrigatório)</Label>
                <Select
                  value={formData.dreLineId}
                  onValueChange={(value) => setFormData({ ...formData, dreLineId: value })}
                  disabled={loadingDreLines}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingDreLines ? 'Carregando...' : 'Selecione a linha DRE'} />
                  </SelectTrigger>
                  <SelectContent>
                    {dreLines.map((line) => (
                      <SelectItem key={line.id} value={line.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-500">{line.code}</span>
                          <span>{line.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  A linha DRE define onde esta conta aparecerá no relatório DRE Gerencial
                </p>
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição detalhada da conta"
                />
              </div>

              {/* Conta Pai (opcional - para criar subcontas) */}
              <div className="space-y-2">
                <Label htmlFor="parentId">Conta Pai (opcional)</Label>
                <Select
                  value={formData.parentId}
                  onValueChange={(value) => setFormData({ ...formData, parentId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhuma (conta raiz)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma (conta raiz)</SelectItem>
                    {sortedAccounts
                      .filter((cat) => cat.accountType === 'sintetica')
                      .map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.code} - {category.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingCategory ? 'Salvar Alterações' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
