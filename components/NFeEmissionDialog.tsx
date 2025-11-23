import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Card } from "./ui/card";
import { Separator } from "./ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Plus, Trash2, Calculator, FileText, Save, CalendarIcon, Search, Package, DollarSign, Truck, Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner@2.0.3";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface NFeEmissionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  nfeForm: any;
  setNfeForm: (form: any) => void;
  newItem: any;
  setNewItem: (item: any) => void;
  showAddItemDialog: boolean;
  setShowAddItemDialog: (show: boolean) => void;
  handleAddItem: () => void;
  handleRemoveItem: (itemId: string) => void;
  handleCalculateTotals: () => void;
  handleSaveDraft: () => void;
  handleGenerateXml: () => void;
  isCalculating: boolean;
  isGeneratingXml: boolean;
  brazilianStates: string[];
  salesOrders?: any[];
  emitter?: any;
}

// Lista de CFOPs mais comuns
const CFOP_OPTIONS = [
  { value: "5.101", label: "5.101 - Venda de produção do estabelecimento" },
  { value: "5.102", label: "5.102 - Venda de mercadoria adquirida ou recebida de terceiros" },
  { value: "5.103", label: "5.103 - Venda de produção do estabelecimento efetuada fora do estabelecimento" },
  { value: "5.104", label: "5.104 - Venda de mercadoria adquirida ou recebida de terceiros fora do estabelecimento" },
  { value: "5.105", label: "5.105 - Venda de produção do estabelecimento que não deva transitar pelo estabelecimento" },
  { value: "5.106", label: "5.106 - Venda de mercadoria adquirida ou recebida de terceiros que não deva transitar" },
  { value: "5.109", label: "5.109 - Venda de produção do estabelecimento destinada à Zona Franca de Manaus" },
  { value: "5.110", label: "5.110 - Venda de mercadoria adquirida destinada à Zona Franca de Manaus" },
  { value: "5.116", label: "5.116 - Venda de produção do estabelecimento originada de encomenda para entrega futura" },
  { value: "5.117", label: "5.117 - Venda de mercadoria adquirida originada de encomenda para entrega futura" },
  { value: "5.118", label: "5.118 - Venda de produção do estabelecimento entregue ao destinatário por conta e ordem" },
  { value: "5.119", label: "5.119 - Venda de mercadoria adquirida entregue ao destinatário por conta e ordem" },
  { value: "5.202", label: "5.202 - Devolução de compra para comercialização" },
  { value: "5.405", label: "5.405 - Venda de mercadoria adquirida ou recebida de terceiros em operação com não contribuinte" },
  { value: "5.656", label: "5.656 - Venda de combustível ou lubrificante adquirido ou recebido de terceiros" },
  { value: "5.933", label: "5.933 - Prestação de serviço tributado pelo ISSQN" },
  { value: "6.101", label: "6.101 - Venda de produção do estabelecimento" },
  { value: "6.102", label: "6.102 - Venda de mercadoria adquirida ou recebida de terceiros" },
  { value: "6.108", label: "6.108 - Venda de mercadoria adquirida destinada a não contribuinte" },
  { value: "6.109", label: "6.109 - Venda de produção destinada à Zona Franca de Manaus ou Áreas de Livre Comércio" },
];

// Lista de séries comuns
const SERIES_OPTIONS = ["1", "2", "3", "5", "10", "100"];

