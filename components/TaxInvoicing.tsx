import { useState, useMemo } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "./ui/dropdown-menu";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Textarea } from "./ui/textarea";
import { Separator } from "./ui/separator";
import { Alert, AlertDescription } from "./ui/alert";
import { Switch } from "./ui/switch";
import { Plus, Search, FileText, Send, X, CheckCircle, XCircle, Clock, AlertCircle, Download, Printer, Copy, MoreVertical, Eye, Edit, Building2, Save, Upload, HelpCircle, Info, Calculator } from "lucide-react";
import { useERP } from "../contexts/ERPContext";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

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
  type: "55" | "65"; // 55: NFe, 65: NFCe
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
  xmlUrl?: string;
  pdfUrl?: string;
}

// Interface para configuração do Emitente
interface TaxEmitter {
  id: string;
  // Identificação
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  suframa: string;
  regimeTributario: "Simples Nacional" | "Lucro Presumido" | "Lucro Real" | "MEI";
  cnae: string;
  tokenIBPT: string;
  
  // Endereço
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  codigoMunicipio: string;
  
  // Contato
  telefone: string;
  email: string;
  
  // Certificado Digital
  certificadoArquivo: string;
  certificadoSenha: string;
  certificadoValidade: string;
  
  // Configuração NF-e
  nfe: {
    ambiente: "Produção" | "Homologação";
    serieNFe: string;
    numeroAtualNFe: number;
    naturezaOperacaoPadrao: string;
    cfopPadrao: string;
    tipoOperacaoPadrao: "Entrada" | "Saída";
    emailCopia: string;
    informacoesComplementares: string;
    
    // Substituição Tributária
    substituicaoTributaria: {
      ativo: boolean;
      ufDestino: string;
      inscricaoEstadualST: string;
    };
  };
  
  // Configuração NFC-e
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
  
  // Configuração SPED
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
  
