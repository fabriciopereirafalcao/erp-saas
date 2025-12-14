/**
 * ===================================================================
 * DRE SERVICE - Demonstração do Resultado do Exercício
 * ===================================================================
 * 
 * Calcula DRE Gerencial baseada em:
 * - Regime tributário da empresa (SIMPLES, PRESUMIDO, REAL)
 * - Transações financeiras lançadas
 * - Plano de contas hierárquico
 * 
 * Foco: DRE Gerencial (não fiscal)
 */

import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2';

// ==================== TIPOS ====================

export interface DRECalculation {
  regime: string;
  periodStart: string;
  periodEnd: string;
  receita_bruta: number;
  deducoes_receita: number;
  receita_liquida: number;
  custos: number;
  lucro_bruto: number;
  despesas_operacionais: number;
  outras_receitas_despesas: number;
  resultado_operacional?: number; // Apenas PRESUMIDO e REAL
  irpj?: number; // Apenas PRESUMIDO e REAL
  csll?: number; // Apenas PRESUMIDO e REAL
  lucro_liquido: number;
  // Detalhamento por linha da DRE
  breakdown: Record<string, number>;
}

export interface DRELineItem {
  lineCode: string;
  lineName: string;
  value: number;
  isSubtotal: boolean;
  level: number;
}

// ==================== SUPABASE CLIENT ====================

function getSupabaseClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
}

// ==================== FUNÇÕES AUXILIARES ====================

/**
 * Busca regime tributário da empresa
 */
async function getTaxRegime(companyId: string): Promise<string> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('companies')
    .select('tax_regime')
    .eq('id', companyId)
    .single();

  if (error || !data) {
    console.warn('[DRE_SERVICE] ⚠️ Regime não encontrado, usando SIMPLES como padrão');
    return 'SIMPLES';
  }

  return data.tax_regime || 'SIMPLES';
}

/**
 * Busca transações financeiras do período
 */
async function getFinancialTransactions(
  companyId: string,
  startDate: string,
  endDate: string
) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('financial_transactions')
    .select('*')
    .eq('company_id', companyId)
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) {
    console.error('[DRE_SERVICE] ❌ Erro ao buscar transações:', error);
    return [];
  }

  return data || [];
}

/**
 * Agrupa transações por linha da DRE baseado no plano de contas
 */
async function groupTransactionsByDRELine(
  companyId: string,
  transactions: any[]
): Promise<Record<string, number>> {
  const supabase = getSupabaseClient();
  
  // Buscar mapeamento de categorias → linhas DRE
  const { data: categories, error } = await supabase
    .from('account_categories')
    .select('id, code, dre_line_item, type')
    .eq('company_id', companyId)
    .eq('is_active', true);

  if (error) {
    console.error('[DRE_SERVICE] ❌ Erro ao buscar categorias:', error);
    return {};
  }

  // Criar mapa: category_id → dre_line_item
  const categoryMap = new Map<string, string>();
  categories?.forEach((cat: any) => {
    if (cat.dre_line_item) {
      categoryMap.set(cat.id, cat.dre_line_item);
    }
  });

  // Agrupar transações
  const dreLines: Record<string, number> = {
    receita_bruta: 0,
    deducoes_receita: 0,
    custos: 0,
    despesas_operacionais: 0,
    outras_receitas_despesas: 0,
    irpj: 0,
    csll: 0,
  };

  transactions.forEach((tx: any) => {
    const dreLineItem = categoryMap.get(tx.category_id);
    
    if (!dreLineItem) {
      // Se não tem mapeamento, usar fallback baseado no tipo
      console.warn(`[DRE_SERVICE] ⚠️ Transação sem categoria mapeada: ${tx.id}`);
      return;
    }

    const amount = parseFloat(tx.amount || 0);

    // Receitas são positivas, despesas são negativas (mas somamos em módulo)
    if (tx.type === 'Entrada') {
      dreLines[dreLineItem] = (dreLines[dreLineItem] || 0) + amount;
    } else {
      // Deduções de receita são valores negativos de receita
      if (dreLineItem === 'deducoes_receita') {
        dreLines[dreLineItem] = (dreLines[dreLineItem] || 0) + amount;
      } else {
        dreLines[dreLineItem] = (dreLines[dreLineItem] || 0) + amount;
      }
    }
  });

  return dreLines;
}

/**
 * Calcula totais e subtotais da DRE baseado no regime
 */
