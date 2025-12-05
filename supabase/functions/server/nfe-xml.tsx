/**
 * Módulo de Geração de XML de NF-e
 * Padrão SEFAZ 4.0
 */

// Tipos
interface NFeXMLData {
  emitente: {
    cnpj: string;
    razaoSocial: string;
    nomeFantasia: string;
    inscricaoEstadual: string;
    cep: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    codigoMunicipio: string;
    estado: string;
    telefone?: string;
    email?: string;
  };
  destinatario: {
    tipo: 'fisica' | 'juridica';
    documento: string;
    nome: string;
    inscricaoEstadual?: string;
    email?: string;
    telefone?: string;
    cep: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    codigoMunicipio: string;
    estado: string;
  };
  identificacao: {
    serie: string;
    numero: number;
    dataEmissao: string;
    dataEntradaSaida?: string;
    tipo: 0 | 1; // 0=Entrada, 1=Saída
    finalidade: 1 | 2 | 3 | 4; // 1=Normal, 2=Complementar, 3=Ajuste, 4=Devolução
    naturezaOperacao: string;
    ambiente: 1 | 2; // 1=Produção, 2=Homologação
    tipoEmissao: 1; // 1=Normal
    modelo: 55 | 65; // 55=NF-e, 65=NFC-e
    consumidorFinal: 0 | 1; // 0=Normal, 1=Consumidor Final
    presenca: 0 | 1 | 2 | 3 | 4 | 9; // Indicador de presença
  };
  itens: Array<{
    numeroItem: number;
    codigoProduto: string;
    descricao: string;
    ncm: string;
    cfop: string;
    unidadeComercial: string;
    quantidadeComercial: number;
    valorUnitarioComercial: number;
    valorTotalBruto: number;
    valorFrete: number;
    valorSeguro: number;
    valorDesconto: number;
    valorOutrasDespesas: number;
    origem: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
    icms: {
      cst?: string;
      csosn?: string;
      modalidadeBC?: number;
      aliquota: number;
      baseCalculo: number;
      valor: number;
    };
    ipi?: {
      cst: string;
      aliquota: number;
      baseCalculo: number;
      valor: number;
    };
    pis: {
      cst: string;
      aliquota: number;
      baseCalculo: number;
      valor: number;
    };
    cofins: {
      cst: string;
      aliquota: number;
      baseCalculo: number;
      valor: number;
    };
  }>;
  totais: {
    baseCalculoICMS: number;
    valorICMS: number;
    baseCalculoICMSST: number;
    valorICMSST: number;
    valorProdutos: number;
    valorFrete: number;
    valorSeguro: number;
    valorDesconto: number;
    valorIPI: number;
    valorPIS: number;
    valorCOFINS: number;
    valorOutrasDespesas: number;
    valorTotal: number;
  };
  transporte?: {
    modalidade: 0 | 1 | 2 | 3 | 4 | 9;
    transportador?: {
      documento: string;
      nome: string;
      inscricaoEstadual?: string;
      endereco?: string;
      cidade?: string;
      estado?: string;
    };
  };
  informacoesAdicionais?: string;
  regimeTributario: 'simples_nacional' | 'lucro_presumido' | 'lucro_real';
  crt: 1 | 2 | 3; // 1=Simples Nacional, 2=Simples Nacional - excesso, 3=Regime Normal
}

/**
 * Calcula dígito verificador usando módulo 11
 */
