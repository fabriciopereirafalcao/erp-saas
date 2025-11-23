import { useState, useMemo, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Textarea } from "./ui/textarea";
import { Separator } from "./ui/separator";
import { Alert, AlertDescription } from "./ui/alert";
import { Switch } from "./ui/switch";
import { Plus, Search, FileText, Send, CheckCircle, XCircle, Clock, AlertCircle, Download, MoreVertical, Building2, Save, Info, HelpCircle } from "lucide-react";
import { useERP } from "../contexts/ERPContext";
import { toast } from "sonner@2.0.3";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { supabase } from "../utils/supabase/client";
import { useAuth } from "../contexts/AuthContext";
import { NFeEmissionDialog } from "./NFeEmissionDialog";

// Tipos de dados fiscais
interface NFeTaxItem {
  productId: string;
  productName: string;
  ncm: string;
  cfop: string;
  cst: string;
  csosn: string;
  quantity: number;
  unitValue: number;
  totalValue: number;
  icmsRate: number;
  icmsValue: number;
  ipiRate: number;
  ipiValue: number;
  pisRate: number;
  pisValue: number;
  cofinsRate: number;
  cofinsValue: number;
}

interface NFe {
  id: string;
  number: string;
  series: string;
  type: "55" | "65";
  status: "Rascunho" | "Autorizada" | "Cancelada" | "Denegada" | "Rejeitada";
  salesOrderId?: string;
  issueDate: string;
  emitter: {
    cnpj: string;
    name: string;
    fantasyName: string;
    ie: string;
    address: string;
    city: string;
    state: string;
    cep: string;
  };
  recipient: {
    document: string;
    name: string;
    ie?: string;
    address: string;
    city: string;
    state: string;
    cep: string;
  };
  items: NFeTaxItem[];
  totals: {
    productsValue: number;
    icmsValue: number;
    ipiValue: number;
    pisValue: number;
    cofinsValue: number;
    nfeValue: number;
  };
  taxRegime: "Simples Nacional" | "Lucro Presumido" | "Lucro Real";
  naturezaOperacao: string;
  additionalInfo?: string;
  accessKey?: string;
  protocol?: string;
}

// Interface para configuração do Emitente
interface TaxEmitter {
  id: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  suframa: string;
  regimeTributario: "Simples Nacional" | "Lucro Presumido" | "Lucro Real" | "MEI";
  cnae: string;
  tokenIBPT: string;
  
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  codigoMunicipio: string;
  
  telefone: string;
  email: string;
  
  certificadoArquivo: string;
  certificadoSenha: string;
  certificadoValidade: string;
  
  nfe: {
    ambiente: "Produção" | "Homologação";
    serieNFe: string;
    numeroAtualNFe: number;
    naturezaOperacaoPadrao: string;
    cfopPadrao: string;
    tipoOperacaoPadrao: "Entrada" | "Saída";
    emailCopia: string;
    informacoesComplementares: string;
    csc: string;
    idToken: string;
    substituicaoTributaria: {
      ativo: boolean;
      ufDestino: string;
      inscricaoEstadualST: string;
    };
  };
  
  nfce: {
    ativo: boolean;
    ambiente: "Produção" | "Homologação";
    serieNFCe: string;
    numeroAtualNFCe: number;
    csc: string;
    idToken: string;
    emailCopia: string;
    informacoesComplementares: string;
  };
  
  sped: {
    ativo: boolean;
    perfil: "A" | "B" | "C";
    tipoAtividade: "Industrial" | "Comercial" | "Serviços" | "Outros";
    inventarioMensal: boolean;
    gerarBloco: {
      blocoK: boolean;
      blocoH: boolean;
      bloco1: boolean;
    };
    informacoesComplementares: string;
  };
  
  impostos: {
    pis: {
      aliquotaPadrao: number;
      regime: "Cumulativo" | "Não-Cumulativo";
    };
    cofins: {
      aliquotaPadrao: number;
      regime: "Cumulativo" | "Não-Cumulativo";
    };
    ipi: {
      aliquotaPadrao: number;
      aplicavel: boolean;
    };
    icms: {
      aliquotaInterna: number;
      estadoOrigem: string;
      aliquotasInterestaduais: {
        [uf: string]: {
          aliquota: number;
          fcp: number;
        };
      };
    };
    retencoes: {
      irrf: {
        ativo: boolean;
        aliquota: number;
      };
      iss: {
        ativo: boolean;
        aliquota: number;
      };
      inss: {
        ativo: boolean;
        aliquota: number;
      };
      csll: {
        ativo: boolean;
        aliquota: number;
      };
    };
  };
  
  createdAt: string;
  updatedAt: string;
}

