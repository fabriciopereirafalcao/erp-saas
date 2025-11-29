/**
 * ============================================================================
 * GERADOR DE DANFE (Documento Auxiliar da NF-e)
 * ============================================================================
 * 
 * Layout conforme padrão oficial SEFAZ 2024/2025
 * Referência: Portal NF-e SEFAZ / NT 2025.002 e NT 2024.003
 * Preparado para Reforma Tributária de Consumo
 * 
 * ============================================================================
 */

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
 * Gera HTML do DANFE conforme padrão oficial SEFAZ 2024/2025
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
    // Formata: 2913 8410 4027 7900 0037 5500 1000 0044 3338 0000 4459
    return chave.replace(/(\d{4})/g, '$1 ').trim();
  };
  
  const formatarData = (dataISO: string) => {
    if (!dataISO) return '';
    const date = new Date(dataISO);
    return date.toLocaleDateString('pt-BR');
  };
  
  const formatarDataHora = (dataISO: string) => {
    if (!dataISO) return '';
    const date = new Date(dataISO);
    return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatarValor = (valor: number) => {
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  
  // Mapeamento de modalidade de frete
  const modalidadeFreteMap: { [key: string]: string } = {
    '0': '0-Emitente',
    '1': '1-Destinatário',
    '2': '2-Terceiros',
    '9': '9-Sem Frete'
  };
  
  // Linhas de produtos (conforme layout oficial)
  const linhasProdutos = dados.produtos.map((p, i) => `
    <tr>
      <td class="td-center" style="width: 3%;">${i + 1}</td>
      <td class="td-left" style="width: 10%;">${p.codigo}</td>
      <td class="td-left" style="width: 20%;">${p.descricao}</td>
      <td class="td-center" style="width: 6%;">${p.ncm}</td>
      <td class="td-center" style="width: 4%;">${p.cst}</td>
      <td class="td-center" style="width: 4%;">${p.cfop}</td>
      <td class="td-center" style="width: 4%;">${p.unidade}</td>
      <td class="td-right" style="width: 7%;">${formatarValor(p.quantidade)}</td>
      <td class="td-right" style="width: 8%;">${formatarValor(p.valorUnitario)}</td>
      <td class="td-right" style="width: 9%;">${formatarValor(p.valorTotal)}</td>
      <td class="td-right" style="width: 7%;">${p.bcIcms ? formatarValor(p.bcIcms) : ''}</td>
      <td class="td-right" style="width: 7%;">${p.valorIcms ? formatarValor(p.valorIcms) : ''}</td>
      <td class="td-right" style="width: 5%;">${p.ipi ? formatarValor(p.ipi) : ''}</td>
      <td class="td-right" style="width: 6%;">${p.aliqIcms ? formatarValor(p.aliqIcms) : ''}</td>
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
    body { 
      font-family: Arial, sans-serif; 
      font-size: 7px;
      padding: 5mm;
      background: white;
    }
    
    .page { 
      width: 210mm; 
      min-height: 297mm;
      margin: 0 auto;
      background: white;
    }
    
    /* Bordas e boxes padrão SEFAZ */
    .border { border: 1px solid #000; }
    .border-top { border-top: 1px solid #000; }
    .border-bottom { border-bottom: 1px solid #000; }
    .border-left { border-left: 1px solid #000; }
    .border-right { border-right: 1px solid #000; }
    
    .field {
      border: 1px solid #000;
      padding: 2px 3px;
      min-height: 14px;
    }
    
    .field-label {
      font-size: 5px;
      font-weight: bold;
      display: block;
      margin-bottom: 1px;
      text-transform: uppercase;
    }
    
    .field-value {
      font-size: 7px;
      display: block;
    }
    
    /* Layout de grid */
    .row {
      display: flex;
      width: 100%;
    }
    
    .col { flex: 1; }
    .col-2 { flex: 2; }
    .col-3 { flex: 3; }
    .col-4 { flex: 4; }
    
    /* Cabeçalho superior (Recebimento) */
    .header-top {
      display: flex;
      border: 1px solid #000;
      margin-bottom: 1px;
    }
    
    .header-recebimento {
      flex: 3;
      padding: 3px;
      border-right: 1px solid #000;
    }
    
    .header-numero {
      flex: 1;
      text-align: center;
      padding: 3px;
    }
    
    /* Cabeçalho principal */
    .header-main {
      display: flex;
      border: 1px solid #000;
      border-top: none;
      margin-bottom: 1px;
      min-height: 60px;
    }
    
    .header-logo {
      width: 80px;
      border-right: 1px solid #000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 5px;
    }
    
    .header-emitente {
      flex: 1;
      padding: 4px 6px;
      border-right: 1px solid #000;
    }
    
    .header-danfe {
      width: 120px;
      text-align: center;
      padding: 4px;
    }
    
    .emitente-nome {
      font-size: 9px;
      font-weight: bold;
      margin-bottom: 2px;
      text-transform: uppercase;
    }
    
    .emitente-endereco {
      font-size: 6px;
      line-height: 8px;
    }
    
    .danfe-title {
      font-size: 11px;
      font-weight: bold;
      margin-bottom: 2px;
    }
    
    .danfe-subtitle {
      font-size: 7px;
      line-height: 8px;
      margin-bottom: 4px;
    }
    
    .danfe-tipo {
      font-size: 18px;
      font-weight: bold;
      margin: 4px 0;
    }
    
    .danfe-numero {
      font-size: 8px;
      font-weight: bold;
    }
    
    /* Chave de acesso com código de barras */
    .chave-acesso {
      border: 1px solid #000;
      border-top: none;
      padding: 4px;
      text-align: center;
      margin-bottom: 1px;
    }
    
    .chave-barcode {
      font-family: 'Courier New', monospace;
      font-size: 16px;
      font-weight: bold;
      letter-spacing: 3px;
      margin: 3px 0;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    
    .barcode-bars {
      font-size: 24px;
      letter-spacing: 0;
      line-height: 20px;
    }
    
    .chave-consulta {
      font-size: 6px;
      margin-top: 2px;
    }
    
    /* Seções */
    .section-title {
      background-color: #000;
      color: #fff;
      padding: 2px 4px;
      font-size: 6px;
      font-weight: bold;
      text-transform: uppercase;
    }
    
    /* Tabelas */
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #000;
    }
    
    th {
      background-color: #f0f0f0;
      border: 1px solid #000;
      padding: 2px;
      font-size: 5px;
      font-weight: bold;
      text-align: center;
      text-transform: uppercase;
    }
    
    td {
      border: 1px solid #000;
      padding: 2px 3px;
      font-size: 6px;
    }
    
    .td-left { text-align: left; }
    .td-center { text-align: center; }
    .td-right { text-align: right; }
    
    /* Ambiente de homologação */
    .ambiente-homologacao {
      background-color: #000;
      color: #fff;
      text-align: center;
      padding: 4px;
      font-size: 10px;
      font-weight: bold;
      margin-bottom: 1px;
    }
    
    /* Impressão */
    @media print {
      body { padding: 0; }
      .page { margin: 0; }
    }
  </style>
</head>
<body>
  <div class="page">
  
    <!-- CABEÇALHO SUPERIOR: RECEBIMENTO + NÚMERO -->
    <div class="header-top">
      <div class="header-recebimento">
        <span class="field-label">RECEBEMOS DE ${dados.emitente.razaoSocial} OS PRODUTOS/SERVIÇOS CONSTANTES NA NOTA FISCAL INDICADA AO LADO</span>
      </div>
      <div class="header-numero">
        <div class="field-label">Nº</div>
        <div style="font-size: 14px; font-weight: bold;">${dados.numero.padStart(9, '0')}</div>
        <div class="field-label">SÉRIE: ${dados.serie}</div>
      </div>
    </div>
    
    <div class="row" style="border: 1px solid #000; border-top: none; margin-bottom: 1px;">
      <div style="flex: 2; padding: 3px; border-right: 1px solid #000;">
        <span class="field-label">DATA DE RECEBIMENTO</span>
      </div>
      <div style="flex: 1; padding: 3px;">
        <span class="field-label">IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR</span>
      </div>
    </div>
    
    <!-- CABEÇALHO PRINCIPAL: LOGO + EMITENTE + DANFE -->
    <div class="header-main">
      <!-- Logo -->
      <div class="header-logo">
        <div style="text-align: center;">
          <div style="font-size: 24px; color: #666;">📄</div>
          <div style="font-size: 5px; color: #999; margin-top: 2px;">LOGOTIPO</div>
        </div>
      </div>
      
      <!-- Dados do Emitente -->
      <div class="header-emitente">
        <div class="emitente-nome">${dados.emitente.razaoSocial}</div>
        ${dados.emitente.nomeFantasia ? `<div style="font-size: 7px; margin-bottom: 2px;">${dados.emitente.nomeFantasia}</div>` : ''}
        <div class="emitente-endereco">
          ${dados.emitente.endereco}, ${dados.emitente.bairro}<br>
          CEP: ${formatarCEP(dados.emitente.cep)} - ${dados.emitente.municipio} - ${dados.emitente.uf}<br>
          ${dados.emitente.telefone ? `TEL/FAX: ${dados.emitente.telefone}<br>` : ''}
        </div>
      </div>
      
      <!-- DANFE -->
      <div class="header-danfe">
        <div class="danfe-title">DANFE</div>
        <div class="danfe-subtitle">DOCUMENTO AUXILIAR<br>DA NOTA FISCAL<br>ELETRÔNICA</div>
        <div style="font-size: 6px; margin: 4px 0;">
          <strong>0 - Entrada</strong><br>
          <div class="danfe-tipo">${dados.tipoOperacao === 'ENTRADA' ? '0' : '1'}</div>
          <strong>1 - Saída</strong>
        </div>
        <div class="danfe-numero">
          Nº ${dados.numero.padStart(9, '0')}<br>
          SÉRIE: ${dados.serie}<br>
          FOLHA: 1 de 1
        </div>
      </div>
    </div>
    
    ${dados.ambiente === 2 ? '<div class="ambiente-homologacao">⚠️ SEM VALOR FISCAL - HOMOLOGAÇÃO ⚠️</div>' : ''}
    
    <!-- CHAVE DE ACESSO COM CÓDIGO DE BARRAS -->
    <div class="chave-acesso">
      <div class="field-label">CHAVE DE ACESSO</div>
      <div class="chave-barcode">
        <div class="barcode-bars">|||&nbsp;||&nbsp;|&nbsp;||&nbsp;|||&nbsp;|&nbsp;|||&nbsp;||&nbsp;|&nbsp;||&nbsp;|||&nbsp;|&nbsp;||&nbsp;|||&nbsp;||&nbsp;|&nbsp;|||&nbsp;|&nbsp;||&nbsp;|||&nbsp;|&nbsp;||&nbsp;|||&nbsp;||&nbsp;|&nbsp;||&nbsp;|||</div>
      </div>
      <div style="font-size: 8px; font-weight: bold; letter-spacing: 2px;">${formatarChave(dados.chaveAcesso)}</div>
      <div class="chave-consulta">
        Consulta de autenticidade no portal nacional da NF-e<br>
        www.nfe.fazenda.gov.br/portal ou no site da Sefaz Autorizadora
      </div>
    </div>
    
    <!-- NATUREZA DA OPERAÇÃO + PROTOCOLO -->
    <div class="row">
      <div class="field col-2">
        <span class="field-label">NATUREZA DA OPERAÇÃO</span>
        <span class="field-value">${dados.naturezaOperacao}</span>
      </div>
      <div class="field col-2">
        <span class="field-label">PROTOCOLO DE AUTORIZAÇÃO DE USO</span>
        <span class="field-value">${dados.protocolo ? `${dados.protocolo} - ${formatarDataHora(dados.dataAutorizacao || '')}` : ''}</span>
      </div>
    </div>
    
    <!-- INSCRIÇÃO ESTADUAL -->
    <div class="row">
      <div class="field col">
        <span class="field-label">INSCRIÇÃO ESTADUAL</span>
        <span class="field-value">${dados.emitente.ie}</span>
      </div>
      <div class="field col">
        <span class="field-label">INSCRIÇÃO ESTADUAL DO SUBST. TRIBUTÁRIO</span>
        <span class="field-value">${dados.emitente.iest || ''}</span>
      </div>
      <div class="field col">
        <span class="field-label">CNPJ</span>
        <span class="field-value">${formatarCNPJ(dados.emitente.cnpj)}</span>
      </div>
    </div>
    
    <!-- DESTINATÁRIO/REMETENTE -->
    <div class="section-title">DESTINATÁRIO/REMETENTE</div>
    <div class="row">
      <div class="field col-2">
        <span class="field-label">NOME/RAZÃO SOCIAL</span>
        <span class="field-value">${dados.destinatario.nome}</span>
      </div>
      <div class="field col">
        <span class="field-label">CNPJ/CPF</span>
        <span class="field-value">${formatarCPFCNPJ(dados.destinatario.cpfCnpj)}</span>
      </div>
      <div class="field col">
        <span class="field-label">DATA DA EMISSÃO</span>
        <span class="field-value">${formatarData(dados.dataEmissao)}</span>
      </div>
    </div>
    
    <div class="row">
      <div class="field col-2">
        <span class="field-label">ENDEREÇO</span>
        <span class="field-value">${dados.destinatario.endereco}</span>
      </div>
      <div class="field col">
        <span class="field-label">BAIRRO/DISTRITO</span>
        <span class="field-value">${dados.destinatario.bairro}</span>
      </div>
      <div class="field col">
        <span class="field-label">CEP</span>
        <span class="field-value">${formatarCEP(dados.destinatario.cep)}</span>
      </div>
      <div class="field col">
        <span class="field-label">DATA DA SAÍDA/ENTRADA</span>
        <span class="field-value">${dados.dataSaida ? formatarData(dados.dataSaida) : ''}</span>
      </div>
    </div>
    
    <div class="row">
      <div class="field col">
        <span class="field-label">MUNICÍPIO</span>
        <span class="field-value">${dados.destinatario.municipio}</span>
      </div>
      <div class="field" style="width: 50px;">
        <span class="field-label">UF</span>
        <span class="field-value">${dados.destinatario.uf}</span>
      </div>
      <div class="field col">
        <span class="field-label">FONE/FAX</span>
        <span class="field-value">${dados.destinatario.telefone || ''}</span>
      </div>
      <div class="field col">
        <span class="field-label">INSCRIÇÃO ESTADUAL</span>
        <span class="field-value">${dados.destinatario.ie || ''}</span>
      </div>
      <div class="field col">
        <span class="field-label">HORA DA SAÍDA/ENTRADA</span>
        <span class="field-value"></span>
      </div>
    </div>
    
    <!-- FATURA/DUPLICATA -->
    <div class="section-title">FATURA/DUPLICATA</div>
    <div class="field">
      <span class="field-value">PAGAMENTO À VISTA</span>
    </div>
    
    <!-- CÁLCULO DO IMPOSTO -->
    <div class="section-title">CÁLCULO DO IMPOSTO</div>
    <div class="row">
      <div class="field col">
        <span class="field-label">BASE DE CÁLCULO DO ICMS</span>
        <span class="field-value">${formatarValor(dados.totais.baseCalculoIcms)}</span>
      </div>
      <div class="field col">
        <span class="field-label">VALOR DO ICMS</span>
        <span class="field-value">${formatarValor(dados.totais.valorIcms)}</span>
      </div>
      <div class="field col">
        <span class="field-label">BASE DE CÁLCULO ICMS ST</span>
        <span class="field-value">${formatarValor(dados.totais.baseCalculoIcmsST)}</span>
      </div>
      <div class="field col">
        <span class="field-label">VALOR DO ICMS SUBSTITUIÇÃO</span>
        <span class="field-value">${formatarValor(dados.totais.valorIcmsST)}</span>
      </div>
      <div class="field col">
        <span class="field-label">VALOR TOTAL DOS PRODUTOS</span>
        <span class="field-value">${formatarValor(dados.totais.valorTotalProdutos)}</span>
      </div>
    </div>
    
    <div class="row">
      <div class="field col">
        <span class="field-label">VALOR DO FRETE</span>
        <span class="field-value">${formatarValor(dados.totais.valorFrete)}</span>
      </div>
      <div class="field col">
        <span class="field-label">VALOR DO SEGURO</span>
        <span class="field-value">${formatarValor(dados.totais.valorSeguro)}</span>
      </div>
      <div class="field col">
        <span class="field-label">DESCONTO</span>
        <span class="field-value">${formatarValor(dados.totais.desconto)}</span>
      </div>
      <div class="field col">
        <span class="field-label">OUTRAS DESPESAS ACESSÓRIAS</span>
        <span class="field-value">${formatarValor(dados.totais.outrasDespesas)}</span>
      </div>
      <div class="field col">
        <span class="field-label">VALOR DO IPI</span>
        <span class="field-value">${formatarValor(dados.totais.valorIPI)}</span>
      </div>
      <div class="field col" style="background-color: #f0f0f0;">
        <span class="field-label">VALOR TOTAL DA NOTA</span>
        <span class="field-value" style="font-weight: bold; font-size: 8px;">${formatarValor(dados.totais.valorTotal)}</span>
      </div>
    </div>
    
    <!-- TRANSPORTADOR/VOLUMES -->
    <div class="section-title">TRANSPORTADOR/VOLUMES TRANSPORTADOS</div>
    <div class="row">
      <div class="field col">
        <span class="field-label">RAZÃO SOCIAL</span>
        <span class="field-value">${dados.transporte?.transportador?.nome || 'Remetente'}</span>
      </div>
      <div class="field col">
        <span class="field-label">FRETE POR CONTA</span>
        <span class="field-value">${modalidadeFreteMap[dados.transporte?.modalidade || '9'] || '9-Sem Frete'}</span>
      </div>
      <div class="field col">
        <span class="field-label">CÓDIGO ANTT</span>
        <span class="field-value"></span>
      </div>
      <div class="field col">
        <span class="field-label">PLACA DO VEÍCULO</span>
        <span class="field-value"></span>
      </div>
      <div class="field" style="width: 40px;">
        <span class="field-label">UF</span>
        <span class="field-value"></span>
      </div>
      <div class="field col">
        <span class="field-label">CNPJ/CPF</span>
        <span class="field-value">${dados.transporte?.transportador?.cnpjCpf ? formatarCPFCNPJ(dados.transporte.transportador.cnpjCpf) : ''}</span>
      </div>
    </div>
    
    <div class="row">
      <div class="field col">
        <span class="field-label">ENDEREÇO</span>
        <span class="field-value">${dados.transporte?.transportador?.endereco || ''}</span>
      </div>
      <div class="field col">
        <span class="field-label">MUNICÍPIO</span>
        <span class="field-value">${dados.transporte?.transportador?.municipio || ''}</span>
      </div>
      <div class="field" style="width: 40px;">
        <span class="field-label">UF</span>
        <span class="field-value">${dados.transporte?.transportador?.uf || ''}</span>
      </div>
      <div class="field col">
        <span class="field-label">INSCRIÇÃO ESTADUAL</span>
        <span class="field-value">${dados.transporte?.transportador?.ie || ''}</span>
      </div>
    </div>
    
    <div class="row">
      <div class="field col">
        <span class="field-label">QUANTIDADE</span>
        <span class="field-value">${dados.transporte?.volumes?.quantidade || ''}</span>
      </div>
      <div class="field col">
        <span class="field-label">ESPÉCIE</span>
        <span class="field-value">${dados.transporte?.volumes?.especie || 'Volume(s)'}</span>
      </div>
      <div class="field col">
        <span class="field-label">MARCA</span>
        <span class="field-value">${dados.transporte?.volumes?.marca || ''}</span>
      </div>
      <div class="field col">
        <span class="field-label">NUMERAÇÃO</span>
        <span class="field-value">${dados.transporte?.volumes?.numeracao || ''}</span>
      </div>
      <div class="field col">
        <span class="field-label">PESO BRUTO</span>
        <span class="field-value">${dados.transporte?.volumes?.pesoBruto ? formatarValor(dados.transporte.volumes.pesoBruto) : ''}</span>
      </div>
      <div class="field col">
        <span class="field-label">PESO LÍQUIDO</span>
        <span class="field-value">${dados.transporte?.volumes?.pesoLiquido ? formatarValor(dados.transporte.volumes.pesoLiquido) : ''}</span>
      </div>
    </div>
    
    <!-- DADOS DO PRODUTO/SERVIÇO -->
    <div class="section-title">DADOS DO PRODUTO/SERVIÇO</div>
    <table>
      <thead>
        <tr>
          <th style="width: 3%;">Item</th>
          <th style="width: 10%;">Código<br>Produto</th>
          <th style="width: 20%;">Descrição do Produto/Serviço</th>
          <th style="width: 6%;">NCM/<br>SH</th>
          <th style="width: 4%;">CST</th>
          <th style="width: 4%;">CFOP</th>
          <th style="width: 4%;">Unid</th>
          <th style="width: 7%;">Quant</th>
          <th style="width: 8%;">Valor<br>Unitário</th>
          <th style="width: 9%;">Valor<br>Total</th>
          <th style="width: 7%;">BC ICMS</th>
          <th style="width: 7%;">Valor<br>ICMS</th>
          <th style="width: 5%;">Valor<br>IPI</th>
          <th style="width: 6%;">Alíq.<br>ICMS</th>
        </tr>
      </thead>
      <tbody>
        ${linhasProdutos}
      </tbody>
    </table>
    
    <!-- CÁLCULO DO ISSQN -->
    <div class="section-title" style="margin-top: 1px;">CÁLCULO DO ISSQN</div>
    <div class="row">
      <div class="field col">
        <span class="field-label">INSCRIÇÃO MUNICIPAL</span>
        <span class="field-value"></span>
      </div>
      <div class="field col">
        <span class="field-label">VALOR TOTAL DOS SERVIÇOS</span>
        <span class="field-value"></span>
      </div>
      <div class="field col">
        <span class="field-label">BASE DE CÁLCULO DO ISSQN</span>
        <span class="field-value"></span>
      </div>
      <div class="field col">
        <span class="field-label">VALOR DO ISSQN</span>
        <span class="field-value"></span>
      </div>
    </div>
    
    <!-- DADOS ADICIONAIS -->
    <div class="section-title" style="margin-top: 1px;">DADOS ADICIONAIS</div>
    <div class="row">
      <div class="field col-2">
        <span class="field-label">INFORMAÇÕES COMPLEMENTARES</span>
        <span class="field-value" style="min-height: 30px; display: block;">${dados.informacoesComplementares || ''}</span>
      </div>
      <div class="field col">
        <span class="field-label">RESERVADO AO FISCO</span>
        <span class="field-value" style="min-height: 30px; display: block;">${dados.informacoesFisco || ''}</span>
      </div>
    </div>
    
  </div>
</body>
</html>
  `;
  
  return html;
}
