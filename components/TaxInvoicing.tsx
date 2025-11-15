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
import { Plus, Search, FileText, Send, X, CheckCircle, XCircle, Clock, AlertCircle, Download, Printer, Copy, MoreVertical, Eye, Edit } from "lucide-react";
import { useERP } from "../contexts/ERPContext";
import { toast } from "sonner@2.0.3";

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

// Tabelas fiscais
const CFOP_TABLE = [
  { code: "5.101", description: "Venda de produção do estabelecimento", type: "Saída" },
  { code: "5.102", description: "Venda de mercadoria adquirida ou recebida de terceiros", type: "Saída" },
  { code: "5.103", description: "Venda de produção do estabelecimento, efetuada fora do estabelecimento", type: "Saída" },
  { code: "5.104", description: "Venda de mercadoria adquirida ou recebida de terceiros, efetuada fora do estabelecimento", type: "Saída" },
  { code: "5.115", description: "Venda de mercadoria adquirida ou recebida de terceiros, recebida anteriormente em consignação mercantil", type: "Saída" },
  { code: "5.116", description: "Venda de mercadoria adquirida ou recebida de terceiros, recebida anteriormente em consignação industrial", type: "Saída" },
  { code: "5.117", description: "Venda de mercadoria adquirida ou recebida de terceiros, originada de encomenda para entrega futura", type: "Saída" },
  { code: "5.118", description: "Venda de produção do estabelecimento entregue ao destinatário por conta e ordem do adquirente originário, em venda à ordem", type: "Saída" },
  { code: "5.119", description: "Venda de mercadoria adquirida ou recebida de terceiros entregue ao destinatário por conta e ordem do adquirente originário, em venda à ordem", type: "Saída" },
  { code: "5.401", description: "Venda de produção do estabelecimento em operação com produto sujeito ao regime de substituição tributária", type: "Saída" },
  { code: "5.402", description: "Venda de produção do estabelecimento de produto sujeito ao regime de substituição tributária, em operação entre contribuintes substitutos do mesmo produto", type: "Saída" },
  { code: "5.403", description: "Venda de mercadoria adquirida ou recebida de terceiros em operação com mercadoria sujeita ao regime de substituição tributária", type: "Saída" },
  { code: "6.101", description: "Venda de produção do estabelecimento - Interestadual", type: "Saída" },
  { code: "6.102", description: "Venda de mercadoria adquirida ou recebida de terceiros - Interestadual", type: "Saída" },
  { code: "6.103", description: "Venda de produção do estabelecimento, efetuada fora do estabelecimento - Interestadual", type: "Saída" },
  { code: "6.104", description: "Venda de mercadoria adquirida ou recebida de terceiros, efetuada fora do estabelecimento - Interestadual", type: "Saída" },
  { code: "1.101", description: "Compra para industrialização ou produção rural", type: "Entrada" },
  { code: "1.102", description: "Compra para comercialização", type: "Entrada" },
  { code: "1.111", description: "Compra para industrialização de mercadoria recebida anteriormente em consignação industrial", type: "Entrada" },
  { code: "2.101", description: "Compra para industrialização ou produção rural - Interestadual", type: "Entrada" },
  { code: "2.102", description: "Compra para comercialização - Interestadual", type: "Entrada" },
];

const CST_TABLE = [
  { code: "00", description: "Tributada integralmente" },
  { code: "10", description: "Tributada e com cobrança do ICMS por substituição tributária" },
  { code: "20", description: "Com redução de base de cálculo" },
  { code: "30", description: "Isenta ou não tributada e com cobrança do ICMS por substituição tributária" },
  { code: "40", description: "Isenta" },
  { code: "41", description: "Não tributada" },
  { code: "50", description: "Suspensão" },
  { code: "51", description: "Diferimento" },
  { code: "60", description: "ICMS cobrado anteriormente por substituição tributária" },
  { code: "70", description: "Com redução de base de cálculo e cobrança do ICMS por substituição tributária" },
  { code: "90", description: "Outras" },
];

