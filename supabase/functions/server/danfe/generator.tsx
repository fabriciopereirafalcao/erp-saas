/**
 * ============================================================================
 * GERADOR DE DANFE (Documento Auxiliar da NF-e)
 * ============================================================================
 * 
 * Gera PDF do DANFE conforme layout padrão SEFAZ.
 * 
 * Inclui:
 * - Dados do emitente e destinatário
 * - Chave de acesso com código de barras
 * - Lista de produtos/serviços
 * - Cálculo de impostos
 * - Dados do transportador
 * - Informações adicionais
 * 
 * ============================================================================
 */

// NOTA: DOMParser removido - agora usamos dados estruturados da NF-e
// import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

// Tipos
interface DadosDANFE {
  // Identificação
  chaveAcesso: string;
  numero: string;
  serie: string;
  dataEmissao: string;
  dataSaida?: string;
  protocolo?: string;
  dataAutorizacao?: string;
  
  // Emitente
  emitente: {
    razaoSocial: string;
    nomeFantasia?: string;
    cnpj: string;
    ie: string;
    iest?: string;
    endereco: string;
    bairro: string;
    cep: string;
    municipio: string;
    uf: string;
    telefone?: string;
  };
  
  // Destinatário
  destinatario: {
    nome: string;
    cpfCnpj: string;
    ie?: string;
    endereco: string;
    bairro: string;
    cep: string;
    municipio: string;
    uf: string;
    telefone?: string;
  };
  
  // Produtos
  produtos: Array<{
    codigo: string;
    descricao: string;
    ncm: string;
    cst: string;
    cfop: string;
    unidade: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
    bcIcms?: number;
    valorIcms?: number;
    ipi?: number;
    aliqIcms?: number;
  }>;
  
  // Totais
  totais: {
    baseCalculoIcms: number;
    valorIcms: number;
    baseCalculoIcmsST: number;
    valorIcmsST: number;
    valorTotalProdutos: number;
    valorFrete: number;
    valorSeguro: number;
    desconto: number;
    outrasDespesas: number;
    valorIPI: number;
    valorTotal: number;
  };
  
  // Transporte
  transporte?: {
    modalidade: string;
    transportador?: {
      nome: string;
      cnpjCpf?: string;
      ie?: string;
      endereco?: string;
      municipio?: string;
      uf?: string;
    };
    volumes?: {
      quantidade: number;
      especie?: string;
      marca?: string;
      numeracao?: string;
      pesoLiquido?: number;
      pesoBruto?: number;
    };
  };
  
  // Informações Adicionais
  informacoesComplementares?: string;
  informacoesFisco?: string;
  
  // Tipo
  tipoOperacao: 'ENTRADA' | 'SAIDA';
  naturezaOperacao: string;
  ambiente: number; // 1=Produção, 2=Homologação
}

/**
 * Extrai dados da NF-e do XML para gerar o DANFE
 */
