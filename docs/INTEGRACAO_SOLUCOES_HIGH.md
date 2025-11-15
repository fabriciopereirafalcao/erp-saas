# 🔧 GUIA DE INTEGRAÇÃO - SOLUÇÕES HIGH PRIORITY

## 🎯 OBJETIVO

Este guia fornece **instruções passo a passo** para integrar as soluções HIGH-002, HIGH-004 e HIGH-005 nos componentes do sistema.

---

## 📝 HIGH-002: VALIDAÇÕES DE CAMPOS

### **PASSO 1: Integrar no Formulário de Clientes**

**Arquivo:** `/components/Customers.tsx`

#### 1.1 Adicionar Imports

```typescript
import { validateCustomer, formatCPF, formatCNPJ, formatCEP, formatPhone } from '../utils/fieldValidation';
import { ValidationFeedback } from './ValidationFeedback';
```

#### 1.2 Adicionar Estado de Validação

```typescript
const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
```

#### 1.3 Adicionar Validação no Formulário

```typescript
// ANTES do <DialogContent>
const handleValidateForm = () => {
  const validation = validateCustomer(formData);
  setValidationResult(validation);
  return validation.isValid;
};
```

#### 1.4 Validar ao Salvar

```typescript
const handleSaveCustomer = () => {
  // ADICIONAR VALIDAÇÃO
  if (!handleValidateForm()) {
    toast.error("Dados inválidos. Corrija os erros abaixo.");
    return;
  }
  
  // Código existente...
  if (editingCustomerId) {
    updateCustomer(editingCustomerId, formData);
  } else {
    addCustomer(formData);
  }
  
  setIsDialogOpen(false);
  resetForm();
};
```

#### 1.5 Exibir Feedback no Dialog

```typescript
<DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
  <DialogHeader>
    <DialogTitle>
      {editingCustomerId ? "Editar Cliente" : "Novo Cliente"}
    </DialogTitle>
  </DialogHeader>
  
  {/* ADICIONAR FEEDBACK DE VALIDAÇÃO */}
  {validationResult && (
    <ValidationFeedback 
      validation={validationResult}
      title="Validação de Dados"
      showFields={false}
    />
  )}
  
  {/* Resto do formulário... */}
</DialogContent>
```

#### 1.6 Formatar Campos Automaticamente

```typescript
// No onChange do CPF/CNPJ
<Input
  value={formData.document}
  onChange={(e) => {
    const formatted = formData.documentType === 'PJ' 
      ? formatCNPJ(e.target.value)
      : formatCPF(e.target.value);
    setFormData({ ...formData, document: formatted });
  }}
  placeholder="000.000.000-00"
/>

// No onChange do CEP
<Input
  value={formData.zipCode}
  onChange={(e) => {
    const formatted = formatCEP(e.target.value);
    setFormData({ ...formData, zipCode: formatted });
  }}
  placeholder="00000-000"
/>

// No onChange do Telefone
<Input
  value={formData.phone}
  onChange={(e) => {
    const formatted = formatPhone(e.target.value);
    setFormData({ ...formData, phone: formatted });
  }}
  placeholder="(00) 00000-0000"
/>
```

#### 1.7 Validar em Tempo Real (Opcional)

```typescript
// Validar enquanto digita
useEffect(() => {
  if (formData.document) {
    const validation = validateCustomer(formData);
    setValidationResult(validation);
  }
}, [formData]);
```

---

### **PASSO 2: Integrar no Formulário de Produtos**

**Arquivo:** `/components/Inventory.tsx`

#### 2.1 Adicionar Imports

```typescript
import { validateProduct } from '../utils/fieldValidation';
import { ValidationFeedback } from './ValidationFeedback';
```

#### 2.2 Adicionar Validação

```typescript
const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

const handleValidateProduct = () => {
  const validation = validateProduct(formData);
  setValidationResult(validation);
  return validation.isValid;
};

const handleSaveProduct = () => {
  if (!handleValidateProduct()) {
    toast.error("Dados do produto inválidos");
    return;
  }
  
  // Código existente...
};
```