function calcularDigitoVerificador(chave: string): string {
  const multiplicadores = [4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  let soma = 0;
  for (let i = 0; i < chave.length; i++) {
    soma += parseInt(chave[i]) * multiplicadores[i];
  }
  
  const resto = soma % 11;
  const dv = resto === 0 || resto === 1 ? 0 : 11 - resto;
  
  return dv.toString();
}

/**
 * Gera chave de acesso da NF-e (44 dígitos)
 */
function gerarChaveAcesso(data: NFeXMLData): string {
  // cUF (2) + AAMM (4) + CNPJ (14) + mod (2) + serie (3) + nNF (9) + tpEmis (1) + cNF (8) + cDV (1)
  
  // Código da UF
  const codigosUF: Record<string, string> = {
    'AC': '12', 'AL': '27', 'AP': '16', 'AM': '13', 'BA': '29',
    'CE': '23', 'DF': '53', 'ES': '32', 'GO': '52', 'MA': '21',
    'MT': '51', 'MS': '50', 'MG': '31', 'PA': '15', 'PB': '25',
    'PR': '41', 'PE': '26', 'PI': '22', 'RJ': '33', 'RN': '24',
    'RS': '43', 'RO': '11', 'RR': '14', 'SC': '42', 'SP': '35',
    'SE': '28', 'TO': '17'
  };
  
  const cUF = codigosUF[data.emitente.estado] || '35';
  
  // AAMM da emissão
  const dataEmissao = new Date(data.identificacao.dataEmissao);
  const ano = dataEmissao.getFullYear().toString().slice(2);
  const mes = (dataEmissao.getMonth() + 1).toString().padStart(2, '0');
  const aamm = ano + mes;
  
  // CNPJ (apenas números, 14 dígitos)
  const cnpj = data.emitente.cnpj.replace(/\D/g, '').padStart(14, '0');
  
  // Modelo (55 ou 65)
  const modelo = data.identificacao.modelo.toString().padStart(2, '0');
  
  // Série (3 dígitos)
  const serie = data.identificacao.serie.padStart(3, '0');
  
  // Número da NF-e (9 dígitos)
  const numero = data.identificacao.numero.toString().padStart(9, '0');
  
  // Tipo de emissão (1 = Normal)
  const tpEmis = data.identificacao.tipoEmissao.toString();
  
  // Código numérico (8 dígitos aleatórios)
  const cNF = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  
  // Monta chave sem DV
  const chaveSemDV = cUF + aamm + cnpj + modelo + serie + numero + tpEmis + cNF;
  
  // Calcula dígito verificador
  const dv = calcularDigitoVerificador(chaveSemDV);
  
  return chaveSemDV + dv;
}

/**
 * Formata valor monetário para padrão SEFAZ (2 casas decimais)
 */
function formatarValor(valor: number): string {
  return valor.toFixed(2);
}

/**
 * Formata quantidade para padrão SEFAZ (4 casas decimais)
 */
function formatarQuantidade(quantidade: number): string {
  return quantidade.toFixed(4);
}

/**
 * Formata data/hora para padrão SEFAZ (AAAA-MM-DDTHH:MM:SS-03:00)
 */
function formatarDataHora(data: string): string {
  const d = new Date(data);
  const ano = d.getFullYear();
  const mes = (d.getMonth() + 1).toString().padStart(2, '0');
  const dia = d.getDate().toString().padStart(2, '0');
  const hora = d.getHours().toString().padStart(2, '0');
  const min = d.getMinutes().toString().padStart(2, '0');
  const seg = d.getSeconds().toString().padStart(2, '0');
  
  return `${ano}-${mes}-${dia}T${hora}:${min}:${seg}-03:00`;
}

/**
 * Escapa caracteres especiais XML
 */
function escaparXML(texto: string): string {
  return texto
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Gera XML da NF-e
 */
export function gerarXMLNFe(data: NFeXMLData): string {
  const chaveAcesso = gerarChaveAcesso(data);
  const dataHoraEmissao = formatarDataHora(data.identificacao.dataEmissao);
  
  // Código da UF
  const codigosUF: Record<string, string> = {
    'AC': '12', 'AL': '27', 'AP': '16', 'AM': '13', 'BA': '29',
    'CE': '23', 'DF': '53', 'ES': '32', 'GO': '52', 'MA': '21',
    'MT': '51', 'MS': '50', 'MG': '31', 'PA': '15', 'PB': '25',
    'PR': '41', 'PE': '26', 'PI': '22', 'RJ': '33', 'RN': '24',
    'RS': '43', 'RO': '11', 'RR': '14', 'SC': '42', 'SP': '35',
    'SE': '28', 'TO': '17'
  };
  
  const cUF = codigosUF[data.emitente.estado] || '35';
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<NFe xmlns="http://www.portalfiscal.inf.br/nfe">\n';
  xml += `  <infNFe Id="NFe${chaveAcesso}" versao="4.00">\n`;
  
  // IDE - Identificação
  xml += '    <ide>\n';
  xml += `      <cUF>${cUF}</cUF>\n`;
  xml += `      <cNF>${chaveAcesso.slice(35, 43)}</cNF>\n`;
  xml += `      <natOp>${escaparXML(data.identificacao.naturezaOperacao)}</natOp>\n`;
  xml += `      <mod>${data.identificacao.modelo}</mod>\n`;
  xml += `      <serie>${data.identificacao.serie}</serie>\n`;
  xml += `      <nNF>${data.identificacao.numero}</nNF>\n`;
  xml += `      <dhEmi>${dataHoraEmissao}</dhEmi>\n`;
  xml += `      <tpNF>${data.identificacao.tipo}</tpNF>\n`;
  xml += `      <idDest>1</idDest>\n`; // 1=Operação interna
  xml += `      <cMunFG>${data.emitente.codigoMunicipio}</cMunFG>\n`;
  xml += `      <tpImp>1</tpImp>\n`; // 1=DANFE Retrato
  xml += `      <tpEmis>${data.identificacao.tipoEmissao}</tpEmis>\n`;
  xml += `      <cDV>${chaveAcesso.slice(43)}</cDV>\n`;
  xml += `      <tpAmb>${data.identificacao.ambiente}</tpAmb>\n`;
  xml += `      <finNFe>${data.identificacao.finalidade}</finNFe>\n`;
  xml += `      <indFinal>${data.identificacao.consumidorFinal}</indFinal>\n`;
  xml += `      <indPres>${data.identificacao.presenca}</indPres>\n`;
  xml += `      <procEmi>0</procEmi>\n`; // 0=Emissão com aplicativo do contribuinte
  xml += `      <verProc>1.0.0</verProc>\n`;
  xml += '    </ide>\n';
  
  // EMIT - Emitente
  xml += '    <emit>\n';
  xml += `      <CNPJ>${data.emitente.cnpj.replace(/\D/g, '')}</CNPJ>\n`;
  xml += `      <xNome>${escaparXML(data.emitente.razaoSocial)}</xNome>\n`;
  if (data.emitente.nomeFantasia) {
    xml += `      <xFant>${escaparXML(data.emitente.nomeFantasia)}</xFant>\n`;
  }
  xml += '      <enderEmit>\n';
  xml += `        <xLgr>${escaparXML(data.emitente.logradouro)}</xLgr>\n`;
  xml += `        <nro>${escaparXML(data.emitente.numero)}</nro>\n`;
  if (data.emitente.complemento) {
    xml += `        <xCpl>${escaparXML(data.emitente.complemento)}</xCpl>\n`;
  }
  xml += `        <xBairro>${escaparXML(data.emitente.bairro)}</xBairro>\n`;
  xml += `        <cMun>${data.emitente.codigoMunicipio}</cMun>\n`;
  xml += `        <xMun>${escaparXML(data.emitente.cidade)}</xMun>\n`;
  xml += `        <UF>${data.emitente.estado}</UF>\n`;
  xml += `        <CEP>${data.emitente.cep.replace(/\D/g, '')}</CEP>\n`;
  xml += `        <cPais>1058</cPais>\n`; // Brasil
  xml += `        <xPais>Brasil</xPais>\n`;
  if (data.emitente.telefone) {
    xml += `        <fone>${data.emitente.telefone.replace(/\D/g, '')}</fone>\n`;
  }
  xml += '      </enderEmit>\n';
  xml += `      <IE>${data.emitente.inscricaoEstadual.replace(/\D/g, '')}</IE>\n`;
  xml += `      <CRT>${data.crt}</CRT>\n`;
  xml += '    </emit>\n';
  
  // DEST - Destinatário
  xml += '    <dest>\n';
  if (data.destinatario.tipo === 'juridica') {
    xml += `      <CNPJ>${data.destinatario.documento.replace(/\D/g, '')}</CNPJ>\n`;
  } else {
    xml += `      <CPF>${data.destinatario.documento.replace(/\D/g, '')}</CPF>\n`;
  }
  xml += `      <xNome>${escaparXML(data.destinatario.nome)}</xNome>\n`;
  xml += '      <enderDest>\n';
  xml += `        <xLgr>${escaparXML(data.destinatario.logradouro)}</xLgr>\n`;
  xml += `        <nro>${escaparXML(data.destinatario.numero)}</nro>\n`;
  if (data.destinatario.complemento) {
    xml += `        <xCpl>${escaparXML(data.destinatario.complemento)}</xCpl>\n`;
  }
  xml += `        <xBairro>${escaparXML(data.destinatario.bairro)}</xBairro>\n`;
  xml += `        <cMun>${data.destinatario.codigoMunicipio}</cMun>\n`;
  xml += `        <xMun>${escaparXML(data.destinatario.cidade)}</xMun>\n`;
  xml += `        <UF>${data.destinatario.estado}</UF>\n`;
  xml += `        <CEP>${data.destinatario.cep.replace(/\D/g, '')}</CEP>\n`;
  xml += `        <cPais>1058</cPais>\n`;
  xml += `        <xPais>Brasil</xPais>\n`;
  if (data.destinatario.telefone) {
    xml += `        <fone>${data.destinatario.telefone.replace(/\D/g, '')}</fone>\n`;
  }
  xml += '      </enderDest>\n';
  xml += `      <indIEDest>${data.destinatario.inscricaoEstadual ? '1' : '9'}</indIEDest>\n`;
  if (data.destinatario.inscricaoEstadual) {
    xml += `      <IE>${data.destinatario.inscricaoEstadual.replace(/\D/g, '')}</IE>\n`;
  }
  if (data.destinatario.email) {
    xml += `      <email>${escaparXML(data.destinatario.email)}</email>\n`;
  }
  xml += '    </dest>\n';
  
  // DET - Itens
  data.itens.forEach((item) => {
    xml += `    <det nItem="${item.numeroItem}">\n`;
    xml += '      <prod>\n';
    xml += `        <cProd>${escaparXML(item.codigoProduto)}</cProd>\n`;
    xml += `        <cEAN>SEM GTIN</cEAN>\n`;
    xml += `        <xProd>${escaparXML(item.descricao)}</xProd>\n`;
    xml += `        <NCM>${item.ncm}</NCM>\n`;
    xml += `        <CFOP>${item.cfop}</CFOP>\n`;
    xml += `        <uCom>${escaparXML(item.unidadeComercial)}</uCom>\n`;
    xml += `        <qCom>${formatarQuantidade(item.quantidadeComercial)}</qCom>\n`;
    xml += `        <vUnCom>${formatarValor(item.valorUnitarioComercial)}</vUnCom>\n`;
    xml += `        <vProd>${formatarValor(item.valorTotalBruto)}</vProd>\n`;
    xml += `        <cEANTrib>SEM GTIN</cEANTrib>\n`;
    xml += `        <uTrib>${escaparXML(item.unidadeComercial)}</uTrib>\n`;
    xml += `        <qTrib>${formatarQuantidade(item.quantidadeComercial)}</qTrib>\n`;
    xml += `        <vUnTrib>${formatarValor(item.valorUnitarioComercial)}</vUnTrib>\n`;
    if (item.valorFrete > 0) {
      xml += `        <vFrete>${formatarValor(item.valorFrete)}</vFrete>\n`;
    }
    if (item.valorSeguro > 0) {
      xml += `        <vSeg>${formatarValor(item.valorSeguro)}</vSeg>\n`;
    }
    if (item.valorDesconto > 0) {
      xml += `        <vDesc>${formatarValor(item.valorDesconto)}</vDesc>\n`;
    }
    if (item.valorOutrasDespesas > 0) {
      xml += `        <vOutro>${formatarValor(item.valorOutrasDespesas)}</vOutro>\n`;
    }
    xml += `        <indTot>1</indTot>\n`; // 1=Compõe total da NF-e
    xml += '      </prod>\n';
    
    // IMPOSTO
    xml += '      <imposto>\n';
    
    // ICMS
    xml += '        <ICMS>\n';
    if (data.crt === 1) {
      // Simples Nacional
      xml += `          <ICMSSN${item.icms.csosn}>\n`;
      xml += `            <orig>${item.origem}</orig>\n`;
      xml += `            <CSOSN>${item.icms.csosn}</CSOSN>\n`;
      // CSOSN 102, 103, 300 e 400 não possuem campos de base de cálculo e valor
      if (item.icms.baseCalculo > 0 && !['102', '103', '300', '400'].includes(item.icms.csosn || '')) {
        xml += `            <vBC>${formatarValor(item.icms.baseCalculo)}</vBC>\n`;
        xml += `            <pICMS>${formatarValor(item.icms.aliquota)}</pICMS>\n`;
        xml += `            <vICMS>${formatarValor(item.icms.valor)}</vICMS>\n`;
      }
      xml += `          </ICMSSN${item.icms.csosn}>\n`;
    } else {
      // Regime Normal
      xml += `          <ICMS${item.icms.cst}>\n`;
      xml += `            <orig>${item.origem}</orig>\n`;
      xml += `            <CST>${item.icms.cst}</CST>\n`;
      if (item.icms.baseCalculo > 0) {
        xml += `            <modBC>${item.icms.modalidadeBC || 3}</modBC>\n`;
        xml += `            <vBC>${formatarValor(item.icms.baseCalculo)}</vBC>\n`;
        xml += `            <pICMS>${formatarValor(item.icms.aliquota)}</pICMS>\n`;
        xml += `            <vICMS>${formatarValor(item.icms.valor)}</vICMS>\n`;
      }
      xml += `          </ICMS${item.icms.cst}>\n`;
    }
    xml += '        </ICMS>\n';
    
    // IPI
    if (item.ipi && item.ipi.valor > 0) {
      xml += '        <IPI>\n';
      xml += `          <cEnq>999</cEnq>\n`;
      xml += '          <IPITrib>\n';
      xml += `            <CST>${item.ipi.cst}</CST>\n`;
      xml += `            <vBC>${formatarValor(item.ipi.baseCalculo)}</vBC>\n`;
      xml += `            <pIPI>${formatarValor(item.ipi.aliquota)}</pIPI>\n`;
      xml += `            <vIPI>${formatarValor(item.ipi.valor)}</vIPI>\n`;
      xml += '          </IPITrib>\n';
      xml += '        </IPI>\n';
    }
    
    // PIS
    xml += '        <PIS>\n';
    xml += `          <PISAliq>\n`;
    xml += `            <CST>${item.pis.cst}</CST>\n`;
    xml += `            <vBC>${formatarValor(item.pis.baseCalculo)}</vBC>\n`;
    xml += `            <pPIS>${formatarValor(item.pis.aliquota)}</pPIS>\n`;
    xml += `            <vPIS>${formatarValor(item.pis.valor)}</vPIS>\n`;
    xml += `          </PISAliq>\n`;
    xml += '        </PIS>\n';
    
    // COFINS
    xml += '        <COFINS>\n';
    xml += `          <COFINSAliq>\n`;
    xml += `            <CST>${item.cofins.cst}</CST>\n`;
    xml += `            <vBC>${formatarValor(item.cofins.baseCalculo)}</vBC>\n`;
    xml += `            <pCOFINS>${formatarValor(item.cofins.aliquota)}</pCOFINS>\n`;
    xml += `            <vCOFINS>${formatarValor(item.cofins.valor)}</vCOFINS>\n`;
    xml += `          </COFINSAliq>\n`;
    xml += '        </COFINS>\n';
    
    xml += '      </imposto>\n';
    xml += '    </det>\n';
  });
  
  // TOTAL
  xml += '    <total>\n';
  xml += '      <ICMSTot>\n';
  xml += `        <vBC>${formatarValor(data.totais.baseCalculoICMS)}</vBC>\n`;
  xml += `        <vICMS>${formatarValor(data.totais.valorICMS)}</vICMS>\n`;
  xml += `        <vICMSDeson>0.00</vICMSDeson>\n`;
  xml += `        <vFCP>0.00</vFCP>\n`;
  xml += `        <vBCST>${formatarValor(data.totais.baseCalculoICMSST)}</vBCST>\n`;
  xml += `        <vST>${formatarValor(data.totais.valorICMSST)}</vST>\n`;
  xml += `        <vFCPST>0.00</vFCPST>\n`;
  xml += `        <vFCPSTRet>0.00</vFCPSTRet>\n`;
  xml += `        <vProd>${formatarValor(data.totais.valorProdutos)}</vProd>\n`;
  xml += `        <vFrete>${formatarValor(data.totais.valorFrete)}</vFrete>\n`;
  xml += `        <vSeg>${formatarValor(data.totais.valorSeguro)}</vSeg>\n`;
  xml += `        <vDesc>${formatarValor(data.totais.valorDesconto)}</vDesc>\n`;
  xml += `        <vII>0.00</vII>\n`;
  xml += `        <vIPI>${formatarValor(data.totais.valorIPI)}</vIPI>\n`;
  xml += `        <vIPIDevol>0.00</vIPIDevol>\n`;
  xml += `        <vPIS>${formatarValor(data.totais.valorPIS)}</vPIS>\n`;
  xml += `        <vCOFINS>${formatarValor(data.totais.valorCOFINS)}</vCOFINS>\n`;
  xml += `        <vOutro>${formatarValor(data.totais.valorOutrasDespesas)}</vOutro>\n`;
  xml += `        <vNF>${formatarValor(data.totais.valorTotal)}</vNF>\n`;
  xml += '      </ICMSTot>\n';
  xml += '    </total>\n';
  
  // TRANSP - Transporte
  xml += '    <transp>\n';
  xml += `      <modFrete>${data.transporte?.modalidade || 9}</modFrete>\n`;
  xml += '    </transp>\n';
  
  // PAG - Pagamento (obrigatório para NF-e modelo 55 e NFC-e)
  xml += '    <pag>\n';
  xml += '      <detPag>\n';
  xml += '        <indPag>0</indPag>\n'; // 0=Pagamento à Vista, 1=A prazo
  xml += '        <tPag>01</tPag>\n'; // 01=Dinheiro
  xml += `        <vPag>${formatarValor(data.totais.valorTotal)}</vPag>\n`;
  xml += '      </detPag>\n';
  xml += '    </pag>\n';
  
  // INFADIC - Informações Adicionais
  if (data.informacoesAdicionais) {
    xml += '    <infAdic>\n';
    xml += `      <infCpl>${escaparXML(data.informacoesAdicionais)}</infCpl>\n`;
    xml += '    </infAdic>\n';
  }
  
  xml += '  </infNFe>\n';
  xml += '</NFe>';
  
  return xml;
}

/**
 * Valida dados antes de gerar XML
 */
export function validarDadosNFe(data: NFeXMLData): { valido: boolean; erros: string[] } {
  const erros: string[] = [];
  
  // Validar emitente
  if (!data.emitente.cnpj || data.emitente.cnpj.replace(/\D/g, '').length !== 14) {
    erros.push('CNPJ do emitente inválido');
  }
  if (!data.emitente.razaoSocial) {
    erros.push('Razão social do emitente é obrigatória');
  }
  if (!data.emitente.inscricaoEstadual) {
    erros.push('Inscrição estadual do emitente é obrigatória');
  }
  if (!data.emitente.codigoMunicipio || data.emitente.codigoMunicipio.length !== 7) {
    erros.push('Código do município do emitente inválido');
  }
  
  // Validar destinatário
  if (!data.destinatario.documento) {
    erros.push('Documento do destinatário é obrigatório');
  }
  if (!data.destinatario.nome) {
    erros.push('Nome do destinatário é obrigatório');
  }
  if (!data.destinatario.codigoMunicipio || data.destinatario.codigoMunicipio.length !== 7) {
    erros.push('Código do município do destinatário inválido');
  }
  
  // Validar itens
  if (!data.itens || data.itens.length === 0) {
    erros.push('Adicione pelo menos um item à nota');
  }
  
  data.itens.forEach((item, index) => {
    if (!item.descricao) {
      erros.push(`Item ${index + 1}: Descrição é obrigatória`);
    }
    if (!item.ncm || item.ncm.length !== 8) {
      erros.push(`Item ${index + 1}: NCM inválido (deve ter 8 dígitos)`);
    }
    if (!item.cfop || item.cfop.length !== 4) {
      erros.push(`Item ${index + 1}: CFOP inválido (deve ter 4 dígitos)`);
    }
    if (item.quantidadeComercial <= 0) {
      erros.push(`Item ${index + 1}: Quantidade deve ser maior que zero`);
    }
    if (item.valorUnitarioComercial <= 0) {
      erros.push(`Item ${index + 1}: Valor unitário deve ser maior que zero`);
    }
  });
  
  // Validar totais
  if (data.totais.valorTotal <= 0) {
    erros.push('Valor total da nota deve ser maior que zero');
  }
  
  return {
    valido: erros.length === 0,
    erros
  };
}