export function NFeEmissionDialog({
  isOpen,
  onOpenChange,
  nfeForm,
  setNfeForm,
  newItem,
  setNewItem,
  showAddItemDialog,
  setShowAddItemDialog,
  handleAddItem,
  handleRemoveItem,
  handleCalculateTotals,
  handleSaveDraft,
  handleGenerateXml,
  isCalculating,
  isGeneratingXml,
  brazilianStates,
  salesOrders = [],
  emitter,
}: NFeEmissionDialogProps) {
  const [activeTab, setActiveTab] = useState("dados");
  const [activeTotaisTab, setActiveTotaisTab] = useState("icms");
  const [activeInfoTab, setActiveInfoTab] = useState("contribuinte");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [isBuscandoCNPJ, setIsBuscandoCNPJ] = useState(false);

  // Buscar dados do CNPJ
  const handleBuscarCNPJ = async () => {
    const cnpj = nfeForm.destinatario.documento.replace(/\D/g, '');
    
    if (cnpj.length !== 14) {
      toast.error("CNPJ inválido");
      return;
    }

    setIsBuscandoCNPJ(true);

    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      
      if (!response.ok) {
        throw new Error('CNPJ não encontrado');
      }

      const data = await response.json();

      setNfeForm({
        ...nfeForm,
        destinatario: {
          ...nfeForm.destinatario,
          nome: data.razao_social || data.nome_fantasia,
          email: data.email || nfeForm.destinatario.email,
          telefone: data.ddd_telefone_1 || nfeForm.destinatario.telefone,
          cep: data.cep.replace(/\D/g, ''),
          logradouro: data.logradouro,
          numero: data.numero,
          complemento: data.complemento,
          bairro: data.bairro,
          cidade: data.municipio,
          estado: data.uf,
        }
      });

      toast.success("Dados do CNPJ carregados com sucesso!");
    } catch (error) {
      console.error('Erro ao buscar CNPJ:', error);
      toast.error("Erro ao buscar dados do CNPJ. Verifique o número e tente novamente.");
    } finally {
      setIsBuscandoCNPJ(false);
    }
  };

  // Carregar dados de um pedido
  const handleCarregarPedido = (pedidoId: string) => {
    const pedido = salesOrders.find(p => p.id === pedidoId);
    
    if (!pedido) {
      toast.error("Pedido não encontrado");
      return;
    }

    // Preencher destinatário
    const cliente = pedido.customer;
    if (cliente) {
      setNfeForm({
        ...nfeForm,
        destinatario: {
          tipo: cliente.type === "Pessoa Física" ? "Física" : "Jurídica",
          documento: cliente.document || "",
          nome: cliente.name || "",
          ie: cliente.stateRegistration || "",
          email: cliente.email || "",
          telefone: cliente.phone || "",
          cep: cliente.zipCode || "",
          logradouro: cliente.street || "",
          numero: cliente.number || "",
          complemento: cliente.complement || "",
          bairro: cliente.neighborhood || "",
          cidade: cliente.city || "",
          estado: cliente.state || "",
        },
        itens: pedido.items?.map((item: any, index: number) => ({
          id: `ITEM-${Date.now()}-${index}`,
          produtoId: item.productId || `PROD-${index}`,
          descricao: item.description || item.product,
          ncm: item.ncm || "",
          cfop: nfeForm.cfop,
          unidade: item.unit || "UN",
          quantidade: item.quantity || 1,
          valorUnitario: item.unitValue || 0,
          valorTotal: item.totalValue || 0,
          icms: {
            origem: "0",
            cst: "00",
            csosn: emitter?.regimeTributario === "Simples Nacional" ? "102" : "",
            aliquota: 18,
            baseCalculo: item.totalValue || 0,
            valor: 0,
          },
          ipi: {
            cst: "99",
            aliquota: 0,
            baseCalculo: item.totalValue || 0,
            valor: 0,
          },
          pis: {
            cst: "01",
            aliquota: 1.65,
            baseCalculo: item.totalValue || 0,
            valor: 0,
          },
          cofins: {
            cst: "01",
            aliquota: 7.6,
            baseCalculo: item.totalValue || 0,
            valor: 0,
          },
        })) || []
      });

      toast.success(`Pedido ${pedido.orderNumber} carregado com sucesso!`);
    }
  };

  return (
    <>
      {/* DIALOG PRINCIPAL DE EMISSÃO */}
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Emitir Nota Fiscal Eletrônica</DialogTitle>
            <DialogDescription>
              Preencha os dados da NF-e para emissão. Campos marcados com * são obrigatórios.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid grid-cols-6 w-full">
              <TabsTrigger value="dados" className="gap-2">
                <FileText className="w-4 h-4" />
                Dados da NF-e
              </TabsTrigger>
              <TabsTrigger value="destinatario" className="gap-2">
                <Info className="w-4 h-4" />
                Destinatário
              </TabsTrigger>
              <TabsTrigger value="produtos" className="gap-2">
                <Package className="w-4 h-4" />
                Produtos
              </TabsTrigger>
              <TabsTrigger value="totais" className="gap-2">
                <DollarSign className="w-4 h-4" />
                Totais
              </TabsTrigger>
              <TabsTrigger value="transporte" className="gap-2">
                <Truck className="w-4 h-4" />
                Transporte
              </TabsTrigger>
              <TabsTrigger value="informacoes" className="gap-2">
                <Info className="w-4 h-4" />
                Info Adicionais
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              {/* ABA 1: DADOS DA NF-e */}
              <TabsContent value="dados" className="space-y-6 mt-0">
                <Card className="p-6">
                  <h3 className="font-medium mb-4">Configurações da Nota</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <Label>Tipo de NF-e *</Label>
                      <Select
                        value={nfeForm.tipo}
                        onValueChange={(value: any) => setNfeForm({ ...nfeForm, tipo: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="55">55 - NF-e (Nota Fiscal Eletrônica)</SelectItem>
                          <SelectItem value="65">65 - NFC-e (Nota Fiscal ao Consumidor)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Série *</Label>
                      <Select
                        value={nfeForm.serie}
                        onValueChange={(value) => setNfeForm({ ...nfeForm, serie: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SERIES_OPTIONS.map((serie) => (
                            <SelectItem key={serie} value={serie}>
                              Série {serie}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Número</Label>
                      <Input
                        value={nfeForm.numero || (emitter?.nfe?.numeroAtualNFe || 1)}
                        onChange={(e) => setNfeForm({ ...nfeForm, numero: e.target.value })}
                        placeholder="Automático"
                        disabled
                      />
                    </div>

                    <div>
                      <Label>Data de Emissão *</Label>
                      <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {nfeForm.dataEmissao ? format(new Date(nfeForm.dataEmissao), "dd/MM/yyyy", { locale: pt }) : "Selecione"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={nfeForm.dataEmissao ? new Date(nfeForm.dataEmissao) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                setNfeForm({ ...nfeForm, dataEmissao: format(date, "yyyy-MM-dd") });
                                setDatePickerOpen(false);
                              }
                            }}
                            locale={pt}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <Label>Ambiente *</Label>
                      <Select
                        value={nfeForm.ambiente || emitter?.nfe?.ambiente || "Homologação"}
                        onValueChange={(value) => setNfeForm({ ...nfeForm, ambiente: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Homologação">🧪 Homologação (Testes)</SelectItem>
                          <SelectItem value="Produção">✅ Produção</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Tipo de Operação *</Label>
                      <Select
                        value={nfeForm.tipoOperacao || "Saída"}
                        onValueChange={(value) => setNfeForm({ ...nfeForm, tipoOperacao: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Saída">Saída</SelectItem>
                          <SelectItem value="Entrada">Entrada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Finalidade *</Label>
                      <Select
                        value={nfeForm.finalidade || "Normal"}
                        onValueChange={(value) => setNfeForm({ ...nfeForm, finalidade: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Normal">1 - NF-e Normal</SelectItem>
                          <SelectItem value="Complementar">2 - NF-e Complementar</SelectItem>
                          <SelectItem value="Ajuste">3 - NF-e de Ajuste</SelectItem>
                          <SelectItem value="Devolução">4 - Devolução de Mercadoria</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>CFOP *</Label>
                      <Select
                        value={nfeForm.cfop}
                        onValueChange={(value) => setNfeForm({ ...nfeForm, cfop: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {CFOP_OPTIONS.map((cfop) => (
                            <SelectItem key={cfop.value} value={cfop.value}>
                              {cfop.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-4">
                      <Label>Natureza da Operação *</Label>
                      <Input
                        value={nfeForm.naturezaOperacao}
                        onChange={(e) => setNfeForm({ ...nfeForm, naturezaOperacao: e.target.value })}
                        placeholder="Ex: Venda de mercadoria adquirida ou recebida de terceiros"
                      />
                    </div>
                  </div>
                </Card>

                {salesOrders && salesOrders.length > 0 && (
                  <Card className="p-6 bg-blue-50 border-blue-200">
                    <h3 className="font-medium mb-4">Gerar NF-e a partir de Pedido</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label>Selecione um Pedido de Venda</Label>
                        <Select onValueChange={handleCarregarPedido}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um pedido..." />
                          </SelectTrigger>
                          <SelectContent>
                            {salesOrders
                              .filter(p => p.status === "Aprovado" || p.status === "Concluído")
                              .map((pedido) => (
                                <SelectItem key={pedido.id} value={pedido.id}>
                                  Pedido {pedido.orderNumber} - {pedido.customer?.name} - R$ {pedido.totalValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-600 mt-1">
                          Os dados do destinatário e produtos serão preenchidos automaticamente
                        </p>
                      </div>
                    </div>
                  </Card>
                )}
              </TabsContent>

              {/* ABA 2: DESTINATÁRIO */}
              <TabsContent value="destinatario" className="space-y-6 mt-0">
                <Card className="p-6">
                  <h3 className="font-medium mb-4">Dados do Destinatário</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <Label>Tipo de Pessoa *</Label>
                      <Select
                        value={nfeForm.destinatario.tipo}
                        onValueChange={(value: any) =>
                          setNfeForm({
                            ...nfeForm,
                            destinatario: { ...nfeForm.destinatario, tipo: value },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Física">Pessoa Física</SelectItem>
                          <SelectItem value="Jurídica">Pessoa Jurídica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2">
                      <Label>
                        {nfeForm.destinatario.tipo === "Física" ? "CPF *" : "CNPJ *"}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          value={nfeForm.destinatario.documento}
                          onChange={(e) =>
                            setNfeForm({
                              ...nfeForm,
                              destinatario: { ...nfeForm.destinatario, documento: e.target.value },
                            })
                          }
                          placeholder={
                            nfeForm.destinatario.tipo === "Física"
                              ? "000.000.000-00"
                              : "00.000.000/0000-00"
                          }
                        />
                        {nfeForm.destinatario.tipo === "Jurídica" && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleBuscarCNPJ}
                            disabled={isBuscandoCNPJ}
                          >
                            <Search className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label>Inscrição Estadual</Label>
                      <Input
                        value={nfeForm.destinatario.ie}
                        onChange={(e) =>
                          setNfeForm({
                            ...nfeForm,
                            destinatario: { ...nfeForm.destinatario, ie: e.target.value },
                          })
                        }
                        placeholder="ISENTO"
                      />
                    </div>

                    <div className="col-span-4">
                      <Label>Nome / Razão Social *</Label>
                      <Input
                        value={nfeForm.destinatario.nome}
                        onChange={(e) =>
                          setNfeForm({
                            ...nfeForm,
                            destinatario: { ...nfeForm.destinatario, nome: e.target.value },
                          })
                        }
                      />
                    </div>

                    <div className="col-span-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={nfeForm.destinatario.email}
                        onChange={(e) =>
                          setNfeForm({
                            ...nfeForm,
                            destinatario: { ...nfeForm.destinatario, email: e.target.value },
                          })
                        }
                      />
                    </div>

                    <div className="col-span-2">
                      <Label>Telefone</Label>
                      <Input
                        value={nfeForm.destinatario.telefone}
                        onChange={(e) =>
                          setNfeForm({
                            ...nfeForm,
                            destinatario: { ...nfeForm.destinatario, telefone: e.target.value },
                          })
                        }
                      />
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="font-medium mb-4">Endereço</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <Label>CEP *</Label>
                      <Input
                        value={nfeForm.destinatario.cep}
                        onChange={(e) =>
                          setNfeForm({
                            ...nfeForm,
                            destinatario: { ...nfeForm.destinatario, cep: e.target.value },
                          })
                        }
                        placeholder="00000-000"
                      />
                    </div>

                    <div className="col-span-2">
                      <Label>Logradouro *</Label>
                      <Input
                        value={nfeForm.destinatario.logradouro}
                        onChange={(e) =>
                          setNfeForm({
                            ...nfeForm,
                            destinatario: { ...nfeForm.destinatario, logradouro: e.target.value },
                          })
                        }
                      />
                    </div>

                    <div>
                      <Label>Número *</Label>
                      <Input
                        value={nfeForm.destinatario.numero}
                        onChange={(e) =>
                          setNfeForm({
                            ...nfeForm,
                            destinatario: { ...nfeForm.destinatario, numero: e.target.value },
                          })
                        }
                      />
                    </div>

                    <div className="col-span-2">
                      <Label>Bairro *</Label>
                      <Input
                        value={nfeForm.destinatario.bairro}
                        onChange={(e) =>
                          setNfeForm({
                            ...nfeForm,
                            destinatario: { ...nfeForm.destinatario, bairro: e.target.value },
                          })
                        }
                      />
                    </div>

                    <div className="col-span-2">
                      <Label>Complemento</Label>
                      <Input
                        value={nfeForm.destinatario.complemento}
                        onChange={(e) =>
                          setNfeForm({
                            ...nfeForm,
                            destinatario: { ...nfeForm.destinatario, complemento: e.target.value },
                          })
                        }
                      />
                    </div>

                    <div className="col-span-2">
                      <Label>Cidade *</Label>
                      <Input
                        value={nfeForm.destinatario.cidade}
                        onChange={(e) =>
                          setNfeForm({
                            ...nfeForm,
                            destinatario: { ...nfeForm.destinatario, cidade: e.target.value },
                          })
                        }
                      />
                    </div>

                    <div className="col-span-2">
                      <Label>Estado *</Label>
                      <Select
                        value={nfeForm.destinatario.estado}
                        onValueChange={(value) =>
                          setNfeForm({
                            ...nfeForm,
                            destinatario: { ...nfeForm.destinatario, estado: value },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {brazilianStates.map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              {/* ABA 3: PRODUTOS/SERVIÇOS */}
              <TabsContent value="produtos" className="space-y-6 mt-0">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">Itens da NF-e</h3>
                    <Button
                      size="sm"
                      onClick={() => setShowAddItemDialog(true)}
                      className="bg-[rgb(32,251,225)] hover:bg-[#18CBB5] text-[rgb(0,0,0)]"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Item
                    </Button>
                  </div>

                  {nfeForm.itens.length > 0 ? (
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">#</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="w-[120px]">NCM</TableHead>
                            <TableHead className="w-[100px]">Qtd</TableHead>
                            <TableHead className="w-[120px]">Valor Unit.</TableHead>
                            <TableHead className="w-[140px]">Total</TableHead>
                            <TableHead className="w-[80px] text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {nfeForm.itens.map((item: any, index: number) => (
                            <TableRow key={item.id}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>{item.descricao}</TableCell>
                              <TableCell>{item.ncm}</TableCell>
                              <TableCell>
                                {item.quantidade} {item.unidade}
                              </TableCell>
                              <TableCell>
                                R$ {item.valorUnitario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell>
                                R$ {item.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveItem(item.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500 border rounded-lg bg-gray-50">
                      <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p>Nenhum item adicionado</p>
                      <p className="text-sm mt-1">Clique em "Adicionar Item" para começar</p>
                    </div>
                  )}
                </Card>
              </TabsContent>

              {/* ABA 4: TOTAIS (COM SUBABAS) */}
              <TabsContent value="totais" className="space-y-6 mt-0">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">Totalizadores da NF-e</h3>
                    <Button
                      size="sm"
                      onClick={handleCalculateTotals}
                      disabled={isCalculating || nfeForm.itens.length === 0}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Calculator className="w-4 h-4 mr-2" />
                      {isCalculating ? "Calculando..." : "Calcular Impostos"}
                    </Button>
                  </div>

                  <Tabs value={activeTotaisTab} onValueChange={setActiveTotaisTab}>
                    <TabsList className="grid grid-cols-4 w-full mb-4">
                      <TabsTrigger value="icms">ICMS</TabsTrigger>
                      <TabsTrigger value="issqn">ISSQN</TabsTrigger>
                      <TabsTrigger value="retencoes">Retenções</TabsTrigger>
                      <TabsTrigger value="reforma">Reforma Tributária</TabsTrigger>
                    </TabsList>

                    {/* SUBABA: ICMS */}
                    <TabsContent value="icms" className="space-y-4">
                      <div className="grid grid-cols-4 gap-4">
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <Label className="text-xs text-gray-600">Base de Cálculo ICMS</Label>
                          <p className="text-lg font-semibold text-blue-700">
                            R$ {nfeForm.totais.baseCalculoICMS.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <Label className="text-xs text-gray-600">Valor ICMS</Label>
                          <p className="text-lg font-semibold text-blue-700">
                            R$ {nfeForm.totais.valorICMS.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                          <Label className="text-xs text-gray-600">Base ICMS-ST</Label>
                          <p className="text-lg font-semibold text-purple-700">
                            R$ {nfeForm.totais.baseCalculoICMSST.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                          <Label className="text-xs text-gray-600">Valor ICMS-ST</Label>
                          <p className="text-lg font-semibold text-purple-700">
                            R$ {nfeForm.totais.valorICMSST.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                          <Label className="text-xs text-gray-600">Valor IPI</Label>
                          <p className="text-lg font-semibold text-indigo-700">
                            R$ {nfeForm.totais.valorIPI.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <Label className="text-xs text-gray-600">Valor PIS</Label>
                          <p className="text-lg font-semibold text-green-700">
                            R$ {nfeForm.totais.valorPIS.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <Label className="text-xs text-gray-600">Valor COFINS</Label>
                          <p className="text-lg font-semibold text-green-700">
                            R$ {nfeForm.totais.valorCOFINS.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg">
                          <Label className="text-xs text-gray-600">Valor Produtos</Label>
                          <p className="text-lg font-semibold">
                            R$ {nfeForm.totais.valorProdutos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      <Separator />

                      <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm text-gray-700">VALOR TOTAL DA NF-e</Label>
                            <p className="text-xs text-gray-600 mt-1">Impostos calculados conforme legislação vigente</p>
                          </div>
                          <p className="text-3xl font-bold text-green-700">
                            R$ {nfeForm.totais.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </TabsContent>

                    {/* SUBABA: ISSQN */}
                    <TabsContent value="issqn" className="space-y-4">
                      <div className="text-center py-8 text-gray-500">
                        <p>ISSQN não aplicável para esta NF-e</p>
                        <p className="text-sm mt-1">Utilize para prestação de serviços</p>
                      </div>
                    </TabsContent>

                    {/* SUBABA: RETENÇÕES */}
                    <TabsContent value="retencoes" className="space-y-4">
                      <div className="grid grid-cols-4 gap-4">
                        <div className="p-4 bg-gray-50 border rounded-lg">
                          <Label className="text-xs text-gray-600">PIS Retido</Label>
                          <p className="text-lg font-semibold">R$ 0,00</p>
                        </div>
                        <div className="p-4 bg-gray-50 border rounded-lg">
                          <Label className="text-xs text-gray-600">COFINS Retido</Label>
                          <p className="text-lg font-semibold">R$ 0,00</p>
                        </div>
                        <div className="p-4 bg-gray-50 border rounded-lg">
                          <Label className="text-xs text-gray-600">IR Retido</Label>
                          <p className="text-lg font-semibold">R$ 0,00</p>
                        </div>
                        <div className="p-4 bg-gray-50 border rounded-lg">
                          <Label className="text-xs text-gray-600">CSLL Retida</Label>
                          <p className="text-lg font-semibold">R$ 0,00</p>
                        </div>
                      </div>
                    </TabsContent>

                    {/* SUBABA: REFORMA TRIBUTÁRIA */}
                    <TabsContent value="reforma" className="space-y-4">
                      <div className="text-center py-8 text-gray-500">
                        <p>Reforma Tributária (IBS/CBS)</p>
                        <p className="text-sm mt-1">Vigência a partir de 2026</p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </Card>
              </TabsContent>

              {/* ABA 5: TRANSPORTE */}
              <TabsContent value="transporte" className="space-y-6 mt-0">
                <Card className="p-6">
                  <h3 className="font-medium mb-4">Dados de Transporte</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-4">
                      <Label>Modalidade do Frete</Label>
                      <Select
                        value={nfeForm.transporte?.modalidadeFrete || "9"}
                        onValueChange={(value) =>
                          setNfeForm({
                            ...nfeForm,
                            transporte: { ...nfeForm.transporte, modalidadeFrete: value },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0 - Contratação do Frete por conta do Remetente (CIF)</SelectItem>
                          <SelectItem value="1">1 - Contratação do Frete por conta do Destinatário (FOB)</SelectItem>
                          <SelectItem value="2">2 - Contratação do Frete por conta de Terceiros</SelectItem>
                          <SelectItem value="3">3 - Transporte Próprio por conta do Remetente</SelectItem>
                          <SelectItem value="4">4 - Transporte Próprio por conta do Destinatário</SelectItem>
                          <SelectItem value="9">9 - Sem Ocorrência de Transporte</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-gray-50 border rounded-lg text-center text-gray-500 text-sm">
                    Dados da transportadora, veículo e volumes podem ser preenchidos após a geração da NF-e
                  </div>
                </Card>
              </TabsContent>

              {/* ABA 6: INFORMAÇÕES ADICIONAIS */}
              <TabsContent value="informacoes" className="space-y-6 mt-0">
                <Card className="p-6">
                  <Tabs value={activeInfoTab} onValueChange={setActiveInfoTab}>
                    <TabsList className="grid grid-cols-2 w-full mb-4">
                      <TabsTrigger value="contribuinte">Para o Contribuinte</TabsTrigger>
                      <TabsTrigger value="fisco">Para o Fisco</TabsTrigger>
                    </TabsList>

                    <TabsContent value="contribuinte" className="space-y-4">
                      <div>
                        <Label>Informações Complementares (visível ao cliente)</Label>
                        <Textarea
                          value={nfeForm.informacoesAdicionais}
                          onChange={(e) =>
                            setNfeForm({ ...nfeForm, informacoesAdicionais: e.target.value })
                          }
                          placeholder="Ex: Forma de pagamento, condições de entrega, etc."
                          rows={6}
                          className="mt-2"
                        />
                        <p className="text-xs text-gray-600 mt-1">
                          Máximo de 5.000 caracteres
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="fisco" className="space-y-4">
                      <div>
                        <Label>Informações de Interesse do Fisco</Label>
                        <Textarea
                          value={nfeForm.informacoesFisco || ""}
                          onChange={(e) =>
                            setNfeForm({ ...nfeForm, informacoesFisco: e.target.value })
                          }
                          placeholder="Ex: Dados técnicos, informações adicionais para a SEFAZ"
                          rows={6}
                          className="mt-2"
                        />
                        <p className="text-xs text-gray-600 mt-1">
                          Máximo de 2.000 caracteres
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </Card>
              </TabsContent>
            </div>
          </Tabs>

          {/* BOTÕES DE AÇÃO */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button variant="outline" onClick={handleSaveDraft}>
              <Save className="w-4 h-4 mr-2" />
              Salvar Rascunho
            </Button>
            <Button
              onClick={handleGenerateXml}
              disabled={isGeneratingXml || nfeForm.itens.length === 0}
              className="bg-[rgb(32,251,225)] hover:bg-[#18CBB5] text-[rgb(0,0,0)]"
            >
              <FileText className="w-4 h-4 mr-2" />
              {isGeneratingXml ? "Gerando..." : "Gerar e Transmitir NF-e"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG DE ADICIONAR ITEM */}
      <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Item</DialogTitle>
            <DialogDescription>
              Preencha os dados do produto e os impostos aplicáveis
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Dados do Produto */}
            <div>
              <h3 className="font-medium mb-4">Dados do Produto</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Descrição *</Label>
                  <Input
                    value={newItem.descricao}
                    onChange={(e) => setNewItem({ ...newItem, descricao: e.target.value })}
                    placeholder="Nome do produto"
                  />
                </div>
                <div>
                  <Label>NCM *</Label>
                  <Input
                    value={newItem.ncm}
                    onChange={(e) => setNewItem({ ...newItem, ncm: e.target.value })}
                    placeholder="12345678"
                    maxLength={8}
                  />
                </div>
                <div>
                  <Label>CFOP *</Label>
                  <Select
                    value={newItem.cfop}
                    onValueChange={(value) => setNewItem({ ...newItem, cfop: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {CFOP_OPTIONS.slice(0, 10).map((cfop) => (
                        <SelectItem key={cfop.value} value={cfop.value}>
                          {cfop.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Unidade *</Label>
                  <Select
                    value={newItem.unidade}
                    onValueChange={(value) => setNewItem({ ...newItem, unidade: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UN">UN - Unidade</SelectItem>
                      <SelectItem value="KG">KG - Quilograma</SelectItem>
                      <SelectItem value="LT">LT - Litro</SelectItem>
                      <SelectItem value="MT">MT - Metro</SelectItem>
                      <SelectItem value="CX">CX - Caixa</SelectItem>
                      <SelectItem value="PC">PC - Peça</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Quantidade *</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={newItem.quantidade}
                    onChange={(e) =>
                      setNewItem({ ...newItem, quantidade: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <Label>Valor Unitário *</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={newItem.valorUnitario}
                    onChange={(e) =>
                      setNewItem({ ...newItem, valorUnitario: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <Label>Valor Total</Label>
                  <Input
                    value={(newItem.quantidade * newItem.valorUnitario).toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Impostos */}
            <div>
              <h3 className="font-medium mb-4">Impostos</h3>
              <div className="grid grid-cols-4 gap-4">
                {/* ICMS */}
                <div className="col-span-4">
                  <Label className="text-sm font-semibold">ICMS</Label>
                </div>
                <div>
                  <Label>Origem *</Label>
                  <Select
                    value={newItem.icmsOrigem}
                    onValueChange={(value) => setNewItem({ ...newItem, icmsOrigem: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 - Nacional</SelectItem>
                      <SelectItem value="1">1 - Estrangeira (Importação direta)</SelectItem>
                      <SelectItem value="2">2 - Estrangeira (Mercado interno)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>CST *</Label>
                  <Input
                    value={newItem.icmsCst}
                    onChange={(e) => setNewItem({ ...newItem, icmsCst: e.target.value })}
                    maxLength={2}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Alíquota ICMS (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newItem.icmsAliquota}
                    onChange={(e) =>
                      setNewItem({ ...newItem, icmsAliquota: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>

                {/* IPI */}
                <div className="col-span-4 mt-2">
                  <Label className="text-sm font-semibold">IPI</Label>
                </div>
                <div>
                  <Label>CST IPI *</Label>
                  <Input
                    value={newItem.ipiCst}
                    onChange={(e) => setNewItem({ ...newItem, ipiCst: e.target.value })}
                    maxLength={2}
                  />
                </div>
                <div>
                  <Label>Alíquota IPI (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newItem.ipiAliquota}
                    onChange={(e) =>
                      setNewItem({ ...newItem, ipiAliquota: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>

                {/* PIS/COFINS */}
                <div className="col-span-4 mt-2">
                  <Label className="text-sm font-semibold">PIS / COFINS</Label>
                </div>
                <div>
                  <Label>CST PIS *</Label>
                  <Input
                    value={newItem.pisCst}
                    onChange={(e) => setNewItem({ ...newItem, pisCst: e.target.value })}
                    maxLength={2}
                  />
                </div>
                <div>
                  <Label>Alíquota PIS (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newItem.pisAliquota}
                    onChange={(e) =>
                      setNewItem({ ...newItem, pisAliquota: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <Label>CST COFINS *</Label>
                  <Input
                    value={newItem.cofinsCst}
                    onChange={(e) => setNewItem({ ...newItem, cofinsCst: e.target.value })}
                    maxLength={2}
                  />
                </div>
                <div>
                  <Label>Alíquota COFINS (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newItem.cofinsAliquota}
                    onChange={(e) =>
                      setNewItem({ ...newItem, cofinsAliquota: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAddItemDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleAddItem}
                className="bg-[rgb(32,251,225)] hover:bg-[#18CBB5] text-[rgb(0,0,0)]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