#### 2.3 Adicionar Campo NCM

```typescript
<div className="space-y-2">
  <Label htmlFor="ncm">
    NCM <span className="text-red-500">*</span>
    <span className="text-xs text-gray-500 ml-2">(Obrigatório para NFe)</span>
  </Label>
  <Input
    id="ncm"
    value={formData.ncm || ''}
    onChange={(e) => {
      // Permitir apenas números
      const value = e.target.value.replace(/\D/g, '').slice(0, 8);
      setFormData({ ...formData, ncm: value });
    }}
    placeholder="00000000"
    maxLength={8}
  />
  {formData.ncm && formData.ncm.length === 8 ? (
    <p className="text-xs text-green-600">✓ NCM válido</p>
  ) : (
    <p className="text-xs text-red-600">NCM deve ter 8 dígitos</p>
  )}
</div>
```

---

### **PASSO 3: Integrar nas Configurações da Empresa**

**Arquivo:** `/components/CompanySettings.tsx`

#### 3.1 Adicionar Imports

```typescript
import { validateCompany, formatCNPJ, formatCEP } from '../utils/fieldValidation';
import { ValidationFeedback } from './ValidationFeedback';
```

#### 3.2 Validar Antes de Salvar

```typescript
const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

const handleSaveCompanyData = () => {
  const validation = validateCompany(companyData);
  setValidationResult(validation);
  
  if (!validation.isValid) {
    toast.error("Dados da empresa incompletos ou inválidos");
    return;
  }
  
  updateCompanySettings(companyData);
  toast.success("Dados da empresa atualizados!");
};
```

#### 3.3 Exibir Feedback

```typescript
{validationResult && (
  <ValidationFeedback 
    validation={validationResult}
    title="Validação de Dados da Empresa"
    showFields={true}
  />
)}
```

---

## 📄 HIGH-004: VALIDAÇÃO DE NFE

### **PASSO 4: Integrar no TaxInvoicing**

**Arquivo:** `/components/TaxInvoicing.tsx`

#### 4.1 Adicionar Imports

```typescript
import { validateNFeData } from '../utils/fieldValidation';
import { ValidationFeedback } from './ValidationFeedback';
```

#### 4.2 Adicionar Estados

```typescript
const [nfeValidation, setNFeValidation] = useState<ValidationResult | null>(null);
const [showValidationModal, setShowValidationModal] = useState(false);
```

#### 4.3 Validar Antes de Transmitir

```typescript
const handleTransmitNFe = (invoice: TaxInvoice) => {
  // Buscar dados completos
  const customer = customers.find(c => c.id === invoice.customerId);
  const product = inventory.find(i => i.productName === invoice.items[0]?.productName);
  
  // VALIDAÇÃO COMPLETA
  const validation = validateNFeData({
    company: {
      cnpj: companySettings.cnpj,
      companyName: companySettings.companyName,
      stateRegistration: companySettings.stateRegistration,
      street: companySettings.street,
      number: companySettings.number,
      neighborhood: companySettings.neighborhood,
      city: companySettings.city,
      state: companySettings.state,
      zipCode: companySettings.zipCode
    },
    customer: customer,
    product: {
      productName: invoice.items[0]?.productName,
      ncm: product?.ncm,
      quantity: invoice.items[0]?.quantity,
      unitPrice: invoice.items[0]?.unitPrice
    },
    cfop: invoice.items[0]?.cfop,
    cst: invoice.items[0]?.cst,
    icmsRate: companySettings.defaultICMSRate
  });
  
  setNFeValidation(validation);
  
  if (!validation.isValid) {
    setShowValidationModal(true);
    toast.error("NFe não pode ser transmitida", {
      description: `${validation.errors.length} erro(s) encontrado(s)`
    });
    return;
  }
  
  // Prosseguir com transmissão
  console.log("✅ Validação OK. Transmitindo NFe...");
  toast.success("NFe em processo de transmissão...");
};
```

