# 🔐 Instruções: Certificado Digital A1 para Assinatura XML NF-e

---

## 📋 **PRÉ-REQUISITOS**

Você precisará de:
- ✅ Certificado Digital A1 (arquivo `.pfx` ou `.p12`)
- ✅ Senha do certificado
- ✅ OpenSSL instalado no computador

---

## 🔧 **INSTALAÇÃO DO OPENSSL**

### **Windows:**
1. Baixar de: https://slproweb.com/products/Win32OpenSSL.html
2. Instalar versão "Win64 OpenSSL v3.x.x Light"
3. Adicionar ao PATH: `C:\Program Files\OpenSSL-Win64\bin`

### **macOS:**
```bash
brew install openssl
```

### **Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install openssl
```

---

## 📝 **CONVERSÃO DE .PFX PARA .PEM**

### **Passo 1: Extrair o Certificado X.509**

```bash
openssl pkcs12 -in seu-certificado.pfx -clcerts -nokeys -out certificado.pem
```

**O que acontece:**
- Você será solicitado a digitar a senha do arquivo `.pfx`
- Arquivo `certificado.pem` será criado (contém apenas o certificado público)

### **Passo 2: Extrair a Chave Privada**

```bash
openssl pkcs12 -in seu-certificado.pfx -nocerts -nodes -out chave-privada.pem
```

**O que acontece:**
- Você será solicitado a digitar a senha do arquivo `.pfx` novamente
- Arquivo `chave-privada.pem` será criado (contém a chave privada)
- Opção `-nodes` = sem criptografia adicional (necessário para o sistema)

---

## ✅ **VALIDAÇÃO DOS ARQUIVOS GERADOS**

### **Certificado PEM (certificado.pem):**
```
-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIBADANBgkqhkiG9w0BAQsFADBIMQswCQYDVQQGEwJCUjEL
... (várias linhas de texto base64) ...
-----END CERTIFICATE-----
```

### **Chave Privada PEM (chave-privada.pem):**
```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC3...
... (várias linhas de texto base64) ...
-----END PRIVATE KEY-----
```

**OU:**

```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEAt8...
... (várias linhas de texto base64) ...
-----END RSA PRIVATE KEY-----
```

---

## 🔒 **SEGURANÇA**

⚠️ **IMPORTANTE:**

1. **NUNCA compartilhe** o arquivo `chave-privada.pem`
2. **NUNCA envie** a chave privada por email ou chat
3. **Armazene com segurança** em local protegido
4. **Delete após uso** no sistema (se possível)
5. O sistema **NÃO armazena** o certificado nem a chave privada

---

## 📤 **COMO USAR NO SISTEMA**

### **Opção 1: Upload de Arquivos**

1. Gerar XML da NF-e
2. Clicar em "Assinar" quando solicitado
3. Na aba **"Upload de Arquivo"**:
   - Selecionar `certificado.pem`
   - Selecionar `chave-privada.pem`
4. Clicar em "Validar e Usar Certificado"
5. Clicar em "Assinar XML Digitalmente"

### **Opção 2: Colar Texto**

1. Gerar XML da NF-e
2. Clicar em "Assinar" quando solicitado
3. Na aba **"Colar Texto"**:
   - Abrir `certificado.pem` no bloco de notas
   - Copiar TODO o conteúdo (incluindo `-----BEGIN` e `-----END`)
   - Colar no campo "Certificado PEM"
   - Abrir `chave-privada.pem` no bloco de notas
   - Copiar TODO o conteúdo
   - Colar no campo "Chave Privada PEM"
4. Clicar em "Validar e Usar Certificado"
5. Clicar em "Assinar XML Digitalmente"

---

## 🐛 **SOLUÇÃO DE PROBLEMAS**

### **Erro: "Certificado PEM inválido"**
✅ Verifique se copiou TODO o conteúdo incluindo as linhas `-----BEGIN CERTIFICATE-----` e `-----END CERTIFICATE-----`

### **Erro: "Chave privada PEM inválida"**
✅ Verifique se copiou TODO o conteúdo incluindo as linhas `-----BEGIN PRIVATE KEY-----` e `-----END PRIVATE KEY-----`

### **Erro: "Assinatura inválida"**
✅ Certificado e chave privada não correspondem
✅ Gere novamente os arquivos PEM a partir do mesmo `.pfx`

### **Erro: "Certificado expirado"**
✅ Renove seu certificado digital A1 com a Autoridade Certificadora

---

## 📞 **SUPORTE**

Se encontrar problemas:
1. Verifique se o OpenSSL está instalado: `openssl version`
2. Verifique se os arquivos PEM foram gerados corretamente
3. Tente converter novamente
4. Verifique a validade do certificado

---

## 🎯 **EXEMPLO COMPLETO**

```bash
# 1. Navegar até a pasta do certificado
cd ~/Downloads

# 2. Extrair certificado
openssl pkcs12 -in meu-cert.pfx -clcerts -nokeys -out certificado.pem
# Digite a senha quando solicitado

# 3. Extrair chave privada
openssl pkcs12 -in meu-cert.pfx -nocerts -nodes -out chave-privada.pem
# Digite a senha quando solicitado

# 4. Verificar arquivos criados
ls -lh certificado.pem chave-privada.pem

# 5. Visualizar conteúdo (opcional)
cat certificado.pem
cat chave-privada.pem

# Agora você pode usar esses arquivos no sistema!
```

---

## ✅ **CHECKLIST**

Antes de usar no sistema:

- [ ] OpenSSL instalado e funcionando
- [ ] Arquivo `.pfx` original disponível
- [ ] Senha do certificado conhecida
- [ ] Arquivo `certificado.pem` gerado com sucesso
- [ ] Arquivo `chave-privada.pem` gerado com sucesso
- [ ] Ambos os arquivos contém `-----BEGIN` e `-----END`
- [ ] Certificado não está expirado

---

**Pronto! Agora você pode assinar seus XMLs NF-e digitalmente! 🚀**
