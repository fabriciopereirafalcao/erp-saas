// ============================================================================
// TIPOS TYPESCRIPT - Sistema de Emissão Fiscal
// ============================================================================

// ==================== CERTIFICADO DIGITAL ====================
export interface CertificadoDigital {
  id: string;
  userId: string;
  emitenteId: string;
  nomeArquivo: string;
  tamanhoBytes: number;
  storageBucket: string;
  storagePath: string;
  subjectCn: string;
  subjectOu: string;
  issuerCn: string;
  serialNumber: string;
  validFrom: Date;
  validTo: Date;
  ativo: boolean;
  revogado: boolean;
  ultimaUtilizacao?: Date;
  totalUtilizacoes: number;
}

export interface CertificadoUploadInput {
  emitenteId: string;
  arquivo: Buffer;
  nomeArquivo: string;
  senha: string;
}

export interface CertificadoDecrypted {
  privateKey: string;
  publicKey: string;
  certificate: string;
  chain?: string[];
  validFrom: Date;
  validTo: Date;
  subject: {
    cn: string;
    ou?: string;
  };
  issuer: {
    cn: string;
  };
  serialNumber: string;
}

// ==================== EMITENTE ====================
export interface Emitente {
  id: string;
  userId: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  inscricaoEstadual?: string;
  inscricaoMunicipal?: string;
  suframa?: string;
  cnae?: string;
  crt: number; // 1=Simples Nacional, 2=Presumido, 3=Real
  regimeTributario: string;
  
  // Endereço
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  codigoMunicipio?: string;
  
  // Contato
  telefone?: string;
  email?: string;
  
  // Configurações NF-e
  nfeAmbiente: number; // 1=Produção, 2=Homologação
  nfeSerie: string;
  nfeNumeroAtual: number;
  nfeNaturezaOperacaoPadrao?: string;
  nfeCfopPadrao?: string;
  nfeTipoOperacaoPadrao?: string;
  nfeCscToken?: string;
  nfeCscId?: string;
  
  // Configurações NFC-e
  nfceAtivo: boolean;
  nfceAmbiente: number;
  nfceSerie: string;
  nfceNumeroAtual: number;
  nfceCscToken?: string;
  nfceCscId?: string;
  
  // Certificado
  certificadoId?: string;
  
  ativo: boolean;
}

// ==================== NF-E ====================
export interface NFe {
  id: string;
  userId: string;
  emitenteId: string;
  
  // Identificação
  tipoNfe: number; // 55=NF-e, 65=NFC-e
  modelo: string;
  serie: string;
  numero: number;
  chaveAcesso?: string;
  
  // Datas
  dataEmissao: Date;
  dataSaidaEntrada?: Date;
  
  // Natureza
  naturezaOperacao: string;
  tipoOperacao: number; // 0=Entrada, 1=Saída
  finalidadeNfe: number; // 1=Normal, 2=Complementar, 3=Ajuste, 4=Devolução
  
  // Destinatário
  destinatarioTipo: string; // 'PF' ou 'PJ'
  destinatarioDocumento: string;
  destinatarioNome: string;
  destinatarioIe?: string;
  destinatarioEmail?: string;
  destinatarioTelefone?: string;
  destinatarioEndereco?: any;
  
  // Valores
  valorProdutos: number;
  valorFrete: number;
  valorSeguro: number;
  valorDesconto: number;
  valorOutrasDespesas: number;
  valorTotalNota: number;
  
  // Impostos
  valorIcms: number;
  valorIcmsSt: number;
  valorIcmsDesonerado: number;
  valorFcp: number;
  valorIpi: number;
  valorPis: number;
  valorCofins: number;
  valorIi: number;
  
  // Transporte
  modalidadeFrete: number;
  transportadoraDocumento?: string;
  transportadoraNome?: string;
  veiculoPlaca?: string;
  veiculoUf?: string;
  
  // Pagamento
  formaPagamento: number;
  meioPagamento?: any;
  
  // Informações Adicionais
  informacoesComplementares?: string;
  informacoesFisco?: string;
  
  // Status
  status: string; // Rascunho, Processando, Autorizada, Denegada, Rejeitada, Cancelada
  ambiente: number;
  protocoloAutorizacao?: string;
  dataAutorizacao?: Date;
  codigoStatusSefaz?: string;
  mensagemSefaz?: string;
  digestValue?: string;
  
  // Arquivos
  xmlEnviadoPath?: string;
  xmlAssinadoPath?: string;
  xmlAutorizadoPath?: string;
  danfePdfPath?: string;
  
