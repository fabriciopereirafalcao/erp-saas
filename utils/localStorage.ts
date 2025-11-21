/**
 * Utilitário para persistência de dados no localStorage
 * Garante que os dados cadastrados permaneçam entre navegações
 * Com isolamento por company_id para multi-tenancy
 */

const STORAGE_PREFIX = 'erp_system_';

export const STORAGE_KEYS = {
  CUSTOMERS: `${STORAGE_PREFIX}customers`,
  SUPPLIERS: `${STORAGE_PREFIX}suppliers`,
  INVENTORY: `${STORAGE_PREFIX}inventory`,
  SALES_ORDERS: `${STORAGE_PREFIX}sales_orders`,
  PURCHASE_ORDERS: `${STORAGE_PREFIX}purchase_orders`,
  STOCK_MOVEMENTS: `${STORAGE_PREFIX}stock_movements`,
  PRICE_TABLES: `${STORAGE_PREFIX}price_tables`,
  PRODUCT_CATEGORIES: `${STORAGE_PREFIX}product_categories`,
  PAYMENT_METHODS: `${STORAGE_PREFIX}payment_methods`,
  ACCOUNT_CATEGORIES: `${STORAGE_PREFIX}account_categories`,
  FINANCIAL_TRANSACTIONS: `${STORAGE_PREFIX}financial_transactions`,
  ACCOUNTS_RECEIVABLE: `${STORAGE_PREFIX}accounts_receivable`,
  ACCOUNTS_PAYABLE: `${STORAGE_PREFIX}accounts_payable`,
  BANK_MOVEMENTS: `${STORAGE_PREFIX}bank_movements`,
  CASH_FLOW_ENTRIES: `${STORAGE_PREFIX}cash_flow_entries`,
  COMPANY_SETTINGS: `${STORAGE_PREFIX}company_settings`,
  AUDIT_ISSUES: `${STORAGE_PREFIX}audit_issues`,
  LAST_ANALYSIS_DATE: `${STORAGE_PREFIX}last_analysis_date`,
};

/**
 * Gera chave de storage isolada por company_id
 * Garante que cada empresa tenha seus próprios dados no localStorage
 * 
 * @param baseKey - Chave base do STORAGE_KEYS
 * @param companyId - ID da empresa (opcional)
 * @returns Chave isolada por empresa ou chave base (fallback)
 */
export function getStorageKey(baseKey: string, companyId?: string): string {
  if (companyId) {
    return `${baseKey}_${companyId}`;
  }
  return baseKey; // Fallback para dados antigos ou quando não há company_id
}

/**
 * Migra dados da chave antiga (sem company_id) para a nova chave (com company_id)
 * Remove a chave antiga após migração bem-sucedida
 * 
 * @param baseKey - Chave base do STORAGE_KEYS
 * @param companyId - ID da empresa
 * @returns true se houve migração, false caso contrário
 */
export function migrateStorageData<T>(baseKey: string, companyId: string): T | null {
  if (!isLocalStorageAvailable()) {
    return null;
  }

  try {
    const oldKey = baseKey;
    const newKey = getStorageKey(baseKey, companyId);

    // Verificar se já existe dado na nova chave
    const existingData = localStorage.getItem(newKey);
    if (existingData !== null) {
      console.log(`ℹ️ Dados já existem na nova chave: ${newKey}`);
      return null; // Já migrado
    }

    // Verificar se existe dado na chave antiga
    const oldData = localStorage.getItem(oldKey);
    if (oldData === null) {
      console.log(`ℹ️ Nenhum dado antigo para migrar: ${oldKey}`);
      return null; // Nada para migrar
    }

    // Migrar dados
    const parsedData = JSON.parse(oldData) as T;
    localStorage.setItem(newKey, oldData);
    localStorage.removeItem(oldKey);

    console.log(`✅ Dados migrados: ${oldKey} → ${newKey}`, {
      itemCount: Array.isArray(parsedData) ? parsedData.length : 'N/A'
    });

    return parsedData;
  } catch (error) {
    console.error(`❌ Erro ao migrar dados de ${baseKey}:`, error);
    return null;
  }
}

/**
 * Verifica se localStorage está disponível
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (error) {
    console.warn('localStorage não está disponível:', error);
    return false;
  }
}

/**
 * Salva dados no localStorage
 */
export function saveToStorage<T>(key: string, data: T): void {
  if (!isLocalStorageAvailable()) {
    console.warn('localStorage não disponível - dados não serão persistidos');
    return;
  }
  
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(key, serialized);
    console.log(`✅ Dados salvos: ${key}`, { itemCount: Array.isArray(data) ? data.length : 'N/A' });
  } catch (error) {
    console.error(`❌ Erro ao salvar ${key} no localStorage:`, error);
  }
}

/**
 * Recupera dados do localStorage
 */
export function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (!isLocalStorageAvailable()) {
    console.warn('localStorage não disponível - usando valores padrão');
    return defaultValue;
  }
  
  try {
    const serialized = localStorage.getItem(key);
    if (serialized === null) {
      console.log(`📂 Nenhum dado encontrado para ${key} - usando valor padrão`);
      return defaultValue;
    }
    const data = JSON.parse(serialized) as T;
    console.log(`📖 Dados carregados: ${key}`, { itemCount: Array.isArray(data) ? data.length : 'N/A' });
    return data;
  } catch (error) {
    console.error(`❌ Erro ao carregar ${key} do localStorage:`, error);
    return defaultValue;
  }
}

/**
 * Remove dados do localStorage
 */
export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Erro ao remover ${key} do localStorage:`, error);
  }
}

/**
 * Limpa todos os dados do sistema (útil para reset)
 */
export function clearAllStorage(): void {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error('Erro ao limpar localStorage:', error);
  }
}

/**
 * Verifica se há dados salvos no localStorage
 */
export function hasStoredData(): boolean {
  try {
    return Object.values(STORAGE_KEYS).some(key => 
      localStorage.getItem(key) !== null
    );
  } catch (error) {
    return false;
  }
}