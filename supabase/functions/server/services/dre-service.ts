/**
 * ===================================================================
 * DRE SERVICE - Demonstração do Resultado do Exercício
 * ===================================================================
 * 
 * Calcula DRE Gerencial baseada em:
 * - Regime tributário da empresa (SIMPLES, PRESUMIDO, REAL)
 * - Transações financeiras lançadas
 * - Plano de contas hierárquico com vínculo a linhas DRE
 * 
 * Foco: DRE Gerencial (não fiscal)
 * 
 * ✅ ATUALIZADO: Usa dre_line_id (UUID) em vez de dre_line_item (string)
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
  despesas_pessoal: number;
  despesas_comerciais: number;
  despesas_administrativas: number;
  despesas_financeiras: number;
  receitas_financeiras: number;
  outras_receitas_despesas: number;
  resultado_operacional?: number; // Apenas PRESUMIDO e REAL
  irpj?: number; // Apenas PRESUMIDO e REAL
  csll?: number; // Apenas PRESUMIDO e REAL
  lucro_liquido: number;
  // Detalhamento por linha da DRE (code → valor)
  breakdown: Record<string, number>;
  // Detalhamento por linha DRE (id → valor) - NOVO
  breakdownById: Record<string, number>;
}

export interface DRELineItem {
  id: string;
  code: string;
  name: string;
  value: number;
  isCalculated: boolean;
  formula?: string;
  level: number;
  type: string;
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
 * ✅ REGIME DE COMPETÊNCIA: Considera todas transações pela data de ocorrência,
 *    independente de terem sido pagas ou não (exceto canceladas)
 */
async function getFinancialTransactions(
  companyId: string,
  startDate: string,
  endDate: string
) {
  const supabase = getSupabaseClient();
  
  // ✅ DRE usa REGIME DE COMPETÊNCIA (todas transações exceto canceladas)
  const { data, error } = await supabase
    .from('financial_transactions')
    .select('*')
    .eq('company_id', companyId)
    .neq('status', 'Cancelado') // Excluir apenas canceladas
    .gte('date', startDate) // Data de competência/vencimento
    .lte('date', endDate);

  if (error) {
    console.error('[DRE_SERVICE] ❌ Erro ao buscar transações:', error);
    return [];
  }

  console.log(`[DRE_SERVICE] 📊 ${data?.length || 0} transações encontradas no período (regime de competência)`);
  return data || [];
}

/**
 * ✅ NOVO: Busca todas as linhas DRE
 */
async function getDRELines(): Promise<Map<string, any>> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('dre_lines')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[DRE_SERVICE] ❌ Erro ao buscar linhas DRE:', error);
    return new Map();
  }

  const lineMap = new Map();
  data?.forEach((line: any) => {
    lineMap.set(line.id, line); // Mapear por ID
    lineMap.set(`code:${line.code}`, line); // Mapear por código (para fallback)
  });

  return lineMap;
}

/**
 * ✅ ATUALIZADO: Agrupa transações por linha da DRE usando dre_line_id
 */
async function groupTransactionsByDRELine(
  companyId: string,
  transactions: any[]
): Promise<{ breakdown: Record<string, number>; breakdownById: Record<string, number> }> {
  const supabase = getSupabaseClient();
  
  // 1️⃣ Buscar mapeamento de categorias → linhas DRE COM JOIN
  const { data: categories, error } = await supabase
    .from('account_categories')
    .select(`
      id,
      code,
      dre_line_id,
      dre_lines:dre_line_id (
        id,
        code,
        name
      )
    `)
    .eq('company_id', companyId)
    .eq('is_active', true);

  if (error) {
    console.error('[DRE_SERVICE] ❌ Erro ao buscar categorias:', error);
    return { breakdown: {}, breakdownById: {} };
  }

  // 2️⃣ Criar mapa: category_id → dre_line
  const categoryMap = new Map<string, any>();
  categories?.forEach((cat: any) => {
    if (cat.dre_line_id && cat.dre_lines) {
      categoryMap.set(cat.id, cat.dre_lines);
    }
  });

  // 3️⃣ Inicializar contadores
  const breakdown: Record<string, number> = {}; // Por código (RB, DED, CMV, etc.)
  const breakdownById: Record<string, number> = {}; // Por UUID

  // 4️⃣ Agrupar transações
  transactions.forEach((tx: any) => {
    const dreLine = categoryMap.get(tx.category_id);
    
    if (!dreLine) {
      console.warn(`[DRE_SERVICE] ⚠️ Transação sem categoria mapeada: ${tx.id} (category: ${tx.category_id})`);
      return;
    }

    const amount = parseFloat(tx.amount || 0);
    const lineCode = dreLine.code;
    const lineId = dreLine.id;

    // Inicializar se não existir
    if (!breakdown[lineCode]) breakdown[lineCode] = 0;
    if (!breakdownById[lineId]) breakdownById[lineId] = 0;

    // ✅ Receitas são positivas, despesas são valores absolutos
    if (tx.type === 'Receita' || tx.type === 'Entrada') {
      breakdown[lineCode] += amount;
      breakdownById[lineId] += amount;
    } else {
      // Despesas/Saídas são valores absolutos (positivos)
      breakdown[lineCode] += Math.abs(amount);
      breakdownById[lineId] += Math.abs(amount);
    }
  });

  console.log('[DRE_SERVICE] 📊 Breakdown by code:', breakdown);
  console.log('[DRE_SERVICE] 📊 Breakdown by ID:', breakdownById);

  return { breakdown, breakdownById };
}

