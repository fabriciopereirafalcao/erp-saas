import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { toast } from 'sonner';
import {
  acquireLock,
  releaseLock,
  validateStockReduction,
  validateAccountsCreation,
  validatePayment,
  validateStockAvailability
} from '../utils/stockValidation';
import {
  validateSalesOrderStatusTransition,
  logTransitionAttempt,
  getValidNextStatuses,
  getSkippedStatuses as getSkippedStatusesFromValidator
} from '../utils/statusTransitionValidation';
import { 
  logAuditAction, 
  logAccess, 
  AUDIT_ACTIONS, 
  AUDIT_MODULES 
} from '../utils/auditLogger';
import { AuditIssue } from '../utils/systemAnalyzer';
import { saveToStorage, loadFromStorage, STORAGE_KEYS, getStorageKey, migrateStorageData } from '../utils/localStorage';
import { addDaysToDate } from '../utils/dateUtils';
import { authGet, authPatch } from '../utils/authFetch';
import { projectId } from '../utils/supabase/info';
import { mapDatabaseToSettings, mapSettingsToDatabase } from '../utils/companyDataMapper';
import { useAuth } from './AuthContext';
import { useSupabaseSync, loadFromSupabase } from '../hooks/useSupabaseSync';

// ==================== INTERFACES ====================

export interface Customer {
  id: string;
  documentType: "PJ" | "PF";
  document: string;
  name: string;
  company: string;
  tradeName: string;
  segment: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  stateRegistration: string;
  cityRegistration: string;
  icmsContributor: boolean;
  totalOrders: number;
  totalSpent: number;
  status: "Ativo" | "Inativo";
  priceTableId?: string; // Tabela de preço vinculada
}

export interface Supplier {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  totalPurchases: number;
  totalSpent: number;
  status: "Ativo" | "Inativo";
  documentType: "PJ" | "PF";
  document: string;
  tradeName: string;
  segment: string;
  contactPerson: string;
  stateRegistration: string;
  cityRegistration: string;
  icmsContributor: boolean;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface Salesperson {
  id: string;
  name: string;
  cpf: string;
}

export interface Buyer {
  id: string;
  name: string;
  cpf: string;
}

// Histórico de Status de Pedido
export interface StatusHistoryEntry {
  id: string;
  timestamp: string;
  user: string;
  previousStatus: string;
  newStatus: string;
  actionsExecuted: string[];
  generatedIds: { type: string; id: string }[];
  notes?: string;
  isExceptional?: boolean;
}

// Flags de controle de ações executadas
export interface OrderActionFlags {
  stockReduced?: boolean;
  accountsReceivableCreated?: boolean;
  accountsReceivablePaid?: boolean;
  stockReductionId?: string;
  accountsReceivableId?: string;
  financialTransactionId?: string;
  customerStatsUpdated?: boolean;
}

// Item individual de um pedido multi-item
export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountType: "percentage" | "value";
  discountAmount: number;
  subtotal: number;
}

export interface SalesOrder {
  id: string;
  customer: string;
  customerId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: "Processando" | "Confirmado" | "Enviado" | "Entregue" | "Parcialmente Concluído" | "Concluído" | "Cancelado";
  orderDate: string;
  issueDate?: string;
  billingDate?: string;
  deliveryDate: string;
  paymentMethod?: string;
  paymentCondition?: string;
  priceTableId?: string;
  revenueCategoryId?: string;
  salesPerson?: string;
  bankAccountId?: string;
  firstInstallmentDays?: number;
  dueDateReference?: "issue" | "billing" | "delivery";
  statusHistory?: StatusHistoryEntry[];
  actionFlags?: OrderActionFlags;
  isExceptionalOrder?: boolean;
  items?: OrderItem[]; // Array de itens para pedidos multi-item
}

export interface PurchaseOrder {
  id: string;
  supplier: string;
  supplierId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: "Processando" | "Confirmado" | "Enviado" | "Recebido" | "Parcialmente Concluído" | "Concluído" | "Cancelado";
  orderDate: string;
  issueDate?: string;
  billingDate?: string;
  deliveryDate: string;
  paymentMethod?: string;
  paymentCondition?: string;
  priceTableId?: string;
  expenseCategoryId?: string;
  buyer?: string;
  bankAccountId?: string;
  firstInstallmentDays?: number;
  dueDateReference?: "issue" | "billing" | "delivery";
  statusHistory?: StatusHistoryEntry[];
  actionFlags?: OrderActionFlags;
  isExceptionalOrder?: boolean;
  items?: OrderItem[]; // Array de itens para pedidos multi-item
}

// Interface Transaction removida - agora usamos FinancialTransaction para tudo

// Formas de Pagamento
export interface PaymentMethod {
  id: string;
  name: string; // PIX, TED, Boleto, Cartão de Crédito, Cartão de Débito, Dinheiro, Cheque
  type: "À Vista" | "A Prazo";
  installmentsAllowed: boolean;
  isActive: boolean;
}

// Categoria de Conta (Plano de Contas)
export interface AccountCategory {
  id: string;
  type: "Receita" | "Despesa";
  code: string; // Código contábil (ex: 1.1.01)
  name: string;
  parentId?: string; // Para criar hierarquia
  description: string;
  isActive: boolean;
}

// Transação Financeira Manual
export interface FinancialTransaction {
  id: string;
  type: "Receita" | "Despesa";
  date: string;
  dueDate: string;
  paymentDate?: string; // Data de pagamento/recebimento efetivo (DEPRECATED - usar effectiveDate)
  effectiveDate?: string; // Data de recebimento/pagamento efetivo (NOVA)
  partyType: "Cliente" | "Fornecedor" | "Outro";
  partyId?: string;
  partyName: string;
  categoryId: string;
  categoryName: string;
  bankAccountId: string;
  bankAccountName: string;
  paymentMethodId: string;
  paymentMethodName: string;
  amount: number;
  status: "A Receber" | "Recebido" | "A Pagar" | "Pago" | "Cancelado";
  costCenterId?: string;
  costCenterName?: string;
  description: string;
  installmentNumber?: number; // Parcela atual
  totalInstallments?: number; // Total de parcelas
  parentTransactionId?: string; // ID da transação pai (para parcelas)
  origin: "Manual" | "Pedido";
  reference?: string; // Referência ao pedido que originou
  markedBy?: string; // Usuário que marcou como recebido/pago
  markedAt?: string; // Data/hora que foi marcado
  isTransfer?: boolean; // Indica se é uma transferência entre contas
  transferPairId?: string; // ID da transação par da transferência
  transferDirection?: "origem" | "destino"; // Direção da transferência
}

// Conta a Receber
export interface AccountReceivable {
  id: string;
  customerId: string;
  customerName: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  paymentDate?: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  status: "A Vencer" | "Vencido" | "Recebido" | "Parcial" | "Cancelado";
  paymentMethodId?: string;
  bankAccountId?: string;
  installmentNumber?: number;
  totalInstallments?: number;
  description: string;
  reference?: string; // Referência ao pedido de venda
}

// Conta a Pagar
export interface AccountPayable {
  id: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  paymentDate?: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  status: "A Vencer" | "Vencido" | "Pago" | "Parcial" | "Cancelado";
  paymentMethodId?: string;
  bankAccountId?: string;
  installmentNumber?: number;
  totalInstallments?: number;
  description: string;
  reference?: string; // Referência ao pedido de compra
}

// Movimento Bancário (para conciliação)
export interface BankMovement {
  id: string;
  bankAccountId: string;
  date: string;
  description: string;
  type: "Entrada" | "Saída";
  amount: number;
  balance: number; // Saldo após movimento
  reconciled: boolean;
  reconciledWithId?: string; // ID da transação financeira reconciliada
  imported: boolean; // Se foi importado de extrato
}

// Fluxo de Caixa
export interface CashFlowEntry {
  id: string;
  date: string;
  type: "Entrada" | "Saída";
  category: string;
  description: string;
  amount: number;
  status: "Realizado" | "Previsto" | "Projetado";
  bankAccountId?: string;
  reference?: string;
}

export interface InventoryItem {
  id: string;
  productName: string;
  category: string;
  currentStock: number;
  unit: string;
  reorderLevel: number;
  pricePerUnit: number;
  costPrice: number; // Custo do produto
  sellPrice: number; // Preço de venda
  markup: number; // Markup em percentual
  lastRestocked: string;
  status: "Em Estoque" | "Baixo Estoque" | "Fora de Estoque";
  // Dados Fiscais
  ncm?: string; // Nomenclatura Comum do Mercosul
  cest?: string; // Código Especificador da Substituição Tributária
  origin?: string; // Origem da Mercadoria
  serviceCode?: string; // Código de Serviço (se produto de serviço)
  csosn?: string; // CSOSN (Simples Nacional)
  cst?: string; // CST (Lucro Real/Presumido)
  icmsRate?: number; // Alíquota ICMS
  pisRate?: number; // Alíquota PIS
  cofinsRate?: number; // Alíquota COFINS
  ipiRate?: number; // Alíquota IPI
  cfop?: string; // CFOP específico do produto (sobrescreve o padrão da empresa)
  taxCustomized?: boolean; // Indica se os dados fiscais foram customizados (não herdados)
  // MED-005: Controle de rastreabilidade
  requiresBatchControl?: boolean; // Se o produto exige controle por lote
  requiresExpiryDate?: boolean; // Se o produto tem data de validade
  defaultLocation?: string; // Localização padrão no depósito
  shelfLife?: number; // Validade em dias (a partir da fabricação)
}

export interface PriceTableItem {
  productName: string;
  price: number;
  discount?: number; // Desconto em percentual
}

export interface PriceTable {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  items: PriceTableItem[];
  createdAt: string;
  updatedAt: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountType: "Conta Corrente" | "Poupança" | "Investimentos" | "Caixa";
  agency: string;
  accountNumber: string;
  balance: number;
  isPrimary: boolean;
}

export interface RevenueGroup {
  id: string;
  name: string;
  description: string;
  subgroups: string[];
}

export interface ExpenseGroup {
  id: string;
  name: string;
  description: string;
  subgroups: string[];
}

export interface CostCenter {
  id: string;
  name: string;
  type: "Receita" | "Gasto";
  description: string;
  responsiblePerson: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  date: string;
  time: string;
  type: "Entrada" | "Saída";
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  description?: string;
  reference?: string;
  // MED-005: Campos de rastreabilidade
  batchNumber?: string; // Número do lote
  expiryDate?: string; // Data de validade (YYYY-MM-DD)
  location?: string; // Localização no depósito (ex: "A-01-03")
  supplierBatchNumber?: string; // Número do lote do fornecedor (se diferente)
  manufacturingDate?: string; // Data de fabricação
  serialNumbers?: string[]; // Números de série (para itens serializados)
}

export interface ICMSInterstateRate {
  id: string;
  state: string; // UF de destino
  rate: number; // Alíquota
}

export interface CompanySettings {
  // Dados Gerais
  cnpj: string;
  companyName: string;
  tradeName: string;
  sector: string;
  description: string;
  email: string;
  phone: string;
  website: string;
  logo?: string; // Logo da empresa em base64 ou URL
  // Endereço
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  // Outros
  stateRegistration: string;
  cityRegistration: string;
  // Dados Bancários e Financeiros
  bankAccounts: BankAccount[];
  revenueGroups: RevenueGroup[];
  expenseGroups: ExpenseGroup[];
  costCenters: CostCenter[];
  // Dados Fiscais e Tributários
  taxRegime?: "Simples Nacional" | "Lucro Presumido" | "Lucro Real";
  defaultCSOSN?: string; // CSOSN padrão (se Simples Nacional)
  defaultCST?: string; // CST padrão (se Lucro Real/Presumido)
  defaultICMSRate?: number; // Alíquota ICMS padrão
  icmsInterstateRates?: ICMSInterstateRate[]; // Tabela de ICMS interestadual
  cfopInState?: string; // CFOP para venda dentro do estado
  cfopOutState?: string; // CFOP para venda fora do estado
  cfopPurchase?: string; // CFOP compras
  cfopReturn?: string; // CFOP devoluções
  cfopService?: string; // CFOP serviços
  pisCofinsRegime?: "Cumulativo" | "Não Cumulativo";
  defaultPISRate?: number; // Alíquota PIS padrão
  defaultCOFINSRate?: number; // Alíquota COFINS padrão
  nfeNumber?: string; // Série NF-e
  nfeEnvironment?: "Homologação" | "Produção"; // Ambiente
  taxSubstitution?: boolean; // Habilitar Substituição Tributária
  allowProductOverride?: boolean; // Permitir sobrescrever no produto
}

// Histórico de Alterações da Empresa
export interface CompanyHistoryEntry {
  id: string;
  timestamp: string;
  user: string;
  userId: string;
  changes: {
    field: string;
    fieldLabel: string;
    oldValue: any;
    newValue: any;
  }[];
  section: string; // Ex: "Dados Gerais", "Endereço", "Fiscal", etc.
}

// ==================== CONTEXT ====================

interface ERPContextData {
  // State
  customers: Customer[];
  suppliers: Supplier[];
  salesOrders: SalesOrder[];
  inventory: InventoryItem[];
  stockMovements: StockMovement[];
  priceTables: PriceTable[];
  companySettings: CompanySettings;
  salespeople: Salesperson[];
  buyers: Buyer[];
  
  // Financial State
  paymentMethods: PaymentMethod[];
  accountCategories: AccountCategory[];
  financialTransactions: FinancialTransaction[];
  accountsReceivable: AccountReceivable[];
  accountsPayable: AccountPayable[];
  bankMovements: BankMovement[];
  cashFlowEntries: CashFlowEntry[];
  
  // Audit State
  auditIssues: AuditIssue[];
  lastAnalysisDate: Date | null;
  setAuditResults: (issues: AuditIssue[], analysisDate: Date) => void;
  
  // Customer Actions
  addCustomer: (customer: Omit<Customer, 'id' | 'totalOrders' | 'totalSpent'>) => void;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  
  // Supplier Actions
  addSupplier: (supplier: Omit<Supplier, 'id' | 'totalPurchases' | 'totalSpent'>) => void;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
  
  // Sales Order Actions
  addSalesOrder: (order: Omit<SalesOrder, 'id' | 'orderDate'>) => void;
  updateSalesOrder: (id: string, orderData: Omit<SalesOrder, 'id' | 'orderDate'>) => void;
  updateSalesOrderStatus: (id: string, status: SalesOrder['status']) => void;
  
  // Purchase Order Actions
  purchaseOrders: PurchaseOrder[];
  addPurchaseOrder: (order: Omit<PurchaseOrder, 'id' | 'orderDate'>, isExceptional?: boolean) => void;
  updatePurchaseOrder: (id: string, orderData: Omit<PurchaseOrder, 'id' | 'orderDate'>) => void;
  updatePurchaseOrderStatus: (id: string, status: PurchaseOrder['status']) => void;
  
  // Inventory Actions
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'status' | 'lastRestocked'>) => void;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => void;
  updateInventory: (productName: string, quantityChange: number, reference?: string) => void;
  addStockMovement: (productId: string, quantity: number, reason: string, description?: string) => void;
  getStockMovementsByProduct: (productId: string) => StockMovement[];
  checkStockAvailability: (productName: string, quantity: number, excludeOrderId?: string) => {
    isAvailable: boolean;
    available: number;
    reserved: number;
    currentStock: number;
    message: string;
  };
  
  // Product Category Actions
  productCategories: string[];
  addProductCategory: (category: string) => void;
  deleteProductCategory: (category: string) => void;
  
  // Price Table Actions
  addPriceTable: (priceTable: Omit<PriceTable, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePriceTable: (id: string, priceTable: Partial<PriceTable>) => void;
  deletePriceTable: (id: string) => void;
  getPriceTableById: (id: string) => PriceTable | undefined;
  getDefaultPriceTable: () => PriceTable | undefined;
  
  // Company Settings Actions
  companyHistory: CompanyHistoryEntry[];
  updateCompanySettings: (settings: Partial<CompanySettings>, showToast?: boolean) => void;
  getCompanyHistory: () => CompanyHistoryEntry[];
  addBankAccount: (account: Omit<BankAccount, 'id'>) => void;
  updateBankAccount: (id: string, account: Partial<BankAccount>) => void;
  deleteBankAccount: (id: string) => void;
  addRevenueGroup: (group: Omit<RevenueGroup, 'id'>) => void;
  updateRevenueGroup: (id: string, group: Partial<RevenueGroup>) => void;
  deleteRevenueGroup: (id: string) => void;
  addExpenseGroup: (group: Omit<ExpenseGroup, 'id'>) => void;
  updateExpenseGroup: (id: string, group: Partial<ExpenseGroup>) => void;
  deleteExpenseGroup: (id: string) => void;
  addCostCenter: (center: Omit<CostCenter, 'id'>) => void;
  updateCostCenter: (id: string, center: Partial<CostCenter>) => void;
  deleteCostCenter: (id: string) => void;
  
  // Salesperson and Buyer Actions
  addSalesperson: (salesperson: Omit<Salesperson, 'id'>) => void;
  updateSalesperson: (id: string, salesperson: Partial<Salesperson>) => void;
  deleteSalesperson: (id: string) => void;
  addBuyer: (buyer: Omit<Buyer, 'id'>) => void;
  updateBuyer: (id: string, buyer: Partial<Buyer>) => void;
  deleteBuyer: (id: string) => void;
  
  // Financial Actions
  addPaymentMethod: (method: Omit<PaymentMethod, 'id'>) => void;
  updatePaymentMethod: (id: string, method: Partial<PaymentMethod>) => void;
  deletePaymentMethod: (id: string) => void;
  
  addAccountCategory: (category: Omit<AccountCategory, 'id'>) => void;
  updateAccountCategory: (id: string, category: Partial<AccountCategory>) => void;
  deleteAccountCategory: (id: string) => void;
  
  addFinancialTransaction: (transaction: Omit<FinancialTransaction, 'id'>) => void;
  updateFinancialTransaction: (id: string, transaction: Partial<FinancialTransaction>) => void;
  deleteFinancialTransaction: (id: string) => void;
  markTransactionAsReceived: (id: string, effectiveDate: string, bankAccountId?: string, bankAccountName?: string, paymentMethodId?: string, paymentMethodName?: string) => void;
  markTransactionAsPaid: (id: string, effectiveDate: string, bankAccountId?: string, bankAccountName?: string, paymentMethodId?: string, paymentMethodName?: string) => void;
  
  addAccountReceivable: (account: Omit<AccountReceivable, 'id'>) => void;
  updateAccountReceivable: (id: string, account: Partial<AccountReceivable>) => void;
  markAsReceived: (id: string, paymentDate: string, amount: number, bankAccountId: string) => void;
  
  addAccountPayable: (account: Omit<AccountPayable, 'id'>) => void;
  updateAccountPayable: (id: string, account: Partial<AccountPayable>) => void;
  markAsPaid: (id: string, paymentDate: string, amount: number, bankAccountId: string) => void;
  
  addBankMovement: (movement: Omit<BankMovement, 'id'>) => void;
  reconcileBankMovement: (movementId: string, transactionId: string) => void;
  importBankStatement: (bankAccountId: string, movements: Omit<BankMovement, 'id' | 'bankAccountId' | 'reconciled' | 'imported'>[]) => void;
  
  addCashFlowEntry: (entry: Omit<CashFlowEntry, 'id'>) => void;
  updateCashFlowEntry: (id: string, entry: Partial<CashFlowEntry>) => void;
  deleteCashFlowEntry: (id: string) => void;
  
  // Reconciliation Actions
  reconciliationStatus: Record<string, boolean>;
  toggleReconciliationStatus: (reconciliationKey: string) => void;
}

const ERPContext = createContext<ERPContextData | undefined>(undefined);

// ==================== INITIAL DATA ====================
// Sistema inicializado sem dados - Pronto para primeiro acesso

const initialCustomers: Customer[] = [];

const initialSuppliers: Supplier[] = [];

const initialInventory: InventoryItem[] = [];

const initialSalesOrders: SalesOrder[] = [];

// initialTransactions removido - agora usamos apenas financialTransactions

const initialPriceTables: PriceTable[] = [];

// Métodos de pagamento padrão - mantidos para funcionalidade básica do sistema
const initialPaymentMethods: PaymentMethod[] = [
  { id: "PM-001", name: "PIX", type: "À Vista", installmentsAllowed: false, isActive: true },
  { id: "PM-002", name: "Boleto Bancário", type: "A Prazo", installmentsAllowed: true, isActive: true },
  { id: "PM-003", name: "Dinheiro", type: "À Vista", installmentsAllowed: false, isActive: true }
];

// Plano de Contas básico - mantido para funcionalidade essencial do sistema
const initialAccountCategories: AccountCategory[] = [
  // Receitas básicas
  { id: "AC-001", type: "Receita", code: "3.1.01", name: "Vendas de Produtos", description: "Receita com venda de produtos", isActive: true },
  { id: "AC-002", type: "Receita", code: "3.2.01", name: "Receitas Financeiras", description: "Juros, rendimentos de aplicações", isActive: true },
  
  // Despesas básicas
  { id: "AC-003", type: "Despesa", code: "4.1.01", name: "Custos com Produtos", description: "Custo das mercadorias vendidas", isActive: true },
  { id: "AC-004", type: "Despesa", code: "4.2.01", name: "Despesas Operacionais", description: "Despesas gerais do negócio", isActive: true }
];

const initialAccountsReceivable: AccountReceivable[] = [];

const initialAccountsPayable: AccountPayable[] = [];

// ==================== PROVIDER ====================

