/**
 * Utilitário para mapear dados entre CompanySettings (frontend) e companies table (backend)
 */

import type { CompanySettings } from '../contexts/ERPContext';

/**
 * Tipo para os dados da tabela companies no Supabase
 */
export interface CompanyDatabaseRecord {
  id: string;
  name: string;
  plan: 'trial' | 'basic' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'trial' | 'cancelled';
  trial_ends_at: string | null;
  settings: CompanySettings;
  created_at: string;
  updated_at: string;
}

/**
 * Mapear dados do banco para CompanySettings
 */
export function mapDatabaseToSettings(company: CompanyDatabaseRecord): CompanySettings {
  // Se settings já existe no banco, usar
  if (company.settings && typeof company.settings === 'object') {
    return company.settings;
  }

  // Se não existe, retornar estrutura padrão
  return {
    cnpj: '',
    companyName: company.name || '',
    tradeName: '',
    sector: '',
    description: '',
    logoUrl: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    website: '',
    stateRegistration: '',
    cityRegistration: '',
    icmsContributor: false,
    simplesTaxpayer: false,
    defaultTaxRate: 0,
    nfeEnabled: false,
    nfeSeries: '',
    nfeNumber: 0,
    nfeCertificate: '',
    nfeEnvironment: 'Homologação',
    taxSubstitution: false,
    allowProductOverride: true,
    bankAccounts: [],
    icmsInterstateRates: [],
    revenueGroups: [],
    expenseGroups: [],
    costCenters: [],
  };
}

/**
 * Mapear CompanySettings para formato do banco
 */
export function mapSettingsToDatabase(settings: Partial<CompanySettings>): any {
  return {
    name: settings.companyName,
    settings: settings,
    updated_at: new Date().toISOString(),
  };
}