/**
 * ✅ ATUALIZADO: Calcula totais e subtotais da DRE baseado no regime
 */
function calculateDRETotals(
  regime: string,
  breakdown: Record<string, number>
): DRECalculation {
  console.log('[DRE_SERVICE] 🔢 Iniciando cálculo de totais...');
  console.log('[DRE_SERVICE] 📊 Breakdown recebido:', JSON.stringify(breakdown, null, 2));
  
  // Valores base das linhas DRE
  const receita_bruta = breakdown.RB || 0;
  const deducoes_receita = breakdown.DED || 0;
  const custos = breakdown.CMV || 0;
  
  console.log(`[DRE_SERVICE] 💰 Valores extraídos: RB=${receita_bruta}, DED=${deducoes_receita}, CMV=${custos}`);
  
  // Despesas detalhadas
  const despesas_operacionais_total = breakdown.DO || 0;
  const despesas_pessoal = breakdown.DP || 0;
  const despesas_comerciais = breakdown.DC || 0;
  const despesas_administrativas = breakdown.DA || 0;
  const despesas_financeiras = breakdown.DF || 0;
  
  // Receitas/Despesas não operacionais
  const receitas_financeiras = breakdown.RF || 0;
  const outras_receitas = breakdown.RO || 0;
  
  // Impostos sobre lucro
  const irpj = breakdown.IRPJ || 0;
  const csll = breakdown.CSLL || 0;

  // ==================== CÁLCULOS ====================

  // Receita Líquida = Receita Bruta - Deduções
  const receita_liquida = receita_bruta - deducoes_receita;

  // Lucro Bruto = Receita Líquida - CMV
  const lucro_bruto = receita_liquida - custos;

  // Despesas Operacionais (soma de todas as categorias)
  const despesas_operacionais = 
    despesas_pessoal +
    despesas_comerciais +
    despesas_administrativas +
    despesas_financeiras +
    despesas_operacionais_total;

  // Outras Receitas/Despesas (líquido)
  const outras_receitas_despesas = receitas_financeiras + outras_receitas;

  let resultado_operacional: number | undefined;
  let lucro_liquido: number;

  // 🎯 Lógica específica por regime
  switch (regime) {
    case 'SIMPLES':
      // Simples: Lucro Líquido = Lucro Bruto - Despesas Operacionais + Outras
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
    despesas_pessoal,
    despesas_comerciais,
    despesas_administrativas,
    despesas_financeiras,
    receitas_financeiras,
    outras_receitas_despesas,
    resultado_operacional,
    irpj: regime !== 'SIMPLES' ? irpj : undefined,
    csll: regime !== 'SIMPLES' ? csll : undefined,
    lucro_liquido,
    breakdown,
    breakdownById: {}, // Será preenchido abaixo
  };
}

// ==================== API PÚBLICA ====================

/**
 * ✅ ATUALIZADO: Calcula DRE Gerencial para um período
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
    const { breakdown, breakdownById } = await groupTransactionsByDRELine(companyId, transactions);

    // 4️⃣ Calcular totais
    const dre = calculateDRETotals(regime, breakdown);
    dre.periodStart = startDate;
    dre.periodEnd = endDate;
    dre.breakdownById = breakdownById;

    console.log('[DRE_SERVICE] ✅ DRE calculada com sucesso');
    console.log('[DRE_SERVICE] 📋 RESULTADO FINAL:', JSON.stringify({
      receita_bruta: dre.receita_bruta,
      custos: dre.custos,
      lucro_liquido: dre.lucro_liquido,
      breakdown: dre.breakdown
    }, null, 2));
    
    return dre;
  } catch (error) {
    console.error('[DRE_SERVICE] ❌ Erro ao calcular DRE:', error);
    throw error;
  }
}

/**
 * ✅ NOVO: Busca estrutura completa da DRE (linhas com valores calculados)
 */
export async function getDREStructure(): Promise<DRELineItem[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('dre_lines')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[DRE_SERVICE] ❌ Erro ao buscar estrutura DRE:', error);
    return [];
  }

  return (data || []).map((line: any) => ({
    id: line.id,
    code: line.code,
    name: line.name,
    value: 0,
    isCalculated: line.is_calculated || false,
    formula: line.formula,
    level: line.sort_order,
    type: line.type,
  }));
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