/**
 * ============================================================================
 * WEBSERVICES SEFAZ - URLs por UF e Ambiente
 * ============================================================================
 * 
 * Mapeamento de URLs dos webservices SEFAZ por:
 * - UF (Unidade Federativa)
 * - Ambiente (1 = Produção, 2 = Homologação)
 * - Serviço (Autorização, Consulta, Cancelamento, etc)
 * 
 * Baseado no Manual de Integração NF-e v7.0
 * Atualizado em: Novembro 2024
 * 
 * ============================================================================
 */

// ============================================================================
// TIPOS
// ============================================================================

export type Ambiente = 1 | 2; // 1 = Produção, 2 = Homologação

export interface WebserviceUrls {
  autorizacao: string;           // NFeAutorizacao4
  retornoAutorizacao: string;    // NFeRetAutorizacao4
  consultaProtocolo: string;     // NFeConsultaProtocolo4
  inutilizacao: string;          // NFeInutilizacao4
  eventoRecepcao: string;        // NFeRecepcaoEvento4 (cancelamento, CCe, etc)
  statusServico: string;         // NFeStatusServico4
}

// ============================================================================
// SEFAZ VIRTUAL (SVRS) - Usado pela maioria dos estados
// ============================================================================

const SVRS_HOMOLOGACAO: WebserviceUrls = {
  autorizacao: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
  retornoAutorizacao: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx',
  consultaProtocolo: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeConsulta/NFeConsultaProtocolo4.asmx',
  inutilizacao: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeInutilizacao/NFeInutilizacao4.asmx',
  eventoRecepcao: 'https://nfe-homologacao.svrs.rs.gov.br/ws/RecepcaoEvento/NFeRecepcaoEvento4.asmx',
  statusServico: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NFeStatusServico4.asmx'
};

const SVRS_PRODUCAO: WebserviceUrls = {
  autorizacao: 'https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
  retornoAutorizacao: 'https://nfe.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx',
  consultaProtocolo: 'https://nfe.svrs.rs.gov.br/ws/NfeConsulta/NFeConsultaProtocolo4.asmx',
  inutilizacao: 'https://nfe.svrs.rs.gov.br/ws/NfeInutilizacao/NFeInutilizacao4.asmx',
  eventoRecepcao: 'https://nfe.svrs.rs.gov.br/ws/RecepcaoEvento/NFeRecepcaoEvento4.asmx',
  statusServico: 'https://nfe.svrs.rs.gov.br/ws/NfeStatusServico/NFeStatusServico4.asmx'
};

// ============================================================================
// SEFAZ PRÓPRIAS (Estados com infraestrutura própria)
// ============================================================================

// São Paulo (SP)
const SP_HOMOLOGACAO: WebserviceUrls = {
  autorizacao: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx',
  retornoAutorizacao: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx',
  consultaProtocolo: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx',
  inutilizacao: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeinutilizacao4.asmx',
  eventoRecepcao: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx',
  statusServico: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx'
};

const SP_PRODUCAO: WebserviceUrls = {
  autorizacao: 'https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx',
  retornoAutorizacao: 'https://nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx',
  consultaProtocolo: 'https://nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx',
  inutilizacao: 'https://nfe.fazenda.sp.gov.br/ws/nfeinutilizacao4.asmx',
  eventoRecepcao: 'https://nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx',
  statusServico: 'https://nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx'
};

// Minas Gerais (MG)
const MG_HOMOLOGACAO: WebserviceUrls = {
  autorizacao: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeAutorizacao4',
  retornoAutorizacao: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeRetAutorizacao4',
  consultaProtocolo: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeConsultaProtocolo4',
  inutilizacao: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeInutilizacao4',
  eventoRecepcao: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeRecepcaoEvento4',
  statusServico: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4'
};

const MG_PRODUCAO: WebserviceUrls = {
  autorizacao: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeAutorizacao4',
  retornoAutorizacao: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeRetAutorizacao4',
  consultaProtocolo: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeConsultaProtocolo4',
  inutilizacao: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeInutilizacao4',
  eventoRecepcao: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeRecepcaoEvento4',
  statusServico: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4'
};