#### 4.4 Dialog de Validação

```typescript
<Dialog open={showValidationModal} onOpenChange={setShowValidationModal}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Validação de NFe</DialogTitle>
      <DialogDescription>
        A NFe não pode ser transmitida devido aos erros abaixo.
        Corrija os dados e tente novamente.
      </DialogDescription>
    </DialogHeader>
    
    {nfeValidation && (
      <ValidationFeedback 
        validation={nfeValidation}
        title="Erros de Validação"
        showFields={true}
      />
    )}
    
    <div className="flex justify-end gap-2 mt-4">
      <Button 
        variant="outline" 
        onClick={() => setShowValidationModal(false)}
      >
        Fechar
      </Button>
      <Button onClick={handleGoToSettings}>
        Corrigir Dados
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

#### 4.5 Desabilitar Botão se Inválido

```typescript
<Button 
  onClick={() => handleTransmitNFe(invoice)}
  disabled={invoice.status !== "Rascunho" || isValidating}
  className="gap-2"
>
  <Send className="w-4 h-4" />
  Transmitir NFe
</Button>
```

---

## 🔗 HIGH-005: INTEGRAÇÃO PEDIDO → NFE

### **PASSO 5: Adicionar Botão "Gerar NFe"**

**Arquivo:** `/components/SalesOrders.tsx`

#### 5.1 Adicionar Imports

```typescript
import { validateNFeData } from '../utils/fieldValidation';
```

#### 5.2 Adicionar Estados

```typescript
const [showNFeModal, setShowNFeModal] = useState(false);
const [selectedOrderForNFe, setSelectedOrderForNFe] = useState<SalesOrder | null>(null);
const [nfeValidation, setNFeValidation] = useState<ValidationResult | null>(null);
```

#### 5.3 Função Gerar NFe

```typescript
const handleGenerateNFe = (order: SalesOrder) => {
  setSelectedOrderForNFe(order);
  
  // Buscar dados completos
  const customer = customers.find(c => c.id === order.customerId);
  const product = inventory.find(i => i.productName === order.productName);
  
  // Validar dados
  const validation = validateNFeData({
    company: companySettings,
    customer: customer,
    product: {
      productName: order.productName,
      ncm: product?.ncm,
      quantity: order.quantity,
      unitPrice: order.unitPrice
    },
    cfop: determineCFOP(customer),
    cst: companySettings.defaultCST,
    icmsRate: companySettings.defaultICMSRate
  });
  
  setNFeValidation(validation);
  
  if (!validation.isValid) {
    toast.error("Dados incompletos para gerar NFe", {
      description: "Clique para ver detalhes"
    });
    setShowNFeModal(true);
    return;
  }
  
  // Criar NFe em rascunho
  const nfeData = {
    id: `NFE-${String(Math.random()).substring(2, 6)}`,
    orderId: order.id,
    customerId: order.customerId,
    customerName: order.customer,
    items: [{
      productName: order.productName,
      quantity: order.quantity,
      unitPrice: order.unitPrice,
      totalPrice: order.totalAmount,
      ncm: product?.ncm,
      cfop: determineCFOP(customer),
      cst: companySettings.defaultCST
    }],
    totalAmount: order.totalAmount,
    status: "Rascunho" as const,
    issueDate: new Date().toISOString().split('T')[0]
  };
  
  // NOTA: Adicionar função addTaxInvoice ao ERPContext se não existir
  console.log("NFe criada:", nfeData);
  
  toast.success(`NFe criada em rascunho`, {
    description: "Acesse 'Faturamento Fiscal' para revisar"
  });
};