export function extrairDadosDoXML(xmlString: string): DadosDANFE {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString);
  
  if (!doc) {
    throw new Error('Erro ao fazer parse do XML');
  }
  
  // Helper para extrair texto de um elemento
  const getText = (selector: string): string => {
    const el = doc.querySelector(selector);
    return el?.textContent?.trim() || '';
  };
  
  const getNumber = (selector: string): number => {
    const text = getText(selector);
    return text ? parseFloat(text) : 0;
  };
  
  // Extrair chave de acesso
  const infNFe = doc.querySelector('infNFe');
  const chaveAcesso = infNFe?.getAttribute('Id')?.replace('NFe', '') || '';
  
  // Identificação
  const numero = getText('ide > nNF');
  const serie = getText('ide > serie');
  const dataEmissao = getText('ide > dhEmi');
  const dataSaida = getText('ide > dhSaiEnt') || dataEmissao;
  const tipoOperacao = getText('ide > tpNF') === '0' ? 'ENTRADA' : 'SAIDA';
  const naturezaOperacao = getText('ide > natOp');
  const ambiente = parseInt(getText('ide > tpAmb')) || 2;
  
  // Protocolo (se disponível)
  const protocolo = getText('protNFe > infProt > nProt');
  const dataAutorizacao = getText('protNFe > infProt > dhRecbto');
  
  // Emitente
  const emitente = {
    razaoSocial: getText('emit > xNome'),
    nomeFantasia: getText('emit > xFant'),
    cnpj: getText('emit > CNPJ'),
    ie: getText('emit > IE'),
    iest: getText('emit > IEST'),
    endereco: `${getText('emit > enderEmit > xLgr')}, ${getText('emit > enderEmit > nro')}`,
    bairro: getText('emit > enderEmit > xBairro'),
    cep: getText('emit > enderEmit > CEP'),
    municipio: getText('emit > enderEmit > xMun'),
    uf: getText('emit > enderEmit > UF'),
    telefone: getText('emit > enderEmit > fone')
  };
  
  // Destinatário
  const destinatario = {
    nome: getText('dest > xNome'),
    cpfCnpj: getText('dest > CNPJ') || getText('dest > CPF'),
    ie: getText('dest > IE'),
    endereco: `${getText('dest > enderDest > xLgr')}, ${getText('dest > enderDest > nro')}`,
    bairro: getText('dest > enderDest > xBairro'),
    cep: getText('dest > enderDest > CEP'),
    municipio: getText('dest > enderDest > xMun'),
    uf: getText('dest > enderDest > UF'),
    telefone: getText('dest > enderDest > fone')
  };
  
  // Produtos
  const produtos: any[] = [];
  const dets = doc.querySelectorAll('det');
  
  dets.forEach((det) => {
    const codigo = det.querySelector('prod > cProd')?.textContent?.trim() || '';
    const descricao = det.querySelector('prod > xProd')?.textContent?.trim() || '';
    const ncm = det.querySelector('prod > NCM')?.textContent?.trim() || '';
    const cfop = det.querySelector('prod > CFOP')?.textContent?.trim() || '';
    const unidade = det.querySelector('prod > uCom')?.textContent?.trim() || '';
    const quantidade = parseFloat(det.querySelector('prod > qCom')?.textContent?.trim() || '0');
    const valorUnitario = parseFloat(det.querySelector('prod > vUnCom')?.textContent?.trim() || '0');
    const valorTotal = parseFloat(det.querySelector('prod > vProd')?.textContent?.trim() || '0');
    
    const cst = det.querySelector('imposto > ICMS > ICMS00 > CST')?.textContent?.trim() ||
                det.querySelector('imposto > ICMS > ICMS10 > CST')?.textContent?.trim() ||
                det.querySelector('imposto > ICMS > ICMS20 > CST')?.textContent?.trim() ||
                det.querySelector('imposto > ICMS > ICMS30 > CST')?.textContent?.trim() ||
                det.querySelector('imposto > ICMS > ICMS40 > CST')?.textContent?.trim() ||
                det.querySelector('imposto > ICMS > ICMS51 > CST')?.textContent?.trim() ||
                det.querySelector('imposto > ICMS > ICMS60 > CST')?.textContent?.trim() ||
                det.querySelector('imposto > ICMS > ICMS70 > CST')?.textContent?.trim() ||
                det.querySelector('imposto > ICMS > ICMS90 > CST')?.textContent?.trim() ||
                det.querySelector('imposto > ICMS > ICMSSN102 > CSOSN')?.textContent?.trim() || '';
    
    const bcIcms = parseFloat(det.querySelector('imposto > ICMS > ICMS00 > vBC')?.textContent?.trim() || '0');
    const valorIcms = parseFloat(det.querySelector('imposto > ICMS > ICMS00 > vICMS')?.textContent?.trim() || '0');
    const aliqIcms = parseFloat(det.querySelector('imposto > ICMS > ICMS00 > pICMS')?.textContent?.trim() || '0');
    const ipi = parseFloat(det.querySelector('imposto > IPI > IPITrib > vIPI')?.textContent?.trim() || '0');
    
    produtos.push({
      codigo,
      descricao,
      ncm,
      cst,
      cfop,
      unidade,
      quantidade,
      valorUnitario,
      valorTotal,
      bcIcms,
      valorIcms,
      aliqIcms,
      ipi
    });
  });
  
  // Totais
  const totais = {
    baseCalculoIcms: getNumber('total > ICMSTot > vBC'),
    valorIcms: getNumber('total > ICMSTot > vICMS'),
    baseCalculoIcmsST: getNumber('total > ICMSTot > vBCST'),
    valorIcmsST: getNumber('total > ICMSTot > vST'),
    valorTotalProdutos: getNumber('total > ICMSTot > vProd'),
    valorFrete: getNumber('total > ICMSTot > vFrete'),
    valorSeguro: getNumber('total > ICMSTot > vSeg'),
    desconto: getNumber('total > ICMSTot > vDesc'),
    outrasDespesas: getNumber('total > ICMSTot > vOutro'),
    valorIPI: getNumber('total > ICMSTot > vIPI'),
    valorTotal: getNumber('total > ICMSTot > vNF')
  };
  
  // Transporte
  const modalidadeMap: any = {
    '0': 'Por conta do Emitente',
    '1': 'Por conta do Destinatário',
    '2': 'Por conta de Terceiros',
    '9': 'Sem Transporte'
  };
  
  const transporte = {
    modalidade: modalidadeMap[getText('transp > modFrete')] || 'Sem Transporte',
    transportador: getText('transp > transporta > xNome') ? {
      nome: getText('transp > transporta > xNome'),
      cnpjCpf: getText('transp > transporta > CNPJ') || getText('transp > transporta > CPF'),
      ie: getText('transp > transporta > IE'),
      endereco: getText('transp > transporta > xEnder'),
      municipio: getText('transp > transporta > xMun'),
      uf: getText('transp > transporta > UF')
    } : undefined,
    volumes: getText('transp > vol > qVol') ? {
      quantidade: getNumber('transp > vol > qVol'),
      especie: getText('transp > vol > esp'),
      marca: getText('transp > vol > marca'),
      numeracao: getText('transp > vol > nVol'),
      pesoLiquido: getNumber('transp > vol > pesoL'),
      pesoBruto: getNumber('transp > vol > pesoB')
    } : undefined
  };
  
  // Informações Adicionais
  const informacoesComplementares = getText('infAdic > infCpl');
  const informacoesFisco = getText('infAdic > infAdFisco');
  
  return {
    chaveAcesso,
    numero,
    serie,
    dataEmissao,
    dataSaida,
    protocolo,
    dataAutorizacao,
    emitente,
    destinatario,
    produtos,
    totais,
    transporte,
    informacoesComplementares,
    informacoesFisco,
    tipoOperacao,
    naturezaOperacao,
    ambiente
  };
}

