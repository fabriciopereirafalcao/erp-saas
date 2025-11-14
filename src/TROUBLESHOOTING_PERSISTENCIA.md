# 🔧 Troubleshooting - Problema de Persistência de Dados

## 🎯 Problema Reportado

**Sintoma:** Dados cadastrados (clientes, fornecedores, produtos) desaparecem ao navegar entre módulos.

---

## ✅ Implementações Realizadas

### 1. Sistema de Persistência com localStorage ✅
- **Arquivo:** `/utils/localStorage.ts`
- **Status:** Implementado
- **Funcionalidades:**
  - Salvamento automático
  - Carregamento automático
  - Verificação de disponibilidade
  - Logs de debug

### 2. Integração no ERPContext ✅
- **Arquivo:** `/contexts/ERPContext.tsx`
- **Status:** Implementado
- **Funcionalidades:**
  - 18 useEffect hooks para auto-save
  - Inicialização com dados do localStorage
  - Todos os estados principais persistidos

### 3. Interface de Debug ✅
- **Componente:** `DebugPersistence`
- **Localização:** Botão flutuante no canto inferior direito
- **Funcionalidades:**
  - Monitoramento em tempo real
  - Visualização de dados salvos
  - Teste de disponibilidade
  - Dump no console

### 4. Componente de Status ✅
- **Componente:** `DataPersistenceStatus`
- **Localização:** Dashboard (topo)
- **Funcionalidades:**
  - Indicador de status
  - Contador de registros
  - Botão de teste
  - Botão de limpeza

---

## 🔍 Como Diagnosticar o Problema

### Passo 1: Verificar se localStorage está disponível

**Método 1 - Via Interface:**
1. Acesse o **Dashboard**
2. Procure o card **"Persistência de Dados"**
3. Clique no botão **"Testar"**
4. Observe o resultado no toast e no console

**Método 2 - Via Console:**
```javascript
// Abra o console do navegador (F12)
console.log('localStorage disponível:', typeof Storage !== 'undefined');

// Teste de escrita
try {
  localStorage.setItem('test', 'value');
  console.log('Teste de escrita: ✅');
  localStorage.removeItem('test');
} catch (e) {
  console.log('Teste de escrita: ❌', e);
}
```

**Método 3 - Via Debug Component:**
1. Clique no botão **"Debug Storage"** (canto inferior direito)
2. Observe o status: verde = disponível, vermelho = indisponível

---

### Passo 2: Verificar se os dados estão sendo salvos

**Via Debug Component:**
1. Clique em **"Debug Storage"**
2. Observe a lista de chaves
3. Verifique se há ícones verdes (✓) ao lado dos dados
4. Veja quantos itens estão salvos em cada categoria

**Via Console do Navegador:**
```javascript
// Ver todos os dados salvos
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('erp_system_')) {
    console.log(key, localStorage.getItem(key));
  }
});

// Ver dados específicos
console.log('Clientes:', localStorage.getItem('erp_system_customers'));
```

**Via DevTools:**
1. Abra **DevTools** (F12)
2. Vá para a aba **Application** (Chrome) ou **Storage** (Firefox)
3. Expanda **Local Storage**
4. Clique no domínio do site
5. Procure por chaves começando com `erp_system_`

---

### Passo 3: Testar o fluxo completo

**Teste Manual:**
1. **Cadastrar:** Adicione um novo cliente
2. **Verificar Imediato:** Abra o console e digite:
   ```javascript
   JSON.parse(localStorage.getItem('erp_system_customers'))
   ```
3. **Navegar:** Vá para outro módulo (ex: Dashboard)
4. **Voltar:** Retorne para Clientes
5. **Verificar:** O cliente ainda está lá?

**Teste com Logs:**
1. Abra o console (F12)
2. Observe os logs automáticos:
   - `✅ Dados salvos: erp_system_customers`
   - `📖 Dados carregados: erp_system_customers`
3. Cada vez que você cadastra algo, deve aparecer um log verde

---

## 🚨 Possíveis Causas e Soluções

### Causa 1: Navegação Privada/Anônima ❌

**Sintomas:**
- Componente mostra "⚠️ Persistência Desabilitada"
- Card vermelho no Dashboard
- localStorage não disponível

**Solução:**
- Use uma janela normal (não privada/anônima)
- Ou aceite que os dados não serão persistidos neste modo

---

### Causa 2: Quota do localStorage Excedida ❌

**Sintomas:**
- Erro: "QuotaExceededError"
- Logs de erro no console
- Alguns dados salvam, outros não

**Solução:**
```javascript
// Limpar dados antigos
localStorage.clear();

// Ou limpar apenas dados do ERP
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('erp_system_')) {
    localStorage.removeItem(key);
  }
});

// Recarregar página
location.reload();
```

---

### Causa 3: Bloqueio por Configurações do Navegador ❌

**Sintomas:**
- localStorage retorna null sempre
- Sem erros no console
- Teste de disponibilidade falha

**Solução:**
1. **Chrome/Edge:**
   - Settings → Privacy and security → Cookies and other site data
   - Certifique-se de que "Allow all cookies" está marcado
   - Ou adicione exceção para o site

2. **Firefox:**
   - Options → Privacy & Security
   - Certifique-se de que "Remember history" está selecionado

3. **Safari:**
   - Preferences → Privacy
   - Desmarque "Block all cookies"

---

### Causa 4: Hot Reload Reinicializando Estado ⚠️

**Sintomas:**
- Dados aparecem por um momento e depois somem
- Acontece apenas durante desenvolvimento
- Após deploy não ocorre

