/**
 * ============================================================================
 * ROTAS: SEFAZ - Transmissão e Consulta de NF-e
 * ============================================================================
 */

import { Hono } from 'npm:hono@4.6.14';
import { createClient } from 'npm:@supabase/supabase-js@2.49.2';
import { autorizarNFe, consultarRecibo, consultarStatusServico, anexarProtocoloAoXml } from './nfe-services.tsx';
import type { Ambiente } from './webservices.tsx';

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

export default sefaz;