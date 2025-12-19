import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Search, Package, AlertTriangle, TrendingUp, TrendingDown, Box, Plus, Edit, ArrowLeftRight, MoreVertical, History, Clock, Info, Receipt, Eye, EyeOff } from "lucide-react";
import { useERP } from "../contexts/ERPContext";
import { toast } from "sonner";
import { usePagination } from "../hooks/usePagination";
import { PaginationControls } from "./PaginationControls";
import { formatDateLocal } from "../utils/dateUtils";
import { formatNCM, validateNCM } from "../utils/ncmValidation";
import { FeatureInfoBadge } from "./FeatureInfoBadge";
import { BatchMovementModal } from "./BatchMovementModal";
import { projectId } from "../utils/supabase/info";
import { authFetch } from "../utils/authFetch";

// ✅ Helper para mapear tipos do banco (inglês) para labels em português
const getMovementTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'purchase': 'Entrada',
    'sale': 'Saída',
    'adjustment': 'Ajuste',
    'return': 'Devolução',
    'transfer': 'Transferência'
  };
  return labels[type] || type;
};

// ✅ Helper para verificar se é entrada (purchase, return)
const isInboundMovement = (type: string): boolean => {
  return ['purchase', 'return'].includes(type);
};

export function Inventory() {
  const { inventory, addInventoryItem, updateInventoryItem, addStockMovement, getStockMovementsByProduct, companySettings, productCategories, addProductCategory, deleteProductCategory } = useERP();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [showOutOfStock, setShowOutOfStock] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [ncmError, setNcmError] = useState<string>("");
  const [editNcmError, setEditNcmError] = useState<string>("");
  const [newProduct, setNewProduct] = useState({
    productName: "",
    category: "",
    currentStock: "",
    unit: "kg",
    reorderLevel: "",
    costPrice: "",
    sellPrice: "",
    // Dados Fiscais
    ncm: "",
    cest: "",
    origin: "0",
    serviceCode: "",
    csosn: "",
    cst: "",
    icmsRate: "",
    pisRate: "",
    cofinsRate: "",
    ipiRate: "",
    cfop: "",
    taxCustomized: false,
    // ✅ SPRINT 2: Controle de lotes
    trackBatches: false,
    batchFifoAuto: true,
    // ✅ FASE 1: Lote Inicial Obrigatório
    batchNumber: "",
    manufacturingDate: "",
    expiryDate: "",
    entryType: "Produção",
    otherEntryType: ""
  });
  const [editProduct, setEditProduct] = useState({
    productName: "",
    category: "",
    currentStock: "",
    unit: "kg",
    reorderLevel: "",
    costPrice: "",
    sellPrice: "",
    // Dados Fiscais
    ncm: "",
    cest: "",
    origin: "0",
    serviceCode: "",
    csosn: "",
    cst: "",
    icmsRate: "",
    pisRate: "",
    cofinsRate: "",
    ipiRate: "",
    cfop: "",
    taxCustomized: false,
    // ✅ SPRINT 2: Controle de lotes
    trackBatches: false,
    batchFifoAuto: true
  });
  const [movement, setMovement] = useState({
    quantity: "",
    reason: "",
    costPrice: "",
    sellPrice: ""
  });
  
  // ===== FASE 5: Estados para controle de lotes =====
  const [isBatchMovementModalOpen, setIsBatchMovementModalOpen] = useState(false);
  const [availableBatches, setAvailableBatches] = useState<any[]>([]);

  const filteredInventory = inventory.filter(item => {
    // Filtro de produtos inativos (soft delete)
    if (!showOutOfStock && item.active === false) {
      return false;
    }
    
    // Filtro de busca
    return item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Paginação
  const { paginatedData, pagination, controls } = usePagination(filteredInventory, 25);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      "Em Estoque": "bg-green-100 text-green-700",
      "Baixo Estoque": "bg-yellow-100 text-yellow-700",
      "Fora de Estoque": "bg-red-100 text-red-700"
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const lowStockItems = inventory.filter(item => item.status === "Baixo Estoque").length;
  const outOfStockItems = inventory.filter(item => item.status === "Fora de Estoque").length;
  const totalValue = inventory.reduce((sum, item) => sum + (item.currentStock * item.pricePerUnit), 0);

  const calculateMarkup = (costPrice: number, sellPrice: number): number => {
    if (costPrice === 0) return 0;
    return ((sellPrice - costPrice) / costPrice) * 100;
  };

  // Preencher dados fiscais com valores padrão da empresa
  const loadDefaultTaxData = () => {
    setNewProduct(prev => ({
      ...prev,
      csosn: companySettings.taxRegime === "Simples Nacional" ? (companySettings.defaultCSOSN || "") : "",
      cst: companySettings.taxRegime !== "Simples Nacional" ? (companySettings.defaultCST || "") : "",
      icmsRate: companySettings.defaultICMSRate ? String(companySettings.defaultICMSRate) : "",
      pisRate: companySettings.defaultPISRate ? String(companySettings.defaultPISRate) : "",
      cofinsRate: companySettings.defaultCOFINSRate ? String(companySettings.defaultCOFINSRate) : "",
      taxCustomized: false
    }));
  };

  const loadDefaultTaxDataForEdit = () => {
    setEditProduct(prev => ({
      ...prev,
      csosn: companySettings.taxRegime === "Simples Nacional" ? (companySettings.defaultCSOSN || prev.csosn) : prev.csosn,
      cst: companySettings.taxRegime !== "Simples Nacional" ? (companySettings.defaultCST || prev.cst) : prev.cst,
      icmsRate: prev.icmsRate || (companySettings.defaultICMSRate ? String(companySettings.defaultICMSRate) : ""),
      pisRate: prev.pisRate || (companySettings.defaultPISRate ? String(companySettings.defaultPISRate) : ""),
      cofinsRate: prev.cofinsRate || (companySettings.defaultCOFINSRate ? String(companySettings.defaultCOFINSRate) : ""),
      taxCustomized: false
    }));
  };

  const handleAddProduct = () => {
    if (!newProduct.productName || !newProduct.category || !newProduct.currentStock || 
        !newProduct.reorderLevel || !newProduct.costPrice || !newProduct.sellPrice) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    if (!newProduct.ncm) {
      toast.error("NCM é obrigatório");
      return;
    }

    // Validar formato do NCM
    const ncmValidation = validateNCM(newProduct.ncm);
    if (!ncmValidation.isValid) {
      setNcmError(ncmValidation.message || "NCM inválido");
      toast.error(ncmValidation.message || "NCM inválido");
      return;
    }

    // ✅ FASE 1: Validar lote inicial se controle de lotes estiver ativo
    if (newProduct.trackBatches) {
      if (!newProduct.batchNumber || !newProduct.manufacturingDate) {
        toast.error("Preencha o código do lote e a data de fabricação");
        return;
      }

      if (newProduct.entryType === "Outro" && !newProduct.otherEntryType) {
        toast.error("Especifique o tipo de entrada");
        return;
      }
    }

    const currentStock = Number(newProduct.currentStock);
    const reorderLevel = Number(newProduct.reorderLevel);
    const costPrice = Number(newProduct.costPrice);
    const sellPrice = Number(newProduct.sellPrice);

    if (currentStock < 0 || reorderLevel < 0 || costPrice < 0 || sellPrice < 0) {
      toast.error("Os valores não podem ser negativos");
      return;
    }

    const markup = calculateMarkup(costPrice, sellPrice);

    addInventoryItem({
      productName: newProduct.productName,
      category: newProduct.category,
      currentStock,
      unit: newProduct.unit,
      reorderLevel,
      pricePerUnit: sellPrice,
      costPrice,
      sellPrice,
      markup,
      // Dados Fiscais
      ncm: newProduct.ncm,
      cest: newProduct.cest || undefined,
      origin: newProduct.origin || undefined,
      serviceCode: newProduct.serviceCode || undefined,
      csosn: newProduct.csosn || undefined,
      cst: newProduct.cst || undefined,
      icmsRate: newProduct.icmsRate ? Number(newProduct.icmsRate) : undefined,
      pisRate: newProduct.pisRate ? Number(newProduct.pisRate) : undefined,
      cofinsRate: newProduct.cofinsRate ? Number(newProduct.cofinsRate) : undefined,
      ipiRate: newProduct.ipiRate ? Number(newProduct.ipiRate) : undefined,
      cfop: newProduct.cfop || undefined,
      taxCustomized: newProduct.taxCustomized,
      // ✅ SPRINT 2: Adicionar controle de lotes
      trackBatches: newProduct.trackBatches || false,
      batchFifoAuto: newProduct.batchFifoAuto !== false,
      // ✅ FASE 1: Dados do lote inicial (se aplicável)
      initialBatch: newProduct.trackBatches ? {
        batchNumber: newProduct.batchNumber,
        manufacturingDate: newProduct.manufacturingDate,
        expiryDate: newProduct.expiryDate || undefined,
        entryType: newProduct.entryType === "Outro" ? newProduct.otherEntryType : newProduct.entryType,
        quantity: currentStock
      } : undefined
    });

    // Resetar formulário
    setNewProduct({
      productName: "",
      category: "",
      currentStock: "",
      unit: "kg",
      reorderLevel: "",
      costPrice: "",
      sellPrice: "",
      ncm: "",
      cest: "",
      origin: "0",
      serviceCode: "",
      csosn: "",
      cst: "",
      icmsRate: "",
      pisRate: "",
      cofinsRate: "",
      ipiRate: "",
      cfop: "",
      taxCustomized: false,
      // ✅ SPRINT 2: Resetar controle de lotes
      trackBatches: false,
      batchFifoAuto: true,
      // ✅ FASE 1: Resetar lote inicial
      batchNumber: "",
      manufacturingDate: "",
      expiryDate: "",
      entryType: "Produção",
      otherEntryType: ""
    });
    setNcmError("");
    setIsDialogOpen(false);
  };

  const handleEditProduct = () => {
    if (!selectedProduct) return;

    if (!editProduct.ncm) {
      toast.error("NCM é obrigatório");
      return;
    }

    // Validar formato do NCM
    const ncmValidation = validateNCM(editProduct.ncm);
    if (!ncmValidation.isValid) {
      setEditNcmError(ncmValidation.message || "NCM inválido");
      toast.error(ncmValidation.message || "NCM inválido");
      return;
    }

    const reorderLevel = Number(editProduct.reorderLevel);
    const costPrice = Number(editProduct.costPrice);
    const sellPrice = Number(editProduct.sellPrice);

    const markup = calculateMarkup(costPrice, sellPrice);

    updateInventoryItem(selectedProduct.id, {
      productName: editProduct.productName,
      category: editProduct.category,
      unit: editProduct.unit,
      reorderLevel,
      pricePerUnit: sellPrice,
      costPrice,
      sellPrice,
      markup,
      // Dados Fiscais
      ncm: editProduct.ncm,
      cest: editProduct.cest || undefined,
      origin: editProduct.origin || undefined,
      serviceCode: editProduct.serviceCode || undefined,
      csosn: editProduct.csosn || undefined,
      cst: editProduct.cst || undefined,
      icmsRate: editProduct.icmsRate ? Number(editProduct.icmsRate) : undefined,
      pisRate: editProduct.pisRate ? Number(editProduct.pisRate) : undefined,
      cofinsRate: editProduct.cofinsRate ? Number(editProduct.cofinsRate) : undefined,
      ipiRate: editProduct.ipiRate ? Number(editProduct.ipiRate) : undefined,
      cfop: editProduct.cfop || undefined,
      taxCustomized: editProduct.taxCustomized,
      // ✅ SPRINT 2: Adicionar controle de lotes
      trackBatches: editProduct.trackBatches || false,
      batchFifoAuto: editProduct.batchFifoAuto !== false
    });

    setEditNcmError("");
    setIsEditDialogOpen(false);
    setSelectedProduct(null);
  };

  // ===== FASE 5: Buscar lotes disponíveis de um produto =====
  const fetchProductBatches = async (productId: string) => {
    try {
      console.log('[INVENTORY] 🔍 Buscando lotes do produto:', productId);
      
      // Não usar authFetch aqui para evitar logout em caso de erro
      // Buscar lotes retorna array vazio se não houver lotes (não é erro)
      const response = await authFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/api/batches?productId=${productId}`,
        { method: 'GET' }
      ).catch((err) => {
        console.warn('[INVENTORY] ⚠️ Erro ao buscar lotes (não crítico):', err);
        return null;
      });

      if (!response || !response.ok) {
        console.log('[INVENTORY] ℹ️ Nenhum lote encontrado ou erro na busca');
        return [];
      }

      const result = await response.json();
      console.log('[INVENTORY] ✅ Lotes encontrados:', result.data?.length || 0);
      return result.data || [];
      
    } catch (error: any) {
      console.error('[INVENTORY] ❌ Erro ao buscar lotes:', error);
      // Não mostrar toast de erro - retornar array vazio permite criar novo lote
      return [];
    }
  };

  // ===== FASE 5: Confirmar movimentação com lote =====
  const handleBatchMovementConfirm = async (batchData: any) => {
    try {
      console.log('[INVENTORY] 📦 Processando movimentação com lote...', batchData);
      
      const quantity = Math.abs(Number(movement.quantity)); // Sempre positivo
      const costPrice = Number(movement.costPrice);
      const sellPrice = Number(movement.sellPrice);

      // Mapear motivos para movementType
      const movementTypeMap: Record<string, string> = {
        'Entrada - Produção': 'entrada-producao',
        'Entrada - Devolução': 'entrada-devolucao',
        'Entrada - Ajuste de Inventário': 'entrada-ajuste',
        'Saída - Perda': 'saida-perda',
        'Saída - Doação': 'saida-doacao',
        'Saída - Ajuste de Inventário': 'saida-ajuste',
        'Saída - Consumo Interno': 'saida-consumo'
      };

      const movementType = movementTypeMap[movement.reason];
      
      if (!movementType) {
        toast.error('Tipo de movimentação inválido');
        return;
      }

      // Chamar endpoint
      const response = await authFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/api/stock-movement-with-batch`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: selectedProduct.id,
            quantity,
            movementType,
            costPrice,
            sellPrice,
            batchData
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao processar movimentação');
      }

      const result = await response.json();
      console.log('[INVENTORY] ✅ Movimentação processada:', result);
      
      toast.success('Movimentação registrada com sucesso!');
      
      // Atualizar estoque no contexto local
      updateInventoryItem(selectedProduct.id, {
        currentStock: result.data.newStock,
        costPrice,
        sellPrice,
        pricePerUnit: sellPrice,
        markup: calculateMarkup(costPrice, sellPrice)
      });

      // Fechar modais e limpar estados
      setIsBatchMovementModalOpen(false);
      setIsMovementDialogOpen(false);
      setMovement({ quantity: '', reason: '', costPrice: '', sellPrice: '' });
      setSelectedProduct(null);
      setAvailableBatches([]);

    } catch (error: any) {
      console.error('[INVENTORY] ❌ Erro ao processar movimentação:', error);
      toast.error(error.message || 'Erro ao processar movimentação');
    }
  };

  const handleStockMovement = async () => {
    // ===== VALIDAÇÕES EXISTENTES =====
    if (!selectedProduct || !movement.quantity || !movement.reason) {
      toast.error("Preencha a quantidade e o motivo da movimentação");
      return;
    }

    if (!movement.costPrice || !movement.sellPrice) {
      toast.error("Preencha o custo e o preço de venda");
      return;
    }

    const quantity = Number(movement.quantity);
    const costPrice = Number(movement.costPrice);
    const sellPrice = Number(movement.sellPrice);

    if (costPrice < 0 || sellPrice < 0) {
      toast.error("Custo e preço devem ser valores positivos");
      return;
    }

    // ===== NOVO: VERIFICAR SE TEM CONTROLE DE LOTES =====
    if (selectedProduct.trackBatches) {
      console.log('[INVENTORY] 📦 Produto com controle de lotes detectado');
      console.log('[INVENTORY] 📊 Dados do produto:', {
        id: selectedProduct.id,
        nome: selectedProduct.productName,
        trackBatches: selectedProduct.trackBatches,
        motivo: movement.reason
      });

      // Mapear motivos para movementType
      const movementTypeMap: Record<string, string> = {
        'Entrada - Produção': 'entrada-producao',
        'Entrada - Devolução': 'entrada-devolucao',
        'Entrada - Ajuste de Inventário': 'entrada-ajuste',
        'Saída - Perda': 'saida-perda',
        'Saída - Doação': 'saida-doacao',
        'Saída - Ajuste de Inventário': 'saida-ajuste',
        'Saída - Consumo Interno': 'saida-consumo'
      };

      const movementType = movementTypeMap[movement.reason];

      // Bloquear Compra e Venda para produtos com lotes
      if (movement.reason === 'Entrada - Compra') {
        toast.error('Use o módulo de Compras (Purchase Orders) para registrar entradas de compra em produtos com controle de lotes');
        return;
      }

      if (movement.reason === 'Saída - Venda') {
        toast.error('Use o módulo de Vendas (Sales Orders) para registrar saídas de venda em produtos com controle de lotes');
        return;
      }

      if (!movementType) {
        toast.error('Tipo de movimentação inválido para produtos com controle de lotes');
        return;
      }

      console.log('[INVENTORY] 🔄 Buscando lotes disponíveis...');
      
      // Buscar lotes disponíveis
      const batches = await fetchProductBatches(selectedProduct.id);
      console.log('[INVENTORY] 📋 Lotes recebidos:', batches);
      setAvailableBatches(batches);

      console.log('[INVENTORY] 🎯 Abrindo modal de lotes...');
      
      // Abrir modal de lotes
      setIsBatchMovementModalOpen(true);
      return;
    }

    // ===== FLUXO EXISTENTE PARA PRODUTOS SEM LOTES =====
    const markup = calculateMarkup(costPrice, sellPrice);

    // Registra a movimentação
    addStockMovement(selectedProduct.id, quantity, movement.reason);

    // Atualiza os preços do produto
    updateInventoryItem(selectedProduct.id, {
      costPrice,
      sellPrice,
      pricePerUnit: sellPrice,
      markup
    });

    setMovement({ quantity: "", reason: "", costPrice: "", sellPrice: "" });
    setIsMovementDialogOpen(false);
    setSelectedProduct(null);
  };

  const handleToggleActive = (product: any) => {
    const newActiveState = !product.active;
    updateInventoryItem(product.id, { active: newActiveState });
    toast.success(`Produto ${newActiveState ? "ativado" : "desativado"} com sucesso!`);
  };

  const openEditDialog = (product: any) => {
    setSelectedProduct(product);
    setEditProduct({
      productName: product.productName,
      category: product.category,
      currentStock: String(product.currentStock),
      unit: product.unit,
      reorderLevel: String(product.reorderLevel),
      costPrice: String(product.costPrice),
      sellPrice: String(product.sellPrice),
      // Dados Fiscais
      ncm: product.ncm || "",
      cest: product.cest || "",
      origin: product.origin || "0",
      serviceCode: product.serviceCode || "",
      csosn: product.csosn || "",
      cst: product.cst || "",
      icmsRate: product.icmsRate ? String(product.icmsRate) : "",
      pisRate: product.pisRate ? String(product.pisRate) : "",
      cofinsRate: product.cofinsRate ? String(product.cofinsRate) : "",
      ipiRate: product.ipiRate ? String(product.ipiRate) : "",
      cfop: product.cfop || "",
      taxCustomized: product.taxCustomized || false,
      // Controle de lotes
      trackBatches: product.trackBatches || false,
      batchFifoAuto: product.batchFifoAuto !== false
    });
    setEditNcmError("");
    setIsEditDialogOpen(true);
  };

  const openMovementDialog = (product: any) => {
    setSelectedProduct(product);
    setMovement({
      quantity: "",
      reason: "",
      costPrice: String(product.costPrice || ""),
      sellPrice: String(product.sellPrice || "")
    });
    setIsMovementDialogOpen(true);
  };

  const openHistoryDialog = (product: any) => {
    setSelectedProduct(product);
    setIsHistoryDialogOpen(true);
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      toast.error("Digite um nome para a categoria");
      return;
    }
    
    addProductCategory(newCategoryName.trim());
    setNewCategoryName("");
    setIsCategoryDialogOpen(false);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">Gestão de Estoque</h1>
              {/* Info Badge - Atualização Automática de Estoque */}
              <FeatureInfoBadge 
                title="Atualização Automática de Estoque" 
                variant="green"
                position="inline"
              >
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-3">
                  <p>O estoque é atualizado <strong>automaticamente</strong> quando:</p>
                  
                  <div className="space-y-2">
                    <p className="flex items-start gap-2">
                      <TrendingDown className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span>
                        Um <strong>Pedido de Venda</strong> é marcado como "Entregue" → <strong>Diminui</strong> a quantidade
                      </span>
                    </p>
                    <p className="flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>
                        Um <strong>Pedido de Compra</strong> é marcado como "Recebido" → <strong>Aumenta</strong> a quantidade
                      </span>
                    </p>
                  </div>

                  <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                    <p className="font-semibold mb-2">💡 Status do produto:</p>
                    <ul className="space-y-1 ml-4 list-disc">
                      <li><strong>Em Estoque</strong>: Quantidade acima do nível de reposição</li>
                      <li><strong>Baixo Estoque</strong>: Quantidade no nível de reposição ou abaixo</li>
                      <li><strong>Fora de Estoque</strong>: Quantidade zerada</li>
                    </ul>
                  </div>
                </div>
              </FeatureInfoBadge>
            </div>
            <p className="text-gray-600">Monitore e gerencie o inventário de produtos</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[rgb(32,251,225)] hover:bg-[#1BCFBA] text-[rgb(0,0,0)]">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Adicionar Novo Produto</DialogTitle>
                <DialogDescription>
                  Preencha as informações do produto para adicionar ao estoque.
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="general" className="w-full">
                <TabsList className={`grid w-full ${newProduct.trackBatches ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <TabsTrigger value="general">
                    <Package className="w-4 h-4 mr-2" />
                    Dados Gerais
                  </TabsTrigger>
                  <TabsTrigger value="fiscal">
                    <Receipt className="w-4 h-4 mr-2" />
                    Dados Fiscais
                  </TabsTrigger>
                  {newProduct.trackBatches && (
                    <TabsTrigger value="batch">
                      <Box className="w-4 h-4 mr-2" />
                      Lote Inicial
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="general" className="space-y-4 mt-4">
              <div className="grid gap-4">
                {/* Nome do Produto */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="productName" className="text-right">
                    Produto *
                  </Label>
                  <Input
                    id="productName"
                    value={newProduct.productName}
                    onChange={(e) => setNewProduct({...newProduct, productName: e.target.value})}
                    placeholder="Nome do produto"
                    className="col-span-3"
                  />
                </div>

                {/* Categoria */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category" className="text-right">
                    Categoria *
                  </Label>
                  <div className="col-span-3 flex gap-2">
                    <Select 
                      value={newProduct.category} 
                      onValueChange={(value) => setNewProduct({...newProduct, category: value})}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {productCategories.length === 0 && (
                          <div className="px-2 py-6 text-center text-sm text-gray-500">
                            Nenhuma categoria cadastrada.<br />
                            Clique no botão + para adicionar.
                          </div>
                        )}
                        {productCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                      <DialogTrigger asChild>
                        <Button type="button" size="icon" variant="outline" className="flex-shrink-0">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Adicionar Nova Categoria</DialogTitle>
                          <DialogDescription>
                            Digite o nome da nova categoria de produto.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="newCategory" className="text-right">
                              Nome *
                            </Label>
                            <Input
                              id="newCategory"
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                              placeholder="Ex: Grãos, Cereais, Bebidas"
                              className="col-span-3"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddCategory();
                                }
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setNewCategoryName("");
                              setIsCategoryDialogOpen(false);
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="button"
                            onClick={handleAddCategory}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Adicionar
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {/* Estoque Atual e Unidade */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="currentStock" className="text-right">
                    Estoque Atual *
                  </Label>
                  <div className="col-span-3 flex gap-2">
                    <Input
                      id="currentStock"
                      type="number"
                      value={newProduct.currentStock}
                      onChange={(e) => setNewProduct({...newProduct, currentStock: e.target.value})}
                      placeholder="Quantidade"
                      className="flex-1"
                      min="0"
                    />
                    <Select 
                      value={newProduct.unit} 
                      onValueChange={(value) => setNewProduct({...newProduct, unit: value})}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="l">litro</SelectItem>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="un">unidade</SelectItem>
                        <SelectItem value="cx">caixa</SelectItem>
                        <SelectItem value="pct">pacote</SelectItem>
                        <SelectItem value="sc">saco</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Nível de Reposição */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="reorderLevel" className="text-right">
                    Nível Mínimo *
                  </Label>
                  <Input
                    id="reorderLevel"
                    type="number"
                    value={newProduct.reorderLevel}
                    onChange={(e) => setNewProduct({...newProduct, reorderLevel: e.target.value})}
                    placeholder="Quantidade mínima"
                    className="col-span-3"
                    min="0"
                  />
                </div>

                {/* Custo do Produto */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="costPrice" className="text-right">
                    Custo *
                  </Label>
                  <div className="col-span-3 relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
                    <Input
                      id="costPrice"
                      type="number"
                      value={newProduct.costPrice}
                      onChange={(e) => setNewProduct({...newProduct, costPrice: e.target.value})}
                      placeholder="0.00"
                      className="pl-10"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                {/* Preço de Venda */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="sellPrice" className="text-right">
                    Preço de Venda *
                  </Label>
                  <div className="col-span-3 relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
                    <Input
                      id="sellPrice"
                      type="number"
                      value={newProduct.sellPrice}
                      onChange={(e) => setNewProduct({...newProduct, sellPrice: e.target.value})}
                      placeholder="0.00"
                      className="pl-10"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                {/* Markup Calculado */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">
                    Markup %
                  </Label>
                  <div className="col-span-3">
                    {newProduct.costPrice && newProduct.sellPrice && Number(newProduct.costPrice) > 0 && Number(newProduct.sellPrice) > 0 ? (
                      <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-md border border-blue-200">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        <span className="text-blue-900">
                          {calculateMarkup(Number(newProduct.costPrice), Number(newProduct.sellPrice)).toFixed(2)}%
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                        <TrendingUp className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">
                          Preencha o custo e preço de venda
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
                </TabsContent>

                <TabsContent value="fiscal" className="space-y-4 mt-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-800">
                        <strong>Campos já vêm preenchidos</strong> com base nas configurações da empresa. Você pode personalizar para este produto.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    {/* Identificação Fiscal */}
                    <div className="space-y-3">
                      <h4 className="text-sm text-gray-700">Identificação Fiscal</h4>
                      
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="ncm" className="text-right">
                          NCM *
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-3 h-3 text-gray-400 inline ml-1" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>NCM define a tributação do produto</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        <div className="col-span-3 space-y-1">
                          <Input
                            id="ncm"
                            value={newProduct.ncm}
                            onChange={(e) => {
                              const formatted = formatNCM(e.target.value);
                              setNewProduct({...newProduct, ncm: formatted});
                              
                              // Validar em tempo real
                              const validation = validateNCM(formatted);
                              setNcmError(validation.isValid ? "" : validation.message || "");
                            }}
                            onBlur={() => {
                              // Validação final ao sair do campo
                              const validation = validateNCM(newProduct.ncm);
                              setNcmError(validation.isValid ? "" : validation.message || "");
                            }}
                            placeholder="0000.00.00"
                            className={ncmError ? "border-red-500 focus:ring-red-500" : ""}
                            maxLength={10}
                          />
                          {ncmError && (
                            <p className="text-xs text-red-600 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {ncmError}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="cest" className="text-right">CEST</Label>
                        <Input
                          id="cest"
                          value={newProduct.cest}
                          onChange={(e) => setNewProduct({...newProduct, cest: e.target.value})}
                          placeholder="00.000.00"
                          className="col-span-3"
                        />
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="origin" className="text-right">Origem da Mercadoria</Label>
                        <Select
                          value={newProduct.origin}
                          onValueChange={(value) => setNewProduct({...newProduct, origin: value})}
                        >
                          <SelectTrigger className="col-span-3">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">0 - Nacional</SelectItem>
                            <SelectItem value="1">1 - Estrangeira (Importação direta)</SelectItem>
                            <SelectItem value="2">2 - Estrangeira (Adquirida no mercado interno)</SelectItem>
                            <SelectItem value="3">3 - Nacional com mais de 40% de conteúdo estrangeiro</SelectItem>
                            <SelectItem value="4">4 - Nacional, produção em conformidade</SelectItem>
                            <SelectItem value="5">5 - Nacional com menos de 40% de conteúdo estrangeiro</SelectItem>
                            <SelectItem value="6">6 - Estrangeira (Importação direta, sem similar nacional)</SelectItem>
                            <SelectItem value="7">7 - Estrangeira (Adquirida no mercado interno, sem similar nacional)</SelectItem>
                            <SelectItem value="8">8 - Nacional com mais de 70% de conteúdo estrangeiro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="serviceCode" className="text-right">Código de Serviço</Label>
                        <Input
                          id="serviceCode"
                          value={newProduct.serviceCode}
                          onChange={(e) => setNewProduct({...newProduct, serviceCode: e.target.value})}
                          placeholder="Apenas para produtos de serviço"
                          className="col-span-3"
                        />
                      </div>
                    </div>

                    {/* Tributação */}
                    <div className="space-y-3 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm text-gray-700">Tributação</h4>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={loadDefaultTaxData}
                          className="text-xs"
                        >
                          <Receipt className="w-3 h-3 mr-1" />
                          Carregar padrões da empresa
                        </Button>
                      </div>

                      {companySettings.taxRegime === "Simples Nacional" && (
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="csosn" className="text-right">
                            CSOSN
                            {newProduct.taxCustomized && <span className="text-xs text-orange-600 ml-1">(Personalizado)</span>}
                          </Label>
                          <Input
                            id="csosn"
                            value={newProduct.csosn}
                            onChange={(e) => setNewProduct({...newProduct, csosn: e.target.value, taxCustomized: true})}
                            placeholder={companySettings.defaultCSOSN || "102"}
                            className="col-span-3"
                          />
                        </div>
                      )}

                      {companySettings.taxRegime !== "Simples Nacional" && (
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="cst" className="text-right">
                            CST
                            {newProduct.taxCustomized && <span className="text-xs text-orange-600 ml-1">(Personalizado)</span>}
                          </Label>
                          <Input
                            id="cst"
                            value={newProduct.cst}
                            onChange={(e) => setNewProduct({...newProduct, cst: e.target.value, taxCustomized: true})}
                            placeholder={companySettings.defaultCST || "00"}
                            className="col-span-3"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="icmsRate" className="text-right">
                          Alíquota ICMS (%)
                          {newProduct.taxCustomized && <span className="text-xs text-orange-600 ml-1">(Personalizado)</span>}
                        </Label>
                        <Input
                          id="icmsRate"
                          type="number"
                          step="0.01"
                          value={newProduct.icmsRate}
                          onChange={(e) => setNewProduct({...newProduct, icmsRate: e.target.value, taxCustomized: true})}
                          placeholder={companySettings.defaultICMSRate?.toString() || "18.00"}
                          className="col-span-3"
                        />
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="pisRate" className="text-right">
                          Alíquota PIS (%)
                          {newProduct.taxCustomized && <span className="text-xs text-orange-600 ml-1">(Personalizado)</span>}
                        </Label>
                        <Input
                          id="pisRate"
                          type="number"
                          step="0.01"
                          value={newProduct.pisRate}
                          onChange={(e) => setNewProduct({...newProduct, pisRate: e.target.value, taxCustomized: true})}
                          placeholder={companySettings.defaultPISRate?.toString() || "0.65"}
                          className="col-span-3"
                        />
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="cofinsRate" className="text-right">
                          Alíquota COFINS (%)
                          {newProduct.taxCustomized && <span className="text-xs text-orange-600 ml-1">(Personalizado)</span>}
                        </Label>
                        <Input
                          id="cofinsRate"
                          type="number"
                          step="0.01"
                          value={newProduct.cofinsRate}
                          onChange={(e) => setNewProduct({...newProduct, cofinsRate: e.target.value, taxCustomized: true})}
                          placeholder={companySettings.defaultCOFINSRate?.toString() || "3.00"}
                          className="col-span-3"
                        />
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="ipiRate" className="text-right">IPI (%) - se aplicável</Label>
                        <Input
                          id="ipiRate"
                          type="number"
                          step="0.01"
                          value={newProduct.ipiRate}
                          onChange={(e) => setNewProduct({...newProduct, ipiRate: e.target.value})}
                          placeholder="0.00"
                          className="col-span-3"
                        />
                      </div>
                    </div>

                    {/* CFOP Específico */}
                    <div className="space-y-3 pt-4 border-t">
                      <h4 className="text-sm text-gray-700">CFOP Específico (Opcional)</h4>
                      
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="cfop" className="text-right">
                          CFOP Override
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-3 h-3 text-gray-400 inline ml-1" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Se preenchido, substitui o CFOP padrão da empresa</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        <Input
                          id="cfop"
                          value={newProduct.cfop}
                          onChange={(e) => setNewProduct({...newProduct, cfop: e.target.value})}
                          placeholder="Ex: 5102"
                          className="col-span-3"
                        />
                      </div>
                    </div>

                    {/* Controle de Lotes */}
                    <div className="space-y-3 pt-4 border-t">
                      <h4 className="text-sm text-gray-700">Controle de Lotes</h4>
                      
                      <div className="flex items-center space-x-2 col-span-full">
                        <input
                          type="checkbox"
                          id="trackBatches"
                          checked={newProduct.trackBatches || false}
                          onChange={(e) => setNewProduct({...newProduct, trackBatches: e.target.checked})}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <Label htmlFor="trackBatches" className="cursor-pointer">
                          Controlar Lotes de Fabricação
                        </Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-3 h-3 text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Exigirá informar lote em compras e vendas deste produto</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>

                      {newProduct.trackBatches && (
                        <div className="flex items-center space-x-2 col-span-full ml-6">
                          <input
                            type="checkbox"
                            id="batchFifoAuto"
                            checked={newProduct.batchFifoAuto !== false}
                            onChange={(e) => setNewProduct({...newProduct, batchFifoAuto: e.target.checked})}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <Label htmlFor="batchFifoAuto" className="cursor-pointer">
                            Usar FIFO automático (consumir lotes mais antigos primeiro)
                          </Label>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* ✅ FASE 1: Aba de Lote Inicial (condicional) */}
                {newProduct.trackBatches && (
                  <TabsContent value="batch" className="space-y-4 mt-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-800">
                          <strong>Lote Inicial Obrigatório:</strong> Produtos com controle de lotes exigem a criação de um lote para o estoque inicial.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4">
                      {/* Código do Lote */}
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="batchNumber" className="text-right">
                          Código do Lote *
                        </Label>
                        <Input
                          id="batchNumber"
                          value={newProduct.batchNumber}
                          onChange={(e) => setNewProduct({...newProduct, batchNumber: e.target.value})}
                          placeholder="Ex: LOTE-2024-001"
                          className="col-span-3"
                        />
                      </div>

                      {/* Tipo de Entrada */}
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="entryType" className="text-right">
                          Tipo de Entrada *
                        </Label>
                        <Select
                          value={newProduct.entryType}
                          onValueChange={(value) => setNewProduct({...newProduct, entryType: value})}
                        >
                          <SelectTrigger className="col-span-3">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Produção">Produção</SelectItem>
                            <SelectItem value="Compra">Compra</SelectItem>
                            <SelectItem value="Ajuste de Estoque Inicial">Ajuste de Estoque Inicial</SelectItem>
                            <SelectItem value="Outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Campo "Outro" (condicional) */}
                      {newProduct.entryType === "Outro" && (
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="otherEntryType" className="text-right">
                            Especificar *
                          </Label>
                          <Input
                            id="otherEntryType"
                            value={newProduct.otherEntryType}
                            onChange={(e) => setNewProduct({...newProduct, otherEntryType: e.target.value})}
                            placeholder="Especifique o tipo de entrada"
                            className="col-span-3"
                          />
                        </div>
                      )}

                      {/* Data de Fabricação */}
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="manufacturingDate" className="text-right">
                          Data de Fabricação *
                        </Label>
                        <Input
                          id="manufacturingDate"
                          type="date"
                          value={newProduct.manufacturingDate}
                          onChange={(e) => setNewProduct({...newProduct, manufacturingDate: e.target.value})}
                          className="col-span-3"
                        />
                      </div>

                      {/* Data de Validade */}
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="expiryDate" className="text-right">
                          Data de Validade
                          <span className="text-xs text-gray-500 ml-1">(Opcional)</span>
                        </Label>
                        <Input
                          id="expiryDate"
                          type="date"
                          value={newProduct.expiryDate}
                          onChange={(e) => setNewProduct({...newProduct, expiryDate: e.target.value})}
                          className="col-span-3"
                        />
                      </div>

                      {/* Quantidade (já preenchida) */}
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right text-gray-600">
                          Quantidade do Lote
                        </Label>
                        <div className="col-span-3">
                          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md border">
                            <Package className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-700">
                              {newProduct.currentStock || "0"} {newProduct.unit}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                              (mesma quantidade do estoque inicial)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                )}
              </Tabs>

              <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddProduct} className="bg-blue-600 hover:bg-blue-700">
                  Adicionar Produto
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Box className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total de Produtos</p>
                <p className="text-gray-900">{inventory.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Baixo Estoque</p>
                <p className="text-gray-900">{lowStockItems}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Fora de Estoque</p>
                <p className="text-gray-900">{outOfStockItems}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Valor Total</p>
                <p className="text-gray-900">R$ {totalValue.toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Pesquisar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant={showOutOfStock ? "default" : "outline"}
            onClick={() => setShowOutOfStock(!showOutOfStock)}
            className="whitespace-nowrap"
          >
            {showOutOfStock ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showOutOfStock ? "Ocultar Inativos" : "Mostrar Inativos"}
          </Button>
        </div>
      </div>

      {/* Inventory Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Ações</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Estoque Atual</TableHead>
              <TableHead>Custo</TableHead>
              <TableHead>Preço Venda</TableHead>
              <TableHead>Markup %</TableHead>
              <TableHead>Valor Total Estoque</TableHead>
              <TableHead>Última Atualização</TableHead>
              <TableHead>Status Estoque</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((item) => (
              <TableRow 
                key={item.id}
                className={item.active === false ? "opacity-60" : ""}
              >
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => openEditDialog(item)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar Produto
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openMovementDialog(item)}>
                        <ArrowLeftRight className="w-4 h-4 mr-2" />
                        Movimentação de Estoque
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openHistoryDialog(item)}>
                        <History className="w-4 h-4 mr-2" />
                        Histórico de Movimentações
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleToggleActive(item)}
                        className={item.active !== false ? "text-orange-600" : "text-green-600"}
                      >
                        {item.active !== false ? (
                          <>
                            <Box className="mr-2 h-4 w-4" />
                            Desativar Produto
                          </>
                        ) : (
                          <>
                            <Package className="mr-2 h-4 w-4" />
                            Ativar Produto
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm text-muted-foreground">
                    {item.sku}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-gray-400" />
                    {item.productName}
                    {/* Badge de controle de lotes */}
                    {item.trackBatches && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        <Package className="w-3 h-3 mr-1" />
                        Lotes
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {item.currentStock <= item.reorderLevel ? (
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    ) : (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    )}
                    {item.currentStock.toLocaleString('pt-BR')} {item.unit}
                  </div>
                </TableCell>
                <TableCell>R$ {item.costPrice.toFixed(2)}</TableCell>
                <TableCell>R$ {item.sellPrice.toFixed(2)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-green-600" />
                    <span className="text-green-700">{item.markup.toFixed(2)}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-blue-700">
                    R$ {(item.currentStock * item.sellPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </TableCell>
                <TableCell>
                  {item.lastRestocked 
                    ? new Date(item.lastRestocked).toLocaleDateString('pt-BR')
                    : '-'
                  }
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(item.status)}>
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={item.active !== false ? "default" : "secondary"} className={
                    item.active !== false
                      ? "bg-green-100 text-green-700 hover:bg-green-200" 
                      : "bg-red-100 text-red-700 hover:bg-red-200"
                  }>
                    {item.active !== false ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>



      {/* Dialog de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
            <DialogDescription>
              Atualize as informações do produto.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">
                <Package className="w-4 h-4 mr-2" />
                Dados Gerais
              </TabsTrigger>
              <TabsTrigger value="fiscal">
                <Receipt className="w-4 h-4 mr-2" />
                Dados Fiscais
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 mt-4">
          <div className="grid gap-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-productName" className="text-right">Produto *</Label>
              <Input
                id="edit-productName"
                value={editProduct.productName}
                onChange={(e) => setEditProduct({...editProduct, productName: e.target.value})}
                placeholder="Nome do produto"
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-category" className="text-right">Categoria *</Label>
              <div className="col-span-3 flex gap-2">
                <Select 
                  value={editProduct.category} 
                  onValueChange={(value) => setEditProduct({...editProduct, category: value})}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {productCategories.length === 0 && (
                      <div className="px-2 py-6 text-center text-sm text-gray-500">
                        Nenhuma categoria cadastrada.<br />
                        Clique no botão + para adicionar.
                      </div>
                    )}
                    {productCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" size="icon" variant="outline" className="flex-shrink-0">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Nova Categoria</DialogTitle>
                      <DialogDescription>
                        Digite o nome da nova categoria de produto.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="newCategoryEdit" className="text-right">
                          Nome *
                        </Label>
                        <Input
                          id="newCategoryEdit"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Ex: Grãos, Cereais, Bebidas"
                          className="col-span-3"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCategory();
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setNewCategoryName("");
                          setIsCategoryDialogOpen(false);
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        onClick={handleAddCategory}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Adicionar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-currentStock" className="text-right">Estoque Atual</Label>
              <div className="col-span-3 flex gap-2">
                <Input
                  id="edit-currentStock"
                  type="number"
                  value={editProduct.currentStock}
                  placeholder="Quantidade"
                  className="flex-1 bg-gray-100"
                  min="0"
                  disabled
                />
                <Select 
                  value={editProduct.unit} 
                  onValueChange={(value) => setEditProduct({...editProduct, unit: value})}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="l">litro</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="un">unidade</SelectItem>
                    <SelectItem value="cx">caixa</SelectItem>
                    <SelectItem value="pct">pacote</SelectItem>
                    <SelectItem value="sc">saco</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-start-2 col-span-3">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Use "Movimentação de Estoque" para alterar quantidades
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-reorderLevel" className="text-right">Nível Mínimo *</Label>
              <Input
                id="edit-reorderLevel"
                type="number"
                value={editProduct.reorderLevel}
                onChange={(e) => setEditProduct({...editProduct, reorderLevel: e.target.value})}
                placeholder="Quantidade mínima"
                className="col-span-3"
                min="0"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-costPrice" className="text-right">Custo *</Label>
              <div className="col-span-3 relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
                <Input
                  id="edit-costPrice"
                  type="number"
                  value={editProduct.costPrice}
                  onChange={(e) => setEditProduct({...editProduct, costPrice: e.target.value})}
                  placeholder="0.00"
                  className="pl-10"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-sellPrice" className="text-right">Preço de Venda *</Label>
              <div className="col-span-3 relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
                <Input
                  id="edit-sellPrice"
                  type="number"
                  value={editProduct.sellPrice}
                  onChange={(e) => setEditProduct({...editProduct, sellPrice: e.target.value})}
                  placeholder="0.00"
                  className="pl-10"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Markup %</Label>
              <div className="col-span-3">
                {editProduct.costPrice && editProduct.sellPrice && Number(editProduct.costPrice) > 0 && Number(editProduct.sellPrice) > 0 ? (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-md border border-blue-200">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span className="text-blue-900">
                      {calculateMarkup(Number(editProduct.costPrice), Number(editProduct.sellPrice)).toFixed(2)}%
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                    <TrendingUp className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">
                      Preencha o custo e preço de venda
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
            </TabsContent>

            <TabsContent value="fiscal" className="space-y-4 mt-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800">
                    <strong>Campos já vêm preenchidos</strong> com base nas configurações da empresa. Você pode personalizar para este produto.
                  </p>
                </div>
              </div>

              <div className="grid gap-4">
                {/* Identificação Fiscal */}
                <div className="space-y-3">
                  <h4 className="text-sm text-gray-700">Identificação Fiscal</h4>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-ncm" className="text-right">
                      NCM *
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3 h-3 text-gray-400 inline ml-1" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>NCM define a tributação do produto</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <div className="col-span-3 space-y-1">
                      <Input
                        id="edit-ncm"
                        value={editProduct.ncm}
                        onChange={(e) => {
                          const formatted = formatNCM(e.target.value);
                          setEditProduct({...editProduct, ncm: formatted});
                          
                          // Validar em tempo real
                          const validation = validateNCM(formatted);
                          setEditNcmError(validation.isValid ? "" : validation.message || "");
                        }}
                        onBlur={() => {
                          // Validação final ao sair do campo
                          const validation = validateNCM(editProduct.ncm);
                          setEditNcmError(validation.isValid ? "" : validation.message || "");
                        }}
                        placeholder="0000.00.00"
                        className={editNcmError ? "border-red-500 focus:ring-red-500" : ""}
                        maxLength={10}
                      />
                      {editNcmError && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {editNcmError}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-cest" className="text-right">CEST</Label>
                    <Input
                      id="edit-cest"
                      value={editProduct.cest}
                      onChange={(e) => setEditProduct({...editProduct, cest: e.target.value})}
                      placeholder="00.000.00"
                      className="col-span-3"
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-origin" className="text-right">Origem da Mercadoria</Label>
                    <Select
                      value={editProduct.origin}
                      onValueChange={(value) => setEditProduct({...editProduct, origin: value})}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0 - Nacional</SelectItem>
                        <SelectItem value="1">1 - Estrangeira (Importação direta)</SelectItem>
                        <SelectItem value="2">2 - Estrangeira (Adquirida no mercado interno)</SelectItem>
                        <SelectItem value="3">3 - Nacional com mais de 40% de conteúdo estrangeiro</SelectItem>
                        <SelectItem value="4">4 - Nacional, produção em conformidade</SelectItem>
                        <SelectItem value="5">5 - Nacional com menos de 40% de conteúdo estrangeiro</SelectItem>
                        <SelectItem value="6">6 - Estrangeira (Importação direta, sem similar nacional)</SelectItem>
                        <SelectItem value="7">7 - Estrangeira (Adquirida no mercado interno, sem similar nacional)</SelectItem>
                        <SelectItem value="8">8 - Nacional com mais de 70% de conteúdo estrangeiro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-serviceCode" className="text-right">Código de Serviço</Label>
                    <Input
                      id="edit-serviceCode"
                      value={editProduct.serviceCode}
                      onChange={(e) => setEditProduct({...editProduct, serviceCode: e.target.value})}
                      placeholder="Apenas para produtos de serviço"
                      className="col-span-3"
                    />
                  </div>
                </div>

                {/* Tributação */}
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm text-gray-700">Tributação</h4>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={loadDefaultTaxDataForEdit}
                      className="text-xs"
                    >
                      <Receipt className="w-3 h-3 mr-1" />
                      Carregar padrões da empresa
                    </Button>
                  </div>

                  {companySettings.taxRegime === "Simples Nacional" && (
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-csosn" className="text-right">
                        CSOSN
                        {editProduct.taxCustomized && <span className="text-xs text-orange-600 ml-1">(Personalizado)</span>}
                      </Label>
                      <Input
                        id="edit-csosn"
                        value={editProduct.csosn}
                        onChange={(e) => setEditProduct({...editProduct, csosn: e.target.value, taxCustomized: true})}
                        placeholder={companySettings.defaultCSOSN || "102"}
                        className="col-span-3"
                      />
                    </div>
                  )}

                  {companySettings.taxRegime !== "Simples Nacional" && (
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-cst" className="text-right">
                        CST
                        {editProduct.taxCustomized && <span className="text-xs text-orange-600 ml-1">(Personalizado)</span>}
                      </Label>
                      <Input
                        id="edit-cst"
                        value={editProduct.cst}
                        onChange={(e) => setEditProduct({...editProduct, cst: e.target.value, taxCustomized: true})}
                        placeholder={companySettings.defaultCST || "00"}
                        className="col-span-3"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-icmsRate" className="text-right">
                      Alíquota ICMS (%)
                      {editProduct.taxCustomized && <span className="text-xs text-orange-600 ml-1">(Personalizado)</span>}
                    </Label>
                    <Input
                      id="edit-icmsRate"
                      type="number"
                      step="0.01"
                      value={editProduct.icmsRate}
                      onChange={(e) => setEditProduct({...editProduct, icmsRate: e.target.value, taxCustomized: true})}
                      placeholder={companySettings.defaultICMSRate?.toString() || "18.00"}
                      className="col-span-3"
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-pisRate" className="text-right">
                      Alíquota PIS (%)
                      {editProduct.taxCustomized && <span className="text-xs text-orange-600 ml-1">(Personalizado)</span>}
                    </Label>
                    <Input
                      id="edit-pisRate"
                      type="number"
                      step="0.01"
                      value={editProduct.pisRate}
                      onChange={(e) => setEditProduct({...editProduct, pisRate: e.target.value, taxCustomized: true})}
                      placeholder={companySettings.defaultPISRate?.toString() || "0.65"}
                      className="col-span-3"
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-cofinsRate" className="text-right">
                      Alíquota COFINS (%)
                      {editProduct.taxCustomized && <span className="text-xs text-orange-600 ml-1">(Personalizado)</span>}
                    </Label>
                    <Input
                      id="edit-cofinsRate"
                      type="number"
                      step="0.01"
                      value={editProduct.cofinsRate}
                      onChange={(e) => setEditProduct({...editProduct, cofinsRate: e.target.value, taxCustomized: true})}
                      placeholder={companySettings.defaultCOFINSRate?.toString() || "3.00"}
                      className="col-span-3"
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-ipiRate" className="text-right">IPI (%) - se aplicável</Label>
                    <Input
                      id="edit-ipiRate"
                      type="number"
                      step="0.01"
                      value={editProduct.ipiRate}
                      onChange={(e) => setEditProduct({...editProduct, ipiRate: e.target.value})}
                      placeholder="0.00"
                      className="col-span-3"
                    />
                  </div>
                </div>

                {/* CFOP Específico */}
                <div className="space-y-3 pt-4 border-t">
                  <h4 className="text-sm text-gray-700">CFOP Específico (Opcional)</h4>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-cfop" className="text-right">
                      CFOP Override
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3 h-3 text-gray-400 inline ml-1" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Se preenchido, substitui o CFOP padrão da empresa</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Input
                      id="edit-cfop"
                      value={editProduct.cfop}
                      onChange={(e) => setEditProduct({...editProduct, cfop: e.target.value})}
                      placeholder="Ex: 5102"
                      className="col-span-3"
                    />
                  </div>
                </div>

                {/* Controle de Lotes */}
                <div className="space-y-3 pt-4 border-t">
                  <h4 className="text-sm text-gray-700">Controle de Lotes</h4>
                  
                  <div className="flex items-center space-x-2 col-span-full">
                    <input
                      type="checkbox"
                      id="edit-trackBatches"
                      checked={editProduct.trackBatches || false}
                      onChange={(e) => setEditProduct({...editProduct, trackBatches: e.target.checked})}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <Label htmlFor="edit-trackBatches" className="cursor-pointer">
                      Controlar Lotes de Fabricação
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3 h-3 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Exigirá informar lote em compras e vendas deste produto</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {editProduct.trackBatches && (
                    <div className="flex items-center space-x-2 col-span-full ml-6">
                      <input
                        type="checkbox"
                        id="edit-batchFifoAuto"
                        checked={editProduct.batchFifoAuto !== false}
                        onChange={(e) => setEditProduct({...editProduct, batchFifoAuto: e.target.checked})}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <Label htmlFor="edit-batchFifoAuto" className="cursor-pointer">
                        Usar FIFO automático (consumir lotes mais antigos primeiro)
                      </Label>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditProduct} className="bg-blue-600 hover:bg-blue-700">
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Movimentação de Estoque */}
      <Dialog open={isMovementDialogOpen} onOpenChange={setIsMovementDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Movimentação de Estoque</DialogTitle>
            <DialogDescription>
              Registre entradas ou saídas de estoque para {selectedProduct?.productName}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="p-4 bg-gray-50 rounded-md border">
              <p className="text-sm text-gray-600">Estoque Atual</p>
              <p className="text-2xl text-gray-900 mt-1">
                {selectedProduct?.currentStock.toLocaleString('pt-BR')} {selectedProduct?.unit}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="movement-quantity">
                Quantidade *
                <span className="text-xs text-gray-500 ml-2">(Use valores negativos para saída)</span>
              </Label>
              <Input
                id="movement-quantity"
                type="number"
                value={movement.quantity}
                onChange={(e) => setMovement({...movement, quantity: e.target.value})}
                placeholder="Ex: 100 ou -50"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="movement-reason">Motivo *</Label>
              <Select 
                value={movement.reason} 
                onValueChange={(value) => setMovement({...movement, reason: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Entrada - Produção">Entrada - Produção</SelectItem>
                  
                  {/* Ocultar Compra se produto tem controle de lotes */}
                  {!selectedProduct?.trackBatches && (
                    <SelectItem value="Entrada - Compra">Entrada - Compra</SelectItem>
                  )}
                  
                  <SelectItem value="Entrada - Devolução">Entrada - Devolução</SelectItem>
                  <SelectItem value="Entrada - Ajuste de Inventário">Entrada - Ajuste de Inventário</SelectItem>
                  
                  {/* Ocultar Venda se produto tem controle de lotes */}
                  {!selectedProduct?.trackBatches && (
                    <SelectItem value="Saída - Venda">Saída - Venda</SelectItem>
                  )}
                  
                  <SelectItem value="Saída - Perda">Saída - Perda</SelectItem>
                  <SelectItem value="Saída - Doação">Saída - Doação</SelectItem>
                  <SelectItem value="Saída - Ajuste de Inventário">Saída - Ajuste de Inventário</SelectItem>
                  <SelectItem value="Saída - Consumo Interno">Saída - Consumo Interno</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="movement-costPrice">Novo Custo *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
                  <Input
                    id="movement-costPrice"
                    type="number"
                    value={movement.costPrice}
                    onChange={(e) => setMovement({...movement, costPrice: e.target.value})}
                    placeholder="0,00"
                    className="pl-10"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="movement-sellPrice">Novo Preço *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
                  <Input
                    id="movement-sellPrice"
                    type="number"
                    value={movement.sellPrice}
                    onChange={(e) => setMovement({...movement, sellPrice: e.target.value})}
                    placeholder="0,00"
                    className="pl-10"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>
            </div>

            {movement.costPrice && movement.sellPrice && (
              <div className="p-3 bg-purple-50 rounded-md border border-purple-200">
                <p className="text-sm text-purple-900">
                  Markup: {' '}
                  <strong>
                    {calculateMarkup(Number(movement.costPrice), Number(movement.sellPrice)).toFixed(2)}%
                  </strong>
                </p>
              </div>
            )}

            {movement.quantity && (
              <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                <p className="text-sm text-blue-900">
                  Novo estoque: {' '}
                  <strong>
                    {(selectedProduct?.currentStock + Number(movement.quantity)).toLocaleString('pt-BR')} {selectedProduct?.unit}
                  </strong>
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setIsMovementDialogOpen(false);
              setMovement({ quantity: "", reason: "", costPrice: "", sellPrice: "" });
            }}>
              Cancelar
            </Button>
            <Button onClick={handleStockMovement} className="bg-blue-600 hover:bg-blue-700">
              Registrar Movimentação
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Histórico de Movimentações */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Histórico de Movimentações - {selectedProduct?.productName}
            </DialogTitle>
            <DialogDescription>
              Visualize todas as entradas e saídas registradas para este produto.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {selectedProduct && (() => {
              const movements = getStockMovementsByProduct(selectedProduct.id);
              
              if (movements.length === 0) {
                return (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">Nenhuma movimentação registrada para este produto.</p>
                    <p className="text-sm text-gray-400 mt-1">As movimentações aparecerão aqui quando houver entradas, saídas ou ajustes de estoque.</p>
                  </div>
                );
              }

              return (
                <>
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Produto</p>
                        <p className="font-medium">{selectedProduct.productName}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Estoque Atual</p>
                        <p className="font-medium">{selectedProduct.currentStock} {selectedProduct.unit}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Total de Movimentações</p>
                        <p className="font-medium">{movements.length}</p>
                      </div>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Quantidade</TableHead>
                        <TableHead className="text-right">Estoque Anterior</TableHead>
                        <TableHead className="text-right">Novo Estoque</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Descrição</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.map((movement) => (
                        <TableRow key={movement.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <div>
                                <p className="text-sm">
                                  {movement.date 
                                    ? new Date(movement.date).toLocaleDateString('pt-BR')
                                    : '-'
                                  }
                                </p>
                                <p className="text-xs text-gray-500">{movement.time}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={isInboundMovement(movement.type)
                              ? "bg-green-100 text-green-700 border-green-200" 
                              : "bg-red-100 text-red-700 border-red-200"
                            }>
                              {isInboundMovement(movement.type) ? (
                                <TrendingUp className="w-3 h-3 mr-1" />
                              ) : (
                                <TrendingDown className="w-3 h-3 mr-1" />
                              )}
                              {getMovementTypeLabel(movement.type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={isInboundMovement(movement.type) ? "text-green-600" : "text-red-600"}>
                              {isInboundMovement(movement.type) ? "+" : "-"}{movement.quantity} {selectedProduct.unit}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-gray-600">
                            {movement.previousStock} {selectedProduct.unit}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-medium">{movement.newStock} {selectedProduct.unit}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{movement.reason}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-500">
                              {movement.description || movement.reference || "-"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              );
            })()}
          </div>

          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setIsHistoryDialogOpen(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== FASE 5: Modal de Controle de Lotes ===== */}
      {selectedProduct && (
        <BatchMovementModal
          isOpen={isBatchMovementModalOpen}
          onClose={() => {
            setIsBatchMovementModalOpen(false);
            setAvailableBatches([]);
          }}
          product={selectedProduct}
          movementType={(() => {
            const map: Record<string, any> = {
              'Entrada - Produção': 'entrada-producao',
              'Entrada - Devolução': 'entrada-devolucao',
              'Entrada - Ajuste de Inventário': 'entrada-ajuste',
              'Saída - Perda': 'saida-perda',
              'Saída - Doação': 'saida-doacao',
              'Saída - Ajuste de Inventário': 'saida-ajuste',
              'Saída - Consumo Interno': 'saida-consumo'
            };
            return map[movement.reason] || 'entrada-producao';
          })()}
          quantity={Math.abs(Number(movement.quantity))}
          onConfirm={handleBatchMovementConfirm}
          availableBatches={availableBatches}
        />
      )}

      {/* Alerts */}
      {(lowStockItems > 0 || outOfStockItems > 0) && (
        <Card className="mt-6 p-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-yellow-900 mb-2">⚠️ Alertas de Estoque</h3>
              <div className="text-sm text-yellow-800 space-y-1">
                {outOfStockItems > 0 && (
                  <p>• <strong>{outOfStockItems} produto(s)</strong> estão <strong>fora de estoque</strong></p>
                )}
                {lowStockItems > 0 && (
                  <p>• <strong>{lowStockItems} produto(s)</strong> estão com <strong>baixo estoque</strong></p>
                )}
                <p className="mt-2 text-yellow-700">
                  💡 Considere criar pedidos de compra para repor esses itens
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
