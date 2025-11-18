/**
 * Utilitário para limpar dados antigos do localStorage
 * Execute este script no console se precisar limpar dados de testes anteriores
 */

export function cleanOldLocalStorageData() {
  console.log('🧹 Limpando dados antigos do localStorage...');
  
  const keysToRemove = [
    'companySettings',
    'customers',
    'suppliers',
    'salesOrders',
    'purchaseOrders',
    'inventory',
    'stockMovements',
    'priceTables',
    'productCategories',
    'salespeople',
    'buyers',
    'paymentMethods',
    'accountCategories',
    'accountsReceivable',
    'accountsPayable',
    'financialTransactions',
    'bankMovements',
    'cashFlowEntries',
    'companyHistory',
    'reconciliationStatus',
    'auditIssues',
    'lastAnalysisDate',
  ];
  
  let removedCount = 0;
  
  keysToRemove.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      removedCount++;
      console.log(`  ✅ Removido: ${key}`);
    }
  });
  
  console.log(`\n🎉 Limpeza concluída! ${removedCount} chaves removidas.`);
  console.log('💡 Faça logout e login novamente para carregar dados frescos do servidor.');
}

// Exportar para uso no console
if (typeof window !== 'undefined') {
  (window as any).cleanOldLocalStorage = cleanOldLocalStorageData;
  console.log('💡 Para limpar localStorage antigo, execute: cleanOldLocalStorage()');
}