**Solução:**
- Este é um comportamento esperado em desenvolvimento
- Após build/deploy o problema não ocorrerá
- Para testar: faça refresh manual (F5) ao invés de hot reload

---

### Causa 5: Estado sendo resetado por alguma lógica ❌

**Sintomas:**
- Dados salvam no localStorage
- Mas o estado do React reseta

**Diagnóstico:**
```javascript
// No console, após cadastrar um cliente:
console.log('localStorage:', JSON.parse(localStorage.getItem('erp_system_customers')));

// Se mostra os dados corretos, o problema é no carregamento do estado
```

**Solução:**
- Verificar se não há lógica que reseta o estado
- Verificar se o ERPContext está sendo desmontado/remontado

---

## 🧪 Testes de Validação

### Teste 1: localStorage Básico ✅
```javascript
// Console do navegador
localStorage.setItem('test', 'hello');
console.log(localStorage.getItem('test')); // deve retornar 'hello'
localStorage.removeItem('test');
```

### Teste 2: Persistência ERP ✅
```javascript
// 1. Cadastre um cliente
// 2. No console:
const customers = JSON.parse(localStorage.getItem('erp_system_customers'));
console.log('Total de clientes:', customers.length);
console.log('Último cliente:', customers[customers.length - 1]);
```

### Teste 3: Reload Completo ✅
```javascript
// 1. Cadastre dados
// 2. Abra o console e copie isso:
const backup = {};
Object.keys(localStorage).forEach(k => {
  if (k.startsWith('erp_system_')) backup[k] = localStorage.getItem(k);
});
console.log('Backup:', backup);

// 3. Pressione F5 (reload)
// 4. Cole de novo no console
// 5. Compare os resultados
```

---

## 📊 Logs de Debug Importantes

### Logs Normais (Tudo OK) ✅
```
✅ Dados salvos: erp_system_customers { itemCount: 5 }
📖 Dados carregados: erp_system_customers { itemCount: 5 }
```

### Logs de Problema ❌
```
❌ Erro ao salvar erp_system_customers no localStorage: QuotaExceededError
localStorage não disponível - usando valores padrão
📂 Nenhum dado encontrado para erp_system_customers - usando valor padrão
```

---

## 🔧 Ferramentas de Debug

### 1. Debug Component (Recomendado) 🎯
- **Localização:** Botão flutuante canto inferior direito
- **Vantagens:** Interface visual, atualização em tempo real
- **Como usar:** Clique no botão "Debug Storage"

### 2. Console do Navegador 🖥️
```javascript
// Dump completo do storage
Object.entries(localStorage).forEach(([k, v]) => {
  if (k.startsWith('erp_system_')) {
    console.log(`\n=== ${k} ===`);
    console.log(JSON.parse(v));
  }
});
```

### 3. DevTools Application Tab 📱
- Chrome DevTools → Application → Local Storage
- Visualização direta dos dados
- Pode editar/deletar manualmente

---

## 🎬 Vídeo de Teste (Passo a Passo)

### Cenário de Teste Completo:

1. **Abrir o sistema**
   - Observe o Dashboard
   - Verifique o card de persistência

2. **Abrir Debug**
   - Clique em "Debug Storage"
   - Veja status inicial (tudo vazio ou com dados anteriores)

3. **Cadastrar Cliente**
   - Vá para Clientes
   - Adicione um novo cliente
   - **Observe no Debug:** CUSTOMERS deve mostrar +1

4. **Navegar**
   - Vá para Dashboard
   - **Observe:** Debug ainda mostra os dados
   - Volte para Clientes
   - **Verifique:** Cliente ainda está lá

5. **Reload**
   - Pressione F5
   - **Verifique:** Cliente permanece após reload

6. **Fechar e Abrir**
   - Feche aba/navegador
   - Abra novamente
   - **Verifique:** Cliente ainda está lá

---

## 📞 Ainda com Problemas?

### Checklist Final:
- [ ] localStorage está disponível? (teste no console)
- [ ] Não está em modo privado/anônimo?
- [ ] Console mostra logs de salvamento (✅)?
- [ ] Debug Component mostra dados salvos?
- [ ] DevTools Application mostra as chaves `erp_system_*`?
- [ ] Após F5 os dados ainda estão no localStorage?

### Se TODOS os checkmarks estão ✅ mas os dados somem:

O problema pode estar no **carregamento inicial** do ERPContext. Verifique:

```javascript
// No console, logo após reload:
console.log('=== DIAGNÓSTICO INICIAL ===');
console.log('localStorage tem dados:', !!localStorage.getItem('erp_system_customers'));
console.log('Conteúdo:', localStorage.getItem('erp_system_customers'));
```

Se o localStorage TEM os dados mas eles não aparecem na interface, o problema está no código React, não no localStorage.

---

## 🔄 Próximos Passos se o Problema Persistir

1. **Compartilhe os logs:**
   - Abra o console
   - Copie TODOS os logs
   - Inclua especialmente os com ✅ ou ❌

2. **Compartilhe o Debug:**
   - Abra "Debug Storage"
   - Tire screenshot
   - Mostre o estado de cada chave

3. **Teste localStorage direto:**
   ```javascript
   // Cole isso no console e compartilhe o resultado
   const test = {test: true, data: new Date().toISOString()};
   localStorage.setItem('debug_test', JSON.stringify(test));
   console.log('Salvo:', test);
   const loaded = JSON.parse(localStorage.getItem('debug_test'));
   console.log('Carregado:', loaded);
   console.log('Match:', JSON.stringify(test) === JSON.stringify(loaded));
   ```

---

**Última Atualização:** 07/11/2024  
**Status:** Implementação Completa + Ferramentas de Debug
