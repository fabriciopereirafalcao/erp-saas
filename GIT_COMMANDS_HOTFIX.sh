#!/bin/bash

# ===================================================================
# GIT COMMANDS - HOTFIX: Correção de Datas Inválidas
# ===================================================================

echo "🔧 HOTFIX: Corrigindo datas inválidas no mapeamento SQL"
echo ""

# 1. Verificar status
echo "1️⃣ Verificando status dos arquivos..."
git status
echo ""

# 2. Adicionar arquivos corrigidos
echo "2️⃣ Adicionando arquivos corrigidos..."
git add supabase/functions/server/services/sql-service.ts
git add supabase/functions/server/services/sql-service-extended.ts
git add components/Inventory.tsx
git add HOTFIX_DATAS_INVALIDAS.md
git add GIT_COMMANDS_HOTFIX.sh
echo "✅ Arquivos adicionados"
echo ""

# 3. Commit
echo "3️⃣ Fazendo commit..."
git commit -m "fix: Corrigir datas inválidas (backend + frontend)

🐛 Backend:
- lastRestocked, orderDate, dueDate, etc: || null ao invés de ''
- Previne retornar string vazia para campos de data NULL

🐛 Frontend:
- Inventory.tsx: validar lastRestocked antes de new Date()
- Exibir '-' quando data não existe

📁 Arquivos corrigidos:
- sql-service.ts (products)
- sql-service-extended.ts (sales/purchase orders)
- Inventory.tsx (validação de data)

🎯 Resolve: Crash ao acessar aba Estoque"
echo "✅ Commit criado"
echo ""

# 4. Garantir que está na develop
echo "4️⃣ Verificando branch..."
git checkout develop
echo "✅ Na branch develop"
echo ""

# 5. Pull
echo "5️⃣ Atualizando branch..."
git pull origin develop
echo "✅ Branch atualizada"
echo ""

# 6. Push (triggera deploy automático)
echo "6️⃣ Fazendo push para develop..."
git push origin develop
echo "✅ Push completado!"
echo ""

echo "🎉 HOTFIX APLICADO COM SUCESSO!"
echo ""
echo "📊 Próximos passos:"
echo "   1. Aguardar deploy automático (GitHub Actions)"
echo "   2. Testar endpoint: /data/health"
echo "   3. Testar frontend: Acessar aba Estoque"
echo "   4. Verificar console: Não deve haver erros"
echo ""
