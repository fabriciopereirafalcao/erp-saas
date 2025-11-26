/**
 * ============================================================================
 * ROTAS: SEFAZ - Transmissão e Consulta de NF-e
 * ============================================================================
 */

import { Hono } from 'npm:hono@4.6.14';
import { createClient } from 'npm:@supabase/supabase-js@2.49.2';
import { autorizarNFe, consultarRecibo, consultarStatusServico, anexarProtocoloAoXml, cancelarNFe, gerarXMLEventoCancelamento, enviarCartaCorrecao, gerarXMLEventoCCe } from './nfe-services.tsx';
import type { Ambiente } from './webservices.tsx';
import * as kv from '../kv_store.tsx';

const sefaz = new Hono();

// ============================================================================
// POST /sefaz/nfe/transmitir
// Descrição: Transmite NF-e para SEFAZ (autorização)
// ============================================================================
sefaz.post('/nfe/transmitir', async (c) => {
  try {
    console.log('[SEFAZ_ROUTES] POST /nfe/transmitir - Início');
    
    // 1. Autenticação
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ success: false, error: 'Token não fornecido' }, 401);
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ success: false, error: 'Token inválido' }, 401);
    }
    
    // 2. Receber dados
    const body = await c.req.json();
    const { nfeId, xml, uf, ambiente } = body;
    
    if (!xml || !uf || !ambiente) {
      return c.json({
        success: false,
        error: 'Parâmetros obrigatórios: xml, uf, ambiente'
      }, 400);
    }
    
    console.log(`[SEFAZ_ROUTES] Transmitindo NF-e para ${uf} (ambiente ${ambiente})`);
    
    // 3. Transmitir para SEFAZ
    const resultado = await autorizarNFe(
      xml,
      uf,
      ambiente as Ambiente
    );
    
    if (!resultado.success) {
      console.error('[SEFAZ_ROUTES] Erro na transmissão:', resultado.erro);
      
      // Salvar erro no banco
      if (nfeId) {
        await supabase
          .from('fiscal_nfes')
          .update({
            status: 'rejeitada',
            codigo_rejeicao: resultado.codigoStatus,
            mensagem_rejeicao: resultado.mensagem || resultado.erro,
            updated_at: new Date().toISOString()
          })
          .eq('id', nfeId)
          .eq('user_id', user.id);
      }
      
      return c.json({
        success: false,
        error: resultado.erro,
        codigo: resultado.codigoStatus,
        mensagem: resultado.mensagem
      }, 400);
    }
    
    // 4. Processar resultado
    if (resultado.recibo) {
      // Lote recebido, precisa consultar depois
      console.log(`[SEFAZ_ROUTES] Lote recebido. Recibo: ${resultado.recibo}`);
      
      if (nfeId) {
        await supabase
          .from('fiscal_nfes')
          .update({
            status: 'processando',
            recibo_sefaz: resultado.recibo,
            data_envio_sefaz: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', nfeId)
          .eq('user_id', user.id);
      }
      
      return c.json({
        success: true,
        data: {
          recibo: resultado.recibo,
          dataHora: resultado.dataHoraRecebimento,
          status: 'processando',
          mensagem: resultado.mensagem
        }
      });
    }
    
    if (resultado.protocolo) {
      // Autorizado imediatamente
      console.log(`[SEFAZ_ROUTES] Autorizado! Protocolo: ${resultado.protocolo}`);
      
      if (nfeId) {
        await supabase
          .from('fiscal_nfes')
          .update({
            status: 'autorizada',
            protocolo: resultado.protocolo,
            data_autorizacao: new Date().toISOString(),
            xml_autorizado: resultado.xmlRetorno,
            updated_at: new Date().toISOString()
          })
          .eq('id', nfeId)
          .eq('user_id', user.id);
      }
      
      return c.json({
        success: true,
        data: {
          protocolo: resultado.protocolo,
          status: 'autorizada',
          mensagem: resultado.mensagem
        }
      });
    }
    
    // Caso inesperado
    return c.json({
      success: true,
      data: resultado
    });
    
  } catch (error: any) {
    console.error('[SEFAZ_ROUTES] Erro não tratado:', error);
    return c.json({
      success: false,
      error: 'Erro ao transmitir NF-e',
      details: error.message
    }, 500);
  }
});