const determineCFOP = (customer: any): string => {
  if (!customer) return "5102";
  
  const isSameState = customer.state === companySettings.state;
  return isSameState 
    ? (companySettings.cfopInState || "5102")
    : (companySettings.cfopOutState || "6102");
};
```

#### 5.4 Adicionar Botão no Dialog de Detalhes

```typescript
{/* No dialog de detalhes do pedido */}
<DialogContent className="max-w-4xl">
  <DialogHeader>
    <DialogTitle className="flex items-center justify-between">
      <span>Pedido {selectedOrder?.id}</span>
      
      {/* ADICIONAR BOTÃO GERAR NFE */}
      {selectedOrder?.status === "Entregue" && !selectedOrder?.invoiceId && (
        <Button 
          onClick={() => handleGenerateNFe(selectedOrder)}
          className="gap-2"
          variant="default"
        >
          <FileText className="w-4 h-4" />
          Gerar NFe
        </Button>
      )}
      
      {selectedOrder?.invoiceId && (
        <Badge variant="outline" className="gap-1">
          <FileText className="w-3 h-3" />
          NFe: {selectedOrder.invoiceId}
        </Badge>
      )}
    </DialogTitle>
  </DialogHeader>
  
  {/* Resto do conteúdo... */}
</DialogContent>
```

#### 5.5 Modal de Validação NFe

```typescript
<Dialog open={showNFeModal} onOpenChange={setShowNFeModal}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Gerar NFe - Validação</DialogTitle>
      <DialogDescription>
        Não é possível gerar NFe para o pedido {selectedOrderForNFe?.id} 
        devido aos erros abaixo.
      </DialogDescription>
    </DialogHeader>
    
    {nfeValidation && (
      <ValidationFeedback 
        validation={nfeValidation}
        title="Dados Faltantes"
        showFields={true}
      />
    )}
    
    <Alert className="border-blue-200 bg-blue-50">
      <Info className="h-4 w-4 text-blue-600" />
      <AlertDescription className="text-blue-900">
        <strong>Como corrigir:</strong>
        <ul className="mt-2 ml-4 list-disc space-y-1 text-sm">
          <li>Cliente: Verifique CPF/CNPJ, endereço completo</li>
          <li>Produto: Adicione NCM (8 dígitos)</li>
          <li>Empresa: Configure dados fiscais em "Minha Empresa"</li>
        </ul>
      </AlertDescription>
    </Alert>
    
    <div className="flex justify-end gap-2">
      <Button variant="outline" onClick={() => setShowNFeModal(false)}>
        Fechar
      </Button>
      <Button onClick={() => {
        setShowNFeModal(false);
        // Navegar para configurações
      }}>
        Corrigir Dados
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

---

## 🔐 HIGH-003: INTEGRAÇÃO DE PERMISSÕES

### **PASSO 6: Aplicar Permissões em Botões**

**Arquivo:** Qualquer componente que precisa controle

#### 6.1 Adicionar Import

```typescript
import { usePermissions } from '../hooks/usePermissions';
```

#### 6.2 Usar no Componente

```typescript
export function SalesOrders() {
  const { canCreate, canEdit, canDelete, isSuperAdmin } = usePermissions();
  
  return (
    <div>
      {/* Botão Novo Pedido */}
      {canCreate('sales') && (
        <Button onClick={handleNewOrder}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Pedido
        </Button>
      )}
      
      {/* Botão Editar */}
      {canEdit('sales') && (
        <Button onClick={handleEdit}>
          <Edit className="w-4 h-4 mr-2" />
          Editar
        </Button>
      )}
      
      {/* Botão Cancelar (requer delete permission) */}
      {canDelete('sales') && (
        <Button onClick={handleCancel} variant="destructive">
          <X className="w-4 h-4 mr-2" />
          Cancelar Pedido
        </Button>
      )}
      
      {/* Módulo de Auditoria (apenas super admin) */}
      {isSuperAdmin() && (
        <Button onClick={handleOpenAudit}>
          <AlertCircle className="w-4 h-4 mr-2" />
          Auditoria
        </Button>
      )}
    </div>
  );
}
```

