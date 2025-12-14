import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2, Eye, EyeOff, ListTree } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Badge } from './ui/badge';
import { useERP } from '../contexts/ERPContext';
import { AccountCategory } from '../contexts/ERPContext';

// ==================== TIPOS ====================

interface HierarchicalAccount extends AccountCategory {
  children?: HierarchicalAccount[];
  level?: number;
}

// ==================== COMPONENTE PRINCIPAL ====================

export function ChartOfAccountsHierarchical() {
  const { accountCategories, addAccountCategory, updateAccountCategory, deleteAccountCategory } = useERP();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AccountCategory | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [showInactive, setShowInactive] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'Receita' as 'Receita' | 'Despesa',
    code: '',
    description: '',
    parentId: '',
    accountType: 'analitica' as 'sintetica' | 'analitica',
    dreLineItem: '',
  });

  // ==================== HIERARQUIA ====================

  const hierarchicalAccounts = useMemo(() => {
    // Filtrar contas ativas/inativas
    const filtered = showInactive 
      ? accountCategories 
      : accountCategories.filter(cat => cat.isActive);

    // Construir árvore hierárquica
    const accountMap = new Map<string, HierarchicalAccount>();
    const rootAccounts: HierarchicalAccount[] = [];

    // Primeiro passo: criar mapa
    filtered.forEach(account => {
      accountMap.set(account.id, { ...account, children: [] });
    });

    // Segundo passo: construir hierarquia
    filtered.forEach(account => {
      const node = accountMap.get(account.id)!;
      if (account.parentId) {
        const parent = accountMap.get(account.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(node);
        } else {
          rootAccounts.push(node);
        }
      } else {
        rootAccounts.push(node);
      }
    });

    // Ordenar por sortOrder ou code
    const sortAccounts = (accounts: HierarchicalAccount[]) => {
      accounts.sort((a, b) => {
        if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
          return a.sortOrder - b.sortOrder;
        }
        return (a.code || '').localeCompare(b.code || '');
      });
      accounts.forEach(acc => {
        if (acc.children && acc.children.length > 0) {
          sortAccounts(acc.children);
        }
      });
    };

    sortAccounts(rootAccounts);
    return rootAccounts;
  }, [accountCategories, showInactive]);

  // ==================== HANDLERS ====================

  const toggleNode = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (accounts: HierarchicalAccount[]) => {
      accounts.forEach(acc => {
        if (acc.children && acc.children.length > 0) {
          allIds.add(acc.id);
          collectIds(acc.children);
        }
      });
    };
    collectIds(hierarchicalAccounts);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const handleOpenDialog = (category?: AccountCategory, parentId?: string) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        type: category.type,
        code: category.code || '',
        description: category.description || '',
        parentId: category.parentId || '',
        accountType: category.accountType || 'analitica',
        dreLineItem: category.dreLineItem || '',
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        type: 'Receita',
        code: '',
        description: '',
        parentId: parentId || '',
        accountType: 'analitica',
        dreLineItem: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (editingCategory) {
      updateAccountCategory(editingCategory.id, formData);
    } else {
      addAccountCategory(formData);
    }
    setIsDialogOpen(false);
  };

  const handleToggleActive = (category: AccountCategory) => {
    updateAccountCategory(category.id, { isActive: !category.isActive });
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta conta?')) {
      deleteAccountCategory(id);
    }
  };

  // ==================== RENDERIZAÇÃO RECURSIVA ====================

  const renderAccountRow = (account: HierarchicalAccount, level: number = 0): React.ReactNode => {
    const hasChildren = account.children && account.children.length > 0;
    const isExpanded = expandedNodes.has(account.id);
    const isSynthetic = account.accountType === 'sintetica';

    return (
      <div key={account.id}>
        {/* Linha da conta */}
        <div
          className={`
            flex items-center gap-3 px-4 py-3 border-b hover:bg-gray-50 transition-colors
            ${!account.isActive ? 'opacity-50 bg-gray-100' : ''}
            ${isSynthetic ? 'font-semibold' : ''}
          `}
          style={{ paddingLeft: `${level * 32 + 16}px` }}
        >
          {/* Ícone de expansão */}
          <div className="w-5 flex-shrink-0">
            {hasChildren && (
              <button
                onClick={() => toggleNode(account.id)}
                className="hover:bg-gray-200 rounded p-1 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          {/* Código */}
          <div className="w-32 flex-shrink-0">
            <span className="font-mono text-sm">{account.code}</span>
          </div>

          {/* Nome */}
          <div className="flex-1 min-w-0">
            <span className={isSynthetic ? 'font-semibold' : ''}>
              {account.name}
            </span>
          </div>

          {/* Tipo */}
          <div className="w-24 flex-shrink-0">
            <Badge variant={account.type === 'Receita' ? 'default' : 'secondary'}>
              {account.type}
            </Badge>
          </div>

          {/* Tipo de Conta */}
          <div className="w-24 flex-shrink-0">
            <Badge variant="outline">
              {isSynthetic ? 'Sintética' : 'Analítica'}
            </Badge>
          </div>

          {/* DRE Line */}
          <div className="w-40 flex-shrink-0 text-xs text-gray-500">
            {account.dreLineItem || '-'}
          </div>

          {/* Ações */}
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleToggleActive(account)}
              title={account.isActive ? 'Desativar' : 'Ativar'}
            >
              {account.isActive ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenDialog(account)}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            {!isSynthetic && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(account.id)}
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            )}
            {isSynthetic && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenDialog(undefined, account.id)}
                title="Adicionar subconta"
              >
                <Plus className="w-4 h-4 text-green-600" />
              </Button>
            )}
          </div>
        </div>

        {/* Renderizar filhos se expandido */}
        {hasChildren && isExpanded && account.children?.map(child => renderAccountRow(child, level + 1))}
      </div>
    );
  };

  // ==================== RENDER ====================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListTree className="w-6 h-6" />
          <h2 className="text-2xl">Plano de Contas</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            Expandir Tudo
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Recolher Tudo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInactive(!showInactive)}
          >
            {showInactive ? 'Ocultar Inativas' : 'Mostrar Inativas'}
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Conta
          </Button>
        </div>
      </div>

      {/* Tabela Hierárquica */}
      <div className="border rounded-lg overflow-hidden bg-white">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b">
          <div className="w-5 flex-shrink-0" />
          <div className="w-32 flex-shrink-0 text-sm font-semibold">Código</div>
          <div className="flex-1 text-sm font-semibold">Nome</div>
          <div className="w-24 flex-shrink-0 text-sm font-semibold">Tipo</div>
          <div className="w-24 flex-shrink-0 text-sm font-semibold">Categoria</div>
          <div className="w-40 flex-shrink-0 text-sm font-semibold">Linha DRE</div>
          <div className="flex gap-2 flex-shrink-0 text-sm font-semibold">Ações</div>
        </div>

        {/* Contas */}
        <div>
          {hierarchicalAccounts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Nenhuma conta encontrada. Clique em "Nova Conta" para começar.
            </div>
          ) : (
            hierarchicalAccounts.map(account => renderAccountRow(account, 0))
          )}
        </div>
      </div>

      {/* Dialog de Edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Editar Conta' : 'Nova Conta'}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes da conta contábil
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Código */}
            <div>
              <Label htmlFor="code">Código Contábil</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Ex: 3.1.1.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Formato: X.Y.Z.WW (ex: 3.1.1.00 para Receitas, 4.2.1.00 para Despesas)
              </p>
            </div>

            {/* Nome */}
            <div>
              <Label htmlFor="name">Nome da Conta *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Receita de Vendas"
              />
            </div>

            {/* Tipo */}
            <div>
              <Label htmlFor="type">Tipo *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: 'Receita' | 'Despesa') =>
                  setFormData({ ...formData, type: value })
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

            {/* Tipo de Conta */}
            <div>
              <Label htmlFor="accountType">Tipo de Conta *</Label>
              <Select
                value={formData.accountType}
                onValueChange={(value: 'sintetica' | 'analitica') =>
                  setFormData({ ...formData, accountType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sintetica">Sintética (Grupo)</SelectItem>
                  <SelectItem value="analitica">Analítica (Detalhada)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Sintética = Agrupadora (não recebe lançamentos). Analítica = Recebe lançamentos.
              </p>
            </div>

            {/* Linha DRE */}
            <div>
              <Label htmlFor="dreLineItem">Linha da DRE</Label>
              <Select
                value={formData.dreLineItem}
                onValueChange={(value) =>
                  setFormData({ ...formData, dreLineItem: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma</SelectItem>
                  <SelectItem value="receita_bruta">Receita Bruta</SelectItem>
                  <SelectItem value="deducoes_receita">Deduções da Receita</SelectItem>
                  <SelectItem value="custos">Custos (CMV/CSP/CPV)</SelectItem>
                  <SelectItem value="despesas_operacionais">Despesas Operacionais</SelectItem>
                  <SelectItem value="outras_receitas_despesas">Outras Receitas/Despesas</SelectItem>
                  <SelectItem value="irpj">IRPJ</SelectItem>
                  <SelectItem value="csll">CSLL</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Vínculo direto com a DRE Gerencial
              </p>
            </div>

            {/* Descrição */}
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição opcional"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingCategory ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
