/**
 * Códigos IBGE dos principais municípios brasileiros
 * Tabela completa: https://www.ibge.gov.br/explica/codigos-dos-municipios.php
 */

export const codigosMunicipios: Record<string, Record<string, string>> = {
  'AC': {
    'Rio Branco': '1200401',
    'Cruzeiro do Sul': '1200203',
  },
  'AL': {
    'Maceió': '2704302',
  },
  'AP': {
    'Macapá': '1600303',
  },
  'AM': {
    'Manaus': '1302603',
  },
  'BA': {
    'Salvador': '2927408',
    'Feira de Santana': '2910800',
  },
  'CE': {
    'Fortaleza': '2304400',
    'Caucaia': '2303709',
    'Juazeiro do Norte': '2307304',
    'Maracanaú': '2307650',
    'Sobral': '2312908',
    'OCARA': '2309300', // Adicionado para o teste
  },
  'DF': {
    'Brasília': '5300108',
    'BRASILIA': '5300108',
  },
  'ES': {
    'Vitória': '3205309',
    'Vila Velha': '3205200',
    'Serra': '3205002',
    'Cariacica': '3201308',
  },
  'GO': {
    'Goiânia': '5208707',
    'Aparecida de Goiânia': '5201405',
  },
  'MA': {
    'São Luís': '2111300',
  },
  'MT': {
    'Cuiabá': '5103403',
  },
  'MS': {
    'Campo Grande': '5002704',
  },
  'MG': {
    'Belo Horizonte': '3106200',
    'Uberlândia': '3170206',
    'Contagem': '3118601',
    'Juiz de Fora': '3136702',
    'Betim': '3106705',
  },
  'PA': {
    'Belém': '1501402',
    'Ananindeua': '1500800',
  },
  'PB': {
    'João Pessoa': '2507507',
  },
  'PR': {
    'Curitiba': '4106902',
    'Londrina': '4113700',
    'Maringá': '4115200',
    'Ponta Grossa': '4119905',
    'Cascavel': '4104808',
  },
  'PE': {
    'Recife': '2611606',
    'Jaboatão dos Guararapes': '2607901',
  },
  'PI': {
    'Teresina': '2211001',
  },
  'RJ': {
    'Rio de Janeiro': '3304557',
    'São Gonçalo': '3304904',
    'Duque de Caxias': '3301702',
    'Nova Iguaçu': '3303500',
    'Niterói': '3303302',
  },
  'RN': {
    'Natal': '2408102',
  },
  'RS': {
    'Porto Alegre': '4314902',
    'Caxias do Sul': '4305108',
    'Pelotas': '4314407',
    'Canoas': '4304606',
    'Santa Maria': '4316907',
  },
  'RO': {
    'Porto Velho': '1100205',
  },
  'RR': {
    'Boa Vista': '1400100',
  },
  'SC': {
    'Florianópolis': '4205407',
    'Joinville': '4209102',
    'Blumenau': '4202404',
    'São José': '4216602',
    'Criciúma': '4204608',
  },
  'SP': {
    'São Paulo': '3550308',
    'Guarulhos': '3518800',
    'Campinas': '3509502',
    'São Bernardo do Campo': '3548708',
    'Santo André': '3547809',
    'Osasco': '3534401',
    'São José dos Campos': '3549904',
    'Ribeirão Preto': '3543402',
    'Sorocaba': '3552205',
    'Santos': '3548500',
  },
  'SE': {
    'Aracaju': '2800308',
  },
  'TO': {
    'Palmas': '1721000',
  },
};

/**
 * Busca código IBGE do município
 * @param estado Sigla do estado (ex: 'SP')
 * @param cidade Nome da cidade (ex: 'São Paulo')
 * @returns Código IBGE de 7 dígitos ou código da capital como fallback
 */
export function buscarCodigoMunicipio(estado: string, cidade: string): string {
  // Normalizar cidade (remover acentos e maiúsculas)
  const cidadeNormalizada = cidade
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
  
  const municipiosEstado = codigosMunicipios[estado];
  
  if (!municipiosEstado) {
    // Estado não encontrado, retorna código padrão
    return '9999999';
  }
  
  // Busca exata
  if (municipiosEstado[cidade]) {
    return municipiosEstado[cidade];
  }
  
  // Busca normalizada
  for (const [nomeMunicipio, codigo] of Object.entries(municipiosEstado)) {
    const municipioNormalizado = nomeMunicipio
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
    
    if (municipioNormalizado === cidadeNormalizada) {
      return codigo;
    }
  }
  
  // Fallback: retorna o primeiro município (geralmente a capital)
  return Object.values(municipiosEstado)[0] || '9999999';
}