// Ceará (CE)
const CE_HOMOLOGACAO: WebserviceUrls = {
  autorizacao: 'https://nfeh.sefaz.ce.gov.br/nfe4/services/NFeAutorizacao4',
  retornoAutorizacao: 'https://nfeh.sefaz.ce.gov.br/nfe4/services/NFeRetAutorizacao4',
  consultaProtocolo: 'https://nfeh.sefaz.ce.gov.br/nfe4/services/NFeConsultaProtocolo4',
  inutilizacao: 'https://nfeh.sefaz.ce.gov.br/nfe4/services/NFeInutilizacao4',
  eventoRecepcao: 'https://nfeh.sefaz.ce.gov.br/nfe4/services/NFeRecepcaoEvento4',
  statusServico: 'https://nfeh.sefaz.ce.gov.br/nfe4/services/NFeStatusServico4'
};

const CE_PRODUCAO: WebserviceUrls = {
  autorizacao: 'https://nfe.sefaz.ce.gov.br/nfe4/services/NFeAutorizacao4',
  retornoAutorizacao: 'https://nfe.sefaz.ce.gov.br/nfe4/services/NFeRetAutorizacao4',
  consultaProtocolo: 'https://nfe.sefaz.ce.gov.br/nfe4/services/NFeConsultaProtocolo4',
  inutilizacao: 'https://nfe.sefaz.ce.gov.br/nfe4/services/NFeInutilizacao4',
  eventoRecepcao: 'https://nfe.sefaz.ce.gov.br/nfe4/services/NFeRecepcaoEvento4',
  statusServico: 'https://nfe.sefaz.ce.gov.br/nfe4/services/NFeStatusServico4'
};

// ============================================================================
// MAPEAMENTO POR UF
// ============================================================================

type UFCode = string;

interface WebserviceConfig {
  homologacao: WebserviceUrls;
  producao: WebserviceUrls;
  usaSVRS: boolean; // Se true, usa SVRS; se false, tem SEFAZ própria
}

const WEBSERVICES_POR_UF: Record<UFCode, WebserviceConfig> = {
  // Estados com SEFAZ Própria
  'SP': { homologacao: SP_HOMOLOGACAO, producao: SP_PRODUCAO, usaSVRS: false },
  'MG': { homologacao: MG_HOMOLOGACAO, producao: MG_PRODUCAO, usaSVRS: false },
  'CE': { homologacao: CE_HOMOLOGACAO, producao: CE_PRODUCAO, usaSVRS: false },
  
  // Estados que usam SVRS (maioria)
  'AC': { homologacao: SVRS_HOMOLOGACAO, producao: SVRS_PRODUCAO, usaSVRS: true },
  'AL': { homologacao: SVRS_HOMOLOGACAO, producao: SVRS_PRODUCAO, usaSVRS: true },
  'AP': { homologacao: SVRS_HOMOLOGACAO, producao: SVRS_PRODUCAO, usaSVRS: true },
  'AM': { homologacao: SVRS_HOMOLOGACAO, producao: SVRS_PRODUCAO, usaSVRS: true },
  'BA': { homologacao: SVRS_HOMOLOGACAO, producao: SVRS_PRODUCAO, usaSVRS: true },
  'DF': { homologacao: SVRS_HOMOLOGACAO, producao: SVRS_PRODUCAO, usaSVRS: true },
  'ES': { homologacao: SVRS_HOMOLOGACAO, producao: SVRS_PRODUCAO, usaSVRS: true },
  'GO': { homologacao: SVRS_HOMOLOGACAO, producao: SVRS_PRODUCAO, usaSVRS: true },
  'MA': { homologacao: SVRS_HOMOLOGACAO, producao: SVRS_PRODUCAO, usaSVRS: true },
  'MS': { homologacao: SVRS_HOMOLOGACAO, producao: SVRS_PRODUCAO, usaSVRS: true },
  'MT': { homologacao: SVRS_HOMOLOGACAO, producao: SVRS_PRODUCAO, usaSVRS: true },
  'PA': { homologacao: SVRS_HOMOLOGACAO, producao: SVRS_PRODUCAO, usaSVRS: true },
  'PB': { homologacao: SVRS_HOMOLOGACAO, producao: SVRS_PRODUCAO, usaSVRS: true },
  'PE': { homologacao: SVRS_HOMOLOGACAO, producao: SVRS_PRODUCAO, usaSVRS: true },
  'PI': { homologacao: SVRS_HOMOLOGACAO, producao: SVRS_PRODUCAO, usaSVRS: true },
  'PR': { homologacao: SVRS_HOMOLOGACAO, producao: SVRS_PRODUCAO, usaSVRS: true },
  'RJ': { homologacao: SVRS_HOMOLOGACAO, producao: SVRS_PRODUCAO, usaSVRS: true },
  'RN': { homologacao: SVRS_HOMOLOGACAO, producao: SVRS_PRODUCAO, usaSVRS: true },
  'RO': { homologacao: SVRS_HOMOLOGACAO, producao: SVRS_PRODUCAO, usaSVRS: true },
  'RR': { homologacao: SVRS_HOMOLOGACAO, producao: SVRS_PRODUCAO, usaSVRS: true },
  'RS': { homologacao: SVRS_HOMOLOGACAO, producao: SVRS_PRODUCAO, usaSVRS: true },
  'SC': { homologacao: SVRS_HOMOLOGACAO, producao: SVRS_PRODUCAO, usaSVRS: true },
  'SE': { homologacao: SVRS_HOMOLOGACAO, producao: SVRS_PRODUCAO, usaSVRS: true },
  'TO': { homologacao: SVRS_HOMOLOGACAO, producao: SVRS_PRODUCAO, usaSVRS: true }
};

