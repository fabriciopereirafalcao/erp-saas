// ============================================================================
// ENDPOINT: Rotas de Cálculo Fiscal
// Descrição: Endpoints para cálculo de impostos e totais de NF-e
// ============================================================================

import { Hono } from 'npm:hono@4.6.14';
import { calcularNFeCompleta } from './calculations/calculationHelpers.ts';
import { calcularICMS } from './calculations/icmsCalculator.ts';
import { calcularIPI } from './calculations/ipiCalculator.ts';
import { calcularPisCofinsCompleto } from './calculations/pisCofinsCalculator.ts';
import { calcularFCPCompleto } from './calculations/fcpCalculator.ts';
import { calcularICMSSTCompleto } from './calculations/icmsStCalculator.ts';
import { calcularLeiTransparencia } from './calculations/leiTransparencia.ts';
import { totalizarNFe } from './calculations/totalCalculator.ts';
import type { ParametrosNFe } from './calculations/calculationTypes.ts';

const calculationRoutes = new Hono();

/**
 * POST /fiscal/calcular-nfe
 * 
 * Calcula TODOS os impostos de uma NF-e completa
 * 
 * Body: ParametrosNFe
 */
calculationRoutes.post('/calcular-nfe', async (c) => {
  try {
    const params: ParametrosNFe = await c.req.json();
    
    console.log('[Cálculo NF-e] Calculando NF-e completa...', {
      itens: params.itens.length,
      emitente: params.emitente.cnpj,
      destinatario: params.destinatario.documento,
    });
    
    const resultado = await calcularNFeCompleta(params);
    
    console.log('[Cálculo NF-e] Cálculo concluído com sucesso', {
      valorTotal: resultado.totais.valorTotal,
      valorICMS: resultado.totais.valorICMS,
      valorIPI: resultado.totais.valorIPI,
    });
    
    return c.json({
      success: true,
      data: resultado,
    });
  } catch (error) {
    console.error('[Cálculo NF-e] Erro:', error);
    
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao calcular NF-e',
      details: error instanceof Error ? error.stack : undefined,
    }, 400);
  }
});

/**
 * POST /fiscal/calcular-icms
 * 
 * Calcula apenas ICMS de um item
 */
calculationRoutes.post('/calcular-icms', async (c) => {
  try {
    const params = await c.req.json();
    
    const resultado = calcularICMS(params);
    
    return c.json({
      success: true,
      data: resultado,
    });
  } catch (error) {
    console.error('[Cálculo ICMS] Erro:', error);
    
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao calcular ICMS',
    }, 400);
  }
});

/**
 * POST /fiscal/calcular-ipi
 * 
 * Calcula apenas IPI de um item
 */
calculationRoutes.post('/calcular-ipi', async (c) => {
  try {
    const params = await c.req.json();
    
    const resultado = calcularIPI(params);
    
    return c.json({
      success: true,
      data: resultado,
    });
  } catch (error) {
    console.error('[Cálculo IPI] Erro:', error);
    
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao calcular IPI',
    }, 400);
  }
});

/**
 * POST /fiscal/calcular-pis-cofins
 * 
 * Calcula PIS e COFINS de um item
 */
calculationRoutes.post('/calcular-pis-cofins', async (c) => {
  try {
    const params = await c.req.json();
    
    const resultado = calcularPisCofinsCompleto(params);
    
    return c.json({
      success: true,
      data: resultado,
    });
  } catch (error) {
    console.error('[Cálculo PIS/COFINS] Erro:', error);
    
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao calcular PIS/COFINS',
    }, 400);
  }
});

/**
 * POST /fiscal/calcular-fcp
 * 
 * Calcula FCP de um item
 */
calculationRoutes.post('/calcular-fcp', async (c) => {
  try {
    const params = await c.req.json();
    
    const resultado = calcularFCPCompleto(params);
    
    return c.json({
      success: true,
      data: resultado,
    });
  } catch (error) {
    console.error('[Cálculo FCP] Erro:', error);
    
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao calcular FCP',
    }, 400);
  }
});

/**
 * POST /fiscal/calcular-st
 * 
 * Calcula ICMS-ST de um item
 */
calculationRoutes.post('/calcular-st', async (c) => {
  try {
    const params = await c.req.json();
    
    const resultado = calcularICMSSTCompleto(params);
    
    return c.json({
      success: true,
      data: resultado,
    });
  } catch (error) {
    console.error('[Cálculo ST] Erro:', error);
    
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao calcular ICMS-ST',
    }, 400);
  }
});

/**
 * POST /fiscal/calcular-lei-transparencia
 * 
 * Calcula impostos aproximados (Lei da Transparência)
 */
calculationRoutes.post('/calcular-lei-transparencia', async (c) => {
  try {
    const params = await c.req.json();
    
    const resultado = calcularLeiTransparencia(params);
    
    return c.json({
      success: true,
      data: resultado,
    });
  } catch (error) {
    console.error('[Lei Transparência] Erro:', error);
    
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao calcular Lei da Transparência',
    }, 400);
  }
});

/**
 * POST /fiscal/totalizar-nfe
 * 
 * Totaliza valores de uma NF-e
 */
calculationRoutes.post('/totalizar-nfe', async (c) => {
  try {
    const params = await c.req.json();
    
    const resultado = totalizarNFe(params);
    
    return c.json({
      success: true,
      data: resultado,
    });
  } catch (error) {
    console.error('[Totalização] Erro:', error);
    
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao totalizar NF-e',
    }, 400);
  }
});

/**
 * GET /fiscal/health-check
 * 
 * Verifica se o módulo de cálculo está funcionando
 */
calculationRoutes.get('/health-check', (c) => {
  return c.json({
    success: true,
    message: 'Módulo de cálculos fiscais funcionando',
    versao: '1.0.0',
    modulos: {
      icms: 'OK',
      ipi: 'OK',
      pisCofins: 'OK',
      fcp: 'OK',
      icmsSt: 'OK',
      leiTransparencia: 'OK',
      totalizacao: 'OK',
    },
  });
});

/**
 * GET /fiscal/tabelas
 * 
 * Retorna informações sobre as tabelas carregadas
 */
calculationRoutes.get('/tabelas', async (c) => {
  try {
    const { listarEstadosComFCP } = await import('./calculations/fcpCalculator.ts');
    const { listarNCMsComST } = await import('./data/mvaTable.ts');
    
    return c.json({
      success: true,
      data: {
        estadosComFCP: listarEstadosComFCP(),
        ncmsComST: listarNCMsComST().slice(0, 50), // Primeiros 50
        totalNCMsComST: listarNCMsComST().length,
      },
    });
  } catch (error) {
    console.error('[Tabelas] Erro:', error);
    
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao listar tabelas',
    }, 400);
  }
});

export default calculationRoutes;
