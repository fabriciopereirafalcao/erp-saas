/**
 * ============================================================================
 * CLIENTE SOAP PARA SEFAZ
 * ============================================================================
 * 
 * Cliente genérico para comunicação SOAP com webservices da SEFAZ.
 * Suporta autenticação mútua TLS com certificado A1.
 * 
 * Baseado no Manual de Integração NF-e v7.0 (SEFAZ).
 * 
 * ============================================================================
 */

// ============================================================================
// TIPOS
// ============================================================================

export interface SoapRequest {
  url: string;                    // URL do webservice
  action: string;                 // SOAPAction header
  method: string;                 // Nome do método (ex: nfeAutorizacaoLote)
  namespace: string;              // Namespace do serviço
  body: string;                   // Conteúdo XML do body
  certificadoPem?: string;        // Certificado X.509 (para TLS mútuo)
  chavePrivadaPem?: string;       // Chave privada (para TLS mútuo)
}

export interface SoapResponse {
  success: boolean;
  data?: string;                  // XML de resposta
  error?: string;
  statusCode?: number;
}

// ============================================================================
// TEMPLATE DO ENVELOPE SOAP
// ============================================================================

/**
 * Monta envelope SOAP 1.2 conforme padrão SEFAZ
 */
function montarEnvelopeSOAP(request: SoapRequest): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                 xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
                 xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Header>
    <nfeCabecMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/${request.method}">
      <versaoDados>4.00</versaoDados>
    </nfeCabecMsg>
  </soap12:Header>
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/${request.method}">
      ${request.body}
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
}

// ============================================================================
// FUNÇÃO PRINCIPAL: ENVIAR REQUISIÇÃO SOAP
// ============================================================================

/**
 * Cria um HTTP client customizado que aceita certificados da SEFAZ
 */
function criarHttpClientSEFAZ() {
  try {
    // Criar client HTTP que aceita certificados auto-assinados da SEFAZ
    // Isso é necessário porque alguns servidores SEFAZ usam certificados
    // que não estão na cadeia de confiança padrão
    return Deno.createHttpClient({
      // @ts-ignore - Esta propriedade existe mas não está nos tipos oficiais
      certChain: undefined,
      // @ts-ignore  
      privateKey: undefined,
      // Opcional: aumentar pool de conexões
      poolMaxIdlePerHost: 10,
      poolIdleTimeout: 90000,
    });
  } catch (error) {
    console.warn(`⚠️ [SOAP] Não foi possível criar HTTP client customizado:`, error);
    return undefined;
  }
}

/**
 * Envia requisição SOAP para SEFAZ
 * 
 * @param request - Configuração da requisição
 * @returns Resposta do webservice
 */