function calculateDRETotals(
  regime: string,
  breakdown: Record<string, number>
): DRECalculation {
  const receita_bruta = breakdown.receita_bruta || 0;
  const deducoes_receita = breakdown.deducoes_receita || 0;
  const custos = breakdown.custos || 0;
  const despesas_operacionais = breakdown.despesas_operacionais || 0;
  const outras_receitas_despesas = breakdown.outras_receitas_despesas || 0;
  const irpj = breakdown.irpj || 0;
  const csll = breakdown.csll || 0;

  // Cálculos comuns a todos os regimes
  const receita_liquida = receita_bruta - deducoes_receita;
  const lucro_bruto = receita_liquida - custos;

  let resultado_operacional: number | undefined;
  let lucro_liquido: number;

  // 🎯 Lógica específica por regime
  switch (regime) {
    case 'SIMPLES':
      // Simples: Lucro Líquido = Lucro Bruto - Despesas Operacionais (inclui DAS) + Outras
      lucro_liquido = lucro_bruto - despesas_operacionais + outras_receitas_despesas;
      break;

    case 'PRESUMIDO':
    case 'REAL':
      // Presumido/Real: Resultado Operacional → IRPJ/CSLL → Lucro Líquido
      resultado_operacional = lucro_bruto - despesas_operacionais + outras_receitas_despesas;
      lucro_liquido = resultado_operacional - irpj - csll;
      break;

    default:
      lucro_liquido = lucro_bruto - despesas_operacionais + outras_receitas_despesas;
  }

  return {
    regime,
    periodStart: '',
    periodEnd: '',
    receita_bruta,
    deducoes_receita,
    receita_liquida,
    custos,
    lucro_bruto,
    despesas_operacionais,
    outras_receitas_despesas,
    resultado_operacional,
    irpj: regime !== 'SIMPLES' ? irpj : undefined,
    csll: regime !== 'SIMPLES' ? csll : undefined,
    lucro_liquido,
    breakdown,
  };
}

// ==================== API PÚBLICA ====================

/**
 * Calcula DRE Gerencial para um período
 */
export async function calculateDRE(
  companyId: string,
  startDate: string,
  endDate: string
): Promise<DRECalculation> {
  console.log(`[DRE_SERVICE] 📊 Calculando DRE para ${companyId} (${startDate} até ${endDate})`);

  try {
    // 1️⃣ Buscar regime tributário
    const regime = await getTaxRegime(companyId);
    console.log(`[DRE_SERVICE] 📋 Regime: ${regime}`);

    // 2️⃣ Buscar transações do período
    const transactions = await getFinancialTransactions(companyId, startDate, endDate);
    console.log(`[DRE_SERVICE] 💰 ${transactions.length} transações encontradas`);

    // 3️⃣ Agrupar por linha da DRE
    const breakdown = await groupTransactionsByDRELine(companyId, transactions);
    console.log('[DRE_SERVICE] 📈 Breakdown:', breakdown);

    // 4️⃣ Calcular totais
    const dre = calculateDRETotals(regime, breakdown);
    dre.periodStart = startDate;
    dre.periodEnd = endDate;

    console.log('[DRE_SERVICE] ✅ DRE calculada com sucesso');
    return dre;
  } catch (error) {
    console.error('[DRE_SERVICE] ❌ Erro ao calcular DRE:', error);
    throw error;
  }
}

/**
 * Busca estrutura da DRE baseada no regime (para exibir no frontend)
 */
export async function getDREStructure(regime: string): Promise<any[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('dre_line_items')
    .select('*')
    .eq('tax_regime', regime)
    .eq('show_in_dre', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[DRE_SERVICE] ❌ Erro ao buscar estrutura DRE:', error);
    return [];
  }

  return data || [];
}

/**
 * Salva snapshot da DRE para histórico
 */
export async function saveDRESnapshot(
  companyId: string,
  userId: string,
  dre: DRECalculation
): Promise<{ success: boolean; id?: string }> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('dre_snapshots')
    .insert({
      company_id: companyId,
      tax_regime: dre.regime,
      period_start: dre.periodStart,
      period_end: dre.periodEnd,
      data: dre,
      created_by: userId,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[DRE_SERVICE] ❌ Erro ao salvar snapshot:', error);
    return { success: false };
  }

  console.log(`[DRE_SERVICE] 💾 Snapshot salvo: ${data.id}`);
  return { success: true, id: data.id };
}

/**
 * Busca histórico de snapshots
 */
export async function getDRESnapshots(
  companyId: string,
  limit: number = 10
): Promise<any[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('dre_snapshots')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[DRE_SERVICE] ❌ Erro ao buscar snapshots:', error);
    return [];
  }

  return data || [];
}
