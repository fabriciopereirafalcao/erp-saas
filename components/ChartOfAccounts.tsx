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
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export function ChartOfAccounts() {
  const { accountCategories, addAccountCategory, updateAccountCategory, deleteAccountCategory } = useERP();
  const { accessToken } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AccountCategory | null>(null);
  const [dreLines, setDreLines] = useState<DRELine[]>([]);
  const [loadingDreLines, setLoadingDreLines] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Receita' as 'Receita' | 'Despesa',
    description: '',
    code: '',
    accountType: 'analitica' as 'sintetica' | 'analitica',
    dreLineId: '',
    parentId: '',
  });

  // ==================== PLANO DE CONTAS PADRÃO ====================

  const DEFAULT_CHART_OF_ACCOUNTS = [
    // ===== RECEITAS =====
    { code: '3.0.00.00', name: 'RECEITAS', type: 'Receita', accountType: 'Sintética', dreLineItem: null, parentId: null, level: 0, sortOrder: 0 },
    { code: '3.1.00.00', name: 'Receita Bruta de Vendas', type: 'Receita', accountType: 'Sintética', dreLineItem: null, parentId: '3.0.00.00', level: 1, sortOrder: 1 },
    { code: '3.1.01.00', name: 'Venda de Produtos', type: 'Receita', accountType: 'Analítica', dreLineItem: 'RECEITA_BRUTA', parentId: '3.1.00.00', level: 2, sortOrder: 2 },
    { code: '3.1.02.00', name: 'Venda de Serviços', type: 'Receita', accountType: 'Analítica', dreLineItem: 'RECEITA_BRUTA', parentId: '3.1.00.00', level: 2, sortOrder: 3 },
    { code: '3.1.03.00', name: 'Venda de Mercadorias', type: 'Receita', accountType: 'Analítica', dreLineItem: 'RECEITA_BRUTA', parentId: '3.1.00.00', level: 2, sortOrder: 4 },
    
    { code: '3.2.00.00', name: 'Deduções da Receita Bruta', type: 'Receita', accountType: 'Sintética', dreLineItem: null, parentId: '3.0.00.00', level: 1, sortOrder: 5 },
    { code: '3.2.01.00', name: 'Devoluções de Vendas', type: 'Receita', accountType: 'Analítica', dreLineItem: 'DEDUCOES', parentId: '3.2.00.00', level: 2, sortOrder: 6 },
    { code: '3.2.02.00', name: 'Descontos Incondicionais', type: 'Receita', accountType: 'Analítica', dreLineItem: 'DEDUCOES', parentId: '3.2.00.00', level: 2, sortOrder: 7 },
    { code: '3.2.03.00', name: 'Impostos sobre Vendas', type: 'Receita', accountType: 'Sintética', dreLineItem: null, parentId: '3.2.00.00', level: 2, sortOrder: 8 },
    { code: '3.2.03.01', name: 'ICMS', type: 'Receita', accountType: 'Analítica', dreLineItem: 'IMPOSTOS_VENDAS', parentId: '3.2.03.00', level: 3, sortOrder: 9 },
    { code: '3.2.03.02', name: 'PIS', type: 'Receita', accountType: 'Analítica', dreLineItem: 'IMPOSTOS_VENDAS', parentId: '3.2.03.00', level: 3, sortOrder: 10 },
    { code: '3.2.03.03', name: 'COFINS', type: 'Receita', accountType: 'Analítica', dreLineItem: 'IMPOSTOS_VENDAS', parentId: '3.2.03.00', level: 3, sortOrder: 11 },
    { code: '3.2.03.04', name: 'ISS', type: 'Receita', accountType: 'Analítica', dreLineItem: 'IMPOSTOS_VENDAS', parentId: '3.2.03.00', level: 3, sortOrder: 12 },
    { code: '3.2.03.05', name: 'Simples Nacional', type: 'Receita', accountType: 'Analítica', dreLineItem: 'IMPOSTOS_VENDAS', parentId: '3.2.03.00', level: 3, sortOrder: 13 },
    
    // ===== CUSTOS =====
    { code: '4.0.00.00', name: 'CUSTOS', type: 'Despesa', accountType: 'Sintética', dreLineItem: null, parentId: null, level: 0, sortOrder: 14 },
    { code: '4.1.00.00', name: 'Custo dos Produtos Vendidos (CPV)', type: 'Despesa', accountType: 'Sintética', dreLineItem: null, parentId: '4.0.00.00', level: 1, sortOrder: 15 },
    { code: '4.1.01.00', name: 'Matéria-Prima', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'CMV', parentId: '4.1.00.00', level: 2, sortOrder: 16 },
    { code: '4.1.02.00', name: 'Mão de Obra Direta', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'CMV', parentId: '4.1.00.00', level: 2, sortOrder: 17 },
    { code: '4.1.03.00', name: 'Custos Indiretos de Fabricação', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'CMV', parentId: '4.1.00.00', level: 2, sortOrder: 18 },
    
    { code: '4.2.00.00', name: 'Custo das Mercadorias Vendidas (CMV)', type: 'Despesa', accountType: 'Sintética', dreLineItem: null, parentId: '4.0.00.00', level: 1, sortOrder: 19 },
    { code: '4.2.01.00', name: 'Compra de Mercadorias', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'CMV', parentId: '4.2.00.00', level: 2, sortOrder: 20 },
    { code: '4.2.02.00', name: 'Frete sobre Compras', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'CMV', parentId: '4.2.00.00', level: 2, sortOrder: 21 },
    
    { code: '4.3.00.00', name: 'Custo dos Serviços Prestados (CSP)', type: 'Despesa', accountType: 'Sintética', dreLineItem: null, parentId: '4.0.00.00', level: 1, sortOrder: 22 },
    { code: '4.3.01.00', name: 'Mão de Obra Direta', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'CMV', parentId: '4.3.00.00', level: 2, sortOrder: 23 },
    { code: '4.3.02.00', name: 'Materiais Aplicados', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'CMV', parentId: '4.3.00.00', level: 2, sortOrder: 24 },
    
    // ===== DESPESAS OPERACIONAIS =====
    { code: '5.0.00.00', name: 'DESPESAS OPERACIONAIS', type: 'Despesa', accountType: 'Sintética', dreLineItem: null, parentId: null, level: 0, sortOrder: 25 },
    
    { code: '5.1.00.00', name: 'Despesas com Vendas', type: 'Despesa', accountType: 'Sintética', dreLineItem: null, parentId: '5.0.00.00', level: 1, sortOrder: 26 },
    { code: '5.1.01.00', name: 'Comissões sobre Vendas', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'DESPESAS_VENDAS', parentId: '5.1.00.00', level: 2, sortOrder: 27 },
    { code: '5.1.02.00', name: 'Propaganda e Marketing', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'DESPESAS_VENDAS', parentId: '5.1.00.00', level: 2, sortOrder: 28 },
    { code: '5.1.03.00', name: 'Fretes sobre Vendas', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'DESPESAS_VENDAS', parentId: '5.1.00.00', level: 2, sortOrder: 29 },
    
    { code: '5.2.00.00', name: 'Despesas Administrativas', type: 'Despesa', accountType: 'Sintética', dreLineItem: null, parentId: '5.0.00.00', level: 1, sortOrder: 30 },
    { code: '5.2.01.00', name: 'Salários e Encargos', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'DESPESAS_ADMINISTRATIVAS', parentId: '5.2.00.00', level: 2, sortOrder: 31 },
    { code: '5.2.02.00', name: 'Aluguéis', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'DESPESAS_ADMINISTRATIVAS', parentId: '5.2.00.00', level: 2, sortOrder: 32 },
    { code: '5.2.03.00', name: 'Material de Escritório', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'DESPESAS_ADMINISTRATIVAS', parentId: '5.2.00.00', level: 2, sortOrder: 33 },
    { code: '5.2.04.00', name: 'Serviços de Terceiros', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'DESPESAS_ADMINISTRATIVAS', parentId: '5.2.00.00', level: 2, sortOrder: 34 },
    { code: '5.2.05.00', name: 'Despesas com Veículos', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'DESPESAS_ADMINISTRATIVAS', parentId: '5.2.00.00', level: 2, sortOrder: 35 },
    { code: '5.2.06.00', name: 'Telefone e Internet', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'DESPESAS_ADMINISTRATIVAS', parentId: '5.2.00.00', level: 2, sortOrder: 36 },
    { code: '5.2.07.00', name: 'Água, Luz e Gás', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'DESPESAS_ADMINISTRATIVAS', parentId: '5.2.00.00', level: 2, sortOrder: 37 },
    { code: '5.2.08.00', name: 'Depreciação', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'DESPESAS_ADMINISTRATIVAS', parentId: '5.2.00.00', level: 2, sortOrder: 38 },
    
    { code: '5.3.00.00', name: 'Despesas Financeiras', type: 'Despesa', accountType: 'Sintética', dreLineItem: null, parentId: '5.0.00.00', level: 1, sortOrder: 39 },
    { code: '5.3.01.00', name: 'Juros Pagos', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'DESPESAS_FINANCEIRAS', parentId: '5.3.00.00', level: 2, sortOrder: 40 },
    { code: '5.3.02.00', name: 'Descontos Concedidos', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'DESPESAS_FINANCEIRAS', parentId: '5.3.00.00', level: 2, sortOrder: 41 },
    { code: '5.3.03.00', name: 'Tarifas Bancárias', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'DESPESAS_FINANCEIRAS', parentId: '5.3.00.00', level: 2, sortOrder: 42 },
    { code: '5.3.04.00', name: 'IOF', type: 'Despesa', accountType: 'Analítica', dreLineItem: 'DESPESAS_FINANCEIRAS', parentId: '5.3.00.00', level: 2, sortOrder: 43 },
    
    // ===== OUTRAS RECEITAS =====
    { code: '6.0.00.00', name: 'OUTRAS RECEITAS E DESPESAS', type: 'Receita', accountType: 'Sintética', dreLineItem: null, parentId: null, level: 0, sortOrder: 44 },
    { code: '6.1.00.00', name: 'Receitas Financeiras', type: 'Receita', accountType: 'Sintética', dreLineItem: null, parentId: '6.0.00.00', level: 1, sortOrder: 45 },
    { code: '6.1.01.00', name: 'Juros Recebidos', type: 'Receita', accountType: 'Analítica', dreLineItem: 'RECEITAS_FINANCEIRAS', parentId: '6.1.00.00', level: 2, sortOrder: 46 },
    { code: '6.1.02.00', name: 'Descontos Obtidos', type: 'Receita', accountType: 'Analítica', dreLineItem: 'RECEITAS_FINANCEIRAS', parentId: '6.1.00.00', level: 2, sortOrder: 47 },
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

  // ==================== BUSCAR LINHAS DRE ====================
  useEffect(() => {
    const fetchDRELines = async () => {
      if (!accessToken) return; // Aguarda autenticação
      
      setLoadingDreLines(true);
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/dre/structure`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
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
  }, [accessToken]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ✅ NOVA LÓGICA: Criar conta analítica via endpoint inteligente
    if (!editingCategory) {
      // Validar que conta pai foi selecionada
      if (!formData.parentId || formData.parentId === 'ROOT_ACCOUNT') {
        toast.error('Selecione a conta pai onde a nova conta será criada');
        return;
      }

      try {
        const url = `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/account-categories/create-analytical`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            parentId: formData.parentId,
            name: formData.name,
            description: formData.description || formData.name,
          }),
        });

        const result = await response.json();

        if (result.success) {
          toast.success(result.message);
          // Recarregar plano de contas
          window.location.reload();
        } else {
          toast.error(result.error || 'Erro ao criar conta');
        }
      } catch (error) {
        console.error('[CREATE ACCOUNT] Erro:', error);
        toast.error('Erro ao criar conta analítica');
      }

      handleCloseDialog();
      return;
    }

    // ❌ LEGADO: Edição de conta existente (manter lógica antiga)
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
    
    // Transformar ROOT_ACCOUNT em null
    const submissionData = {
      ...formData,
      parentId: formData.parentId === 'ROOT_ACCOUNT' ? '' : formData.parentId
    };
    
    updateAccountCategory(editingCategory.id, submissionData);
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
              {!editingCategory ? (
                /* ========== FORMULÁRIO SIMPLIFICADO: CRIAR NOVA CONTA ========== */
                <>
                  {/* Conta Pai (obrigatório) */}
                  <div className="space-y-2">
                    <Label htmlFor="parentId">Conta Pai * (obrigatório)</Label>
                    <Select
                      value={formData.parentId}
                      onValueChange={(value) => setFormData({ ...formData, parentId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a conta onde deseja adicionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {sortedAccounts
                          .filter((cat) => cat.accountType === 'sintetica')
                          .map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.code} - {category.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      Selecione o grupo (conta sintética) onde a nova conta será criada
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
                    <p className="text-xs text-gray-500">
                      O código será gerado automaticamente de acordo com a conta pai selecionada
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

                  {/* Informativo */}
                  <Alert className="border-blue-200 bg-blue-50">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-sm text-blue-900">
                      <strong>Herança automática:</strong> A nova conta herdará automaticamente o tipo (Receita/Despesa) 
                      e a linha DRE da conta pai selecionada.
                    </AlertDescription>
                  </Alert>
                </>
              ) : (
                /* ========== FORMULÁRIO COMPLETO: EDITAR CONTA EXISTENTE ========== */
                <>
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
                        <SelectItem value="ROOT_ACCOUNT">Nenhuma (conta raiz)</SelectItem>
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
                </>
              )}
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