// ============================================================================
// FUNÇÕES PÚBLICAS
// ============================================================================

/**
 * Obtém as URLs dos webservices para uma UF e ambiente específicos
 * 
 * @param uf - Sigla da UF (ex: 'SP', 'CE', 'MG')
 * @param ambiente - 1 = Produção, 2 = Homologação
 * @returns URLs dos webservices
 */
export function obterWebservices(uf: string, ambiente: Ambiente): WebserviceUrls {
  const ufUpper = uf.toUpperCase();
  
  if (!WEBSERVICES_POR_UF[ufUpper]) {
    console.warn(`⚠️ UF ${uf} não encontrada, usando SVRS como fallback`);
    return ambiente === 2 ? SVRS_HOMOLOGACAO : SVRS_PRODUCAO;
  }
  
  const config = WEBSERVICES_POR_UF[ufUpper];
  return ambiente === 2 ? config.homologacao : config.producao;
}

/**
 * Verifica se uma UF usa SVRS ou tem SEFAZ própria
 */
export function usaSVRS(uf: string): boolean {
  const ufUpper = uf.toUpperCase();
  return WEBSERVICES_POR_UF[ufUpper]?.usaSVRS ?? true;
}

/**
 * Lista todas as UFs suportadas
 */
export function listarUFs(): string[] {
  return Object.keys(WEBSERVICES_POR_UF);
}

/**
 * Obtém informações sobre o ambiente
 */
export function obterNomeAmbiente(ambiente: Ambiente): string {
  return ambiente === 1 ? 'Produção' : 'Homologação';
}

// ============================================================================
// AÇÕES SOAP (SOAPAction headers)
// ============================================================================

export const SOAP_ACTIONS = {
  AUTORIZACAO: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote',
  RETORNO_AUTORIZACAO: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRetAutorizacao4/nfeRetAutorizacaoLote',
  CONSULTA_PROTOCOLO: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4/nfeConsultaNF',
  INUTILIZACAO: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeInutilizacao4/nfeInutilizacaoNF',
  RECEPCAO_EVENTO: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento',
  STATUS_SERVICO: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4/nfeStatusServicoNF'
} as const;

// ============================================================================
// NAMESPACES
// ============================================================================

export const NAMESPACES = {
  NFE: 'http://www.portalfiscal.inf.br/nfe',
  SOAP: 'http://www.w3.org/2003/05/soap-envelope',
  WSDL_AUTORIZACAO: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4',
  WSDL_RET_AUTORIZACAO: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRetAutorizacao4',
  WSDL_CONSULTA: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4',
  WSDL_EVENTO: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4'
} as const;
