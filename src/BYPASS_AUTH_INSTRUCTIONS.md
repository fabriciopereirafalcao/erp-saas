# 🔓 Instruções: Bypass de Autenticação

## O que é?

Sistema prático para **desabilitar temporariamente a autenticação** durante o desenvolvimento do frontend, permitindo trabalhar sem precisar fazer login a cada vez.

---

## 🚀 Como DESABILITAR a autenticação (status atual)

### ✅ ATUALMENTE ATIVO - Autenticação está DESABILITADA

A autenticação está **desabilitada** e o sistema usa dados MOCK.

**Confirmação visual:**
- Console mostra: `🔓 [BYPASS_AUTH] Autenticação desabilitada - usando dados MOCK`
- Você acessa o sistema diretamente sem tela de login
- Usuário logado: "Desenvolvedor" (dev@metaerp.com)

**Arquivo:** `/utils/environment.ts` (linha ~67)
```typescript
BYPASS_AUTH: IS_DEVELOPMENT && true,  // ✅ ATIVO
```

---

## 🔒 Como REATIVAR a autenticação

### Quando quiser voltar ao fluxo normal de login:

1. Abra o arquivo `/utils/environment.ts`
2. Localize a linha (aproximadamente linha 67):
   ```typescript
   BYPASS_AUTH: IS_DEVELOPMENT && true,
   ```
3. Mude `true` para `false`:
   ```typescript
   BYPASS_AUTH: IS_DEVELOPMENT && false,  // ✅ AUTENTICAÇÃO REATIVADA
   ```
4. Salve o arquivo
5. O preview irá recarregar automaticamente
6. Você verá a tela de login novamente

**Confirmação visual:**
- Tela de login/signup aparece
- Console NÃO mostra a mensagem de bypass
- Precisa fazer login com credenciais reais do Supabase

---

## 📊 Dados MOCK Utilizados

Quando o bypass está ativo, o sistema usa:

### Usuário:
- **ID:** dev-user-123
- **Email:** dev@metaerp.com
- **Nome:** Desenvolvedor
- **Role:** owner (acesso total)

### Empresa:
- **ID:** dev-company-123
- **Nome:** Empresa de Desenvolvimento
- **Plano:** enterprise (todas as features)
- **Status:** active (sem restrições)

---

## ⚡ Performance

### Ganho de velocidade:
- **Sem autenticação:** ~2-3 segundos mais rápido
- **Motivos:**
  - Não faz chamadas ao Supabase Auth
  - Não carrega perfil/empresa do banco
  - Carregamento instantâneo com dados MOCK

### Quando usar cada modo:

**BYPASS (true) - Recomendado para:**
- ✅ Desenvolvimento de UI/UX
- ✅ Testes de componentes visuais
- ✅ Ajustes de layout
- ✅ Implementação de features (não relacionadas a auth)
- ✅ Preview rápido para demonstrações

**AUTENTICAÇÃO REAL (false) - Necessário para:**
- 🔒 Testar fluxo de login/signup
- 🔒 Testar permissões por role
- 🔒 Validar integração com Supabase Auth
- 🔒 Testar recuperação de senha
- 🔒 Preparar para produção

---

## 🔐 Segurança

### ⚠️ IMPORTANTE:

1. **Apenas em desenvolvimento:**
   - O bypass **NUNCA** funciona em produção
   - Verifica `IS_DEVELOPMENT` antes de aplicar

2. **Código seguro:**
   ```typescript
   BYPASS_AUTH: IS_DEVELOPMENT && true,
   ```
   - Se `IS_DEVELOPMENT` for false (produção), o bypass é automaticamente false
   - Proteção dupla contra vazamento para produção

3. **Antes de ir para produção:**
   - Mude para `false`
   - Teste o fluxo completo de autenticação
   - Valide que tudo funciona normalmente

---

## 🛠️ Troubleshooting

### Mudei para false mas ainda vejo dados MOCK:
1. Limpe o cache do navegador (Ctrl+Shift+R)
2. Verifique o console - se ainda mostra mensagem de bypass, o arquivo não salvou
3. Recarregue o preview manualmente

### Mudei para true mas ainda vejo tela de login:
1. Verifique se `IS_DEVELOPMENT` está true no console
2. Confirme que a linha está exatamente assim: `BYPASS_AUTH: IS_DEVELOPMENT && true,`
3. Salve o arquivo e aguarde o reload do preview

### Quero testar com outro usuário MOCK:
1. Edite `/contexts/AuthContext.tsx`
2. Modifique as constantes `MOCK_USER`, `MOCK_PROFILE`, `MOCK_COMPANY`
3. Exemplo:
   ```typescript
   const MOCK_PROFILE: UserProfile = {
     id: 'dev-user-123',
     email: 'seu-email@teste.com',
     name: 'Seu Nome',
     company_id: 'dev-company-123',
     role: 'admin', // Mude o role aqui
   };
   ```

---

## 📝 Checklist Rápido

### Para desenvolver frontend SEM login:
- [ ] Abrir `/utils/environment.ts`
- [ ] Mudar para `BYPASS_AUTH: IS_DEVELOPMENT && true,`
- [ ] Salvar e confirmar mensagem no console
- [ ] Desenvolver livremente 🎨

### Para testar autenticação COMPLETA:
- [ ] Abrir `/utils/environment.ts`
- [ ] Mudar para `BYPASS_AUTH: IS_DEVELOPMENT && false,`
- [ ] Salvar e confirmar tela de login aparece
- [ ] Testar login/signup normalmente 🔒

---

## 💡 Dica Pro

Mantenha um comentário no código para lembrar o status:

```typescript
// 🔓 DESENVOLVIMENTO - Auth desabilitada
BYPASS_AUTH: IS_DEVELOPMENT && true,

// ou

// 🔒 TESTE DE PRODUÇÃO - Auth habilitada
BYPASS_AUTH: IS_DEVELOPMENT && false,
```

---

**Última atualização:** 2025-11-12  
**Status Atual:** 🔓 Bypass ATIVO (autenticação desabilitada)
