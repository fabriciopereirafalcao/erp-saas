import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Textarea } from "./ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar as CalendarComponent } from "./ui/calendar";
import { Checkbox } from "./ui/checkbox";
import { Plus, Search, FileText, Package, TrendingUp, ShoppingCart, User, Calendar, Tag, Percent, DollarSign, CreditCard, Truck, X, Minus, Edit, Copy, MoreHorizontal, MoreVertical, History, AlertTriangle, CheckCircle2, Clock, UserPlus } from "lucide-react";
import { useERP } from "../contexts/ERPContext";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SalesOrderInvoice } from "./SalesOrderInvoice";
import { StatusHistoryTimeline } from "./StatusHistoryTimeline";
import { usePagination } from "../hooks/usePagination";
import { PaginationControls } from "./PaginationControls";
import { getValidNextStatuses, getValidManualNextStatuses } from "../utils/statusTransitionValidation";
import { formatDateLocal, parseDateLocal, addDaysToDate, getTodayString } from "../utils/dateUtils";
import { SalesAndPurchasePersonManagement } from "./SalesAndPurchasePersonManagement";

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountType: "percentage" | "value";
  discountAmount: number;
  subtotal: number;
}

interface PaymentInstallment {
  number: number;
  dueDate: string;
  amount: number;
}

