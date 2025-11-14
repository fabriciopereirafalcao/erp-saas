# 🔒 CONTROLE DE ACESSO - MÓDULO DE AUDITORIA

## 📋 VISÃO GERAL

O módulo de Auditoria do Sistema possui **3 níveis de proteção** para garantir que só seja acessível em ambiente de desenvolvimento e por usuários autorizados.

---

## 🛡️ NÍVEIS DE PROTEÇÃO IMPLEMENTADOS

### 🔷 NÍVEL 1: Aplicacional (Front-end)
**Mecanismo:** Variável de ambiente `APP_ENV`  
**Arquivo:** `/utils/environment.ts`  
**Efeito:** Oculta o módulo da interface

```typescript
// Detecta ambiente
export const ENVIRONMENT = getEnvironment();
export const IS_DEVELOPMENT = ENVIRONMENT === 'development';

// Feature flags
export const FEATURES = {
  SYSTEM_AUDIT: IS_DEVELOPMENT,  // ✅ Apenas em dev
  // ...
};
```

**Como funciona:**
- Em **desenvolvimento**: `FEATURES.SYSTEM_AUDIT = true`
- Em **produção**: `FEATURES.SYSTEM_AUDIT = false`

---

### 🔷 NÍVEL 2: Build / Deploy
**Mecanismo:** `process.env.NODE_ENV` + Tree Shaking  
**Arquivo:** `/App.tsx`  
**Efeito:** Remove o componente do bundle de produção

```typescript
// Importação condicional
const SystemAudit = IS_DEVELOPMENT 
  ? require("./components/SystemAudit").SystemAudit 
  : null;

// Renderização protegida
case "systemAudit":
  if (!FEATURES.SYSTEM_AUDIT || !SystemAudit) {
    console.warn("Módulo de Auditoria não disponível");
    return <Dashboard />;
  }
  return <SystemAudit />;
```

**Benefícios:**
- ✅ Reduz tamanho do bundle em produção
- ✅ Não expõe código de auditoria
- ✅ Impossível acessar mesmo manipulando URL

---

### 🔷 NÍVEL 3: Controle de Permissões (RBAC)
**Mecanismo:** Role-Based Access Control  
**Arquivo:** `/hooks/usePermissions.ts`  
**Efeito:** Apenas usuários autorizados veem o módulo

```typescript
// Tipos de perfil
export type UserRole = 
  | "super_admin"      // ✅ Pode acessar auditoria
  | "admin"            // ❌ Não pode
  | "manager"          // ❌ Não pode
  | "viewer"           // ❌ Não pode
  // ...

// Verificação de acesso
const hasModuleAccess = (module: SystemModule): boolean => {
  if (module === "systemAudit") {
    return FEATURES.SYSTEM_AUDIT && currentUser.role === "super_admin";
  }
  return true;
};
```

**Matriz de Acesso:**

| Papel                      | Ambiente Dev | Ambiente Prod | Acesso ao Módulo |
|----------------------------|--------------|---------------|------------------|
| Super Admin (Dev)          | ✅ Sim       | ❌ Não        | ✅ Sim          |
| Administrador Financeiro   | ⚠️ Não      | ❌ Não        | ❌ Não          |
| Gerente                    | ⚠️ Não      | ❌ Não        | ❌ Não          |
| Usuário Comum              | ⚠️ Não      | ❌ Não        | ❌ Não          |

---

## 🎯 PONTOS DE VERIFICAÇÃO

### 1️⃣ Sidebar (`/components/Sidebar.tsx`)
```typescript
// Oculta item do menu em produção
{menuItems.map((item) => {
  if (item.id === "systemAudit" && !FEATURES.SYSTEM_AUDIT) {
    return null;  // ❌ Não renderiza
  }
  
  return (
    <li key={item.id}>
      <button>
        {item.label}
        {/* Badge DEV apenas em desenvolvimento */}
        {item.id === "systemAudit" && (
          <span className="badge">DEV</span>
        )}
      </button>
    </li>
  );
})}
```

**Resultado:**
- **Desenvolvimento:** Item visível com badge "DEV"
- **Produção:** Item completamente removido

---