/**
 * Gera HTML do DANFE (depois será convertido para PDF)
 */
export function gerarHTMLDanfe(dados: DadosDANFE): string {
  const formatarCNPJ = (cnpj: string) => {
    if (cnpj.length === 14) {
      return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return cnpj;
  };
  
  const formatarCPF = (cpf: string) => {
    if (cpf.length === 11) {
      return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return cpf;
  };
  
  const formatarCPFCNPJ = (doc: string) => {
    return doc.length === 14 ? formatarCNPJ(doc) : formatarCPF(doc);
  };
  
  const formatarCEP = (cep: string) => {
    return cep.replace(/(\d{5})(\d{3})/, '$1-$2');
  };
  
  const formatarChave = (chave: string) => {
    return chave.replace(/(\d{4})/g, '$1 ').trim();
  };
  
  const formatarData = (dataISO: string) => {
    if (!dataISO) return '';
    const date = new Date(dataISO);
    return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatarValor = (valor: number) => {
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  
  // Linhas de produtos
  const linhasProdutos = dados.produtos.map((p, i) => `
    <tr>
      <td style="border: 1px solid #000; padding: 4px; font-size: 8px;">${i + 1}</td>
      <td style="border: 1px solid #000; padding: 4px; font-size: 8px;">${p.codigo}</td>
      <td style="border: 1px solid #000; padding: 4px; font-size: 8px;">${p.descricao}</td>
      <td style="border: 1px solid #000; padding: 4px; font-size: 8px; text-align: center;">${p.ncm}</td>
      <td style="border: 1px solid #000; padding: 4px; font-size: 8px; text-align: center;">${p.cst}</td>
      <td style="border: 1px solid #000; padding: 4px; font-size: 8px; text-align: center;">${p.cfop}</td>
      <td style="border: 1px solid #000; padding: 4px; font-size: 8px; text-align: center;">${p.unidade}</td>
      <td style="border: 1px solid #000; padding: 4px; font-size: 8px; text-align: right;">${formatarValor(p.quantidade)}</td>
      <td style="border: 1px solid #000; padding: 4px; font-size: 8px; text-align: right;">${formatarValor(p.valorUnitario)}</td>
      <td style="border: 1px solid #000; padding: 4px; font-size: 8px; text-align: right;">${formatarValor(p.valorTotal)}</td>
    </tr>
  `).join('');
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>DANFE - NF-e ${dados.numero}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 10px; padding: 10mm; }
    .container { width: 100%; max-width: 210mm; }
    .box { border: 2px solid #000; padding: 4px; margin-bottom: 2px; }
    .box-title { font-size: 7px; font-weight: bold; margin-bottom: 2px; }
    .box-content { font-size: 9px; }
    .header { display: flex; border: 2px solid #000; margin-bottom: 2px; }
    .header-left { flex: 0 0 120px; border-right: 2px solid #000; padding: 4px; text-align: center; }
    .header-center { flex: 1; border-right: 2px solid #000; padding: 4px; }
    .header-right { flex: 0 0 150px; padding: 4px; text-align: center; }
    .danfe-title { font-size: 14px; font-weight: bold; text-align: center; margin-bottom: 2px; }
    .danfe-subtitle { font-size: 10px; text-align: center; }
    table { width: 100%; border-collapse: collapse; }
    th { background-color: #f0f0f0; font-size: 7px; padding: 4px; border: 1px solid #000; text-align: left; }
    td { font-size: 8px; padding: 4px; border: 1px solid #000; }
    .section-title { font-size: 9px; font-weight: bold; background-color: #e0e0e0; padding: 4px; border: 1px solid #000; margin-top: 4px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; }
    .grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 4px; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .barcode { text-align: center; font-family: 'Courier New', monospace; font-size: 24px; letter-spacing: 2px; margin: 8px 0; }
    .ambiente-homologacao { color: red; font-weight: bold; font-size: 16px; text-align: center; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    
    <!-- CABEÇALHO -->
    <div class="header">
      <div class="header-left">
        <div style="font-size: 8px; margin-bottom: 4px;">LOGO</div>
        <div style="font-size: 6px; color: #666;">Área reservada para logo</div>
      </div>
      <div class="header-center">
        <div style="font-size: 11px; font-weight: bold;">${dados.emitente.razaoSocial}</div>
        ${dados.emitente.nomeFantasia ? `<div style="font-size: 9px;">${dados.emitente.nomeFantasia}</div>` : ''}
        <div style="font-size: 8px; margin-top: 4px;">
          ${dados.emitente.endereco}, ${dados.emitente.bairro}<br>
          ${formatarCEP(dados.emitente.cep)} - ${dados.emitente.municipio} - ${dados.emitente.uf}<br>
          ${dados.emitente.telefone ? `Tel: ${dados.emitente.telefone}<br>` : ''}
        </div>
      </div>
      <div class="header-right">
        <div class="danfe-title">DANFE</div>
        <div class="danfe-subtitle">Documento Auxiliar da<br>Nota Fiscal Eletrônica</div>
        <div style="font-size: 8px; margin-top: 4px;">
          <strong>0 - ENTRADA</strong><br>
          <strong>1 - SAÍDA</strong>
        </div>
        <div style="font-size: 20px; font-weight: bold; margin-top: 4px;">${dados.tipoOperacao === 'ENTRADA' ? '0' : '1'}</div>
        <div style="font-size: 8px; margin-top: 4px;">
          Nº ${dados.numero}<br>
          Série ${dados.serie}
        </div>
      </div>
    </div>
    
    ${dados.ambiente === 2 ? '<div class="ambiente-homologacao">⚠️ AMBIENTE DE HOMOLOGAÇÃO - SEM VALOR FISCAL ⚠️</div>' : ''}
    
    <!-- CHAVE DE ACESSO -->
    <div class="box">
      <div class="box-title">CHAVE DE ACESSO</div>
      <div class="barcode">${formatarChave(dados.chaveAcesso)}</div>
      <div class="text-center" style="font-size: 8px;">Consulte pela chave de acesso em: https://www.nfe.fazenda.gov.br/portal</div>
    </div>
    
    <!-- NATUREZA DA OPERAÇÃO -->
    <div class="grid-2">
      <div class="box">
        <div class="box-title">NATUREZA DA OPERAÇÃO</div>
        <div class="box-content">${dados.naturezaOperacao}</div>
      </div>
      <div class="box">
        <div class="box-title">PROTOCOLO DE AUTORIZAÇÃO</div>
        <div class="box-content">${dados.protocolo ? `${dados.protocolo} - ${formatarData(dados.dataAutorizacao || '')}` : 'Aguardando autorização'}</div>
      </div>
    </div>
    
    <!-- INSCRIÇÃO ESTADUAL -->
    <div class="grid-3">
      <div class="box">
        <div class="box-title">INSCRIÇÃO ESTADUAL</div>
        <div class="box-content">${dados.emitente.ie}</div>
      </div>
      <div class="box">
        <div class="box-title">INSCRIÇÃO ESTADUAL DO SUBST. TRIBUTÁRIO</div>
        <div class="box-content">${dados.emitente.iest || ''}</div>
      </div>
      <div class="box">
        <div class="box-title">CNPJ</div>
        <div class="box-content">${formatarCNPJ(dados.emitente.cnpj)}</div>
      </div>
    </div>
    
    <!-- DESTINATÁRIO / REMETENTE -->
    <div class="section-title">DESTINATÁRIO / REMETENTE</div>
    <div class="grid-2">
      <div class="box">
        <div class="box-title">NOME / RAZÃO SOCIAL</div>
        <div class="box-content">${dados.destinatario.nome}</div>
      </div>
      <div class="box">
        <div class="box-title">CNPJ / CPF</div>
        <div class="box-content">${formatarCPFCNPJ(dados.destinatario.cpfCnpj)}</div>
      </div>
    </div>
    <div class="grid-4">
      <div class="box" style="grid-column: 1 / 3;">
        <div class="box-title">ENDEREÇO</div>
        <div class="box-content">${dados.destinatario.endereco}</div>
      </div>
      <div class="box">
        <div class="box-title">BAIRRO / DISTRITO</div>
        <div class="box-content">${dados.destinatario.bairro}</div>
      </div>
      <div class="box">
        <div class="box-title">CEP</div>
        <div class="box-content">${formatarCEP(dados.destinatario.cep)}</div>
      </div>
    </div>
    <div class="grid-4">
      <div class="box">
        <div class="box-title">MUNICÍPIO</div>
        <div class="box-content">${dados.destinatario.municipio}</div>
      </div>
      <div class="box">
        <div class="box-title">UF</div>
        <div class="box-content">${dados.destinatario.uf}</div>
      </div>
      <div class="box">
        <div class="box-title">TELEFONE</div>
        <div class="box-content">${dados.destinatario.telefone || ''}</div>
      </div>
      <div class="box">
        <div class="box-title">INSCRIÇÃO ESTADUAL</div>
        <div class="box-content">${dados.destinatario.ie || ''}</div>
      </div>
    </div>
    
    <!-- PRODUTOS / SERVIÇOS -->
    <div class="section-title">DADOS DOS PRODUTOS / SERVIÇOS</div>
    <table>
      <thead>
        <tr>
          <th style="width: 3%;">#</th>
          <th style="width: 10%;">CÓDIGO</th>
          <th style="width: 27%;">DESCRIÇÃO</th>
          <th style="width: 8%;">NCM</th>
          <th style="width: 5%;">CST</th>
          <th style="width: 7%;">CFOP</th>
          <th style="width: 5%;">UN</th>
          <th style="width: 8%;">QUANT</th>
          <th style="width: 10%;">V. UNIT</th>
          <th style="width: 12%;">V. TOTAL</th>
        </tr>
      </thead>
      <tbody>
        ${linhasProdutos}
      </tbody>
    </table>
    
    <!-- CÁLCULO DO IMPOSTO -->
    <div class="section-title" style="margin-top: 8px;">CÁLCULO DO IMPOSTO</div>
    <div class="grid-4">
      <div class="box">
        <div class="box-title">BASE DE CÁLCULO DO ICMS</div>
        <div class="box-content text-right">${formatarValor(dados.totais.baseCalculoIcms)}</div>
      </div>
      <div class="box">
        <div class="box-title">VALOR DO ICMS</div>
        <div class="box-content text-right">${formatarValor(dados.totais.valorIcms)}</div>
      </div>
      <div class="box">
        <div class="box-title">BASE DE CÁLCULO DO ICMS ST</div>
        <div class="box-content text-right">${formatarValor(dados.totais.baseCalculoIcmsST)}</div>
      </div>
      <div class="box">
        <div class="box-title">VALOR DO ICMS ST</div>
        <div class="box-content text-right">${formatarValor(dados.totais.valorIcmsST)}</div>
      </div>
    </div>
    <div class="grid-4">
      <div class="box">
        <div class="box-title">VALOR TOTAL DOS PRODUTOS</div>
        <div class="box-content text-right">${formatarValor(dados.totais.valorTotalProdutos)}</div>
      </div>
      <div class="box">
        <div class="box-title">VALOR DO FRETE</div>
        <div class="box-content text-right">${formatarValor(dados.totais.valorFrete)}</div>
      </div>
      <div class="box">
        <div class="box-title">VALOR DO SEGURO</div>
        <div class="box-content text-right">${formatarValor(dados.totais.valorSeguro)}</div>
      </div>
      <div class="box">
        <div class="box-title">DESCONTO</div>
        <div class="box-content text-right">${formatarValor(dados.totais.desconto)}</div>
      </div>
    </div>
    <div class="grid-3">
      <div class="box">
        <div class="box-title">OUTRAS DESPESAS</div>
        <div class="box-content text-right">${formatarValor(dados.totais.outrasDespesas)}</div>
      </div>
      <div class="box">
        <div class="box-title">VALOR DO IPI</div>
        <div class="box-content text-right">${formatarValor(dados.totais.valorIPI)}</div>
      </div>
      <div class="box" style="background-color: #f0f0f0;">
        <div class="box-title">VALOR TOTAL DA NOTA</div>
        <div class="box-content text-right" style="font-weight: bold; font-size: 11px;">${formatarValor(dados.totais.valorTotal)}</div>
      </div>
    </div>
    
    <!-- TRANSPORTADOR / VOLUMES -->
    ${dados.transporte ? `
    <div class="section-title" style="margin-top: 8px;">TRANSPORTADOR / VOLUMES TRANSPORTADOS</div>
    <div class="box">
      <div class="box-title">MODALIDADE DO FRETE</div>
      <div class="box-content">${dados.transporte.modalidade}</div>
    </div>
    ${dados.transporte.transportador ? `
    <div class="grid-3">
      <div class="box" style="grid-column: 1 / 3;">
        <div class="box-title">TRANSPORTADOR / RAZÃO SOCIAL</div>
        <div class="box-content">${dados.transporte.transportador.nome}</div>
      </div>
      <div class="box">
        <div class="box-title">CNPJ / CPF</div>
        <div class="box-content">${dados.transporte.transportador.cnpjCpf ? formatarCPFCNPJ(dados.transporte.transportador.cnpjCpf) : ''}</div>
      </div>
    </div>
    <div class="grid-3">
      <div class="box">
        <div class="box-title">ENDEREÇO</div>
        <div class="box-content">${dados.transporte.transportador.endereco || ''}</div>
      </div>
      <div class="box">
        <div class="box-title">MUNICÍPIO</div>
        <div class="box-content">${dados.transporte.transportador.municipio || ''}</div>
      </div>
      <div class="box">
        <div class="box-title">UF</div>
        <div class="box-content">${dados.transporte.transportador.uf || ''}</div>
      </div>
    </div>
    ` : ''}
    ${dados.transporte.volumes ? `
    <div class="grid-4">
      <div class="box">
        <div class="box-title">QUANTIDADE</div>
        <div class="box-content">${dados.transporte.volumes.quantidade}</div>
      </div>
      <div class="box">
        <div class="box-title">ESPÉCIE</div>
        <div class="box-content">${dados.transporte.volumes.especie || ''}</div>
      </div>
      <div class="box">
        <div class="box-title">PESO LÍQUIDO</div>
        <div class="box-content">${dados.transporte.volumes.pesoLiquido ? formatarValor(dados.transporte.volumes.pesoLiquido) + ' kg' : ''}</div>
      </div>
      <div class="box">
        <div class="box-title">PESO BRUTO</div>
        <div class="box-content">${dados.transporte.volumes.pesoBruto ? formatarValor(dados.transporte.volumes.pesoBruto) + ' kg' : ''}</div>
      </div>
    </div>
    ` : ''}
    ` : ''}
    
    <!-- DADOS ADICIONAIS -->
    ${dados.informacoesComplementares || dados.informacoesFisco ? `
    <div class="section-title" style="margin-top: 8px;">DADOS ADICIONAIS</div>
    ${dados.informacoesComplementares ? `
    <div class="box">
      <div class="box-title">INFORMAÇÕES COMPLEMENTARES</div>
      <div class="box-content" style="min-height: 30px;">${dados.informacoesComplementares}</div>
    </div>
    ` : ''}
    ${dados.informacoesFisco ? `
    <div class="box">
      <div class="box-title">RESERVADO AO FISCO</div>
      <div class="box-content" style="min-height: 30px;">${dados.informacoesFisco}</div>
    </div>
    ` : ''}
    ` : ''}
    
    <!-- RODAPÉ -->
    <div style="text-align: center; font-size: 7px; margin-top: 8px; color: #666;">
      Emitido em ${formatarData(dados.dataEmissao)} | Este documento é uma representação gráfica simplificada da NF-e
    </div>
    
  </div>
</body>
</html>
  `;
  
  return html;
}
