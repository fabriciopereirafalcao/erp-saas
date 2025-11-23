# 📝 Comandos Git - Assinatura Digital NF-e

---

## 🔍 **VERIFICAR STATUS**

```bash
git status
```

**Resultado esperado:**
```
Arquivos não rastreados:
  components/CertificateManager.tsx
  components/CertificateUploadPEM.tsx
  components/SignXmlDialog.tsx
  supabase/functions/server/nfe-signature.tsx
  docs/CERTIFICADO-DIGITAL-INSTRUCOES.md
  docs/ASSINATURA-DIGITAL-RESUMO.md
  docs/GIT-COMANDOS.md

Arquivos modificados:
  components/TaxInvoicing.tsx
  supabase/functions/server/fiscal/routes.ts
```

---

## ➕ **ADICIONAR ARQUIVOS NOVOS**

```bash
# Backend
git add supabase/functions/server/nfe-signature.tsx

# Frontend
git add components/CertificateManager.tsx
git add components/CertificateUploadPEM.tsx
git add components/SignXmlDialog.tsx

# Documentação
git add docs/CERTIFICADO-DIGITAL-INSTRUCOES.md
git add docs/ASSINATURA-DIGITAL-RESUMO.md
git add docs/GIT-COMANDOS.md
```

**OU (Adicionar todos de uma vez):**
```bash
git add supabase/functions/server/nfe-signature.tsx \
        components/CertificateManager.tsx \
        components/CertificateUploadPEM.tsx \
        components/SignXmlDialog.tsx \
        docs/CERTIFICADO-DIGITAL-INSTRUCOES.md \
        docs/ASSINATURA-DIGITAL-RESUMO.md \
        docs/GIT-COMANDOS.md
```

---

## ✏️ **ADICIONAR ARQUIVOS MODIFICADOS**

```bash
git add supabase/functions/server/fiscal/routes.ts
git add components/TaxInvoicing.tsx
```

---

## 💾 **COMMIT**

```bash
git commit -m "feat(fiscal): Implementar e integrar assinatura digital XML NF-e

ASSINATURA DIGITAL COMPLETA:
- Módulo de assinatura XML-DSig (RSA-SHA256, C14N)
- Endpoints REST para assinatura e validação
- Componentes React para upload de certificado PEM
- Diálogo completo com 4 estágios (Upload→Assinando→Sucesso→Erro)
- Integração total no fluxo de emissão de NF-e

BACKEND (4 endpoints):
- POST /fiscal/nfe/assinar-xml (novo)
- POST /fiscal/nfe/validar-assinatura (novo)
- Módulo nfe-signature.tsx (~350 linhas)
- Suporte a certificado A1 formato PEM

FRONTEND (3 componentes + integração):
- CertificateManager.tsx (upload .pfx com instruções)
- CertificateUploadPEM.tsx (upload PEM com tabs)
- SignXmlDialog.tsx (diálogo completo 4 estágios)
- TaxInvoicing.tsx (integração completa)

FLUXO IMPLEMENTADO:
1. Gerar XML → Download automático (-NAO-ASSINADO.xml)
2. Toast interativo: 'Deseja assinar digitalmente agora?' [Assinar]
3. SignXmlDialog: Upload certificado PEM → Validar → Assinar
4. Download XML assinado (-ASSINADO.xml)
5. Opção 'Assinar Digitalmente' no menu dropdown de NFes

DOCUMENTAÇÃO:
- Tutorial completo conversão PFX→PEM (OpenSSL)
- Resumo técnico da implementação
- Instruções de uso e troubleshooting
- Comandos Git completos

SEGURANÇA:
- Certificados não armazenados (processamento em memória)
- Transmissão via HTTPS
- Autenticação JWT (Supabase Auth)
- Validação de formato PEM

PADRÕES:
- XML-DSig W3C
- SEFAZ 4.0
- Algoritmo: RSA-SHA256
- Canonização: C14N
- Digest: SHA-256

ARQUIVOS:
Novos (7):
  - supabase/functions/server/nfe-signature.tsx
  - components/CertificateManager.tsx
  - components/CertificateUploadPEM.tsx
  - components/SignXmlDialog.tsx
  - docs/CERTIFICADO-DIGITAL-INSTRUCOES.md
  - docs/ASSINATURA-DIGITAL-RESUMO.md
  - docs/GIT-COMANDOS.md

Modificados (2):
  - supabase/functions/server/fiscal/routes.ts (+150 linhas)
  - components/TaxInvoicing.tsx (+40 linhas)

TESTES:
- Validar com certificado A1 real
- Verificar toast interativo funciona
- Confirmar download XML assinado
- Testar menu dropdown 'Assinar Digitalmente'

PRÓXIMOS PASSOS:
1. ✅ Geração de XML (concluído)
2. ✅ Correção CSOSN 102 (concluído)
3. ✅ Assinatura Digital (CONCLUÍDO AGORA)
4. 🔄 Validação XSD SEFAZ (próximo)
5. 📤 Transmissão SEFAZ (próximo)

Status: ✅ Pronto para deploy e testes com certificado real"
```

---

## 🚀 **PUSH PARA REPOSITÓRIO**

```bash
# Para branch main
git push origin main

# OU para branch master
git push origin master

# OU para branch de desenvolvimento
git push origin develop
```

---

## 🔍 **VERIFICAR COMMIT**

```bash
# Ver último commit
git log -1

# Ver arquivos do último commit
git show --name-status

# Ver diff do último commit
git show
```

---

## 🔙 **DESFAZER (SE NECESSÁRIO)**

### **Antes do commit:**
```bash
# Remover arquivo do stage
git reset HEAD nome-do-arquivo.tsx

# Desfazer alterações em arquivo
git checkout -- nome-do-arquivo.tsx
```

### **Depois do commit (antes do push):**
```bash
# Desfazer último commit (mantém alterações)
git reset --soft HEAD~1

# Desfazer último commit (descarta alterações)
git reset --hard HEAD~1
```

### **Depois do push:**
```bash
# Reverter commit criando novo commit
git revert HEAD
git push origin main
```

---

## ✅ **CHECKLIST PRÉ-PUSH**

```
□ git status executado
□ Todos os 7 arquivos novos adicionados
□ Todos os 2 arquivos modificados adicionados
□ Commit feito com mensagem descritiva
□ Nenhum arquivo sensível (senhas, chaves) incluído
□ Branch correto selecionado
□ Internet conectada
□ Pronto para push!
```

---

## 📊 **RESUMO DO COMMIT**

| Métrica | Valor |
|---------|-------|
| Arquivos novos | 7 |
| Arquivos modificados | 2 |
| Total de arquivos | 9 |
| Linhas adicionadas | ~1.500+ |
| Endpoints criados | 3 |
| Componentes criados | 3 |
| Documentos criados | 3 |

---

## 🎯 **APÓS O PUSH**

1. ✅ Aguardar deploy automático (2-3 minutos)
2. ✅ Verificar Edge Functions no Supabase Dashboard
3. ✅ Testar geração de XML
4. ✅ Testar toast interativo
5. ✅ Converter certificado PFX para PEM
6. ✅ Testar assinatura digital
7. ✅ Validar XML assinado

---

**Tudo pronto para o commit! Execute os comandos na sequência acima. 🚀**