#### 6.3 Proteger Módulos Inteiros

```typescript
// Proteger componente completo
import { withPermission } from '../hooks/usePermissions';

function FinancialTransactions() {
  // Componente
}

export default withPermission(FinancialTransactions, 'financial', 'view');
```

---

## 📊 CHECKLIST DE INTEGRAÇÃO

### Validações (HIGH-002)
- [ ] Integrar validateCustomer em Customers.tsx
- [ ] Integrar validateProduct em Inventory.tsx
- [ ] Integrar validateCompany em CompanySettings.tsx
- [ ] Adicionar formatação automática de campos
- [ ] Testar validação de CPF/CNPJ
- [ ] Testar validação de endereço

### Validação NFe (HIGH-004)
- [ ] Integrar validateNFeData em TaxInvoicing.tsx
- [ ] Adicionar modal de validação
- [ ] Bloquear transmissão se inválido
- [ ] Testar com dados incompletos
- [ ] Testar com dados válidos

### Integração Pedido→NFe (HIGH-005)
- [ ] Adicionar botão "Gerar NFe" em SalesOrders.tsx
- [ ] Implementar handleGenerateNFe()
- [ ] Adicionar campo invoiceId ao SalesOrder
- [ ] Testar criação de NFe a partir de pedido
- [ ] Verificar vínculo bidirecional

### Permissões (HIGH-003)
- [ ] Aplicar usePermissions em SalesOrders
- [ ] Aplicar usePermissions em PurchaseOrders
- [ ] Aplicar usePermissions em FinancialTransactions
- [ ] Aplicar usePermissions em Customers
- [ ] Aplicar usePermissions em Suppliers
- [ ] Aplicar usePermissions em TaxInvoicing
- [ ] Testar ocultação de botões

---

## 🧪 TESTES ESSENCIAIS

### Teste 1: Validação de Cliente Inválido
1. Tentar criar cliente com CNPJ inválido
2. **Esperado:** Toast de erro + ValidationFeedback exibido
3. **Esperado:** Salvamento bloqueado

### Teste 2: Validação de Produto sem NCM
1. Tentar criar produto sem NCM
2. **Esperado:** Erro: "NCM obrigatório para NFe"
3. **Esperado:** Salvamento bloqueado

### Teste 3: Gerar NFe de Pedido
1. Criar pedido completo
2. Marcar como "Entregue"
3. Clicar em "Gerar NFe"
4. **Esperado:** NFe criada em rascunho
5. **Esperado:** Vínculo entre pedido e NFe

### Teste 4: NFe com Dados Incompletos
1. Tentar transmitir NFe sem NCM no produto
2. **Esperado:** Modal de erros exibido
3. **Esperado:** Transmissão bloqueada

### Teste 5: Permissões
1. Usuário sem permissão de "create"
2. **Esperado:** Botão "Novo Pedido" oculto

---

## ⚠️ AVISOS IMPORTANTES

### 1. NCM é Obrigatório
- **Todos os produtos** devem ter NCM para emitir NFe
- Validar e bloquear se ausente

### 2. Endereço Completo
- Cliente e Empresa precisam de endereço completo
- Validar todos os campos

### 3. Documentos Válidos
- CPF/CNPJ devem ser válidos (com dígitos verificadores)
- IE deve ser válida ou "ISENTO"

### 4. CFOP Automático
- Sistema determina CFOP baseado em estado
- Mesma UF: 5102
- Outra UF: 6102

---

## 📞 SUPORTE

Em caso de dúvidas:
1. Consulte `/SOLUCOES_HIGH_IMPLEMENTADAS.md`
2. Verifique `/utils/fieldValidation.ts`
3. Veja exemplos em `/components/ValidationFeedback.tsx`

---

**Guia criado por:** Sistema ERP  
**Versão:** 1.0  
**Data:** 06/11/2024