// ============================================================================
// POST /sefaz/nfe/consultar-recibo
// Descrição: Consulta resultado de um lote já enviado
// ============================================================================
sefaz.post('/nfe/consultar-recibo', async (c) => {
  try {
    console.log('[SEFAZ_ROUTES] POST /nfe/consultar-recibo - Início');
    
    // 1. Autenticação
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ success: false, error: 'Token não fornecido' }, 401);
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ success: false, error: 'Token inválido' }, 401);
    }
    
    // 2. Receber dados
    const body = await c.req.json();
    const { nfeId, recibo, uf, ambiente, xmlOriginal } = body;
    
    if (!recibo || !uf || !ambiente) {
      return c.json({
        success: false,
        error: 'Parâmetros obrigatórios: recibo, uf, ambiente'
      }, 400);
    }
    
    console.log(`[SEFAZ_ROUTES] Consultando recibo ${recibo}...`);
    
    // 3. Consultar SEFAZ
    const resultado = await consultarRecibo(
      recibo,
      uf,
      ambiente as Ambiente
    );
    
    if (!resultado.success) {
      return c.json({
        success: false,
        error: resultado.erro,
        codigo: resultado.codigoStatus,
        mensagem: resultado.mensagem
      }, 400);
    }
    
    // 4. Ainda processando?
    if (!resultado.autorizado && resultado.codigoStatus === '105') {
      return c.json({
        success: true,
        data: {
          status: 'processando',
          mensagem: resultado.mensagem
        }
      });
    }
    
    // 5. Rejeitado?
    if (!resultado.autorizado) {
      console.log(`[SEFAZ_ROUTES] Rejeitado: ${resultado.codigoStatus} - ${resultado.mensagem}`);
      
      if (nfeId) {
        await supabase
          .from('fiscal_nfes')
          .update({
            status: 'rejeitada',
            codigo_rejeicao: resultado.codigoStatus,
            mensagem_rejeicao: resultado.mensagem,
            updated_at: new Date().toISOString()
          })
          .eq('id', nfeId)
          .eq('user_id', user.id);
      }
      
      return c.json({
        success: false,
        error: 'NF-e rejeitada',
        codigo: resultado.codigoStatus,
        mensagem: resultado.mensagem
      }, 400);
    }
    
    // 6. Autorizado!
    console.log(`[SEFAZ_ROUTES] Autorizado! Protocolo: ${resultado.protocolo}`);
    
    // Anexar protocolo ao XML se fornecido
    let xmlAutorizado = resultado.xmlProtocoloCompleto;
    if (xmlOriginal && resultado.xmlProtocoloCompleto) {
      xmlAutorizado = anexarProtocoloAoXml(xmlOriginal, resultado.xmlProtocoloCompleto);
    }
    
    if (nfeId) {
      await supabase
        .from('fiscal_nfes')
        .update({
          status: 'autorizada',
          protocolo: resultado.protocolo,
          data_autorizacao: resultado.dataAutorizacao || new Date().toISOString(),
          xml_autorizado: xmlAutorizado,
          updated_at: new Date().toISOString()
        })
        .eq('id', nfeId)
        .eq('user_id', user.id);
    }
    
    return c.json({
      success: true,
      data: {
        autorizado: true,
        protocolo: resultado.protocolo,
        dataAutorizacao: resultado.dataAutorizacao,
        xmlAutorizado,
        mensagem: resultado.mensagem
      }
    });
    
  } catch (error: any) {
    console.error('[SEFAZ_ROUTES] Erro não tratado:', error);
    return c.json({
      success: false,
      error: 'Erro ao consultar recibo',
      details: error.message
    }, 500);
  }
});