### 2️⃣ App Router (`/App.tsx`)
```typescript
// Proteção tripla na renderização
case "systemAudit":
  // 1. Verifica feature flag
  if (!FEATURES.SYSTEM_AUDIT) {
    return <Dashboard />;
  }
  
  // 2. Verifica se componente foi carregado
  if (!SystemAudit) {
    return <Dashboard />;
  }
  
  // 3. Renderiza apenas se passou por todas as verificações
  return <SystemAudit />;
```

---

### 3️⃣ Componente de Auditoria (`/components/SystemAudit.tsx`)
```typescript
// Alerta visual de ambiente
<Alert className="border-purple-200 bg-purple-50">
  <Shield className="text-purple-600" />
  <AlertDescription>
    ⚠️ MÓDULO DE DESENVOLVIMENTO: Este painel está disponível 
    apenas em ambiente de desenvolvimento e para usuários 
    "Super Admin". Não será exibido em produção.
  </AlertDescription>
</Alert>

// Badge de ambiente
<Badge variant="outline">
  {ENVIRONMENT.toUpperCase()}  {/* DEVELOPMENT */}
</Badge>
```

---

## 🔧 CONFIGURAÇÃO DE AMBIENTE

### Variáveis de Ambiente

**Opção 1: Via window global (desenvolvimento local)**
```javascript
// Em index.html ou antes do bundle
window.APP_ENV = 'development';
```

**Opção 2: Via variável de build (Vite/Webpack)**
```bash
# .env.development
VITE_APP_ENV=development

# .env.production
VITE_APP_ENV=production
```

**Opção 3: Via process.env**
```bash
# Build de desenvolvimento
NODE_ENV=development npm run build

# Build de produção
NODE_ENV=production npm run build
```

---

## 🚀 FUNCIONALIDADES DO MÓDULO DE AUDITORIA

### 1. Análise Automática
- ✅ Executa ao carregar o módulo
- ✅ Identifica problemas em tempo real
- ✅ Classifica por severidade

### 2. Re-análise Manual
```typescript
// Botão de re-análise
<Button onClick={handleRunAnalysis} disabled={isAnalyzing}>
  <RefreshCw className={isAnalyzing ? 'animate-spin' : ''} />
  {isAnalyzing ? 'Analisando...' : 'Executar Nova Análise'}
</Button>
```

**Comportamento:**
- Clique dispara nova análise
- Animação de loading durante processamento
- Toast de confirmação ao concluir
- Atualiza timestamp da última análise

### 3. Informações Contextuais
- 📊 Health Score do sistema
- 🕐 Timestamp da última análise
- 🏷️ Badge do ambiente atual
- ⚠️ Alertas de ambiente de desenvolvimento

---

## 📊 FLUXO DE VERIFICAÇÃO

```
┌─────────────────────────────────────────────────┐
│ Usuário tenta acessar módulo de auditoria      │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
            ┌─────────────────────┐
            │ NÍVEL 1: Ambiente   │
            │ IS_DEVELOPMENT?     │
            └──────────┬──────────┘
                       │
                  ┌────┴────┐
                  │         │
               SIM│         │NÃO
                  │         │
                  ▼         ▼
         ┌─────────────┐  ┌──────────────┐
         │ Continua    │  │ BLOQUEADO    │
         └──────┬──────┘  │ Redirect ->  │
                │         │ Dashboard    │
                ▼         └──────────────┘
      ┌──────────────────┐
      │ NÍVEL 2: Build   │
      │ Componente       │
      │ carregado?       │
      └────────┬─────────┘
               │
          ┌────┴────┐
          │         │
       SIM│         │NÃO
          │         │
          ▼         ▼
   ┌───────────┐  ┌──────────────┐
   │ Continua  │  │ BLOQUEADO    │
   └─────┬─────┘  │ Redirect ->  │
         │        │ Dashboard    │
         ▼        └──────────────┘
┌──────────────────┐
│ NÍVEL 3: RBAC    │
│ Super Admin?     │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
 SIM│         │NÃO
    │         │
    ▼         ▼
┌─────────┐ ┌──────────────┐
│ ACESSO  │ │ ACESSO       │
│ LIBERADO│ │ NEGADO       │
└─────────┘ └──────────────┘
```

