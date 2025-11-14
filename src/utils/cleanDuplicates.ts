/**
 * Utilitário para limpeza manual de duplicados no localStorage
 * Execute este script no console do navegador se necessário
 */

import { STORAGE_KEYS } from './localStorage';

export interface CleanupResult {
  before: number;
  after: number;
  duplicatesRemoved: number;
  duplicateIds: string[];
}

/**
 * Limpa duplicados de transações financeiras no localStorage
 */
export function cleanFinancialTransactionsDuplicates(): CleanupResult {
  try {
    // Ler dados do localStorage
    const data = localStorage.getItem(STORAGE_KEYS.FINANCIAL_TRANSACTIONS);
    
    if (!data) {
      console.log('ℹ️ Nenhuma transação encontrada no localStorage');
      return {
        before: 0,
        after: 0,
        duplicatesRemoved: 0,
        duplicateIds: []
      };
    }
    
    const transactions = JSON.parse(data);
    const beforeCount = transactions.length;
    
    // Identificar e remover duplicados
    const seenIds = new Set<string>();
    const duplicateIds: string[] = [];
    
    const cleaned = transactions.filter((transaction: any) => {
      if (seenIds.has(transaction.id)) {
        duplicateIds.push(transaction.id);
        return false;
      }
      seenIds.add(transaction.id);
      return true;
    });
    
    const afterCount = cleaned.length;
    const duplicatesRemoved = beforeCount - afterCount;
    
    if (duplicatesRemoved > 0) {
      // Salvar versão limpa
      localStorage.setItem(STORAGE_KEYS.FINANCIAL_TRANSACTIONS, JSON.stringify(cleaned));
      
      console.log('🧹 Limpeza concluída:');
      console.log(`   • Antes: ${beforeCount} transações`);
      console.log(`   • Depois: ${afterCount} transações`);
      console.log(`   • Removidos: ${duplicatesRemoved} duplicado(s)`);
      console.log(`   • IDs duplicados: ${duplicateIds.join(', ')}`);
    } else {
      console.log('✅ Nenhum duplicado encontrado');
    }
    
    return {
      before: beforeCount,
      after: afterCount,
      duplicatesRemoved,
      duplicateIds
    };
    
  } catch (error) {
    console.error('❌ Erro ao limpar duplicados:', error);
    throw error;
  }
}

/**
 * Exibe estatísticas das transações financeiras
 */
export function showFinancialTransactionsStats(): void {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.FINANCIAL_TRANSACTIONS);
    
    if (!data) {
      console.log('ℹ️ Nenhuma transação encontrada');
      return;
    }
    
    const transactions = JSON.parse(data);
    const idCounts = new Map<string, number>();
    
    transactions.forEach((t: any) => {
      idCounts.set(t.id, (idCounts.get(t.id) || 0) + 1);
    });
    
    const duplicates = Array.from(idCounts.entries()).filter(([_, count]) => count > 1);
    const uniqueIds = new Set(transactions.map((t: any) => t.id));
    
    console.log('📊 Estatísticas de Transações Financeiras:');
    console.log(`   • Total de registros: ${transactions.length}`);
    console.log(`   • IDs únicos: ${uniqueIds.size}`);
    console.log(`   • Duplicados: ${transactions.length - uniqueIds.size}`);
    
    if (duplicates.length > 0) {
      console.log('   ⚠️ IDs duplicados encontrados:');
      duplicates.forEach(([id, count]) => {
        console.log(`      - ${id}: ${count} ocorrências`);
      });
    } else {
      console.log('   ✅ Nenhum duplicado encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro ao exibir estatísticas:', error);
  }
}

/**
 * Remove TODAS as transações financeiras (use com cuidado!)
 */
export function clearAllFinancialTransactions(): void {
  const confirmation = confirm(
    'ATENÇÃO: Esta ação irá remover TODAS as transações financeiras!\n\n' +
    'Isso não pode ser desfeito. Tem certeza?'
  );
  
  if (!confirmation) {
    console.log('ℹ️ Operação cancelada pelo usuário');
    return;
  }
  
  const secondConfirmation = confirm(
    'CONFIRMAÇÃO FINAL\n\n' +
    'Você tem ABSOLUTA CERTEZA de que deseja remover todas as transações?\n\n' +
    'Esta é sua última chance de cancelar.'
  );
  
  if (!secondConfirmation) {
    console.log('ℹ️ Operação cancelada pelo usuário');
    return;
  }
  
  localStorage.removeItem(STORAGE_KEYS.FINANCIAL_TRANSACTIONS);
  console.log('🗑️ Todas as transações financeiras foram removidas');
  console.log('ℹ️ Recarregue a página para aplicar as mudanças');
}

// Exportar para uso no console do navegador
if (typeof window !== 'undefined') {
  (window as any).cleanDuplicates = cleanFinancialTransactionsDuplicates;
  (window as any).showTransactionsStats = showFinancialTransactionsStats;
  (window as any).clearAllTransactions = clearAllFinancialTransactions;
}

/**
 * INSTRUÇÕES DE USO:
 * 
 * Abra o Console do Navegador (F12) e execute:
 * 
 * 1. Ver estatísticas:
 *    showTransactionsStats()
 * 
 * 2. Limpar duplicados:
 *    cleanDuplicates()
 * 
 * 3. Remover todas as transações (CUIDADO!):
 *    clearAllTransactions()
 * 
 * Após executar, recarregue a página para ver as mudanças.
 */
