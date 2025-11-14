# 📖 Guia do Histórico de Alterações - Minha Empresa

**Versão:** 1.0  
**Última Atualização:** 07/11/2024

---

## 🎯 Visão Geral

O **Histórico de Alterações** é um recurso que registra automaticamente todas as modificações realizadas nas configurações da empresa, permitindo rastreabilidade completa e auditoria de mudanças.

---

## 🚀 Como Usar

### Acessando o Histórico

1. Navegue até **Minha Empresa** no menu lateral
2. Clique no botão **"Histórico"** no canto superior direito
3. Um modal será aberto com todas as alterações registradas

### Interface do Histórico

```
┌─────────────────────────────────────────────────────────────┐
│  📜 Histórico de Alterações                            [X]   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  📅 07/11/2024  ⏰ 14:30:45          [3 campos]     │  │
│  │  👤 Alterado por: Administrador                      │  │
│  │  ─────────────────────────────────────────────────   │  │
│  │                                                       │  │
│  │  📝 Razão Social                                     │  │
│  │  ├─ Valor Anterior: [Empresa ABC Ltda]              │  │
│  │  └─ Novo Valor: [Empresa XYZ Ltda]                  │  │
│  │                                                       │  │
│  │  📝 CNPJ                                             │  │
│  │  ├─ Valor Anterior: [00.000.000/0001-00]            │  │
│  │  └─ Novo Valor: [11.111.111/0001-11]                │  │
│  │                                                       │  │
│  │  🖼️ Logo da Empresa                                  │  │
│  │  ├─ Valor Anterior: (Sem logo)                      │  │
│  │  └─ Novo Valor: (Logo carregada)                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  [Mais entradas antigas...]                                 │
│                                                              │
│                                        [Fechar]              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Informações Registradas

Cada entrada no histórico contém:

### 1. Metadados da Alteração
- **📅 Data**: Quando a alteração foi feita
- **⏰ Hora**: Horário exato da modificação
- **👤 Usuário**: Quem realizou a alteração
- **🔢 Quantidade**: Número de campos modificados

### 2. Detalhes das Mudanças
Para cada campo alterado:
- **Nome do Campo**: Label amigável (ex: "Razão Social")
- **Valor Anterior**: Estado antes da alteração (em vermelho)
- **Novo Valor**: Estado após a alteração (em verde)

---

## 🔍 Campos Rastreados

### Dados Gerais (9 campos)
- ✅ CNPJ
- ✅ Razão Social
- ✅ Nome Fantasia
- ✅ Setor/Atividade
- ✅ Descrição
- ✅ E-mail
- ✅ Telefone
- ✅ Website
- ✅ Logo da Empresa

### Endereço (7 campos)
- ✅ Rua
- ✅ Número
- ✅ Complemento
- ✅ Bairro
- ✅ Cidade
- ✅ Estado
- ✅ CEP

### Dados Fiscais (2 campos)
- ✅ Inscrição Estadual
- ✅ Inscrição Municipal

### Configurações Tributárias (9 campos)
- ✅ Regime Tributário
- ✅ CSOSN Padrão
- ✅ CST Padrão
- ✅ Alíquota ICMS Padrão
- ✅ CFOP Venda Dentro do Estado
- ✅ CFOP Venda Fora do Estado
- ✅ CFOP Compras
- ✅ CFOP Devoluções
- ✅ CFOP Serviços

### PIS/COFINS (3 campos)
- ✅ Regime PIS/COFINS
- ✅ Alíquota PIS Padrão
- ✅ Alíquota COFINS Padrão

**Total: 32 campos rastreados**

---

## 🎨 Código de Cores

O histórico usa cores para facilitar a compreensão:

| Cor | Significado | Uso |
|-----|-------------|-----|
| 🔴 Vermelho | Valor Anterior | Fundo vermelho claro |
| 🟢 Verde | Novo Valor | Fundo verde claro |
| 🔵 Azul | Data/Hora | Badges azuis |
| 🟣 Roxo | Contador de Campos | Badge roxo |
| ⚪ Cinza | Campos Vazios | "(Vazio)" em cinza |

---

## 📝 Exemplos de Uso

### Exemplo 1: Alteração Simples
```
Você mudou apenas o telefone da empresa:

┌────────────────────────────────────────┐
│ 📅 07/11/2024  ⏰ 10:15:30  [1 campo] │
│ 👤 Alterado por: Administrador          │
│                                         │
│ 📞 Telefone                            │
│ ├─ Anterior: (11) 1234-5678           │
│ └─ Novo: (11) 9876-5432               │
└────────────────────────────────────────┘
```

### Exemplo 2: Múltiplas Alterações
```
Você atualizou dados completos via busca de CNPJ:

┌────────────────────────────────────────┐
│ 📅 07/11/2024  ⏰ 14:20:00  [8 campos] │
│ 👤 Alterado por: Administrador          │
│                                         │
│ 📝 Razão Social                        │
│ ├─ Anterior: (Vazio)                  │
│ └─ Novo: EMPRESA EXEMPLO LTDA         │
│                                         │
│ 📍 Rua                                 │
│ ├─ Anterior: (Vazio)                  │
│ └─ Novo: Av. Paulista                 │
│                                         │
│ [... mais 6 campos ...]                │
└────────────────────────────────────────┘
```

### Exemplo 3: Upload de Logo
```
Você carregou a logo da empresa:

