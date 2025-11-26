/**
 * ============================================================================
 * SERVIÇOS NF-e - Autorização, Consulta, Cancelamento
 * ============================================================================
 * 
 * Implementação dos serviços SEFAZ para NF-e:
 * - Autorização de lote
 * - Consulta de recibo
 * - Consulta de protocolo
 * - Status do serviço
 * 
 * ============================================================================
 */

import { enviarRequisicaoSOAP, extrairCodigoStatusSEFAZ, isStatusAguardandoConsulta } from './soap-client.tsx';
import { obterWebservices, SOAP_ACTIONS, type Ambiente } from './webservices.tsx';

// ============================================================================
// TIPOS
// ============================================================================

export interface ResultadoAutorizacao {
  success: boolean;
  recibo?: string;              // Número do recibo para consulta posterior
  protocolo?: string;           // Protocolo de autorização (se autorizado imediatamente)
  dataHoraRecebimento?: string; // Data/hora do recebimento pela SEFAZ
  xmlRetorno?: string;          // XML completo de retorno
  codigoStatus?: string;        // Código de status (100, 103, etc)
  mensagem?: string;            // Mensagem descritiva
  erro?: string;
}

export interface ResultadoConsultaRecibo {
  success: boolean;
  autorizado?: boolean;         // true se NF-e foi autorizada
  protocolo?: string;           // Protocolo de autorização
  dataAutorizacao?: string;     // Data/hora da autorização
  xmlProtocoloCompleto?: string;// XML do protNFe (para anexar ao XML original)
  codigoStatus?: string;
  mensagem?: string;
  erro?: string;
}

export interface ResultadoStatusServico {
  success: boolean;
  online?: boolean;             // true se serviço está operacional
  ambiente?: string;            // '1' = Produção, '2' = Homologação
  versao?: string;              // Versão da aplicação SEFAZ
  tempoMedio?: string;          // Tempo médio de resposta
  mensagem?: string;
  erro?: string;
}

// ============================================================================
// SERVIÇO 1: AUTORIZAÇÃO DE LOTE
// ============================================================================

/**
 * Envia lote de NF-e para autorização
 * 
 * @param xmlNFe - XML da NF-e assinado
 * @param uf - UF do emitente
 * @param ambiente - 1 = Produção, 2 = Homologação
 * @param idLote - ID do lote (número sequencial)
 * @returns Resultado da transmissão
 */
export async function autorizarNFe(
  xmlNFe: string,
  uf: string,
  ambiente: Ambiente,
  idLote: string = gerarIdLote()
): Promise<ResultadoAutorizacao> {
  try {
    console.log(`📡 [SEFAZ] Autorizando NF-e...`);
    console.log(`📡 [SEFAZ] UF: ${uf}, Ambiente: ${ambiente}, Lote: ${idLote}`);
    
    // 1. Obter URL do webservice
    const webservices = obterWebservices(uf, ambiente);
    const url = webservices.autorizacao;
    
    console.log(`📡 [SEFAZ] URL: ${url}`);
    
    // 2. Montar XML do lote
    const xmlLote = montarXmlLote(idLote, xmlNFe);
    
    // 3. Enviar via SOAP
    const resultado = await enviarRequisicaoSOAP({
      url,
      action: SOAP_ACTIONS.AUTORIZACAO,
      method: 'NFeAutorizacao4',
      namespace: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4',
      body: xmlLote
    });
    
    if (!resultado.success || !resultado.data) {
      return {
        success: false,
        erro: resultado.error || 'Erro ao enviar requisição SOAP'
      };
    }
    
    console.log(`📥 [SEFAZ] Resposta recebida`);
    
    // 4. Processar resposta
    return processarRespostaAutorizacao(resultado.data);
    
  } catch (error: any) {
    console.error(`❌ [SEFAZ] Erro ao autorizar NF-e:`, error);
    return {
      success: false,
      erro: error.message || 'Erro desconhecido'
    };
  }
}

/**
 * Monta XML do lote de NF-e
 */