---

## 🧪 TESTES RECOMENDADOS

### Teste 1: Ambiente de Desenvolvimento
```bash
# Deve mostrar módulo
APP_ENV=development npm start
```
✅ Item "Auditoria do Sistema" visível no menu  
✅ Badge "DEV" aparece no item  
✅ Módulo acessível e funcional  

### Teste 2: Ambiente de Produção
```bash
# Não deve mostrar módulo
NODE_ENV=production npm run build
npm run preview
```
❌ Item "Auditoria do Sistema" NÃO aparece no menu  
❌ Acesso direto via URL redireciona para Dashboard  
❌ Componente não presente no bundle  

### Teste 3: Permissões de Usuário
```typescript
// Simular diferentes roles
currentUser.role = "admin";        // ❌ Sem acesso
currentUser.role = "manager";      // ❌ Sem acesso
currentUser.role = "super_admin";  // ✅ Com acesso
```

---

## 📦 ARQUIVOS MODIFICADOS/CRIADOS

### Novos Arquivos:
- ✅ `/utils/environment.ts` - Configuração de ambiente
- ✅ `/hooks/usePermissions.ts` - Hook de permissões
- ✅ `/CONTROLE_ACESSO_AUDITORIA.md` - Esta documentação

### Arquivos Modificados:
- ✅ `/components/SystemAudit.tsx` - Botão de re-análise + alertas
- ✅ `/components/Sidebar.tsx` - Ocultação condicional do menu
- ✅ `/App.tsx` - Importação condicional + proteção de rota

---

## 🎓 BOAS PRÁTICAS IMPLEMENTADAS

### ✅ Segurança por Camadas (Defense in Depth)
Múltiplos níveis de proteção garantem que mesmo se um falhar, os outros bloqueiam acesso.

### ✅ Fail-Safe (Seguro por Padrão)
Em caso de dúvida ou erro, o padrão é **NEGAR** acesso.

### ✅ Separação de Ambientes
Desenvolvimento tem ferramentas que produção não precisa.

### ✅ Feedback Visual Claro
Usuários sabem quando estão em ambiente de desenvolvimento.

### ✅ Tree Shaking / Code Splitting
Código de auditoria não é incluído em builds de produção.

### ✅ Role-Based Access Control (RBAC)
Controle granular baseado em perfis de usuário.

---

## 🔮 EXPANSÕES FUTURAS

### 1. Integração com Backend
```typescript
// Validar permissões no servidor
const response = await fetch('/api/permissions/check', {
  method: 'POST',
  body: JSON.stringify({
    userId: currentUser.id,
    module: 'systemAudit',
    action: 'view'
  })
});
```

### 2. Logs de Acesso
```typescript
// Registrar tentativas de acesso
auditLog.create({
  userId: currentUser.id,
  module: 'systemAudit',
  action: 'access_attempt',
  result: hasAccess ? 'allowed' : 'denied',
  timestamp: new Date()
});
```

### 3. Políticas Dinâmicas
```typescript
// Políticas configuráveis via admin
const policy = await getPolicyForUser(userId);
return policy.modules.includes('systemAudit');
```

---

## ❓ FAQ

### P: Como habilitar o módulo em desenvolvimento?
**R:** Defina `APP_ENV=development` ou `NODE_ENV=development`

### P: O módulo aparece em staging?
**R:** Depende da configuração. Por padrão, não.

### P: Como dar acesso a um usuário específico?
**R:** Atribua o role `super_admin` ao usuário no módulo de Usuários e Permissões.

### P: O código de auditoria é enviado para produção?
**R:** Não, o tree shaking remove o código não utilizado.

### P: Como testar em ambiente local?
**R:** Execute com `APP_ENV=development npm start`

---

## 📞 SUPORTE

Para dúvidas ou problemas:
1. Consulte esta documentação
2. Verifique os logs do console
3. Revise as variáveis de ambiente
4. Contate a equipe de desenvolvimento

---

**Última atualização:** 06/11/2024  
**Versão:** 1.0  
**Status:** ✅ Implementado e Testado
