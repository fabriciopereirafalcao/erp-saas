# 🔄 REFATORAÇÃO KV STORE → SQL - PROGRESSO

## ✅ **COMPLETADO:**

### **1. Arquivos Criados:**
- ✅ `/supabase/functions/server/services/sql-service.ts` (parcial)
- ✅ `/supabase/migrations/014_expand_core_tables.sql`
- ✅ `/supabase/migrations/015_add_auxiliary_tables.sql`

### **2. Arquivos Refatorados:**
- ✅ `/supabase/functions/server/data-routes.tsx` (COMPLETO)

---

## 🚧 **EM PROGRESSO:**

### **3. Completar SQL Service:**

Entidades já implementadas no `sql-service.ts`:
- ✅ `customers`
- ✅ `suppliers`  
- ✅ `products` (inventory)

Entidades que precisam ser implementadas:
- ⏳ `salesOrders` + `salesOrderItems`
- ⏳ `purchaseOrders` + `purchaseOrderItems`
- ⏳ `stockMovements`
- ⏳ `priceTables` + `priceTableItems`
- ⏳ `productCategories`
- ⏳ `salespeople` (usar JSONB ou criar tabela auxiliar)
- ⏳ `buyers` (usar JSONB ou criar tabela auxiliar)
- ⏳ `paymentMethods`
- ⏳ `accountCategories`
- ⏳ `financialTransactions`
- ⏳ `accountsReceivable`
- ⏳ `accountsPayable`
- ⏳ `bankMovements` (mapear para financial_transactions ou criar tabela)
- ⏳ `cashFlowEntries`
- ⏳ `auditIssues` (usar audit_logs ou criar campo na tabela audit_logs)
- ⏳ `companyHistory` (usar audit_logs ou JSONB no companies)
- ⏳ `reconciliationStatus` (usar JSONB no companies ou criar tabela)
- ⏳ `lastAnalysisDate` (usar JSONB no companies)

---

## 📋 **PRÓXIMOS PASSOS:**

1. Completar todas as entidades no `sql-service.ts`
2. Testar cada endpoint individualmente
3. Verificar mapeamento de dados (nomes de campos diferentes)
4. Deploy do backend refatorado
5. Testar no ambiente preview
6. Validar persistência de dados

---

## ⚠️ **DECISÕES TÉCNICAS PENDENTES:**

### **Salespeople e Buyers:**
**Opção A:** Criar tabelas SQL específicas (mais trabalho)  
**Opção B:** Usar JSONB no `companies.settings` (mais simples, menos consultas)  
**Decisão:** Usar JSONB para agilizar a migração

### **Audit Issues:**
**Opção A:** Usar tabela `audit_logs` existente  
**Opção B:** Criar campo JSONB em companies  
**Decisão:** Usar campo JSONB em `companies.settings.auditIssues`

### **Company History:**
**Opção A:** Usar tabela `audit_logs` com filtro  
**Opção B:** Campo JSONB em companies  
**Decisão:** Campo JSONB em `companies.settings.history`

### **Reconciliation Status:**
**Opção A:** Criar tabela específica  
**Opção B:** Campo JSONB em companies  
**Decisão:** Campo JSONB em `companies.settings.reconciliation`

### **Last Analysis Date:**
**Opção A:** Campo específico em companies  
**Opção B:** Dentro de JSONB  
**Decisão:** Campo JSONB em `companies.settings.lastAnalysisDate`

---

## 🎯 **ESTRATÉGIA DE MIGRAÇÃO:**

1. **Entidades SQL nativas** (já existem tabelas):
   - customers, suppliers, products
   - sales_orders, purchase_orders
   - financial_transactions
   - accounts_receivable, accounts_payable
   - stock_movements
   - payment_methods, account_categories
   - product_categories, price_tables

2. **Entidades JSONB** (sem tabela específica):
   - salespeople → `companies.settings.salespeople`
   - buyers → `companies.settings.buyers`
   - auditIssues → `companies.settings.auditIssues`
   - companyHistory → `companies.settings.history`
   - reconciliationStatus → `companies.settings.reconciliation`
   - lastAnalysisDate → `companies.settings.lastAnalysisDate`
   - bankMovements → `companies.settings.bankMovements` (temporário)

3. **Mapeamento especial**:
   - cashFlowEntries → tabela `cash_flow_entries`

---

## 📊 **PROGRESSO GERAL:**

- [x] Migrations SQL aplicadas
- [x] SQL Service criado (estrutura)
- [x] Data Routes refatorado
- [ ] SQL Service completo (todas entidades)
- [ ] Testes unitários
- [ ] Deploy backend
- [ ] Testes integração
- [ ] Validação produção

**Estimativa:** 30% completo