function montarXmlLote(idLote: string, xmlNFe: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <idLote>${idLote}</idLote>
  <indSinc>0</indSinc>
  ${xmlNFe}
</enviNFe>`;
}

/**
 * Processa resposta de autorização
 */
function processarRespostaAutorizacao(xmlResposta: string): ResultadoAutorizacao {
  try {
    // Extrair informações da resposta
    const status = extrairCodigoStatusSEFAZ(xmlResposta);
    
    if (!status) {
      return {
        success: false,
        erro: 'Não foi possível extrair status da resposta',
        xmlRetorno: xmlResposta
      };
    }
    
    console.log(`📊 [SEFAZ] Status: ${status.codigo} - ${status.motivo}`);
    
    // Extrair recibo (para consulta posterior)
    const reciboMatch = xmlResposta.match(/<nRec>(\d+)<\/nRec>/);
    const recibo = reciboMatch ? reciboMatch[1] : undefined;
    
    // Extrair data/hora
    const dataMatch = xmlResposta.match(/<dhRecbto>([^<]+)<\/dhRecbto>/);
    const dataHora = dataMatch ? dataMatch[1] : undefined;
    
    // Verificar se foi autorizado imediatamente ou se precisa consultar
    if (status.codigo === '100') {
      // Autorizado imediatamente
      const protocoloMatch = xmlResposta.match(/<nProt>(\d+)<\/nProt>/);
      const protocolo = protocoloMatch ? protocoloMatch[1] : undefined;
      
      return {
        success: true,
        protocolo,
        codigoStatus: status.codigo,
        mensagem: status.motivo,
        xmlRetorno: xmlResposta
      };
    }
    
    if (isStatusAguardandoConsulta(status.codigo)) {
      // Lote recebido, aguardar processamento
      return {
        success: true,
        recibo,
        dataHoraRecebimento: dataHora,
        codigoStatus: status.codigo,
        mensagem: `Lote recebido. Consulte o recibo ${recibo} em alguns segundos.`,
        xmlRetorno: xmlResposta
      };
    }
    
    // Rejeição
    return {
      success: false,
      codigoStatus: status.codigo,
      mensagem: status.motivo,
      erro: `Rejeição ${status.codigo}: ${status.motivo}`,
      xmlRetorno: xmlResposta
    };
    
  } catch (error: any) {
    console.error(`❌ [SEFAZ] Erro ao processar resposta:`, error);
    return {
      success: false,
      erro: error.message,
      xmlRetorno: xmlResposta
    };
  }
}

// ============================================================================
// SERVIÇO 2: CONSULTA DE RECIBO
// ============================================================================

/**
 * Consulta o resultado de um lote já enviado
 * 
 * @param recibo - Número do recibo retornado na autorização
 * @param uf - UF do emitente
 * @param ambiente - 1 = Produção, 2 = Homologação
 * @returns Resultado da consulta
 */
export async function consultarRecibo(
  recibo: string,
  uf: string,
  ambiente: Ambiente
): Promise<ResultadoConsultaRecibo> {
  try {
    console.log(`🔍 [SEFAZ] Consultando recibo ${recibo}...`);
    
    // 1. Obter URL do webservice
    const webservices = obterWebservices(uf, ambiente);
    const url = webservices.retornoAutorizacao;
    
    // 2. Montar XML de consulta
    const xmlConsulta = montarXmlConsultaRecibo(recibo, ambiente);
    
    // 3. Enviar via SOAP
    const resultado = await enviarRequisicaoSOAP({
      url,
      action: SOAP_ACTIONS.RETORNO_AUTORIZACAO,
      method: 'NFeRetAutorizacao4',
      namespace: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRetAutorizacao4',
      body: xmlConsulta
    });
    
    if (!resultado.success || !resultado.data) {
      return {
        success: false,
        erro: resultado.error || 'Erro ao consultar recibo'
      };
    }
    
    // 4. Processar resposta
    return processarRespostaConsultaRecibo(resultado.data);
    
  } catch (error: any) {
    console.error(`❌ [SEFAZ] Erro ao consultar recibo:`, error);
    return {
      success: false,
      erro: error.message
    };
  }
}

/**
 * Monta XML de consulta de recibo
 */
function montarXmlConsultaRecibo(recibo: string, ambiente: Ambiente): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<consReciNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <tpAmb>${ambiente}</tpAmb>
  <nRec>${recibo}</nRec>
</consReciNFe>`;
}

/**
 * Processa resposta de consulta de recibo
 */
