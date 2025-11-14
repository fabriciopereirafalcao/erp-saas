# Melhoria: Seleção de Bancos Brasileiros

## Implementação

Foi adicionada uma lista de seleção (dropdown) com os principais bancos brasileiros no campo "Nome do Banco" ao cadastrar uma nova conta bancária no módulo **Minha Empresa**.

## Mudanças Realizadas

### 1. Lista de Bancos Brasileiros

Criada constante `BANCOS_BRASILEIROS` com 30 bancos principais do Brasil, incluindo:

- **Bancos Tradicionais:** Banco do Brasil, Bradesco, Itaú, Santander, Caixa Econômica Federal
- **Bancos Digitais:** Nubank, Banco Inter, C6 Bank, Banco Original, BS2
- **Fintechs:** Mercado Pago, PagSeguro
- **Cooperativas:** Sicoob, Sicredi, Unicred
- **Bancos Regionais:** Banrisul, BRB
- **Bancos de Investimento:** BTG Pactual
- **Outros:** Banco Pan, Safra, Daycoval, etc.

```typescript
const BANCOS_BRASILEIROS = [
  { codigo: "001", nome: "Banco do Brasil" },
  { codigo: "033", nome: "Santander" },
  { codigo: "104", nome: "Caixa Econômica Federal" },
  { codigo: "237", nome: "Bradesco" },
  { codigo: "341", nome: "Itaú" },
  // ... mais 25 bancos
].sort((a, b) => a.nome.localeCompare(b.nome));
```

### 2. Substituição do Campo Input por Select

**Antes (Input livre):**
```tsx
<Label>Nome do Banco *</Label>
<Input
  value={newBank.bankName}
  onChange={(e) => setNewBank({ ...newBank, bankName: e.target.value })}
  placeholder="Ex: Banco do Brasil"
/>
```

**Depois (Select + Input condicional):**
```tsx
<Label>Nome do Banco *</Label>
<Select
  value={newBank.bankName === "" || BANCOS_BRASILEIROS.some(b => b.nome === newBank.bankName) 
    ? newBank.bankName 
    : "OUTRO"}
  onValueChange={(value) => {
    if (value === "OUTRO") {
      setNewBank({ ...newBank, bankName: "" });
    } else {
      setNewBank({ ...newBank, bankName: value });
    }
  }}
>
  <SelectTrigger>
    <SelectValue placeholder="Selecione o banco" />
  </SelectTrigger>
  <SelectContent>
    {BANCOS_BRASILEIROS.map(banco => (
      <SelectItem key={banco.codigo} value={banco.nome}>
        {banco.codigo} - {banco.nome}
      </SelectItem>
    ))}
    <SelectItem value="OUTRO">✏️ Outro (digitar manualmente)</SelectItem>
  </SelectContent>
</Select>
{/* Campo de entrada manual quando "Outro" é selecionado */}
{newBank.bankName === "" || (!BANCOS_BRASILEIROS.some(b => b.nome === newBank.bankName) && newBank.bankName !== "") ? (
  <Input
    className="mt-2"
    value={newBank.bankName}
    onChange={(e) => setNewBank({ ...newBank, bankName: e.target.value })}
    placeholder="Digite o nome do banco"
  />
) : null}
```

## Funcionalidades

### 1. Seleção Rápida
- Lista suspensa com 30 bancos principais
- Ordenados alfabeticamente
- Exibição do código do banco (3 dígitos) + nome
- Exemplo: "001 - Banco do Brasil"

### 2. Opção "Outro"
- Última opção da lista: "✏️ Outro (digitar manualmente)"
- Ao selecionar, aparece campo de texto para entrada manual
- Permite cadastrar bancos não listados (cooperativas locais, bancos menores, etc.)

### 3. Comportamento Inteligente
- Se o banco já cadastrado está na lista → mostra no Select
- Se o banco cadastrado não está na lista → mostra opção "OUTRO" + campo preenchido
- Campo de entrada manual só aparece quando necessário

## Benefícios

✅ **Padronização:** Nomes de bancos consistentes no sistema

✅ **Agilidade:** Seleção rápida ao invés de digitação manual

✅ **Redução de Erros:** Evita erros de digitação como "Itau" vs "Itaú" vs "Banco Itaú"

✅ **Flexibilidade:** Opção "Outro" permite cadastrar qualquer banco

✅ **UX Melhorada:** Interface mais profissional e amigável

✅ **Códigos FEBRABAN:** Exibição dos códigos oficiais dos bancos

## Exemplos de Uso

### Exemplo 1: Cadastrar Banco da Lista
1. Abrir modal "Adicionar Conta Bancária"
2. Clicar no campo "Nome do Banco"
3. Selecionar "341 - Itaú"
4. Preencher demais campos (agência, conta, etc.)
5. Salvar

**Resultado:** `bankName: "Itaú"`

### Exemplo 2: Cadastrar Banco Personalizado
1. Abrir modal "Adicionar Conta Bancária"
2. Clicar no campo "Nome do Banco"
3. Selecionar "✏️ Outro (digitar manualmente)"
4. Aparece campo de texto abaixo
5. Digitar "Banco Cooperativo do Ceará"
6. Preencher demais campos
7. Salvar

**Resultado:** `bankName: "Banco Cooperativo do Ceará"`

### Exemplo 3: Edição de Banco Existente
- **Banco na lista:** Exibe normalmente no Select
- **Banco fora da lista:** Exibe opção "OUTRO" selecionada + campo com valor

## Bancos Incluídos (30)

| Código | Nome |
|--------|------|
| 001 | Banco do Brasil |
| 033 | Santander |
| 041 | Banrisul |
| 070 | BRB - Banco de Brasília |
| 077 | Banco Inter |
| 104 | Caixa Econômica Federal |
| 136 | Unicred |
| 208 | Banco BTG Pactual |
| 212 | Banco Original |
| 218 | Banco BS2 |
| 237 | Bradesco |
| 246 | Banco ABC Brasil |
| 260 | Nubank |
| 290 | Pagseguro |
| 318 | Banco BMG |
| 323 | Mercado Pago |
| 336 | Banco C6 |
| 341 | Itaú |
| 389 | Banco Mercantil |
| 422 | Banco Safra |
| 473 | Banco Caixa Geral |
| 623 | Banco Pan |
| 637 | Banco Sofisa |
| 653 | Banco Indusval |
| 655 | Banco Votorantim |
| 707 | Banco Daycoval |
| 739 | Banco Cetelem |
| 745 | Citibank |
| 748 | Sicredi |
| 756 | Bancoob (Sicoob) |

## Arquivo Modificado

- `/components/CompanySettings.tsx`
  - Adicionada constante `BANCOS_BRASILEIROS`
  - Substituído `Input` por `Select` com opção "Outro"
  - Adicionado campo `Input` condicional para entrada manual

## Compatibilidade

✅ **Retrocompatível:** Bancos já cadastrados continuam funcionando normalmente

✅ **Dados existentes:** Preserva nomes de bancos personalizados

✅ **Validação:** Mantém a validação de campo obrigatório

## Possíveis Melhorias Futuras

💡 **Busca/Filtro:** Adicionar campo de busca no Select para encontrar bancos rapidamente

💡 **Agências:** Integrar com API do Banco Central para validar agências

💡 **Dados Bancários:** Auto-preencher tipo de conta baseado no banco selecionado

💡 **Logos:** Exibir logo do banco no dropdown

💡 **API FEBRABAN:** Integrar com lista oficial atualizada dinamicamente

## Status

🟢 **IMPLEMENTADO E FUNCIONAL**

Data: 07/11/2025