┌────────────────────────────────────────┐
│ 📅 07/11/2024  ⏰ 16:45:12  [1 campo] │
│ 👤 Alterado por: Administrador          │
│                                         │
│ 🖼️ Logo da Empresa                     │
│ ├─ Anterior: (Sem logo)               │
│ └─ Novo: (Logo carregada)             │
└────────────────────────────────────────┘
```

---

## ⚙️ Comportamento Técnico

### Quando o Registro Acontece

O histórico é registrado **APENAS** quando você clica em **"Salvar"**.

```
❌ NÃO registra:
- Digitar nos campos (modo edição)
- Clicar em "Cancelar"
- Fechar a página sem salvar

✅ Registra:
- Clicar em "Salvar" com alterações
- Cada salvamento = 1 entrada no histórico
```

### Detecção de Mudanças

O sistema compara automaticamente:
```javascript
if (valorAntigo !== valorNovo) {
  // Registra a mudança
}
```

### Persistência

- ✅ Salvo em **localStorage**
- ✅ Sobrevive a recarregamento da página
- ✅ Sobrevive a fechar o navegador
- ✅ Ordem cronológica (mais recente primeiro)

---

## 🔒 Privacidade e Segurança

### Dados Sensíveis

Campos sensíveis são tratados especialmente:

| Campo | Como Aparece no Histórico |
|-------|---------------------------|
| Logo | "(Logo carregada)" ou "(Sem logo)" |
| CNPJ | Valor completo visível |
| E-mail | Valor completo visível |
| Telefone | Valor completo visível |

### Usuário Atual

Por enquanto, todas as alterações são atribuídas a:
- **Nome:** Administrador
- **ID:** USER-001

> 💡 **Futuro:** Integração com sistema de autenticação mostrará o usuário real logado.

---

## 🎯 Casos de Uso Práticos

### 1. Auditoria Interna
"Quando alteramos o CNPJ da empresa?"
- Abra o histórico
- Procure por "CNPJ"
- Veja data e valores

### 2. Rastreamento de Erros
"Por que a logo sumiu?"
- Abra o histórico
- Encontre última alteração de "Logo da Empresa"
- Veja se foi removida e por quem

### 3. Conformidade
"Precisamos provar que atualizamos os dados fiscais"
- Histórico mostra todas as alterações tributárias
- Com data, hora e campos alterados

### 4. Recuperação de Dados
"Qual era o endereço antigo da empresa?"
- Histórico mostra valores anteriores
- Você pode copiar e restaurar manualmente

---

## 🐛 Troubleshooting

### Histórico está vazio

**Problema:** Abri o histórico e está vazio

**Solução:**
1. O histórico só registra após você salvar alterações
2. Se é primeira vez usando, faça uma alteração e salve
3. A entrada aparecerá imediatamente

### Não vejo alterações recentes

**Problema:** Salvei mas não aparece no histórico

**Possíveis causas:**
1. Não havia diferença entre valores antigos e novos
2. Apenas clicou em "Editar" e "Salvar" sem mudar nada

**Solução:**
- Faça uma alteração real em algum campo
- Clique em "Salvar"
- Verifique novamente

### Logo aparece como "(Logo carregada)"

**Problema:** Queria ver a imagem no histórico

**Explicação:**
- Por questões de performance e UX
- Logos não são exibidas no histórico
- Apenas indicação se tem ou não

---

## 📱 Interface Responsiva

O histórico se adapta ao tamanho da tela:

### Desktop (> 1024px)
- Modal largo (max-width: 4xl)
- Comparação lado a lado
- Visualização completa

### Tablet (768px - 1024px)
- Modal médio
- Campos empilhados
- Scroll vertical

### Mobile (< 768px)
- Modal full-screen
- Cards compactos
- Otimizado para toque

---

## 🔮 Recursos Futuros

Melhorias planejadas:

1. **Filtros**
   - Por data
   - Por campo
   - Por usuário

2. **Busca**
   - Pesquisar por valor
   - Encontrar alterações específicas

3. **Exportação**
   - PDF do histórico
   - Excel para auditoria

4. **Restauração**
   - Desfazer alteração
   - Voltar para valor anterior

5. **Notificações**
   - Alertar sobre mudanças críticas
   - E-mail de resumo semanal

---

## 📞 Suporte

Problemas com o histórico?

1. Verifique o console do navegador (F12)
2. Logs começam com "=== HISTÓRICO ==="
3. Reporte com data/hora e ação realizada

---

## ✅ Checklist de Verificação

Use antes de reportar problemas:

- [ ] Estou em "Minha Empresa"?
- [ ] Cliquei em "Editar"?
- [ ] Fiz alterações reais nos campos?
- [ ] Cliquei em "Salvar" (não "Cancelar")?
- [ ] Abri o modal de "Histórico"?
- [ ] Verifiquei se a entrada está no topo?
- [ ] Recarreguei a página para testar persistência?

---

**Histórico de Alterações - Totalmente Funcional** ✅  
**Auditoria Completa - Rastreabilidade Garantida** 🔍