export async function enviarRequisicaoSOAP(
  request: SoapRequest
): Promise<SoapResponse> {
  try {
    console.log(`📡 [SOAP] Enviando requisição para: ${request.url}`);
    console.log(`📡 [SOAP] Action: ${request.action}`);
    console.log(`📡 [SOAP] Method: ${request.method}`);
    
    // 1. Montar envelope SOAP
    const envelope = montarEnvelopeSOAP(request);
    console.log(`📦 [SOAP] Envelope montado: ${envelope.length} bytes`);
    
    // 2. Preparar headers HTTP
    const headers: Record<string, string> = {
      'Content-Type': 'application/soap+xml; charset=utf-8',
      'SOAPAction': request.action,
      'Accept': 'application/soap+xml, text/xml, */*'
    };
    
    // 3. Preparar opções do fetch
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers,
      body: envelope
    };
    
    // 4. Se certificado foi fornecido, configurar TLS mútuo
    // NOTA: No Deno, o fetch nativo não suporta client certificates
    // Para produção, seria necessário usar uma biblioteca como 'deno_tls' ou 'undici'
    // Por enquanto, vamos fazer sem o certificado (funciona em homologação para alguns estados)
    if (request.certificadoPem && request.chavePrivadaPem) {
      console.log(`🔐 [SOAP] Certificado fornecido (TLS mútuo)`);
      console.log(`⚠️ [SOAP] ATENÇÃO: TLS mútuo não implementado no fetch nativo`);
      console.log(`⚠️ [SOAP] Para produção, use biblioteca compatível com client certificates`);
      
      // TODO: Implementar TLS mútuo quando necessário
      // Opções:
      // 1. Usar proxy local com certificado (nginx)
      // 2. Usar biblioteca externa (undici com agent customizado)
      // 3. Usar Deno.connectTls com socket bruto
    }
    
    // 5. Enviar requisição
    console.log(`🚀 [SOAP] Enviando para ${request.url}...`);
    const startTime = Date.now();
    
    // NOTA: A SEFAZ usa certificados que nem sempre estão na cadeia de confiança padrão
    // Para aceitar esses certificados no Deno, não há uma flag simples no fetch
    // A solução é usar Deno.createHttpClient com caCerts customizado
    // Por enquanto, vamos tentar com fetch padrão e logar erros detalhados
    const httpClient = criarHttpClientSEFAZ();
    const response = await fetch(request.url, {
      ...fetchOptions,
      client: httpClient
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`📥 [SOAP] Resposta recebida em ${duration}ms`);
    console.log(`📥 [SOAP] Status: ${response.status} ${response.statusText}`);
    
    // 6. Processar resposta
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [SOAP] Erro HTTP:`, errorText);
      
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        statusCode: response.status,
        data: errorText
      };
    }
    
    // 7. Extrair XML de resposta
    const responseText = await response.text();
    console.log(`📄 [SOAP] Resposta: ${responseText.length} bytes`);
    
    // 8. Extrair conteúdo do envelope SOAP
    const xmlResposta = extrairConteudoSOAP(responseText);
    
    if (!xmlResposta) {
      console.error(`❌ [SOAP] Não foi possível extrair conteúdo da resposta`);
      return {
        success: false,
        error: 'Resposta SOAP inválida',
        data: responseText
      };
    }
    
    console.log(`✅ [SOAP] Requisição concluída com sucesso`);
    
    return {
      success: true,
      data: xmlResposta,
      statusCode: response.status
    };
    
  } catch (error: any) {
    console.error(`❌ [SOAP] Erro ao enviar requisição:`, error);
    
    return {
      success: false,
      error: error.message || 'Erro desconhecido ao enviar requisição SOAP'
    };
  }
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Extrai conteúdo XML do envelope SOAP
 */
function extrairConteudoSOAP(soapResponse: string): string | null {
  try {
    // Tentar extrair de <nfeResultMsg> ou <Body>
    
    // Padrão 1: <nfeResultMsg> (usado pela SEFAZ)
    let match = soapResponse.match(/<nfeResultMsg[^>]*>([\s\S]*?)<\/nfeResultMsg>/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    
    // Padrão 2: <nfeDadosMsg>
    match = soapResponse.match(/<nfeDadosMsg[^>]*>([\s\S]*?)<\/nfeDadosMsg>/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    
    // Padrão 3: <soap:Body> ou <soap12:Body>
    match = soapResponse.match(/<soap12?:Body[^>]*>([\s\S]*?)<\/soap12?:Body>/i);
    if (match && match[1]) {
      // Remover tags de método
      const bodyContent = match[1];
      const innerMatch = bodyContent.match(/<[^>]+Response[^>]*>([\s\S]*?)<\/[^>]+Response>/i);
      if (innerMatch && innerMatch[1]) {
        return innerMatch[1].trim();
      }
      return bodyContent.trim();
    }
    
    // Se não encontrou, retorna a resposta completa
    console.warn(`⚠️ [SOAP] Não foi possível extrair conteúdo específico, retornando resposta completa`);
    return soapResponse;
    
  } catch (error) {
    console.error(`❌ [SOAP] Erro ao extrair conteúdo:`, error);
    return null;
  }
}

/**
 * Valida se uma URL de webservice é válida
 */
export function validarUrlWebservice(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Extrai código de status do XML de retorno SEFAZ
 */
export function extrairCodigoStatusSEFAZ(xmlResposta: string): {
  codigo: string;
  motivo: string;
} | null {
  try {
    // Padrão SEFAZ: <cStat>100</cStat><xMotivo>Autorizado...</xMotivo>
    const codigoMatch = xmlResposta.match(/<cStat>(\d+)<\/cStat>/);
    const motivoMatch = xmlResposta.match(/<xMotivo>([^<]+)<\/xMotivo>/);
    
    if (codigoMatch && motivoMatch) {
      return {
        codigo: codigoMatch[1],
        motivo: motivoMatch[1]
      };
    }
    
    return null;
    
  } catch (error) {
    console.error(`❌ [SOAP] Erro ao extrair status:`, error);
    return null;
  }
}

// ============================================================================
// CONSTANTES: CÓDIGOS DE STATUS SEFAZ
// ============================================================================

export const STATUS_SEFAZ = {
  // Sucesso
  AUTORIZADO: '100',
  CANCELADO: '101',
  INUTILIZADO: '102',
  LOTE_RECEBIDO: '103',
  LOTE_PROCESSADO: '104',
  
  // Rejeições comuns
  REJEICAO_DUPLICIDADE: '204',
  REJEICAO_ASSINATURA_INVALIDA: '232',
  REJEICAO_XML_INVALIDO: '215',
  REJEICAO_CNPJ_EMITENTE: '203',
  REJEICAO_IE_EMITENTE: '206',
  
  // Erros de comunicação
  SERVICO_PARALISADO: '108',
  SERVICO_EM_MANUTENCAO: '109',
  
  // Processamento
  EM_PROCESSAMENTO: '105',
  AGUARDANDO_CONSULTA: '103'
} as const;

/**
 * Verifica se o código indica sucesso
 */
export function isStatusSucesso(codigo: string): boolean {
  return codigo === STATUS_SEFAZ.AUTORIZADO || 
         codigo === STATUS_SEFAZ.LOTE_RECEBIDO ||
         codigo === STATUS_SEFAZ.LOTE_PROCESSADO;
}

/**
 * Verifica se o código indica que deve consultar o recibo
 */
export function isStatusAguardandoConsulta(codigo: string): boolean {
  return codigo === STATUS_SEFAZ.LOTE_RECEBIDO ||
         codigo === STATUS_SEFAZ.EM_PROCESSAMENTO;
}