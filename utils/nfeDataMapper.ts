/**
 * Mapeador de Dados para NF-e
 * Converte dados do formulário para o formato esperado pelo servidor SEFAZ
 */

import type { CompanySettings, Customer } from '../contexts/ERPContext';

export interface NFeItem {
  id: string;
  productId: string;
  productName: string;
  ncm: string;
  cfop: string;
  quantity: number;
  unitValue: number;
  totalValue: number;
  icmsAliquota: number;
  ipiAliquota: number;
  pisAliquota: number;
  cofinsAliquota: number;
}

export interface NFeFormData {
  serie: string;
  numero: string;
  naturezaOperacao: string;
  items: NFeItem[];
  informacoesAdicionais?: string;
}

/**
 * Converte dados do formulário para o formato SEFAZ 4.0
 */
export function mapToNFeXMLData(
  formData: NFeFormData,
  companySettings: CompanySettings,
  destinatario: Customer
) {
  // Calcular totais
  const totalProdutos = formData.items.reduce((sum, item) => sum + item.totalValue, 0);
  const totalICMS = formData.items.reduce((sum, item) => sum + (item.totalValue * item.icmsAliquota / 100), 0);
  const totalIPI = formData.items.reduce((sum, item) => sum + (item.totalValue * item.ipiAliquota / 100), 0);
  const totalPIS = formData.items.reduce((sum, item) => sum + (item.totalValue * item.pisAliquota / 100), 0);
  const totalCOFINS = formData.items.reduce((sum, item) => sum + (item.totalValue * item.cofinsAliquota / 100), 0);
  const totalNota = totalProdutos + totalIPI;
  
  // Preparar data/hora atual
  const now = new Date();
  const dataEmissao = now.toISOString();
  
  // Determinar tipo de documento do destinatário
  const docDestinatario = destinatario.document.replace(/\D/g, '');
  const tipoDestinatario = docDestinatario.length === 11 ? 'fisica' : 'juridica';
  
  return {
    emitente: {
      cnpj: companySettings.cnpj.replace(/\D/g, ''),
      razaoSocial: companySettings.companyName,
      nomeFantasia: companySettings.tradeName || companySettings.companyName,
      inscricaoEstadual: companySettings.stateRegistration || "ISENTO",
      cep: companySettings.zipCode?.replace(/\D/g, '') || "00000000",
      logradouro: companySettings.street || "Não informado",
      numero: companySettings.number || "SN",
      complemento: companySettings.complement || "",
      bairro: companySettings.neighborhood || "Centro",
      cidade: companySettings.city || "São Paulo",
      codigoMunicipio: "3550308", // Código IBGE de São Paulo (padrão)
      estado: companySettings.state || "SP",
      telefone: companySettings.phone?.replace(/\D/g, '') || "",
      email: companySettings.email || ""
    },
    
    destinatario: {
      tipo: tipoDestinatario,
      documento: docDestinatario,
      nome: destinatario.name,
      inscricaoEstadual: destinatario.stateRegistration || undefined,
      email: destinatario.email || "",
      telefone: destinatario.phone?.replace(/\D/g, '') || "",
      cep: destinatario.zipCode?.replace(/\D/g, '') || "00000000",
      logradouro: destinatario.street || "Não informado",
      numero: destinatario.number || "SN",
      complemento: destinatario.complement || "",
      bairro: destinatario.neighborhood || "Centro",
      cidade: destinatario.city || "São Paulo",
      codigoMunicipio: "3550308", // Código IBGE de São Paulo (padrão)
      estado: destinatario.state || "SP"
    },
    
    identificacao: {
      serie: formData.serie,
      numero: parseInt(formData.numero),
      dataEmissao: dataEmissao,
      dataEntradaSaida: dataEmissao,
      tipo: 1, // 1=Saída
      finalidade: 1, // 1=Normal
      naturezaOperacao: formData.naturezaOperacao,
      ambiente: 2, // 2=Homologação
      tipoEmissao: 1, // 1=Normal
      modelo: 55, // 55=NF-e
      consumidorFinal: 1, // 1=Consumidor Final
      presenca: 1 // 1=Operação presencial
    },
    
    itens: formData.items.map((item, index) => ({
      numeroItem: index + 1,
      codigoProduto: item.productId.slice(0, 60),
      descricao: item.productName,
      ncm: item.ncm.replace(/\D/g, '').padEnd(8, '0'),
      cfop: item.cfop,
      unidadeComercial: "UN",
      quantidadeComercial: item.quantity,
      valorUnitarioComercial: item.unitValue,
      valorTotalBruto: item.totalValue,
      valorFrete: 0,
      valorSeguro: 0,
      valorDesconto: 0,
      valorOutrasDespesas: 0,
      origem: 0, // 0=Nacional
      icms: {
        csosn: "102", // 102=Tributada sem permissão de crédito (Simples Nacional)
        aliquota: item.icmsAliquota,
        baseCalculo: item.totalValue,
        valor: item.totalValue * (item.icmsAliquota / 100)
      },
      pis: {
        cst: "07", // 07=Operação isenta da contribuição
        aliquota: item.pisAliquota,
        baseCalculo: item.totalValue,
        valor: item.totalValue * (item.pisAliquota / 100)
      },
      cofins: {
        cst: "07", // 07=Operação isenta da contribuição
        aliquota: item.cofinsAliquota,
        baseCalculo: item.totalValue,
        valor: item.totalValue * (item.cofinsAliquota / 100)
      }
    })),
    
    totais: {
      baseCalculoICMS: totalProdutos,
      valorICMS: totalICMS,
      baseCalculoICMSST: 0,
      valorICMSST: 0,
      valorProdutos: totalProdutos,
      valorFrete: 0,
      valorSeguro: 0,
      valorDesconto: 0,
      valorIPI: totalIPI,
      valorPIS: totalPIS,
      valorCOFINS: totalCOFINS,
      valorOutrasDespesas: 0,
      valorTotal: totalNota
    },
    
    informacoesAdicionais: formData.informacoesAdicionais || undefined
  };
}
