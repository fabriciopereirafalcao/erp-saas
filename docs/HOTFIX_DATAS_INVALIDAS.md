# 🔧 HOTFIX: Correção de Datas Inválidas

## 🐛 **PROBLEMA:**

Ao clicar em "Estoque", o frontend quebrava com erro:
```
RangeError: Invalid time value at Date.toISOString()
```

## 🔍 **CAUSA RAIZ:**

No mapeamento SQL → Frontend, campos de data NULL estavam sendo convertidos para string vazia `''` ao invés de `null`:

```typescript
// ❌ ERRADO (causava erro)
lastRestocked: row.last_restocked || ''

// ✅ CORRETO
lastRestocked: row.last_restocked || null
```

Quando o frontend tenta fazer `new Date('')`, resulta em data inválida. Depois ao chamar `.toISOString()`, gera o erro.

---

## ✅ **CORREÇÃO APLICADA:**

### **Arquivo:** `/supabase/functions/server/services/sql-service.ts`

**Campos corrigidos:**
- `lastRestocked`: `row.last_restocked || null` (ao invés de `''`)
- `shelfLife`: `row.shelf_life || null` (já estava correto)
- `defaultLocation`: `row.default_location || ''` (string pode ser vazia)

---

## 🔄 **DEPLOY:**

```bash
# Adicionar arquivo corrigido
git add supabase/functions/server/services/sql-service.ts

# Commit
git commit -m "fix: Corrigir datas inválidas no mapeamento SQL

- lastRestocked agora retorna null ao invés de string vazia
- Previne erro 'Invalid time value' no frontend
- Resolve crash ao acessar aba Estoque"

# Push
git push origin develop
```

---

## 🧪 **TESTE:**

Após deploy, testar:
1. ✅ Acessar aba "Estoque"
2. ✅ Não deve haver erro no console
3. ✅ Produtos devem ser listados corretamente

---

## 📋 **CAMPOS SIMILARES A VERIFICAR:**

Em caso de erros similares em outras entidades, verificar estes campos:

### **Sales Orders:**
- `issueDate`, `billingDate`, `deliveryDate`, `dueDate`

### **Purchase Orders:**
- `issueDate`, `billingDate`, `deliveryDate`, `dueDate`

### **Financial Transactions:**
- `transactionDate`, `dueDate`, `effectiveDate`

### **Accounts Receivable/Payable:**
- `dueDate`, `paymentDate`

**Regra:** Sempre usar `|| null` para campos de data opcionais, NUNCA `|| ''`

---

**Status:** ✅ Corrigido - Aguardando deploy