// ============================================================================
// GET /sefaz/status/:uf/:ambiente
// Descrição: Consulta status do serviço SEFAZ
// ============================================================================
sefaz.get('/status/:uf/:ambiente', async (c) => {
  try {
    const uf = c.req.param('uf');
    const ambiente = parseInt(c.req.param('ambiente')) as Ambiente;
    
    console.log(`[SEFAZ_ROUTES] Consultando status: ${uf} ambiente ${ambiente}`);
    
    const resultado = await consultarStatusServico(uf, ambiente);
    
    return c.json({
      success: resultado.success,
      data: {
        online: resultado.online,
        ambiente: resultado.ambiente,
        versao: resultado.versao,
        tempoMedio: resultado.tempoMedio,
        mensagem: resultado.mensagem
      },
      error: resultado.erro
    });
    
  } catch (error: any) {
    console.error('[SEFAZ_ROUTES] Erro:', error);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

// ============================================================================
// GET /sefaz/consultar-recibo/:recibo/:uf/:ambiente
// Descrição: Consulta resultado de um lote (endpoint público para testes)
// ============================================================================
sefaz.get('/consultar-recibo/:recibo/:uf/:ambiente', async (c) => {
  try {
    const recibo = c.req.param('recibo');
    const uf = c.req.param('uf');
    const ambiente = parseInt(c.req.param('ambiente')) as Ambiente;
    
    console.log(`[SEFAZ_ROUTES] Consultando recibo: ${recibo} (${uf} - ${ambiente})`);
    
    const resultado = await consultarRecibo(recibo, uf, ambiente);
    
    return c.json({
      success: resultado.success,
      data: resultado.autorizado ? {
        autorizado: resultado.autorizado,
        protocolo: resultado.protocolo,
        dataAutorizacao: resultado.dataAutorizacao,
        codigoStatus: resultado.codigoStatus,
        mensagem: resultado.mensagem
      } : {
        autorizado: false,
        codigoStatus: resultado.codigoStatus,
        mensagem: resultado.mensagem
      },
      error: resultado.erro
    });
    
  } catch (error: any) {
    console.error('[SEFAZ_ROUTES] Erro:', error);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

// ============================================================================
// GET /sefaz/consultar/:chave/:uf/:ambiente
// Descrição: Consulta NF-e pela chave de acesso (endpoint público para testes)
// ============================================================================
sefaz.get('/consultar/:chave/:uf/:ambiente', async (c) => {
  try {
    const chave = c.req.param('chave');
    const uf = c.req.param('uf');
    const ambiente = parseInt(c.req.param('ambiente')) as Ambiente;
    
    console.log(`[SEFAZ_ROUTES] Consultando NF-e: ${chave} (${uf} - ${ambiente})`);
    
    // TODO: Implementar consultarNFePorChave
    // Por enquanto, retornar resposta simulada
    return c.json({
      success: true,
      data: {
        situacao: 'nao_encontrada',
        mensagem: 'NF-e não consta na base de dados da SEFAZ (SIMULADO)',
        chave: chave
      }
    });
    
  } catch (error: any) {
    console.error('[SEFAZ_ROUTES] Erro:', error);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

// ============================================================================
// POST /sefaz/nfe/cancelar
// Descrição: Cancela NF-e autorizada
// Body: { nfeId, chaveNFe, protocolo, justificativa, cnpj, certificado, senha, uf, ambiente }
// ============================================================================
sefaz.post('/nfe/cancelar', async (c) => {
  try {
    console.log('[SEFAZ_ROUTES] POST /nfe/cancelar - Início');
    
    // 1. Autenticação
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ success: false, error: 'Token não fornecido' }, 401);
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ success: false, error: 'Token inválido' }, 401);
    }
    
    // 2. Receber dados
    const body = await c.req.json();
    const { 
      nfeId, 
      chaveNFe, 
      protocolo, 
      justificativa, 
      cnpj,
      certificado,
      senha,
      uf, 
      ambiente 
    } = body;
    
    // Validações
    if (!chaveNFe || !protocolo || !justificativa || !cnpj || !uf || !ambiente) {
      return c.json({
        success: false,
        error: 'Parâmetros obrigatórios: chaveNFe, protocolo, justificativa, cnpj, uf, ambiente'
      }, 400);
    }
    
    if (justificativa.length < 15) {
      return c.json({
        success: false,
        error: 'Justificativa deve ter no mínimo 15 caracteres (requisito SEFAZ)'
      }, 400);
    }
    
    if (justificativa.length > 255) {
      return c.json({
        success: false,
        error: 'Justificativa deve ter no máximo 255 caracteres'
      }, 400);
    }
    
    console.log(`[SEFAZ_ROUTES] Cancelando NF-e: ${chaveNFe}`);
    console.log(`[SEFAZ_ROUTES] Protocolo: ${protocolo}`);
    console.log(`[SEFAZ_ROUTES] Justificativa: ${justificativa.substring(0, 50)}...`);
    
    // 3. Gerar XML do evento de cancelamento
    const xmlEvento = gerarXMLEventoCancelamento(
      chaveNFe,
      protocolo,
      justificativa,
      cnpj,
      ambiente as Ambiente
    );
    
    console.log('[SEFAZ_ROUTES] XML do evento gerado');
    
    // 4. Assinar XML
    // TODO: Implementar assinatura digital do evento
    // Por enquanto, usar o XML sem assinatura (vai falhar no SEFAZ real mas funciona no fallback)
    const xmlAssinado = xmlEvento;
    
    console.log('[SEFAZ_ROUTES] ⚠️ XML não assinado (assinatura será implementada)');
    
    // 5. Transmitir cancelamento para SEFAZ
    const resultado = await cancelarNFe(
      chaveNFe,
      protocolo,
      justificativa,
      cnpj,
      xmlAssinado,
      uf,
      ambiente as Ambiente
    );
    
    if (!resultado.success) {
      console.error('[SEFAZ_ROUTES] Erro no cancelamento:', resultado.erro);
      
      return c.json({
        success: false,
        error: resultado.erro,
        codigo: resultado.codigoStatus,
        mensagem: resultado.mensagem
      }, 400);
    }
    
    // 6. Cancelamento autorizado!
    console.log(`[SEFAZ_ROUTES] ✅ Cancelamento autorizado! Protocolo: ${resultado.protocolo}`);
    
    // 7. Atualizar NF-e no KV Store (se nfeId fornecido)
    if (nfeId) {
      try {
        const nfeKey = `nfe:${user.id}:${nfeId}`;
        const nfeAtual = await kv.get(nfeKey);
        
        if (nfeAtual) {
          // Adicionar evento de cancelamento
          const eventoCancelamento = {
            tipo: 'cancelamento',
            timestamp: new Date().toISOString(),
            descricao: `NF-e cancelada: ${justificativa}`,
            codigo: resultado.codigoStatus,
            dados: {
              protocolo: resultado.protocolo,
              justificativa,
              dataCancelamento: resultado.dataCancelamento
            }
          };
          
          // Atualizar NF-e
          const nfeAtualizada = {
            ...nfeAtual,
            status: 'cancelada',
            codigoStatus: resultado.codigoStatus,
            mensagemStatus: resultado.mensagem,
            eventos: [...(nfeAtual.eventos || []), eventoCancelamento],
            updatedAt: new Date().toISOString()
          };
          
          await kv.set(nfeKey, nfeAtualizada);
          console.log(`[SEFAZ_ROUTES] ✅ NF-e ${nfeId} atualizada para status 'cancelada'`);
        } else {
          console.warn(`[SEFAZ_ROUTES] ⚠️ NF-e ${nfeId} não encontrada no KV Store`);
        }
      } catch (error: any) {
        console.error(`[SEFAZ_ROUTES] Erro ao atualizar NF-e no KV Store:`, error);
        // Não retornar erro, pois o cancelamento foi bem-sucedido
      }
    }
    
    return c.json({
      success: true,
      data: {
        cancelado: true,
        protocolo: resultado.protocolo,
        dataCancelamento: resultado.dataCancelamento,
        mensagem: resultado.mensagem,
        xmlEvento: resultado.xmlEventoCompleto
      }
    });
    
  } catch (error: any) {
    console.error('[SEFAZ_ROUTES] Erro não tratado:', error);
    return c.json({
      success: false,
      error: 'Erro ao cancelar NF-e',
      details: error.message
    }, 500);
  }
});

// ============================================================================
// POST /sefaz/nfe/carta-correcao
// Descrição: Envia Carta de Correção Eletrônica (CC-e)
// Body: { nfeId, chaveNFe, sequencia, correcao, cnpj, uf, ambiente }
// ============================================================================
sefaz.post('/nfe/carta-correcao', async (c) => {
  try {
    console.log('[SEFAZ_ROUTES] POST /nfe/carta-correcao - Início');
    
    // 1. Autenticação
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ success: false, error: 'Token não fornecido' }, 401);
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ success: false, error: 'Token inválido' }, 401);
    }
    
    // 2. Receber dados
    const body = await c.req.json();
    const { 
      nfeId, 
      chaveNFe, 
      sequencia,
      correcao,
      cnpj,
      uf, 
      ambiente 
    } = body;
    
    // Validações
    if (!chaveNFe || !sequencia || !correcao || !cnpj || !uf || !ambiente) {
      return c.json({
        success: false,
        error: 'Parâmetros obrigatórios: chaveNFe, sequencia, correcao, cnpj, uf, ambiente'
      }, 400);
    }
    
    if (sequencia < 1 || sequencia > 20) {
      return c.json({
        success: false,
        error: 'Sequência deve estar entre 1 e 20 (limite SEFAZ)'
      }, 400);
    }
    
    if (correcao.length < 15) {
      return c.json({
        success: false,
        error: 'Correção deve ter no mínimo 15 caracteres (requisito SEFAZ)'
      }, 400);
    }
    
    if (correcao.length > 1000) {
      return c.json({
        success: false,
        error: 'Correção deve ter no máximo 1000 caracteres'
      }, 400);
    }
    
    console.log(`[SEFAZ_ROUTES] Enviando CC-e para NF-e: ${chaveNFe}`);
    console.log(`[SEFAZ_ROUTES] Sequência: ${sequencia}`);
    console.log(`[SEFAZ_ROUTES] Correção: ${correcao.substring(0, 50)}...`);
    
    // 3. Gerar XML do evento de CC-e
    const condicaoUso = 'A Carta de Correcao e disciplinada pelo paragrafo 1o-A do art. 7o do Convenio S/N, de 15 de dezembro de 1970 e pode ser utilizada para regularizacao de erro ocorrido na emissao de documento fiscal, desde que o erro nao esteja relacionado com: I - as variaveis que determinam o valor do imposto tais como: base de calculo, aliquota, diferenca de preco, quantidade, valor da operacao ou da prestacao; II - a correcao de dados cadastrais que implique mudanca do remetente ou do destinatario; III - a data de emissao ou de saida.';
    
    const xmlEvento = gerarXMLEventoCCe(
      chaveNFe,
      sequencia,
      correcao,
      condicaoUso,
      cnpj,
      ambiente as Ambiente
    );
    
    console.log('[SEFAZ_ROUTES] XML do evento gerado');
    
    // 4. Assinar XML
    // TODO: Implementar assinatura digital do evento
    // Por enquanto, usar o XML sem assinatura (vai falhar no SEFAZ real mas funciona no fallback)
    const xmlAssinado = xmlEvento;
    
    console.log('[SEFAZ_ROUTES] ⚠️ XML não assinado (assinatura será implementada)');
    
    // 5. Transmitir CC-e para SEFAZ
    const resultado = await enviarCartaCorrecao(
      chaveNFe,
      sequencia,
      correcao,
      cnpj,
      xmlAssinado,
      uf,
      ambiente as Ambiente
    );
    
    if (!resultado.success) {
      console.error('[SEFAZ_ROUTES] Erro ao enviar CC-e:', resultado.erro);
      
      return c.json({
        success: false,
        error: resultado.erro,
        codigo: resultado.codigoStatus,
        mensagem: resultado.mensagem
      }, 400);
    }
    
    // 6. CC-e registrada!
    console.log(`[SEFAZ_ROUTES] ✅ CC-e registrada! Protocolo: ${resultado.protocolo}`);
    
    // 7. Atualizar NF-e no KV Store (se nfeId fornecido)
    if (nfeId) {
      try {
        const nfeKey = `nfe:${user.id}:${nfeId}`;
        const nfeAtual = await kv.get(nfeKey);
        
        if (nfeAtual) {
          // Adicionar evento de CC-e
          const eventoCCe = {
            tipo: 'carta_correcao',
            timestamp: new Date().toISOString(),
            descricao: `Carta de Correção ${sequencia}: ${correcao.substring(0, 100)}...`,
            codigo: resultado.codigoStatus,
            dados: {
              protocolo: resultado.protocolo,
              sequencia,
              correcao,
              dataRegistro: resultado.dataRegistro
            }
          };
          
          // Atualizar NF-e
          const nfeAtualizada = {
            ...nfeAtual,
            eventos: [...(nfeAtual.eventos || []), eventoCCe],
            updatedAt: new Date().toISOString()
          };
          
          await kv.set(nfeKey, nfeAtualizada);
          console.log(`[SEFAZ_ROUTES] ✅ CC-e registrada na NF-e ${nfeId}`);
        } else {
          console.warn(`[SEFAZ_ROUTES] ⚠️ NF-e ${nfeId} não encontrada no KV Store`);
        }
      } catch (error: any) {
        console.error(`[SEFAZ_ROUTES] Erro ao atualizar NF-e no KV Store:`, error);
        // Não retornar erro, pois a CC-e foi bem-sucedida
      }
    }
    
    return c.json({
      success: true,
      data: {
        registrado: true,
        protocolo: resultado.protocolo,
        dataRegistro: resultado.dataRegistro,
        mensagem: resultado.mensagem,
        xmlEvento: resultado.xmlEventoCompleto,
        sequencia
      }
    });
    
  } catch (error: any) {
    console.error('[SEFAZ_ROUTES] Erro não tratado:', error);
    return c.json({
      success: false,
      error: 'Erro ao enviar Carta de Correção',
      details: error.message
    }, 500);
  }
});

export default sefaz;