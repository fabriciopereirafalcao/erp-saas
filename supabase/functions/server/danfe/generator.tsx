/**
 * ============================================================================
 * GERADOR DE DANFE (Documento Auxiliar da NF-e)
 * ============================================================================
 * 
 * Layout conforme Manual de Especificações Técnicas do DANFE - SEFAZ
 * Padrão profissional idêntico aos utilizados por ERPs brasileiros
 * Formato A4 (210 × 297 mm)
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
 * Gera HTML do DANFE conforme Manual SEFAZ
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
    // Formata em grupos de 4: 3525 1158 3747 2700 0119 5500 1000 0119 9634 5642
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
    return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR');
  };
  
  const formatarHora = (dataISO: string) => {
    if (!dataISO) return '';
    const date = new Date(dataISO);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  
  const formatarValor = (valor: number) => {
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  
  // Mapeamento de modalidade de frete
  const modalidadeFreteMap: { [key: string]: string } = {
    '0': '0 - Emitente',
    '1': '1 - Destinatário',
    '2': '2 - Terceiros',
    '3': '3 - Próprio Remetente',
    '4': '4 - Próprio Destinatário',
    '9': '9 - Sem Transporte'
  };
  
  // Calcular total de tributos aproximado (33% conforme média)
  const totalTributos = dados.totais.valorTotal * 0.33;
  
  // Linhas de produtos
  const linhasProdutos = dados.produtos.map((p, i) => `
    <tr>
      <td class="td-center">${p.codigo}</td>
      <td class="td-left">${p.descricao}</td>
      <td class="td-center">${p.ncm}</td>
      <td class="td-center">${p.cst}</td>
      <td class="td-center">${p.cfop}</td>
      <td class="td-center">${p.unidade}</td>
      <td class="td-right">${formatarValor(p.quantidade)}</td>
      <td class="td-right">${formatarValor(p.valorUnitario)}</td>
      <td class="td-right">${formatarValor(p.valorTotal)}</td>
      <td class="td-right">0,00</td>
      <td class="td-right">${p.bcIcms ? formatarValor(p.bcIcms) : '0,00'}</td>
      <td class="td-right">${p.valorIcms ? formatarValor(p.valorIcms) : '0,00'}</td>
      <td class="td-right">${p.ipi ? formatarValor(p.ipi) : '0,00'}</td>
      <td class="td-center">${p.aliqIcms ? formatarValor(p.aliqIcms) + '%' : '0,00%'}</td>
      <td class="td-center">0,00%</td>
    </tr>
  `).join('');
  
  // Preencher linhas vazias se necessário (mínimo 5 linhas para layout profissional)
  const linhasVazias = Math.max(0, 5 - dados.produtos.length);
  const linhasVaziasHTML = Array(linhasVazias).fill(`
    <tr>
      <td class="td-center">&nbsp;</td>
      <td class="td-left">&nbsp;</td>
      <td class="td-center">&nbsp;</td>
      <td class="td-center">&nbsp;</td>
      <td class="td-center">&nbsp;</td>
      <td class="td-center">&nbsp;</td>
      <td class="td-right">&nbsp;</td>
      <td class="td-right">&nbsp;</td>
      <td class="td-right">&nbsp;</td>
      <td class="td-right">&nbsp;</td>
      <td class="td-right">&nbsp;</td>
      <td class="td-right">&nbsp;</td>
      <td class="td-right">&nbsp;</td>
      <td class="td-center">&nbsp;</td>
      <td class="td-center">&nbsp;</td>
    </tr>
  `).join('');
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DANFE - NF-e ${dados.numero}</title>
  <style>
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box; 
    }
    
    body { 
      font-family: 'Arial', 'Roboto', sans-serif;
      font-size: 8pt;
      line-height: 1.2;
      background: white;
      color: #000;
    }
    
    .page { 
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 3mm;
      background: white;
      position: relative;
    }
    
    /* Marca d'água para homologação */
    ${dados.ambiente === 2 ? `
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 72pt;
      font-weight: bold;
      color: rgba(0, 0, 0, 0.05);
      white-space: nowrap;
      pointer-events: none;
      z-index: 0;
      text-align: center;
      line-height: 1.3;
    }
    ` : ''}
    
    .content {
      position: relative;
      z-index: 1;
    }
    
    /* Bordas padrão SEFAZ */
    .box {
      border: 0.5pt solid #000;
      padding: 1.5mm;
    }
    
    .box-no-padding {
      border: 0.5pt solid #000;
      padding: 0;
    }
    
    .label {
      font-size: 5pt;
      font-weight: bold;
      text-transform: uppercase;
      display: block;
      margin-bottom: 0.5mm;
      color: #333;
    }
    
    .value {
      font-size: 8pt;
      display: block;
      color: #000;
    }
    
    .value-bold {
      font-size: 8pt;
      font-weight: bold;
      display: block;
      color: #000;
    }
    
    /* Layouts flex */
    .row {
      display: flex;
      width: 100%;
    }
    
    .col { flex: 1; }
    .col-2 { flex: 2; }
    .col-3 { flex: 3; }
    .col-4 { flex: 4; }
    
    /* ============================================ */
    /* 1. CABEÇALHO SUPERIOR - RECEBIMENTO */
    /* ============================================ */
    
    .header-recebimento {
      border: 0.5pt solid #000;
      padding: 2mm;
      margin-bottom: 1mm;
      min-height: 22mm;
    }
    
    .recebimento-texto {
      font-size: 7pt;
      line-height: 1.4;
      margin-bottom: 2mm;
      text-align: justify;
    }
    
    .recebimento-campos {
      display: flex;
      gap: 2mm;
      margin-top: 2mm;
      padding-top: 2mm;
      border-top: 0.5pt solid #000;
    }
    
    .recebimento-campos > div {
      flex: 1;
    }
    
    /* ============================================ */
    /* 2. BLOCO EMITENTE COM LOGO */
    /* ============================================ */
    
    .bloco-principal {
      display: flex;
      border: 0.5pt solid #000;
      border-top: none;
      min-height: 50mm;
    }
    
    .emitente-section {
      flex: 2.5;
      padding: 3mm;
      border-right: 0.5pt solid #000;
      display: flex;
      gap: 3mm;
    }
    
    .logo-container {
      width: 40mm;
      height: 40mm;
      border: 0.5pt dashed #ccc;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background-color: #fafafa;
      flex-shrink: 0;
    }
    
    .logo-icon {
      font-size: 32pt;
      color: #999;
      margin-bottom: 2mm;
    }
    
    .logo-placeholder {
      font-size: 5pt;
      color: #999;
      text-align: center;
      text-transform: uppercase;
    }
    
    .emitente-dados {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    
    .emitente-razao {
      font-size: 11pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 2mm;
      color: #000;
    }
    
    .emitente-info {
      font-size: 8pt;
      line-height: 1.5;
      color: #000;
    }
    
    /* ============================================ */
    /* 3. IDENTIFICAÇÃO DO DOCUMENTO */
    /* ============================================ */
    
    .danfe-section {
      flex: 1;
      padding: 3mm;
      text-align: center;
      border-right: 0.5pt solid #000;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    
    .danfe-title {
      font-size: 12pt;
      font-weight: bold;
      margin-bottom: 1mm;
    }
    
    .danfe-subtitle {
      font-size: 7pt;
      line-height: 1.3;
      margin-bottom: 3mm;
    }
    
    .danfe-tipo {
      font-size: 7pt;
      margin: 1mm 0;
    }
    
    .danfe-tipo-box {
      display: inline-block;
      border: 1pt solid #000;
      padding: 2mm 4mm;
      font-size: 18pt;
      font-weight: bold;
      margin: 2mm 0;
    }
    
    .danfe-numero {
      font-size: 9pt;
      font-weight: bold;
      margin-top: 2mm;
      line-height: 1.5;
    }
    
    /* ============================================ */
    /* 4. CHAVE DE ACESSO COM CÓDIGO DE BARRAS */
    /* ============================================ */
    
    .chave-section {
      flex: 1.8;
      padding: 3mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    
    .barcode-box {
      width: 100%;
      height: 35mm;
      border: 0.5pt solid #000;
      background: repeating-linear-gradient(
        to right,
        #000 0px,
        #000 1.5px,
        #fff 1.5px,
        #fff 3px
      );
      margin-bottom: 2mm;
    }
    
    .chave-titulo {
      font-size: 6pt;
      font-weight: bold;
      text-transform: uppercase;
      text-align: center;
      margin-bottom: 1mm;
    }
    
    .chave-numeros {
      font-size: 9pt;
      font-weight: bold;
      text-align: center;
      letter-spacing: 1pt;
      line-height: 1.4;
      word-spacing: 2pt;
      margin-bottom: 2mm;
    }
    
    .chave-consulta {
      font-size: 6pt;
      text-align: center;
      line-height: 1.3;
      color: #333;
    }
    
    /* ============================================ */
    /* 5. PROTOCOLO & NATUREZA */
    /* ============================================ */
    
    .protocolo-natureza {
      display: flex;
      border: 0.5pt solid #000;
      border-top: none;
    }
    
    .protocolo-box {
      flex: 1;
      padding: 2mm;
      border-right: 0.5pt solid #000;
    }
    
    .natureza-box {
      flex: 1;
      padding: 2mm;
    }
    
    /* ============================================ */
    /* 6. DADOS FISCAIS DO EMITENTE */
    /* ============================================ */
    
    .dados-fiscais {
      display: flex;
      border: 0.5pt solid #000;
      border-top: none;
    }
    
    .dados-fiscais > div {
      flex: 1;
      padding: 2mm;
      border-right: 0.5pt solid #000;
    }
    
    .dados-fiscais > div:last-child {
      border-right: none;
    }
    
    /* ============================================ */
    /* 7. DESTINATÁRIO / REMETENTE */
    /* ============================================ */
    
    .section-title {
      background-color: #000;
      color: #fff;
      padding: 1mm 2mm;
      font-size: 7pt;
      font-weight: bold;
      text-transform: uppercase;
      border: 0.5pt solid #000;
      border-top: none;
    }
    
    .dest-row {
      display: flex;
      border: 0.5pt solid #000;
      border-top: none;
    }
    
    .dest-row > div {
      padding: 2mm;
      border-right: 0.5pt solid #000;
    }
    
    .dest-row > div:last-child {
      border-right: none;
    }
    
    /* ============================================ */
    /* 8. CÁLCULO DO IMPOSTO */
    /* ============================================ */
    
    .calc-imposto-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      border: 0.5pt solid #000;
      border-top: none;
    }
    
    .calc-box {
      padding: 2mm;
      border-right: 0.5pt solid #000;
      border-bottom: 0.5pt solid #000;
      text-align: center;
    }
    
    .calc-box:nth-child(6n) {
      border-right: none;
    }
    
    .calc-box:nth-last-child(-n+6) {
      border-bottom: none;
    }
    
    .calc-box.destaque {
      background-color: #f5f5f5;
    }
    
    /* ============================================ */
    /* 9. TRANSPORTADOR */
    /* ============================================ */
    
    .transp-row {
      display: flex;
      border: 0.5pt solid #000;
      border-top: none;
    }
    
    .transp-row > div {
      padding: 2mm;
      border-right: 0.5pt solid #000;
    }
    
    .transp-row > div:last-child {
      border-right: none;
    }
    
    /* ============================================ */
    /* 10. TABELA DE PRODUTOS */
    /* ============================================ */
    
    table {
      width: 100%;
      border-collapse: collapse;
      border: 0.5pt solid #000;
      border-top: none;
    }
    
    th {
      background-color: #f5f5f5;
      border: 0.5pt solid #000;
      padding: 1.5mm;
      font-size: 5pt;
      font-weight: bold;
      text-align: center;
      text-transform: uppercase;
      line-height: 1.2;
    }
    
    td {
      border: 0.5pt solid #000;
      padding: 1.5mm;
      font-size: 7pt;
      line-height: 1.2;
      vertical-align: middle;
    }
    
    .td-left { text-align: left; }
    .td-center { text-align: center; }
    .td-right { text-align: right; }
    
    /* ============================================ */
    /* 11. DADOS ADICIONAIS */
    /* ============================================ */
    
    .dados-adicionais {
      display: flex;
      border: 0.5pt solid #000;
      border-top: none;
      min-height: 40mm;
    }
    
    .info-complementares {
      flex: 2;
      padding: 2mm;
      border-right: 0.5pt solid #000;
    }
    
    .reservado-fisco {
      flex: 1;
      padding: 2mm;
    }
    
    .dados-adicionais .label {
      margin-bottom: 2mm;
    }
    
    .dados-adicionais .value {
      line-height: 1.4;
      white-space: pre-wrap;
    }
    
    /* Impressão */
    @media print {
      body { padding: 0; }
      .page { 
        margin: 0; 
        padding: 3mm;
        page-break-after: always;
      }
    }
  </style>
</head>
<body>
  <div class="page">
  
    ${dados.ambiente === 2 ? `
    <div class="watermark">
      NF-e SEM VALOR FISCAL<br>
      EMITIDA EM AMBIENTE<br>
      DE HOMOLOGAÇÃO
    </div>
    ` : ''}
    
    <div class="content">
    
      <!-- ============================================ -->
      <!-- 1. CABEÇALHO SUPERIOR - RECEBIMENTO -->
      <!-- ============================================ -->
      <div class="header-recebimento">
        <div class="recebimento-texto">
          RECEBEMOS DE <strong>${dados.emitente.razaoSocial.toUpperCase()}</strong> OS PRODUTOS E/OU SERVIÇOS CONSTANTES DA NOTA FISCAL ELETRÔNICA INDICADA ABAIXO.<br>
          <strong>Emissão:</strong> ${formatarDataHora(dados.dataEmissao)} &nbsp;&nbsp;
          <strong>Valor Total:</strong> R$ ${formatarValor(dados.totais.valorTotal)} &nbsp;&nbsp;
          <strong>Destinatário:</strong> ${dados.destinatario.nome.toUpperCase()}
        </div>
        <div class="recebimento-campos">
          <div>
            <span class="label">Data de Recebimento</span>
            <span class="value">_____ / _____ / _________</span>
          </div>
          <div>
            <span class="label">Identificação e Assinatura do Recebedor</span>
            <span class="value">_______________________________________</span>
          </div>
        </div>
      </div>
      
      <!-- ============================================ -->
      <!-- 2. BLOCO PRINCIPAL: EMITENTE + DANFE + CHAVE -->
      <!-- ============================================ -->
      <div class="bloco-principal">
        
        <!-- Emitente com Logo -->
        <div class="emitente-section">
          <div class="logo-container">
            <div class="logo-icon">🏢</div>
            <div class="logo-placeholder">Inserir logo do<br>emitente aqui</div>
          </div>
          <div class="emitente-dados">
            <div class="emitente-razao">${dados.emitente.razaoSocial}</div>
            <div class="emitente-info">
              ${dados.emitente.endereco}<br>
              ${dados.emitente.bairro}<br>
              ${dados.emitente.municipio} - ${dados.emitente.uf} - CEP: ${formatarCEP(dados.emitente.cep)}<br>
              ${dados.emitente.telefone ? `Telefone/Fax: ${dados.emitente.telefone}` : ''}
            </div>
          </div>
        </div>
        
        <!-- DANFE -->
        <div class="danfe-section">
          <div class="danfe-title">DANFE</div>
          <div class="danfe-subtitle">Documento Auxiliar da<br>Nota Fiscal Eletrônica</div>
          <div class="danfe-tipo">0 - Entrada</div>
          <div class="danfe-tipo-box">${dados.tipoOperacao === 'ENTRADA' ? '0' : '1'}</div>
          <div class="danfe-tipo">1 - Saída</div>
          <div class="danfe-numero">
            N° ${dados.numero.padStart(9, '0')}<br>
            Série ${dados.serie.padStart(3, '0')}<br>
            Folha 1/1
          </div>
        </div>
        
        <!-- Chave de Acesso -->
        <div class="chave-section">
          <div class="barcode-box"></div>
          <div class="chave-titulo">Chave de Acesso</div>
          <div class="chave-numeros">${formatarChave(dados.chaveAcesso)}</div>
          <div class="chave-consulta">
            Consulta de autenticidade no portal nacional da NF-e<br>
            www.nfe.fazenda.gov.br/portal ou no site da Sefaz Autorizadora
          </div>
        </div>
        
      </div>
      
      <!-- ============================================ -->
      <!-- 5. PROTOCOLO & NATUREZA DA OPERAÇÃO -->
      <!-- ============================================ -->
      <div class="protocolo-natureza">
        <div class="protocolo-box">
          <span class="label">Protocolo de Autorização de Uso</span>
          <span class="value-bold">${dados.protocolo ? `${dados.protocolo} - ${formatarDataHora(dados.dataAutorizacao || '')}` : 'Aguardando autorização SEFAZ'}</span>
        </div>
        <div class="natureza-box">
          <span class="label">Natureza da Operação</span>
          <span class="value-bold">${dados.naturezaOperacao}</span>
        </div>
      </div>
      
      <!-- ============================================ -->
      <!-- 6. DADOS FISCAIS DO EMITENTE -->
      <!-- ============================================ -->
      <div class="dados-fiscais">
        <div>
          <span class="label">Inscrição Estadual</span>
          <span class="value">${dados.emitente.ie}</span>
        </div>
        <div>
          <span class="label">Inscrição Estadual do Subst. Tributário</span>
          <span class="value">${dados.emitente.iest || ''}</span>
        </div>
        <div>
          <span class="label">CNPJ</span>
          <span class="value">${formatarCNPJ(dados.emitente.cnpj)}</span>
        </div>
      </div>
      
      <!-- ============================================ -->
      <!-- 7. DESTINATÁRIO / REMETENTE -->
      <!-- ============================================ -->
      <div class="section-title">Destinatário / Remetente</div>
      
      <div class="dest-row">
        <div style="flex: 3;">
          <span class="label">Nome / Razão Social</span>
          <span class="value-bold">${dados.destinatario.nome}</span>
        </div>
        <div style="flex: 1.5;">
          <span class="label">CNPJ / CPF</span>
          <span class="value">${formatarCPFCNPJ(dados.destinatario.cpfCnpj)}</span>
        </div>
        <div style="flex: 1;">
          <span class="label">Data da Emissão</span>
          <span class="value">${formatarData(dados.dataEmissao)}</span>
        </div>
      </div>
      
      <div class="dest-row">
        <div style="flex: 3;">
          <span class="label">Endereço</span>
          <span class="value">${dados.destinatario.endereco}</span>
        </div>
        <div style="flex: 1.5;">
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
        <div style="flex: 0 0 15mm;">
          <span class="label">UF</span>
          <span class="value">${dados.destinatario.uf}</span>
        </div>
        <div style="flex: 1;">
          <span class="label">Telefone / Fax</span>
          <span class="value">${dados.destinatario.telefone || ''}</span>
        </div>
        <div style="flex: 1;">
          <span class="label">Inscrição Estadual</span>
          <span class="value">${dados.destinatario.ie || ''}</span>
        </div>
        <div style="flex: 1;">
          <span class="label">Hora da Saída/Entrada</span>
          <span class="value">${formatarHora(dados.dataEmissao)}</span>
        </div>
      </div>
      
      <!-- ============================================ -->
      <!-- 8. CÁLCULO DO IMPOSTO -->
      <!-- ============================================ -->
      <div class="section-title">Cálculo do Imposto</div>
      
      <div class="calc-imposto-grid">
        <div class="calc-box">
          <span class="label">Base de Cálculo<br>do ICMS</span>
          <span class="value-bold">${formatarValor(dados.totais.baseCalculoIcms)}</span>
        </div>
        <div class="calc-box">
          <span class="label">Valor do<br>ICMS</span>
          <span class="value-bold">${formatarValor(dados.totais.valorIcms)}</span>
        </div>
        <div class="calc-box">
          <span class="label">Base de Cálculo<br>ICMS ST</span>
          <span class="value-bold">${formatarValor(dados.totais.baseCalculoIcmsST)}</span>
        </div>
        <div class="calc-box">
          <span class="label">Valor do<br>ICMS ST</span>
          <span class="value-bold">${formatarValor(dados.totais.valorIcmsST)}</span>
        </div>
        <div class="calc-box">
          <span class="label">Valor Total<br>dos Produtos</span>
          <span class="value-bold">${formatarValor(dados.totais.valorTotalProdutos)}</span>
        </div>
        <div class="calc-box">
          <span class="label">Valor do<br>Frete</span>
          <span class="value-bold">${formatarValor(dados.totais.valorFrete)}</span>
        </div>
        
        <div class="calc-box">
          <span class="label">Valor do<br>Seguro</span>
          <span class="value-bold">${formatarValor(dados.totais.valorSeguro)}</span>
        </div>
        <div class="calc-box">
          <span class="label">Desconto</span>
          <span class="value-bold">${formatarValor(dados.totais.desconto)}</span>
        </div>
        <div class="calc-box">
          <span class="label">Outras Despesas<br>Acessórias</span>
          <span class="value-bold">${formatarValor(dados.totais.outrasDespesas)}</span>
        </div>
        <div class="calc-box">
          <span class="label">Valor do<br>IPI</span>
          <span class="value-bold">${formatarValor(dados.totais.valorIPI)}</span>
        </div>
        <div class="calc-box destaque">
          <span class="label">Valor Total<br>da Nota</span>
          <span class="value-bold" style="font-size: 9pt;">${formatarValor(dados.totais.valorTotal)}</span>
        </div>
        <div class="calc-box">
          <span class="label">Total de<br>Tributos</span>
          <span class="value-bold">${formatarValor(totalTributos)}</span>
        </div>
      </div>
      
      <!-- ============================================ -->
      <!-- 9. TRANSPORTADOR / VOLUMES TRANSPORTADOS -->
      <!-- ============================================ -->
      <div class="section-title">Transportador / Volumes Transportados</div>
      
      <div class="transp-row">
        <div style="flex: 3;">
          <span class="label">Nome / Razão Social</span>
          <span class="value">${dados.transporte?.transportador?.nome || ''}</span>
        </div>
        <div style="flex: 1;">
          <span class="label">Frete por Conta</span>
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
        <div style="flex: 0 0 15mm;">
          <span class="label">UF</span>
          <span class="value"></span>
        </div>
        <div style="flex: 1.5;">
          <span class="label">CNPJ / CPF</span>
          <span class="value">${dados.transporte?.transportador?.cnpjCpf ? formatarCPFCNPJ(dados.transporte.transportador.cnpjCpf) : ''}</span>
        </div>
      </div>
      
      <div class="transp-row">
        <div style="flex: 3;">
          <span class="label">Endereço</span>
          <span class="value">${dados.transporte?.transportador?.endereco || ''}</span>
        </div>
        <div style="flex: 1.5;">
          <span class="label">Município</span>
          <span class="value">${dados.transporte?.transportador?.municipio || ''}</span>
        </div>
        <div style="flex: 0 0 15mm;">
          <span class="label">UF</span>
          <span class="value">${dados.transporte?.transportador?.uf || ''}</span>
        </div>
        <div style="flex: 1.5;">
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
          <span class="value">${dados.transporte?.volumes?.pesoBruto ? formatarValor(dados.transporte.volumes.pesoBruto) + ' kg' : ''}</span>
        </div>
        <div style="flex: 1;">
          <span class="label">Peso Líquido</span>
          <span class="value">${dados.transporte?.volumes?.pesoLiquido ? formatarValor(dados.transporte.volumes.pesoLiquido) + ' kg' : ''}</span>
        </div>
      </div>
      
      <!-- ============================================ -->
      <!-- 10. DADOS DOS PRODUTOS / SERVIÇOS -->
      <!-- ============================================ -->
      <div class="section-title">Dados dos Produtos / Serviços</div>
      
      <table>
        <thead>
          <tr>
            <th style="width: 8%;">Código<br>Produto</th>
            <th style="width: 20%;">Descrição do Produto / Serviço</th>
            <th style="width: 6%;">NCM/SH</th>
            <th style="width: 4%;">O/CST</th>
            <th style="width: 4%;">CFOP</th>
            <th style="width: 4%;">Unid</th>
            <th style="width: 6%;">Quant</th>
            <th style="width: 7%;">Valor<br>Unitário</th>
            <th style="width: 8%;">Valor<br>Total</th>
            <th style="width: 6%;">Desconto</th>
            <th style="width: 7%;">Base<br>ICMS</th>
            <th style="width: 6%;">Valor<br>ICMS</th>
            <th style="width: 5%;">Valor<br>IPI</th>
            <th style="width: 5%;">Alíq.<br>ICMS</th>
            <th style="width: 4%;">Alíq.<br>IPI</th>
          </tr>
        </thead>
        <tbody>
          ${linhasProdutos}
          ${linhasVaziasHTML}
        </tbody>
      </table>
      
      <!-- ============================================ -->
      <!-- 11. DADOS ADICIONAIS -->
      <!-- ============================================ -->
      <div class="section-title">Dados Adicionais</div>
      
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
    
  </div>
</body>
</html>
  `;
  
  return html;
}