function processarRespostaConsultaRecibo(xmlResposta: string): ResultadoConsultaRecibo {
  try {
    const statusLote = extrairCodigoStatusSEFAZ(xmlResposta);
    
    if (!statusLote) {
      return {
        success: false,
        erro: 'Não foi possível extrair status da resposta'
      };
    }
    
    console.log(`📊 [SEFAZ] Status do Lote: ${statusLote.codigo} - ${statusLote.motivo}`);
    
    // Se código 105, ainda está processando
    if (statusLote.codigo === '105') {
      return {
        success: true,
        autorizado: false,
        codigoStatus: statusLote.codigo,
        mensagem: 'Lote ainda em processamento. Tente novamente em alguns segundos.'
      };
    }
    
    // Se código 104 (lote processado), verificar status da NF-e dentro do protNFe
    if (statusLote.codigo === '104') {
      // Extrair conteúdo do protNFe
      const protNFeMatch = xmlResposta.match(/<protNFe[^>]*>([\s\S]*?)<\/protNFe>/);
      
      if (!protNFeMatch) {
        return {
          success: false,
          erro: 'Lote processado mas protNFe não encontrado na resposta'
        };
      }
      
      const xmlProtNFe = protNFeMatch[0];
      const conteudoProtNFe = protNFeMatch[1];
      
      // Extrair status DA NFe (dentro do protNFe)
      const statusNFeMatch = conteudoProtNFe.match(/<cStat>(\d+)<\/cStat>/);
      const motivoNFeMatch = conteudoProtNFe.match(/<xMotivo>([^<]+)<\/xMotivo>/);
      
      if (!statusNFeMatch || !motivoNFeMatch) {
        return {
          success: false,
          erro: 'Não foi possível extrair status da NF-e do protocolo'
        };
      }
      
      const codigoNFe = statusNFeMatch[1];
      const motivoNFe = motivoNFeMatch[1];
      
      console.log(`📊 [SEFAZ] Status da NF-e: ${codigoNFe} - ${motivoNFe}`);
      
      // Verificar se foi autorizada (código 100)
      if (codigoNFe === '100') {
        // Extrair protocolo de autorização
        const protocoloMatch = conteudoProtNFe.match(/<nProt>(\d+)<\/nProt>/);
        const protocolo = protocoloMatch ? protocoloMatch[1] : undefined;
        
        // Extrair data de autorização
        const dataMatch = conteudoProtNFe.match(/<dhRecbto>([^<]+)<\/dhRecbto>/);
        const dataAutorizacao = dataMatch ? dataMatch[1] : undefined;
        
        return {
          success: true,
          autorizado: true,
          protocolo,
          dataAutorizacao,
          xmlProtocoloCompleto: xmlProtNFe,
          codigoStatus: codigoNFe,
          mensagem: motivoNFe
        };
      }
      
      // NF-e foi rejeitada
      return {
        success: false,
        autorizado: false,
        codigoStatus: codigoNFe,
        mensagem: motivoNFe,
        erro: `Rejeição ${codigoNFe}: ${motivoNFe}`
      };
    }
    
    // Se chegou aqui, verificar se o status do lote já indica autorização direta (código 100)
    if (statusLote.codigo === '100') {
      // Extrair protocolo de autorização
      const protocoloMatch = xmlResposta.match(/<nProt>(\d+)<\/nProt>/);
      const protocolo = protocoloMatch ? protocoloMatch[1] : undefined;
      
      // Extrair data de autorização
      const dataMatch = xmlResposta.match(/<dhRecbto>([^<]+)<\/dhRecbto>/);
      const dataAutorizacao = dataMatch ? dataMatch[1] : undefined;
      
      // Extrair XML do protNFe (protocolo completo)
      const protNFeMatch = xmlResposta.match(/<protNFe[^>]*>([\s\S]*?)<\/protNFe>/);
      const xmlProtocolo = protNFeMatch ? protNFeMatch[0] : undefined;
      
      return {
        success: true,
        autorizado: true,
        protocolo,
        dataAutorizacao,
        xmlProtocoloCompleto: xmlProtocolo,
        codigoStatus: statusLote.codigo,
        mensagem: statusLote.motivo
      };
    }
    
    // Rejeição do lote
    return {
      success: false,
      autorizado: false,
      codigoStatus: statusLote.codigo,
      mensagem: statusLote.motivo,
      erro: `Rejeição ${statusLote.codigo}: ${statusLote.motivo}`
    };
    
  } catch (error: any) {
    console.error(`❌ [SEFAZ] Erro ao processar resposta:`, error);
    return {
      success: false,
      erro: error.message
    };
  }
}

// ============================================================================
// SERVIÇO 3: STATUS DO SERVIÇO
// ============================================================================

/**
 * Consulta status do serviço SEFAZ
 * 
 * @param uf - UF do emitente
 * @param ambiente - 1 = Produção, 2 = Homologação
 * @returns Status do serviço
 */