  // Configuração de Impostos
  impostos: {
    // Impostos Federais
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
    
    // ICMS
    icms: {
      aliquotaInterna: number;
      estadoOrigem: string;
      // Tabela de alíquotas interestaduais por UF
      aliquotasInterestaduais: {
        [uf: string]: {
          aliquota: number;
          fcp: number; // Fundo de Combate à Pobreza
        };
      };
    };
    
    // Retenções
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

// Tabelas fiscais
const CFOP_TABLE = [
  { code: "5.101", description: "Venda de produção do estabelecimento", type: "Saída" },
  { code: "5.102", description: "Venda de mercadoria adquirida ou recebida de terceiros", type: "Saída" },
  { code: "5.103", description: "Venda de produção do estabelecimento, efetuada fora do estabelecimento", type: "Saída" },
  { code: "5.104", description: "Venda de mercadoria adquirida ou recebida de terceiros, efetuada fora do estabelecimento", type: "Saída" },
  { code: "5.401", description: "Venda de produção do estabelecimento em operação com produto sujeito ao regime de substituição tributária", type: "Saída" },
  { code: "5.403", description: "Venda de mercadoria adquirida ou recebida de terceiros em operação com mercadoria sujeita ao regime de substituição tributária", type: "Saída" },
  { code: "6.101", description: "Venda de produção do estabelecimento - Interestadual", type: "Saída" },
  { code: "6.102", description: "Venda de mercadoria adquirida ou recebida de terceiros - Interestadual", type: "Saída" },
  { code: "1.101", description: "Compra para industrialização ou produção rural", type: "Entrada" },
  { code: "1.102", description: "Compra para comercialização", type: "Entrada" },
  { code: "2.101", description: "Compra para industrialização ou produção rural - Interestadual", type: "Entrada" },
  { code: "2.102", description: "Compra para comercialização - Interestadual", type: "Entrada" },
];

const TAX_REGIMES = [
  { value: "Simples Nacional", label: "Simples Nacional" },
  { value: "Lucro Presumido", label: "Lucro Presumido" },
  { value: "Lucro Real", label: "Lucro Real" },
  { value: "MEI", label: "MEI - Microempreendedor Individual" },
];

export function TaxInvoicing() {
  const { salesOrders, customers, inventory, companySettings } = useERP();
  const [activeMainTab, setActiveMainTab] = useState<"emissao" | "emitente">("emissao");
  const [activeEmitterTab, setActiveEmitterTab] = useState<"identificacao" | "nfe" | "nfce" | "sped" | "impostos">("identificacao");
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedNFe, setSelectedNFe] = useState<NFe | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

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

  // Estado do formulário de NFe
  const [nfeForm, setNfeForm] = useState<{
    salesOrderId: string;
    type: "55" | "65";
    series: string;
    taxRegime: string;
    naturezaOperacao: string;
    additionalInfo: string;
  }>({
    salesOrderId: "",
    type: "55",
    series: "1",
    taxRegime: "Simples Nacional",
    naturezaOperacao: "Venda de mercadoria adquirida ou recebida de terceiros",
    additionalInfo: ""
  });

  const [nfeItems, setNfeItems] = useState<NFeTaxItem[]>([]);

  // Mock de NFes
  const [nfes, setNfes] = useState<NFe[]>([
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
        fantasyName: companySettings?.generalData?.tradeName || companySettings?.generalData?.companyName || "Empresa Exemplo",
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

  const handleLoadSalesOrder = () => {
    if (!nfeForm.salesOrderId) {
      toast.error("Selecione um pedido de venda");
      return;
    }

    const order = salesOrders.find(o => o.id === nfeForm.salesOrderId);
    if (!order) {
      toast.error("Pedido não encontrado");
      return;
    }

    const customer = customers.find(c => c.id === order.customerId);
    if (!customer) {
      toast.error("Cliente não encontrado");
      return;
    }

    const companyState = companySettings?.generalData?.state || "SP";
    const newItem: NFeTaxItem = {
      productId: order.productName,
      productName: order.productName,
      ncm: "00000000",
      cfop: customer.state === companyState ? "5.102" : "6.102",
      cst: "00",
      csosn: "102",
      quantity: order.quantity,
      unitValue: order.unitPrice,
      totalValue: order.totalAmount,
      icmsRate: nfeForm.taxRegime === "Simples Nacional" ? 0 : 18,
      icmsValue: nfeForm.taxRegime === "Simples Nacional" ? 0 : order.totalAmount * 0.18,
      ipiRate: 0,
      ipiValue: 0,
      pisRate: 1.65,
      pisValue: order.totalAmount * 0.0165,
      cofinsRate: 7.6,
      cofinsValue: order.totalAmount * 0.076
    };

    setNfeItems([newItem]);
    toast.success("Dados do pedido carregados com sucesso");
  };

  const calculateTotals = () => {
    const productsValue = nfeItems.reduce((sum, item) => sum + item.totalValue, 0);
    const icmsValue = nfeItems.reduce((sum, item) => sum + item.icmsValue, 0);
    const ipiValue = nfeItems.reduce((sum, item) => sum + item.ipiValue, 0);
    const pisValue = nfeItems.reduce((sum, item) => sum + item.pisValue, 0);
    const cofinsValue = nfeItems.reduce((sum, item) => sum + item.cofinsValue, 0);
    const nfeValue = productsValue + ipiValue;

    return {
      productsValue,
      icmsValue,
      ipiValue,
      pisValue,
      cofinsValue,
      nfeValue
    };
  };

  const handleEmitNFe = () => {
    if (!nfeForm.salesOrderId) {
      toast.error("Selecione um pedido de venda");
      return;
    }

    if (nfeItems.length === 0) {
      toast.error("Adicione pelo menos um item à NFe");
      return;
    }

    const order = salesOrders.find(o => o.id === nfeForm.salesOrderId);
    if (!order) return;

    const customer = customers.find(c => c.id === order.customerId);
    if (!customer) return;

    const totals = calculateTotals();

    const newNFe: NFe = {
      id: `NFE-${String(nfes.length + 1).padStart(3, '0')}`,
      number: String(nfes.length + 1).padStart(6, '0'),
      series: nfeForm.series,
      type: nfeForm.type,
      status: "Rascunho",
      salesOrderId: nfeForm.salesOrderId,
      issueDate: new Date().toISOString().split('T')[0],
      emitter: {
        cnpj: emitter.cnpj || "00.000.000/0000-00",
        name: emitter.razaoSocial || "Empresa Exemplo",
        fantasyName: emitter.nomeFantasia || emitter.razaoSocial || "Empresa Exemplo",
        ie: emitter.inscricaoEstadual || "000.000.000.000",
        address: `${emitter.logradouro}, ${emitter.numero}`,
        city: emitter.cidade || "São Paulo",
        state: emitter.estado || "SP",
        cep: emitter.cep || "00000-000"
      },
      recipient: {
        document: customer.document,
        name: customer.company || customer.name,
        ie: customer.stateRegistration,
        address: customer.address,
        city: customer.city,
        state: customer.state,
        cep: customer.zipCode
      },
      items: nfeItems,
      totals,
      taxRegime: nfeForm.taxRegime as any,
      naturezaOperacao: nfeForm.naturezaOperacao,
      additionalInfo: nfeForm.additionalInfo
    };

    setNfes([...nfes, newNFe]);
    
    setNfeForm({
      salesOrderId: "",
      type: "55",
      series: "1",
      taxRegime: "Simples Nacional",
      naturezaOperacao: "Venda de mercadoria adquirida ou recebida de terceiros",
      additionalInfo: ""
    });
    setNfeItems([]);
    setIsDialogOpen(false);

    toast.success(`NFe ${newNFe.number} criada com sucesso!`);
  };

  const handleTransmitNFe = (nfeId: string) => {
    const nfe = nfes.find(n => n.id === nfeId);
    if (!nfe) return;

    if (nfe.status !== "Rascunho") {
      toast.error("Apenas NFes em rascunho podem ser transmitidas");
      return;
    }

    const cnpj = emitter.cnpj || "00000000000000";
    const updatedNfes = nfes.map(n => {
      if (n.id === nfeId) {
        return {
          ...n,
          status: "Autorizada" as const,
          accessKey: `35${new Date().getFullYear()}${cnpj.replace(/\D/g, '')}55001${n.number}${Math.random().toString().substr(2, 10)}`,
          protocol: `135${new Date().getFullYear()}${Math.random().toString().substr(2, 10)}`
        };
      }
      return n;
    });

    setNfes(updatedNfes);
    toast.success("NFe autorizada com sucesso!");
  };

  const handleCancelNFe = (nfeId: string) => {
    const nfe = nfes.find(n => n.id === nfeId);
    if (!nfe) return;

    if (nfe.status !== "Autorizada") {
      toast.error("Apenas NFes autorizadas podem ser canceladas");
      return;
    }

    const updatedNfes = nfes.map(n => {
      if (n.id === nfeId) {
        return { ...n, status: "Cancelada" as const };
      }
      return n;
    });

    setNfes(updatedNfes);
    toast.success("NFe cancelada com sucesso!");
  };

  const handleViewNFe = (nfe: NFe) => {
    setSelectedNFe(nfe);
    setIsViewDialogOpen(true);
  };

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

      {/* Tabs Principais: Emissão e Emitente */}
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
          <div className="flex items-center justify-between">
            <div className="grid grid-cols-4 gap-4 flex-1 mr-4">
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

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[rgb(32,251,225)] hover:bg-[#18CBB5] text-[rgb(0,0,0)]">
                  <Plus className="w-4 h-4 mr-2" />
                  Emitir NFe
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Emitir Nota Fiscal Eletrônica (NFe)</DialogTitle>
                  <DialogDescription>
                    Preencha os dados da nota fiscal para emissão
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Pedido de Venda *</Label>
                      <div className="flex gap-2">
                        <Select 
                          value={nfeForm.salesOrderId} 
                          onValueChange={(value) => setNfeForm({...nfeForm, salesOrderId: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o pedido" />
                          </SelectTrigger>
                          <SelectContent>
                            {salesOrders
                              .filter(o => o.status === "Entregue" || o.status === "Concluído")
                              .map((order) => (
                                <SelectItem key={order.id} value={order.id}>
                                  {order.id} - {order.customer} - R$ {order.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          onClick={handleLoadSalesOrder}
                          variant="outline"
                        >
                          Carregar
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label>Tipo de Nota</Label>
                      <Select 
                        value={nfeForm.type} 
                        onValueChange={(value: "55" | "65") => setNfeForm({...nfeForm, type: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="55">NFe (Modelo 55)</SelectItem>
                          <SelectItem value="65">NFCe (Modelo 65)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Série</Label>
                      <Input
                        value={nfeForm.series}
                        onChange={(e) => setNfeForm({...nfeForm, series: e.target.value})}
                        placeholder="1"
                      />
                    </div>

                    <div>
                      <Label>Regime Tributário</Label>
                      <Select 
                        value={nfeForm.taxRegime} 
                        onValueChange={(value) => setNfeForm({...nfeForm, taxRegime: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TAX_REGIMES.map(regime => (
                            <SelectItem key={regime.value} value={regime.value}>
                              {regime.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Natureza da Operação</Label>
                      <Input
                        value={nfeForm.naturezaOperacao}
                        onChange={(e) => setNfeForm({...nfeForm, naturezaOperacao: e.target.value})}
                        placeholder="Venda de mercadoria"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Informações Complementares</Label>
                    <Textarea
                      value={nfeForm.additionalInfo}
                      onChange={(e) => setNfeForm({...nfeForm, additionalInfo: e.target.value})}
                      placeholder="Informações adicionais sobre a nota fiscal..."
                      rows={3}
                    />
                  </div>

                  <Alert>
                    <Info className="w-4 h-4" />
                    <AlertDescription>
                      <strong>Códigos Fiscais:</strong> CFOP define a natureza da operação, CST/CSOSN indica a situação tributária do ICMS. Utilize CSOSN para empresas no Simples Nacional e CST para demais regimes tributários.
                    </AlertDescription>
                  </Alert>

                  {nfeItems.length > 0 && (
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">Itens da NFe</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produto</TableHead>
                            <TableHead>Qtd</TableHead>
                            <TableHead>Valor Unit.</TableHead>
                            <TableHead>Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {nfeItems.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{item.productName}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>R$ {item.unitValue.toFixed(2)}</TableCell>
                              <TableCell>R$ {item.totalValue.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="mt-4 flex justify-end">
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Valor Total</p>
                          <p className="text-xl font-semibold text-gray-900">
                            R$ {calculateTotals().nfeValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleEmitNFe}>
                      Gerar NFe
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Alert className="bg-blue-50 border-blue-200">
            <Info className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong className="font-semibold">Códigos Fiscais:</strong> CFOP define a natureza da operação, CST/CSOSN indica a situação tributária do ICMS. Utilize CSOSN para empresas no Simples Nacional e CST para demais regimes tributários.
            </AlertDescription>
          </Alert>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Pesquisar por número, cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="Rascunho">Rascunho</SelectItem>
                    <SelectItem value="Autorizada">Autorizada</SelectItem>
                    <SelectItem value="Cancelada">Cancelada</SelectItem>
                    <SelectItem value="Denegada">Denegada</SelectItem>
                    <SelectItem value="Rejeitada">Rejeitada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ações</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Série</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data de Emissão</TableHead>
                  <TableHead>Destinatário</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Pedido de Venda</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNFes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      Nenhuma nota fiscal encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredNFes.map((nfe) => (
                    <TableRow key={nfe.id}>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleViewNFe(nfe)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Visualizar
                            </DropdownMenuItem>
                            {nfe.status === "Rascunho" && (
                              <DropdownMenuItem onClick={() => handleTransmitNFe(nfe.id)}>
                                <Send className="w-4 h-4 mr-2" />
                                Transmitir
                              </DropdownMenuItem>
                            )}
                            {nfe.status === "Autorizada" && (
                              <>
                                <DropdownMenuItem>
                                  <Download className="w-4 h-4 mr-2" />
                                  Download XML
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Printer className="w-4 h-4 mr-2" />
                                  Imprimir DANFE
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCancelNFe(nfe.id)}>
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Cancelar NFe
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell className="font-mono">{nfe.number}</TableCell>
                      <TableCell>{nfe.series}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {nfe.type === "55" ? "NFe" : "NFCe"}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(nfe.issueDate).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{nfe.recipient.name}</TableCell>
                      <TableCell>R$ {nfe.totals.nfeValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>{nfe.salesOrderId || "-"}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(nfe.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(nfe.status)}
                            {nfe.status}
                          </div>
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ABA 2: CADASTRO DE EMITENTE */}
        <TabsContent value="emitente" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Configuração do Emitente</h2>
                <p className="text-sm text-gray-600">Configure os dados fiscais da sua empresa para emissão de notas</p>
              </div>
              <Button onClick={handleSaveEmitter} className="gap-2">
                <Save className="w-4 h-4" />
                Salvar Configurações
              </Button>
            </div>

            <Tabs value={activeEmitterTab} onValueChange={(v) => setActiveEmitterTab(v as any)}>
              <TabsList className="grid w-full grid-cols-5 mb-6">
                <TabsTrigger value="identificacao">Identificação</TabsTrigger>
                <TabsTrigger value="nfe">Configuração NF-e</TabsTrigger>
                <TabsTrigger value="nfce">Configuração NFC-e</TabsTrigger>
                <TabsTrigger value="sped">Configuração SPED</TabsTrigger>
                <TabsTrigger value="impostos" className="gap-2">
                  <Calculator className="w-4 h-4" />
                  Impostos
                </TabsTrigger>
              </TabsList>

              {/* SUB-ABA 1: IDENTIFICAÇÃO */}
              <TabsContent value="identificacao" className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Dados Cadastrais</h3>
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
                      <Label>Razão Social *</Label>
                      <Input
                        value={emitter.razaoSocial}
                        onChange={(e) => setEmitter({...emitter, razaoSocial: e.target.value})}
                        placeholder="Nome da empresa"
                      />
                    </div>

                    <div>
                      <Label>Nome Fantasia</Label>
                      <Input
                        value={emitter.nomeFantasia}
                        onChange={(e) => setEmitter({...emitter, nomeFantasia: e.target.value})}
                        placeholder="Nome fantasia"
                      />
                    </div>

                    <div>
                      <Label>Inscrição Estadual *</Label>
                      <Input
                        value={emitter.inscricaoEstadual}
                        onChange={(e) => setEmitter({...emitter, inscricaoEstadual: e.target.value})}
                        placeholder="000.000.000.000"
                      />
                    </div>

                    <div>
                      <Label>Inscrição Municipal</Label>
                      <Input
                        value={emitter.inscricaoMunicipal}
                        onChange={(e) => setEmitter({...emitter, inscricaoMunicipal: e.target.value})}
                        placeholder="Inscrição municipal"
                      />
                    </div>

                    <div>
                      <Label>
                        <div className="flex items-center gap-2">
                          SUFRAMA
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="w-3 h-3 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Superintendência da Zona Franca de Manaus. Necessário apenas para empresas da Zona Franca.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </Label>
                      <Input
                        value={emitter.suframa}
                        onChange={(e) => setEmitter({...emitter, suframa: e.target.value})}
                        placeholder="Código SUFRAMA (opcional)"
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
                          {TAX_REGIMES.map(regime => (
                            <SelectItem key={regime.value} value={regime.value}>
                              {regime.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>
                        <div className="flex items-center gap-2">
                          CNAE
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="w-3 h-3 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Classificação Nacional de Atividades Econômicas. Ex: 4711-3/01 - Comércio varejista</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </Label>
                      <Input
                        value={emitter.cnae}
                        onChange={(e) => setEmitter({...emitter, cnae: e.target.value})}
                        placeholder="0000-0/00"
                      />
                    </div>

                    <div className="col-span-2">
                      <Label>
                        <div className="flex items-center gap-2">
                          Token IBPT
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="w-3 h-3 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Token para cálculo de tributos aproximados (Lei da Transparência). Obtenha em ibpt.com.br</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </Label>
                      <Input
                        value={emitter.tokenIBPT}
                        onChange={(e) => setEmitter({...emitter, tokenIBPT: e.target.value})}
                        placeholder="Token para cálculo de tributos"
                        type="password"
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
                        placeholder="00000-000"
                      />
                    </div>

                    <div className="col-span-2">
                      <Label>Logradouro *</Label>
                      <Input
                        value={emitter.logradouro}
                        onChange={(e) => setEmitter({...emitter, logradouro: e.target.value})}
                        placeholder="Rua, Avenida, etc."
                      />
                    </div>

                    <div>
                      <Label>Número *</Label>
                      <Input
                        value={emitter.numero}
                        onChange={(e) => setEmitter({...emitter, numero: e.target.value})}
                        placeholder="123"
                      />
                    </div>

                    <div>
                      <Label>Complemento</Label>
                      <Input
                        value={emitter.complemento}
                        onChange={(e) => setEmitter({...emitter, complemento: e.target.value})}
                        placeholder="Sala, Andar, etc."
                      />
                    </div>

                    <div>
                      <Label>Bairro *</Label>
                      <Input
                        value={emitter.bairro}
                        onChange={(e) => setEmitter({...emitter, bairro: e.target.value})}
                        placeholder="Centro"
                      />
                    </div>

                    <div>
                      <Label>Cidade *</Label>
                      <Input
                        value={emitter.cidade}
                        onChange={(e) => setEmitter({...emitter, cidade: e.target.value})}
                        placeholder="São Paulo"
                      />
                    </div>

                    <div>
                      <Label>Estado (UF) *</Label>
                      <Select 
                        value={emitter.estado} 
                        onValueChange={(value) => setEmitter({...emitter, estado: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {BRAZILIAN_STATES.map(state => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Código do Município (IBGE)</Label>
                      <Input
                        value={emitter.codigoMunicipio}
                        onChange={(e) => setEmitter({...emitter, codigoMunicipio: e.target.value})}
                        placeholder="3550308"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Contato</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Telefone</Label>
                      <Input
                        value={emitter.telefone}
                        onChange={(e) => setEmitter({...emitter, telefone: e.target.value})}
                        placeholder="(11) 98765-4321"
                      />
                    </div>

                    <div>
                      <Label>E-mail</Label>
                      <Input
                        value={emitter.email}
                        onChange={(e) => setEmitter({...emitter, email: e.target.value})}
                        placeholder="contato@empresa.com.br"
                        type="email"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Certificado Digital (A1)</h3>
                  <Alert className="mb-4">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>
                      O certificado digital é obrigatório para emissão de NF-e. Utilize certificado A1 (arquivo .pfx) válido.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Arquivo do Certificado (.pfx)</Label>
                      <div className="flex gap-2">
                        <Input
                          value={emitter.certificadoArquivo}
                          onChange={(e) => setEmitter({...emitter, certificadoArquivo: e.target.value})}
                          placeholder="Certificado não carregado"
                          readOnly
                          className="flex-1"
                        />
                        <Button variant="outline" className="gap-2">
                          <Upload className="w-4 h-4" />
                          Upload
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label>Senha do Certificado</Label>
                      <Input
                        value={emitter.certificadoSenha}
                        onChange={(e) => setEmitter({...emitter, certificadoSenha: e.target.value})}
                        placeholder="Senha do certificado"
                        type="password"
                      />
                    </div>

                    <div>
                      <Label>Validade do Certificado</Label>
                      <Input
                        value={emitter.certificadoValidade}
                        onChange={(e) => setEmitter({...emitter, certificadoValidade: e.target.value})}
                        type="date"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* SUB-ABA 2: CONFIGURAÇÃO NF-E */}
              <TabsContent value="nfe" className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Configurações Gerais da NF-e</h3>
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
                          <SelectItem value="Homologação">Homologação (Testes)</SelectItem>
                          <SelectItem value="Produção">Produção</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        Use Homologação para testes e Produção para notas reais
                      </p>
                    </div>

                    <div>
                      <Label>Série da NF-e</Label>
                      <Input
                        value={emitter.nfe.serieNFe}
                        onChange={(e) => setEmitter({
                          ...emitter, 
                          nfe: {...emitter.nfe, serieNFe: e.target.value}
                        })}
                        placeholder="1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Número de série da NF-e (geralmente 1)
                      </p>
                    </div>

                    <div>
                      <Label>Número Atual da NF-e</Label>
                      <Input
                        type="number"
                        value={emitter.nfe.numeroAtualNFe}
                        onChange={(e) => setEmitter({
                          ...emitter, 
                          nfe: {...emitter.nfe, numeroAtualNFe: parseInt(e.target.value) || 1}
                        })}
                        placeholder="1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Próximo número de NF-e a ser emitida
                      </p>
                    </div>

                    <div>
                      <Label>Tipo de Operação Padrão</Label>
                      <Select 
                        value={emitter.nfe.tipoOperacaoPadrao} 
                        onValueChange={(value: any) => setEmitter({
                          ...emitter, 
                          nfe: {...emitter.nfe, tipoOperacaoPadrao: value}
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Saída">Saída (Venda)</SelectItem>
                          <SelectItem value="Entrada">Entrada (Compra)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2">
                      <Label>Natureza da Operação Padrão</Label>
                      <Input
                        value={emitter.nfe.naturezaOperacaoPadrao}
                        onChange={(e) => setEmitter({
                          ...emitter, 
                          nfe: {...emitter.nfe, naturezaOperacaoPadrao: e.target.value}
                        })}
                        placeholder="Venda de mercadoria adquirida ou recebida de terceiros"
                      />
                    </div>

                    <div>
                      <Label>CFOP Padrão</Label>
                      <Select 
                        value={emitter.nfe.cfopPadrao} 
                        onValueChange={(value) => setEmitter({
                          ...emitter, 
                          nfe: {...emitter.nfe, cfopPadrao: value}
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CFOP_TABLE.map(cfop => (
                            <SelectItem key={cfop.code} value={cfop.code}>
                              {cfop.code} - {cfop.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>E-mail para Cópia da NF-e</Label>
                      <Input
                        value={emitter.nfe.emailCopia}
                        onChange={(e) => setEmitter({
                          ...emitter, 
                          nfe: {...emitter.nfe, emailCopia: e.target.value}
                        })}
                        placeholder="nfe@empresa.com.br"
                        type="email"
                      />
                    </div>

                    <div className="col-span-2">
                      <Label>Informações Complementares Padrão</Label>
                      <Textarea
                        value={emitter.nfe.informacoesComplementares}
                        onChange={(e) => setEmitter({
                          ...emitter, 
                          nfe: {...emitter.nfe, informacoesComplementares: e.target.value}
                        })}
                        placeholder="Informações que aparecerão em todas as NF-e..."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Substituição Tributária</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Habilitar Substituição Tributária</Label>
                        <p className="text-xs text-gray-500">
                          Ative se sua empresa realiza operações com ST
                        </p>
                      </div>
                      <Switch
                        checked={emitter.nfe.substituicaoTributaria.ativo}
                        onCheckedChange={(checked) => setEmitter({
                          ...emitter,
                          nfe: {
                            ...emitter.nfe,
                            substituicaoTributaria: {
                              ...emitter.nfe.substituicaoTributaria,
                              ativo: checked
                            }
                          }
                        })}
                      />
                    </div>

                    {emitter.nfe.substituicaoTributaria.ativo && (
                      <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                        <div>
                          <Label>UF de Destino</Label>
                          <Select 
                            value={emitter.nfe.substituicaoTributaria.ufDestino} 
                            onValueChange={(value) => setEmitter({
                              ...emitter,
                              nfe: {
                                ...emitter.nfe,
                                substituicaoTributaria: {
                                  ...emitter.nfe.substituicaoTributaria,
                                  ufDestino: value
                                }
                              }
                            })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {BRAZILIAN_STATES.map(state => (
                                <SelectItem key={state} value={state}>
                                  {state}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Inscrição Estadual do Substituto Tributário</Label>
                          <Input
                            value={emitter.nfe.substituicaoTributaria.inscricaoEstadualST}
                            onChange={(e) => setEmitter({
                              ...emitter,
                              nfe: {
                                ...emitter.nfe,
                                substituicaoTributaria: {
                                  ...emitter.nfe.substituicaoTributaria,
                                  inscricaoEstadualST: e.target.value
                                }
                              }
                            })}
                            placeholder="000.000.000.000"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* SUB-ABA 3: CONFIGURAÇÃO NFC-E */}
              <TabsContent value="nfce" className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
                  <div>
                    <Label className="text-base">Habilitar Emissão de NFC-e</Label>
                    <p className="text-xs text-gray-600 mt-1">
                      Nota Fiscal de Consumidor Eletrônica para operações de varejo (PDV)
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
                  <>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Configurações Gerais da NFC-e</h3>
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
                              <SelectItem value="Homologação">Homologação (Testes)</SelectItem>
                              <SelectItem value="Produção">Produção</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Série da NFC-e</Label>
                          <Input
                            value={emitter.nfce.serieNFCe}
                            onChange={(e) => setEmitter({
                              ...emitter, 
                              nfce: {...emitter.nfce, serieNFCe: e.target.value}
                            })}
                            placeholder="1"
                          />
                        </div>

                        <div>
                          <Label>Número Atual da NFC-e</Label>
                          <Input
                            type="number"
                            value={emitter.nfce.numeroAtualNFCe}
                            onChange={(e) => setEmitter({
                              ...emitter, 
                              nfce: {...emitter.nfce, numeroAtualNFCe: parseInt(e.target.value) || 1}
                            })}
                            placeholder="1"
                          />
                        </div>

                        <div>
                          <Label>E-mail para Cópia</Label>
                          <Input
                            value={emitter.nfce.emailCopia}
                            onChange={(e) => setEmitter({
                              ...emitter, 
                              nfce: {...emitter.nfce, emailCopia: e.target.value}
                            })}
                            placeholder="nfce@empresa.com.br"
                            type="email"
                          />
                        </div>

                        <div className="col-span-2">
                          <Label>
                            <div className="flex items-center gap-2">
                              CSC (Código de Segurança do Contribuinte)
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <HelpCircle className="w-3 h-3 text-gray-400" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">Código fornecido pela SEFAZ para geração do QR Code da NFC-e. Obrigatório para emissão.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </Label>
                          <Input
                            value={emitter.nfce.csc}
                            onChange={(e) => setEmitter({
                              ...emitter, 
                              nfce: {...emitter.nfce, csc: e.target.value}
                            })}
                            placeholder="CSC fornecido pela SEFAZ"
                            type="password"
                          />
                        </div>

                        <div className="col-span-2">
                          <Label>
                            <div className="flex items-center gap-2">
                              ID Token CSC
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <HelpCircle className="w-3 h-3 text-gray-400" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">Identificador do token CSC (geralmente "1" ou "2"). Fornecido pela SEFAZ junto com o CSC.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </Label>
                          <Input
                            value={emitter.nfce.idToken}
                            onChange={(e) => setEmitter({
                              ...emitter, 
                              nfce: {...emitter.nfce, idToken: e.target.value}
                            })}
                            placeholder="ID Token (1 ou 2)"
                          />
                        </div>

                        <div className="col-span-2">
                          <Label>Informações Complementares Padrão</Label>
                          <Textarea
                            value={emitter.nfce.informacoesComplementares}
                            onChange={(e) => setEmitter({
                              ...emitter, 
                              nfce: {...emitter.nfce, informacoesComplementares: e.target.value}
                            })}
                            placeholder="Informações que aparecerão em todas as NFC-e..."
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>

                    <Alert>
                      <Info className="w-4 h-4" />
                      <AlertDescription>
                        <strong>Importante:</strong> Para emitir NFC-e, você precisa solicitar o CSC e ID Token na SEFAZ do seu estado. Acesse o portal da SEFAZ e procure por "Solicitar CSC NFC-e".
                      </AlertDescription>
                    </Alert>
                  </>
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
                  <>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Configurações do SPED</h3>
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

                        <div className="col-span-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label>Gerar Inventário Mensal</Label>
                              <p className="text-xs text-gray-500">
                                Obrigatório para algumas atividades
                              </p>
                            </div>
                            <Switch
                              checked={emitter.sped.inventarioMensal}
                              onCheckedChange={(checked) => setEmitter({
                                ...emitter,
                                sped: {...emitter.sped, inventarioMensal: checked}
                              })}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Blocos a Gerar</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <Label>Bloco K - Controle de Produção e Estoque</Label>
                            <p className="text-xs text-gray-500">
                              Movimentação de estoque item a item (obrigatório para indústrias)
                            </p>
                          </div>
                          <Switch
                            checked={emitter.sped.gerarBloco.blocoK}
                            onCheckedChange={(checked) => setEmitter({
                              ...emitter,
                              sped: {
                                ...emitter.sped,
                                gerarBloco: {...emitter.sped.gerarBloco, blocoK: checked}
                              }
                            })}
                          />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <Label>Bloco H - Inventário Físico</Label>
                            <p className="text-xs text-gray-500">
                              Inventário de mercadorias (obrigatório para comércio)
                            </p>
                          </div>
                          <Switch
                            checked={emitter.sped.gerarBloco.blocoH}
                            onCheckedChange={(checked) => setEmitter({
                              ...emitter,
                              sped: {
                                ...emitter.sped,
                                gerarBloco: {...emitter.sped.gerarBloco, blocoH: checked}
                              }
                            })}
                          />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <Label>Bloco 1 - Outras Informações</Label>
                            <p className="text-xs text-gray-500">
                              Informações complementares e específicas
                            </p>
                          </div>
                          <Switch
                            checked={emitter.sped.gerarBloco.bloco1}
                            onCheckedChange={(checked) => setEmitter({
                              ...emitter,
                              sped: {
                                ...emitter.sped,
                                gerarBloco: {...emitter.sped.gerarBloco, bloco1: checked}
                              }
                            })}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label>Informações Complementares</Label>
                      <Textarea
                        value={emitter.sped.informacoesComplementares}
                        onChange={(e) => setEmitter({
                          ...emitter, 
                          sped: {...emitter.sped, informacoesComplementares: e.target.value}
                        })}
                        placeholder="Observações sobre o SPED..."
                        rows={3}
                      />
                    </div>

                    <Alert>
                      <Info className="w-4 h-4" />
                      <AlertDescription>
                        <strong>Importante:</strong> A geração do SPED deve ser feita mensalmente e enviada via PVA (Programa Validador e Assinador) da Receita Federal. O sistema gerará o arquivo .txt conforme layout oficial.
                      </AlertDescription>
                    </Alert>
                  </>
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
                <Alert className="bg-blue-50 border-blue-200">
                  <Info className="w-4 h-4 text-blue-600" />
                  <AlertDescription className="text-blue-900">
                    Configure as alíquotas de impostos que serão aplicadas por padrão na emissão de notas fiscais. Essas configurações podem ser ajustadas individualmente em cada nota.
                  </AlertDescription>
                </Alert>

                {/* IMPOSTOS FEDERAIS */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Impostos Federais</h3>
                  <div className="grid grid-cols-3 gap-6">
                    {/* PIS */}
                    <Card className="p-4">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-1">PIS</h4>
                          <p className="text-xs text-gray-500">Programa de Integração Social</p>
                        </div>
                        
                        <div>
                          <Label>Alíquota Padrão (%)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={emitter.impostos.pis.aliquotaPadrao}
                            onChange={(e) => setEmitter({
                              ...emitter,
                              impostos: {
                                ...emitter.impostos,
                                pis: {
                                  ...emitter.impostos.pis,
                                  aliquotaPadrao: parseFloat(e.target.value) || 0
                                }
                              }
                            })}
                            placeholder="0.65"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Cumulativo: 0,65% | Não-Cumulativo: 1,65%
                          </p>
                        </div>

                        <div>
                          <Label>Regime</Label>
                          <Select
                            value={emitter.impostos.pis.regime}
                            onValueChange={(value: any) => setEmitter({
                              ...emitter,
                              impostos: {
                                ...emitter.impostos,
                                pis: {
                                  ...emitter.impostos.pis,
                                  regime: value
                                }
                              }
                            })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Cumulativo">Cumulativo</SelectItem>
                              <SelectItem value="Não-Cumulativo">Não-Cumulativo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </Card>

                    {/* COFINS */}
                    <Card className="p-4">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-1">COFINS</h4>
                          <p className="text-xs text-gray-500">Contribuição para Financiamento da Seguridade Social</p>
                        </div>
                        
                        <div>
                          <Label>Alíquota Padrão (%)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={emitter.impostos.cofins.aliquotaPadrao}
                            onChange={(e) => setEmitter({
                              ...emitter,
                              impostos: {
                                ...emitter.impostos,
                                cofins: {
                                  ...emitter.impostos.cofins,
                                  aliquotaPadrao: parseFloat(e.target.value) || 0
                                }
                              }
                            })}
                            placeholder="3.0"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Cumulativo: 3,0% | Não-Cumulativo: 7,6%
                          </p>
                        </div>

                        <div>
                          <Label>Regime</Label>
                          <Select
                            value={emitter.impostos.cofins.regime}
                            onValueChange={(value: any) => setEmitter({
                              ...emitter,
                              impostos: {
                                ...emitter.impostos,
                                cofins: {
                                  ...emitter.impostos.cofins,
                                  regime: value
                                }
                              }
                            })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Cumulativo">Cumulativo</SelectItem>
                              <SelectItem value="Não-Cumulativo">Não-Cumulativo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </Card>

                    {/* IPI */}
                    <Card className="p-4">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-1">IPI</h4>
                          <p className="text-xs text-gray-500">Imposto sobre Produtos Industrializados</p>
                        </div>
                        
                        <div>
                          <Label>Alíquota Padrão (%)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={emitter.impostos.ipi.aliquotaPadrao}
                            onChange={(e) => setEmitter({
                              ...emitter,
                              impostos: {
                                ...emitter.impostos,
                                ipi: {
                                  ...emitter.impostos.ipi,
                                  aliquotaPadrao: parseFloat(e.target.value) || 0
                                }
                              }
                            })}
                            placeholder="0"
                            disabled={!emitter.impostos.ipi.aplicavel}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Varia conforme NCM do produto
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <div>
                            <Label>IPI Aplicável</Label>
                            <p className="text-xs text-gray-500">
                              Ativar se sua empresa fabrica produtos
                            </p>
                          </div>
                          <Switch
                            checked={emitter.impostos.ipi.aplicavel}
                            onCheckedChange={(checked) => setEmitter({
                              ...emitter,
                              impostos: {
                                ...emitter.impostos,
                                ipi: {
                                  ...emitter.impostos.ipi,
                                  aplicavel: checked
                                }
                              }
                            })}
                          />
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>

                <Separator />

                {/* ICMS */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">ICMS (Imposto sobre Circulação de Mercadorias e Serviços)</h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <Label>Estado de Origem da Empresa</Label>
                      <Select
                        value={emitter.impostos.icms.estadoOrigem}
                        onValueChange={(value) => setEmitter({
                          ...emitter,
                          impostos: {
                            ...emitter.impostos,
                            icms: {
                              ...emitter.impostos.icms,
                              estadoOrigem: value
                            }
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

                    <div>
                      <Label>
                        <div className="flex items-center gap-2">
                          Alíquota ICMS Interno (%)
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="w-3 h-3 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Alíquota de ICMS para vendas dentro do seu estado. Varia por UF (geralmente 17%, 18% ou 19%).</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={emitter.impostos.icms.aliquotaInterna}
                        onChange={(e) => setEmitter({
                          ...emitter,
                          impostos: {
                            ...emitter.impostos,
                            icms: {
                              ...emitter.impostos.icms,
                              aliquotaInterna: parseFloat(e.target.value) || 0
                            }
                          }
                        })}
                        placeholder="18"
                      />
                    </div>
                  </div>

                  {/* Tabela de Alíquotas Interestaduais */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <Label className="text-base">Alíquotas ICMS Interestadual por UF</Label>
                        <p className="text-xs text-gray-500 mt-1">
                          Configure as alíquotas de ICMS para vendas para outros estados e FCP (Fundo de Combate à Pobreza)
                        </p>
                      </div>
                    </div>

                    <Card>
                      <div className="max-h-96 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-24">UF Destino</TableHead>
                              <TableHead>Estado</TableHead>
                              <TableHead className="w-32">ICMS (%)</TableHead>
                              <TableHead className="w-32">FCP (%)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {BRAZILIAN_STATES.map(uf => {
                              const stateNames: {[key: string]: string} = {
                                "AC": "Acre", "AL": "Alagoas", "AP": "Amapá", "AM": "Amazonas",
                                "BA": "Bahia", "CE": "Ceará", "DF": "Distrito Federal", "ES": "Espírito Santo",
                                "GO": "Goiás", "MA": "Maranhão", "MT": "Mato Grosso", "MS": "Mato Grosso do Sul",
                                "MG": "Minas Gerais", "PA": "Pará", "PB": "Paraíba", "PR": "Paraná",
                                "PE": "Pernambuco", "PI": "Piauí", "RJ": "Rio de Janeiro", "RN": "Rio Grande do Norte",
                                "RS": "Rio Grande do Sul", "RO": "Rondônia", "RR": "Roraima", "SC": "Santa Catarina",
                                "SP": "São Paulo", "SE": "Sergipe", "TO": "Tocantins"
                              };
                              
                              return (
                                <TableRow key={uf}>
                                  <TableCell className="font-medium">{uf}</TableCell>
                                  <TableCell className="text-sm text-gray-600">{stateNames[uf]}</TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={emitter.impostos.icms.aliquotasInterestaduais[uf]?.aliquota || 7}
                                      onChange={(e) => {
                                        const newValue = parseFloat(e.target.value) || 7;
                                        setEmitter({
                                          ...emitter,
                                          impostos: {
                                            ...emitter.impostos,
                                            icms: {
                                              ...emitter.impostos.icms,
                                              aliquotasInterestaduais: {
                                                ...emitter.impostos.icms.aliquotasInterestaduais,
                                                [uf]: {
                                                  ...emitter.impostos.icms.aliquotasInterestaduais[uf],
                                                  aliquota: newValue
                                                }
                                              }
                                            }
                                          }
                                        });
                                      }}
                                      className="w-20"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={emitter.impostos.icms.aliquotasInterestaduais[uf]?.fcp || 0}
                                      onChange={(e) => {
                                        const newValue = parseFloat(e.target.value) || 0;
                                        setEmitter({
                                          ...emitter,
                                          impostos: {
                                            ...emitter.impostos,
                                            icms: {
                                              ...emitter.impostos.icms,
                                              aliquotasInterestaduais: {
                                                ...emitter.impostos.icms.aliquotasInterestaduais,
                                                [uf]: {
                                                  ...emitter.impostos.icms.aliquotasInterestaduais[uf],
                                                  fcp: newValue
                                                }
                                              }
                                            }
                                          }
                                        });
                                      }}
                                      className="w-20"
                                    />
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </Card>

                    <Alert className="mt-4">
                      <Info className="w-4 h-4" />
                      <AlertDescription className="text-sm">
                        <strong>Alíquotas Interestaduais Padrão:</strong><br />
                        • <strong>7%</strong> para vendas do Sul/Sudeste para Norte/Nordeste/Centro-Oeste<br />
                        • <strong>12%</strong> para vendas entre estados do Sul/Sudeste<br />
                        • <strong>FCP</strong> varia de 0% a 2% conforme legislação de cada estado
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>

                <Separator />

                {/* RETENÇÕES */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Retenções na Fonte (Opcional)</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Configure as retenções aplicáveis ao seu tipo de atividade. Geralmente utilizado por empresas de serviços.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* IRRF */}
                    <Card className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">IRRF</h4>
                          <p className="text-xs text-gray-500">Imposto de Renda Retido na Fonte</p>
                        </div>
                        <Switch
                          checked={emitter.impostos.retencoes.irrf.ativo}
                          onCheckedChange={(checked) => setEmitter({
                            ...emitter,
                            impostos: {
                              ...emitter.impostos,
                              retencoes: {
                                ...emitter.impostos.retencoes,
                                irrf: {
                                  ...emitter.impostos.retencoes.irrf,
                                  ativo: checked
                                }
                              }
                            }
                          })}
                        />
                      </div>
                      <div>
                        <Label>Alíquota (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={emitter.impostos.retencoes.irrf.aliquota}
                          onChange={(e) => setEmitter({
                            ...emitter,
                            impostos: {
                              ...emitter.impostos,
                              retencoes: {
                                ...emitter.impostos.retencoes,
                                irrf: {
                                  ...emitter.impostos.retencoes.irrf,
                                  aliquota: parseFloat(e.target.value) || 0
                                }
                              }
                            }
                          })}
                          disabled={!emitter.impostos.retencoes.irrf.ativo}
                          placeholder="1.5"
                        />
                      </div>
                    </Card>

                    {/* ISS */}
                    <Card className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">ISS</h4>
                          <p className="text-xs text-gray-500">Imposto Sobre Serviços</p>
                        </div>
                        <Switch
                          checked={emitter.impostos.retencoes.iss.ativo}
                          onCheckedChange={(checked) => setEmitter({
                            ...emitter,
                            impostos: {
                              ...emitter.impostos,
                              retencoes: {
                                ...emitter.impostos.retencoes,
                                iss: {
                                  ...emitter.impostos.retencoes.iss,
                                  ativo: checked
                                }
                              }
                            }
                          })}
                        />
                      </div>
                      <div>
                        <Label>Alíquota (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={emitter.impostos.retencoes.iss.aliquota}
                          onChange={(e) => setEmitter({
                            ...emitter,
                            impostos: {
                              ...emitter.impostos,
                              retencoes: {
                                ...emitter.impostos.retencoes,
                                iss: {
                                  ...emitter.impostos.retencoes.iss,
                                  aliquota: parseFloat(e.target.value) || 0
                                }
                              }
                            }
                          })}
                          disabled={!emitter.impostos.retencoes.iss.ativo}
                          placeholder="5.0"
                        />
                      </div>
                    </Card>

                    {/* INSS */}
                    <Card className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">INSS</h4>
                          <p className="text-xs text-gray-500">Contribuição Previdenciária Retida</p>
                        </div>
                        <Switch
                          checked={emitter.impostos.retencoes.inss.ativo}
                          onCheckedChange={(checked) => setEmitter({
                            ...emitter,
                            impostos: {
                              ...emitter.impostos,
                              retencoes: {
                                ...emitter.impostos.retencoes,
                                inss: {
                                  ...emitter.impostos.retencoes.inss,
                                  ativo: checked
                                }
                              }
                            }
                          })}
                        />
                      </div>
                      <div>
                        <Label>Alíquota (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={emitter.impostos.retencoes.inss.aliquota}
                          onChange={(e) => setEmitter({
                            ...emitter,
                            impostos: {
                              ...emitter.impostos,
                              retencoes: {
                                ...emitter.impostos.retencoes,
                                inss: {
                                  ...emitter.impostos.retencoes.inss,
                                  aliquota: parseFloat(e.target.value) || 0
                                }
                              }
                            }
                          })}
                          disabled={!emitter.impostos.retencoes.inss.ativo}
                          placeholder="11.0"
                        />
                      </div>
                    </Card>

                    {/* CSLL */}
                    <Card className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">CSLL</h4>
                          <p className="text-xs text-gray-500">Contribuição Social sobre Lucro Líquido</p>
                        </div>
                        <Switch
                          checked={emitter.impostos.retencoes.csll.ativo}
                          onCheckedChange={(checked) => setEmitter({
                            ...emitter,
                            impostos: {
                              ...emitter.impostos,
                              retencoes: {
                                ...emitter.impostos.retencoes,
                                csll: {
                                  ...emitter.impostos.retencoes.csll,
                                  ativo: checked
                                }
                              }
                            }
                          })}
                        />
                      </div>
                      <div>
                        <Label>Alíquota (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={emitter.impostos.retencoes.csll.aliquota}
                          onChange={(e) => setEmitter({
                            ...emitter,
                            impostos: {
                              ...emitter.impostos,
                              retencoes: {
                                ...emitter.impostos.retencoes,
                                csll: {
                                  ...emitter.impostos.retencoes.csll,
                                  aliquota: parseFloat(e.target.value) || 0
                                }
                              }
                            }
                          })}
                          disabled={!emitter.impostos.retencoes.csll.ativo}
                          placeholder="1.0"
                        />
                      </div>
                    </Card>
                  </div>
                </div>

                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-green-900">
                    <strong>Configuração Automática:</strong> As alíquotas configuradas aqui serão aplicadas automaticamente na emissão de notas fiscais, mas podem ser ajustadas manualmente em cada NF-e se necessário.
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end pt-6 border-t">
              <Button onClick={handleSaveEmitter} size="lg" className="gap-2">
                <Save className="w-4 h-4" />
                Salvar Todas as Configurações
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Visualização */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da NF-e #{selectedNFe?.number}</DialogTitle>
            <DialogDescription>
              Visualização completa da nota fiscal eletrônica
            </DialogDescription>
          </DialogHeader>

          {selectedNFe && (
            <div className="space-y-6 mt-4">
              <div className="grid grid-cols-2 gap-6">
                <Card className="p-4">
                  <h4 className="font-medium mb-3">Emitente</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">CNPJ:</span>{" "}
                      <span className="text-gray-900">{selectedNFe.emitter.cnpj}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Razão Social:</span>{" "}
                      <span className="text-gray-900">{selectedNFe.emitter.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">IE:</span>{" "}
                      <span className="text-gray-900">{selectedNFe.emitter.ie}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Endereço:</span>{" "}
                      <span className="text-gray-900">{selectedNFe.emitter.address}</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h4 className="font-medium mb-3">Destinatário</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">CPF/CNPJ:</span>{" "}
                      <span className="text-gray-900">{selectedNFe.recipient.document}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Nome:</span>{" "}
                      <span className="text-gray-900">{selectedNFe.recipient.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">IE:</span>{" "}
                      <span className="text-gray-900">{selectedNFe.recipient.ie || "Não informada"}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Endereço:</span>{" "}
                      <span className="text-gray-900">{selectedNFe.recipient.address}</span>
                    </div>
                  </div>
                </Card>
              </div>

              <Card className="p-4">
                <h4 className="font-medium mb-3">Itens da Nota</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>NCM</TableHead>
                      <TableHead>CFOP</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>Valor Unit.</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedNFe.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell>{item.ncm}</TableCell>
                        <TableCell>{item.cfop}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>R$ {item.unitValue.toFixed(2)}</TableCell>
                        <TableCell>R$ {item.totalValue.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>

              <Card className="p-4">
                <h4 className="font-medium mb-3">Totais</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Valor dos Produtos</span>
                    <p className="text-lg font-semibold">R$ {selectedNFe.totals.productsValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">ICMS</span>
                    <p className="text-lg font-semibold">R$ {selectedNFe.totals.icmsValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Valor Total da NF-e</span>
                    <p className="text-xl font-bold text-green-600">R$ {selectedNFe.totals.nfeValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </Card>

              {selectedNFe.accessKey && (
                <Card className="p-4">
                  <h4 className="font-medium mb-2">Chave de Acesso</h4>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-gray-100 rounded text-sm">
                      {selectedNFe.accessKey}
                    </code>
                    <Button variant="outline" size="sm">
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