export function SalesOrders() {
  const { salesOrders, customers, inventory, updateSalesOrderStatus, addSalesOrder, updateSalesOrder, priceTables, getPriceTableById, companySettings, financialTransactions, accountCategories, salespeople } = useERP();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<any>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedOrderForHistory, setSelectedOrderForHistory] = useState<typeof salesOrders[0] | null>(null);
  const [isExceptionalMode, setIsExceptionalMode] = useState(false);
  const [isPersonManagementOpen, setIsPersonManagementOpen] = useState(false);
  
  // Estados para controlar abertura dos calendários
  const [isIssueDateOpen, setIsIssueDateOpen] = useState(false);
  const [isBillingDateOpen, setIsBillingDateOpen] = useState(false);
  const [isDeliveryDateOpen, setIsDeliveryDateOpen] = useState(false);

  // Aba 1: Cabeçalho
  const [orderHeader, setOrderHeader] = useState({
    customerId: "",
    salesPerson: "",
    status: "Processando",
    issueDate: getTodayString(),
    billingDate: "",
    deliveryDate: "",
    priceTableId: "",
    revenueCategoryId: "", // Categoria de receita
    orderDiscountType: "percentage" as "percentage" | "value",
    orderDiscountAmount: 0,
    paymentCondition: "1", // número de parcelas
    firstInstallmentDays: 0, // prazo em dias para primeira parcela
    dueDateReference: "issue" as "issue" | "billing" | "delivery", // referência para cálculo do vencimento
    customerNotes: "",
    internalNotes: ""
  });

  // Aba 2: Itens
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [itemQuantity, setItemQuantity] = useState("");
  const [itemDiscountType, setItemDiscountType] = useState<"percentage" | "value">("percentage");
  const [itemDiscountAmount, setItemDiscountAmount] = useState("0");

  // Aba 3: Frete
  const [shippingInfo, setShippingInfo] = useState({
    carrier: "",
    shippingType: "cif", // CIF (vendedor paga) ou FOB (comprador paga)
    shippingCost: 0,
    trackingCode: "",
    shippingNotes: ""
  });

  // Parcelas de pagamento
  const [installments, setInstallments] = useState<PaymentInstallment[]>([]);

  const filteredOrders = salesOrders
    .filter(order =>
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.productName.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // Ordenar por ID: do mais recente (maior ID) para o mais antigo (menor ID)
      const idA = parseInt(a.id.split('-')[1]);
      const idB = parseInt(b.id.split('-')[1]);
      return idB - idA; // Ordem decrescente
    });

  // Paginação
  const { paginatedData, pagination, controls } = usePagination(filteredOrders, 10);

  // Obter informações auxiliares
  const selectedCustomer = customers.find(c => c.id === orderHeader.customerId);
  const selectedPriceTable = orderHeader.priceTableId ? getPriceTableById(orderHeader.priceTableId) : priceTables.find(t => t.isDefault);

  // Helper: Obter cor do badge de status com ícone
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      "Processando": "bg-blue-100 text-blue-700",
      "Confirmado": "bg-purple-100 text-purple-700",
      "Enviado": "bg-yellow-100 text-yellow-700",
      "Entregue": "bg-green-100 text-green-700",
      "Parcialmente Concluído": "bg-orange-100 text-orange-700",
      "Concluído": "bg-emerald-100 text-emerald-700",
      "Cancelado": "bg-red-100 text-red-700"
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  // Helper: Obter ícone do status
  const getStatusIcon = (status: string) => {
    const icons: Record<string, JSX.Element> = {
      "Processando": <Clock className="w-3 h-3 mr-1 inline" />,
      "Confirmado": <CheckCircle2 className="w-3 h-3 mr-1 inline" />,
      "Enviado": <Truck className="w-3 h-3 mr-1 inline" />,
      "Entregue": <Package className="w-3 h-3 mr-1 inline" />,
      "Parcialmente Concluído": <AlertTriangle className="w-3 h-3 mr-1 inline" />,
      "Concluído": <CheckCircle2 className="w-3 h-3 mr-1 inline" />,
      "Cancelado": <X className="w-3 h-3 mr-1 inline" />
    };
    return icons[status] || null;
  };

  // Helper: Obter informações de parcelas do pedido
  const getInstallmentsInfo = (orderId: string) => {
    const orderTransactions = financialTransactions.filter(
      t => t.origin === "Pedido" && t.reference === orderId && t.status !== "Cancelado"
    );
    
    if (orderTransactions.length === 0) return null;

    const received = orderTransactions.filter(t => t.status === "Recebido").length;
    const total = orderTransactions.length;

    return { received, total };
  };

  // MED-004: Carregar tabela de preço automaticamente ao selecionar cliente
  useEffect(() => {
    // Não atualizar se estiver editando um pedido existente
    if (editingOrderId) return;
    
    if (orderHeader.customerId) {
      const customer = customers.find(c => c.id === orderHeader.customerId);
      
      // Carregar tabela de preço personalizada do cliente
      if (customer?.priceTableId) {
        setOrderHeader(prev => ({ ...prev, priceTableId: customer.priceTableId || "" }));
        const priceTable = getPriceTableById(customer.priceTableId);
        if (priceTable) {
          toast.success(`Tabela "${priceTable.name}" aplicada automaticamente`, {
            description: `Cliente configurado com preços personalizados`
          });
        }
      } else {
        // Usar tabela padrão se cliente não tiver tabela específica
        const defaultTable = priceTables.find(t => t.isDefault);
        if (defaultTable) {
          setOrderHeader(prev => ({ ...prev, priceTableId: defaultTable.id }));
        }
      }
    }
  }, [orderHeader.customerId, customers, priceTables, editingOrderId, getPriceTableById]);

  // Calcular parcelas automaticamente
  useEffect(() => {
    const numInstallments = parseInt(orderHeader.paymentCondition) || 1;
    const totalValue = calculateGrandTotal();
    const installmentValue = totalValue / numInstallments;

    const newInstallments: PaymentInstallment[] = [];
    
    // Determinar data base conforme referência escolhida
    // CORREÇÃO: Usar o formato de data no timezone local para evitar erro de 1 dia
    let baseDate: Date;
    if (orderHeader.dueDateReference === "billing" && orderHeader.billingDate) {
      const [year, month, day] = orderHeader.billingDate.split('-').map(Number);
      baseDate = new Date(year, month - 1, day);
    } else if (orderHeader.dueDateReference === "delivery" && orderHeader.deliveryDate) {
      const [year, month, day] = orderHeader.deliveryDate.split('-').map(Number);
      baseDate = new Date(year, month - 1, day);
    } else {
      const [year, month, day] = orderHeader.issueDate.split('-').map(Number);
      baseDate = new Date(year, month - 1, day);
    }

    // Adicionar prazo da primeira parcela
    const firstInstallmentDays = parseInt(String(orderHeader.firstInstallmentDays)) || 0;

    for (let i = 0; i < numInstallments; i++) {
      const dueDate = new Date(baseDate);
      // Primeira parcela: data base + prazo configurado
      // Demais parcelas: primeira parcela + (30 dias * número da parcela)
      dueDate.setDate(dueDate.getDate() + firstInstallmentDays + (i * 30));

      // Formatar a data manualmente para evitar problemas de timezone
      const year = dueDate.getFullYear();
      const month = String(dueDate.getMonth() + 1).padStart(2, '0');
      const day = String(dueDate.getDate()).padStart(2, '0');

      newInstallments.push({
        number: i + 1,
        dueDate: `${year}-${month}-${day}`,
        amount: i === numInstallments - 1 
          ? totalValue - (installmentValue * (numInstallments - 1)) // Última parcela ajusta diferenças
          : installmentValue
      });
    }

    setInstallments(newInstallments);
  }, [orderHeader.paymentCondition, orderHeader.billingDate, orderHeader.deliveryDate, orderHeader.issueDate, orderHeader.firstInstallmentDays, orderHeader.dueDateReference, orderItems, orderHeader.orderDiscountAmount, orderHeader.orderDiscountType, shippingInfo.shippingCost]);

  const handleAddItem = () => {
    if (!selectedProduct || !itemQuantity || Number(itemQuantity) <= 0) {
      toast.error("Selecione um produto e informe a quantidade");
      return;
    }

    const product = inventory.find(p => p.id === selectedProduct);
    if (!product) {
      toast.error("Produto não encontrado");
      return;
    }

    // CORREÇÃO: Verificar se o produto já foi adicionado anteriormente
    const existingItemIndex = orderItems.findIndex(item => item.productId === selectedProduct);
    
    if (existingItemIndex !== -1) {
      // Produto já existe - incrementar quantidade
      const existingItem = orderItems[existingItemIndex];
      const newQuantity = existingItem.quantity + Number(itemQuantity);
      
      // Recalcular subtotal com a nova quantidade
      let itemSubtotal = newQuantity * existingItem.unitPrice;
      if (existingItem.discountType === "percentage") {
        itemSubtotal = itemSubtotal * (1 - existingItem.discountAmount / 100);
      } else {
        itemSubtotal = itemSubtotal - existingItem.discountAmount;
      }
      
      const updatedItems = [...orderItems];
      updatedItems[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity,
        subtotal: itemSubtotal
      };
      
      setOrderItems(updatedItems);
      setSelectedProduct("");
      setItemQuantity("");
      setItemDiscountAmount("0");
      toast.success(`Quantidade de ${product.productName} atualizada para ${newQuantity}`, {
        description: `${Number(itemQuantity)} unidade(s) adicionada(s)`
      });
      return;
    }

    // Produto não existe - adicionar novo item
    // Buscar preço da tabela selecionada (ou padrão se não houver seleção)
    let unitPrice = product.pricePerUnit;
    const priceTable = orderHeader.priceTableId 
      ? getPriceTableById(orderHeader.priceTableId) 
      : priceTables.find(t => t.isDefault);
    
    if (priceTable) {
      const priceItem = priceTable.items.find(item => item.productName === product.productName);
      if (priceItem) {
        unitPrice = priceItem.price;
      }
    }

    const quantity = Number(itemQuantity);
    const discountValue = Number(itemDiscountAmount) || 0;
    
    let itemSubtotal = quantity * unitPrice;
    
    // Aplicar desconto no item
    if (itemDiscountType === "percentage") {
      itemSubtotal = itemSubtotal * (1 - discountValue / 100);
    } else {
      itemSubtotal = itemSubtotal - discountValue;
    }

    const newItem: OrderItem = {
      productId: product.id,
      productName: product.productName,
      quantity,
      unitPrice,
      discountType: itemDiscountType,
      discountAmount: discountValue,
      subtotal: itemSubtotal
    };

    setOrderItems([...orderItems, newItem]);
    setSelectedProduct("");
    setItemQuantity("");
    setItemDiscountAmount("0");
    toast.success(`${product.productName} adicionado ao pedido`);
  };

  const handleRemoveItem = (index: number) => {
    const item = orderItems[index];
    setOrderItems(orderItems.filter((_, i) => i !== index));
    toast.info(`${item.productName} removido do pedido`);
  };

  const handleEditItemQuantity = (index: number) => {
    const item = orderItems[index];
    const newQuantity = prompt(`Digite a nova quantidade para ${item.productName}:`, String(item.quantity));
    
    if (newQuantity === null) return; // Usuário cancelou
    
    const qty = Number(newQuantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Quantidade inválida");
      return;
    }
    
    // Recalcular subtotal com a nova quantidade
    let itemSubtotal = qty * item.unitPrice;
    if (item.discountType === "percentage") {
      itemSubtotal = itemSubtotal * (1 - item.discountAmount / 100);
    } else {
      itemSubtotal = itemSubtotal - item.discountAmount;
    }
    
    const updatedItems = [...orderItems];
    updatedItems[index] = {
      ...item,
      quantity: qty,
      subtotal: itemSubtotal
    };
    
    setOrderItems(updatedItems);
    toast.success(`Quantidade atualizada para ${qty}`);
  };

  const calculateItemsSubtotal = () => {
    return orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const calculateOrderDiscount = () => {
    const subtotal = calculateItemsSubtotal();
    if (orderHeader.orderDiscountType === "percentage") {
      return subtotal * (orderHeader.orderDiscountAmount / 100);
    }
    return orderHeader.orderDiscountAmount;
  };

  const calculateGrandTotal = () => {
    const subtotal = calculateItemsSubtotal();
    const discount = calculateOrderDiscount();
    const shipping = shippingInfo.shippingCost;
    return subtotal - discount + shipping;
  };

  // MED-001: Validação automática de valores
  const validateOrderTotal = (manualTotal?: number): { isValid: boolean; calculatedTotal: number; message?: string } => {
    const calculatedTotal = calculateGrandTotal();
    
    if (manualTotal !== undefined) {
      const difference = Math.abs(calculatedTotal - manualTotal);
      const tolerance = 0.01; // Tolerância de R$ 0,01 para arredondamentos
      
      if (difference > tolerance) {
        return {
          isValid: false,
          calculatedTotal,
          message: `O total informado (R$ ${manualTotal.toFixed(2)}) não confere com o calculado (R$ ${calculatedTotal.toFixed(2)}). Diferença: R$ ${difference.toFixed(2)}`
        };
      }
    }
    
    return { isValid: true, calculatedTotal };
  };

  const handleCreateOrder = () => {
    // Validações
    if (!orderHeader.customerId) {
      toast.error("Selecione um cliente");
      return;
    }
    if (!orderHeader.revenueCategoryId) {
      toast.error("Selecione uma categoria de receita");
      return;
    }
    if (orderItems.length === 0) {
      toast.error("Adicione pelo menos um item ao pedido");
      return;
    }
    if (!orderHeader.deliveryDate) {
      toast.error("Informe a data de entrega");
      return;
    }

    const customer = customers.find(c => c.id === orderHeader.customerId);
    if (!customer) {
      toast.error("Cliente não encontrado");
      return;
    }

    // CORREÇÃO: Validar estoque para cada item do pedido
    for (const item of orderItems) {
      const product = inventory.find(p => p.id === item.productId);
      if (!product) {
        toast.error(`Produto "${item.productName}" não encontrado no estoque!`);
        return;
      }

      // Calcular estoque disponível (considerando reservas)
      const reservedStock = salesOrders
        .filter(order => 
          order.productName === item.productName && 
          (order.status === "Processando" || order.status === "Confirmado")
        )
        .reduce((sum, order) => sum + order.quantity, 0);
      
      const availableStock = product.currentStock - reservedStock;

      if (availableStock < item.quantity) {
        toast.error(`Estoque insuficiente para "${item.productName}"!`, {
          description: `Disponível: ${availableStock} ${product.unit} | Solicitado: ${item.quantity} ${product.unit}`
        });
        return;
      }

      // Alerta se estoque ficará baixo
      const stockAfter = availableStock - item.quantity;
      if (stockAfter < product.reorderLevel && stockAfter >= 0) {
        toast.warning(`Atenção: "${item.productName}" ficará com estoque baixo após este pedido (${stockAfter} ${product.unit})`, {
          duration: 5000
        });
      }
    }

    // Preparar dados do pedido
    const firstItem = orderItems[0];
    const orderData = {
      customer: customer.company || customer.name,
      customerId: orderHeader.customerId,
      productName: orderItems.length > 1 
        ? `${firstItem.productName} e mais ${orderItems.length - 1} item(ns)` 
        : firstItem.productName,
      quantity: orderItems.reduce((sum, item) => sum + item.quantity, 0),
      unitPrice: firstItem.unitPrice,
      totalAmount: calculateGrandTotal(),
      status: orderHeader.status as any,
      issueDate: orderHeader.issueDate,
      billingDate: orderHeader.billingDate || undefined,
      deliveryDate: orderHeader.deliveryDate,
      paymentMethod: orderHeader.paymentMethod,
      paymentCondition: orderHeader.paymentCondition,
      priceTableId: orderHeader.priceTableId || undefined,
      revenueCategoryId: orderHeader.revenueCategoryId,
      salesPerson: orderHeader.salesPerson || "Sistema",
      firstInstallmentDays: orderHeader.firstInstallmentDays,
      dueDateReference: orderHeader.dueDateReference,
      // Incluir array de itens para pedidos multi-item
      items: orderItems.length > 1 ? orderItems : undefined
    };

    // Criar ou atualizar pedido
    if (editingOrderId) {
      updateSalesOrder(editingOrderId, orderData);
    } else {
      addSalesOrder(orderData, isExceptionalMode);
    }

    // Resetar formulário
    setOrderHeader({
      customerId: "",
      salesPerson: "",
      status: "Processando",
      issueDate: getTodayString(),
      billingDate: "",
      deliveryDate: "",
      priceTableId: "",
      revenueCategoryId: "",
      orderDiscountType: "percentage",
      orderDiscountAmount: 0,
      paymentCondition: "1",
      firstInstallmentDays: 0,
      dueDateReference: "issue",
      customerNotes: "",
      internalNotes: ""
    });
    setOrderItems([]);
    setShippingInfo({
      carrier: "",
      shippingType: "cif",
      shippingCost: 0,
      trackingCode: "",
      shippingNotes: ""
    });
    setEditingOrderId(null);
    setIsExceptionalMode(false);
    setIsDialogOpen(false);
  };

  // Função para alterar status do pedido com proteções contra alteração manual de status automáticos
  const handleStatusChange = (orderId: string, newStatus: string) => {
    const order = salesOrders.find(o => o.id === orderId);
    if (!order) {
      toast.error("Pedido não encontrado!");
      return;
    }

    // PROTEÇÃO CRÍTICA: Bloquear alteração manual para status automáticos
    // Os status "Parcialmente Concluído" e "Concluído" só podem ser definidos automaticamente
    // quando o usuário marca parcelas como recebidas no módulo de transações financeiras
    if (newStatus === "Parcialmente Concluído" || newStatus === "Concluído") {
      toast.error(
        `Não é possível alterar manualmente para "${newStatus}"`,
        {
          description: "Este status é atualizado automaticamente ao receber parcelas nas transações financeiras",
          duration: 6000
        }
      );
      console.warn(
        `🚫 [PROTEÇÃO] Tentativa bloqueada de alterar manualmente pedido ${orderId} para "${newStatus}"`
      );
      return;
    }

    // Se passou pelas validações, chamar a função do contexto
    updateSalesOrderStatus(orderId, newStatus as any);
  };

  // Resetar formulário ao fechar o diálogo
  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      // Resetar formulário
      setEditingOrderId(null);
      setIsExceptionalMode(false);
      setIsIssueDateOpen(false);
      setIsBillingDateOpen(false);
      setIsDeliveryDateOpen(false);
      setOrderHeader({
        customerId: "",
        salesPerson: "",
        status: "Processando",
        issueDate: getTodayString(),
        billingDate: "",
        deliveryDate: "",
        priceTableId: "",
        revenueCategoryId: "",
        orderDiscountType: "percentage",
        orderDiscountAmount: 0,
        paymentCondition: "1",
        firstInstallmentDays: 0,
        dueDateReference: "issue",
        customerNotes: "",
        internalNotes: ""
      });
      setOrderItems([]);
      setShippingInfo({
        carrier: "",
        shippingType: "cif",
        shippingCost: 0,
        trackingCode: "",
        shippingNotes: ""
      });
    }
  };

  // Calcular data de vencimento do primeiro pagamento (retorna string YYYY-MM-DD)
  const calculateFirstDueDate = (order: typeof salesOrders[0]): string => {
    // Determinar data base conforme referência escolhida
    let baseDateStr: string;
    if (order.dueDateReference === "billing" && order.billingDate) {
      baseDateStr = order.billingDate;
    } else if (order.dueDateReference === "delivery" && order.deliveryDate) {
      baseDateStr = order.deliveryDate;
    } else if (order.issueDate) {
      baseDateStr = order.issueDate;
    } else {
      baseDateStr = order.orderDate;
    }
    
    // Parse manual para evitar problema de timezone
    const [year, month, day] = baseDateStr.split('-').map(Number);
    const baseDate = new Date(year, month - 1, day);
    
    // Adicionar prazo da primeira parcela
    const firstInstallmentDays = order.firstInstallmentDays || 0;
    baseDate.setDate(baseDate.getDate() + firstInstallmentDays);
    
    // Retornar no formato YYYY-MM-DD
    const resultYear = baseDate.getFullYear();
    const resultMonth = String(baseDate.getMonth() + 1).padStart(2, '0');
    const resultDay = String(baseDate.getDate()).padStart(2, '0');
    
    return `${resultYear}-${resultMonth}-${resultDay}`;
  };

  // Função para duplicar pedido
  const handleDuplicateOrder = (order: typeof salesOrders[0]) => {
    // Criar uma cópia do pedido com nova data e novo ID
    const customer = customers.find(c => c.id === order.customerId);
    if (!customer) {
      toast.error("Cliente não encontrado");
      return;
    }

    // Preencher o formulário com os dados do pedido original
    setOrderHeader({
      customerId: order.customerId,
      salesPerson: order.salesPerson || "",
      status: "Processando",
      issueDate: new Date().toISOString().split('T')[0], // Nova data de emissão
      billingDate: "",
      deliveryDate: order.deliveryDate,
      priceTableId: order.priceTableId || "",
      revenueCategoryId: order.revenueCategoryId || "",
      orderDiscountType: "percentage",
      orderDiscountAmount: 0,
      paymentCondition: order.paymentCondition || "1",
      firstInstallmentDays: order.firstInstallmentDays || 0,
      dueDateReference: order.dueDateReference || "issue",
      customerNotes: "",
      internalNotes: ""
    });

    // Criar item básico baseado no pedido
    const newItem: OrderItem = {
      productId: "",
      productName: order.productName,
      quantity: order.quantity,
      unitPrice: order.unitPrice,
      discountType: "percentage",
      discountAmount: 0,
      subtotal: order.quantity * order.unitPrice
    };
    setOrderItems([newItem]);

    // Resetar shipping
    setShippingInfo({
      carrier: "",
      shippingType: "cif",
      shippingCost: 0,
      trackingCode: "",
      shippingNotes: ""
    });

    setEditingOrderId(null);
    setIsDialogOpen(true);
    toast.success(`Pedido ${order.id} duplicado! Revise os dados e salve.`);
  };

  // Função para editar pedido
  const handleEditOrder = (order: typeof salesOrders[0]) => {
    // PROTEÇÃO: Impedir edição de pedidos concluídos ou parcialmente concluídos
    if (order.status === "Concluído" || order.status === "Parcialmente Concluído") {
      toast.error("Não é possível editar pedidos com status 'Concluído' ou 'Parcialmente Concluído'");
      return;
    }
    
    // Preencher o formulário com os dados do pedido
    setEditingOrderId(order.id);
    
    setOrderHeader({
      customerId: order.customerId,
      salesPerson: order.salesPerson || "",
      status: order.status,
      issueDate: order.issueDate || order.orderDate,
      billingDate: order.billingDate || "",
      deliveryDate: order.deliveryDate,
      priceTableId: order.priceTableId || "",
      orderDiscountType: "percentage",
      orderDiscountAmount: 0,
      paymentCondition: order.paymentCondition || "1",
      firstInstallmentDays: order.firstInstallmentDays || 0,
      dueDateReference: order.dueDateReference || "issue",
      customerNotes: "",
      internalNotes: ""
    });

    // Carregar itens do pedido
    if (order.items && order.items.length > 0) {
      // Pedido multi-item: carregar todos os itens do array
      setOrderItems(order.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountType: "percentage",
        discountAmount: 0,
        subtotal: item.quantity * item.unitPrice
      })));
    } else {
      // Pedido single-item: criar item baseado nos campos do pedido
      const newItem: OrderItem = {
        productId: "",
        productName: order.productName,
        quantity: order.quantity,
        unitPrice: order.unitPrice,
        discountType: "percentage",
        discountAmount: 0,
        subtotal: order.quantity * order.unitPrice
      };
      setOrderItems([newItem]);
    }

    // Resetar shipping
    setShippingInfo({
      carrier: "",
      shippingType: "cif",
      shippingCost: 0,
      trackingCode: "",
      shippingNotes: ""
    });

    setIsDialogOpen(true);
    toast.info(`Editando pedido ${order.id}`);
  };

  const totalProcessing = salesOrders.filter(o => o.status === "Processando").length;
  const totalShipped = salesOrders.filter(o => o.status === "Enviado").length;
  const totalRevenue = salesOrders
    .filter(o => o.status === "Entregue" || o.status === "Pago")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-gray-900 mb-2">Pedidos de Venda</h1>
            <p className="text-gray-600">Gerencie pedidos de clientes e vendas com controle inteligente de status</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button className="bg-[rgb(32,251,225)] hover:bg-[#18CBB5] text-[rgb(1,1,1)] not-italic no-underline font-normal font-bold">
                <Plus className="w-4 h-4 mr-2" />
                Criar Pedido
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[960px] max-h-[90vh] flex flex-col p-0">
              <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <DialogTitle>
                  {editingOrderId ? `Editar Pedido ${editingOrderId}` : "Criar Novo Pedido de Venda"}
                </DialogTitle>
                <DialogDescription>
                  {editingOrderId 
                    ? "Atualize as informações do pedido nas abas abaixo." 
                    : "Preencha as informações do pedido nas abas abaixo."}
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="header" className="w-full flex flex-col flex-1 overflow-hidden">
                <div className="px-6 pt-4 border-b bg-white">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="header">
                      <FileText className="w-4 h-4 mr-2" />
                      Cabeçalho
                    </TabsTrigger>
                    <TabsTrigger value="items">
                      <Package className="w-4 h-4 mr-2" />
                      Itens ({orderItems.length})
                    </TabsTrigger>
                    <TabsTrigger value="shipping">
                      <Truck className="w-4 h-4 mr-2" />
                      Frete
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto">


                  {/* ABA 1: CABEÇALHO DO PEDIDO */}
                  <TabsContent value="header" className="space-y-4 p-6">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Cliente */}
                      <div>
                        <Label>Cliente *</Label>
                        <Select 
                          value={orderHeader.customerId} 
                          onValueChange={(value) => setOrderHeader({...orderHeader, customerId: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o cliente" />
                          </SelectTrigger>
                          <SelectContent>
                            {customers.map((customer) => (
                              <SelectItem key={customer.id} value={customer.id}>
                                {customer.company || customer.name} - {customer.id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedCustomer && (
                          <p className="text-xs text-gray-500 mt-1">
                            📧 {selectedCustomer.email} | 📞 {selectedCustomer.phone}
                          </p>
                        )}
                      </div>

                      {/* Vendedor */}
                      <div>
                        <Label>Vendedor</Label>
                        <div className="flex gap-2">
                          <Select 
                            value={orderHeader.salesPerson} 
                            onValueChange={(value) => setOrderHeader({...orderHeader, salesPerson: value})}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Selecione o vendedor" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Vendedor Avulso">
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-gray-400" />
                                  <span className="text-gray-500 italic">Vendedor Avulso</span>
                                </div>
                              </SelectItem>
                              {salespeople.map((person) => (
                                <SelectItem key={person.id} value={person.name}>
                                  <div className="flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    <span>{person.name}</span>
                                    <span className="text-xs text-gray-500">({person.cpf})</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setIsPersonManagementOpen(true)}
                            title="Gerenciar vendedores"
                          >
                            <UserPlus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Categoria de Receita */}
                      <div>
                        <Label>Categoria de Receita *</Label>
                        <Select 
                          value={orderHeader.revenueCategoryId} 
                          onValueChange={(value) => setOrderHeader({...orderHeader, revenueCategoryId: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            {accountCategories
                              .filter(cat => cat.type === "Receita" && cat.isActive)
                              .map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.code} - {category.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 mt-1">
                          Esta categoria será usada nas transações financeiras do pedido
                        </p>
                      </div>
                    </div>

                    {/* Modo Excepcional */}
                    {!editingOrderId && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-3">
                          <Checkbox 
                            id="exceptionalMode" 
                            checked={isExceptionalMode}
                            onCheckedChange={(checked) => setIsExceptionalMode(checked as boolean)}
                          />
                          <div className="flex-1">
                            <label htmlFor="exceptionalMode" className="flex items-center gap-2 cursor-pointer">
                              <AlertTriangle className="w-4 h-4 text-orange-600" />
                              <span className="font-medium text-orange-900">
                                Criar pedido em modo excepcional
                              </span>
                            </label>
                            <p className="text-sm text-orange-700 mt-1">
                              Permite criar o pedido em status avançado (Entregue ou Concluído) e executa automaticamente todas as etapas intermediárias (baixa de estoque e geração de transações financeiras).
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      {/* Status */}
                      <div>
                        <Label>Status do Pedido</Label>
                        <Select 
                          value={orderHeader.status} 
                          onValueChange={(value) => setOrderHeader({...orderHeader, status: value})}
                          disabled={editingOrderId !== null}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Processando">Processando</SelectItem>
                            <SelectItem value="Confirmado">Confirmado</SelectItem>
                            <SelectItem value="Enviado">Enviado</SelectItem>
                            {isExceptionalMode && <SelectItem value="Entregue">Entregue</SelectItem>}
                            {isExceptionalMode && <SelectItem value="Concluído">Concluído</SelectItem>}
                            <SelectItem value="Cancelado">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                        {!editingOrderId && !isExceptionalMode && (
                          <p className="text-xs text-gray-500 mt-1">
                            Para criar pedido com status avançado, ative o modo excepcional
                          </p>
                        )}
                        {editingOrderId && (
                          <p className="text-xs text-gray-500 mt-1">
                            Para alterar o status, use o menu de ações na lista de pedidos
                          </p>
                        )}
                      </div>

                      {/* Data de Emissão */}
                      <div>
                        <Label>Data de Emissão</Label>
                        <Popover open={isIssueDateOpen} onOpenChange={setIsIssueDateOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {orderHeader.issueDate ? format(parseISO(orderHeader.issueDate), "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={orderHeader.issueDate ? parseISO(orderHeader.issueDate) : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  setOrderHeader({...orderHeader, issueDate: format(date, "yyyy-MM-dd")});
                                  setIsIssueDateOpen(false);
                                }
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Data de Faturamento */}
                      <div>
                        <Label>Data de Faturamento</Label>
                        <Popover open={isBillingDateOpen} onOpenChange={setIsBillingDateOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {orderHeader.billingDate ? format(parseISO(orderHeader.billingDate), "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={orderHeader.billingDate ? parseISO(orderHeader.billingDate) : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  setOrderHeader({...orderHeader, billingDate: format(date, "yyyy-MM-dd")});
                                  setIsBillingDateOpen(false);
                                }
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Data de Entrega */}
                      <div>
                        <Label>Data de Entrega *</Label>
                        <Popover open={isDeliveryDateOpen} onOpenChange={setIsDeliveryDateOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {orderHeader.deliveryDate ? format(parseISO(orderHeader.deliveryDate), "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={orderHeader.deliveryDate ? parseISO(orderHeader.deliveryDate) : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  setOrderHeader({...orderHeader, deliveryDate: format(date, "yyyy-MM-dd")});
                                  setIsDeliveryDateOpen(false);
                                }
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {/* Tabela de Preço */}
                    <div>
                      <Label>Tabela de Preço</Label>
                      <Select 
                        value={orderHeader.priceTableId || "default"} 
                        onValueChange={(value) => setOrderHeader({...orderHeader, priceTableId: value === "default" ? "" : value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a tabela de preço" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Tabela Padrão</SelectItem>
                          {priceTables
                            .filter(t => !t.isDefault)
                            .map((table) => (
                              <SelectItem key={table.id} value={table.id}>
                                {table.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {selectedPriceTable && (
                        <div className="flex items-center gap-2 mt-1">
                          <Tag className="w-3 h-3 text-purple-600" />
                          <p className="text-xs text-purple-700">
                            Usando: {selectedPriceTable.name}
                          </p>
                        </div>
                      )}
                    </div>



                    {/* Desconto/Acréscimo no Pedido */}
                    <div className="border-t pt-4">
                      <Label className="mb-2 block">Desconto/Acréscimo no Pedido Total</Label>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label className="text-xs text-gray-600">Tipo</Label>
                          <Select 
                            value={orderHeader.orderDiscountType} 
                            onValueChange={(value: "percentage" | "value") => setOrderHeader({...orderHeader, orderDiscountType: value})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">Percentual (%)</SelectItem>
                              <SelectItem value="value">Valor (R$)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs text-gray-600">
                            {orderHeader.orderDiscountType === "percentage" ? "Percentual" : "Valor em R$"}
                          </Label>
                          <div className="relative">
                            {orderHeader.orderDiscountType === "percentage" ? (
                              <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            ) : (
                              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            )}
                            <Input
                              type="number"
                              step="0.01"
                              className="pl-10"
                              value={orderHeader.orderDiscountAmount}
                              onChange={(e) => setOrderHeader({...orderHeader, orderDiscountAmount: Number(e.target.value) || 0})}
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        💡 Use valores negativos para acréscimo
                      </p>
                    </div>

                    {/* Condições de Pagamento */}
                    <div className="border-t pt-4">
                      <Label className="mb-2 block">Condições de Pagamento</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-gray-600">Número de Parcelas</Label>
                          <Select 
                            value={orderHeader.paymentCondition} 
                            onValueChange={(value) => setOrderHeader({...orderHeader, paymentCondition: value})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Parcela única</SelectItem>
                              <SelectItem value="2">2 Parcelas</SelectItem>
                              <SelectItem value="3">3 Parcelas</SelectItem>
                              <SelectItem value="4">4 Parcelas</SelectItem>
                              <SelectItem value="5">5 Parcelas</SelectItem>
                              <SelectItem value="6">6 Parcelas</SelectItem>
                              <SelectItem value="7">7 Parcelas</SelectItem>
                              <SelectItem value="8">8 Parcelas</SelectItem>
                              <SelectItem value="9">9 Parcelas</SelectItem>
                              <SelectItem value="10">10 Parcelas</SelectItem>
                              <SelectItem value="11">11 Parcelas</SelectItem>
                              <SelectItem value="12">12 Parcelas</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Prazo e Referência da Primeira Parcela */}
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <Label className="text-xs text-gray-600">Prazo 1ª Parcela (dias)</Label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                              type="number"
                              min="0"
                              className="pl-10"
                              value={orderHeader.firstInstallmentDays || ''}
                              onFocus={(e) => {
                                if (orderHeader.firstInstallmentDays === 0) {
                                  setOrderHeader({...orderHeader, firstInstallmentDays: '' as any});
                                }
                              }}
                              onChange={(e) => setOrderHeader({...orderHeader, firstInstallmentDays: Number(e.target.value) || 0})}
                              onBlur={(e) => {
                                if (e.target.value === '') {
                                  setOrderHeader({...orderHeader, firstInstallmentDays: 0});
                                }
                              }}
                              placeholder="0"
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            💡 Dias até vencimento da 1ª parcela
                          </p>
                        </div>

                        <div>
                          <Label className="text-xs text-gray-600">Vencimento a partir de</Label>
                          <Select 
                            value={orderHeader.dueDateReference} 
                            onValueChange={(value: "issue" | "billing" | "delivery") => setOrderHeader({...orderHeader, dueDateReference: value})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="issue">Data de Emissão</SelectItem>
                              <SelectItem value="billing">Data de Faturamento</SelectItem>
                              <SelectItem value="delivery">Data de Entrega</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-gray-500 mt-1">
                            📅 Referência para calcular vencimentos
                          </p>
                        </div>
                      </div>

                      {/* Preview de Parcelas */}
                      {installments.length >= 1 && (
                        <Card className="mt-3 p-3 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-blue-900 flex items-center gap-2">
                              <CreditCard className="w-3 h-3" />
                              Parcelas Calculadas
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {installments.length}x
                            </Badge>
                          </div>
                          <div className="space-y-1 max-h-32 overflow-y-auto mb-2">
                            {installments.map((inst) => {
                              // CORREÇÃO: Converter data corretamente do formato YYYY-MM-DD para evitar erro de timezone
                              const [year, month, day] = inst.dueDate.split('-').map(Number);
                              const dueDate = new Date(year, month - 1, day);
                              
                              return (
                                <div key={inst.number} className="flex justify-between text-xs">
                                  <span className="text-gray-700">
                                    {installments.length === 1 ? 'Parcela única' : `${inst.number}ª parcela`} - {dueDate.toLocaleDateString('pt-BR')}
                                  </span>
                                  <span className="text-gray-900">R$ {(inst.amount || 0).toFixed(2)}</span>
                                </div>
                              );
                            })}
                          </div>
                          {orderHeader.firstInstallmentDays > 0 && (
                            <p className="text-xs text-purple-700 bg-purple-50 p-2 rounded border border-purple-200">
                              💡 1ª parcela vence {orderHeader.firstInstallmentDays} dia(s) após {
                                orderHeader.dueDateReference === "issue" ? "emissão" :
                                orderHeader.dueDateReference === "billing" ? "faturamento" : "entrega"
                              }
                            </p>
                          )}
                        </Card>
                      )}
                    </div>

                    {/* Observações */}
                    <div className="grid grid-cols-2 gap-4 border-t pt-4">
                      <div>
                        <Label>Observações para o Cliente</Label>
                        <Textarea
                          value={orderHeader.customerNotes}
                          onChange={(e) => setOrderHeader({...orderHeader, customerNotes: e.target.value})}
                          placeholder="Informações que aparecerão no pedido para o cliente"
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label>Observações Internas</Label>
                        <Textarea
                          value={orderHeader.internalNotes}
                          onChange={(e) => setOrderHeader({...orderHeader, internalNotes: e.target.value})}
                          placeholder="Anotações internas, não visíveis ao cliente"
                          rows={3}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* ABA 2: ITENS DO PEDIDO */}
                  <TabsContent value="items" className="space-y-4 p-6">
                    {/* Seleção de Produto */}
                    <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                      <div className="flex items-center gap-2 mb-5">
                        <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                          <Plus className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="text-blue-900">Adicionar Item ao Pedido</h4>
                          <p className="text-xs text-blue-700">Selecione o produto e informe a quantidade</p>
                        </div>
                      </div>

                      {/* Linha 1: Produto e Quantidade */}
                      <div className="grid grid-cols-12 gap-4 mb-4">
                        <div className="col-span-8">
                          <Label className="text-gray-700 mb-2 block">Produto *</Label>
                          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                            <SelectTrigger className="w-full h-12 bg-white">
                              <SelectValue placeholder="Selecione o produto" />
                            </SelectTrigger>
                            <SelectContent>
                              {inventory.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.productName} - R$ {(product.pricePerUnit || 0).toFixed(2)} ({product.currentStock || 0} {product.unit} em estoque)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedProduct && (() => {
                            const product = inventory.find(p => p.id === selectedProduct);
                            return product ? (
                              <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                Estoque: {product.currentStock || 0} {product.unit} disponíveis
                              </p>
                            ) : null;
                          })()}
                        </div>

                        <div className="col-span-4">
                          <Label className="text-gray-700 mb-2 block">Quantidade *</Label>
                          <div className="relative">
                            <Input
                              type="number"
                              min="1"
                              step="1"
                              className="h-12 pr-16 bg-white text-base"
                              value={itemQuantity}
                              onChange={(e) => setItemQuantity(e.target.value)}
                              placeholder="Ex: 100"
                            />
                            {selectedProduct && (() => {
                              const product = inventory.find(p => p.id === selectedProduct);
                              return product ? (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                                  {product.unit}
                                </span>
                              ) : null;
                            })()}
                          </div>
                          {itemQuantity && selectedProduct && (() => {
                            const product = inventory.find(p => p.id === selectedProduct);
                            const qty = Number(itemQuantity);
                            return product && qty > 0 ? (
                              <p className="text-xs text-gray-600 mt-1">
                                Subtotal: R$ {(qty * (product.pricePerUnit || 0)).toFixed(2)}
                              </p>
                            ) : null;
                          })()}
                        </div>
                      </div>

                      {/* Linha 2: Tipo de Desconto, Valor de Desconto e Botão */}
                      <div className="grid grid-cols-12 gap-4 items-end">
                        <div className="col-span-4">
                          <Label className="text-gray-700 mb-2 block">Tipo de Desconto</Label>
                          <Select value={itemDiscountType} onValueChange={(value: "percentage" | "value") => setItemDiscountType(value)}>
                            <SelectTrigger className="h-12 bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">
                                <div className="flex items-center gap-2">
                                  <Percent className="w-4 h-4" />
                                  Percentual (%)
                                </div>
                              </SelectItem>
                              <SelectItem value="value">
                                <div className="flex items-center gap-2">
                                  <DollarSign className="w-4 h-4" />
                                  Valor Fixo (R$)
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="col-span-4">
                          <Label className="text-gray-700 mb-2 block">Valor do Desconto</Label>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              className="h-12 pl-8 bg-white text-base"
                              value={itemDiscountAmount}
                              onChange={(e) => setItemDiscountAmount(e.target.value)}
                              placeholder="0.00"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                              {itemDiscountType === 'percentage' ? '%' : 'R$'}
                            </span>
                          </div>
                          {itemDiscountAmount && Number(itemDiscountAmount) > 0 && itemQuantity && selectedProduct && (() => {
                            const product = inventory.find(p => p.id === selectedProduct);
                            const qty = Number(itemQuantity);
                            const discount = Number(itemDiscountAmount);
                            if (!product || qty <= 0) return null;
                            
                            const subtotal = qty * (product.pricePerUnit || 0);
                            const discountValue = itemDiscountType === 'percentage' 
                              ? (subtotal * discount / 100) 
                              : discount;
                            const total = subtotal - discountValue;
                            
                            return (
                              <p className="text-xs text-green-700 mt-1">
                                Total com desconto: R$ {total.toFixed(2)}
                              </p>
                            );
                          })()}
                        </div>

                        <div className="col-span-4">
                          <Button 
                            onClick={handleAddItem} 
                            className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base gap-2"
                          >
                            <Plus className="w-5 h-5" />
                            Adicionar Item
                          </Button>
                        </div>
                      </div>

                      {/* Preview do Item */}
                      {selectedProduct && itemQuantity && Number(itemQuantity) > 0 && (() => {
                        const product = inventory.find(p => p.id === selectedProduct);
                        const qty = Number(itemQuantity);
                        const discount = Number(itemDiscountAmount) || 0;
                        
                        if (!product) return null;
                        
                        const unitPrice = product.pricePerUnit || 0;
                        const subtotal = qty * unitPrice;
                        const discountValue = itemDiscountType === 'percentage' 
                          ? (subtotal * discount / 100) 
                          : discount;
                        const total = subtotal - discountValue;
                        
                        return (
                          <div className="mt-4 p-4 bg-white border-2 border-blue-300 rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                                  <span className="text-sm text-blue-900">Preview do item a ser adicionado</span>
                                </div>
                                <p className="text-gray-900 mb-1">{product.productName}</p>
                                <div className="flex gap-4 text-sm text-gray-600">
                                  <span>Qtd: <strong>{qty} {product.unit}</strong></span>
                                  <span>Preço Unit.: <strong>R$ {unitPrice.toFixed(2)}</strong></span>
                                  {discountValue > 0 && (
                                    <span className="text-orange-600">
                                      Desconto: <strong>
                                        {itemDiscountType === 'percentage' 
                                          ? `${discount}% (R$ ${discountValue.toFixed(2)})` 
                                          : `R$ ${discount.toFixed(2)}`}
                                      </strong>
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500">Total do item</p>
                                <p className="text-2xl text-blue-700">
                                  R$ {total.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </Card>

                    {/* Lista de Itens */}
                    {orderItems.length === 0 ? (
                      <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p>Nenhum item adicionado ao pedido</p>
                        <p className="text-sm text-gray-400 mt-1">Adicione produtos usando o formulário acima</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-gray-700" />
                            <h4 className="text-gray-900">Itens do Pedido</h4>
                            <Badge variant="secondary" className="ml-2">
                              {orderItems.length} {orderItems.length === 1 ? 'item' : 'itens'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            Total: <strong className="text-blue-700 text-base">
                              R$ {orderItems.reduce((sum, item) => sum + (item.subtotal || 0), 0).toFixed(2)}
                            </strong>
                          </p>
                        </div>
                        <Card className="overflow-hidden">
                          <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead className="w-[60px] py-3"></TableHead>
                              <TableHead className="py-3">Produto</TableHead>
                              <TableHead className="text-right py-3 w-[100px]">Qtd</TableHead>
                              <TableHead className="text-right py-3 w-[120px]">Preço Unit.</TableHead>
                              <TableHead className="text-right py-3 w-[120px]">Desconto</TableHead>
                              <TableHead className="text-right py-3 w-[140px]">Subtotal</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {orderItems.map((item, index) => (
                              <TableRow key={index} className="hover:bg-gray-50">
                                <TableCell className="py-4">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start">
                                      <DropdownMenuLabel>Ações do Item</DropdownMenuLabel>
                                      <DropdownMenuItem onClick={() => handleEditItemQuantity(index)}>
                                        <Edit className="w-4 h-4 mr-2" />
                                        Editar Quantidade
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => handleRemoveItem(index)}
                                        className="text-red-600 focus:text-red-600"
                                      >
                                        <X className="w-4 h-4 mr-2" />
                                        Remover Item
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                                <TableCell className="py-4">
                                  <div>
                                    <p className="text-gray-900">{item.productName}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">ID: {item.productId}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right py-4">
                                  <span className="text-gray-900">{item.quantity || 0}</span>
                                </TableCell>
                                <TableCell className="text-right py-4">
                                  <span className="text-gray-900">R$ {(item.unitPrice || 0).toFixed(2)}</span>
                                </TableCell>
                                <TableCell className="text-right py-4">
                                  {(item.discountAmount || 0) > 0 ? (
                                    <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                      {item.discountType === "percentage" 
                                        ? `${item.discountAmount || 0}%` 
                                        : `R$ ${(item.discountAmount || 0).toFixed(2)}`}
                                    </Badge>
                                  ) : (
                                    <span className="text-gray-400 text-xs">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right py-4">
                                  <span className="text-blue-700">R$ {(item.subtotal || 0).toFixed(2)}</span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Card>
                      </div>
                    )}

                    {/* Resumo dos Itens */}
                    {orderItems.length > 0 && (
                      <Card className="p-4 bg-gray-50">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Subtotal dos Itens:</span>
                            <span className="text-gray-900">R$ {calculateItemsSubtotal().toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Desconto do Pedido:</span>
                            <span className="text-red-600">- R$ {calculateOrderDiscount().toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Frete:</span>
                            <span className="text-gray-900">R$ {(shippingInfo.shippingCost || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t">
                            <span className="text-gray-900">Total do Pedido:</span>
                            <span className="text-gray-900">R$ {calculateGrandTotal().toFixed(2)}</span>
                          </div>
                        </div>
                      </Card>
                    )}
                  </TabsContent>

                  {/* ABA 3: FRETE */}
                  <TabsContent value="shipping" className="space-y-4 p-6">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Transportadora */}
                      <div>
                        <Label>Transportadora</Label>
                        <div className="relative">
                          <Truck className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            className="pl-10"
                            value={shippingInfo.carrier}
                            onChange={(e) => setShippingInfo({...shippingInfo, carrier: e.target.value})}
                            placeholder="Nome da transportadora"
                          />
                        </div>
                      </div>

                      {/* Tipo de Frete */}
                      <div>
                        <Label>Tipo de Frete</Label>
                        <Select 
                          value={shippingInfo.shippingType} 
                          onValueChange={(value) => setShippingInfo({...shippingInfo, shippingType: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cif">CIF - Vendedor Paga</SelectItem>
                            <SelectItem value="fob">FOB - Comprador Paga</SelectItem>
                            <SelectItem value="terceiros">Por Conta de Terceiros</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Valor do Frete */}
                      <div>
                        <Label>Valor do Frete (R$)</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            type="number"
                            step="0.01"
                            className="pl-10"
                            value={shippingInfo.shippingCost}
                            onChange={(e) => setShippingInfo({...shippingInfo, shippingCost: Number(e.target.value) || 0})}
                            placeholder="0,00"
                          />
                        </div>
                      </div>

                      {/* Código de Rastreamento */}
                      <div>
                        <Label>Código de Rastreamento</Label>
                        <Input
                          value={shippingInfo.trackingCode}
                          onChange={(e) => setShippingInfo({...shippingInfo, trackingCode: e.target.value})}
                          placeholder="Ex: BR123456789BR"
                        />
                      </div>
                    </div>

                    {/* Observações sobre Frete */}
                    <div>
                      <Label>Observações sobre o Frete</Label>
                      <Textarea
                        value={shippingInfo.shippingNotes}
                        onChange={(e) => setShippingInfo({...shippingInfo, shippingNotes: e.target.value})}
                        placeholder="Informações adicionais sobre entrega, endereço especial, horário preferido, etc."
                        rows={4}
                      />
                    </div>

                    {/* Informações do Cliente */}
                    {selectedCustomer && (
                      <Card className="p-4 bg-blue-50 border-blue-200">
                        <h4 className="text-sm text-blue-900 mb-2">📍 Endereço de Entrega</h4>
                        <p className="text-sm text-gray-700">{selectedCustomer.address}</p>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-600">
                          <div>
                            <span className="font-medium">Cidade:</span> {selectedCustomer.city}
                          </div>
                          <div>
                            <span className="font-medium">Estado:</span> {selectedCustomer.state}
                          </div>
                          <div>
                            <span className="font-medium">CEP:</span> {selectedCustomer.zipCode}
                          </div>
                          <div>
                            <span className="font-medium">Contato:</span> {selectedCustomer.phone}
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Preview do Total com Frete */}
                    <Card className="p-4 bg-green-50 border-green-200">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-gray-600">Total do Pedido (com frete)</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {orderItems.length} item(ns) + R$ {(shippingInfo.shippingCost || 0).toFixed(2)} (frete)
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl text-green-700">
                            R$ {calculateGrandTotal().toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </TabsContent>
                </div>
              </Tabs>

              {/* Botões de Ação */}
              <div className="pt-4 pb-6 border-t flex gap-3 px-6 bg-white">
                <Button onClick={handleCreateOrder} className="flex-1 bg-green-600 hover:bg-green-700 h-11">
                  <FileText className="w-4 h-4 mr-2" />
                  {editingOrderId ? "Atualizar Pedido" : "Criar Pedido"}
                </Button>
                <Button onClick={() => handleDialogClose(false)} variant="outline" className="h-11 px-6">
                  Cancelar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Em Processamento</p>
                <p className="text-gray-900">{totalProcessing}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Enviados</p>
                <p className="text-gray-900">{totalShipped}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Receita Total</p>
                <p className="text-gray-900">R$ {totalRevenue.toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Fluxo de Status - Info Card */}
        <Card className="p-4 mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                🚀 Controle Inteligente de Status
              </h3>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge className="bg-blue-100 text-blue-700">🔵 Processando</Badge>
                <span className="text-gray-400">→</span>
                <Badge className="bg-purple-100 text-purple-700">🟣 Confirmado</Badge>
                <span className="text-gray-400">→</span>
                <Badge className="bg-yellow-100 text-yellow-700">🟡 Enviado</Badge>
                <span className="text-xs text-gray-500">(baixa estoque)</span>
                <span className="text-gray-400">→</span>
                <Badge className="bg-green-100 text-green-700">🟢 Entregue</Badge>
                <span className="text-xs text-gray-500">(gera transações)</span>
                <span className="text-gray-400">→</span>
                <Badge className="bg-orange-100 text-orange-700">🟠 Parcialmente Concluído</Badge>
                <span className="text-gray-400">→</span>
                <Badge className="bg-emerald-100 text-emerald-700">🟢 Concluído</Badge>
              </div>
              <p className="text-xs text-gray-600">
                💡 Os lançamentos financeiros são criados automaticamente ao entregar o pedido e devem ser baixados manualmente quando o pagamento for recebido. Use <History className="inline w-3 h-3" /> para ver o histórico.
              </p>
            </div>
          </div>
        </Card>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Pesquisar pedidos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Orders Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Ações</TableHead>
              <TableHead>ID do Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Emissão</TableHead>
              <TableHead>Entrega</TableHead>
              <TableHead>Valor Total</TableHead>
              <TableHead>Forma de Pgto</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Tabela de Preço</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Parcelas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((order) => {
              const priceTable = order.priceTableId ? getPriceTableById(order.priceTableId) : priceTables.find(t => t.isDefault);
              const firstDueDate = calculateFirstDueDate(order);
              const installmentsInfo = getInstallmentsInfo(order.id);
              
              return (
                <TableRow key={order.id}>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => {
                          setSelectedOrderForHistory(order);
                          setIsHistoryOpen(true);
                        }}>
                          <History className="mr-2 h-4 w-4" />
                          Histórico de Status
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setInvoiceOrder(order);
                          setIsInvoiceOpen(true);
                        }}>
                          <FileText className="mr-2 h-4 w-4" />
                          Espelho do Pedido
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleEditOrder(order)}
                          disabled={order.status === "Concluído" || order.status === "Parcialmente Concluído"}
                          className={order.status === "Concluído" || order.status === "Parcialmente Concluído" ? "opacity-50 cursor-not-allowed" : ""}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Editar Pedido
                          {(order.status === "Concluído" || order.status === "Parcialmente Concluído") && 
                            <span className="ml-1 text-xs">(bloqueado)</span>
                          }
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicateOrder(order)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicar Pedido
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell>{order.id}</TableCell>
                  <TableCell>{order.customer}</TableCell>
                  <TableCell>
                    {order.issueDate ? formatDateLocal(order.issueDate) : formatDateLocal(order.orderDate)}
                  </TableCell>
                  <TableCell>{formatDateLocal(order.deliveryDate)}</TableCell>
                  <TableCell>R$ {(order.totalAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>
                    {order.paymentMethod ? 
                      order.paymentMethod === 'pix' ? 'PIX' :
                      order.paymentMethod === 'credit_card' ? 'Cartão de Crédito' :
                      order.paymentMethod === 'debit_card' ? 'Cartão de Débito' :
                      order.paymentMethod === 'bank_slip' ? 'Boleto' :
                      order.paymentMethod === 'bank_transfer' ? 'Transferência' :
                      order.paymentMethod === 'check' ? 'Cheque' :
                      order.paymentMethod === 'cash' ? 'Dinheiro' :
                      order.paymentMethod 
                    : '-'}
                  </TableCell>
                  <TableCell>
                    {order.paymentCondition ? (
                      <div className="flex flex-col">
                        <span className="text-sm">
                          {formatDateLocal(firstDueDate)}
                        </span>
                        {order.paymentCondition !== '1' && (
                          <span className="text-xs text-gray-500">
                            (1ª de {order.paymentCondition}x)
                          </span>
                        )}
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {priceTable ? (
                      <div className="flex items-center gap-1">
                        <Tag className="w-3 h-3 text-purple-600" />
                        <span className="text-purple-700">{priceTable.name}</span>
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>{order.salesPerson || '-'}</TableCell>
                  <TableCell>
                    <Select
                      value={order.status}
                      onValueChange={(value) => handleStatusChange(order.id, value)}
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue>
                          <Badge className={getStatusColor(order.status)}>
                            {getStatusIcon(order.status)}
                            {order.status}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {/* Status atual sempre visível mas desabilitado */}
                        <SelectItem value={order.status} disabled>
                          {order.status} (atual)
                        </SelectItem>
                        
                        {/* Apenas status válidos para transição MANUAL (exclui automáticos) */}
                        {getValidManualNextStatuses(order.status as any, 'sales').map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {installmentsInfo ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {installmentsInfo.received}/{installmentsInfo.total}
                        </span>
                        {installmentsInfo.received === installmentsInfo.total ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" title="Todas as parcelas recebidas" />
                        ) : installmentsInfo.received > 0 ? (
                          <AlertTriangle className="w-4 h-4 text-orange-600" title="Pagamento parcial" />
                        ) : (
                          <Clock className="w-4 h-4 text-blue-600" title="Nenhuma parcela recebida" />
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        
        {/* Controles de Paginação */}
        <div className="p-4 border-t">
          <PaginationControls
            pagination={pagination}
            controls={controls}
            itemsPerPageOptions={[10, 25, 50, 100]}
          />
        </div>
      </Card>

      {/* Espelho do Pedido */}
      <SalesOrderInvoice
        order={invoiceOrder}
        isOpen={isInvoiceOpen}
        onClose={() => {
          setIsInvoiceOpen(false);
          setInvoiceOrder(null);
        }}
      />

      {/* Histórico de Status */}
      {selectedOrderForHistory && (
        <StatusHistoryTimeline
          history={selectedOrderForHistory.statusHistory || []}
          open={isHistoryOpen}
          onOpenChange={setIsHistoryOpen}
          orderId={selectedOrderForHistory.id}
        />
      )}

      {/* Gerenciamento de Vendedores e Compradores */}
      <SalesAndPurchasePersonManagement
        isOpen={isPersonManagementOpen}
        onClose={() => setIsPersonManagementOpen(false)}
        defaultTab="salespeople"
      />
    </div>
  );
}