// Estados brasileiros
const BRAZILIAN_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export function TaxInvoicing() {
  const { salesOrders, customers, companySettings } = useERP();
  const { user } = useAuth();
  const [activeMainTab, setActiveMainTab] = useState<"emissao" | "emitente">("emissao");
  const [activeEmitterTab, setActiveEmitterTab] = useState<"identificacao" | "nfe" | "nfce" | "sped" | "impostos">("identificacao");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Estado para Dialog de Emissão
  const [isEmissionDialogOpen, setIsEmissionDialogOpen] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isGeneratingXml, setIsGeneratingXml] = useState(false);

  // Estado do Formulário de Emissão
  const [nfeForm, setNfeForm] = useState({
    tipo: "55" as "55" | "65",
    serie: "1",
    naturezaOperacao: "Venda de mercadoria adquirida ou recebida de terceiros",
    cfop: "5.102",
    dataEmissao: new Date().toISOString().split('T')[0],
    destinatario: {
      tipo: "Jurídica" as "Física" | "Jurídica",
      documento: "",
      nome: "",
      ie: "",
      email: "",
      telefone: "",
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
    },
    itens: [] as Array<{
      id: string;
      produtoId: string;
      descricao: string;
      ncm: string;
      cfop: string;
      unidade: string;
      quantidade: number;
      valorUnitario: number;
      valorTotal: number;
      // Impostos
      icms: {
        origem: "0",
        cst: "00",
        csosn: "",
        aliquota: 0,
        baseCalculo: 0,
        valor: 0,
      };
      ipi: {
        cst: "99",
        aliquota: 0,
        baseCalculo: 0,
        valor: 0,
      };
      pis: {
        cst: "01",
        aliquota: 0,
        baseCalculo: 0,
        valor: 0,
      };
      cofins: {
        cst: "01",
        aliquota: 0,
        baseCalculo: 0,
        valor: 0,
      };
    }>,
    totais: {
      valorProdutos: 0,
      valorFrete: 0,
      valorSeguro: 0,
      valorDesconto: 0,
      valorOutrasDespesas: 0,
      baseCalculoICMS: 0,
      valorICMS: 0,
      baseCalculoICMSST: 0,
      valorICMSST: 0,
      valorIPI: 0,
      valorPIS: 0,
      valorCOFINS: 0,
      valorTotal: 0,
    },
    informacoesAdicionais: "",
  });

  // Estado para adicionar item
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [newItem, setNewItem] = useState({
    produtoId: "",
    descricao: "",
    ncm: "",
    cfop: "5.102",
    unidade: "UN",
    quantidade: 1,
    valorUnitario: 0,
    icmsOrigem: "0",
    icmsCst: "00",
    icmsAliquota: 18,
    ipiCst: "99",
    ipiAliquota: 0,
    pisCst: "01",
    pisAliquota: 1.65,
    cofinsCst: "01",
    cofinsAliquota: 7.6,
  });

  // Estado do Emitente
  const [emitter, setEmitter] = useState<TaxEmitter>({
    id: "EMT-001",
    cnpj: companySettings?.generalData?.cnpj || "",
    razaoSocial: companySettings?.generalData?.companyName || "",
    nomeFantasia: companySettings?.generalData?.tradeName || "",
    inscricaoEstadual: companySettings?.taxData?.stateRegistration || "",
    inscricaoMunicipal: companySettings?.taxData?.cityRegistration || "",
    suframa: "",
    regimeTributario: "Simples Nacional",
    cnae: "",
    tokenIBPT: "",
    
    cep: companySettings?.generalData?.zipCode || "",
    logradouro: companySettings?.generalData?.street || "",
    numero: companySettings?.generalData?.number || "",
    complemento: companySettings?.generalData?.complement || "",
    bairro: companySettings?.generalData?.neighborhood || "",
    cidade: companySettings?.generalData?.city || "",
    estado: companySettings?.generalData?.state || "",
    codigoMunicipio: "",
    
    telefone: companySettings?.generalData?.phone || "",
    email: companySettings?.generalData?.email || "",
    
    certificadoArquivo: "",
    certificadoSenha: "",
    certificadoValidade: "",
    
    nfe: {
      ambiente: "Homologação",
      serieNFe: "1",
      numeroAtualNFe: 1,
      naturezaOperacaoPadrao: "Venda de mercadoria adquirida ou recebida de terceiros",
      cfopPadrao: "5.102",
      tipoOperacaoPadrao: "Saída",
      emailCopia: companySettings?.generalData?.email || "",
      informacoesComplementares: "",
      csc: "",
      idToken: "",
      substituicaoTributaria: {
        ativo: false,
        ufDestino: "",
        inscricaoEstadualST: ""
      }
    },
    
    nfce: {
      ativo: false,
      ambiente: "Homologação",
      serieNFCe: "1",
      numeroAtualNFCe: 1,
      csc: "",
      idToken: "",
      emailCopia: companySettings?.generalData?.email || "",
      informacoesComplementares: ""
    },
    
    sped: {
      ativo: false,
      perfil: "B",
      tipoAtividade: "Comercial",
      inventarioMensal: false,
      gerarBloco: {
        blocoK: false,
        blocoH: true,
        bloco1: false
      },
      informacoesComplementares: ""
    },
    
    impostos: {
      pis: {
        aliquotaPadrao: 0.65,
        regime: "Cumulativo"
      },
      cofins: {
        aliquotaPadrao: 3.0,
        regime: "Cumulativo"
      },
      ipi: {
        aliquotaPadrao: 0,
        aplicavel: false
      },
      icms: {
        aliquotaInterna: 18,
        estadoOrigem: companySettings?.generalData?.state || "SP",
        aliquotasInterestaduais: {
          "AC": { aliquota: 7, fcp: 0 },
          "AL": { aliquota: 7, fcp: 2 },
          "AP": { aliquota: 7, fcp: 0 },
          "AM": { aliquota: 7, fcp: 0 },
          "BA": { aliquota: 7, fcp: 2 },
          "CE": { aliquota: 7, fcp: 2 },
          "DF": { aliquota: 7, fcp: 0 },
          "ES": { aliquota: 12, fcp: 2 },
          "GO": { aliquota: 7, fcp: 2 },
          "MA": { aliquota: 7, fcp: 2 },
          "MT": { aliquota: 7, fcp: 2 },
          "MS": { aliquota: 7, fcp: 2 },
          "MG": { aliquota: 12, fcp: 2 },
          "PA": { aliquota: 7, fcp: 2 },
          "PB": { aliquota: 7, fcp: 2 },
          "PR": { aliquota: 12, fcp: 2 },
          "PE": { aliquota: 7, fcp: 2 },
          "PI": { aliquota: 7, fcp: 0 },
          "RJ": { aliquota: 12, fcp: 2 },
          "RN": { aliquota: 7, fcp: 2 },
          "RS": { aliquota: 12, fcp: 2 },
          "RO": { aliquota: 7, fcp: 0 },
          "RR": { aliquota: 7, fcp: 0 },
          "SC": { aliquota: 12, fcp: 2 },
          "SP": { aliquota: 12, fcp: 2 },
          "SE": { aliquota: 7, fcp: 2 },
          "TO": { aliquota: 7, fcp: 0 }
        }
      },
      retencoes: {
        irrf: {
          ativo: false,
          aliquota: 1.5
        },
        iss: {
          ativo: false,
          aliquota: 5.0
        },
        inss: {
          ativo: false,
          aliquota: 11.0
        },
        csll: {
          ativo: false,
          aliquota: 1.0
        }
      }
    },
    
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // Mock de NFes
  const [nfes] = useState<NFe[]>([
    {
      id: "NFE-001",
      number: "000001",
      series: "1",
      type: "55",
      status: "Autorizada",
      salesOrderId: "PV-001",
      issueDate: "2024-01-15",
      emitter: {
        cnpj: companySettings?.generalData?.cnpj || "00.000.000/0000-00",
        name: companySettings?.generalData?.companyName || "Empresa Exemplo",
        fantasyName: companySettings?.generalData?.tradeName || "Empresa Exemplo",
        ie: companySettings?.taxData?.stateRegistration || "000.000.000.000",
        address: companySettings?.generalData?.address || "Endereço não cadastrado",
        city: companySettings?.generalData?.city || "São Paulo",
        state: companySettings?.generalData?.state || "SP",
        cep: companySettings?.generalData?.zipCode || "00000-000"
      },
      recipient: {
        document: "12.345.678/0001-90",
        name: "Cliente Exemplo Ltda",
        ie: "123.456.789.012",
        address: "Rua das Flores, 123",
        city: "São Paulo",
        state: "SP",
        cep: "01234-567"
      },
      items: [
        {
          productId: "PROD-001",
          productName: "Produto Exemplo",
          ncm: "12345678",
          cfop: "5.102",
          cst: "00",
          csosn: "102",
          quantity: 10,
          unitValue: 100,
          totalValue: 1000,
          icmsRate: 18,
          icmsValue: 180,
          ipiRate: 0,
          ipiValue: 0,
          pisRate: 1.65,
          pisValue: 16.5,
          cofinsRate: 7.6,
          cofinsValue: 76
        }
      ],
      totals: {
        productsValue: 1000,
        icmsValue: 180,
        ipiValue: 0,
        pisValue: 16.5,
        cofinsValue: 76,
        nfeValue: 1000
      },
      taxRegime: "Simples Nacional",
      naturezaOperacao: "Venda de mercadoria adquirida ou recebida de terceiros",
      accessKey: "35240112345678000190550010000000011234567890",
      protocol: "135240000000001"
    }
  ]);

  // Handlers do Emitente
  const handleSaveEmitter = () => {
    if (!emitter.cnpj || !emitter.razaoSocial) {
      toast.error("Preencha os campos obrigatórios (CNPJ e Razão Social)");
      return;
    }

    setEmitter({
      ...emitter,
      updatedAt: new Date().toISOString()
    });
    
    toast.success("Configurações do emitente salvas com sucesso!");
  };

  // Handlers de Emissão de NF-e
  const handleOpenEmissionDialog = () => {
    // Resetar formulário
    setNfeForm({
      tipo: "55",
      serie: emitter.nfe.serieNFe,
      naturezaOperacao: emitter.nfe.naturezaOperacaoPadrao,
      cfop: emitter.nfe.cfopPadrao,
      dataEmissao: new Date().toISOString().split('T')[0],
      destinatario: {
        tipo: "Jurídica",
        documento: "",
        nome: "",
        ie: "",
        email: "",
        telefone: "",
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
      },
      itens: [],
      totais: {
        valorProdutos: 0,
        valorFrete: 0,
        valorSeguro: 0,
        valorDesconto: 0,
        valorOutrasDespesas: 0,
        baseCalculoICMS: 0,
        valorICMS: 0,
        baseCalculoICMSST: 0,
        valorICMSST: 0,
        valorIPI: 0,
        valorPIS: 0,
        valorCOFINS: 0,
        valorTotal: 0,
      },
      informacoesAdicionais: "",
    });
    setIsEmissionDialogOpen(true);
  };

  const handleAddItem = () => {
    if (!newItem.descricao || !newItem.ncm || newItem.quantidade <= 0 || newItem.valorUnitario <= 0) {
      toast.error("Preencha todos os campos obrigatórios do item");
      return;
    }

    const itemId = `ITEM-${Date.now()}`;
    const valorTotal = newItem.quantidade * newItem.valorUnitario;

    const novoItem = {
      id: itemId,
      produtoId: newItem.produtoId || itemId,
      descricao: newItem.descricao,
      ncm: newItem.ncm,
      cfop: newItem.cfop,
      unidade: newItem.unidade,
      quantidade: newItem.quantidade,
      valorUnitario: newItem.valorUnitario,
      valorTotal,
      icms: {
        origem: newItem.icmsOrigem,
        cst: newItem.icmsCst,
        csosn: emitter.regimeTributario === "Simples Nacional" ? "102" : "",
        aliquota: newItem.icmsAliquota,
        baseCalculo: valorTotal,
        valor: (valorTotal * newItem.icmsAliquota) / 100,
      },
      ipi: {
        cst: newItem.ipiCst,
        aliquota: newItem.ipiAliquota,
        baseCalculo: valorTotal,
        valor: (valorTotal * newItem.ipiAliquota) / 100,
      },
      pis: {
        cst: newItem.pisCst,
        aliquota: newItem.pisAliquota,
        baseCalculo: valorTotal,
        valor: (valorTotal * newItem.pisAliquota) / 100,
      },
      cofins: {
        cst: newItem.cofinsCst,
        aliquota: newItem.cofinsAliquota,
        baseCalculo: valorTotal,
        valor: (valorTotal * newItem.cofinsAliquota) / 100,
      },
    };

    setNfeForm(prev => ({
      ...prev,
      itens: [...prev.itens, novoItem]
    }));

    // Resetar formulário de item
    setNewItem({
      produtoId: "",
      descricao: "",
      ncm: "",
      cfop: "5.102",
      unidade: "UN",
      quantidade: 1,
      valorUnitario: 0,
      icmsOrigem: "0",
      icmsCst: "00",
      icmsAliquota: 18,
      ipiCst: "99",
      ipiAliquota: 0,
      pisCst: "01",
      pisAliquota: 1.65,
      cofinsCst: "01",
      cofinsAliquota: 7.6,
    });

    setShowAddItemDialog(false);
    toast.success("Item adicionado com sucesso!");
  };

  const handleRemoveItem = (itemId: string) => {
    setNfeForm(prev => ({
      ...prev,
      itens: prev.itens.filter(item => item.id !== itemId)
    }));
    toast.success("Item removido com sucesso!");
  };

  const handleCalculateTotals = async () => {
    if (nfeForm.itens.length === 0) {
      toast.error("Adicione pelo menos um item antes de calcular");
      return;
    }

    if (!nfeForm.destinatario.estado) {
      toast.error("Preencha o estado do destinatário");
      return;
    }

    setIsCalculating(true);

    try {
      // Mapear regime tributário para o formato esperado pela API
      const regimeMap: Record<string, string> = {
        "Simples Nacional": "simples_nacional",
        "Lucro Presumido": "lucro_presumido",
        "Lucro Real": "lucro_real",
        "MEI": "mei"
      };

      const regime = regimeMap[emitter.regimeTributario] || "simples_nacional";
      const crt = regime === "simples_nacional" || regime === "mei" ? 1 : 3;

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/fiscal/calculos/calcular-nfe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          emitente: {
            cnpj: emitter.cnpj,
            uf: emitter.estado,
            regimeTributario: regime,
            crt: crt
          },
          destinatario: {
            documento: nfeForm.destinatario.documento,
            uf: nfeForm.destinatario.estado,
            contribuinteICMS: nfeForm.destinatario.ie ? true : false,
            consumidorFinal: true
          },
          operacao: {
            tipo: "saida",
            natureza: nfeForm.naturezaOperacao,
            finalidade: "normal",
            presenca: "nao_se_aplica"
          },
          itens: nfeForm.itens.map((item, index) => ({
            numeroItem: index + 1,
            codigoProduto: item.produtoId,
            descricao: item.descricao,
            ncm: item.ncm,
            cfop: item.cfop,
            unidadeComercial: item.unidade,
            quantidadeComercial: item.quantidade,
            valorUnitarioComercial: item.valorUnitario,
            valorTotalBruto: item.valorTotal,
            valorFrete: 0,
            valorSeguro: 0,
            valorDesconto: 0,
            valorOutrasDespesas: 0,
            origem: parseInt(item.icms.origem) as any,
            importado: false,
            icms: {
              cst: item.icms.cst,
              csosn: item.icms.csosn || undefined,
              modalidadeBC: 3,
              aliquota: item.icms.aliquota,
              reducaoBC: 0
            },
            ipi: {
              cst: item.ipi.cst,
              aliquota: item.ipi.aliquota
            },
            pis: {
              cst: item.pis.cst,
              aliquota: item.pis.aliquota
            },
            cofins: {
              cst: item.cofins.cst,
              aliquota: item.cofins.aliquota
            },
            informarTributos: false
          })),
          valorFrete: 0,
          valorSeguro: 0,
          valorDesconto: 0,
          valorOutrasDespesas: 0,
          opcoes: {
            calcularFCP: true,
            calcularLeiTransparencia: false,
            ratearFreteDesconto: false
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erro na resposta da API:', errorData);
        throw new Error(errorData.error || 'Erro ao calcular impostos');
      }

      const result = await response.json();

      if (result.success && result.data) {
        // Atualizar itens com valores calculados
        const itensAtualizados = nfeForm.itens.map((item, index) => {
          const itemCalculado = result.data.itens[index];
          return {
            ...item,
            icms: {
              ...item.icms,
              valor: itemCalculado.icms.valor,
              baseCalculo: itemCalculado.icms.baseCalculo
            },
            ipi: {
              ...item.ipi,
              valor: itemCalculado.ipi?.valor || 0,
              baseCalculo: itemCalculado.ipi?.baseCalculo || 0
            },
            pis: {
              ...item.pis,
              valor: itemCalculado.pis.valor,
              baseCalculo: itemCalculado.pis.baseCalculo
            },
            cofins: {
              ...item.cofins,
              valor: itemCalculado.cofins.valor,
              baseCalculo: itemCalculado.cofins.baseCalculo
            },
            valorTotal: itemCalculado.valorTotal
          };
        });

        setNfeForm(prev => ({
          ...prev,
          itens: itensAtualizados,
          totais: {
            valorProdutos: result.data.totais.valorProdutos,
            valorFrete: result.data.totais.valorFrete,
            valorSeguro: result.data.totais.valorSeguro,
            valorDesconto: result.data.totais.valorDesconto,
            valorOutrasDespesas: result.data.totais.valorOutrasDespesas,
            baseCalculoICMS: result.data.totais.baseCalculoICMS,
            valorICMS: result.data.totais.valorICMS,
            baseCalculoICMSST: result.data.totais.baseCalculoICMSST,
            valorICMSST: result.data.totais.valorICMSST,
            valorIPI: result.data.totais.valorIPI,
            valorPIS: result.data.totais.valorPIS,
            valorCOFINS: result.data.totais.valorCOFINS,
            valorTotal: result.data.totais.valorTotal,
          }
        }));

        toast.success("Impostos calculados com sucesso!");
      }
    } catch (error) {
      console.error('Erro ao calcular impostos:', error);
      toast.error(`Erro ao calcular impostos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!nfeForm.destinatario.documento || !nfeForm.destinatario.nome) {
      toast.error("Preencha os dados do destinatário");
      return;
    }

    if (nfeForm.itens.length === 0) {
      toast.error("Adicione pelo menos um item");
      return;
    }

    toast.success("Rascunho salvo com sucesso!");
    setIsEmissionDialogOpen(false);
  };

  const handleGenerateXml = async () => {
    if (!nfeForm.destinatario.documento || !nfeForm.destinatario.nome) {
      toast.error("Preencha os dados do destinatário");
      return;
    }

    if (nfeForm.itens.length === 0) {
      toast.error("Adicione pelo menos um item");
      return;
    }

    setIsGeneratingXml(true);

    try {
      // Aqui integraria com a API de geração de XML
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulação
      
      toast.success("XML gerado com sucesso! Download iniciado.");
      setIsEmissionDialogOpen(false);
    } catch (error) {
      console.error('Erro ao gerar XML:', error);
      toast.error("Erro ao gerar XML. Tente novamente.");
    } finally {
      setIsGeneratingXml(false);
    }
  };

  // Filtrar NFes
  const filteredNFes = useMemo(() => {
    return nfes.filter(nfe => {
      const matchesSearch = 
        nfe.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nfe.recipient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nfe.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || nfe.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [nfes, searchTerm, statusFilter]);

  // Estatísticas
  const stats = useMemo(() => {
    const authorized = nfes.filter(n => n.status === "Autorizada").length;
    const draft = nfes.filter(n => n.status === "Rascunho").length;
    const cancelled = nfes.filter(n => n.status === "Cancelada").length;
    const totalValue = nfes
      .filter(n => n.status === "Autorizada")
      .reduce((sum, n) => sum + n.totals.nfeValue, 0);

    return { authorized, draft, cancelled, totalValue };
  }, [nfes]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      "Rascunho": "bg-gray-100 text-gray-700",
      "Autorizada": "bg-green-100 text-green-700",
      "Cancelada": "bg-red-100 text-red-700",
      "Denegada": "bg-orange-100 text-orange-700",
      "Rejeitada": "bg-red-100 text-red-700"
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Autorizada":
        return <CheckCircle className="w-4 h-4" />;
      case "Cancelada":
      case "Rejeitada":
        return <XCircle className="w-4 h-4" />;
      case "Denegada":
        return <AlertCircle className="w-4 h-4" />;
      case "Rascunho":
        return <Clock className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-gray-900 mb-2">Faturamento e Integração Fiscal</h1>
            <p className="text-gray-600">Emissão de NF-e/NFC-e e configuração do SPED</p>
          </div>
        </div>
      </div>

      <Tabs value={activeMainTab} onValueChange={(v) => setActiveMainTab(v as "emissao" | "emitente")}>
        <TabsList className="mb-6">
          <TabsTrigger value="emissao" className="gap-2">
            <FileText className="w-4 h-4" />
            Emissão de Notas
          </TabsTrigger>
          <TabsTrigger value="emitente" className="gap-2">
            <Building2 className="w-4 h-4" />
            Cadastro de Emitente
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: EMISSÃO DE NOTAS */}
        <TabsContent value="emissao" className="space-y-6">
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Autorizadas</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.authorized}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gray-100 rounded-lg">
                  <Clock className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Rascunhos</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.draft}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-lg">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Canceladas</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.cancelled}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Valor Total</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    R$ {stats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-gray-900">Notas Fiscais Emitidas</h2>
              <Button 
                onClick={handleOpenEmissionDialog}
                className="bg-[rgb(32,251,225)] hover:bg-[#18CBB5] text-[rgb(0,0,0)]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Emitir NFe
              </Button>
            </div>

            <div className="flex gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por número, cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="Autorizada">Autorizada</SelectItem>
                  <SelectItem value="Rascunho">Rascunho</SelectItem>
                  <SelectItem value="Cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNFes.map((nfe) => (
                  <TableRow key={nfe.id}>
                    <TableCell>{nfe.number}</TableCell>
                    <TableCell>{new Date(nfe.issueDate).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{nfe.recipient.name}</TableCell>
                    <TableCell>R$ {nfe.totals.nfeValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(nfe.status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(nfe.status)}
                          {nfe.status}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Download className="w-4 h-4 mr-2" />
                            Baixar XML
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="w-4 h-4 mr-2" />
                            Baixar PDF
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredNFes.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Nenhuma nota fiscal encontrada
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ABA 2: CADASTRO DE EMITENTE */}
        <TabsContent value="emitente" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-gray-900 mb-1">Configuração do Emitente</h2>
                <p className="text-sm text-gray-600">Configure os dados fiscais da sua empresa</p>
              </div>
              <Button onClick={handleSaveEmitter} className="bg-[rgb(32,251,225)] hover:bg-[#18CBB5] text-[rgb(0,0,0)]">
                <Save className="w-4 h-4 mr-2" />
                Salvar Configurações
              </Button>
            </div>

            <Tabs value={activeEmitterTab} onValueChange={(v) => setActiveEmitterTab(v as any)}>
              <TabsList className="mb-6">
                <TabsTrigger value="identificacao">Identificação</TabsTrigger>
                <TabsTrigger value="nfe">NF-e</TabsTrigger>
                <TabsTrigger value="nfce">NFC-e</TabsTrigger>
                <TabsTrigger value="sped">SPED</TabsTrigger>
                <TabsTrigger value="impostos">Impostos</TabsTrigger>
              </TabsList>

              {/* SUB-ABA 1: IDENTIFICAÇÃO */}
              <TabsContent value="identificacao" className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Dados da Empresa</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>CNPJ *</Label>
                      <Input
                        value={emitter.cnpj}
                        onChange={(e) => setEmitter({...emitter, cnpj: e.target.value})}
                        placeholder="00.000.000/0000-00"
                      />
                    </div>
                    <div>
                      <Label>Inscrição Estadual *</Label>
                      <Input
                        value={emitter.inscricaoEstadual}
                        onChange={(e) => setEmitter({...emitter, inscricaoEstadual: e.target.value})}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Razão Social *</Label>
                      <Input
                        value={emitter.razaoSocial}
                        onChange={(e) => setEmitter({...emitter, razaoSocial: e.target.value})}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Nome Fantasia</Label>
                      <Input
                        value={emitter.nomeFantasia}
                        onChange={(e) => setEmitter({...emitter, nomeFantasia: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Regime Tributário *</Label>
                      <Select 
                        value={emitter.regimeTributario} 
                        onValueChange={(value: any) => setEmitter({...emitter, regimeTributario: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Simples Nacional">Simples Nacional</SelectItem>
                          <SelectItem value="Lucro Presumido">Lucro Presumido</SelectItem>
                          <SelectItem value="Lucro Real">Lucro Real</SelectItem>
                          <SelectItem value="MEI">MEI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>CNAE</Label>
                      <Input
                        value={emitter.cnae}
                        onChange={(e) => setEmitter({...emitter, cnae: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Endereço</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>CEP *</Label>
                      <Input
                        value={emitter.cep}
                        onChange={(e) => setEmitter({...emitter, cep: e.target.value})}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Logradouro *</Label>
                      <Input
                        value={emitter.logradouro}
                        onChange={(e) => setEmitter({...emitter, logradouro: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Número *</Label>
                      <Input
                        value={emitter.numero}
                        onChange={(e) => setEmitter({...emitter, numero: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Bairro *</Label>
                      <Input
                        value={emitter.bairro}
                        onChange={(e) => setEmitter({...emitter, bairro: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Complemento</Label>
                      <Input
                        value={emitter.complemento}
                        onChange={(e) => setEmitter({...emitter, complemento: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Cidade *</Label>
                      <Input
                        value={emitter.cidade}
                        onChange={(e) => setEmitter({...emitter, cidade: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Estado *</Label>
                      <Select 
                        value={emitter.estado} 
                        onValueChange={(value) => setEmitter({...emitter, estado: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BRAZILIAN_STATES.map(state => (
                            <SelectItem key={state} value={state}>{state}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* SUB-ABA 2: CONFIGURAÇÃO NF-e */}
              <TabsContent value="nfe" className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Configurações NF-e</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Ambiente</Label>
                      <Select 
                        value={emitter.nfe.ambiente} 
                        onValueChange={(value: any) => setEmitter({
                          ...emitter, 
                          nfe: {...emitter.nfe, ambiente: value}
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Homologação">Homologação</SelectItem>
                          <SelectItem value="Produção">Produção</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Série NF-e</Label>
                      <Input
                        value={emitter.nfe.serieNFe}
                        onChange={(e) => setEmitter({
                          ...emitter, 
                          nfe: {...emitter.nfe, serieNFe: e.target.value}
                        })}
                      />
                    </div>
                    <div>
                      <Label>CSC (Código de Segurança do Contribuinte)</Label>
                      <Input
                        type="password"
                        value={emitter.nfe.csc}
                        onChange={(e) => setEmitter({
                          ...emitter, 
                          nfe: {...emitter.nfe, csc: e.target.value}
                        })}
                      />
                    </div>
                    <div>
                      <Label>ID Token CSC</Label>
                      <Input
                        value={emitter.nfe.idToken}
                        onChange={(e) => setEmitter({
                          ...emitter, 
                          nfe: {...emitter.nfe, idToken: e.target.value}
                        })}
                      />
                    </div>
                  </div>
                </div>

                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertDescription>
                    <strong>Importante:</strong> O CSC é obrigatório para emissão de NF-e. Solicite na SEFAZ do seu estado.
                  </AlertDescription>
                </Alert>
              </TabsContent>

              {/* SUB-ABA 3: CONFIGURAÇÃO NFC-e */}
              <TabsContent value="nfce" className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
                  <div>
                    <Label className="text-base">Habilitar Emissão de NFC-e</Label>
                    <p className="text-xs text-gray-600 mt-1">
                      Nota Fiscal de Consumidor Eletrônica
                    </p>
                  </div>
                  <Switch
                    checked={emitter.nfce.ativo}
                    onCheckedChange={(checked) => setEmitter({
                      ...emitter,
                      nfce: {...emitter.nfce, ativo: checked}
                    })}
                  />
                </div>

                {emitter.nfce.ativo ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Ambiente</Label>
                      <Select 
                        value={emitter.nfce.ambiente} 
                        onValueChange={(value: any) => setEmitter({
                          ...emitter, 
                          nfce: {...emitter.nfce, ambiente: value}
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Homologação">Homologação</SelectItem>
                          <SelectItem value="Produção">Produção</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Série NFC-e</Label>
                      <Input
                        value={emitter.nfce.serieNFCe}
                        onChange={(e) => setEmitter({
                          ...emitter, 
                          nfce: {...emitter.nfce, serieNFCe: e.target.value}
                        })}
                      />
                    </div>
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>
                      A emissão de NFC-e está desabilitada. Ative no switch acima para configurar.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              {/* SUB-ABA 4: CONFIGURAÇÃO SPED */}
              <TabsContent value="sped" className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
                  <div>
                    <Label className="text-base">Habilitar Geração de SPED Fiscal</Label>
                    <p className="text-xs text-gray-600 mt-1">
                      Sistema Público de Escrituração Digital - EFD ICMS/IPI
                    </p>
                  </div>
                  <Switch
                    checked={emitter.sped.ativo}
                    onCheckedChange={(checked) => setEmitter({
                      ...emitter,
                      sped: {...emitter.sped, ativo: checked}
                    })}
                  />
                </div>

                {emitter.sped.ativo ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>
                        <div className="flex items-center gap-2">
                          Perfil de Apresentação
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="w-3 h-3 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">
                                  A - Completo (todas as informações)<br/>
                                  B - Resumido (sem movimentação de estoque)<br/>
                                  C - Simplificado (apenas totalizadores)
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </Label>
                      <Select 
                        value={emitter.sped.perfil} 
                        onValueChange={(value: any) => setEmitter({
                          ...emitter, 
                          sped: {...emitter.sped, perfil: value}
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">A - Completo</SelectItem>
                          <SelectItem value="B">B - Resumido</SelectItem>
                          <SelectItem value="C">C - Simplificado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Tipo de Atividade</Label>
                      <Select 
                        value={emitter.sped.tipoAtividade} 
                        onValueChange={(value: any) => setEmitter({
                          ...emitter, 
                          sped: {...emitter.sped, tipoAtividade: value}
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Industrial">Industrial</SelectItem>
                          <SelectItem value="Comercial">Comercial</SelectItem>
                          <SelectItem value="Serviços">Serviços</SelectItem>
                          <SelectItem value="Outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>
                      A geração de SPED está desabilitada. Ative no switch acima para configurar.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              {/* SUB-ABA 5: CONFIGURAÇÃO DE IMPOSTOS */}
              <TabsContent value="impostos" className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Impostos Federais</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>PIS - Alíquota Padrão (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={emitter.impostos.pis.aliquotaPadrao}
                        onChange={(e) => setEmitter({
                          ...emitter,
                          impostos: {
                            ...emitter.impostos,
                            pis: {...emitter.impostos.pis, aliquotaPadrao: parseFloat(e.target.value)}
                          }
                        })}
                      />
                    </div>
                    <div>
                      <Label>COFINS - Alíquota Padrão (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={emitter.impostos.cofins.aliquotaPadrao}
                        onChange={(e) => setEmitter({
                          ...emitter,
                          impostos: {
                            ...emitter.impostos,
                            cofins: {...emitter.impostos.cofins, aliquotaPadrao: parseFloat(e.target.value)}
                          }
                        })}
                      />
                    </div>
                    <div>
                      <Label>IPI - Alíquota Padrão (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={emitter.impostos.ipi.aliquotaPadrao}
                        onChange={(e) => setEmitter({
                          ...emitter,
                          impostos: {
                            ...emitter.impostos,
                            ipi: {...emitter.impostos.ipi, aliquotaPadrao: parseFloat(e.target.value)}
                          }
                        })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">ICMS</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Alíquota Interna (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={emitter.impostos.icms.aliquotaInterna}
                        onChange={(e) => setEmitter({
                          ...emitter,
                          impostos: {
                            ...emitter.impostos,
                            icms: {...emitter.impostos.icms, aliquotaInterna: parseFloat(e.target.value)}
                          }
                        })}
                      />
                    </div>
                    <div>
                      <Label>Estado de Origem</Label>
                      <Select 
                        value={emitter.impostos.icms.estadoOrigem} 
                        onValueChange={(value) => setEmitter({
                          ...emitter,
                          impostos: {
                            ...emitter.impostos,
                            icms: {...emitter.impostos.icms, estadoOrigem: value}
                          }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BRAZILIAN_STATES.map(state => (
                            <SelectItem key={state} value={state}>{state}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Emissão de NF-e */}
      <NFeEmissionDialog
        isOpen={isEmissionDialogOpen}
        onOpenChange={setIsEmissionDialogOpen}
        nfeForm={nfeForm}
        setNfeForm={setNfeForm}
        newItem={newItem}
        setNewItem={setNewItem}
        showAddItemDialog={showAddItemDialog}
        setShowAddItemDialog={setShowAddItemDialog}
        handleAddItem={handleAddItem}
        handleRemoveItem={handleRemoveItem}
        handleCalculateTotals={handleCalculateTotals}
        handleSaveDraft={handleSaveDraft}
        handleGenerateXml={handleGenerateXml}
        isCalculating={isCalculating}
        isGeneratingXml={isGeneratingXml}
        brazilianStates={BRAZILIAN_STATES}
        salesOrders={salesOrders}
        emitter={emitter}
      />
    </div>
  );
}