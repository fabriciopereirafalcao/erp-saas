# 📧 Sistema de Convites - README

## 🚀 Início Rápido

### Para convidar um usuário:

1. **Acesse**: Usuários e Permissões (menu lateral)
2. **Clique**: "Convidar Usuário"
3. **Preencha**: Email e Nível de Permissão
4. **Copie**: O link gerado
5. **Envie**: Para o novo usuário (email, WhatsApp, etc)

### Para aceitar um convite:

1. **Clique**: No link recebido
2. **Preencha**: Seu nome e crie uma senha
3. **Pronto**: Sua conta está criada!

---

## 🎯 Níveis de Permissão

| Role | Descrição | Pode Convidar? | Pode Alterar Roles? |
|------|-----------|----------------|---------------------|
| **Owner** | Proprietário da conta | ✅ Sim | ✅ Sim |
| **Admin** | Administrador | ✅ Sim | ❌ Não |
| **Manager** | Gerente | ❌ Não | ❌ Não |
| **User** | Usuário padrão | ❌ Não | ❌ Não |

---

## 📁 Arquivos do Sistema

### **Backend**
- `/supabase/functions/server/index.tsx` - Rotas de API

### **Frontend**
- `/components/InviteUserDialog.tsx` - Modal de convite
- `/components/AcceptInvite.tsx` - Tela de aceite
- `/components/UsersPermissions.tsx` - Gerenciamento de usuários
- `/App.tsx` - Roteamento principal

### **Utilitários**
- `/utils/userManagement.ts` - Funções de API

### **Documentação**
- `/docs/USER_PERMISSIONS_SYSTEM.md` - Documentação técnica completa
- `/docs/PERMISSIONS_SUMMARY.md` - Resumo visual
- `/docs/INVITE_SYSTEM_COMPLETE.md` - Sistema completo
- `/docs/TESTING_GUIDE.md` - Guia de testes
- `/docs/README_CONVITES.md` - Este arquivo

---

## 🔧 Endpoints de API

### Listar Usuários
```
GET /make-server-686b5e88/users
Authorization: Bearer {access_token}
```

### Criar Convite
```
POST /make-server-686b5e88/users/invite
Authorization: Bearer {access_token}
Body: { "email": "user@email.com", "role": "manager" }
```

### Aceitar Convite
```
POST /make-server-686b5e88/users/accept-invite
Body: { "token": "uuid", "name": "Nome", "password": "senha" }
```

### Excluir Usuário (Owner only)
```
DELETE /make-server-686b5e88/users/{userId}
Authorization: Bearer {access_token}
```

### Alterar Role (Owner only)
```
PATCH /make-server-686b5e88/users/{userId}/role
Authorization: Bearer {access_token}
Body: { "role": "admin" }
```

---

## 🛡️ Segurança

- ✅ Tokens únicos (UUID)
- ✅ Expiração automática (7 dias)
- ✅ Validação de permissões
- ✅ Rollback automático em erros
- ✅ Owner não pode ser alterado/excluído
- ✅ Usuários vinculados à empresa

---

## ❓ FAQ

### **Como reenviar um convite?**
Atualmente, crie um novo convite. O sistema permite múltiplos convites para o mesmo email (mas apenas um pode ser aceito).

### **O convite expira?**
Sim, convites expiram em 7 dias após a criação.

### **Posso convidar alguém que já tem conta?**
Não. Se o email já está cadastrado na empresa, o sistema exibirá erro.

### **Como alterar a permissão de um usuário?**
Apenas o Owner pode alterar. Vá em Usuários e Permissões → Menu do usuário → Editar.

### **Posso excluir minha própria conta?**
Não. O Owner não pode excluir a si mesmo. Use "Excluir Empresa" se quiser encerrar a conta.

### **Quantos usuários posso convidar?**
Atualmente não há limite. Isso pode mudar conforme o plano de assinatura.

---

## 🐛 Problemas e Soluções

| Problema | Solução |
|----------|---------|
| "Token inválido" | Verifique se copiou o link completo |
| "Convite expirado" | Solicite novo convite (>7 dias) |
| "Email já cadastrado" | Use outro email ou faça login |
| "Não autorizado" | Apenas Owner/Admin podem convidar |
| Link não funciona | Verifique se backend está rodando |

---

## 📞 Suporte

Para problemas técnicos, consulte:
1. **TESTING_GUIDE.md** - Guia completo de testes
2. **USER_PERMISSIONS_SYSTEM.md** - Documentação técnica
3. Logs do servidor em `/supabase/functions/server/`

---

## ✅ Status

- ✅ Backend: 100% funcional
- ✅ Frontend: 100% funcional
- ✅ Validações: 100% implementadas
- ✅ Segurança: 100% implementada
- 🚧 Email automático: Pendente (envio manual por enquanto)

---

**Última atualização**: Novembro 2024  
**Versão**: 1.0.0  
**Status**: Pronto para produção ✅