const CSOSN_TABLE = [
  { code: "101", description: "Tributada pelo Simples Nacional com permissão de crédito" },
  { code: "102", description: "Tributada pelo Simples Nacional sem permissão de crédito" },
  { code: "103", description: "Isenção do ICMS no Simples Nacional para faixa de receita bruta" },
  { code: "201", description: "Tributada pelo Simples Nacional com permissão de crédito e com cobrança do ICMS por substituição tributária" },
  { code: "202", description: "Tributada pelo Simples Nacional sem permissão de crédito e com cobrança do ICMS por substituição tributária" },
  { code: "203", description: "Isenção do ICMS no Simples Nacional para faixa de receita bruta e com cobrança do ICMS por substituição tributária" },
  { code: "300", description: "Imune" },
  { code: "400", description: "Não tributada pelo Simples Nacional" },
  { code: "500", description: "ICMS cobrado anteriormente por substituição tributária ou por antecipação" },
  { code: "900", description: "Outros" },
];

const TAX_REGIMES = [
  { value: "Simples Nacional", label: "Simples Nacional" },
  { value: "Lucro Presumido", label: "Lucro Presumido" },
  { value: "Lucro Real", label: "Lucro Real" },
];

export function TaxInvoicing() {
  const { salesOrders, customers, inventory, companySettings } = useERP();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedNFe, setSelectedNFe] = useState<NFe | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

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

  // Mock de NFes (em produção, viria do contexto)
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

  // Carregar dados do pedido de venda
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

    // Criar item da NFe baseado no pedido
    const companyState = companySettings?.generalData?.state || "SP";
    const newItem: NFeTaxItem = {
      productId: order.productName, // simplificado
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

  // Calcular totais
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

  // Emitir NFe
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
    
    // Resetar formulário
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

  // Transmitir NFe
  const handleTransmitNFe = (nfeId: string) => {
    const nfe = nfes.find(n => n.id === nfeId);
    if (!nfe) return;

    if (nfe.status !== "Rascunho") {
      toast.error("Apenas NFes em rascunho podem ser transmitidas");
      return;
    }

    // Simular transmissão
    const cnpj = companySettings?.generalData?.cnpj || "00000000000000";
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

  // Cancelar NFe
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

  // Visualizar NFe
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
            <p className="text-gray-600">Emissão e gestão de Notas Fiscais Eletrônicas (NFe)</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[rgb(32,251,225)] hover:bg-[#18CBB5] text-[rgb(0,0,0)]">
                <Plus className="w-4 h-4 mr-2" />
                Emitir NFe
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Emitir Nota Fiscal Eletrônica (NFe)</DialogTitle>
                <DialogDescription>
                  Preencha os dados da nota fiscal e os itens para emissão
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-1">
                <Tabs defaultValue="header" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="header">Cabeçalho</TabsTrigger>
                    <TabsTrigger value="items">Itens ({nfeItems.length})</TabsTrigger>
                    <TabsTrigger value="totals">Totais</TabsTrigger>
                  </TabsList>

                  {/* ABA 1: CABEÇALHO */}
                  <TabsContent value="header" className="space-y-4 mt-4">
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
                                .filter(o => o.status === "Entregue" || o.status === "Pago")
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

                    {/* Dados do Emitente */}
                    <Separator />
                    <div>
                      <h3 className="text-gray-900 mb-3">Dados do Emitente</h3>
                      <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                        <div>
                          <Label className="text-xs text-gray-600">CNPJ</Label>
                          <p className="text-sm text-gray-900">{companySettings?.generalData?.cnpj || "Não cadastrado"}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Razão Social</Label>
                          <p className="text-sm text-gray-900">{companySettings?.generalData?.companyName || "Não cadastrado"}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Inscrição Estadual</Label>
                          <p className="text-sm text-gray-900">{companySettings?.taxData?.stateRegistration || "Não informada"}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Endereço</Label>
                          <p className="text-sm text-gray-900">{companySettings?.generalData?.address || "Não cadastrado"}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Cidade/UF</Label>
                          <p className="text-sm text-gray-900">{companySettings?.generalData?.city || "N/A"}/{companySettings?.generalData?.state || "N/A"}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">CEP</Label>
                          <p className="text-sm text-gray-900">{companySettings?.generalData?.zipCode || "Não cadastrado"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Dados do Destinatário */}
                    <Separator />
                    <div>
                      <h3 className="text-gray-900 mb-3">Dados do Destinatário</h3>
                      {nfeForm.salesOrderId ? (
                        (() => {
                          const order = salesOrders.find(o => o.id === nfeForm.salesOrderId);
                          const customer = order ? customers.find(c => c.id === order.customerId) : null;
                          
                          return customer ? (
                            <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                              <div>
                                <Label className="text-xs text-gray-600">CPF/CNPJ</Label>
                                <p className="text-sm text-gray-900">{customer.document}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-gray-600">Nome/Razão Social</Label>
                                <p className="text-sm text-gray-900">{customer.company || customer.name}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-gray-600">Inscrição Estadual</Label>
                                <p className="text-sm text-gray-900">{customer.stateRegistration || "Não informada"}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-gray-600">Endereço</Label>
                                <p className="text-sm text-gray-900">{customer.address}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-gray-600">Cidade/UF</Label>
                                <p className="text-sm text-gray-900">{customer.city}/{customer.state}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-gray-600">CEP</Label>
                                <p className="text-sm text-gray-900">{customer.zipCode}</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 text-center py-4">Cliente não encontrado</p>
                          );
                        })()
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">Selecione um pedido de venda para carregar os dados do destinatário</p>
                      )}
                    </div>

                    {/* Informações Adicionais */}
                    <Separator />
                    <div>
                      <Label>Informações Adicionais</Label>
                      <Textarea
                        value={nfeForm.additionalInfo}
                        onChange={(e) => setNfeForm({...nfeForm, additionalInfo: e.target.value})}
                        placeholder="Observações, condições de pagamento, etc..."
                        rows={3}
                      />
                    </div>
                  </TabsContent>

                  {/* ABA 2: ITENS */}
                  <TabsContent value="items" className="space-y-4 mt-4">
                    {nfeItems.length === 0 ? (
                      <div className="text-center py-12">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-gray-500 mb-4">Nenhum item adicionado à NFe</p>
                        <Button onClick={handleLoadSalesOrder} variant="outline">
                          Carregar do Pedido de Venda
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {nfeItems.map((item, index) => (
                          <Card key={index} className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <h4 className="text-gray-900">{item.productName}</h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setNfeItems(nfeItems.filter((_, i) => i !== index))}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-4 gap-3 mb-3">
                              <div>
                                <Label className="text-xs">NCM</Label>
                                <Input
                                  value={item.ncm}
                                  onChange={(e) => {
                                    const updated = [...nfeItems];
                                    updated[index].ncm = e.target.value;
                                    setNfeItems(updated);
                                  }}
                                  placeholder="00000000"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">CFOP</Label>
                                <Select
                                  value={item.cfop}
                                  onValueChange={(value) => {
                                    const updated = [...nfeItems];
                                    updated[index].cfop = value;
                                    setNfeItems(updated);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {CFOP_TABLE.filter(c => c.type === "Saída").map(cfop => (
                                      <SelectItem key={cfop.code} value={cfop.code}>
                                        {cfop.code} - {cfop.description}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">
                                  {nfeForm.taxRegime === "Simples Nacional" ? "CSOSN" : "CST"}
                                </Label>
                                <Select
                                  value={nfeForm.taxRegime === "Simples Nacional" ? item.csosn : item.cst}
                                  onValueChange={(value) => {
                                    const updated = [...nfeItems];
                                    if (nfeForm.taxRegime === "Simples Nacional") {
                                      updated[index].csosn = value;
                                    } else {
                                      updated[index].cst = value;
                                    }
                                    setNfeItems(updated);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(nfeForm.taxRegime === "Simples Nacional" ? CSOSN_TABLE : CST_TABLE).map(code => (
                                      <SelectItem key={code.code} value={code.code}>
                                        {code.code} - {code.description}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">Quantidade</Label>
                                <Input
                                  type="number"
                                  value={item.quantity}
                                  disabled
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-5 gap-3">
                              <div>
                                <Label className="text-xs">Valor Unit.</Label>
                                <Input
                                  value={`R$ ${item.unitValue.toFixed(2)}`}
                                  disabled
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Valor Total</Label>
                                <Input
                                  value={`R$ ${item.totalValue.toFixed(2)}`}
                                  disabled
                                />
                              </div>
                              <div>
                                <Label className="text-xs">ICMS ({item.icmsRate}%)</Label>
                                <Input
                                  value={`R$ ${item.icmsValue.toFixed(2)}`}
                                  disabled
                                />
                              </div>
                              <div>
                                <Label className="text-xs">PIS ({item.pisRate}%)</Label>
                                <Input
                                  value={`R$ ${item.pisValue.toFixed(2)}`}
                                  disabled
                                />
                              </div>
                              <div>
                                <Label className="text-xs">COFINS ({item.cofinsRate}%)</Label>
                                <Input
                                  value={`R$ ${item.cofinsValue.toFixed(2)}`}
                                  disabled
                                />
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* ABA 3: TOTAIS */}
                  <TabsContent value="totals" className="space-y-4 mt-4">
                    {nfeItems.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        Adicione itens à NFe para visualizar os totais
                      </div>
                    ) : (
                      <Card className="p-6">
                        <h3 className="text-gray-900 mb-4">Resumo dos Valores</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-gray-700">Valor dos Produtos</span>
                            <span className="text-gray-900">R$ {calculateTotals().productsValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-gray-700">ICMS</span>
                            <span className="text-blue-600">R$ {calculateTotals().icmsValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-gray-700">IPI</span>
                            <span className="text-blue-600">R$ {calculateTotals().ipiValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-gray-700">PIS</span>
                            <span className="text-blue-600">R$ {calculateTotals().pisValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-gray-700">COFINS</span>
                            <span className="text-blue-600">R$ {calculateTotals().cofinsValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between py-3 bg-green-50 px-3 rounded">
                            <span className="text-gray-900">Valor Total da NFe</span>
                            <span className="text-green-600 text-xl">R$ {calculateTotals().nfeValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </Card>
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              {/* Botões de Ação */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleEmitNFe} className="bg-green-600 hover:bg-green-700">
                  Gerar NFe
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Autorizadas</p>
                <p className="text-gray-900">{stats.authorized}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Rascunhos</p>
                <p className="text-gray-900">{stats.draft}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Canceladas</p>
                <p className="text-gray-900">{stats.cancelled}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Valor Total</p>
                <p className="text-gray-900">R$ {stats.totalValue.toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Info Card sobre CFOP/CST/CSOSN */}
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>📋 Códigos Fiscais:</strong> CFOP define a natureza da operação, CST/CSOSN indica a situação tributária do ICMS. 
            Utilize CSOSN para empresas no Simples Nacional e CST para demais regimes tributários.
          </AlertDescription>
        </Alert>

        {/* Filtros */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Pesquisar por número, cliente..."
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
              <SelectItem value="Rascunho">Rascunho</SelectItem>
              <SelectItem value="Autorizada">Autorizada</SelectItem>
              <SelectItem value="Cancelada">Cancelada</SelectItem>
              <SelectItem value="Rejeitada">Rejeitada</SelectItem>
              <SelectItem value="Denegada">Denegada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela de NFes */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Ações</TableHead>
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
            {filteredNFes.map((nfe) => (
              <TableRow key={nfe.id}>
                <TableCell className="text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleViewNFe(nfe)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Visualizar DANFE
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {nfe.status === "Rascunho" && (
                        <DropdownMenuItem onClick={() => handleTransmitNFe(nfe.id)}>
                          <Send className="mr-2 h-4 w-4" />
                          Transmitir NFe
                        </DropdownMenuItem>
                      )}
                      {nfe.status === "Autorizada" && (
                        <>
                          <DropdownMenuItem onClick={() => toast.info("Função de download em desenvolvimento")}>
                            <Download className="mr-2 h-4 w-4" />
                            Baixar XML
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.info("Função de impressão em desenvolvimento")}>
                            <Printer className="mr-2 h-4 w-4" />
                            Imprimir DANFE
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleCancelNFe(nfe.id)}
                            className="text-red-600"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancelar NFe
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
                <TableCell>{nfe.number}</TableCell>
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
                    <span className="flex items-center gap-1">
                      {getStatusIcon(nfe.status)}
                      {nfe.status}
                    </span>
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Dialog de Visualização DANFE */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>DANFE - Documento Auxiliar da Nota Fiscal Eletrônica</DialogTitle>
            <DialogDescription>
              NFe Nº {selectedNFe?.number} - Série {selectedNFe?.series}
            </DialogDescription>
          </DialogHeader>

          {selectedNFe && (
            <div className="space-y-4">
              {/* Cabeçalho DANFE */}
              <div className="border-2 border-gray-300 p-4">
                <div className="text-center mb-4">
                  <h2 className="text-xl">DANFE</h2>
                  <p className="text-sm">Documento Auxiliar da Nota Fiscal Eletrônica</p>
                </div>

                {/* Emitente */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold border-b mb-2">EMITENTE</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p><strong>Nome/Razão Social:</strong> {selectedNFe.emitter.name}</p>
                      <p><strong>CNPJ:</strong> {selectedNFe.emitter.cnpj}</p>
                      <p><strong>IE:</strong> {selectedNFe.emitter.ie}</p>
                    </div>
                    <div>
                      <p><strong>Endereço:</strong> {selectedNFe.emitter.address}</p>
                      <p><strong>Cidade/UF:</strong> {selectedNFe.emitter.city}/{selectedNFe.emitter.state}</p>
                      <p><strong>CEP:</strong> {selectedNFe.emitter.cep}</p>
                    </div>
                  </div>
                </div>

                {/* Destinatário */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold border-b mb-2">DESTINATÁRIO</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p><strong>Nome/Razão Social:</strong> {selectedNFe.recipient.name}</p>
                      <p><strong>CPF/CNPJ:</strong> {selectedNFe.recipient.document}</p>
                      <p><strong>IE:</strong> {selectedNFe.recipient.ie || "Não informado"}</p>
                    </div>
                    <div>
                      <p><strong>Endereço:</strong> {selectedNFe.recipient.address}</p>
                      <p><strong>Cidade/UF:</strong> {selectedNFe.recipient.city}/{selectedNFe.recipient.state}</p>
                      <p><strong>CEP:</strong> {selectedNFe.recipient.cep}</p>
                    </div>
                  </div>
                </div>

                {/* Dados da NFe */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold border-b mb-2">DADOS DA NFe</h3>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <p><strong>Natureza:</strong> {selectedNFe.naturezaOperacao}</p>
                    <p><strong>Número:</strong> {selectedNFe.number}</p>
                    <p><strong>Série:</strong> {selectedNFe.series}</p>
                    <p><strong>Data de Emissão:</strong> {new Date(selectedNFe.issueDate).toLocaleDateString('pt-BR')}</p>
                    <p><strong>Regime:</strong> {selectedNFe.taxRegime}</p>
                    {selectedNFe.accessKey && (
                      <p className="col-span-3"><strong>Chave de Acesso:</strong> {selectedNFe.accessKey}</p>
                    )}
                  </div>
                </div>

                {/* Itens */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold border-b mb-2">PRODUTOS / SERVIÇOS</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="border p-1">Produto</th>
                          <th className="border p-1">NCM</th>
                          <th className="border p-1">CFOP</th>
                          <th className="border p-1">CST/CSOSN</th>
                          <th className="border p-1">Qtd</th>
                          <th className="border p-1">Valor Unit.</th>
                          <th className="border p-1">Valor Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedNFe.items.map((item, index) => (
                          <tr key={index}>
                            <td className="border p-1">{item.productName}</td>
                            <td className="border p-1 text-center">{item.ncm}</td>
                            <td className="border p-1 text-center">{item.cfop}</td>
                            <td className="border p-1 text-center">{selectedNFe.taxRegime === "Simples Nacional" ? item.csosn : item.cst}</td>
                            <td className="border p-1 text-right">{item.quantity}</td>
                            <td className="border p-1 text-right">R$ {item.unitValue.toFixed(2)}</td>
                            <td className="border p-1 text-right">R$ {item.totalValue.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totais */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold border-b mb-2">CÁLCULO DO IMPOSTO</h3>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <p><strong>Base ICMS:</strong> R$ {selectedNFe.totals.productsValue.toFixed(2)}</p>
                    <p><strong>Valor ICMS:</strong> R$ {selectedNFe.totals.icmsValue.toFixed(2)}</p>
                    <p><strong>Valor IPI:</strong> R$ {selectedNFe.totals.ipiValue.toFixed(2)}</p>
                    <p><strong>Valor PIS:</strong> R$ {selectedNFe.totals.pisValue.toFixed(2)}</p>
                    <p><strong>Valor COFINS:</strong> R$ {selectedNFe.totals.cofinsValue.toFixed(2)}</p>
                    <p className="col-span-3 text-lg"><strong>Valor Total da NFe:</strong> R$ {selectedNFe.totals.nfeValue.toFixed(2)}</p>
                  </div>
                </div>

                {/* Status */}
                <div className="text-center p-4 bg-gray-100 rounded">
                  <Badge className={getStatusColor(selectedNFe.status)}>
                    <span className="flex items-center gap-2">
                      {getStatusIcon(selectedNFe.status)}
                      <span className="text-lg">{selectedNFe.status}</span>
                    </span>
                  </Badge>
                  {selectedNFe.protocol && (
                    <p className="text-sm text-gray-600 mt-2">Protocolo: {selectedNFe.protocol}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}