  // Cancelamento
  cancelada: boolean;
  dataCancelamento?: Date;
  protocoloCancelamento?: string;
  justificativaCancelamento?: string;
  
  // CCe
  cceEnviada: boolean;
  cceSequencia: number;
  
  // Contingência
  emContingencia: boolean;
  tipoContingencia?: string;
  justificativaContingencia?: string;
  
  // Pedido de Venda
  pedidoVendaId?: string;
  
  // Itens
  itens?: NFeItem[];
}

export interface NFeItem {
  id: string;
  nfeId: string;
  numeroItem: number;
  
  // Produto
  codigoProduto: string;
  ean?: string;
  descricao: string;
  ncm: string;
  cest?: string;
  cfop: string;
  unidadeComercial: string;
  quantidadeComercial: number;
  valorUnitarioComercial: number;
  valorTotalBruto: number;
  eanTributavel?: string;
  unidadeTributavel: string;
  quantidadeTributavel: number;
  valorUnitarioTributavel: number;
  valorFrete: number;
  valorSeguro: number;
  valorDesconto: number;
  valorOutrasDespesas: number;
  
  // ICMS
  origem: number;
  cstIcms?: string;
  csosn?: string;
  modalidadeBcIcms?: number;
  baseCalculoIcms: number;
  aliquotaIcms: number;
  valorIcms: number;
  
  // ICMS ST
  modalidadeBcIcmsSt?: number;
  baseCalculoIcmsSt: number;
  aliquotaIcmsSt: number;
  valorIcmsSt: number;
  
  // FCP
  aliquotaFcp: number;
  valorFcp: number;
  
  // IPI
  cstIpi?: string;
  baseCalculoIpi: number;
  aliquotaIpi: number;
  valorIpi: number;
  
  // PIS
  cstPis?: string;
  baseCalculoPis: number;
  aliquotaPis: number;
  valorPis: number;
  
  // COFINS
  cstCofins?: string;
  baseCalculoCofins: number;
  aliquotaCofins: number;
  valorCofins: number;
  
  // Informações Adicionais
  informacoesAdicionais?: string;
}

// ==================== XML NF-E ====================
export interface XmlNFeInput {
  emitente: Emitente;
  nfe: NFe;
  itens: NFeItem[];
  certificado: CertificadoDecrypted;
}

export interface XmlNFeOutput {
  xml: string;
  xmlAssinado: string;
  chaveAcesso: string;
  digestValue: string;
}

// ==================== SEFAZ ====================
export interface SefazEnvioInput {
  xml: string;
  ambiente: number;
  certificado: CertificadoDecrypted;
  uf: string;
}

export interface SefazRetorno {
  sucesso: boolean;
  codigoStatus: string;
  mensagem: string;
  protocolo?: string;
  dataRecebimento?: Date;
  xml?: string;
  erros?: string[];
}

export interface SefazConsultaReciboInput {
  recibo: string;
  ambiente: number;
  certificado: CertificadoDecrypted;
  uf: string;
}

// ==================== LOGS ====================
export interface FiscalLog {
  userId: string;
  emitenteId?: string;
  nfeId?: string;
  certificadoId?: string;
  tipo: string;
  severidade: 'info' | 'warning' | 'error' | 'critical';
  mensagem: string;
  detalhes?: string;
  codigoStatusSefaz?: string;
  mensagemSefaz?: string;
  protocolo?: string;
  requestPayload?: any;
  responsePayload?: any;
  xmlEnviado?: string;
  xmlRetornado?: string;
  ipAddress?: string;
  userAgent?: string;
  ambiente?: string;
  duracaoMs?: number;
}

// ==================== CÁLCULOS FISCAIS ====================
export interface CalculoImpostosInput {
  item: NFeItem;
  emitente: Emitente;
  destinatarioUf: string;
  regimeTributario: string;
}

export interface CalculoImpostosOutput {
  icms: {
    baseCalculo: number;
    aliquota: number;
    valor: number;
  };
  icmsSt: {
    baseCalculo: number;
    aliquota: number;
    valor: number;
  };
  fcp: {
    aliquota: number;
    valor: number;
  };
  ipi: {
    baseCalculo: number;
    aliquota: number;
    valor: number;
  };
  pis: {
    baseCalculo: number;
    aliquota: number;
    valor: number;
  };
  cofins: {
    baseCalculo: number;
    aliquota: number;
    valor: number;
  };
}

// ==================== RESPOSTA DA API ====================
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