export function ERPProvider({ children }: { children: ReactNode }) {
  // Integração com AuthContext para obter company_id
  const { profile } = useAuth();
  
  // Estado de carregamento de dados do backend
  const [isLoadingCompanySettings, setIsLoadingCompanySettings] = useState(false);
  const [companySettingsLoaded, setCompanySettingsLoaded] = useState(false);
  
  // Estados inicializados vazios - serão carregados do localStorage/Supabase após login
  const [customers, setCustomers] = useState<Customer[]>(() => {
    // Inicialização vazia - dados serão carregados via useEffect após login
    const loaded: Customer[] = [];
    
    // Limpar duplicados imediatamente ao carregar
    if (loaded.length > 0) {
      const seenIds = new Set<string>();
      const duplicateIds: string[] = [];
      
      const cleaned = loaded.filter(customer => {
        if (seenIds.has(customer.id)) {
          duplicateIds.push(customer.id);
          return false;
        }
        seenIds.add(customer.id);
        return true;
      });
      
      if (cleaned.length < loaded.length) {
        console.log(`🧹 Customers: ${duplicateIds.length} duplicado(s) removido(s): ${duplicateIds.join(', ')}`);
        saveToStorage(STORAGE_KEYS.CUSTOMERS, cleaned);
        return cleaned;
      }
    }
    
    return loaded;
  });
  
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    // Inicialização vazia - dados serão carregados via useEffect após login
    const loaded: Supplier[] = [];
    
    // Limpar duplicados imediatamente ao carregar
    if (loaded.length > 0) {
      const seenIds = new Set<string>();
      const duplicateIds: string[] = [];
      
      const cleaned = loaded.filter(supplier => {
        if (seenIds.has(supplier.id)) {
          duplicateIds.push(supplier.id);
          return false;
        }
        seenIds.add(supplier.id);
        return true;
      });
      
      if (cleaned.length < loaded.length) {
        console.log(`🧹 Suppliers: ${duplicateIds.length} duplicado(s) removido(s): ${duplicateIds.join(', ')}`);
        saveToStorage(STORAGE_KEYS.SUPPLIERS, cleaned);
        return cleaned;
      }
    }
    
    return loaded;
  });
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>(() => {
    // Inicialização vazia - dados serão carregados via useEffect após login
    const loaded: SalesOrder[] = [];
    
    // MIGRAÇÃO: Converter status "Recebido" para "Entregue" em pedidos de venda
    return loaded.map(order => {
      if (order.status === "Recebido" as any) {
        console.log(`🔄 Migrando pedido ${order.id}: "Recebido" → "Entregue"`);
        return { ...order, status: "Entregue" };
      }
      return order;
    });
  });
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => {
    // Inicialização vazia - dados serão carregados via useEffect após login
    const movements: StockMovement[] = [];
    
    // Deduplicar e regenerar IDs se necessário
    const seen = new Set<string>();
    let regeneratedCount = 0;
    
    const deduplicated = movements.map((m: StockMovement, index: number) => {
      // Se ID já existe, gerar novo ID único
      if (seen.has(m.id)) {
        const uniqueSuffix = Math.random().toString(36).substring(2, 9);
        const newId = `MOV-${Date.now()}-${uniqueSuffix}-${index}`;
        regeneratedCount++;
        seen.add(newId);
        return { ...m, id: newId };
      }
      
      seen.add(m.id);
      return m;
    });
    
    // Log único e resumido
    if (regeneratedCount > 0) {
      console.log(`✅ ${regeneratedCount} movimento(s) de estoque com IDs duplicados foram automaticamente corrigidos`);
    }
    
    return deduplicated;
  });
  const [priceTables, setPriceTables] = useState<PriceTable[]>([]);
  
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [salespeople, setSalespeople] = useState<Salesperson[]>(() => {
    // Inicialização vazia - dados serão carregados via useEffect após login
    const loaded: Salesperson[] = [];
    
    // Limpar duplicados imediatamente ao carregar
    if (loaded.length > 0) {
      const seenIds = new Set<string>();
      const duplicateIds: string[] = [];
      
      const cleaned = loaded.filter(person => {
        if (seenIds.has(person.id)) {
          duplicateIds.push(person.id);
          return false;
        }
        seenIds.add(person.id);
        return true;
      });
      
      if (cleaned.length < loaded.length) {
        console.log(`🧹 Salespeople: ${duplicateIds.length} duplicado(s) removido(s): ${duplicateIds.join(', ')}`);
        saveToStorage('salespeople', cleaned);
        return cleaned;
      }
    }
    
    return loaded;
  });
  
  const [buyers, setBuyers] = useState<Buyer[]>(() => {
    // Inicialização vazia - dados serão carregados via useEffect após login
    const loaded: Buyer[] = [];
    
    // Limpar duplicados imediatamente ao carregar
    if (loaded.length > 0) {
      const seenIds = new Set<string>();
      const duplicateIds: string[] = [];
      
      const cleaned = loaded.filter(buyer => {
        if (seenIds.has(buyer.id)) {
          duplicateIds.push(buyer.id);
          return false;
        }
        seenIds.add(buyer.id);
        return true;
      });
      
      if (cleaned.length < loaded.length) {
        console.log(`🧹 Buyers: ${duplicateIds.length} duplicado(s) removido(s): ${duplicateIds.join(', ')}`);
        saveToStorage('buyers', cleaned);
        return cleaned;
      }
    }
    
    return loaded;
  });
  
  // Financial states
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(() => {
    // Inicialização com dados default - será sobrescrito se houver cache/Supabase
    const loaded = initialPaymentMethods;
    
    // Limpar duplicados imediatamente ao carregar
    if (loaded.length > 0) {
      const seenIds = new Set<string>();
      const duplicateIds: string[] = [];
      
      const cleaned = loaded.filter(method => {
        if (seenIds.has(method.id)) {
          duplicateIds.push(method.id);
          return false;
        }
        seenIds.add(method.id);
        return true;
      });
      
      if (cleaned.length < loaded.length) {
        console.log(`🧹 Payment Methods: ${duplicateIds.length} duplicado(s) removido(s): ${duplicateIds.join(', ')}`);
        saveToStorage(STORAGE_KEYS.PAYMENT_METHODS, cleaned);
        return cleaned;
      }
    }
    
    return loaded;
  });
  
  const [accountCategories, setAccountCategories] = useState<AccountCategory[]>(() => {
    // Inicialização com dados default - será sobrescrito se houver cache/Supabase
    const loaded = initialAccountCategories;
    
    // Limpar duplicados imediatamente ao carregar
    if (loaded.length > 0) {
      const seenIds = new Set<string>();
      const duplicateIds: string[] = [];
      
      const cleaned = loaded.filter(category => {
        if (seenIds.has(category.id)) {
          duplicateIds.push(category.id);
          return false;
        }
        seenIds.add(category.id);
        return true;
      });
      
      if (cleaned.length < loaded.length) {
        console.log(`🧹 Account Categories: ${duplicateIds.length} duplicado(s) removido(s): ${duplicateIds.join(', ')}`);
        saveToStorage(STORAGE_KEYS.ACCOUNT_CATEGORIES, cleaned);
        
        // Notificar usuário discretamente
        setTimeout(() => {
          toast.success('Categorias de conta otimizadas', {
            description: `${duplicateIds.length} registro(s) duplicado(s) foram removidos automaticamente`
          });
        }, 1500);
        
        return cleaned;
      }
    }
    
    return loaded;
  });
  // State com limpeza automática de duplicados
  const [internalFinancialTransactions, setInternalFinancialTransactions] = useState<FinancialTransaction[]>(() => {
    // Inicialização vazia - dados serão carregados via useEffect após login
    const loaded: FinancialTransaction[] = [];
    
    // Limpar duplicados imediatamente ao carregar
    if (loaded.length > 0) {
      const seenIds = new Set<string>();
      const duplicateIds: string[] = [];
      
      const cleaned = loaded.filter(transaction => {
        if (seenIds.has(transaction.id)) {
          duplicateIds.push(transaction.id);
          return false; // Remove duplicado
        }
        seenIds.add(transaction.id);
        return true; // Mantém primeiro
      });
      
      if (cleaned.length < loaded.length) {
        // Duplicados encontrados - limpar e salvar
        console.log(`🧹 Sistema auto-reparador (carregamento): ${duplicateIds.length} ID(s) duplicado(s) removido(s)`);
        console.log(`   IDs duplicados: ${duplicateIds.join(', ')}`);
        console.log(`   ✅ ${cleaned.length} transações únicas mantidas`);
        
        // Salvar versão limpa imediatamente no localStorage
        saveToStorage(STORAGE_KEYS.FINANCIAL_TRANSACTIONS, cleaned);
        
        // Notificar usuário discretamente (apenas uma vez)
        setTimeout(() => {
          toast.success('Base de dados otimizada', {
            description: `${duplicateIds.length} registro(s) duplicado(s) foram removidos automaticamente`
          });
        }, 1000);
        
        return cleaned;
      }
    }
    
    return loaded;
  });

  // Função wrapper que SEMPRE remove duplicados antes de atualizar
  const setFinancialTransactions = (updater: FinancialTransaction[] | ((prev: FinancialTransaction[]) => FinancialTransaction[])) => {
    setInternalFinancialTransactions(prev => {
      // Aplicar a atualização
      const updated = typeof updater === 'function' ? updater(prev) : updater;
      
      // Remover duplicados SEMPRE
      const seenIds = new Set<string>();
      const duplicateIds: string[] = [];
      
      const cleaned = updated.filter(transaction => {
        if (seenIds.has(transaction.id)) {
          duplicateIds.push(transaction.id);
          return false; // Remove duplicado
        }
        seenIds.add(transaction.id);
        return true; // Mantém primeiro
      });
      
      if (duplicateIds.length > 0) {
        // Log apenas em desenvolvimento - sistema auto-reparador funcionando
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔧 Auto-limpeza silenciosa: ${duplicateIds.length} duplicado(s) removido(s)`);
          console.log(`   IDs: ${duplicateIds.join(', ')} (sistema de reserva deve prevenir isso)`);
        }
      }
      
      return cleaned;
    });
  };

  // Alias para usar no código
  const financialTransactions = internalFinancialTransactions;
  const [accountsReceivable, setAccountsReceivable] = useState<AccountReceivable[]>([]);
  const [accountsPayable, setAccountsPayable] = useState<AccountPayable[]>([]);
  const [bankMovements, setBankMovements] = useState<BankMovement[]>([]);
  const [cashFlowEntries, setCashFlowEntries] = useState<CashFlowEntry[]>([]);
  
  // Audit states
  const [auditIssues, setAuditIssues] = useState<AuditIssue[]>([]);
  const [lastAnalysisDate, setLastAnalysisDate] = useState<Date | null>(null);
  
  const initialCompanySettings: CompanySettings = {
    cnpj: "",
    companyName: "",
    tradeName: "",
    sector: "",
    description: "",
    email: "",
    phone: "",
    website: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: "",
    stateRegistration: "",
    cityRegistration: "",
    bankAccounts: [],
    revenueGroups: [],
    expenseGroups: [],
    costCenters: [],
    // Dados Fiscais e Tributários - Padrões
    taxRegime: "Simples Nacional",
    defaultCSOSN: "",
    defaultCST: undefined,
    defaultICMSRate: 0,
    icmsInterstateRates: [],
    cfopInState: "",
    cfopOutState: "",
    cfopPurchase: "",
    cfopReturn: "",
    cfopService: "",
    pisCofinsRegime: "Cumulativo",
    defaultPISRate: 0,
    defaultCOFINSRate: 0,
    nfeNumber: "",
    nfeEnvironment: "Homologação",
    taxSubstitution: false,
    allowProductOverride: true
  };

  const [companySettings, setCompanySettings] = useState<CompanySettings>(() => {
    // Inicialização com dados default - será carregado do backend
    const loaded = initialCompanySettings;
    
    let hasChanges = false;
    let result = { ...loaded };
    
    // Limpar duplicados nas contas bancárias
    if (loaded.bankAccounts && loaded.bankAccounts.length > 0) {
      const seenIds = new Set<string>();
      const duplicateIds: string[] = [];
      
      const cleanedBankAccounts = loaded.bankAccounts.filter(account => {
        if (seenIds.has(account.id)) {
          duplicateIds.push(account.id);
          return false;
        }
        seenIds.add(account.id);
        return true;
      });
      
      if (cleanedBankAccounts.length < loaded.bankAccounts.length) {
        console.log(`🧹 Bank Accounts: ${duplicateIds.length} duplicado(s) removido(s): ${duplicateIds.join(', ')}`);
        result.bankAccounts = cleanedBankAccounts;
        hasChanges = true;
      }
    }
    
    // Limpar duplicados nos grupos de receita
    if (loaded.revenueGroups && loaded.revenueGroups.length > 0) {
      const seenIds = new Set<string>();
      const duplicateIds: string[] = [];
      
      const cleanedRevenueGroups = loaded.revenueGroups.filter(group => {
        if (seenIds.has(group.id)) {
          duplicateIds.push(group.id);
          return false;
        }
        seenIds.add(group.id);
        return true;
      });
      
      if (cleanedRevenueGroups.length < loaded.revenueGroups.length) {
        console.log(`🧹 Revenue Groups: ${duplicateIds.length} duplicado(s) removido(s): ${duplicateIds.join(', ')}`);
        result.revenueGroups = cleanedRevenueGroups;
        hasChanges = true;
      }
    }
    
    // Limpar duplicados nos grupos de despesa
    if (loaded.expenseGroups && loaded.expenseGroups.length > 0) {
      const seenIds = new Set<string>();
      const duplicateIds: string[] = [];
      
      const cleanedExpenseGroups = loaded.expenseGroups.filter(group => {
        if (seenIds.has(group.id)) {
          duplicateIds.push(group.id);
          return false;
        }
        seenIds.add(group.id);
        return true;
      });
      
      if (cleanedExpenseGroups.length < loaded.expenseGroups.length) {
        console.log(`🧹 Expense Groups: ${duplicateIds.length} duplicado(s) removido(s): ${duplicateIds.join(', ')}`);
        result.expenseGroups = cleanedExpenseGroups;
        hasChanges = true;
      }
    }
    
    // Limpar duplicados nos centros de custo
    if (loaded.costCenters && loaded.costCenters.length > 0) {
      const seenIds = new Set<string>();
      const duplicateIds: string[] = [];
      
      const cleanedCostCenters = loaded.costCenters.filter(center => {
        if (seenIds.has(center.id)) {
          duplicateIds.push(center.id);
          return false;
        }
        seenIds.add(center.id);
        return true;
      });
      
      if (cleanedCostCenters.length < loaded.costCenters.length) {
        console.log(`🧹 Cost Centers: ${duplicateIds.length} duplicado(s) removido(s): ${duplicateIds.join(', ')}`);
        result.costCenters = cleanedCostCenters;
        hasChanges = true;
      }
    }
    
    // Salvar se houve mudanças
    if (hasChanges) {
      saveToStorage(STORAGE_KEYS.COMPANY_SETTINGS, result);
    }
    
    return result;
  });

  const [companyHistory, setCompanyHistory] = useState<CompanyHistoryEntry[]>([]);

  // Estado de conciliação de saldos
  const [reconciliationStatus, setReconciliationStatus] = useState<Record<string, boolean>>({});

  // ==================== MIGRAÇÃO DE DADOS POR COMPANY_ID ====================
  
  /**
   * Hook que migra dados do localStorage quando o company_id fica disponível
   * Garante isolamento de dados entre empresas
   */
  useEffect(() => {
    if (!profile?.company_id) {
      return; // Aguardar company_id estar disponível
    }

    const companyId = profile.company_id;
    console.log(`🔄 Migrando dados para isolamento por company_id: ${companyId}`);

    // Migrar cada tipo de dado
    const migrateIfNeeded = <T,>(
      baseKey: string,
      currentData: T,
      setter: (data: T) => void
    ) => {
      const migratedData = migrateStorageData<T>(baseKey, companyId);
      if (migratedData !== null && Array.isArray(migratedData) && migratedData.length > 0) {
        setter(migratedData);
        console.log(`  ✅ ${baseKey}: ${migratedData.length} registros migrados`);
      }
    };

    // Executar migrações
    migrateIfNeeded(STORAGE_KEYS.CUSTOMERS, customers, setCustomers);
    migrateIfNeeded(STORAGE_KEYS.SUPPLIERS, suppliers, setSuppliers);
    migrateIfNeeded(STORAGE_KEYS.INVENTORY, inventory, setInventory);
    migrateIfNeeded(STORAGE_KEYS.SALES_ORDERS, salesOrders, setSalesOrders);
    migrateIfNeeded(STORAGE_KEYS.PURCHASE_ORDERS, purchaseOrders, setPurchaseOrders);
    migrateIfNeeded(STORAGE_KEYS.STOCK_MOVEMENTS, stockMovements, setStockMovements);
    migrateIfNeeded(STORAGE_KEYS.PRICE_TABLES, priceTables, setPriceTables);
    migrateIfNeeded(STORAGE_KEYS.PRODUCT_CATEGORIES, productCategories, setProductCategories);
    migrateIfNeeded(STORAGE_KEYS.SALESPEOPLE, salespeople, setSalespeople);
    migrateIfNeeded(STORAGE_KEYS.BUYERS, buyers, setBuyers);
    migrateIfNeeded(STORAGE_KEYS.PAYMENT_METHODS, paymentMethods, setPaymentMethods);
    migrateIfNeeded(STORAGE_KEYS.ACCOUNT_CATEGORIES, accountCategories, setAccountCategories);
    migrateIfNeeded(STORAGE_KEYS.FINANCIAL_TRANSACTIONS, financialTransactions, setFinancialTransactions);
    migrateIfNeeded(STORAGE_KEYS.ACCOUNTS_RECEIVABLE, accountsReceivable, setAccountsReceivable);
    migrateIfNeeded(STORAGE_KEYS.ACCOUNTS_PAYABLE, accountsPayable, setAccountsPayable);
    migrateIfNeeded(STORAGE_KEYS.BANK_MOVEMENTS, bankMovements, setBankMovements);
    migrateIfNeeded(STORAGE_KEYS.CASH_FLOW_ENTRIES, cashFlowEntries, setCashFlowEntries);
    migrateIfNeeded(STORAGE_KEYS.COMPANY_HISTORY, companyHistory, setCompanyHistory);
    migrateIfNeeded(STORAGE_KEYS.RECONCILIATION_STATUS, reconciliationStatus, setReconciliationStatus);

    console.log(`✅ Migração concluída para company_id: ${companyId}`);
  }, [profile?.company_id]); // Executar apenas quando company_id mudar

  // ==================== CARREGAMENTO INICIAL DO LOCALSTORAGE (CACHE) ====================
  
  // Carregar cache do localStorage com company_id ao fazer login
  useEffect(() => {
    if (!profile?.company_id) return;
    
    console.log('[CACHE] 📂 Carregando cache do localStorage...');
    console.log(`[CACHE] 🔑 Company ID: ${profile.company_id}`);
    
    // DEBUG: Listar TODAS as chaves do localStorage relacionadas ao ERP
    const allKeys = Object.keys(localStorage).filter(k => k.startsWith('erp_system_'));
    console.log(`[CACHE] 🔍 Total de chaves no localStorage: ${allKeys.length}`);
    if (allKeys.length > 0) {
      console.log(`[CACHE] 📋 Chaves encontradas:`, allKeys.slice(0, 10)); // Primeiras 10
    }
    
    // Função helper para carregar com company_id
    const loadCached = <T,>(key: string, defaultValue: T): T => {
      const storageKey = getStorageKey(key, profile.company_id);
      const data = loadFromStorage(storageKey, defaultValue);
      if (Array.isArray(data)) {
        if (data.length > 0) {
          console.log(`[CACHE] ✅ ${key}: ${data.length} items (chave: ${storageKey})`);
        } else {
          console.log(`[CACHE] ⚠️  ${key}: VAZIO (chave: ${storageKey})`);
        }
      }
      return data;
    };
    
    // Carregar todos os dados do cache (se existirem)
    // IMPORTANTE: Usar valores default apenas para dados que não devem começar vazios
    setCustomers(loadCached(STORAGE_KEYS.CUSTOMERS, []));
    setSuppliers(loadCached(STORAGE_KEYS.SUPPLIERS, []));
    setInventory(loadCached(STORAGE_KEYS.INVENTORY, []));
    setSalesOrders(loadCached(STORAGE_KEYS.SALES_ORDERS, []));
    setPurchaseOrders(loadCached(STORAGE_KEYS.PURCHASE_ORDERS, []));
    setStockMovements(loadCached(STORAGE_KEYS.STOCK_MOVEMENTS, []));
    setPriceTables(loadCached(STORAGE_KEYS.PRICE_TABLES, []));
    setProductCategories(loadCached(STORAGE_KEYS.PRODUCT_CATEGORIES, []));
    setSalespeople(loadCached(STORAGE_KEYS.SALESPEOPLE, []));
    setBuyers(loadCached(STORAGE_KEYS.BUYERS, []));
    
    // Dados com valores default (sempre carregar do cache ou usar default)
    const cachedPaymentMethods = loadCached(STORAGE_KEYS.PAYMENT_METHODS, initialPaymentMethods);
    setPaymentMethods(cachedPaymentMethods);
    console.log(`[CACHE] 📋 Payment Methods: ${cachedPaymentMethods.length} items`);
    
    const cachedAccountCategories = loadCached(STORAGE_KEYS.ACCOUNT_CATEGORIES, initialAccountCategories);
    setAccountCategories(cachedAccountCategories);
    console.log(`[CACHE] 📋 Account Categories: ${cachedAccountCategories.length} items`);
    
    setFinancialTransactions(loadCached(STORAGE_KEYS.FINANCIAL_TRANSACTIONS, []));
    setAccountsReceivable(loadCached(STORAGE_KEYS.ACCOUNTS_RECEIVABLE, []));
    setAccountsPayable(loadCached(STORAGE_KEYS.ACCOUNTS_PAYABLE, []));
    setBankMovements(loadCached(STORAGE_KEYS.BANK_MOVEMENTS, []));
    setCashFlowEntries(loadCached(STORAGE_KEYS.CASH_FLOW_ENTRIES, []));
    setAuditIssues(loadCached(STORAGE_KEYS.AUDIT_ISSUES, []));
    setCompanyHistory(loadCached(STORAGE_KEYS.COMPANY_HISTORY, []));
    setReconciliationStatus(loadCached(STORAGE_KEYS.RECONCILIATION_STATUS, {}));
    
    const lastAnalysisStr = loadFromStorage<string | null>(
      getStorageKey(STORAGE_KEYS.LAST_ANALYSIS_DATE, profile.company_id), 
      null
    );
    if (lastAnalysisStr) {
      setLastAnalysisDate(new Date(lastAnalysisStr));
    }
    
    console.log('[CACHE] ✅ Cache carregado com sucesso!');
  }, [profile?.company_id]);
  
  // ==================== CARREGAMENTO INICIAL DO SUPABASE ====================
  
  // Carregar dados do Supabase ao fazer login (APENAS UMA VEZ)
  // Sobrescreve o cache se houver dados mais recentes no Supabase
  useEffect(() => {
    if (!profile?.company_id) return;
    
    let isSubscribed = true;
    
    const loadInitialData = async () => {
      try {
        console.log('[SUPABASE] 📥 Carregando dados iniciais do Supabase...');
        
        // Carregar clientes
        console.log(`[SUPABASE] 🔍 Tentando carregar customers (company_id: ${profile.company_id})...`);
        const customersData = await loadFromSupabase<Customer[]>('customers');
        console.log(`[SUPABASE] 🔍 Resposta customers:`, customersData);
        if (isSubscribed && customersData && customersData.length > 0) {
          console.log(`[SUPABASE] ✅ ${customersData.length} clientes carregados do Supabase`);
          setCustomers(customersData);
        } else {
          console.log(`[SUPABASE] ⚠️  Clientes: Dados vazios ou não encontrados no Supabase (normal se for primeira vez)`);
        }
        
        // Carregar inventário  
        const inventoryData = await loadFromSupabase<InventoryItem[]>('inventory');
        if (isSubscribed && inventoryData && inventoryData.length > 0) {
          console.log(`[SUPABASE] ✅ ${inventoryData.length} itens de inventário carregados do Supabase`);
          setInventory(inventoryData);
        } else {
          console.log(`[SUPABASE] ⚠️  Inventário: Dados vazios ou não encontrados no Supabase`);
        }
        
        // Carregar fornecedores
        const suppliersData = await loadFromSupabase<Supplier[]>('suppliers');
        if (isSubscribed && suppliersData && suppliersData.length > 0) {
          console.log(`[SUPABASE] ✅ ${suppliersData.length} fornecedores carregados do Supabase`);
          setSuppliers(suppliersData);
        } else {
          console.log(`[SUPABASE] ⚠️  Fornecedores: Dados vazios ou não encontrados no Supabase`);
        }
        
        // Carregar pedidos de venda
        const salesOrdersData = await loadFromSupabase<SalesOrder[]>('salesOrders');
        if (isSubscribed && salesOrdersData && salesOrdersData.length > 0) {
          console.log(`[SUPABASE] ✅ ${salesOrdersData.length} pedidos de venda carregados do Supabase`);
          setSalesOrders(salesOrdersData);
        } else {
          console.log(`[SUPABASE] ⚠️  Pedidos de Venda: Dados vazios ou não encontrados no Supabase`);
        }
        
        // Carregar pedidos de compra
        const purchaseOrdersData = await loadFromSupabase<PurchaseOrder[]>('purchaseOrders');
        if (isSubscribed && purchaseOrdersData && purchaseOrdersData.length > 0) {
          console.log(`[SUPABASE] ✅ ${purchaseOrdersData.length} pedidos de compra carregados`);
          setPurchaseOrders(purchaseOrdersData);
        }
        
        // Carregar movimentações de estoque
        const stockMovementsData = await loadFromSupabase<StockMovement[]>('stockMovements');
        if (isSubscribed && stockMovementsData && stockMovementsData.length > 0) {
          console.log(`[SUPABASE] ✅ ${stockMovementsData.length} movimentações de estoque carregadas`);
          setStockMovements(stockMovementsData);
        }
        
        // Carregar tabelas de preço
        const priceTablesData = await loadFromSupabase<PriceTable[]>('priceTables');
        if (isSubscribed && priceTablesData && priceTablesData.length > 0) {
          console.log(`[SUPABASE] ✅ ${priceTablesData.length} tabelas de preço carregadas`);
          setPriceTables(priceTablesData);
        }
        
        // Carregar categorias de produtos
        const productCategoriesData = await loadFromSupabase<string[]>('productCategories');
        if (isSubscribed && productCategoriesData && productCategoriesData.length > 0) {
          console.log(`[SUPABASE] ✅ ${productCategoriesData.length} categorias de produtos carregadas`);
          setProductCategories(productCategoriesData);
        }
        
        // Carregar vendedores
        const salespeopleData = await loadFromSupabase<Salesperson[]>('salespeople');
        if (isSubscribed && salespeopleData && salespeopleData.length > 0) {
          console.log(`[SUPABASE] ✅ ${salespeopleData.length} vendedores carregados`);
          setSalespeople(salespeopleData);
        }
        
        // Carregar compradores
        const buyersData = await loadFromSupabase<Buyer[]>('buyers');
        if (isSubscribed && buyersData && buyersData.length > 0) {
          console.log(`[SUPABASE] ✅ ${buyersData.length} compradores carregados`);
          setBuyers(buyersData);
        }
        
        // Carregar formas de pagamento
        const paymentMethodsData = await loadFromSupabase<PaymentMethod[]>('paymentMethods');
        if (isSubscribed && paymentMethodsData && paymentMethodsData.length > 0) {
          console.log(`[SUPABASE] ✅ ${paymentMethodsData.length} formas de pagamento carregadas`);
          setPaymentMethods(paymentMethodsData);
        }
        
        // Carregar categorias de contas
        const accountCategoriesData = await loadFromSupabase<AccountCategory[]>('accountCategories');
        if (isSubscribed && accountCategoriesData && accountCategoriesData.length > 0) {
          console.log(`[SUPABASE] ✅ ${accountCategoriesData.length} categorias de contas carregadas`);
          setAccountCategories(accountCategoriesData);
        }
        
        // Carregar transações financeiras
        const financialTransactionsData = await loadFromSupabase<FinancialTransaction[]>('financialTransactions');
        if (isSubscribed && financialTransactionsData && financialTransactionsData.length > 0) {
          console.log(`[SUPABASE] ✅ ${financialTransactionsData.length} transações financeiras carregadas`);
          setFinancialTransactions(financialTransactionsData);
        }
        
        // Carregar contas a receber
        const accountsReceivableData = await loadFromSupabase<AccountReceivable[]>('accountsReceivable');
        if (isSubscribed && accountsReceivableData && accountsReceivableData.length > 0) {
          console.log(`[SUPABASE] ✅ ${accountsReceivableData.length} contas a receber carregadas`);
          setAccountsReceivable(accountsReceivableData);
        }
        
        // Carregar contas a pagar
        const accountsPayableData = await loadFromSupabase<AccountPayable[]>('accountsPayable');
        if (isSubscribed && accountsPayableData && accountsPayableData.length > 0) {
          console.log(`[SUPABASE] ✅ ${accountsPayableData.length} contas a pagar carregadas`);
          setAccountsPayable(accountsPayableData);
        }
        
        // Carregar movimentações bancárias
        const bankMovementsData = await loadFromSupabase<BankMovement[]>('bankMovements');
        if (isSubscribed && bankMovementsData && bankMovementsData.length > 0) {
          console.log(`[SUPABASE] ✅ ${bankMovementsData.length} movimentações bancárias carregadas`);
          setBankMovements(bankMovementsData);
        }
        
        // Carregar entradas de fluxo de caixa
        const cashFlowEntriesData = await loadFromSupabase<CashFlowEntry[]>('cashFlowEntries');
        if (isSubscribed && cashFlowEntriesData && cashFlowEntriesData.length > 0) {
          console.log(`[SUPABASE] ✅ ${cashFlowEntriesData.length} entradas de fluxo de caixa carregadas`);
          setCashFlowEntries(cashFlowEntriesData);
        }
        
        // Carregar problemas de auditoria
        const auditIssuesData = await loadFromSupabase<AuditIssue[]>('auditIssues');
        if (isSubscribed && auditIssuesData && auditIssuesData.length > 0) {
          console.log(`[SUPABASE] ✅ ${auditIssuesData.length} problemas de auditoria carregados`);
          setAuditIssues(auditIssuesData);
        }
        
        // Carregar data da última análise
        const lastAnalysisDateData = await loadFromSupabase<string>('lastAnalysisDate');
        if (isSubscribed && lastAnalysisDateData) {
          console.log(`[SUPABASE] ✅ Data da última análise carregada`);
          setLastAnalysisDate(new Date(lastAnalysisDateData));
        }
        
        // Carregar histórico da empresa
        const companyHistoryData = await loadFromSupabase<CompanyHistoryEntry[]>('companyHistory');
        if (isSubscribed && companyHistoryData && companyHistoryData.length > 0) {
          console.log(`[SUPABASE] ✅ ${companyHistoryData.length} entradas de histórico carregadas`);
          setCompanyHistory(companyHistoryData);
        }
        
        // Carregar status de reconciliação
        const reconciliationStatusData = await loadFromSupabase<Record<string, boolean>>('reconciliationStatus');
        if (isSubscribed && reconciliationStatusData) {
          console.log(`[SUPABASE] ✅ Status de reconciliação carregado`);
          setReconciliationStatus(reconciliationStatusData);
        }
        
        console.log('[SUPABASE] ✅ Carregamento inicial concluído!');
        
      } catch (error) {
        console.error('[SUPABASE] ❌ Erro ao carregar dados iniciais:', error);
      }
    };
    
    loadInitialData();
    
    return () => {
      isSubscribed = false;
    };
  }, [profile?.company_id]); // Executar apenas quando company_id mudar (login)

  // ==================== SINCRONIZAÇÃO AUTOMÁTICA COM LOCALSTORAGE ====================
  
  // Salva automaticamente no localStorage quando os dados mudarem
  // Usa getStorageKey para isolar por company_id
  useEffect(() => {
    if (profile?.company_id) {
      const key = getStorageKey(STORAGE_KEYS.CUSTOMERS, profile.company_id);
      saveToStorage(key, customers);
    }
  }, [customers, profile?.company_id]);
  
  useEffect(() => {
    if (profile?.company_id) {
      const key = getStorageKey(STORAGE_KEYS.SUPPLIERS, profile.company_id);
      saveToStorage(key, suppliers);
    }
  }, [suppliers, profile?.company_id]);
  
  useEffect(() => {
    if (profile?.company_id) {
      const key = getStorageKey(STORAGE_KEYS.INVENTORY, profile.company_id);
      saveToStorage(key, inventory);
    }
  }, [inventory, profile?.company_id]);
  
  useEffect(() => {
    if (profile?.company_id) {
      const key = getStorageKey(STORAGE_KEYS.SALES_ORDERS, profile.company_id);
      saveToStorage(key, salesOrders);
    }
  }, [salesOrders, profile?.company_id]);
  
  useEffect(() => {
    if (profile?.company_id) {
      const key = getStorageKey(STORAGE_KEYS.PURCHASE_ORDERS, profile.company_id);
      saveToStorage(key, purchaseOrders);
    }
  }, [purchaseOrders, profile?.company_id]);
  
  useEffect(() => {
    if (profile?.company_id) {
      const key = getStorageKey(STORAGE_KEYS.STOCK_MOVEMENTS, profile.company_id);
      saveToStorage(key, stockMovements);
    }
  }, [stockMovements, profile?.company_id]);

  // ==================== SINCRONIZAÇÃO AUTOMÁTICA COM SUPABASE ====================
  
  // Sincroniza dados com Supabase em background (debounced 2s)
  // FASE 1: Entidades principais
  useSupabaseSync('customers', customers, !!profile?.company_id);
  useSupabaseSync('inventory', inventory, !!profile?.company_id);
  useSupabaseSync('suppliers', suppliers, !!profile?.company_id);
  useSupabaseSync('salesOrders', salesOrders, !!profile?.company_id);
  
  // FASE 2: Entidades restantes
  useSupabaseSync('purchaseOrders', purchaseOrders, !!profile?.company_id);
  useSupabaseSync('stockMovements', stockMovements, !!profile?.company_id);
  useSupabaseSync('priceTables', priceTables, !!profile?.company_id);
  useSupabaseSync('productCategories', productCategories, !!profile?.company_id);
  useSupabaseSync('salespeople', salespeople, !!profile?.company_id);
  useSupabaseSync('buyers', buyers, !!profile?.company_id);
  useSupabaseSync('paymentMethods', paymentMethods, !!profile?.company_id);
  useSupabaseSync('accountCategories', accountCategories, !!profile?.company_id);
  useSupabaseSync('financialTransactions', financialTransactions, !!profile?.company_id);
  useSupabaseSync('accountsReceivable', accountsReceivable, !!profile?.company_id);
  useSupabaseSync('accountsPayable', accountsPayable, !!profile?.company_id);
  useSupabaseSync('bankMovements', bankMovements, !!profile?.company_id);
  useSupabaseSync('cashFlowEntries', cashFlowEntries, !!profile?.company_id);
  useSupabaseSync('auditIssues', auditIssues, !!profile?.company_id);
  useSupabaseSync('lastAnalysisDate', lastAnalysisDate, !!profile?.company_id);
  useSupabaseSync('companyHistory', companyHistory, !!profile?.company_id);
  useSupabaseSync('reconciliationStatus', reconciliationStatus, !!profile?.company_id);

  // ==================== PERSISTÊNCIA LOCAL (CACHE) ====================
  
  // Salva dados automaticamente no localStorage como cache rápido
  useEffect(() => {
    if (!profile?.company_id) return;
    saveToStorage(getStorageKey(STORAGE_KEYS.CUSTOMERS, profile.company_id), customers);
  }, [customers, profile?.company_id]);

  useEffect(() => {
    if (!profile?.company_id) return;
    saveToStorage(getStorageKey(STORAGE_KEYS.SUPPLIERS, profile.company_id), suppliers);
  }, [suppliers, profile?.company_id]);

  useEffect(() => {
    if (!profile?.company_id) return;
    saveToStorage(getStorageKey(STORAGE_KEYS.SALES_ORDERS, profile.company_id), salesOrders);
  }, [salesOrders, profile?.company_id]);

  useEffect(() => {
    if (!profile?.company_id) return;
    saveToStorage(getStorageKey(STORAGE_KEYS.PURCHASE_ORDERS, profile.company_id), purchaseOrders);
  }, [purchaseOrders, profile?.company_id]);

  useEffect(() => {
    if (!profile?.company_id) return;
    saveToStorage(getStorageKey(STORAGE_KEYS.INVENTORY, profile.company_id), inventory);
  }, [inventory, profile?.company_id]);

  useEffect(() => {
    if (!profile?.company_id) return;
    saveToStorage(getStorageKey(STORAGE_KEYS.STOCK_MOVEMENTS, profile.company_id), stockMovements);
  }, [stockMovements, profile?.company_id]);

  useEffect(() => {
    if (!profile?.company_id) return;
    saveToStorage(getStorageKey(STORAGE_KEYS.PRICE_TABLES, profile.company_id), priceTables);
  }, [priceTables, profile?.company_id]);

  useEffect(() => {
    if (!profile?.company_id) return;
    saveToStorage(getStorageKey(STORAGE_KEYS.PRODUCT_CATEGORIES, profile.company_id), productCategories);
  }, [productCategories, profile?.company_id]);

  useEffect(() => {
    if (!profile?.company_id) return;
    saveToStorage(getStorageKey(STORAGE_KEYS.SALESPEOPLE, profile.company_id), salespeople);
  }, [salespeople, profile?.company_id]);

  useEffect(() => {
    if (!profile?.company_id) return;
    saveToStorage(getStorageKey(STORAGE_KEYS.BUYERS, profile.company_id), buyers);
  }, [buyers, profile?.company_id]);

  useEffect(() => {
    if (!profile?.company_id) return;
    saveToStorage(getStorageKey(STORAGE_KEYS.PAYMENT_METHODS, profile.company_id), paymentMethods);
  }, [paymentMethods, profile?.company_id]);

  useEffect(() => {
    if (!profile?.company_id) return;
    saveToStorage(getStorageKey(STORAGE_KEYS.ACCOUNT_CATEGORIES, profile.company_id), accountCategories);
  }, [accountCategories, profile?.company_id]);

  useEffect(() => {
    if (!profile?.company_id) return;
    // Salvar diretamente - duplicados já foram removidos pelo setter
    saveToStorage(getStorageKey(STORAGE_KEYS.FINANCIAL_TRANSACTIONS, profile.company_id), internalFinancialTransactions);
  }, [internalFinancialTransactions, profile?.company_id]);

  useEffect(() => {
    if (!profile?.company_id) return;
    saveToStorage(getStorageKey(STORAGE_KEYS.ACCOUNTS_RECEIVABLE, profile.company_id), accountsReceivable);
  }, [accountsReceivable, profile?.company_id]);

  useEffect(() => {
    if (!profile?.company_id) return;
    saveToStorage(getStorageKey(STORAGE_KEYS.ACCOUNTS_PAYABLE, profile.company_id), accountsPayable);
  }, [accountsPayable, profile?.company_id]);

  useEffect(() => {
    if (!profile?.company_id) return;
    saveToStorage(getStorageKey(STORAGE_KEYS.BANK_MOVEMENTS, profile.company_id), bankMovements);
  }, [bankMovements, profile?.company_id]);

  useEffect(() => {
    if (!profile?.company_id) return;
    saveToStorage(getStorageKey(STORAGE_KEYS.CASH_FLOW_ENTRIES, profile.company_id), cashFlowEntries);
  }, [cashFlowEntries, profile?.company_id]);

  useEffect(() => {
    // Salvar no localStorage com prefixo de company_id para isolamento
    if (profile?.company_id) {
      const cacheKey = getStorageKey(STORAGE_KEYS.COMPANY_SETTINGS, profile.company_id);
      saveToStorage(cacheKey, companySettings);
    } else {
      // Fallback para chave antiga (será migrado depois)
      saveToStorage(STORAGE_KEYS.COMPANY_SETTINGS, companySettings);
    }
  }, [companySettings, profile?.company_id]);

  useEffect(() => {
    if (!profile?.company_id) return;
    saveToStorage(getStorageKey(STORAGE_KEYS.COMPANY_HISTORY, profile.company_id), companyHistory);
  }, [companyHistory, profile?.company_id]);

  useEffect(() => {
    if (!profile?.company_id) return;
    saveToStorage(getStorageKey(STORAGE_KEYS.RECONCILIATION_STATUS, profile.company_id), reconciliationStatus);
  }, [reconciliationStatus, profile?.company_id]);

  useEffect(() => {
    if (!profile?.company_id) return;
    saveToStorage(getStorageKey(STORAGE_KEYS.AUDIT_ISSUES, profile.company_id), auditIssues);
  }, [auditIssues, profile?.company_id]);

  useEffect(() => {
    if (!profile?.company_id) return;
    saveToStorage(getStorageKey(STORAGE_KEYS.LAST_ANALYSIS_DATE, profile.company_id), lastAnalysisDate ? lastAnalysisDate.toISOString() : null);
  }, [lastAnalysisDate, profile?.company_id]);

  // ==================== INTEGRAÇÃO COM BACKEND ====================
  
  /**
   * Carregar companySettings do backend quando o usuário fizer login
   */
  useEffect(() => {
    const loadCompanySettingsFromBackend = async () => {
      // Não carregar se já carregou ou se não tem profile
      if (companySettingsLoaded || !profile?.company_id || isLoadingCompanySettings) {
        return;
      }

      // VERIFICAR SE TEM TOKEN ANTES DE TENTAR CARREGAR
      const { getAccessToken } = await import('../utils/authFetch');
      const token = await getAccessToken();
      
      if (!token) {
        console.log('⚠️ Sem token de acesso - pulando carregamento de companySettings');
        return;
      }

      try {
        setIsLoadingCompanySettings(true);
        console.log('🔄 Carregando configurações da empresa do backend...');

        const response = await authGet(
          `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/company`
        );

        if (response.success && response.company) {
          console.log('✅ Dados da empresa carregados do backend');
          
          // Mapear dados do banco para CompanySettings
          const backendSettings = mapDatabaseToSettings(response.company);
          
          // Verificar se há dados no localStorage com isolamento por company_id (migração)
          const cacheKey = getStorageKey(STORAGE_KEYS.COMPANY_SETTINGS, profile.company_id);
          const localSettings = loadFromStorage(cacheKey, initialCompanySettings);
          
          // Se localStorage tem dados mais completos (CNPJ preenchido, contas bancárias, etc)
          // fazer migração automática para o backend
          const shouldMigrate = 
            localSettings.cnpj && 
            !backendSettings.cnpj &&
            localSettings.bankAccounts.length > 0;
          
          if (shouldMigrate) {
            console.log('🔄 Migrando dados do localStorage para o backend...');
            await migrateLocalStorageToBackend(localSettings);
            setCompanySettings(localSettings);
          } else {
            // Usar dados do backend
            setCompanySettings(backendSettings);
          }
          
          setCompanySettingsLoaded(true);
        }
      } catch (error: any) {
        console.error('❌ Erro ao carregar configurações da empresa:', error);
        
        // Em caso de erro, usar dados do localStorage como fallback
        const cacheKey = getStorageKey(STORAGE_KEYS.COMPANY_SETTINGS, profile?.company_id);
        const localSettings = loadFromStorage(cacheKey, initialCompanySettings);
        setCompanySettings(localSettings);
        
        // Não mostrar toast de erro se for erro de autenticação
        if (!error.message?.includes('autenticad') && !error.message?.includes('autorizado')) {
          toast.error('Erro ao carregar dados da empresa', {
            description: 'Usando dados locais temporariamente.'
          });
        }
      } finally {
        setIsLoadingCompanySettings(false);
      }
    };

    loadCompanySettingsFromBackend();
  }, [profile?.company_id, companySettingsLoaded]);

  /**
   * Migrar dados do localStorage para o backend
   */
  const migrateLocalStorageToBackend = async (settings: CompanySettings) => {
    try {
      console.log('📤 Enviando dados para o backend...');
      
      const updates = mapSettingsToDatabase(settings);
      
      await authPatch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/company`,
        updates
      );
      
      console.log('✅ Migração concluída com sucesso!');
      toast.success('Dados migrados', {
        description: 'Suas configurações foram salvas no servidor.'
      });
      
      // Limpar localStorage antigo após migração bem-sucedida
      // (mantém apenas como cache com prefixo de company_id)
      const cacheKey = getStorageKey(STORAGE_KEYS.COMPANY_SETTINGS, profile?.company_id);
      saveToStorage(cacheKey, settings);
      
    } catch (error: any) {
      console.error('❌ Erro na migração:', error);
      throw error;
    }
  };

  // ==================== VALIDAÇÃO DE INTEGRIDADE ====================
  
  // Ref para rastrear se já executou validação inicial
  const hasRunInitialValidation = useRef(false);
  
  // Validação de integridade após carregamento (apenas log informativo)
  useEffect(() => {
    if (hasRunInitialValidation.current || internalFinancialTransactions.length === 0) {
      return;
    }
    
    const uniqueIds = new Set(internalFinancialTransactions.map(t => t.id));
    
    if (uniqueIds.size === internalFinancialTransactions.length) {
      console.log(`✅ Integridade confirmada: ${internalFinancialTransactions.length} transações com IDs únicos`);
    } else {
      console.error(`🚨 ERRO: ${internalFinancialTransactions.length - uniqueIds.size} duplicado(s) ainda presente(s)`);
    }
    
    hasRunInitialValidation.current = true;
  }, [internalFinancialTransactions.length]);

  // ==================== HELPER FUNCTIONS ====================

  // Helper para obter usuário atual (TODO: integrar com AuthContext quando implementado)
  const getCurrentUser = () => {
    return {
      id: 'USR-001',
      name: 'Administrador do Sistema'
    };
  };
  
  // Sistema de reserva de IDs para prevenir race conditions
  const reservedIdsRef = useRef<Set<string>>(new Set());
  
  // Helper para gerar próximo ID de transação financeira de forma robusta
  // COM PROTEÇÃO CONTRA RACE CONDITIONS
  const generateNextFinancialTransactionId = (): string => {
    if (financialTransactions.length === 0 && reservedIdsRef.current.size === 0) {
      const firstId = 'FT-0001';
      // Reservar ID imediatamente
      reservedIdsRef.current.add(firstId);
      console.log('🆔 Gerando primeiro ID de transação: FT-0001');
      return firstId;
    }
    
    // Extrair todos os números de IDs existentes no state
    const existingNumbers = financialTransactions
      .map(t => {
        const match = t.id.match(/FT-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => n > 0);
    
    // Extrair números dos IDs reservados (gerações em andamento)
    const reservedNumbers = Array.from(reservedIdsRef.current)
      .map(id => {
        const match = id.match(/FT-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => n > 0);
    
    // Combinar ambos para encontrar o maior
    const allNumbers = [...existingNumbers, ...reservedNumbers];
    const maxNumber = allNumbers.length > 0 ? Math.max(...allNumbers) : 0;
    let nextNumber = maxNumber + 1;
    
    // Garantir que o ID não existe nem está reservado
    let newId = `FT-${String(nextNumber).padStart(4, '0')}`;
    let attempts = 0;
    const maxAttempts = 1000;
    
    while (
      (financialTransactions.some(t => t.id === newId) || 
       reservedIdsRef.current.has(newId)) && 
      attempts < maxAttempts
    ) {
      nextNumber++;
      newId = `FT-${String(nextNumber).padStart(4, '0')}`;
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      console.error('🚨 ERRO CRÍTICO: Não foi possível gerar ID único após 1000 tentativas!');
      throw new Error('Não foi possível gerar ID único para transação financeira');
    }
    
    // RESERVAR ID IMEDIATAMENTE para prevenir duplicação
    reservedIdsRef.current.add(newId);
    
    // Agendar limpeza da reserva após 5 segundos (tempo suficiente para adicionar ao state)
    setTimeout(() => {
      reservedIdsRef.current.delete(newId);
    }, 5000);
    
    if (attempts > 0) {
      console.log(`🔄 ${attempts + 1} tentativa(s) para gerar ID único (proteção contra race condition)`);
    }
    
    console.log(`🆔 ID gerado e reservado: ${newId} (maior: FT-${String(maxNumber).padStart(4, '0')}, state: ${financialTransactions.length}, reservados: ${reservedIdsRef.current.size})`);
    
    return newId;
  };

  // Helper para registrar ações de auditoria
  const auditLog = (params: {
    module: string;
    action: string;
    details?: Record<string, any>;
    severity?: "info" | "warning" | "error" | "critical";
    entityType?: string;
    entityId?: string;
    previousValue?: any;
    newValue?: any;
  }) => {
    const user = getCurrentUser();
    logAuditAction({
      ...params,
      user: user.name,
      userId: user.id
    });
  };

  const createFinancialTransactionFromOrder = (
    type: "Receita" | "Despesa",
    partyType: "Cliente" | "Fornecedor",
    partyId: string,
    partyName: string,
    amount: number,
    reference: string,
    bankAccountId?: string
  ) => {
    const category = (accountCategories || []).find(cat => 
      cat.type === type && cat.isActive
    );
    
    const bankAccounts = companySettings?.bankAccounts || [];
    const bank = bankAccountId 
      ? bankAccounts.find(b => b.id === bankAccountId)
      : bankAccounts.find(b => b.isPrimary) || bankAccounts[0];
    
    const paymentMethod = (paymentMethods || []).find(pm => pm.isActive) || (paymentMethods || [])[0];
    
    const today = new Date().toISOString().split('T')[0];
    
    // Gerar ID baseado no maior ID existente + 1
    const maxId = (financialTransactions || []).reduce((max, tx) => {
      const idNum = parseInt(tx.id.replace('FT-', ''));
      return Math.max(max, idNum);
    }, 0);
    
    const newTransaction: FinancialTransaction = {
      id: `FT-${String(maxId + 1).padStart(4, '0')}`,
      type,
      date: today,
      dueDate: today,
      paymentDate: today,
      partyType,
      partyId,
      partyName,
      categoryId: category?.id || '',
      categoryName: category?.name || (type === "Receita" ? "Vendas de Produtos" : "Custos com Produtos"),
      bankAccountId: bank?.id || '',
      bankAccountName: bank?.bankName || '',
      paymentMethodId: paymentMethod?.id || '',
      paymentMethodName: paymentMethod?.name || '',
      amount,
      status: type === "Receita" ? "Recebido" : "Pago",
      description: `Gerado automaticamente do pedido ${reference}`,
      origin: "Pedido",
      reference
    };
    
    setFinancialTransactions(prev => [newTransaction, ...prev]);
    
    // Atualizar saldo bancário
    if (bank) {
      updateBankAccount(bank.id, {
        balance: bank.balance + (type === "Receita" ? amount : -amount)
      });
    }
    
    return newTransaction;
  };

  // ==================== CUSTOMER ACTIONS ====================

  const addCustomer = (customerData: Omit<Customer, 'id' | 'totalOrders' | 'totalSpent'>) => {
    // Gerar ID baseado no maior ID existente + 1
    const maxId = (customers || []).reduce((max, customer) => {
      const idNum = parseInt(customer.id.replace('CLI-', ''));
      return Math.max(max, idNum);
    }, 0);
    
    const newCustomer: Customer = {
      ...customerData,
      id: `CLI-${String(maxId + 1).padStart(3, '0')}`,
      totalOrders: 0,
      totalSpent: 0
    };
    setCustomers(prev => [...prev, newCustomer]);
    toast.success("Cliente adicionado com sucesso!");
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  // ==================== SUPPLIER ACTIONS ====================

  const addSupplier = (supplierData: Omit<Supplier, 'id' | 'totalPurchases' | 'totalSpent'>) => {
    // Gerar ID baseado no maior ID existente + 1
    const maxId = (suppliers || []).reduce((max, supplier) => {
      const idNum = parseInt(supplier.id.replace('FOR-', ''));
      return Math.max(max, idNum);
    }, 0);
    
    const newSupplier: Supplier = {
      ...supplierData,
      id: `FOR-${String(maxId + 1).padStart(3, '0')}`,
      totalPurchases: 0,
      totalSpent: 0
    };
    setSuppliers(prev => [...prev, newSupplier]);
    toast.success("Fornecedor adicionado com sucesso!");
  };

  const updateSupplier = (id: string, updates: Partial<Supplier>) => {
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  // ==================== SALES ORDER ACTIONS ====================

  const addSalesOrder = (orderData: Omit<SalesOrder, 'id' | 'orderDate'>, isExceptional: boolean = false) => {
    // VALIDAR ESTOQUE ANTES DE CRIAR PEDIDO (exceto se for excepcional)
    const isMultiItemOrder = orderData.items && orderData.items.length > 1;
    
    if (!isExceptional) {
      // VALIDAÇÃO PARA PEDIDOS MULTI-ITEM
      if (isMultiItemOrder && orderData.items) {
        console.log(`📦 Validando estoque para pedido multi-item com ${orderData.items.length} itens`);
        
        for (const item of orderData.items) {
          const product = inventory.find(p => p.productName === item.productName);
          if (!product) {
            toast.error(`Produto "${item.productName}" não encontrado no estoque!`);
            console.error(`❌ Produto não encontrado: ${item.productName}`);
            return;
          }

          // Validar disponibilidade do item
          const validation = validateStockAvailability(
            item.productName,
            item.quantity,
            product.currentStock,
            salesOrders
          );

          if (!validation.canProceed) {
            toast.error(`${item.productName}: ${validation.message}`, {
              description: `Estoque atual: ${validation.currentStock} | Reservado: ${validation.reserved} | Disponível: ${validation.available}`
            });
            console.error(`❌ ${item.productName}: ${validation.message}`);
            return;
          }

          // Alerta se estoque está baixo
          const percentAvailable = (validation.available / validation.currentStock) * 100;
          if (percentAvailable < 20 && percentAvailable > 0) {
            toast.warning(`${item.productName}: Estoque baixo! Apenas ${validation.available} unidades disponíveis.`);
          }

          console.log(`✅ ${item.productName}: Validação de estoque OK`);
        }
        
        console.log(`✅ Validação completa do pedido multi-item OK`);
      } 
      // VALIDAÇÃO PARA PEDIDOS SINGLE-ITEM
      else {
        const product = inventory.find(item => item.productName === orderData.productName);
        if (!product) {
          toast.error(`Produto "${orderData.productName}" não encontrado no estoque!`);
          console.error(`❌ Produto não encontrado: ${orderData.productName}`);
          return;
        }

        // Validar disponibilidade
        const validation = validateStockAvailability(
          orderData.productName,
          orderData.quantity,
          product.currentStock,
          salesOrders
        );

        if (!validation.canProceed) {
          toast.error(validation.message, {
            description: `Estoque atual: ${validation.currentStock} | Reservado: ${validation.reserved} | Disponível: ${validation.available}`
          });
          console.error(`❌ ${validation.message}`);
          return;
        }

        // Alerta se estoque está baixo (menos de 20% disponível)
        const percentAvailable = (validation.available / validation.currentStock) * 100;
        if (percentAvailable < 20 && percentAvailable > 0) {
          toast.warning(`Atenção: Estoque baixo! Apenas ${validation.available} unidades disponíveis.`);
        }

        console.log(`✅ Validação de estoque OK: ${validation.message}`);
      }
    }

    const newOrder: SalesOrder = {
      ...orderData,
      id: `PV-${1046 + salesOrders.length}`,
      orderDate: new Date().toISOString().split('T')[0],
      statusHistory: [],
      actionFlags: {},
      isExceptionalOrder: isExceptional
    };

    // Preparar histórico e flags de ações
    const actionsExecuted: string[] = [isExceptional ? "⚠️ Pedido criado em modo excepcional" : "Pedido criado"];
    const generatedIds: { type: string; id: string }[] = [];
    const actionFlags: OrderActionFlags = {};

    // Se for modo excepcional com status avançado, executar todas as ações necessárias
    if (isExceptional && (orderData.status === "Enviado" || orderData.status === "Entregue" || orderData.status === "Pago")) {
      console.log(`🔄 Executando ações para pedido excepcional ${newOrder.id} com status "${orderData.status}"...`);

      // Determinar quais status precisam ser processados
      const statusesToProcess: SalesOrder['status'][] = [];
      
      if (orderData.status === "Enviado" || orderData.status === "Entregue" || orderData.status === "Pago") {
        statusesToProcess.push("Enviado");
      }
      if (orderData.status === "Entregue" || orderData.status === "Pago") {
        statusesToProcess.push("Entregue");
      }
      if (orderData.status === "Pago") {
        statusesToProcess.push("Pago");
      }

      // Executar ações para cada status
      for (const status of statusesToProcess) {
        if (status === "Enviado") {
          // Baixar estoque
          const stockResult = executeStockReduction(newOrder);
          if (stockResult.success && stockResult.movementId) {
            actionsExecuted.push(stockResult.message);
            generatedIds.push({ type: "Movimento de Estoque", id: stockResult.movementId });
            actionFlags.stockReduced = true;
            actionFlags.stockReductionId = stockResult.movementId;
          } else if (stockResult.success) {
            actionsExecuted.push(stockResult.message);
          }
        }

        if (status === "Entregue") {
          // Gerar contas a receber
          const arResult = executeAccountsReceivableCreation(newOrder);
          if (arResult.success && arResult.transactionId) {
            actionsExecuted.push(arResult.message);
            generatedIds.push({ type: "Transação Financeira", id: arResult.transactionId });
            actionFlags.accountsReceivableCreated = true;
            actionFlags.financialTransactionId = arResult.transactionId;
          } else if (arResult.success) {
            actionsExecuted.push(arResult.message);
          }
        }

        if (status === "Pago") {
          // Quitar contas a receber
          const paymentResult = executeAccountsReceivablePayment(newOrder);
          if (paymentResult.success && paymentResult.transactionId) {
            actionsExecuted.push(paymentResult.message);
            generatedIds.push({ type: "Transação Financeira (Pago)", id: paymentResult.transactionId });
            actionFlags.accountsReceivablePaid = true;
            actionFlags.financialTransactionId = paymentResult.transactionId;
          } else if (paymentResult.success) {
            actionsExecuted.push(paymentResult.message);
          }
        }
      }
    }

    // Criar entrada inicial no histórico com todas as ações executadas
    const initialHistoryEntry: StatusHistoryEntry = {
      id: `HIST-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: orderData.salesPerson || "Sistema",
      previousStatus: "",
      newStatus: orderData.status,
      actionsExecuted,
      generatedIds,
      isExceptional
    };

    newOrder.statusHistory = [initialHistoryEntry];
    newOrder.actionFlags = actionFlags;

    setSalesOrders(prev => [...prev, newOrder]);
    
    // Registrar ação de auditoria
    auditLog({
      module: AUDIT_MODULES.SALES,
      action: AUDIT_ACTIONS.SALES_ORDER_CREATED,
      details: {
        orderId: newOrder.id,
        customer: newOrder.customer,
        productName: newOrder.productName,
        quantity: newOrder.quantity,
        totalAmount: newOrder.totalAmount,
        status: newOrder.status,
        isExceptional,
        actionsExecuted: actionsExecuted.length > 1 ? actionsExecuted : undefined
      },
      entityType: 'Pedido de Venda',
      entityId: newOrder.id
    });
    
    if (isExceptional && (orderData.status === "Entregue" || orderData.status === "Pago")) {
      toast.success(`Pedido de venda ${newOrder.id} criado em modo excepcional com status "${orderData.status}"!`, {
        description: actionsExecuted.length > 1 ? `${actionsExecuted.length} ações executadas` : undefined
      });
      
      // Log das ações executadas
      if (actionsExecuted.length > 1) {
        console.log(`✅ Ações executadas para pedido ${newOrder.id}:`, actionsExecuted);
      }
    } else {
      toast.success(`Pedido de venda ${newOrder.id} criado com sucesso!`);
    }
  };

  const updateSalesOrder = (id: string, orderData: Omit<SalesOrder, 'id' | 'orderDate'>) => {
    const previousOrder = salesOrders.find(o => o.id === id);
    
    // PROTEÇÃO DE SEGURANÇA: Impedir edição de pedidos concluídos ou parcialmente concluídos
    if (previousOrder && (previousOrder.status === "Concluído" || previousOrder.status === "Parcialmente Concluído")) {
      console.error(`❌ [SEGURANÇA] Tentativa bloqueada de editar pedido ${id} com status "${previousOrder.status}"`);
      toast.error(`Não é possível editar pedidos com status "${previousOrder.status}"`, {
        description: "Pedidos concluídos não podem ser editados por questões de integridade financeira"
      });
      
      // Registrar tentativa bloqueada na auditoria
      auditLog({
        module: AUDIT_MODULES.SALES,
        action: AUDIT_ACTIONS.SALES_ORDER_UPDATED,
        details: {
          orderId: id,
          blocked: true,
          reason: `Tentativa de editar pedido com status "${previousOrder.status}"`,
          attemptedUpdates: orderData
        },
        entityType: 'Pedido de Venda',
        entityId: id,
        previousValue: previousOrder
      });
      
      return;
    }
    
    // Atualizar o pedido
    setSalesOrders(prev => prev.map(o => 
      o.id === id ? { ...o, ...orderData } : o
    ));
    
    // Ajustar estoque se quantidade/produtos foram alterados e estoque já foi baixado
    if (previousOrder && previousOrder.actionFlags?.stockReduced) {
      const quantityChanged = orderData.quantity !== undefined && orderData.quantity !== previousOrder.quantity;
      const productChanged = orderData.productName !== undefined && orderData.productName !== previousOrder.productName;
      const itemsChanged = orderData.items !== undefined;
      
      if (quantityChanged || productChanged || itemsChanged) {
        console.log(`🔄 Ajustando estoque do pedido ${id} devido a alterações...`);
        
        // Se for pedido multi-item
        if (orderData.items && orderData.items.length > 0) {
          // Reverter baixas anteriores se houver items anteriores
          if (previousOrder.items && previousOrder.items.length > 0) {
            previousOrder.items.forEach(item => {
              updateInventory(item.productName, item.quantity, `${id}-REVERTER-EDIT`);
              console.log(`  ↩️ Revertido: +${item.quantity} ${item.productName}`);
            });
          } else {
            // Reverter baixa single-item anterior
            updateInventory(previousOrder.productName, previousOrder.quantity, `${id}-REVERTER-EDIT`);
            console.log(`  ↩️ Revertido: +${previousOrder.quantity} ${previousOrder.productName}`);
          }
          
          // Aplicar novas baixas
          orderData.items.forEach(item => {
            updateInventory(item.productName, -item.quantity, `${id}-BAIXA-EDIT`);
            console.log(`  ✅ Nova baixa: -${item.quantity} ${item.productName}`);
          });
        } else {
          // Pedido single-item
          // Reverter baixa anterior
          if (previousOrder.items && previousOrder.items.length > 0) {
            previousOrder.items.forEach(item => {
              updateInventory(item.productName, item.quantity, `${id}-REVERTER-EDIT`);
              console.log(`  ↩️ Revertido: +${item.quantity} ${item.productName}`);
            });
          } else {
            updateInventory(previousOrder.productName, previousOrder.quantity, `${id}-REVERTER-EDIT`);
            console.log(`  ↩️ Revertido: +${previousOrder.quantity} ${previousOrder.productName}`);
          }
          
          // Aplicar nova baixa
          const newProductName = orderData.productName || previousOrder.productName;
          const newQuantity = orderData.quantity || previousOrder.quantity;
          updateInventory(newProductName, -newQuantity, `${id}-BAIXA-EDIT`);
          console.log(`  ✅ Nova baixa: -${newQuantity} ${newProductName}`);
        }
        
        toast.info("Estoque ajustado conforme alterações no pedido");
      }
    }
    
    // Atualizar transações financeiras vinculadas se dados financeiros foram alterados
    const financialFieldsChanged = 
      orderData.paymentCondition !== undefined ||
      orderData.firstInstallmentDays !== undefined ||
      orderData.dueDateReference !== undefined ||
      orderData.issueDate !== undefined ||
      orderData.billingDate !== undefined ||
      orderData.deliveryDate !== undefined;
    
    if (financialFieldsChanged && previousOrder) {
      // Encontrar transações vinculadas ao pedido (apenas em aberto)
      const linkedTransactions = financialTransactions.filter(t => 
        t.reference === id && 
        t.origin === "Pedido" &&
        (t.status === "A Receber" || t.status === "A Vencer" || t.status === "Vencido")
      );
      
      if (linkedTransactions.length > 0) {
        console.log(`🔄 Atualizando ${linkedTransactions.length} transação(ões) vinculada(s) ao pedido ${id}`);
        
        // Criar pedido atualizado para calcular novas datas
        const updatedOrder = { ...previousOrder, ...orderData };
        const numberOfInstallments = parseInt(updatedOrder.paymentCondition || "1");
        
        // Determinar data base para cálculo
        let baseDate: string;
        if (updatedOrder.dueDateReference === "billing" && updatedOrder.billingDate) {
          baseDate = updatedOrder.billingDate;
        } else if (updatedOrder.dueDateReference === "delivery" && updatedOrder.deliveryDate) {
          baseDate = updatedOrder.deliveryDate;
        } else {
          baseDate = updatedOrder.issueDate || updatedOrder.orderDate;
        }
        
        // Data da transação (issueDate do pedido)
        const transactionDate = updatedOrder.issueDate || updatedOrder.orderDate;
        
        // Atualizar cada transação com nova data de vencimento e data da transação
        setFinancialTransactions(prev => prev.map(t => {
          const linkedTx = linkedTransactions.find(lt => lt.id === t.id);
          if (!linkedTx) return t;
          
          // Calcular nova data de vencimento baseada no número da parcela
          const installmentNumber = t.installmentNumber || 1;
          const firstInstallmentDays = updatedOrder.firstInstallmentDays || 0;
          const daysToAdd = firstInstallmentDays + ((installmentNumber - 1) * 30);
          const newDueDate = addDaysToDate(baseDate, daysToAdd);
          
          console.log(`  📅 Transação ${t.id} (${installmentNumber}/${numberOfInstallments}): date=${t.date}→${transactionDate}, dueDate=${t.dueDate}→${newDueDate}`);
          
          return {
            ...t,
            date: transactionDate,
            dueDate: newDueDate
          };
        }));
        
        toast.success(`Pedido ${id} atualizado com sucesso!`, {
          description: `${linkedTransactions.length} transação(ões) financeira(s) também atualizada(s)`
        });
      } else {
        toast.success(`Pedido ${id} atualizado com sucesso!`);
      }
    } else {
      toast.success(`Pedido ${id} atualizado com sucesso!`);
    }
    
    // Registrar ação de auditoria
    auditLog({
      module: AUDIT_MODULES.SALES,
      action: AUDIT_ACTIONS.SALES_ORDER_UPDATED,
      details: {
        orderId: id,
        updates: orderData,
        transactionsUpdated: financialFieldsChanged
      },
      entityType: 'Pedido de Venda',
      entityId: id,
      previousValue: previousOrder,
      newValue: { ...previousOrder, ...orderData }
    });
  };

  // ==================== STATUS STATE MACHINE (CRIT-004) ====================

  /**
   * Validar transição de status usando máquina de estados
   * CRIT-004: Implementação de validação estrita de transições
   */
  const isValidStatusTransition = (currentStatus: SalesOrder['status'], newStatus: SalesOrder['status']): boolean => {
    const validationResult = validateSalesOrderStatusTransition(
      { status: currentStatus } as SalesOrder,
      newStatus
    );
    
    return validationResult.isValid;
  };

  /**
   * Obter status intermediários que foram pulados
   * Usado para executar automações de etapas puladas
   */
  const getSkippedStatuses = (currentStatus: SalesOrder['status'], newStatus: SalesOrder['status']): SalesOrder['status'][] => {
    return getSkippedStatusesFromValidator(
      currentStatus as any,
      newStatus as any,
      'sales'
    ) as SalesOrder['status'][];
  };

  // Executar ação de baixa de estoque (idempotente com proteção atômica)
  const executeStockReduction = (order: SalesOrder): { success: boolean; movementId?: string; message: string } => {
    console.log(`🔍 [executeStockReduction] INICIANDO para pedido ${order.id}`);
    console.log(`🔍 [executeStockReduction] actionFlags:`, order.actionFlags);
    
    // NOVA LÓGICA: Processar pedidos multi-item se tiver array de items
    if (order.items && order.items.length > 0) {
      console.log(`📦 Processando pedido multi-item ${order.id} com ${order.items.length} itens`);
      
      // ADQUIRIR LOCK ANTES DE EXECUTAR
      const lockResult = acquireLock(order.id, 'stock_reduction');
      if (!lockResult.acquired) {
        console.error(`❌ Não foi possível adquirir lock: ${lockResult.message}`);
        return { success: false, message: lockResult.message };
      }

      try {
        const processedItems: string[] = [];
        let allSuccess = true;
        let failureReason = '';

        // Processar cada item individualmente
        for (const item of order.items) {
          const product = inventory.find(p => p.productName === item.productName);
          
          if (!product) {
            console.error(`❌ Produto não encontrado: ${item.productName}`);
            failureReason = `Produto "${item.productName}" não encontrado no estoque`;
            allSuccess = false;
            break;
          }

          // Validar estoque disponível para o item (pular verificação de lock pois já foi adquirido)
          const validation = validateStockReduction(
            { ...order, productName: item.productName, quantity: item.quantity } as SalesOrder,
            product.currentStock,
            salesOrders,
            true // skipLockCheck: true - lock já foi adquirido
          );

          if (!validation.canProceed) {
            console.warn(`⚠️ [${order.id}] Item ${item.productName}: ${validation.message}`);
            failureReason = `${item.productName}: ${validation.message}`;
            allSuccess = false;
            break;
          }

          // Executar baixa do item
          console.log(`🔄 Baixando estoque: ${item.quantity} unidades de ${item.productName}`);
          updateInventory(item.productName, -item.quantity, order.id);
          processedItems.push(`${item.quantity}x ${item.productName}`);
        }

        if (allSuccess) {
          const movementId = `MOV-${Date.now()}`;
          console.log(`✅ Baixa multi-item executada com sucesso! Movimento: ${movementId}`);
          return {
            success: true,
            movementId,
            message: `✅ Baixa de ${order.items.length} item(ns): ${processedItems.join(', ')}`
          };
        } else {
          console.error(`❌ Falha ao processar multi-item: ${failureReason}`);
          return { success: false, message: failureReason };
        }
      } catch (error) {
        console.error(`❌ Erro ao executar baixa multi-item:`, error);
        return { success: false, message: `Erro ao executar baixa de estoque multi-item: ${error}` };
      } finally {
        // SEMPRE LIBERAR LOCK, MESMO EM CASO DE ERRO
        releaseLock(order.id, 'stock_reduction', lockResult.lockId!);
      }
    }
    
    // LEGADO: Verificar formato antigo de pedidos multi-item (sem array items)
    const isOldMultiItemFormat = order.productName.includes('e mais') && order.productName.includes('item(ns)');
    if (isOldMultiItemFormat) {
      console.log(`⚠️ Pedido multi-item ${order.id} em formato antigo - sem array de itens`);
      return { success: true, message: '⚠️ Pedido multi-item sem detalhamento de itens (gerenciar manualmente)' };
    }
    
    // PEDIDO SINGLE-ITEM: Processar normalmente
    const product = inventory.find(item => item.productName === order.productName);
    if (!product) {
      console.error(`❌ Produto não encontrado: ${order.productName}`);
      return { success: false, message: "Produto não encontrado no estoque" };
    }

    // VALIDAÇÃO ATÔMICA COM MÚLTIPLAS PROTEÇÕES
    const validation = validateStockReduction(order, product.currentStock, salesOrders);
    console.log(`🔍 [executeStockReduction] Resultado da validação:`, validation);
    
    if (!validation.canProceed) {
      console.warn(`⚠️ [${order.id}] Validação de estoque falhou: ${validation.message}`);
      return { success: false, message: validation.message };
    }

    // ADQUIRIR LOCK ANTES DE EXECUTAR
    const lockResult = acquireLock(order.id, 'stock_reduction');
    if (!lockResult.acquired) {
      console.error(`❌ Não foi possível adquirir lock: ${lockResult.message}`);
      return { success: false, message: lockResult.message };
    }

    try {
      // EXECUTAR BAIXA COM LOCK ATIVO
      console.log(`🔄 Executando baixa de estoque para pedido ${order.id}...`);
      updateInventory(order.productName, -order.quantity, order.id);
      
      const movementId = `MOV-${Date.now()}`;
      console.log(`✅ Baixa executada com sucesso! Movimento: ${movementId}`);
      
      return { 
        success: true, 
        movementId,
        message: `✅ Baixa de ${order.quantity} unidades de ${order.productName} (Disponível: ${validation.details.available})` 
      };
    } catch (error) {
      console.error(`❌ Erro ao executar baixa de estoque:`, error);
      return { success: false, message: `Erro ao executar baixa de estoque: ${error}` };
    } finally {
      // SEMPRE LIBERAR LOCK, MESMO EM CASO DE ERRO
      releaseLock(order.id, 'stock_reduction', lockResult.lockId!);
    }
  };

  // Calcular data de vencimento baseada nas configurações do pedido
  const calculateDueDate = (order: SalesOrder): string => {
    // Determinar data base conforme referência escolhida
    let baseDate: Date;
    if (order.dueDateReference === "billing" && order.billingDate) {
      const [year, month, day] = order.billingDate.split('-').map(Number);
      baseDate = new Date(year, month - 1, day);
    } else if (order.dueDateReference === "delivery" && order.deliveryDate) {
      const [year, month, day] = order.deliveryDate.split('-').map(Number);
      baseDate = new Date(year, month - 1, day);
    } else if (order.issueDate) {
      const [year, month, day] = order.issueDate.split('-').map(Number);
      baseDate = new Date(year, month - 1, day);
    } else {
      // Fallback para orderDate se issueDate não estiver disponível
      baseDate = new Date(order.orderDate);
    }

    // Adicionar prazo da primeira parcela
    const firstInstallmentDays = order.firstInstallmentDays || 0;
    baseDate.setDate(baseDate.getDate() + firstInstallmentDays);

    // Formatar a data no formato YYYY-MM-DD
    const year = baseDate.getFullYear();
    const month = String(baseDate.getMonth() + 1).padStart(2, '0');
    const day = String(baseDate.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };

  // Executar criação de contas a receber (idempotente com proteção atômica)
  const executeAccountsReceivableCreation = (order: SalesOrder): { success: boolean; transactionId?: string; transaction?: FinancialTransaction; message: string } => {
    // VALIDAÇÃO ATÔMICA
    const validation = validateAccountsCreation(order);
    if (!validation.canProceed) {
      console.warn(`⚠️ ${validation.message}`);
      return { success: false, message: validation.message };
    }

    // VERIFICAR SE JÁ EXISTE TRANSAÇÃO COM MESMA REFERÊNCIA
    const existingTransaction = (financialTransactions || []).find(
      t => t.reference === order.id && t.status !== "Cancelado"
    );
    if (existingTransaction) {
      console.warn(`⚠️ Transação já existe para pedido ${order.id}: ${existingTransaction.id}`);
      return { 
        success: true, 
        transactionId: existingTransaction.id,
        transaction: existingTransaction, // RETORNA A TRANSAÇÃO EXISTENTE
        message: `Conta a receber já existe: ${existingTransaction.id}` 
      };
    }

    // ADQUIRIR LOCK
    const lockResult = acquireLock(order.id, 'accounts_creation');
    if (!lockResult.acquired) {
      console.error(`❌ ${lockResult.message}`);
      return { success: false, message: lockResult.message };
    }

    try {
      console.log(`🔄 Criando conta a receber para pedido ${order.id}...`);
      
      const category = (accountCategories || []).find(cat => cat.type === "Receita" && cat.isActive);
      const bankAccounts = companySettings?.bankAccounts || [];
      const bank = order.bankAccountId 
        ? bankAccounts.find(b => b.id === order.bankAccountId)
        : bankAccounts.find(b => b.isPrimary) || bankAccounts[0];
      const paymentMethod = (paymentMethods || []).find(pm => pm.isActive) || (paymentMethods || [])[0];
      
      // CORREÇÃO: Usar issueDate do pedido como data da transação
      const transactionDate = order.issueDate || order.orderDate;
      
      // Identificar número de parcelas da condição de pagamento
      let numberOfInstallments = 1;
      if (order.paymentCondition) {
        // Aceitar tanto "2" quanto "2x" como formato
        const parsedValue = parseInt(order.paymentCondition);
        if (!isNaN(parsedValue) && parsedValue > 0) {
          numberOfInstallments = parsedValue;
        }
      }

      console.log(`📅 Configuração de parcelamento:`, {
        paymentCondition: order.paymentCondition,
        numberOfInstallments,
        totalAmount: order.totalAmount
      });

      // Criar transações (parcelas)
      const createdTransactions: FinancialTransaction[] = [];
      const installmentAmount = order.totalAmount / numberOfInstallments;

      for (let i = 0; i < numberOfInstallments; i++) {
        const transactionId = generateNextFinancialTransactionId();
        
        // Calcular data de vencimento para cada parcela usando utilitário sem problema de timezone
        const firstDueDateBase = calculateDueDate(order);
        const dueDate = addDaysToDate(firstDueDateBase, i * 30); // Adiciona 30 dias para cada parcela
        
        const description = numberOfInstallments === 1
          ? `Pedido de venda ${order.id} - Parcela única`
          : `Pedido de venda ${order.id} - Parcela ${i + 1}/${numberOfInstallments}`;
        
        const newTransaction: FinancialTransaction = {
          id: transactionId,
          type: "Receita",
          date: transactionDate,
          dueDate: dueDate,
          paymentDate: undefined,
          effectiveDate: undefined,
          partyType: "Cliente",
          partyId: order.customerId,
          partyName: order.customer,
          categoryId: category?.id || '',
          categoryName: category?.name || "Vendas de Produtos",
          bankAccountId: bank?.id || '',
          bankAccountName: bank?.bankName || '',
          paymentMethodId: paymentMethod?.id || '',
          paymentMethodName: paymentMethod?.name || '',
          amount: installmentAmount,
          status: "A Receber",
          description,
          origin: "Pedido",
          reference: order.id,
          installmentNumber: i + 1,
          totalInstallments: numberOfInstallments
        };
        
        createdTransactions.push(newTransaction);
        
        console.log(`💾 Criando transação financeira ${i + 1}/${numberOfInstallments}:`, {
          id: newTransaction.id,
          status: newTransaction.status,
          amount: newTransaction.amount,
          dueDate: newTransaction.dueDate,
          installment: `${i + 1}/${numberOfInstallments}`
        });
      }
      
      // Adicionar todas as transações de uma vez
      setFinancialTransactions(prev => {
        const updated = [...createdTransactions, ...prev];
        console.log(`📊 ${createdTransactions.length} transação(ões) financeira(s) criada(s). Total: ${updated.length}`);
        return updated;
      });
      
      console.log(`✅ ${createdTransactions.length} conta(s) a receber criada(s) para pedido ${order.id}`);
      
      return { 
        success: true, 
        transactionId: createdTransactions[0].id,
        transaction: createdTransactions[0], // RETORNA A PRIMEIRA TRANSAÇÃO
        message: `✅ ${createdTransactions.length} lançamento(s) financeiro(s) criado(s) - Total a receber: R$ ${order.totalAmount.toFixed(2)}` 
      };
    } catch (error) {
      console.error(`❌ Erro ao criar conta a receber:`, error);
      return { success: false, message: `Erro ao criar conta a receber: ${error}` };
    } finally {
      releaseLock(order.id, 'accounts_creation', lockResult.lockId!);
    }
  };

  // Executar quitação de contas a receber (idempotente com proteção atômica)
  const executeAccountsReceivablePayment = (order: SalesOrder, existingTransactionFromContext?: FinancialTransaction): { success: boolean; transactionId?: string; message: string } => {
    // VALIDAÇÃO ATÔMICA
    const validation = validatePayment(order);
    if (!validation.canProceed) {
      console.warn(`⚠️ ${validation.message}`);
      return { success: false, message: validation.message };
    }

    // VERIFICAR SE JÁ EXISTE TRANSAÇÃO PAGA COM MESMA REFERÊNCIA
    const existingPaidTransaction = (financialTransactions || []).find(
      t => t.reference === order.id && t.status === "Recebido"
    );
    if (existingPaidTransaction) {
      console.warn(`⚠️ Pagamento já recebido para pedido ${order.id}: ${existingPaidTransaction.id}`);
      return { 
        success: true, 
        transactionId: existingPaidTransaction.id,
        message: `Pagamento já recebido anteriormente: ${existingPaidTransaction.id}` 
      };
    }

    // ADQUIRIR LOCK
    const lockResult = acquireLock(order.id, 'payment');
    if (!lockResult.acquired) {
      console.error(`❌ ${lockResult.message}`);
      return { success: false, message: lockResult.message };
    }

    try {
      console.log(`🔄 Recebendo pagamento para pedido ${order.id}...`);
      
      const today = new Date().toISOString().split('T')[0];
      const bank = order.bankAccountId 
        ? companySettings.bankAccounts.find(b => b.id === order.bankAccountId)
        : companySettings.bankAccounts.find(b => b.isPrimary) || companySettings.bankAccounts[0];
      
      // Verificar se existe transação criada anteriormente (status "Entregue")
      let transactionId: string;
      let isNewTransaction = false;
      
      // SOLUÇÃO DEFINITIVA: Se recebemos a transação do contexto do mesmo fluxo, usar ela diretamente
      // Isso evita o problema de race condition com estado assíncrono do React
      if (existingTransactionFromContext) {
        console.log(`✅ [CONTEXTO] Usando transação passada do fluxo: ${existingTransactionFromContext.id}`);
        
        if (existingTransactionFromContext.status === "A Vencer" || existingTransactionFromContext.status === "Vencido") {
          console.log(`🔄 Atualizando transação ${existingTransactionFromContext.id} para "Recebido"...`);
          
          setFinancialTransactions(prev => prev.map(t => 
            t.id === existingTransactionFromContext.id 
              ? { 
                  ...t, 
                  status: "Recebido",
                  paymentDate: today
                } 
              : t
          ));
          
          transactionId = existingTransactionFromContext.id;
          console.log(`✅ Transação ${transactionId} atualizada para "Recebido"`);
        } else if (existingTransactionFromContext.status === "Recebido") {
          transactionId = existingTransactionFromContext.id;
          console.log(`ℹ️ Transação ${transactionId} já estava "Recebido"`);
        } else {
          console.warn(`⚠️ Transação ${existingTransactionFromContext.id} tem status inesperado: "${existingTransactionFromContext.status}". Criando nova...`);
          isNewTransaction = true;
        }
      } else {
        // Fallback: Buscar no estado (para mudanças manuais de status fora do fluxo automático)
        const existingTransactionByReference = (financialTransactions || []).find(
          t => t.reference === order.id && t.status !== "Cancelado" && t.status !== "Recebido"
        );
        
        if (existingTransactionByReference) {
        // Transação encontrada pela referência (pode ser "A Vencer" ou "Vencido")
        console.log(`✅ Transação encontrada por referência: ${existingTransactionByReference.id} com status "${existingTransactionByReference.status}"`);
        
        if (existingTransactionByReference.status === "A Vencer" || existingTransactionByReference.status === "Vencido") {
          console.log(`🔄 Atualizando transação existente ${existingTransactionByReference.id} para "Recebido"...`);
          
          setFinancialTransactions(prev => prev.map(t => 
            t.id === existingTransactionByReference.id 
              ? { 
                  ...t, 
                  status: "Recebido",
                  paymentDate: today
                } 
              : t
          ));
          
          transactionId = existingTransactionByReference.id;
          console.log(`✅ Transação ${transactionId} atualizada para "Recebido"`);
        } else {
          // Status inesperado
          console.warn(`⚠️ Transação ${existingTransactionByReference.id} tem status inesperado: "${existingTransactionByReference.status}". Criando nova...`);
          isNewTransaction = true;
        }
      } else if (order.actionFlags?.financialTransactionId) {
        // Fallback: tentar buscar por actionFlags (para compatibilidade com fluxos antigos)
        console.log(`🔍 Procurando transação por actionFlags: ${order.actionFlags.financialTransactionId}`);
        
        const existingTransaction = (financialTransactions || []).find(
          t => t.id === order.actionFlags.financialTransactionId
        );
        
        if (existingTransaction) {
          console.log(`✅ Transação encontrada por ID: ${existingTransaction.id} com status "${existingTransaction.status}"`);
          
          if (existingTransaction.status === "A Vencer" || existingTransaction.status === "Vencido") {
            console.log(`🔄 Atualizando transação existente ${existingTransaction.id} para "Recebido"...`);
            
            setFinancialTransactions(prev => prev.map(t => 
              t.id === existingTransaction.id 
                ? { 
                    ...t, 
                    status: "Recebido",
                    paymentDate: today
                  } 
                : t
            ));
            
            transactionId = existingTransaction.id;
            console.log(`✅ Transação ${transactionId} atualizada para "Recebido"`);
          } else if (existingTransaction.status === "Recebido") {
            // Já está recebido, não fazer nada
            transactionId = existingTransaction.id;
            console.log(`ℹ️ Transação ${transactionId} já estava "Recebido"`);
          } else {
            // Status inesperado
            console.warn(`⚠️ Transação ${existingTransaction.id} tem status inesperado: "${existingTransaction.status}". Criando nova...`);
            isNewTransaction = true;
          }
          } else {
            // Transação não encontrada por ID
            console.warn(`⚠️ Transação ${order.actionFlags.financialTransactionId} não encontrada. Criando nova...`);
            isNewTransaction = true;
          }
        } else {
          // Não existe transação anterior - criar nova
          console.log(`ℹ️ Nenhuma transação anterior encontrada. Criando nova transação...`);
          isNewTransaction = true;
        }
      }
      
      // Criar nova transação se necessário
      if (isNewTransaction) {
        const category = (accountCategories || []).find(cat => cat.type === "Receita" && cat.isActive);
        const paymentMethod = (paymentMethods || []).find(pm => pm.isActive) || (paymentMethods || [])[0];
        const newTransactionId = generateNextFinancialTransactionId();
        
        // CORREÇÃO: Usar issueDate do pedido como data da transação
        const transactionDate = order.issueDate || order.orderDate;
        
        // CORREÇÃO: Calcular data de vencimento correta baseada nas configurações do pedido
        const dueDate = calculateDueDate(order);
        
        console.log(`📅 Datas calculadas (modo Pago):`, {
          transactionDate,
          dueDate,
          paymentDate: today,
          issueDate: order.issueDate,
          billingDate: order.billingDate,
          deliveryDate: order.deliveryDate,
          dueDateReference: order.dueDateReference,
          firstInstallmentDays: order.firstInstallmentDays
        });
        
        const newTransaction: FinancialTransaction = {
          id: newTransactionId,
          type: "Receita",
          date: transactionDate,
          dueDate: dueDate,
          paymentDate: today,
          partyType: "Cliente",
          partyId: order.customerId,
          partyName: order.customer,
          categoryId: category?.id || '',
          categoryName: category?.name || "Vendas de Produtos",
          bankAccountId: bank?.id || '',
          bankAccountName: bank?.bankName || '',
          paymentMethodId: paymentMethod?.id || '',
          paymentMethodName: paymentMethod?.name || '',
          amount: order.totalAmount,
          status: "Recebido",
          description: `Pedido de venda ${order.id} - Pago`,
          origin: "Pedido",
          reference: order.id
        };
        
        console.log(`💾 Criando nova transação (modo Pago):`, {
          id: newTransaction.id,
          status: newTransaction.status,
          amount: newTransaction.amount,
          reference: newTransaction.reference
        });
        
        setFinancialTransactions(prev => {
          const updated = [newTransaction, ...prev];
          console.log(`📊 Array de transações atualizado (Pago). Total: ${updated.length}`);
          return updated;
        });
        
        transactionId = newTransaction.id;
        console.log(`✅ Nova transação criada: ${transactionId} para pedido ${order.id}`);
      }
      
      // Atualizar saldo bancário
      if (bank) {
        updateBankAccount(bank.id, {
          balance: bank.balance + order.totalAmount
        });
      }

      // Atualizar dados do cliente (apenas se for nova transação ou primeira vez)
      if (isNewTransaction || !order.actionFlags?.customerStatsUpdated) {
        const customer = customers.find(c => c.id === order.customerId);
        if (customer) {
          updateCustomer(order.customerId, {
            totalOrders: customer.totalOrders + 1,
            totalSpent: customer.totalSpent + order.totalAmount
          });
        }
      }
      
      console.log(`✅ Pagamento recebido: ${transactionId}`);
      
      return { 
        success: true, 
        transactionId,
        message: isNewTransaction 
          ? `✅ Pagamento recebido - Saldo bancário atualizado: +R$ ${order.totalAmount.toFixed(2)}`
          : `✅ Pagamento recebido - Transação ${transactionId} atualizada para "Recebido"` 
      };
    } catch (error) {
      console.error(`❌ Erro ao receber pagamento:`, error);
      return { success: false, message: `Erro ao receber pagamento: ${error}` };
    } finally {
      releaseLock(order.id, 'payment', lockResult.lockId!);
    }
  };

  // Estornar operações ao cancelar pedido
  const executeOrderCancellation = (order: SalesOrder): { success: boolean; message: string } => {
    const actions: string[] = [];

    // Estornar baixa de estoque se foi executada
    if (order.actionFlags?.stockReduced) {
      updateInventory(order.productName, order.quantity, `${order.id}-CANCELAMENTO`);
      actions.push(`Estoque restaurado: +${order.quantity} unidades`);
    }

    // Cancelar transação financeira se existe
    if (order.actionFlags?.financialTransactionId) {
      setFinancialTransactions(prev => prev.map(t => 
        t.id === order.actionFlags?.financialTransactionId 
          ? { ...t, status: "Cancelado" } 
          : t
      ));
      actions.push(`Transação ${order.actionFlags.financialTransactionId} cancelada`);
    }

    // Reverter saldo bancário se pagamento foi recebido
    if (order.actionFlags?.accountsReceivablePaid) {
      const bank = order.bankAccountId 
        ? companySettings.bankAccounts.find(b => b.id === order.bankAccountId)
        : companySettings.bankAccounts.find(b => b.isPrimary) || companySettings.bankAccounts[0];
      
      if (bank) {
        updateBankAccount(bank.id, {
          balance: bank.balance - order.totalAmount
        });
        actions.push(`Saldo bancário revertido: -R$ ${order.totalAmount.toFixed(2)}`);
      }
    }

    return { 
      success: true, 
      message: actions.length > 0 ? actions.join("; ") : "Pedido cancelado sem ações a reverter" 
    };
  };

  const updateSalesOrderStatus = (id: string, newStatus: SalesOrder['status'], userName: string = "Sistema", isExceptional: boolean = false) => {
    const order = salesOrders.find(o => o.id === id);
    if (!order) {
      toast.error("Pedido não encontrado!");
      return;
    }

    const oldStatus = order.status;
    
    // VALIDAÇÃO COMPLETA COM MÁQUINA DE ESTADOS (CRIT-004)
    const validationResult = validateSalesOrderStatusTransition(order, newStatus);
    
    // Registrar tentativa de transição para auditoria
    logTransitionAttempt(order.id, oldStatus as any, newStatus as any, validationResult);
    
    // Bloquear transição se inválida
    if (!validationResult.isValid) {
      toast.error(validationResult.message, {
        description: validationResult.details.validNextStatuses.length > 0
          ? `Próximos status válidos: ${validationResult.details.validNextStatuses.join(", ")}`
          : undefined,
        duration: 5000
      });
      
      // Log já feito por logTransitionAttempt() - não duplicar
      return;
    }
    
    // Log de sucesso
    console.log(`✅ Transição permitida [${order.id}]: ${oldStatus} → ${newStatus}`);

    // Preparar histórico
    const actionsExecuted: string[] = [];
    const generatedIds: { type: string; id: string }[] = [];
    const updatedActionFlags: OrderActionFlags = { ...order.actionFlags };

    // Obter status intermediários pulados
    const skippedStatuses = getSkippedStatuses(oldStatus, newStatus);
    
    console.log(`🔍 [DEBUG] Transição ${order.id}: ${oldStatus} → ${newStatus}`);
    console.log(`🔍 [DEBUG] Status intermediários detectados:`, skippedStatuses);
    
    if (skippedStatuses.length > 0) {
      actionsExecuted.push(`Status intermediários executados: ${skippedStatuses.join(" → ")}`);
    }

    // Executar ações conforme o novo status e status intermediários
    const statusesToProcess = [...skippedStatuses, newStatus];
    console.log(`🔍 [DEBUG] Status a processar:`, statusesToProcess);

    // CORREÇÃO CRÍTICA: Criar uma cópia mutável do pedido para passar o contexto atualizado entre etapas
    // Isso evita o problema de race condition com estado assíncrono do React
    const orderWithUpdatedContext = { ...order, actionFlags: updatedActionFlags };
    
    // SOLUÇÃO DEFINITIVA: Manter referência da transação criada no status "Entregue"
    let createdTransaction: FinancialTransaction | undefined;

    for (const status of statusesToProcess) {
      console.log(`🔍 [DEBUG LOOP] Processando status: "${status}"`);
      switch (status) {
        case "Enviado":
          // Baixar estoque
          const stockResult = executeStockReduction(orderWithUpdatedContext);
          if (stockResult.success && stockResult.movementId) {
            actionsExecuted.push(`✅ ${stockResult.message}`);
            if (stockResult.movementId) {
              generatedIds.push({ type: "Movimento de Estoque", id: stockResult.movementId });
            }
            updatedActionFlags.stockReduced = true;
            updatedActionFlags.stockReductionId = stockResult.movementId;
            orderWithUpdatedContext.actionFlags = updatedActionFlags; // Atualizar contexto
          } else if (!stockResult.success) {
            toast.error(`Erro ao baixar estoque: ${stockResult.message}`);
            return;
          } else {
            actionsExecuted.push(`ℹ️ ${stockResult.message}`);
          }
          break;

        case "Entregue":
          // Gerar contas a receber
          const arResult = executeAccountsReceivableCreation(orderWithUpdatedContext);
          if (arResult.success) {
            actionsExecuted.push(`✅ ${arResult.message}`);
            if (arResult.transactionId) {
              generatedIds.push({ type: "Transação Financeira", id: arResult.transactionId });
              updatedActionFlags.financialTransactionId = arResult.transactionId;
              orderWithUpdatedContext.actionFlags = updatedActionFlags; // Atualizar contexto ANTES de "Pago"
              createdTransaction = arResult.transaction; // GUARDAR TRANSAÇÃO CRIADA
              console.log(`📌 [CORREÇÃO DEFINITIVA] Transação criada e guardada: ${arResult.transactionId}`);
            }
            updatedActionFlags.accountsReceivableCreated = true;
          } else {
            actionsExecuted.push(`ℹ️ ${arResult.message}`);
          }
          break;

        case "Cancelado":
          // Estornar operações
          const cancelResult = executeOrderCancellation(orderWithUpdatedContext);
          actionsExecuted.push(`⚠️ ${cancelResult.message}`);
          break;
      }
    }

    // Criar entrada no histórico
    const historyEntry: StatusHistoryEntry = {
      id: `HIST-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: userName,
      previousStatus: oldStatus,
      newStatus,
      actionsExecuted,
      generatedIds,
      isExceptional
    };

    // Atualizar pedido com novo status, histórico e flags
    console.log(`💾 Salvando pedido ${id} com actionFlags:`, updatedActionFlags);
    
    setSalesOrders(prev => prev.map(o => 
      o.id === id ? { 
        ...o, 
        status: newStatus,
        statusHistory: [...(o.statusHistory || []), historyEntry],
        actionFlags: updatedActionFlags
      } : o
    ));

    // Notificação de sucesso
    const statusMessages = {
      "Confirmado": "Pedido confirmado!",
      "Enviado": "Pedido enviado! Estoque atualizado.",
      "Entregue": "Pedido entregue! Transações financeiras criadas.",
      "Parcialmente Concluído": "Pedido parcialmente concluído!",
      "Concluído": "Pedido concluído! Todos os pagamentos foram recebidos.",
      "Cancelado": "Pedido cancelado! Operações revertidas."
    };

    toast.success(statusMessages[newStatus] || `Status atualizado para ${newStatus}`);
    
    if (actionsExecuted.length > 0) {
      console.log(`Ações executadas para pedido ${id}:`, actionsExecuted);
    }
  };



  // ==================== INVENTORY ACTIONS ====================

  // Função auxiliar para atualizar a tabela de preço padrão
  const updateDefaultPriceTable = (productName: string, sellPrice: number) => {
    setPriceTables(prev => {
      // Verificar se existe tabela padrão
      let defaultTable = prev.find(pt => pt.isDefault);
      
      if (!defaultTable) {
        // Criar tabela padrão se não existir
        const newDefaultTable: PriceTable = {
          id: 'TAB-DEFAULT',
          name: 'Tabela Padrão',
          description: 'Tabela de preços padrão gerada automaticamente a partir do cadastro de produtos',
          isDefault: true,
          items: [{ productName, price: sellPrice }],
          createdAt: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString().split('T')[0]
        };
        return [...prev, newDefaultTable];
      }
      
      // Atualizar tabela padrão existente
      return prev.map(pt => {
        if (pt.isDefault) {
          const existingItemIndex = pt.items.findIndex(item => item.productName === productName);
          let updatedItems: PriceTableItem[];
          
          if (existingItemIndex >= 0) {
            // Atualizar preço do produto existente
            updatedItems = pt.items.map((item, index) =>
              index === existingItemIndex ? { ...item, price: sellPrice } : item
            );
          } else {
            // Adicionar novo produto
            updatedItems = [...pt.items, { productName, price: sellPrice }];
          }
          
          return {
            ...pt,
            items: updatedItems,
            updatedAt: new Date().toISOString().split('T')[0]
          };
        }
        return pt;
      });
    });
  };

  const addInventoryItem = (itemData: Omit<InventoryItem, 'id' | 'status' | 'lastRestocked'>) => {
    let status: InventoryItem['status'] = "Em Estoque";
    
    if (itemData.currentStock === 0) {
      status = "Fora de Estoque";
    } else if (itemData.currentStock <= itemData.reorderLevel) {
      status = "Baixo Estoque";
    }

    const newItem: InventoryItem = {
      ...itemData,
      id: `PROD-${String(inventory.length + 1).padStart(3, '0')}`,
      status,
      lastRestocked: new Date().toISOString().split('T')[0]
    };

    setInventory(prev => [...prev, newItem]);
    
    // Atualizar tabela de preço padrão automaticamente
    updateDefaultPriceTable(newItem.productName, newItem.sellPrice);
    
    toast.success(`Produto ${newItem.productName} adicionado ao estoque!`);
  };

  const updateInventoryItem = (id: string, updates: Partial<InventoryItem>) => {
    setInventory(prev => prev.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, ...updates };
        
        // Recalcular status se a quantidade mudou
        if (updates.currentStock !== undefined || updates.reorderLevel !== undefined) {
          if (updatedItem.currentStock === 0) {
            updatedItem.status = "Fora de Estoque";
          } else if (updatedItem.currentStock <= updatedItem.reorderLevel) {
            updatedItem.status = "Baixo Estoque";
          } else {
            updatedItem.status = "Em Estoque";
          }
        }
        
        // Atualizar tabela de preço padrão se o preço de venda mudou
        if (updates.sellPrice !== undefined) {
          updateDefaultPriceTable(updatedItem.productName, updatedItem.sellPrice);
        }
        
        return updatedItem;
      }
      return item;
    }));
    toast.success("Produto atualizado com sucesso!");
  };

  const addStockMovement = (productId: string, quantity: number, reason: string, description?: string) => {
    const product = inventory.find(item => item.id === productId);
    if (!product) return;

    const previousStock = product.currentStock;
    const newStock = previousStock + quantity;
    
    // Criar registro de movimentação
    const now = new Date();
    // Gerar ID único com timestamp + sufixo aleatório para evitar duplicatas
    const uniqueSuffix = Math.random().toString(36).substring(2, 9);
    const movement: StockMovement = {
      id: `MOV-${Date.now()}-${uniqueSuffix}`,
      productId: product.id,
      productName: product.productName,
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0],
      type: quantity > 0 ? "Entrada" : "Saída",
      quantity: Math.abs(quantity),
      previousStock,
      newStock,
      reason,
      description
    };
    
    setStockMovements(prev => [movement, ...prev]);
    
    setInventory(prev => prev.map(item => {
      if (item.id === productId) {
        let newStatus: InventoryItem['status'] = "Em Estoque";
        
        if (newStock === 0) {
          newStatus = "Fora de Estoque";
        } else if (newStock <= item.reorderLevel) {
          newStatus = "Baixo Estoque";
        }

        return {
          ...item,
          currentStock: newStock,
          status: newStatus,
          lastRestocked: quantity > 0 ? new Date().toISOString().split('T')[0] : item.lastRestocked
        };
      }
      return item;
    }));
    
    const movementType = quantity > 0 ? "Entrada" : "Saída";
    toast.success(`${movementType} de ${Math.abs(quantity)} unidades registrada - ${reason}`);
  };

  const updateInventory = (productName: string, quantityChange: number, reference?: string) => {
    const product = inventory.find(item => item.productName === productName);
    if (!product) return;

    const previousStock = product.currentStock;
    const newStock = previousStock + quantityChange;
    
    // Criar registro de movimentação automática
    const now = new Date();
    // Gerar ID único com timestamp + sufixo aleatório para evitar duplicatas
    const uniqueSuffix = Math.random().toString(36).substring(2, 9);
    const movement: StockMovement = {
      id: `MOV-${Date.now()}-${uniqueSuffix}`,
      productId: product.id,
      productName: product.productName,
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0],
      type: quantityChange > 0 ? "Entrada" : "Saída",
      quantity: Math.abs(quantityChange),
      previousStock,
      newStock,
      reason: quantityChange > 0 ? "Pedido de Compra Recebido" : "Pedido de Venda Entregue",
      description: reference ? `Referência: ${reference}` : undefined,
      reference
    };
    
    setStockMovements(prev => [movement, ...prev]);
    
    setInventory(prev => prev.map(item => {
      if (item.productName === productName) {
        let newStatus: InventoryItem['status'] = "Em Estoque";
        
        if (newStock === 0) {
          newStatus = "Fora de Estoque";
        } else if (newStock <= item.reorderLevel) {
          newStatus = "Baixo Estoque";
        }

        return {
          ...item,
          currentStock: newStock,
          status: newStatus,
          lastRestocked: quantityChange > 0 ? new Date().toISOString().split('T')[0] : item.lastRestocked
        };
      }
      return item;
    }));
  };

  // ==================== QUERIES ====================

  const getStockMovementsByProduct = (productId: string) => {
    return stockMovements.filter(m => m.productId === productId);
  };

  // ==================== PRODUCT CATEGORY ACTIONS ====================

  const addProductCategory = (category: string) => {
    const trimmedCategory = category.trim();
    
    if (!trimmedCategory) {
      toast.error("Nome da categoria não pode ser vazio");
      return;
    }
    
    if (productCategories.includes(trimmedCategory)) {
      toast.error("Esta categoria já existe");
      return;
    }
    
    setProductCategories(prev => [...prev, trimmedCategory].sort());
    toast.success(`Categoria "${trimmedCategory}" adicionada com sucesso!`);
  };

  const deleteProductCategory = (category: string) => {
    // Verificar se algum produto usa esta categoria
    const productsUsingCategory = inventory.filter(item => item.category === category);
    
    if (productsUsingCategory.length > 0) {
      toast.error(`Não é possível excluir esta categoria. ${productsUsingCategory.length} produto(s) ainda a utilizam.`);
      return;
    }
    
    setProductCategories(prev => prev.filter(c => c !== category));
    toast.success(`Categoria "${category}" removida com sucesso!`);
  };

  // ==================== PRICE TABLE ACTIONS ====================

  const addPriceTable = (priceTableData: Omit<PriceTable, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newPriceTable: PriceTable = {
      ...priceTableData,
      id: `TAB-${String(priceTables.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0]
    };
    setPriceTables(prev => [...prev, newPriceTable]);
    toast.success("Tabela de preços criada com sucesso!");
  };

  const updatePriceTable = (id: string, updates: Partial<PriceTable>) => {
    setPriceTables(prev => prev.map(pt => 
      pt.id === id 
        ? { ...pt, ...updates, updatedAt: new Date().toISOString().split('T')[0] } 
        : pt
    ));
    toast.success("Tabela de preços atualizada com sucesso!");
  };

  const deletePriceTable = (id: string) => {
    const table = priceTables.find(pt => pt.id === id);
    if (table?.isDefault) {
      toast.error("Não é possível excluir a tabela padrão!");
      return;
    }
    
    // Remove vinculação de clientes
    setCustomers(prev => prev.map(c => 
      c.priceTableId === id ? { ...c, priceTableId: undefined } : c
    ));
    
    setPriceTables(prev => prev.filter(pt => pt.id !== id));
    toast.success("Tabela de preços excluída com sucesso!");
  };

  const getPriceTableById = (id: string) => {
    return priceTables.find(pt => pt.id === id);
  };

  const getDefaultPriceTable = () => {
    return priceTables.find(pt => pt.isDefault);
  };

  // ==================== COMPANY SETTINGS ACTIONS ====================

  const updateCompanySettings = async (updates: Partial<CompanySettings>, showToast: boolean = false) => {
    const oldSettings = companySettings;
    
    // Atualizar estado local imediatamente (otimistic update)
    setCompanySettings(prev => ({ ...prev, ...updates }));
    
    // Sincronizar com backend em background
    if (profile?.company_id) {
      try {
        const dbUpdates = mapSettingsToDatabase({ ...companySettings, ...updates });
        
        await authPatch(
          `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/company`,
          dbUpdates
        );
        
        console.log('✅ Configurações sincronizadas com o backend');
      } catch (error: any) {
        console.error('❌ Erro ao sincronizar configurações:', error);
        
        // Em caso de erro, reverter mudanças locais
        setCompanySettings(oldSettings);
        
        toast.error('Erro ao salvar configurações', {
          description: 'As alterações não foram salvas. Tente novamente.'
        });
        
        return; // Não continuar se falhou
      }
    }
    
    // Registrar histórico de mudanças
    const changes: CompanyHistoryEntry['changes'] = [];
    const fieldLabels: Record<string, string> = {
      cnpj: "CNPJ",
      companyName: "Razão Social",
      tradeName: "Nome Fantasia",
      sector: "Setor/Atividade",
      description: "Descrição",
      email: "E-mail",
      phone: "Telefone",
      website: "Website",
      street: "Rua",
      number: "Número",
      complement: "Complemento",
      neighborhood: "Bairro",
      city: "Cidade",
      state: "Estado",
      zipCode: "CEP",
      stateRegistration: "Inscrição Estadual",
      cityRegistration: "Inscrição Municipal",
      taxRegime: "Regime Tributário",
      defaultCSOSN: "CSOSN Padrão",
      defaultCST: "CST Padrão",
      defaultICMSRate: "Alíquota ICMS Padrão",
      cfopInState: "CFOP Venda Dentro do Estado",
      cfopOutState: "CFOP Venda Fora do Estado",
      cfopPurchase: "CFOP Compras",
      cfopReturn: "CFOP Devoluções",
      cfopService: "CFOP Serviços",
      pisCofinsRegime: "Regime PIS/COFINS",
      defaultPISRate: "Alíquota PIS Padrão",
      defaultCOFINSRate: "Alíquota COFINS Padrão",
      logo: "Logo da Empresa"
    };
    
    Object.keys(updates).forEach(key => {
      const typedKey = key as keyof CompanySettings;
      if (oldSettings[typedKey] !== updates[typedKey]) {
        changes.push({
          field: key,
          fieldLabel: fieldLabels[key] || key,
          oldValue: oldSettings[typedKey],
          newValue: updates[typedKey]
        });
      }
    });
    
    if (changes.length > 0 && showToast) {
      const user = getCurrentUser();
      const historyEntry: CompanyHistoryEntry = {
        id: `HIST-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: user.name,
        userId: user.id,
        changes,
        section: "Configurações da Empresa"
      };
      
      setCompanyHistory(prev => [historyEntry, ...prev]);
      toast.success("Configurações atualizadas com sucesso!");
    }
  };
  
  const getCompanyHistory = () => {
    return companyHistory;
  };

  // Bank Accounts
  const addBankAccount = (accountData: Omit<BankAccount, 'id'>) => {
    // Gerar ID baseado no maior ID existente + 1, não no length do array
    const maxId = (companySettings?.bankAccounts || []).reduce((max, account) => {
      const idNum = parseInt(account.id.replace('BANK-', ''));
      return Math.max(max, idNum);
    }, 0);
    
    const newAccount: BankAccount = {
      ...accountData,
      id: `BANK-${String(maxId + 1).padStart(3, '0')}`
    };
    
    const updatedSettings = {
      ...companySettings,
      bankAccounts: [...(companySettings?.bankAccounts || []), newAccount]
    };
    
    // Atualizar estado local e sincronizar com backend
    updateCompanySettings({ bankAccounts: updatedSettings.bankAccounts }, false);
    toast.success("Conta bancária adicionada!");
  };

  const updateBankAccount = (id: string, updates: Partial<BankAccount>) => {
    const updatedBankAccounts = (companySettings?.bankAccounts || []).map(acc => 
      acc.id === id ? { ...acc, ...updates } : acc
    );
    
    // Atualizar estado local e sincronizar com backend
    updateCompanySettings({ bankAccounts: updatedBankAccounts }, false);
    toast.success("Conta bancária atualizada!");
  };

  const deleteBankAccount = (id: string) => {
    const updatedBankAccounts = (companySettings?.bankAccounts || []).filter(acc => acc.id !== id);
    
    // Atualizar estado local e sincronizar com backend
    updateCompanySettings({ bankAccounts: updatedBankAccounts }, false);
    toast.success("Conta bancária removida!");
  };

  // Revenue Groups
  const addRevenueGroup = (groupData: Omit<RevenueGroup, 'id'>) => {
    // Encontrar o maior ID numérico existente
    const maxId = (companySettings?.revenueGroups || []).reduce((max, group) => {
      const numericId = parseInt(group.id.replace('RG-', ''));
      return numericId > max ? numericId : max;
    }, 0);
    
    const newGroup: RevenueGroup = {
      ...groupData,
      id: `RG-${String(maxId + 1).padStart(3, '0')}`
    };
    setCompanySettings(prev => ({
      ...prev,
      revenueGroups: [...(prev?.revenueGroups || []), newGroup]
    }));
    toast.success("Grupo de receita adicionado!");
  };

  const updateRevenueGroup = (id: string, updates: Partial<RevenueGroup>) => {
    setCompanySettings(prev => ({
      ...prev,
      revenueGroups: (prev?.revenueGroups || []).map(group => 
        group.id === id ? { ...group, ...updates } : group
      )
    }));
    toast.success("Grupo de receita atualizado!");
  };

  const deleteRevenueGroup = (id: string) => {
    setCompanySettings(prev => ({
      ...prev,
      revenueGroups: (prev?.revenueGroups || []).filter(group => group.id !== id)
    }));
    toast.success("Grupo de receita removido!");
  };

  // Expense Groups
  const addExpenseGroup = (groupData: Omit<ExpenseGroup, 'id'>) => {
    // Encontrar o maior ID numérico existente
    const maxId = (companySettings?.expenseGroups || []).reduce((max, group) => {
      const numericId = parseInt(group.id.replace('EG-', ''));
      return numericId > max ? numericId : max;
    }, 0);
    
    const newGroup: ExpenseGroup = {
      ...groupData,
      id: `EG-${String(maxId + 1).padStart(3, '0')}`
    };
    setCompanySettings(prev => ({
      ...prev,
      expenseGroups: [...(prev?.expenseGroups || []), newGroup]
    }));
    toast.success("Grupo de gasto adicionado!");
  };

  const updateExpenseGroup = (id: string, updates: Partial<ExpenseGroup>) => {
    setCompanySettings(prev => ({
      ...prev,
      expenseGroups: (prev?.expenseGroups || []).map(group => 
        group.id === id ? { ...group, ...updates } : group
      )
    }));
    toast.success("Grupo de gasto atualizado!");
  };

  const deleteExpenseGroup = (id: string) => {
    setCompanySettings(prev => ({
      ...prev,
      expenseGroups: (prev?.expenseGroups || []).filter(group => group.id !== id)
    }));
    toast.success("Grupo de gasto removido!");
  };

  // Cost Centers
  const addCostCenter = (centerData: Omit<CostCenter, 'id'>) => {
    // Encontrar o maior ID numérico existente
    const maxId = (companySettings?.costCenters || []).reduce((max, center) => {
      const numericId = parseInt(center.id.replace('CC-', ''));
      return numericId > max ? numericId : max;
    }, 0);
    
    const newCenter: CostCenter = {
      ...centerData,
      id: `CC-${String(maxId + 1).padStart(3, '0')}`
    };
    setCompanySettings(prev => ({
      ...prev,
      costCenters: [...(prev?.costCenters || []), newCenter]
    }));
    toast.success("Centro de custo adicionado!");
  };

  const updateCostCenter = (id: string, updates: Partial<CostCenter>) => {
    setCompanySettings(prev => ({
      ...prev,
      costCenters: (prev?.costCenters || []).map(center => 
        center.id === id ? { ...center, ...updates } : center
      )
    }));
    toast.success("Centro de custo atualizado!");
  };

  const deleteCostCenter = (id: string) => {
    setCompanySettings(prev => ({
      ...prev,
      costCenters: (prev?.costCenters || []).filter(center => center.id !== id)
    }));
    toast.success("Centro de custo removido!");
  };

  // ==================== SALESPERSON AND BUYER ACTIONS ====================
  
  const addSalesperson = (salespersonData: Omit<Salesperson, 'id'>) => {
    const maxId = (salespeople || []).reduce((max, person) => {
      const numericId = parseInt(person.id.replace('SP-', ''));
      return numericId > max ? numericId : max;
    }, 0);
    
    const newSalesperson: Salesperson = {
      ...salespersonData,
      id: `SP-${String(maxId + 1).padStart(3, '0')}`
    };
    setSalespeople(prev => [...(prev || []), newSalesperson]);
    toast.success("Vendedor adicionado com sucesso!");
  };

  const updateSalesperson = (id: string, updates: Partial<Salesperson>) => {
    setSalespeople(prev => (prev || []).map(person => 
      person.id === id ? { ...person, ...updates } : person
    ));
    toast.success("Vendedor atualizado!");
  };

  const deleteSalesperson = (id: string) => {
    setSalespeople(prev => (prev || []).filter(person => person.id !== id));
    toast.success("Vendedor removido!");
  };

  const addBuyer = (buyerData: Omit<Buyer, 'id'>) => {
    const maxId = (buyers || []).reduce((max, person) => {
      const numericId = parseInt(person.id.replace('BY-', ''));
      return numericId > max ? numericId : max;
    }, 0);
    
    const newBuyer: Buyer = {
      ...buyerData,
      id: `BY-${String(maxId + 1).padStart(3, '0')}`
    };
    setBuyers(prev => [...(prev || []), newBuyer]);
    toast.success("Comprador adicionado com sucesso!");
  };

  const updateBuyer = (id: string, updates: Partial<Buyer>) => {
    setBuyers(prev => (prev || []).map(person => 
      person.id === id ? { ...person, ...updates } : person
    ));
    toast.success("Comprador atualizado!");
  };

  const deleteBuyer = (id: string) => {
    setBuyers(prev => (prev || []).filter(person => person.id !== id));
    toast.success("Comprador removido!");
  };

  // ==================== FINANCIAL ACTIONS ====================
  
  // Payment Methods
  const addPaymentMethod = (methodData: Omit<PaymentMethod, 'id'>) => {
    // Encontrar o maior ID numérico existente
    const maxId = (paymentMethods || []).reduce((max, method) => {
      const numericId = parseInt(method.id.replace('PM-', ''));
      return numericId > max ? numericId : max;
    }, 0);
    
    const newMethod: PaymentMethod = {
      ...methodData,
      id: `PM-${String(maxId + 1).padStart(3, '0')}`
    };
    setPaymentMethods(prev => [...(prev || []), newMethod]);
    toast.success("Forma de pagamento adicionada!");
  };

  const updatePaymentMethod = (id: string, updates: Partial<PaymentMethod>) => {
    setPaymentMethods(prev => (prev || []).map(method => 
      method.id === id ? { ...method, ...updates } : method
    ));
    toast.success("Forma de pagamento atualizada!");
  };

  const deletePaymentMethod = (id: string) => {
    setPaymentMethods(prev => (prev || []).filter(method => method.id !== id));
    toast.success("Forma de pagamento removida!");
  };

  // Account Categories
  const addAccountCategory = (categoryData: Omit<AccountCategory, 'id'>) => {
    // Encontrar o maior ID numérico existente
    const maxId = (accountCategories || []).reduce((max, category) => {
      const numericId = parseInt(category.id.replace('AC-', ''));
      return numericId > max ? numericId : max;
    }, 0);
    
    const newCategory: AccountCategory = {
      ...categoryData,
      id: `AC-${String(maxId + 1).padStart(3, '0')}`
    };
    setAccountCategories(prev => [...(prev || []), newCategory]);
    toast.success("Categoria de conta adicionada!");
  };

  const updateAccountCategory = (id: string, updates: Partial<AccountCategory>) => {
    setAccountCategories(prev => (prev || []).map(category => 
      category.id === id ? { ...category, ...updates } : category
    ));
    toast.success("Categoria de conta atualizada!");
  };

  const deleteAccountCategory = (id: string) => {
    setAccountCategories(prev => (prev || []).filter(category => category.id !== id));
    toast.success("Categoria de conta removida!");
  };

  // Financial Transactions
  const addFinancialTransaction = (transactionData: Omit<FinancialTransaction, 'id'>) => {
    const newId = generateNextFinancialTransactionId();
    
    // Validação de segurança: garantir que o ID não existe
    const isDuplicate = financialTransactions.some(t => t.id === newId);
    if (isDuplicate) {
      console.error(`🚨 ERRO CRÍTICO: Tentativa de adicionar transação com ID duplicado: ${newId}`);
      toast.error('Erro ao criar transação', {
        description: 'ID duplicado detectado. Por favor, tente novamente.'
      });
      return;
    }
    
    const newTransaction: FinancialTransaction = {
      ...transactionData,
      id: newId
    };
    setFinancialTransactions(prev => [...prev, newTransaction]);
    
    // Atualizar saldo bancário se pago/recebido
    if (transactionData.paymentDate) {
      updateBankAccount(transactionData.bankAccountId, {
        balance: companySettings.bankAccounts.find(b => b.id === transactionData.bankAccountId)!.balance + 
          (transactionData.type === "Receita" ? transactionData.amount : -transactionData.amount)
      });
    }
    
    toast.success("Transação financeira registrada!");
  };

  const updateFinancialTransaction = (id: string, updates: Partial<FinancialTransaction>) => {
    setFinancialTransactions(prev => prev.map(transaction => 
      transaction.id === id ? { ...transaction, ...updates } : transaction
    ));
    toast.success("Transação financeira atualizada!");
  };

  const deleteFinancialTransaction = (id: string) => {
    // Verificar se está vinculada a algum pedido
    const linkedOrder = salesOrders.find(
      o => o.actionFlags?.financialTransactionId === id
    );
    
    if (linkedOrder) {
      toast.error(
        `Não é possível excluir esta transação!`,
        { 
          description: `Ela está vinculada ao pedido ${linkedOrder.id}. Cancele o pedido primeiro para excluir a transação.` 
        }
      );
      console.warn(`⚠️ Tentativa de excluir transação ${id} vinculada ao pedido ${linkedOrder.id}`);
      return;
    }
    
    setFinancialTransactions(prev => prev.filter(transaction => transaction.id !== id));
    toast.success("Transação financeira removida!");
    console.log(`🗑️ Transação ${id} excluída com sucesso`);
  };

  // Marcar transação como recebida
  const markTransactionAsReceived = (id: string, effectiveDate: string, bankAccountId?: string, bankAccountName?: string, paymentMethodId?: string, paymentMethodName?: string) => {
    const transaction = (financialTransactions || []).find(t => t.id === id);
    if (!transaction) {
      toast.error("Transação não encontrada!");
      return;
    }

    if (transaction.type !== "Receita") {
      toast.error("Apenas transações de receita podem ser marcadas como recebidas!");
      return;
    }

    if (transaction.status === "Recebido") {
      toast.info("Esta transação já está marcada como recebida!");
      return;
    }

    const user = getCurrentUser();

    // Preparar updates
    const updates: Partial<FinancialTransaction> = {
      status: "Recebido",
      effectiveDate,
      paymentDate: effectiveDate,
      markedBy: user.name,
      markedAt: new Date().toISOString()
    };

    // Adicionar informações bancárias se fornecidas
    if (bankAccountId) updates.bankAccountId = bankAccountId;
    if (bankAccountName) updates.bankAccountName = bankAccountName;
    if (paymentMethodId) updates.paymentMethodId = paymentMethodId;
    if (paymentMethodName) updates.paymentMethodName = paymentMethodName;

    // Atualizar transação
    updateFinancialTransaction(id, updates);

    // Atualizar saldo bancário
    const bank = companySettings.bankAccounts.find(b => b.id === transaction.bankAccountId);
    if (bank) {
      updateBankAccount(transaction.bankAccountId, { 
        balance: bank.balance + transaction.amount 
      });
    }

    // Se a transação está vinculada a um pedido, recalcular status do pedido
    // CORREÇÃO: Calcular manualmente considerando a transação atual como "Recebido"
    if (transaction.reference && transaction.origin === "Pedido") {
      const orderId = transaction.reference;
      const order = salesOrders.find(o => o.id === orderId);
      
      if (order) {
        // Buscar todas as transações do pedido
        const orderTransactions = financialTransactions.filter(
          t => t.reference === orderId && t.origin === "Pedido" && t.status !== "Cancelado"
        );

        // Contar quantas estão recebidas (incluindo a atual que acabamos de marcar)
        const receivedCount = orderTransactions.filter(t => 
          t.status === "Recebido" || t.id === id
        ).length;
        const totalCount = orderTransactions.length;

        let newStatus: SalesOrder['status'];
        
        if (receivedCount === totalCount) {
          // Todas as parcelas recebidas - Concluído
          newStatus = "Concluído";
        } else if (receivedCount > 0) {
          // Algumas parcelas recebidas - Parcialmente Concluído
          newStatus = "Parcialmente Concluído";
        } else {
          // Nenhuma parcela recebida - mantém Entregue
          newStatus = "Entregue";
        }

        // Só atualizar se o status mudou
        if (order.status !== newStatus && order.status !== "Cancelado") {
          const historyEntry: StatusHistoryEntry = {
            id: `HIST-${Date.now()}`,
            timestamp: new Date().toISOString(),
            user: user.name,
            previousStatus: order.status,
            newStatus,
            actionsExecuted: [`✅ Status recalculado automaticamente: ${receivedCount}/${totalCount} parcelas recebidas`],
            generatedIds: []
          };

          setSalesOrders(prev => prev.map(o => 
            o.id === orderId ? {
              ...o,
              status: newStatus,
              statusHistory: [...(o.statusHistory || []), historyEntry]
            } : o
          ));

          console.log(`📊 Status do pedido ${orderId} recalculado: ${order.status} → ${newStatus} (${receivedCount}/${totalCount} parcelas)`)
          
          // Registrar auditoria da mudança de status
          auditLog({
            module: AUDIT_MODULES.SALES_ORDER,
            action: AUDIT_ACTIONS.STATUS_CHANGE,
            details: {
              orderId,
              previousStatus: order.status,
              newStatus,
              reason: `Recálculo automático - ${receivedCount}/${totalCount} parcelas recebidas`,
              receivedCount,
              totalCount
            },
            entityType: 'Pedido de Venda',
            entityId: orderId
          });
        }
      }
    }

    // Registrar auditoria
    auditLog({
      module: AUDIT_MODULES.FINANCIAL,
      action: AUDIT_ACTIONS.TRANSACTION_UPDATED,
      details: {
        transactionId: id,
        status: "Recebido",
        effectiveDate,
        amount: transaction.amount,
        markedBy: user.name
      },
      entityType: 'Transação Financeira',
      entityId: id
    });

    toast.success(`Transação marcada como recebida!`, {
      description: `R$ ${transaction.amount.toFixed(2)} recebido em ${new Date(effectiveDate).toLocaleDateString('pt-BR')}`
    });
  };

  // Marcar transação como paga
  const markTransactionAsPaid = (id: string, effectiveDate: string, bankAccountId?: string, bankAccountName?: string, paymentMethodId?: string, paymentMethodName?: string) => {
    const transaction = (financialTransactions || []).find(t => t.id === id);
    if (!transaction) {
      toast.error("Transação não encontrada!");
      return;
    }

    if (transaction.type !== "Despesa") {
      toast.error("Apenas transações de despesa podem ser marcadas como pagas!");
      return;
    }

    if (transaction.status === "Pago") {
      toast.info("Esta transação já está marcada como paga!");
      return;
    }

    const user = getCurrentUser();

    // Preparar updates
    const updates: Partial<FinancialTransaction> = {
      status: "Pago",
      effectiveDate,
      paymentDate: effectiveDate,
      markedBy: user.name,
      markedAt: new Date().toISOString()
    };

    // Adicionar informações bancárias se fornecidas
    if (bankAccountId) updates.bankAccountId = bankAccountId;
    if (bankAccountName) updates.bankAccountName = bankAccountName;
    if (paymentMethodId) updates.paymentMethodId = paymentMethodId;
    if (paymentMethodName) updates.paymentMethodName = paymentMethodName;

    // Atualizar transação
    updateFinancialTransaction(id, updates);

    // Atualizar saldo bancário
    const bank = companySettings.bankAccounts.find(b => b.id === transaction.bankAccountId);
    if (bank) {
      updateBankAccount(transaction.bankAccountId, { 
        balance: bank.balance - transaction.amount 
      });
    }

    // Se a transação está vinculada a um pedido de compra, recalcular status
    if (transaction.reference && transaction.origin === "Pedido") {
      const orderId = transaction.reference;
      
      // Verificar se é pedido de compra (começa com PC-)
      if (orderId.startsWith('PC-')) {
        const purchaseOrder = purchaseOrders.find(o => o.id === orderId);
        
        if (purchaseOrder) {
          // Buscar todas as transações do pedido
          const orderTransactions = financialTransactions.filter(
            t => t.reference === orderId && t.origin === "Pedido" && t.status !== "Cancelado"
          );

          // Contar quantas estão pagas (incluindo a atual que acabamos de marcar)
          const paidCount = orderTransactions.filter(t => 
            t.status === "Pago" || t.id === id
          ).length;
          const totalCount = orderTransactions.length;

          let newStatus: PurchaseOrder['status'];
          
          if (paidCount === totalCount) {
            // Todas as parcelas pagas - Concluído
            newStatus = "Concluído";
          } else if (paidCount > 0) {
            // Algumas parcelas pagas - Parcialmente Concluído
            newStatus = "Parcialmente Concluído";
          } else {
            // Nenhuma parcela paga - mantém Recebido
            newStatus = "Recebido";
          }

          // Só atualizar se o status mudou
          if (purchaseOrder.status !== newStatus && purchaseOrder.status !== "Cancelado") {
            const historyEntry: StatusHistoryEntry = {
              id: `HIST-${Date.now()}`,
              timestamp: new Date().toISOString(),
              user: user.name,
              previousStatus: purchaseOrder.status,
              newStatus,
              actionsExecuted: [`✅ Status recalculado automaticamente: ${paidCount}/${totalCount} parcelas pagas`],
              generatedIds: []
            };

            setPurchaseOrders(prev => prev.map(o => 
              o.id === orderId ? {
                ...o,
                status: newStatus,
                statusHistory: [...(o.statusHistory || []), historyEntry]
              } : o
            ));

            console.log(`📊 Status do pedido de compra ${orderId} recalculado: ${purchaseOrder.status} → ${newStatus} (${paidCount}/${totalCount} parcelas)`);
            
            // Registrar auditoria da mudança de status
            auditLog({
              module: AUDIT_MODULES.SALES_ORDER, // Usar mesmo módulo ou criar PURCHASE_ORDER
              action: AUDIT_ACTIONS.STATUS_CHANGE,
              details: {
                orderId,
                previousStatus: purchaseOrder.status,
                newStatus,
                reason: `Recálculo automático - ${paidCount}/${totalCount} parcelas pagas`,
                paidCount,
                totalCount
              },
              entityType: 'Pedido de Compra',
              entityId: orderId
            });
          }
        }
      } else {
        // Pedido de venda
        const order = salesOrders.find(o => o.id === orderId);
        
        if (order) {
          // Buscar todas as transações do pedido
          const orderTransactions = financialTransactions.filter(
            t => t.reference === orderId && t.origin === "Pedido" && t.status !== "Cancelado"
          );

          // Contar quantas estão pagas (incluindo a atual que acabamos de marcar)
          const paidCount = orderTransactions.filter(t => 
            t.status === "Pago" || t.id === id
          ).length;
          const totalCount = orderTransactions.length;

          let newStatus: SalesOrder['status'];
          
          if (paidCount === totalCount) {
            // Todas as parcelas pagas - Concluído
            newStatus = "Concluído";
          } else if (paidCount > 0) {
            // Algumas parcelas pagas - Parcialmente Concluído
            newStatus = "Parcialmente Concluído";
          } else {
            // Nenhuma parcela paga - mantém Entregue
            newStatus = "Entregue";
          }

          // Só atualizar se o status mudou
          if (order.status !== newStatus && order.status !== "Cancelado") {
            const historyEntry: StatusHistoryEntry = {
              id: `HIST-${Date.now()}`,
              timestamp: new Date().toISOString(),
              user: user.name,
              previousStatus: order.status,
              newStatus,
              actionsExecuted: [`✅ Status recalculado automaticamente: ${paidCount}/${totalCount} parcelas pagas`],
              generatedIds: []
            };

            setSalesOrders(prev => prev.map(o => 
              o.id === orderId ? {
                ...o,
                status: newStatus,
                statusHistory: [...(o.statusHistory || []), historyEntry]
              } : o
            ));

            console.log(`📊 Status do pedido ${orderId} recalculado: ${order.status} → ${newStatus} (${paidCount}/${totalCount} parcelas)`)
            
            // Registrar auditoria da mudança de status
            auditLog({
              module: AUDIT_MODULES.SALES_ORDER,
              action: AUDIT_ACTIONS.STATUS_CHANGE,
              details: {
                orderId,
                previousStatus: order.status,
                newStatus,
                reason: `Recálculo automático - ${paidCount}/${totalCount} parcelas pagas`,
                paidCount,
                totalCount
              },
              entityType: 'Pedido de Venda',
              entityId: orderId
            });
          }
        }
      }
    }

    // Registrar auditoria
    auditLog({
      module: AUDIT_MODULES.FINANCIAL,
      action: AUDIT_ACTIONS.TRANSACTION_UPDATED,
      details: {
        transactionId: id,
        status: "Pago",
        effectiveDate,
        amount: transaction.amount,
        markedBy: user.name
      },
      entityType: 'Transação Financeira',
      entityId: id
    });

    toast.success(`Transação marcada como paga!`, {
      description: `R$ ${transaction.amount.toFixed(2)} pago em ${new Date(effectiveDate).toLocaleDateString('pt-BR')}`
    });
  };

  // Recalcular status do pedido baseado nas transações
  const recalculateOrderStatus = (orderId: string) => {
    const order = salesOrders.find(o => o.id === orderId);
    if (!order) return;

    // Buscar todas as transações do pedido
    const orderTransactions = financialTransactions.filter(
      t => t.reference === orderId && t.origin === "Pedido" && t.status !== "Cancelado"
    );

    if (orderTransactions.length === 0) return;

    // Contar quantas estão recebidas
    const receivedCount = orderTransactions.filter(t => t.status === "Recebido").length;
    const totalCount = orderTransactions.length;

    let newStatus: SalesOrder['status'];
    
    if (receivedCount === 0) {
      // Nenhuma parcela recebida - mantém Entregue
      newStatus = "Entregue";
    } else if (receivedCount === totalCount) {
      // Todas as parcelas recebidas - Concluído
      newStatus = "Concluído";
    } else {
      // Algumas parcelas recebidas - Parcialmente Concluído
      newStatus = "Parcialmente Concluído";
    }

    // Só atualizar se o status mudou
    if (order.status !== newStatus && order.status !== "Cancelado") {
      const user = getCurrentUser();
      const historyEntry: StatusHistoryEntry = {
        id: `HIST-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: user.name,
        previousStatus: order.status,
        newStatus,
        actionsExecuted: [`✅ Status recalculado automaticamente: ${receivedCount}/${totalCount} parcelas recebidas`],
        generatedIds: []
      };

      setSalesOrders(prev => prev.map(o => 
        o.id === orderId ? {
          ...o,
          status: newStatus,
          statusHistory: [...(o.statusHistory || []), historyEntry]
        } : o
      ));

      console.log(`📊 Status do pedido ${orderId} recalculado: ${order.status} → ${newStatus} (${receivedCount}/${totalCount} parcelas)`);
    }
  };

  // Accounts Receivable
  const addAccountReceivable = (accountData: Omit<AccountReceivable, 'id'>) => {
    const newAccount: AccountReceivable = {
      ...accountData,
      id: `AR-${String(accountsReceivable.length + 1).padStart(4, '0')}`
    };
    setAccountsReceivable(prev => [...prev, newAccount]);
    toast.success("Conta a receber registrada!");
  };

  const updateAccountReceivable = (id: string, updates: Partial<AccountReceivable>) => {
    setAccountsReceivable(prev => prev.map(account => 
      account.id === id ? { ...account, ...updates } : account
    ));
    toast.success("Conta a receber atualizada!");
  };

  const markAsReceived = (id: string, paymentDate: string, amount: number, bankAccountId: string) => {
    const account = accountsReceivable.find(a => a.id === id);
    if (!account) return;

    const newPaidAmount = account.paidAmount + amount;
    const newRemainingAmount = account.amount - newPaidAmount;
    const newStatus = newRemainingAmount === 0 ? "Recebido" : "Parcial";

    updateAccountReceivable(id, {
      paymentDate,
      paidAmount: newPaidAmount,
      remainingAmount: newRemainingAmount,
      status: newStatus,
      bankAccountId
    });

    // Atualizar saldo bancário
    const bank = companySettings.bankAccounts.find(b => b.id === bankAccountId);
    if (bank) {
      updateBankAccount(bankAccountId, { balance: bank.balance + amount });
    }

    toast.success(`Recebimento de R$ ${amount.toFixed(2)} registrado!`);
  };

  // Accounts Payable
  const addAccountPayable = (accountData: Omit<AccountPayable, 'id'>) => {
    const newAccount: AccountPayable = {
      ...accountData,
      id: `AP-${String(accountsPayable.length + 1).padStart(4, '0')}`
    };
    setAccountsPayable(prev => [...prev, newAccount]);
    toast.success("Conta a pagar registrada!");
  };

  const updateAccountPayable = (id: string, updates: Partial<AccountPayable>) => {
    setAccountsPayable(prev => prev.map(account => 
      account.id === id ? { ...account, ...updates } : account
    ));
    toast.success("Conta a pagar atualizada!");
  };

  const markAsPaid = (id: string, paymentDate: string, amount: number, bankAccountId: string) => {
    const account = accountsPayable.find(a => a.id === id);
    if (!account) return;

    const newPaidAmount = account.paidAmount + amount;
    const newRemainingAmount = account.amount - newPaidAmount;
    const newStatus = newRemainingAmount === 0 ? "Pago" : "Parcial";

    updateAccountPayable(id, {
      paymentDate,
      paidAmount: newPaidAmount,
      remainingAmount: newRemainingAmount,
      status: newStatus,
      bankAccountId
    });

    // Atualizar saldo bancário
    const bank = companySettings.bankAccounts.find(b => b.id === bankAccountId);
    if (bank) {
      updateBankAccount(bankAccountId, { balance: bank.balance - amount });
    }

    toast.success(`Pagamento de R$ ${amount.toFixed(2)} registrado!`);
  };

  // Bank Movements
  const addBankMovement = (movementData: Omit<BankMovement, 'id'>) => {
    const newMovement: BankMovement = {
      ...movementData,
      id: `BM-${String(bankMovements.length + 1).padStart(4, '0')}`
    };
    setBankMovements(prev => [...prev, newMovement]);
  };

  const reconcileBankMovement = (movementId: string, transactionId: string) => {
    setBankMovements(prev => prev.map(movement => 
      movement.id === movementId 
        ? { ...movement, reconciled: true, reconciledWithId: transactionId }
        : movement
    ));
    toast.success("Movimento bancário conciliado!");
  };

  const importBankStatement = (
    bankAccountId: string, 
    movements: Omit<BankMovement, 'id' | 'bankAccountId' | 'reconciled' | 'imported'>[]
  ) => {
    const newMovements: BankMovement[] = movements.map((mov, index) => ({
      ...mov,
      id: `BM-${String(bankMovements.length + index + 1).padStart(4, '0')}`,
      bankAccountId,
      reconciled: false,
      imported: true
    }));
    
    setBankMovements(prev => [...prev, ...newMovements]);
    toast.success(`${newMovements.length} movimentos importados com sucesso!`);
  };

  // Cash Flow
  const addCashFlowEntry = (entryData: Omit<CashFlowEntry, 'id'>) => {
    const newEntry: CashFlowEntry = {
      ...entryData,
      id: `CF-${String(cashFlowEntries.length + 1).padStart(4, '0')}`
    };
    setCashFlowEntries(prev => [...prev, newEntry]);
    toast.success("Entrada de fluxo de caixa adicionada!");
  };

  const updateCashFlowEntry = (id: string, updates: Partial<CashFlowEntry>) => {
    setCashFlowEntries(prev => prev.map(entry => 
      entry.id === id ? { ...entry, ...updates } : entry
    ));
    toast.success("Entrada de fluxo de caixa atualizada!");
  };

  const deleteCashFlowEntry = (id: string) => {
    setCashFlowEntries(prev => prev.filter(entry => entry.id !== id));
    toast.success("Entrada de fluxo de caixa removida!");
  };

  // ==================== PURCHASE ORDER ACTIONS ====================

  const addPurchaseOrder = (orderData: Omit<PurchaseOrder, 'id' | 'orderDate'>, isExceptional: boolean = false) => {
    const newOrder: PurchaseOrder = {
      ...orderData,
      id: `PC-${String(purchaseOrders.length + 1).padStart(3, '0')}`,
      orderDate: new Date().toISOString().split('T')[0],
      statusHistory: [],
      actionFlags: {},
      isExceptionalOrder: isExceptional
    };

    setPurchaseOrders(prev => [...prev, newOrder]);

    // Se for modo excepcional e status for avançado, executar ações
    if (isExceptional && (newOrder.status === 'Recebido' || newOrder.status === 'Concluído')) {
      // Executar em setTimeout para garantir que o estado foi atualizado
      setTimeout(() => {
        updatePurchaseOrderStatus(newOrder.id, newOrder.status, 'Sistema', true);
      }, 100);
    }

    toast.success(`Pedido de compra ${newOrder.id} criado com sucesso!`);
    
    // Log de auditoria
    console.log(`✅ Pedido de compra criado: ${newOrder.id} - Status: ${newOrder.status}${isExceptional ? ' (Modo Excepcional)' : ''}`);
  };

  const updatePurchaseOrder = (id: string, orderData: Omit<PurchaseOrder, 'id' | 'orderDate'>) => {
    const previousOrder = purchaseOrders.find(o => o.id === id);
    if (!previousOrder) {
      toast.error('Pedido de compra não encontrado!');
      return;
    }

    // Atualizar o pedido
    setPurchaseOrders(prev => prev.map(o =>
      o.id === id ? { ...o, ...orderData } : o
    ));

    // Ajustar estoque se quantidade/produtos foram alterados e estoque já foi adicionado
    if (previousOrder && previousOrder.actionFlags?.stockReduced) {
      const quantityChanged = orderData.quantity !== undefined && orderData.quantity !== previousOrder.quantity;
      const productChanged = orderData.productName !== undefined && orderData.productName !== previousOrder.productName;
      const itemsChanged = orderData.items !== undefined;
      
      if (quantityChanged || productChanged || itemsChanged) {
        console.log(`🔄 Ajustando estoque do pedido de compra ${id} devido a alterações...`);
        
        // Se for pedido multi-item
        if (orderData.items && orderData.items.length > 0) {
          // Reverter entradas anteriores se houver items anteriores
          if (previousOrder.items && previousOrder.items.length > 0) {
            previousOrder.items.forEach(item => {
              updateInventory(item.productName, -item.quantity, `${id}-REVERTER-EDIT`);
              console.log(`  ↩️ Revertido: -${item.quantity} ${item.productName}`);
            });
          } else {
            // Reverter entrada single-item anterior
            updateInventory(previousOrder.productName, -previousOrder.quantity, `${id}-REVERTER-EDIT`);
            console.log(`  ↩️ Revertido: -${previousOrder.quantity} ${previousOrder.productName}`);
          }
          
          // Aplicar novas entradas
          orderData.items.forEach(item => {
            updateInventory(item.productName, item.quantity, `${id}-ENTRADA-EDIT`);
            console.log(`  ✅ Nova entrada: +${item.quantity} ${item.productName}`);
          });
        } else {
          // Pedido single-item
          // Reverter entrada anterior
          if (previousOrder.items && previousOrder.items.length > 0) {
            previousOrder.items.forEach(item => {
              updateInventory(item.productName, -item.quantity, `${id}-REVERTER-EDIT`);
              console.log(`  ↩️ Revertido: -${item.quantity} ${item.productName}`);
            });
          } else {
            updateInventory(previousOrder.productName, -previousOrder.quantity, `${id}-REVERTER-EDIT`);
            console.log(`  ↩️ Revertido: -${previousOrder.quantity} ${previousOrder.productName}`);
          }
          
          // Aplicar nova entrada
          const newProductName = orderData.productName || previousOrder.productName;
          const newQuantity = orderData.quantity || previousOrder.quantity;
          updateInventory(newProductName, newQuantity, `${id}-ENTRADA-EDIT`);
          console.log(`  ✅ Nova entrada: +${newQuantity} ${newProductName}`);
        }
        
        toast.info("Estoque ajustado conforme alterações no pedido de compra");
      }
    }

    // Atualizar transações financeiras vinculadas se dados financeiros foram alterados
    const financialFieldsChanged = 
      orderData.paymentCondition !== undefined ||
      orderData.firstInstallmentDays !== undefined ||
      orderData.dueDateReference !== undefined ||
      orderData.issueDate !== undefined ||
      orderData.billingDate !== undefined ||
      orderData.deliveryDate !== undefined;
    
    if (financialFieldsChanged && previousOrder) {
      // Encontrar transações vinculadas ao pedido (apenas em aberto)
      const linkedTransactions = financialTransactions.filter(t => 
        t.reference === id && 
        t.origin === "Pedido" &&
        (t.status === "A Pagar" || t.status === "A Vencer" || t.status === "Vencido")
      );
      
      if (linkedTransactions.length > 0) {
        console.log(`🔄 Atualizando ${linkedTransactions.length} transação(ões) vinculada(s) ao pedido ${id}`);
        
        // Criar pedido atualizado para calcular novas datas
        const updatedOrder = { ...previousOrder, ...orderData };
        const numberOfInstallments = parseInt(updatedOrder.paymentCondition || "1");
        
        // Determinar data base para cálculo
        let baseDate: string;
        if (updatedOrder.dueDateReference === "billing" && updatedOrder.billingDate) {
          baseDate = updatedOrder.billingDate;
        } else if (updatedOrder.dueDateReference === "delivery" && updatedOrder.deliveryDate) {
          baseDate = updatedOrder.deliveryDate;
        } else {
          baseDate = updatedOrder.issueDate || updatedOrder.orderDate;
        }
        
        // Data da transação (issueDate do pedido)
        const transactionDate = updatedOrder.issueDate || updatedOrder.orderDate;
        
        // Atualizar cada transação com nova data de vencimento e data da transação
        setFinancialTransactions(prev => prev.map(t => {
          const linkedTx = linkedTransactions.find(lt => lt.id === t.id);
          if (!linkedTx) return t;
          
          // Calcular nova data de vencimento baseada no número da parcela
          const installmentNumber = t.installmentNumber || 1;
          const firstInstallmentDays = updatedOrder.firstInstallmentDays || 0;
          const daysToAdd = firstInstallmentDays + ((installmentNumber - 1) * 30);
          const newDueDate = addDaysToDate(baseDate, daysToAdd);
          
          console.log(`  📅 Transação ${t.id} (${installmentNumber}/${numberOfInstallments}): date=${t.date}→${transactionDate}, dueDate=${t.dueDate}→${newDueDate}`);
          
          return {
            ...t,
            date: transactionDate,
            dueDate: newDueDate
          };
        }));
        
        toast.success(`Pedido ${id} atualizado com sucesso!`, {
          description: `${linkedTransactions.length} transação(ões) financeira(s) também atualizada(s)`
        });
      } else {
        toast.success(`Pedido ${id} atualizado com sucesso!`);
      }
    } else {
      toast.success(`Pedido ${id} atualizado com sucesso!`);
    }
  };

  // Executar entrada de estoque quando pedido é recebido
  const executeStockAddition = (order: PurchaseOrder): { success: boolean; message: string; movementId?: string } => {
    // Verificar se já foi executado
    if (order.actionFlags?.stockReduced) {
      return { success: false, message: 'Entrada de estoque já foi registrada anteriormente' };
    }

    // NOVA LÓGICA: Processar pedidos multi-item se tiver array de items
    if (order.items && order.items.length > 0) {
      console.log(`📦 Processando entrada de estoque para pedido multi-item ${order.id} com ${order.items.length} itens`);
      
      const processedItems: string[] = [];
      let allSuccess = true;
      let failureReason = '';

      // Processar cada item individualmente
      for (const item of order.items) {
        const product = inventory.find(p => p.productName === item.productName);
        
        if (!product) {
          console.error(`❌ Produto não encontrado: ${item.productName}`);
          failureReason = `Produto "${item.productName}" não encontrado no estoque`;
          allSuccess = false;
          break;
        }

        // Adicionar item ao estoque
        console.log(`🔄 Adicionando estoque: ${item.quantity} unidades de ${item.productName}`);
        updateInventory(item.productName, item.quantity, order.id);
        processedItems.push(`${item.quantity}x ${item.productName}`);
      }

      if (allSuccess) {
        const movementId = `MOV-${Date.now()}`;
        console.log(`✅ Entrada multi-item executada com sucesso! Movimento: ${movementId}`);
        return {
          success: true,
          message: `✅ Entrada de ${order.items.length} item(ns): ${processedItems.join(', ')}`,
          movementId
        };
      } else {
        console.error(`❌ Falha ao processar entrada multi-item: ${failureReason}`);
        return { success: false, message: failureReason };
      }
    }

    // LEGADO: Verificar formato antigo de pedidos multi-item (sem array items)
    const isOldMultiItemFormat = order.productName.includes('e mais') && order.productName.includes('item(ns)');
    if (isOldMultiItemFormat) {
      console.log(`⚠️ Pedido multi-item ${order.id} em formato antigo - sem array de itens`);
      return { success: true, message: '⚠️ Pedido multi-item sem detalhamento de itens (gerenciar manualmente)' };
    }

    // PEDIDO SINGLE-ITEM: Processar normalmente
    const product = inventory.find(item => item.productName === order.productName);
    if (!product) {
      return { success: false, message: `Produto "${order.productName}" não encontrado no estoque` };
    }

    updateInventory(order.productName, order.quantity, order.id);

    // Retornar ID do movimento (será criado pelo updateInventory)
    const movementId = `MOV-${Date.now()}`;
    
    return {
      success: true,
      message: `Estoque atualizado: +${order.quantity} ${product.unit} de ${order.productName}`,
      movementId
    };
  };

  // Calcular data de vencimento para pedido de compra
  const calculateDueDatePurchase = (order: PurchaseOrder): string => {
    // Determinar data base conforme referência escolhida
    let baseDate: Date;
    if (order.dueDateReference === "billing" && order.billingDate) {
      const [year, month, day] = order.billingDate.split('-').map(Number);
      baseDate = new Date(year, month - 1, day);
    } else if (order.dueDateReference === "delivery" && order.deliveryDate) {
      const [year, month, day] = order.deliveryDate.split('-').map(Number);
      baseDate = new Date(year, month - 1, day);
    } else if (order.issueDate) {
      const [year, month, day] = order.issueDate.split('-').map(Number);
      baseDate = new Date(year, month - 1, day);
    } else {
      // Fallback para orderDate se issueDate não estiver disponível
      const [year, month, day] = order.orderDate.split('-').map(Number);
      baseDate = new Date(year, month - 1, day);
    }

    // Adicionar prazo da primeira parcela
    const firstInstallmentDays = order.firstInstallmentDays || 0;
    
    // Formatar a data no formato YYYY-MM-DD
    const year = baseDate.getFullYear();
    const month = String(baseDate.getMonth() + 1).padStart(2, '0');
    const day = String(baseDate.getDate()).padStart(2, '0');
    const baseDateStr = `${year}-${month}-${day}`;
    
    // Usar addDaysToDate para adicionar dias sem problemas de timezone
    return addDaysToDate(baseDateStr, firstInstallmentDays);
  };

  // Criar contas a pagar quando pedido é recebido (idempotente com proteção atômica)
  const executeAccountsPayableCreation = (order: PurchaseOrder): { success: boolean; message: string; transactionId?: string; transaction?: FinancialTransaction } => {
    // VALIDAÇÃO: Verificar se já foi criada
    if (order.actionFlags?.accountsReceivableCreated) {
      console.warn(`⚠️ Transações financeiras já foram criadas para pedido ${order.id}`);
      return { success: false, message: 'Transações financeiras já foram criadas anteriormente' };
    }

    // VERIFICAR SE JÁ EXISTE TRANSAÇÃO COM MESMA REFERÊNCIA
    const existingTransaction = (financialTransactions || []).find(
      t => t.reference === order.id && t.status !== "Cancelado"
    );
    if (existingTransaction) {
      console.warn(`⚠️ Transação já existe para pedido ${order.id}: ${existingTransaction.id}`);
      return { 
        success: true, 
        transactionId: existingTransaction.id,
        transaction: existingTransaction, // RETORNA A TRANSAÇÃO EXISTENTE
        message: `Conta a pagar já existe: ${existingTransaction.id}` 
      };
    }

    // ADQUIRIR LOCK
    const lockResult = acquireLock(order.id, 'accounts_creation');
    if (!lockResult.acquired) {
      console.error(`❌ ${lockResult.message}`);
      return { success: false, message: lockResult.message };
    }

    try {
      console.log(`🔄 Criando conta a pagar para pedido ${order.id}...`);

      // Obter categoria de despesa
      const category = order.expenseCategoryId 
        ? (accountCategories || []).find(c => c.id === order.expenseCategoryId)
        : (accountCategories || []).find(cat => cat.type === "Despesa" && cat.isActive);
      
      if (!category) {
        console.error(`❌ Categoria de despesa não encontrada`);
        return { success: false, message: 'Categoria de despesa não encontrada' };
      }

      // Obter fornecedor
      const supplier = (suppliers || []).find(s => s.id === order.supplierId);
      if (!supplier) {
        console.error(`❌ Fornecedor não encontrado: ${order.supplierId}`);
        return { success: false, message: 'Fornecedor não encontrado' };
      }

      // Obter conta bancária
      const bankAccounts = companySettings?.bankAccounts || [];
      const bank = order.bankAccountId 
        ? bankAccounts.find(b => b.id === order.bankAccountId)
        : bankAccounts.find(b => b.isPrimary) || bankAccounts[0];

      if (!bank) {
        console.error(`❌ Conta bancária não configurada`);
        return { success: false, message: 'Conta bancária não configurada' };
      }

      // Obter forma de pagamento
      const paymentMethod = (paymentMethods || []).find(pm => pm.isActive) || (paymentMethods || [])[0];

      // CORREÇÃO: Usar issueDate do pedido como data da transação
      const transactionDate = order.issueDate || order.orderDate;

      // Identificar número de parcelas da condição de pagamento
      let numberOfInstallments = 1;
      if (order.paymentCondition) {
        // Aceitar tanto "2" quanto "2x" como formato
        const parsedValue = parseInt(order.paymentCondition);
        if (!isNaN(parsedValue) && parsedValue > 0) {
          numberOfInstallments = parsedValue;
        }
      }

      console.log(`📅 Configuração de parcelamento (compra):`, {
        paymentCondition: order.paymentCondition,
        numberOfInstallments,
        totalAmount: order.totalAmount
      });

      // Criar transações (parcelas)
      const createdTransactions: FinancialTransaction[] = [];
      const installmentAmount = order.totalAmount / numberOfInstallments;

      for (let i = 0; i < numberOfInstallments; i++) {
        const transactionId = generateNextFinancialTransactionId();
        
        // Calcular data de vencimento para cada parcela usando utilitário sem problema de timezone
        const firstDueDateBase = calculateDueDatePurchase(order);
        const dueDate = addDaysToDate(firstDueDateBase, i * 30); // Adiciona 30 dias para cada parcela
        
        const description = numberOfInstallments === 1
          ? `Pedido de compra ${order.id} - Parcela única`
          : `Pedido de compra ${order.id} - Parcela ${i + 1}/${numberOfInstallments}`;
        
        const newTransaction: FinancialTransaction = {
          id: transactionId,
          type: "Despesa",
          date: transactionDate,
          dueDate: dueDate,
          paymentDate: undefined,
          effectiveDate: undefined,
          partyType: "Fornecedor",
          partyId: order.supplierId,
          partyName: order.supplier,
          categoryId: category.id,
          categoryName: category.name,
          bankAccountId: bank.id,
          bankAccountName: bank.bankName,
          paymentMethodId: paymentMethod.id,
          paymentMethodName: paymentMethod.name,
          amount: installmentAmount,
          status: "A Pagar",
          description,
          origin: "Pedido",
          reference: order.id,
          installmentNumber: i + 1,
          totalInstallments: numberOfInstallments
        };
        
        createdTransactions.push(newTransaction);
        
        console.log(`💾 Criando transação financeira ${i + 1}/${numberOfInstallments}:`, {
          id: newTransaction.id,
          status: newTransaction.status,
          amount: newTransaction.amount,
          dueDate: newTransaction.dueDate,
          installment: `${i + 1}/${numberOfInstallments}`
        });
      }
      
      // Adicionar todas as transações de uma vez
      setFinancialTransactions(prev => {
        const updated = [...createdTransactions, ...prev];
        console.log(`📊 ${createdTransactions.length} transação(ões) financeira(s) criada(s). Total: ${updated.length}`);
        return updated;
      });
      
      console.log(`✅ ${createdTransactions.length} conta(s) a pagar criada(s) para pedido ${order.id}`);
      
      return { 
        success: true, 
        transactionId: createdTransactions[0].id,
        transaction: createdTransactions[0], // RETORNA A PRIMEIRA TRANSAÇÃO
        message: `✅ ${createdTransactions.length} lançamento(s) financeiro(s) criado(s) - Total a pagar: R$ ${order.totalAmount.toFixed(2)}` 
      };
    } catch (error) {
      console.error(`❌ Erro ao criar conta a pagar:`, error);
      return { success: false, message: `Erro ao criar conta a pagar: ${error}` };
    } finally {
      releaseLock(order.id, 'accounts_creation', lockResult.lockId!);
    }
  };

  const updatePurchaseOrderStatus = (id: string, newStatus: PurchaseOrder['status'], userName: string = 'Sistema', isExceptional: boolean = false) => {
    const order = purchaseOrders.find(o => o.id === id);
    if (!order) {
      toast.error('Pedido de compra não encontrado!');
      return;
    }

    const oldStatus = order.status;

    // Preparar histórico
    const actionsExecuted: string[] = [];
    const generatedIds: { type: string; id: string }[] = [];
    const updatedActionFlags: OrderActionFlags = { ...order.actionFlags };

    // Executar ações conforme o novo status
    const orderWithUpdatedContext = { ...order, actionFlags: updatedActionFlags };

    if (newStatus === 'Recebido' || (isExceptional && (newStatus === 'Recebido' || newStatus === 'Concluído'))) {
      // Adicionar estoque
      const stockResult = executeStockAddition(orderWithUpdatedContext);
      if (stockResult.success && stockResult.movementId) {
        actionsExecuted.push(`✅ ${stockResult.message}`);
        if (stockResult.movementId) {
          generatedIds.push({ type: 'Movimento de Estoque', id: stockResult.movementId });
        }
        updatedActionFlags.stockReduced = true;
        updatedActionFlags.stockReductionId = stockResult.movementId;
        orderWithUpdatedContext.actionFlags = updatedActionFlags;
      } else if (stockResult.success) {
        actionsExecuted.push(`ℹ️ ${stockResult.message}`);
      }

      // Criar contas a pagar
      const apResult = executeAccountsPayableCreation(orderWithUpdatedContext);
      if (apResult.success) {
        actionsExecuted.push(`✅ ${apResult.message}`);
        if (apResult.transactionId) {
          generatedIds.push({ type: 'Transação Financeira', id: apResult.transactionId });
          updatedActionFlags.financialTransactionId = apResult.transactionId;
        }
        updatedActionFlags.accountsReceivableCreated = true;
      } else {
        actionsExecuted.push(`ℹ️ ${apResult.message}`);
      }

      // Atualizar estatísticas do fornecedor
      const supplier = suppliers.find(s => s.id === order.supplierId);
      if (supplier && !updatedActionFlags.customerStatsUpdated) {
        updateSupplier(order.supplierId, {
          totalPurchases: supplier.totalPurchases + 1,
          totalSpent: supplier.totalSpent + order.totalAmount
        });
        updatedActionFlags.customerStatsUpdated = true;
        actionsExecuted.push(`✅ Estatísticas do fornecedor atualizadas`);
      }
    }

    // Criar entrada no histórico
    const historyEntry: StatusHistoryEntry = {
      id: `HIST-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: userName,
      previousStatus: oldStatus,
      newStatus,
      actionsExecuted,
      generatedIds,
      isExceptional
    };

    // Atualizar pedido
    setPurchaseOrders(prev => prev.map(o =>
      o.id === id ? {
        ...o,
        status: newStatus,
        statusHistory: [...(o.statusHistory || []), historyEntry],
        actionFlags: updatedActionFlags
      } : o
    ));

    // Notificação
    const statusMessages = {
      'Confirmado': 'Pedido confirmado!',
      'Enviado': 'Pedido enviado pelo fornecedor!',
      'Recebido': 'Pedido recebido! Estoque e transações atualizados.',
      'Parcialmente Concluído': 'Pedido parcialmente concluído!',
      'Concluído': 'Pedido concluído! Todos os pagamentos foram efetuados.',
      'Cancelado': 'Pedido cancelado!'
    };

    toast.success(statusMessages[newStatus] || `Status atualizado para ${newStatus}`);

    if (actionsExecuted.length > 0) {
      console.log(`Ações executadas para pedido ${id}:`, actionsExecuted);
    }
  };

  // ==================== STOCK VALIDATION ====================

  /**
   * Verifica disponibilidade de estoque considerando reservas de pedidos em andamento
   * Pode ser usado pelos componentes antes de criar/confirmar pedidos
   */
  const checkStockAvailability = (
    productName: string, 
    quantity: number, 
    excludeOrderId?: string
  ) => {
    const product = inventory.find(item => item.productName === productName);
    
    if (!product) {
      return {
        isAvailable: false,
        available: 0,
        reserved: 0,
        currentStock: 0,
        message: `Produto "${productName}" não encontrado no estoque`
      };
    }

    const validation = validateStockAvailability(
      productName,
      quantity,
      product.currentStock,
      salesOrders,
      excludeOrderId
    );

    return {
      isAvailable: validation.canProceed,
      available: validation.available,
      reserved: validation.reserved,
      currentStock: validation.currentStock,
      message: validation.message
    };
  };

  // ==================== AUDIT ACTIONS ====================

  const setAuditResults = (issues: AuditIssue[], analysisDate: Date) => {
    setAuditIssues(issues);
    setLastAnalysisDate(analysisDate);
  };

  // ==================== RECONCILIATION ACTIONS ====================

  const toggleReconciliationStatus = (reconciliationKey: string) => {
    setReconciliationStatus(prev => ({
      ...prev,
      [reconciliationKey]: !prev[reconciliationKey]
    }));
  };

  // ==================== CONTEXT VALUE ====================

  const value: ERPContextData = {
    customers,
    suppliers,
    salesOrders,
    purchaseOrders,
    inventory,
    stockMovements,
    priceTables,
    companySettings,
    companyHistory,
    salespeople,
    buyers,
    paymentMethods,
    accountCategories,
    financialTransactions,
    accountsReceivable,
    accountsPayable,
    bankMovements,
    cashFlowEntries,
    auditIssues,
    lastAnalysisDate,
    setAuditResults,
    addCustomer,
    updateCustomer,
    addSupplier,
    updateSupplier,
    addSalesOrder,
    updateSalesOrder,
    updateSalesOrderStatus,
    addPurchaseOrder,
    updatePurchaseOrder,
    updatePurchaseOrderStatus,
    addInventoryItem,
    updateInventoryItem,
    updateInventory,
    addStockMovement,
    getStockMovementsByProduct,
    checkStockAvailability,
    productCategories,
    addProductCategory,
    deleteProductCategory,
    addPriceTable,
    updatePriceTable,
    deletePriceTable,
    getPriceTableById,
    getDefaultPriceTable,
    updateCompanySettings,
    getCompanyHistory,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    addRevenueGroup,
    updateRevenueGroup,
    deleteRevenueGroup,
    addExpenseGroup,
    updateExpenseGroup,
    deleteExpenseGroup,
    addCostCenter,
    updateCostCenter,
    deleteCostCenter,
    addSalesperson,
    updateSalesperson,
    deleteSalesperson,
    addBuyer,
    updateBuyer,
    deleteBuyer,
    addPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    addAccountCategory,
    updateAccountCategory,
    deleteAccountCategory,
    addFinancialTransaction,
    updateFinancialTransaction,
    deleteFinancialTransaction,
    markTransactionAsReceived,
    markTransactionAsPaid,
    addAccountReceivable,
    updateAccountReceivable,
    markAsReceived,
    addAccountPayable,
    updateAccountPayable,
    markAsPaid,
    addBankMovement,
    reconcileBankMovement,
    importBankStatement,
    addCashFlowEntry,
    updateCashFlowEntry,
    deleteCashFlowEntry,
    reconciliationStatus,
    toggleReconciliationStatus
  };

  return <ERPContext.Provider value={value}>{children}</ERPContext.Provider>;
}

// ==================== HOOK ====================

export function useERP() {
  const context = useContext(ERPContext);
  if (!context) {
    throw new Error('useERP must be used within an ERPProvider');
  }
  return context;
}
