import { useState, useMemo, useEffect } from 'react';
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
import { projectId } from '../utils/supabase/info';
import { useAuth } from '../contexts/AuthContext';

// ==================== TIPOS ====================

interface HierarchicalAccount extends AccountCategory {
  children?: HierarchicalAccount[];
  level?: number;
}

// ==================== COMPONENTE PRINCIPAL ====================

export function ChartOfAccountsHierarchical() {
  const { accountCategories, addAccountCategory, updateAccountCategory, deleteAccountCategory } = useERP();
  const { accessToken } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AccountCategory | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [showInactive, setShowInactive] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'Receita' as 'Receita' | 'Despesa' | 'Ativo' | 'Passivo' | 'Patrimônio Líquido',
    description: '',
    parentId: null as string | null,
    accountType: 'Analítica' as 'Sintética' | 'Analítica',
    dreLineItem: null as string | null,
  });

  // ==================== PLANO DE CONTAS PADRÃO ====================

  const DEFAULT_CHART_OF_ACCOUNTS = [
    // ===== RECEITAS =====
    { code: '3.0.00.00', name: 'RECEITAS', type: 'Receita', accountType: 'Sintética', dreLineItem: 'RECEITA_BRUTA', parentId: null, level: 0, sortOrder: 0 },
    { code: '3.1.00.00', name: 'Receita Bruta de Vendas', type: 'Receita', accountType: 'Sintética', dreLineItem: 'RECEITA_BRUTA', parentId: '3.0.00.00', level: 1, sortOrder: 1 },
    { code: '3.1.01.00', name: 'Venda de Produtos', type: 'Receita', accountType: 'Analítica', dreLineItem: 'RECEITA_BRUTA', parentId: '3.1.00.00', level: 2, sortOrder: 2 },
    { code: '3.1.02.00', name: 'Venda de Serviços', type: 'Receita', accountType: 'Analítica', dreLineItem: 'RECEITA_BRUTA', parentId: '3.1.00.00', level: 2, sortOrder: 3 },
    { code: '3.1.03.00', name: 'Venda de Mercadorias', type: 'Receita', accountType: 'Analítica', dreLineItem: 'RECEITA_BRUTA', parentId: '3.1.00.00', level: 2, sortOrder: 4 },
    
    { code: '3.2.00.00', name: 'Deduções da Receita Bruta', type: 'Receita', accountType: 'Sintética', dreLineItem: 'DEDUCOES', parentId: '3.0.00.00', level: 1, sortOrder: 5 },
    { code: '3.2.01.00', name: 'Devoluções de Vendas', type: 'Receita', accountType: 'Analítica', dreLineItem: 'DEDUCOES', parentId: '3.2.00.00', level: 2, sortOrder: 6 },
    { code: '3.2.02.00', name: 'Descontos Incondicionais', type: 'Receita', accountType: 'Analítica', dreLineItem: 'DEDUCOES', parentId: '3.2.00.00', level: 2, sortOrder: 7 },
    { code: '3.2.03.00', name: 'Impostos sobre Vendas', type: 'Receita', accountType: 'Sintética', dreLineItem: 'IMPOSTOS_VENDAS', parentId: '3.2.00.00', level: 2, sortOrder: 8 },
    { code: '3.2.03.01', name: 'ICMS', type: 'Receita', accountType: 'Analítica', dreLineItem: 'IMPOSTOS_VENDAS', parentId: '3.2.03.00', level: 3, sortOrder: 9 },
    { code: '3.2.03.02', name: 'PIS', type: 'Receita', accountType: 'Analítica', dreLineItem: 'IMPOSTOS_VENDAS', parentId: '3.2.03.00', level: 3, sortOrder: 10 },
    { code: '3.2.03.03', name: 'COFINS', type: 'Receita', accountType: 'Analítica', dreLineItem: 'IMPOSTOS_VENDAS', parentId: '3.2.03.00', level: 3, sortOrder: 11 },
    { code: '3.2.03.04', name: 'ISS', type: 'Receita', accountType: 'Analítica', dreLineItem: 'IMPOSTOS_VENDAS', parentId: '3.2.03.00', level: 3, sortOrder: 12 },
    
    // ===== CUSTOS =====
    { code: '4.0.00.00', name: 'CUSTOS', type: 'Despesa', accountType: 'Sintética', dreLineItem: 'CMV', parentId: null, level: 0, sortOrder: 13 },
    { code: '4.1.00.00', name: 'Custo dos Produtos Vendidos (CPV)', type: 'Despesa', accountType: 'Sintética', dreLineItem: 'CMV', parentId: '4.0.00.00', level: 1, sortOrder: 14 },
    { code: '4.1.01.00', name: 'Matéria-Prima', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'CMV', parentId: '4.1.00.00', level: 2, sortOrder: 15 },
    { code: '4.1.02.00', name: 'Mão de Obra Direta', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'CMV', parentId: '4.1.00.00', level: 2, sortOrder: 16 },
    { code: '4.1.03.00', name: 'Custos Indiretos de Fabricação', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'CMV', parentId: '4.1.00.00', level: 2, sortOrder: 17 },
    
    { code: '4.2.00.00', name: 'Custo das Mercadorias Vendidas (CMV)', type: 'Despesa', accountType: 'Sintética', dreLineItem: 'CMV', parentId: '4.0.00.00', level: 1, sortOrder: 18 },
    { code: '4.2.01.00', name: 'Compra de Mercadorias', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'CMV', parentId: '4.2.00.00', level: 2, sortOrder: 19 },
    { code: '4.2.02.00', name: 'Frete sobre Compras', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'CMV', parentId: '4.2.00.00', level: 2, sortOrder: 20 },
    
    { code: '4.3.00.00', name: 'Custo dos Serviços Prestados (CSP)', type: 'Despesa', accountType: 'Sintética', dreLineItem: 'CMV', parentId: '4.0.00.00', level: 1, sortOrder: 21 },
    { code: '4.3.01.00', name: 'Mão de Obra Direta', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'CMV', parentId: '4.3.00.00', level: 2, sortOrder: 22 },
    { code: '4.3.02.00', name: 'Materiais Aplicados', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'CMV', parentId: '4.3.00.00', level: 2, sortOrder: 23 },
    
    // ===== DESPESAS OPERACIONAIS =====
    { code: '5.0.00.00', name: 'DESPESAS OPERACIONAIS', type: 'Despesa', accountType: 'Sintética', dreLineItem: 'DESPESAS_VENDAS', parentId: null, level: 0, sortOrder: 24 },
    
    { code: '5.1.00.00', name: 'Despesas com Vendas', type: 'Despesa', accountType: 'Sintética', dreLineItem: 'DESPESAS_VENDAS', parentId: '5.0.00.00', level: 1, sortOrder: 25 },
    { code: '5.1.01.00', name: 'Comissões sobre Vendas', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'DESPESAS_VENDAS', parentId: '5.1.00.00', level: 2, sortOrder: 26 },
    { code: '5.1.02.00', name: 'Propaganda e Marketing', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'DESPESAS_VENDAS', parentId: '5.1.00.00', level: 2, sortOrder: 27 },
    { code: '5.1.03.00', name: 'Fretes sobre Vendas', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'DESPESAS_VENDAS', parentId: '5.1.00.00', level: 2, sortOrder: 28 },
    
    { code: '5.2.00.00', name: 'Despesas Administrativas', type: 'Despesa', accountType: 'Sintética', dreLineItem: 'DESPESAS_ADMINISTRATIVAS', parentId: '5.0.00.00', level: 1, sortOrder: 29 },
    { code: '5.2.01.00', name: 'Salários e Encargos', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'DESPESAS_ADMINISTRATIVAS', parentId: '5.2.00.00', level: 2, sortOrder: 30 },
    { code: '5.2.02.00', name: 'Aluguéis', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'DESPESAS_ADMINISTRATIVAS', parentId: '5.2.00.00', level: 2, sortOrder: 31 },
    { code: '5.2.03.00', name: 'Material de Escritório', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'DESPESAS_ADMINISTRATIVAS', parentId: '5.2.00.00', level: 2, sortOrder: 32 },
    { code: '5.2.04.00', name: 'Serviços de Terceiros', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'DESPESAS_ADMINISTRATIVAS', parentId: '5.2.00.00', level: 2, sortOrder: 33 },
    { code: '5.2.05.00', name: 'Despesas com Veículos', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'DESPESAS_ADMINISTRATIVAS', parentId: '5.2.00.00', level: 2, sortOrder: 34 },
    { code: '5.2.06.00', name: 'Telefone e Internet', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'DESPESAS_ADMINISTRATIVAS', parentId: '5.2.00.00', level: 2, sortOrder: 35 },
    { code: '5.2.07.00', name: 'Água, Luz e Gás', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'DESPESAS_ADMINISTRATIVAS', parentId: '5.2.00.00', level: 2, sortOrder: 36 },
    { code: '5.2.08.00', name: 'Depreciação', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'DESPESAS_ADMINISTRATIVAS', parentId: '5.2.00.00', level: 2, sortOrder: 37 },
    
    { code: '5.3.00.00', name: 'Despesas Financeiras', type: 'Despesa', accountType: 'Sintética', dreLineItem: 'DESPESAS_FINANCEIRAS', parentId: '5.0.00.00', level: 1, sortOrder: 38 },
    { code: '5.3.01.00', name: 'Juros Pagos', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'DESPESAS_FINANCEIRAS', parentId: '5.3.00.00', level: 2, sortOrder: 39 },
    { code: '5.3.02.00', name: 'Descontos Concedidos', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'DESPESAS_FINANCEIRAS', parentId: '5.3.00.00', level: 2, sortOrder: 40 },
    { code: '5.3.03.00', name: 'Tarifas Bancárias', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'DESPESAS_FINANCEIRAS', parentId: '5.3.00.00', level: 2, sortOrder: 41 },
    { code: '5.3.04.00', name: 'IOF', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'DESPESAS_FINANCEIRAS', parentId: '5.3.00.00', level: 2, sortOrder: 42 },
    
    // ===== OUTRAS RECEITAS =====
    { code: '6.0.00.00', name: 'OUTRAS RECEITAS E DESPESAS', type: 'Receita', accountType: 'Sintética', dreLineItem: 'RECEITAS_FINANCEIRAS', parentId: null, level: 0, sortOrder: 43 },
    { code: '6.1.00.00', name: 'Receitas Financeiras', type: 'Receita', accountType: 'Sintética', dreLineItem: 'RECEITAS_FINANCEIRAS', parentId: '6.0.00.00', level: 1, sortOrder: 44 },
    { code: '6.1.01.00', name: 'Juros Recebidos', type: 'Receita', accountType: 'Analítica', dreLineItem: 'RECEITAS_FINANCEIRAS', parentId: '6.1.00.00', level: 2, sortOrder: 45 },
    { code: '6.1.02.00', name: 'Descontos Obtidos', type: 'Receita', accountType: 'Analítica', dreLineItem: 'RECEITAS_FINANCEIRAS', parentId: '6.1.00.00', level: 2, sortOrder: 46 },
  ];

  // ==================== INICIALIZAÇÃO AUTOMÁTICA ====================

  useEffect(() => {
    const initializeChartOfAccounts = async () => {
      // Só inicializa se não tiver nenhuma conta E ainda não inicializou
      if (accountCategories.length === 0 && !hasInitialized && accessToken) {
        try {
          console.log('🌱 Inicializando plano de contas padrão...');
          
          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/account-categories/init-default`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ accounts: DEFAULT_CHART_OF_ACCOUNTS }),
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ao criar plano de contas: ${errorText}`);
          }

          const result = await response.json();
          console.log('✅ Plano de contas criado:', result);
          
          // Marca como inicializado
          setHasInitialized(true);
          
          // Força reload do contexto
          window.location.reload();
        } catch (error) {
          console.error('❌ Erro ao inicializar plano de contas:', error);
          alert(`Erro ao criar plano de contas: ${(error as Error).message}`);
        }
      }
    };

    initializeChartOfAccounts();
  }, [accountCategories.length, hasInitialized, accessToken]);

  // ==================== CONSTRUIR HIERARQUIA ====================

  const buildHierarchy = (accounts: AccountCategory[]): HierarchicalAccount[] => {
    const accountMap = new Map<string, HierarchicalAccount>();
    const rootAccounts: HierarchicalAccount[] = [];

    // Primeiro, criar mapa de todas as contas
    accounts.forEach(account => {
      accountMap.set(account.code, { ...account, children: [] });
    });

    // Depois, construir hierarquia
    accounts.forEach(account => {
      const currentAccount = accountMap.get(account.code)!;
      
      if (account.parentId) {
        const parent = accountMap.get(account.parentId);
        if (parent) {
          parent.children!.push(currentAccount);
        } else {
          rootAccounts.push(currentAccount);
        }
      } else {
        rootAccounts.push(currentAccount);
      }
    });

    // Ordenar por sortOrder
    const sortAccounts = (accounts: HierarchicalAccount[]) => {
      accounts.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      accounts.forEach(account => {
        if (account.children && account.children.length > 0) {
          sortAccounts(account.children);
        }
      });
    };

    sortAccounts(rootAccounts);
    return rootAccounts;
  };

  const hierarchicalAccounts = useMemo(() => {
    const activeAccounts = showInactive 
      ? accountCategories 
      : accountCategories.filter(cat => cat.isActive !== false);
    return buildHierarchy(activeAccounts);
  }, [accountCategories, showInactive]);

  // ==================== CONTROLE DE EXPANSÃO ====================

  const toggleNode = (code: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(code)) {
        newSet.delete(code);
      } else {
        newSet.add(code);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    const allCodes = accountCategories.map(cat => cat.code);
    setExpandedNodes(new Set(allCodes));
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  // ==================== DIÁLOGO ====================

  const handleOpenDialog = (category?: AccountCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        code: category.code,
        name: category.name,
        type: category.type,
        description: category.description || '',
        parentId: category.parentId || null,
        accountType: category.accountType || 'Analítica',
        dreLineItem: category.dreLineItem || null,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        code: '',
        name: '',
        type: 'Receita',
        description: '',
        parentId: null,
        accountType: 'Analítica',
        dreLineItem: null,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCategory(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingCategory) {
      updateAccountCategory(editingCategory.id, formData);
    } else {
      addAccountCategory(formData);
    }
    
    handleCloseDialog();
  };

  const handleToggleActive = async (account: AccountCategory) => {
    updateAccountCategory(account.id, { isActive: !account.isActive });
  };

  // ==================== RENDERIZAÇÃO DE NÓ ====================

  const renderNode = (account: HierarchicalAccount, depth: number = 0) => {
    const hasChildren = account.children && account.children.length > 0;
    const isExpanded = expandedNodes.has(account.code);
    const isInactive = account.isActive === false;

    return (
      <div key={account.code}>
        <div
          className={`flex items-center gap-2 py-2 px-3 hover:bg-gray-50 border-l-2 ${
            isInactive ? 'opacity-50 bg-gray-50' : ''
          }`}
          style={{ 
            paddingLeft: `${depth * 24 + 12}px`,
            borderLeftColor: account.type === 'Receita' ? '#10b981' : '#ef4444',
          }}
        >
          {/* Ícone de expansão */}
          <button
            onClick={() => hasChildren && toggleNode(account.code)}
            className="w-5 h-5 flex items-center justify-center"
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )
            ) : (
              <span className="w-4 h-4"></span>
            )}
          </button>

          {/* Código */}
          <span className="font-mono text-sm text-gray-600 w-24">{account.code}</span>

          {/* Nome */}
          <span className={`flex-1 ${account.accountType === 'Sintética' ? 'font-semibold' : ''}`}>
            {account.name}
          </span>

          {/* Badges */}
          <div className="flex items-center gap-2">
            <Badge variant={account.type === 'Receita' ? 'default' : 'destructive'}>
              {account.type}
            </Badge>
            <Badge variant="outline">
              {account.accountType}
            </Badge>
            {account.dreLineItem && (
              <Badge variant="secondary" className="text-xs">
                {account.dreLineItem}
              </Badge>
            )}
            {isInactive && (
              <Badge variant="outline" className="text-red-600">
                Inativa
              </Badge>
            )}
          </div>

          {/* Ações */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleToggleActive(account)}
              title={isInactive ? 'Ativar' : 'Desativar'}
            >
              {isInactive ? (
                <EyeOff className="w-4 h-4 text-gray-500" />
              ) : (
                <Eye className="w-4 h-4 text-gray-500" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenDialog(account)}
            >
              <Pencil className="w-4 h-4 text-blue-600" />
            </Button>
          </div>
        </div>

        {/* Filhos */}
        {hasChildren && isExpanded && (
          <div>
            {account.children!.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // ==================== RENDER PRINCIPAL ====================

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <ListTree className="w-8 h-8 text-green-600" />
            <div>
              <h1 className="text-gray-900">Plano de Contas Hierárquico</h1>
              <p className="text-gray-500 text-sm">
                {accountCategories.length} contas • {hierarchicalAccounts.length} raízes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={expandAll}>
              Expandir Tudo
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              Recolher Tudo
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowInactive(!showInactive)}>
              {showInactive ? 'Ocultar Inativas' : 'Mostrar Inativas'}
            </Button>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Conta
            </Button>
          </div>
        </div>
      </div>

      {/* Árvore */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        {hierarchicalAccounts.length > 0 ? (
          <div className="divide-y">
            {hierarchicalAccounts.map(account => renderNode(account, 0))}
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">
            <ListTree className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>Nenhuma conta encontrada</p>
            <p className="text-sm mt-2">
              {accountCategories.length === 0 
                ? 'O plano de contas padrão será criado automaticamente.'
                : 'Ajuste os filtros ou adicione novas contas.'}
            </p>
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Editar Conta' : 'Nova Conta'}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados da conta contábil
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Código *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="1.1.01.00"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="accountType">Tipo de Conta *</Label>
                <Select
                  value={formData.accountType}
                  onValueChange={(value: 'Sintética' | 'Analítica') =>
                    setFormData({ ...formData, accountType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sintética">Sintética (Agrupadora)</SelectItem>
                    <SelectItem value="Analítica">Analítica (Movimentação)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="name">Nome da Conta *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Caixa, Bancos, Fornecedores..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Natureza *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Receita">Receita</SelectItem>
                    <SelectItem value="Despesa">Despesa</SelectItem>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Passivo">Passivo</SelectItem>
                    <SelectItem value="Patrimônio Líquido">Patrimônio Líquido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="parentId">Conta Pai</Label>
                <Select
                  value={formData.parentId || ''}
                  onValueChange={(value) => setFormData({ ...formData, parentId: value || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhuma (Raiz)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma (Raiz)</SelectItem>
                    {accountCategories
                      .filter(cat => cat.accountType === 'Sintética')
                      .map(cat => (
                        <SelectItem key={cat.id} value={cat.code}>
                          {cat.code} - {cat.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição opcional da conta"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingCategory ? 'Salvar Alterações' : 'Criar Conta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}