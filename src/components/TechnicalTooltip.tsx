import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { HelpCircle } from "lucide-react";

interface TechnicalTooltipProps {
  label: string;
  description: string;
  example?: string;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Componente de tooltip para campos técnicos e fiscais
 * Fornece ajuda contextual para campos como CFOP, CST, NCM, etc.
 */
export function TechnicalTooltip({
  label,
  description,
  example,
  icon,
  className = ""
}: TechnicalTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <button 
            type="button" 
            className={`inline-flex items-center justify-center w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors ${className}`}
            aria-label={`Ajuda para ${label}`}
          >
            {icon || <HelpCircle className="w-4 h-4" />}
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side="right" 
          className="max-w-xs p-3 bg-gray-900 text-white border-gray-700"
        >
          <div className="space-y-2">
            <p className="font-semibold text-sm">{label}</p>
            <p className="text-xs text-gray-300">{description}</p>
            {example && (
              <div className="mt-2 pt-2 border-t border-gray-700">
                <p className="text-xs text-gray-400">
                  <span className="font-semibold text-gray-300">Exemplo:</span> {example}
                </p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Dicionário com explicações para campos técnicos comuns
 */
export const FIELD_HELP = {
  // Campos Fiscais
  NCM: {
    label: "NCM - Nomenclatura Comum do Mercosul",
    description: "Código de 8 dígitos que classifica produtos para fins fiscais e estatísticos. Obrigatório para emissão de NFe.",
    example: "1006.30.21 (Arroz semi-branqueado ou branqueado)"
  },
  CFOP: {
    label: "CFOP - Código Fiscal de Operações e Prestações",
    description: "Código de 4 dígitos que identifica a natureza de circulação da mercadoria ou prestação de serviço.",
    example: "5102 (Venda dentro do estado), 6102 (Venda para outro estado)"
  },
  CST: {
    label: "CST - Código de Situação Tributária",
    description: "Código de 3 dígitos que indica o regime de tributação do ICMS. Usado por empresas do Regime Normal.",
    example: "000 (Tributada integralmente), 101 (Tributada com cobrança do ICMS)"
  },
  CSOSN: {
    label: "CSOSN - Código de Situação da Operação no Simples Nacional",
    description: "Código de 3 dígitos para empresas optantes pelo Simples Nacional.",
    example: "101 (Tributada pelo Simples Nacional com permissão de crédito)"
  },
  ICMS: {
    label: "ICMS - Imposto sobre Circulação de Mercadorias e Serviços",
    description: "Imposto estadual cobrado sobre operações de circulação de mercadorias. A alíquota varia por estado.",
    example: "18% (alíquota padrão em São Paulo)"
  },
  IPI: {
    label: "IPI - Imposto sobre Produtos Industrializados",
    description: "Imposto federal que incide sobre produtos industrializados. A alíquota varia conforme a classificação do produto.",
    example: "5% para produtos alimentícios processados"
  },
  PIS: {
    label: "PIS - Programa de Integração Social",
    description: "Contribuição federal para financiamento da seguridade social. Alíquota de 0,65% (cumulativo) ou 1,65% (não cumulativo).",
    example: "1,65% no regime não-cumulativo"
  },
  COFINS: {
    label: "COFINS - Contribuição para Financiamento da Seguridade Social",
    description: "Contribuição federal cobrada sobre o faturamento bruto. Alíquota de 3% (cumulativo) ou 7,6% (não cumulativo).",
    example: "7,6% no regime não-cumulativo"
  },
  
  // Campos de Identificação
  CNPJ: {
    label: "CNPJ - Cadastro Nacional da Pessoa Jurídica",
    description: "Número de identificação de empresas no Brasil. Formato: XX.XXX.XXX/XXXX-XX",
    example: "12.345.678/0001-90"
  },
  CPF: {
    label: "CPF - Cadastro de Pessoas Físicas",
    description: "Número de identificação de pessoas físicas no Brasil. Formato: XXX.XXX.XXX-XX",
    example: "123.456.789-10"
  },
  IE: {
    label: "IE - Inscrição Estadual",
    description: "Registro da empresa na Secretaria da Fazenda do estado. Obrigatório para contribuintes do ICMS.",
    example: "123.456.789.012 (formato varia por estado)"
  },
  IM: {
    label: "IM - Inscrição Municipal",
    description: "Registro da empresa na prefeitura municipal. Obrigatório para prestadores de serviços.",
    example: "123456789"
  },
  
  // Campos de Estoque
  LOTE: {
    label: "Lote",
    description: "Identificação do lote de fabricação do produto. Essencial para rastreabilidade e recall.",
    example: "L2024110601"
  },
  VALIDADE: {
    label: "Data de Validade",
    description: "Data até a qual o produto mantém suas características e pode ser comercializado.",
    example: "31/12/2025"
  },
  LOCALIZACAO: {
    label: "Localização no Depósito",
    description: "Endereçamento físico do produto no estoque para facilitar picking e inventário.",
    example: "Corredor A - Prateleira 3 - Nível 2"
  },
  
  // Campos Financeiros
  BOLETO: {
    label: "Número do Boleto",
    description: "Código de barras ou linha digitável do boleto bancário para pagamento.",
    example: "00190.00009 01234.567890 12345.678901 1 99999999999999"
  },
  PIX: {
    label: "Chave PIX",
    description: "Identificador para transferências via PIX. Pode ser CPF, CNPJ, e-mail, telefone ou chave aleatória.",
    example: "12.345.678/0001-90 ou pix@empresa.com"
  },
  
  // Campos de NFe
  NATUREZA_OPERACAO: {
    label: "Natureza da Operação",
    description: "Descrição da operação comercial que está sendo realizada. Aparece no DANFE.",
    example: "Venda de mercadoria adquirida de terceiros"
  },
  CHAVE_NFE: {
    label: "Chave de Acesso da NFe",
    description: "Código de 44 dígitos que identifica única e exclusivamente uma NFe.",
    example: "35241112345678000190550010000001231234567890"
  }
};