export async function consultarStatusServico(
  uf: string,
  ambiente: Ambiente
): Promise<ResultadoStatusServico> {
  try {
    console.log(`🔍 [SEFAZ] Consultando status do serviço...`);
    
    // 1. Obter URL do webservice
    const webservices = obterWebservices(uf, ambiente);
    const url = webservices.statusServico;
    
    // 2. Montar XML de consulta
    const xmlConsulta = montarXmlStatusServico(uf, ambiente);
    
    // 3. Enviar via SOAP
    const resultado = await enviarRequisicaoSOAP({
      url,
      action: SOAP_ACTIONS.STATUS_SERVICO,
      method: 'NFeStatusServico4',
      namespace: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4',
      body: xmlConsulta
    });
    
    if (!resultado.success || !resultado.data) {
      return {
        success: false,
        online: false,
        erro: resultado.error || 'Erro ao consultar status'
      };
    }
    
    // 4. Processar resposta
    return processarRespostaStatusServico(resultado.data);
    
  } catch (error: any) {
    console.error(`❌ [SEFAZ] Erro ao consultar status:`, error);
    return {
      success: false,
      online: false,
      erro: error.message
    };
  }
}

/**
 * Monta XML de consulta de status
 */
function montarXmlStatusServico(uf: string, ambiente: Ambiente): string {
  const codigoUF = obterCodigoUF(uf);
  
  return `<?xml version="1.0" encoding="utf-8"?>
<consStatServ xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <tpAmb>${ambiente}</tpAmb>
  <cUF>${codigoUF}</cUF>
  <xServ>STATUS</xServ>
</consStatServ>`;
}

/**
 * Processa resposta de status do serviço
 */
function processarRespostaStatusServico(xmlResposta: string): ResultadoStatusServico {
  try {
    const status = extrairCodigoStatusSEFAZ(xmlResposta);
    
    if (!status) {
      return {
        success: false,
        online: false,
        erro: 'Não foi possível extrair status'
      };
    }
    
    // Código 107 = Serviço em operação
    const online = status.codigo === '107';
    
    // Extrair informações adicionais
    const ambienteMatch = xmlResposta.match(/<tpAmb>([^<]+)<\/tpAmb>/);
    const versaoMatch = xmlResposta.match(/<verAplic>([^<]+)<\/verAplic>/);
    const tempoMatch = xmlResposta.match(/<tMed>([^<]+)<\/tMed>/);
    
    return {
      success: true,
      online,
      ambiente: ambienteMatch ? ambienteMatch[1] : undefined,
      versao: versaoMatch ? versaoMatch[1] : undefined,
      tempoMedio: tempoMatch ? `${tempoMatch[1]}s` : undefined,
      mensagem: status.motivo
    };
    
  } catch (error: any) {
    console.error(`❌ [SEFAZ] Erro ao processar status:`, error);
    return {
      success: false,
      online: false,
      erro: error.message
    };
  }
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Gera ID de lote único
 */
function gerarIdLote(): string {
  // ID de lote: 15 dígitos numéricos
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return (timestamp + random).slice(-15);
}

/**
 * Obtém código IBGE da UF
 */
function obterCodigoUF(uf: string): string {
  const codigos: Record<string, string> = {
    'AC': '12', 'AL': '27', 'AP': '16', 'AM': '13', 'BA': '29',
    'CE': '23', 'DF': '53', 'ES': '32', 'GO': '52', 'MA': '21',
    'MT': '51', 'MS': '50', 'MG': '31', 'PA': '15', 'PB': '25',
    'PR': '41', 'PE': '26', 'PI': '22', 'RJ': '33', 'RN': '24',
    'RS': '43', 'RO': '11', 'RR': '14', 'SC': '42', 'SP': '35',
    'SE': '28', 'TO': '17'
  };
  
  return codigos[uf.toUpperCase()] || '35'; // Default: SP
}

/**
 * Anexa protocolo de autorização ao XML da NF-e
 */
export function anexarProtocoloAoXml(xmlNFe: string, xmlProtocolo: string): string {
  // Remover declaração XML do protocolo se houver
  const protocoloLimpo = xmlProtocolo.replace(/<\?xml[^>]*\?>/g, '');
  
  // Envolver em <nfeProc>
  return `<?xml version="1.0" encoding="utf-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  ${xmlNFe.replace(/<\?xml[^>]*\?>/g, '')}
  ${protocoloLimpo}
</nfeProc>`;
}