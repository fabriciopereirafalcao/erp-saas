/**
 * ============================================================================
 * GERADOR DE DANFE (Documento Auxiliar da NF-e)
 * ============================================================================
 * 
 * Layout conforme modelo meudanfe.com.br (padrão SEFAZ real)
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
 * Gera HTML do DANFE conforme modelo meudanfe.com.br
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
    // Formata: 3525 1158 3747 2700 0119 5500 1000 0119 9634 5642
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
    const data = date.toLocaleDateString('pt-BR');
    const hora = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return `${data} às ${hora}`;
  };
  
  const formatarValor = (valor: number) => {
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  
  // Mapeamento de modalidade de frete
  const modalidadeFreteMap: { [key: string]: string } = {
    '0': '0-Emitente',
    '1': '1-Destinatário',
    '2': '2-Terceiros',
    '9': '9-Sem Transporte'
  };
  
  // Linhas de produtos
  const linhasProdutos = dados.produtos.map((p, i) => `
    <tr>
      <td class="td-left">${p.codigo}</td>
      <td class="td-left">${p.descricao}</td>
      <td class="td-center">${p.ncm}</td>
      <td class="td-center">${p.cst}</td>
      <td class="td-center">${p.cfop}</td>
      <td class="td-center">${p.unidade}</td>
      <td class="td-right">${formatarValor(p.quantidade)}</td>
      <td class="td-right">${formatarValor(p.valorUnitario)}</td>
      <td class="td-right">${formatarValor(p.valorTotal)}</td>
      <td class="td-right">${p.bcIcms ? formatarValor(p.bcIcms) : '0,00'}</td>
      <td class="td-right">${p.valorIcms ? formatarValor(p.valorIcms) : '0,00'}</td>
      <td class="td-right">${p.ipi ? formatarValor(p.ipi) : '0,00'}</td>
      <td class="td-right">${p.aliqIcms ? formatarValor(p.aliqIcms) : '0,00'}</td>
      <td class="td-right">0,00</td>
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
      font-family: 'Arial', sans-serif; 
      font-size: 8px;
      background: white;
      padding: 3mm;
    }
    
    .page { 
      width: 210mm;
      margin: 0 auto;
      background: white;
      position: relative;
    }
    
    /* Marca d'água */
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 80px;
      font-weight: bold;
      color: rgba(0, 0, 0, 0.08);
      white-space: nowrap;
      pointer-events: none;
      z-index: 1;
      text-align: center;
      line-height: 1.2;
    }
    
    /* Bordas */
    .border { border: 1px solid #000; }
    .border-top { border-top: 1px solid #000; }
    .border-bottom { border-bottom: 1px solid #000; }
    .border-left { border-left: 1px solid #000; }
    .border-right { border-right: 1px solid #000; }
    
    .box {
      border: 1px solid #000;
      padding: 2px 3px;
      overflow: hidden;
    }
    
    .label {
      font-size: 5px;
      font-weight: bold;
      text-transform: uppercase;
      display: block;
      margin-bottom: 1px;
    }
    
    .value {
      font-size: 7px;
      display: block;
    }
    
    /* Layout */
    .flex { display: flex; }
    .flex-1 { flex: 1; }
    .flex-2 { flex: 2; }
    .flex-3 { flex: 3; }
    
    /* Cabeçalho superior */
    .header-top {
      display: flex;
      border: 1px solid #000;
      min-height: 40px;
    }
    
    .header-recebimento {
      flex: 3;
      padding: 3px 5px;
      border-right: 1px solid #000;
      font-size: 6px;
      line-height: 8px;
      text-transform: uppercase;
    }
    
    .header-numero {
      flex: 1;
      text-align: center;
      padding: 3px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    
    .header-numero .nfe-label {
      font-size: 16px;
      font-weight: bold;
    }
    
    .header-numero .nfe-numero {
      font-size: 11px;
      font-weight: bold;
      margin: 2px 0;
    }
    
    .header-numero .nfe-serie {
      font-size: 9px;
      font-weight: bold;
    }
    
    /* Bloco principal */
    .main-block {
      display: flex;
      border: 1px solid #000;
      border-top: none;
      min-height: 90px;
    }
    
    .emitente-section {
      flex: 2;
      padding: 5px;
      border-right: 1px solid #000;
    }
    
    .emitente-nome {
      font-size: 10px;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 3px;
    }
    
    .emitente-info {
      font-size: 7px;
      line-height: 9px;
      text-transform: uppercase;
    }
    
    .danfe-section {
      flex: 1;
      padding: 5px;
      text-align: center;
      border-right: 1px solid #000;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    
    .danfe-title {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 2px;
    }
    
    .danfe-subtitle {
      font-size: 7px;
      line-height: 9px;
      margin-bottom: 5px;
    }
    
    .danfe-tipo {
      font-size: 7px;
      margin: 3px 0;
    }
    
    .danfe-tipo-numero {
      font-size: 16px;
      font-weight: bold;
      margin: 2px 0;
    }
    
    .barcode-section {
      flex: 1.5;
      padding: 5px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    
    .barcode-image {
      width: 100%;
      height: 50px;
      background: repeating-linear-gradient(
        to right,
        #000 0px,
        #000 2px,
        #fff 2px,
        #fff 4px
      );
      margin-bottom: 3px;
    }
    
    .chave-acesso {
      font-size: 7px;
      font-weight: bold;
      text-align: center;
      line-height: 9px;
      word-break: break-all;
      margin-bottom: 2px;
    }
    
    .chave-consulta {
      font-size: 5px;
      text-align: center;
      line-height: 6px;
    }
    
    /* Seção de natureza */
    .natureza-section {
      display: flex;
      border: 1px solid #000;
      border-top: none;
    }
    
    .natureza-box {
      flex: 1;
      padding: 2px 3px;
    }
    
    .natureza-title {
      font-size: 6px;
      font-weight: bold;
      text-transform: uppercase;
      text-align: center;
      margin-bottom: 2px;
    }
    
    .natureza-value {
      font-size: 8px;
      font-weight: bold;
      text-align: center;
    }
    
    /* Grid de 3 colunas */
    .grid-3 {
      display: flex;
      border: 1px solid #000;
      border-top: none;
    }
    
    .grid-3 > div {
      flex: 1;
      border-right: 1px solid #000;
      padding: 2px 3px;
    }
    
    .grid-3 > div:last-child {
      border-right: none;
    }
    
    /* Destinatário */
    .section-header {
      background-color: #000;
      color: #fff;
      padding: 2px 5px;
      font-size: 7px;
      font-weight: bold;
      text-transform: uppercase;
      border: 1px solid #000;
      border-top: none;
    }
    
    .dest-row {
      display: flex;
      border: 1px solid #000;
      border-top: none;
    }
    
    .dest-row > div {
      padding: 2px 3px;
      border-right: 1px solid #000;
    }
    
    .dest-row > div:last-child {
      border-right: none;
    }
    
    .dest-nome {
      font-size: 9px;
      font-weight: bold;
      text-transform: uppercase;
    }
    
    /* Cálculo do imposto */
    .calc-imposto {
      display: flex;
      border: 1px solid #000;
      border-top: none;
    }
    
    .calc-imposto > div {
      flex: 1;
      padding: 2px 3px;
      border-right: 1px solid #000;
      text-align: center;
    }
    
    .calc-imposto > div:last-child {
      border-right: none;
    }
    
    .calc-label {
      font-size: 5px;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 1px;
    }
    
    .calc-value {
      font-size: 7px;
      font-weight: bold;
    }
    
    /* Transportador */
    .transp-row {
      display: flex;
      border: 1px solid #000;
      border-top: none;
    }
    
    .transp-row > div {
      padding: 2px 3px;
      border-right: 1px solid #000;
    }
    
    .transp-row > div:last-child {
      border-right: none;
    }
    
    /* Tabela de produtos */
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #000;
      border-top: none;
    }
    
    th {
      background-color: #f5f5f5;
      border: 1px solid #000;
      padding: 2px;
      font-size: 5px;
      font-weight: bold;
      text-align: center;
      text-transform: uppercase;
      line-height: 6px;
    }
    
    td {
      border: 1px solid #000;
      padding: 2px 3px;
      font-size: 7px;
      min-height: 12px;
    }
    
    .td-left { text-align: left; }
    .td-center { text-align: center; }
    .td-right { text-align: right; }
    
    /* Dados adicionais */
    .dados-adicionais {
      display: flex;
      border: 1px solid #000;
      border-top: none;
      min-height: 60px;
    }
    
    .info-complementares {
      flex: 2;
      padding: 3px 5px;
      border-right: 1px solid #000;
    }
    
    .reservado-fisco {
      flex: 1;
      padding: 3px 5px;
    }
    
    .dados-adicionais .label {
      font-size: 6px;
      margin-bottom: 3px;
    }
    
    .dados-adicionais .value {
      font-size: 7px;
      line-height: 9px;
    }
    
    @media print {
      body { padding: 0; }
      .page { margin: 0; }
    }
  </style>
</head>
<body>
  <div class="page">
  
    ${dados.ambiente === 2 ? `
    <div class="watermark">
      NFe EMITIDA HOMOLOGAÇÃO<br>
      SEM VALOR FISCAL
    </div>
    ` : ''}
  
    <!-- CABEÇALHO SUPERIOR: RECEBIMENTO -->
    <div class="header-top">
      <div class="header-recebimento">
        RECEBEMOS DE <strong>${dados.emitente.razaoSocial.toUpperCase()}</strong> OS PRODUTOS/SERVIÇOS CONSTANTES DA NOTA FISCAL ELETRÔNICA INDICADA AO LADO. EMISSÃO: ${formatarDataHora(dados.dataEmissao)} DESTINO/REMETENTE: E MARMI LTDA - CONÊGO EDUARDO ARARIBE, 1672 CENTRO PACAÍÚS/CE
        <div style="margin-top: 4px; display: flex;">
          <div style="flex: 1; border-top: 1px solid #000; padding-top: 2px;">
            <span class="label">DATA DE RECEBIMENTO</span>
          </div>
          <div style="flex: 1; border-top: 1px solid #000; border-left: 1px solid #000; padding: 2px 0 0 3px;">
            <span class="label">IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR</span>
          </div>
        </div>
      </div>
      <div class="header-numero">
        <div class="nfe-label">NF-e</div>
        <div class="nfe-numero">N° ${dados.numero.padStart(11, '0')}</div>
        <div class="nfe-serie">SÉRIE ${dados.serie.padStart(3, '0')}</div>
      </div>
    </div>
    
    <!-- BLOCO PRINCIPAL: EMITENTE + DANFE + CÓDIGO DE BARRAS -->
    <div class="main-block">
      <!-- Emitente -->
      <div class="emitente-section">
        <div class="emitente-nome">${dados.emitente.razaoSocial}</div>
        <div class="emitente-info">
          ${dados.emitente.endereco}, ${dados.emitente.bairro}<br>
          ${dados.emitente.municipio} - ${dados.emitente.uf} - ${formatarCEP(dados.emitente.cep)}<br>
          OCARA - CE<br>
          ${dados.emitente.telefone ? `FONE/FAX: ${dados.emitente.telefone}` : ''}
        </div>
      </div>
      
      <!-- DANFE -->
      <div class="danfe-section">
        <div class="danfe-title">DANFE</div>
        <div class="danfe-subtitle">Documento Auxiliar da Nota<br>Fiscal Eletrônica</div>
        <div class="danfe-tipo">0 - ENTRADA</div>
        <div class="danfe-tipo-numero">${dados.tipoOperacao === 'ENTRADA' ? '0' : '1'}</div>
        <div class="danfe-tipo">1 - SAÍDA</div>
        <div style="font-size: 9px; font-weight: bold; margin-top: 3px;">
          N° ${dados.numero.padStart(11, '0')}<br>
          Série ${dados.serie.padStart(3, '0')}<br>
          Folha 1/1
        </div>
      </div>
      
      <!-- Código de Barras + Chave -->
      <div class="barcode-section">
        <div class="barcode-image"></div>
        <div class="chave-acesso">
          CHAVE DE ACESSO<br>
          ${formatarChave(dados.chaveAcesso)}
        </div>
        <div class="chave-consulta">
          Consulta de autenticidade no portal nacional da NF-e<br>
          www.nfe.fazenda.gov.br/portal ou no site da Sefaz Autorizadora
        </div>
        <div style="font-size: 6px; font-weight: bold; margin-top: 3px;">
          PROTOCOLO DE AUTORIZAÇÃO<br>
          ${dados.protocolo || ''}
        </div>
      </div>
    </div>
    
    <!-- NATUREZA DA OPERAÇÃO -->
    <div class="natureza-section">
      <div class="natureza-box">
        <div class="natureza-title">Natureza da Operação</div>
        <div class="natureza-value">${dados.naturezaOperacao}</div>
      </div>
    </div>
    
    <!-- INSCRIÇÃO ESTADUAL -->
    <div class="grid-3">
      <div>
        <span class="label">Inscrição Estadual</span>
        <span class="value">${dados.emitente.ie}</span>
      </div>
      <div>
        <span class="label">Inscrição Estadual do Subst. Tribut</span>
        <span class="value">${dados.emitente.iest || ''}</span>
      </div>
      <div>
        <span class="label">CNPJ / CPF</span>
        <span class="value">${formatarCNPJ(dados.emitente.cnpj)}</span>
      </div>
    </div>
    
    <!-- DESTINATÁRIO/REMETENTE -->
    <div class="section-header">DESTINATÁRIO / REMETENTE</div>
    
    <div class="dest-row">
      <div style="flex: 3;">
        <span class="label">Nome / Razão Social</span>
        <span class="dest-nome">${dados.destinatario.nome}</span>
      </div>
      <div style="flex: 1;">
        <span class="label">CNPJ/CPF</span>
        <span class="value">${formatarCPFCNPJ(dados.destinatario.cpfCnpj)}</span>
      </div>
      <div style="flex: 1;">
        <span class="label">Data da Emissão</span>
        <span class="value">${formatarData(dados.dataEmissao)}</span>
      </div>
    </div>
    
    <div class="dest-row">
      <div style="flex: 2;">
        <span class="label">Endereço</span>
        <span class="value">${dados.destinatario.endereco}</span>
      </div>
      <div style="flex: 1;">
        <span class="label">Bairro / Distrito</span>
        <span class="value">${dados.destinatario.bairro}</span>
      </div>
      <div style="flex: 1;">
        <span class="label">CEP</span>
        <span class="value">${formatarCEP(dados.destinatario.cep)}</span>
      </div>
      <div style="flex: 1;">
        <span class="label">Data da Saída/Entrada</span>
        <span class="value">${dados.dataSaida ? formatarData(dados.dataSaida) : formatarData(dados.dataEmissao)}</span>
      </div>
    </div>
    
    <div class="dest-row">
      <div style="flex: 2;">
        <span class="label">Município</span>
        <span class="value">${dados.destinatario.municipio}</span>
      </div>
      <div style="flex: 0 0 60px;">
        <span class="label">UF</span>
        <span class="value">${dados.destinatario.uf}</span>
      </div>
      <div style="flex: 1;">
        <span class="label">Fone/Fax</span>
        <span class="value">${dados.destinatario.telefone || ''}</span>
      </div>
      <div style="flex: 1;">
        <span class="label">Inscrição Estadual</span>
        <span class="value">${dados.destinatario.ie || ''}</span>
      </div>
      <div style="flex: 1;">
        <span class="label">Hora da Saída/Entrada</span>
        <span class="value">${new Date(dados.dataEmissao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
    
    <!-- CÁLCULO DO IMPOSTO (linha única) -->
    <div class="section-header">CÁLCULO DO IMPOSTO</div>
    <div class="calc-imposto">
      <div>
        <div class="calc-label">Base de Cálc.<br>ICMS</div>
        <div class="calc-value">${formatarValor(dados.totais.baseCalculoIcms)}</div>
      </div>
      <div>
        <div class="calc-label">Valor do<br>ICMS</div>
        <div class="calc-value">${formatarValor(dados.totais.valorIcms)}</div>
      </div>
      <div>
        <div class="calc-label">Base de Cálc.<br>ICMS Subst.</div>
        <div class="calc-value">${formatarValor(dados.totais.baseCalculoIcmsST)}</div>
      </div>
      <div>
        <div class="calc-label">Valor do ICMS<br>Subst.</div>
        <div class="calc-value">${formatarValor(dados.totais.valorIcmsST)}</div>
      </div>
      <div>
        <div class="calc-label">V. Imp.<br>Import</div>
        <div class="calc-value">0,00</div>
      </div>
      <div>
        <div class="calc-label">V. Total<br>dos Prod.</div>
        <div class="calc-value">${formatarValor(dados.totais.valorTotalProdutos)}</div>
      </div>
      <div>
        <div class="calc-label">Valor do<br>Frete</div>
        <div class="calc-value">${formatarValor(dados.totais.valorFrete)}</div>
      </div>
      <div>
        <div class="calc-label">Valor do<br>Seguro</div>
        <div class="calc-value">${formatarValor(dados.totais.valorSeguro)}</div>
      </div>
      <div>
        <div class="calc-label">Desconto</div>
        <div class="calc-value">${formatarValor(dados.totais.desconto)}</div>
      </div>
      <div>
        <div class="calc-label">Outras<br>Desp.</div>
        <div class="calc-value">${formatarValor(dados.totais.outrasDespesas)}</div>
      </div>
      <div>
        <div class="calc-label">Valor do<br>IPI</div>
        <div class="calc-value">${formatarValor(dados.totais.valorIPI)}</div>
      </div>
      <div style="background-color: #f0f0f0;">
        <div class="calc-label">V. Total<br>da NFe</div>
        <div class="calc-value">${formatarValor(dados.totais.valorTotal)}</div>
      </div>
    </div>
    
    <!-- TRANSPORTADOR/VOLUMES -->
    <div class="section-header">TRANSPORTADOR / VOLUMES TRANSPORTADOS</div>
    <div class="transp-row">
      <div style="flex: 3;">
        <span class="label">Nome / Razão Social</span>
        <span class="value">${dados.transporte?.transportador?.nome || ''}</span>
      </div>
      <div style="flex: 1;">
        <span class="label">Frete</span>
        <span class="value">${modalidadeFreteMap[dados.transporte?.modalidade || '9'] || '9-Sem Transporte'}</span>
      </div>
      <div style="flex: 1;">
        <span class="label">Código ANTT</span>
        <span class="value"></span>
      </div>
      <div style="flex: 1;">
        <span class="label">Placa do Veículo</span>
        <span class="value"></span>
      </div>
      <div style="flex: 0 0 50px;">
        <span class="label">UF</span>
        <span class="value"></span>
      </div>
      <div style="flex: 1;">
        <span class="label">CNPJ / CPF</span>
        <span class="value">${dados.transporte?.transportador?.cnpjCpf ? formatarCPFCNPJ(dados.transporte.transportador.cnpjCpf) : ''}</span>
      </div>
    </div>
    
    <div class="transp-row">
      <div style="flex: 2;">
        <span class="label">Endereço</span>
        <span class="value">${dados.transporte?.transportador?.endereco || ''}</span>
      </div>
      <div style="flex: 1;">
        <span class="label">Município</span>
        <span class="value">${dados.transporte?.transportador?.municipio || ''}</span>
      </div>
      <div style="flex: 0 0 50px;">
        <span class="label">UF</span>
        <span class="value">${dados.transporte?.transportador?.uf || ''}</span>
      </div>
      <div style="flex: 1;">
        <span class="label">Inscrição Estadual</span>
        <span class="value">${dados.transporte?.transportador?.ie || ''}</span>
      </div>
    </div>
    
    <div class="transp-row">
      <div style="flex: 1;">
        <span class="label">Quantidade</span>
        <span class="value">${dados.transporte?.volumes?.quantidade || ''}</span>
      </div>
      <div style="flex: 1;">
        <span class="label">Espécie</span>
        <span class="value">${dados.transporte?.volumes?.especie || ''}</span>
      </div>
      <div style="flex: 1;">
        <span class="label">Marca</span>
        <span class="value">${dados.transporte?.volumes?.marca || ''}</span>
      </div>
      <div style="flex: 1;">
        <span class="label">Numeração</span>
        <span class="value">${dados.transporte?.volumes?.numeracao || ''}</span>
      </div>
      <div style="flex: 1;">
        <span class="label">Peso Bruto</span>
        <span class="value">${dados.transporte?.volumes?.pesoBruto ? formatarValor(dados.transporte.volumes.pesoBruto) : ''}</span>
      </div>
      <div style="flex: 1;">
        <span class="label">Peso Líquido</span>
        <span class="value">${dados.transporte?.volumes?.pesoLiquido ? formatarValor(dados.transporte.volumes.pesoLiquido) : ''}</span>
      </div>
    </div>
    
    <!-- DADOS DOS PRODUTOS / SERVIÇOS -->
    <div class="section-header">DADOS DOS PRODUTOS / SERVIÇOS</div>
    <table>
      <thead>
        <tr>
          <th style="width: 10%;">Código<br>Produto</th>
          <th style="width: 22%;">Descrição do Produto / Serviço</th>
          <th style="width: 6%;">NCM/SH</th>
          <th style="width: 4%;">O/CST</th>
          <th style="width: 4%;">CFOP</th>
          <th style="width: 3%;">UN</th>
          <th style="width: 6%;">Quant</th>
          <th style="width: 7%;">Valor<br>Unit</th>
          <th style="width: 8%;">Valor<br>Total</th>
          <th style="width: 6%;">BC ICMS</th>
          <th style="width: 6%;">Valor<br>ICMS</th>
          <th style="width: 5%;">Valor<br>IPI</th>
          <th style="width: 5%;">Aliq<br>ICMS</th>
          <th style="width: 5%;">Aliq<br>IPI</th>
        </tr>
      </thead>
      <tbody>
        ${linhasProdutos}
      </tbody>
    </table>
    
    <!-- DADOS ADICIONAIS -->
    <div class="section-header">DADOS ADICIONAIS</div>
    <div class="dados-adicionais">
      <div class="info-complementares">
        <span class="label">Informações Complementares</span>
        <span class="value">${dados.informacoesComplementares || ''}</span>
      </div>
      <div class="reservado-fisco">
        <span class="label">Reservado ao Fisco</span>
        <span class="value">${dados.informacoesFisco || ''}</span>
      </div>
    </div>
    
  </div>
</body>
</html>
  `;
  
  return html;
}
