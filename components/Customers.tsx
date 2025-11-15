import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "./ui/dropdown-menu";
import { Plus, Search, Users, Mail, Phone, SearchIcon, Loader2, Building2, MoreVertical, Edit, History, Calendar, User, Package, Tag, DollarSign, Eye } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { useERP } from "../contexts/ERPContext";
import { validateCustomer, validateEmail, formatCPF, formatCNPJ, formatCEP, formatPhone, type ValidationResult } from "../utils/fieldValidation";
import { ValidationFeedback } from "./ValidationFeedback";
import { formatDateLocal } from "../utils/dateUtils";

interface Customer {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  totalOrders: number;
  totalSpent: number;
  status: "Ativo" | "Inativo";
  // Novos campos
  documentType: "PJ" | "PF";
  document: string; // CNPJ ou CPF
  tradeName: string; // Nome Fantasia ou Nome Curto
  segment: string;
  contactPerson: string;
  stateRegistration: string;
  cityRegistration: string;
  icmsContributor: boolean;
  // Endereço detalhado
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  priceTableId?: string; // ID da tabela de preço vinculada
}

interface Segment {
  id: string;
  name: string;
}

interface OrderHistory {
  id: string;
  customerId: string;
  orderNumber: string;
  issueDate: string;
  deliveryDate: string;
  totalValue: number;
  status: "Pendente" | "Em Processamento" | "Enviado" | "Entregue" | "Cancelado";
  seller: string;
}

const initialCustomers: Customer[] = [];

const initialOrderHistory: OrderHistory[] = [];

export function Customers() {
  const { customers, addCustomer, updateCustomer, priceTables, getPriceTableById, getDefaultPriceTable } = useERP();
  const [orderHistory, setOrderHistory] = useState<OrderHistory[]>(initialOrderHistory);
  const [segments, setSegments] = useState<Segment[]>([
    { id: "1", name: "Varejo" },
    { id: "2", name: "Atacado" },
    { id: "3", name: "Alimentação" },
    { id: "4", name: "Construção" },
    { id: "5", name: "Indústria" },
  ]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isSegmentDialogOpen, setIsSegmentDialogOpen] = useState(false);
  const [isPriceTableDialogOpen, setIsPriceTableDialogOpen] = useState(false);
  const [newSegmentName, setNewSegmentName] = useState("");
  const [isSearchingCNPJ, setIsSearchingCNPJ] = useState(false);
  const [isEditSearchingCNPJ, setIsEditSearchingCNPJ] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [newCustomerValidation, setNewCustomerValidation] = useState<ValidationResult | null>(null);
  const [editCustomer, setEditCustomer] = useState({
    documentType: "PJ" as "PJ" | "PF",
    document: "",
    name: "",
    company: "",
    tradeName: "",
    segment: "",
    phone: "",
    contactPerson: "",
    email: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: "",
    stateRegistration: "",
    cityRegistration: "",
    icmsContributor: true,
    priceTableId: ""
  });

  const [newCustomer, setNewCustomer] = useState({
    documentType: "PJ" as "PJ" | "PF",
    document: "",
    name: "",
    company: "",
    tradeName: "",
    segment: "",
    phone: "",
    contactPerson: "",
    email: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: "",
    stateRegistration: "",
    cityRegistration: "",
    icmsContributor: true,
    priceTableId: ""
  });

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setEditCustomer({
      documentType: customer.documentType,
      document: customer.document,
      name: customer.name,
      company: customer.company,
      tradeName: customer.tradeName,
      segment: customer.segment,
      phone: customer.phone,
      contactPerson: customer.contactPerson,
      email: customer.email,
      street: customer.street,
      number: customer.number,
      complement: customer.complement,
      neighborhood: customer.neighborhood,
      city: customer.city,
      state: customer.state,
      zipCode: customer.zipCode,
      stateRegistration: customer.stateRegistration,
      cityRegistration: customer.cityRegistration,
      icmsContributor: customer.icmsContributor,
      priceTableId: customer.priceTableId || ""
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedCustomer) return;

    // VALIDAÇÃO DE E-MAIL
    if (editCustomer.email && !validateEmail(editCustomer.email)) {
      toast.error("E-mail inválido", {
        description: "Por favor, corrija o e-mail antes de salvar. Formato esperado: usuario@exemplo.com"
      });
      return;
    }

    // VALIDAÇÃO COMPLETA
    const validation = validateCustomer({
      ...editCustomer,
      name: editCustomer.documentType === "PJ" ? editCustomer.company : editCustomer.name,
      address: `${editCustomer.street} ${editCustomer.number}`
    });
    
    setValidationResult(validation);
    
    if (!validation.isValid) {
      // Exibir mensagem detalhada com a lista de erros
      toast.error(`${validation.errors.length} erro(s) encontrado(s)`, {
        description: validation.errors.join(', '),
        duration: 6000
      });
      
      // Log detalhado no console para debugging
      console.error('❌ ERROS DE VALIDAÇÃO:');
      validation.errors.forEach((error, index) => {
        console.error(`  ${index + 1}. ${error}`);
      });
      console.error('\n📋 DETALHES DOS CAMPOS:');
      validation.fields.forEach(field => {
        if (!field.isValid && field.required) {
          console.error(`  ❌ ${field.label}: ${field.message}`);
        }
      });
      return;
    }

    if (validation.warnings.length > 0) {
      console.log('ℹ️ Informações de validação (campos opcionais):', validation.warnings);
    }

    const fullAddress = `${editCustomer.street} ${editCustomer.number}${editCustomer.complement ? ', ' + editCustomer.complement : ''}, ${editCustomer.neighborhood}, ${editCustomer.city}, ${editCustomer.state} ${editCustomer.zipCode}`;

    // Atualizar no contexto global (persiste automaticamente)
    updateCustomer(selectedCustomer.id, {
      documentType: editCustomer.documentType,
      document: editCustomer.document,
      name: editCustomer.documentType === "PJ" ? editCustomer.company : editCustomer.name,
      company: editCustomer.documentType === "PJ" ? editCustomer.company : editCustomer.name,
      tradeName: editCustomer.tradeName,
      segment: editCustomer.segment,
      contactPerson: editCustomer.contactPerson,
      email: editCustomer.email,
      phone: editCustomer.phone,
      address: fullAddress,
      street: editCustomer.street,
      number: editCustomer.number,
      complement: editCustomer.complement,
      neighborhood: editCustomer.neighborhood,
      city: editCustomer.city,
      state: editCustomer.state,
      zipCode: editCustomer.zipCode,
      stateRegistration: editCustomer.stateRegistration,
      cityRegistration: editCustomer.cityRegistration,
      icmsContributor: editCustomer.icmsContributor,
      priceTableId: editCustomer.priceTableId || undefined
    });
    
    setIsEditDialogOpen(false);
    setSelectedCustomer(null);
    toast.success("Cliente atualizado com sucesso!");
  };

  const handleHistoryClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsHistoryDialogOpen(true);
  };

  const getCustomerOrders = (customerId: string) => {
    return orderHistory.filter(order => order.customerId === customerId);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      "Pendente": "bg-yellow-100 text-yellow-700",
      "Em Processamento": "bg-blue-100 text-blue-700",
      "Enviado": "bg-purple-100 text-purple-700",
      "Entregue": "bg-green-100 text-green-700",
      "Cancelado": "bg-red-100 text-red-700"
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const handleEditSearchCNPJ = async () => {
    if (!editCustomer.document) {
      toast.error("Digite um CNPJ para buscar");
      return;
    }

    const cnpj = editCustomer.document.replace(/\D/g, '');
    
    if (cnpj.length !== 14) {
      toast.error("CNPJ deve ter 14 dígitos");
      return;
    }

    setIsEditSearchingCNPJ(true);
    
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          toast.error("CNPJ não encontrado na base de dados");
        } else if (response.status === 429) {
          toast.error("Muitas requisições. Tente novamente em alguns segundos.");
        } else {
          toast.error("Erro ao buscar CNPJ. Tente novamente.");
        }
        return;
      }

      const data = await response.json();
      
      let phoneFormatted = "";
      if (data.ddd_telefone_1) {
        const ddd = data.ddd_telefone_1.substring(0, 2);
        const tel = data.ddd_telefone_1.substring(2);
        if (tel.length === 8) {
          phoneFormatted = `+55 (${ddd}) ${tel.substring(0, 4)}-${tel.substring(4)}`;
        } else if (tel.length === 9) {
          phoneFormatted = `+55 (${ddd}) ${tel.substring(0, 5)}-${tel.substring(5)}`;
        } else {
          phoneFormatted = `+55 (${ddd}) ${tel}`;
        }
      }
      
      setEditCustomer({
        ...editCustomer,
        company: data.razao_social || "",
        tradeName: data.nome_fantasia || data.razao_social || "",
        phone: phoneFormatted || editCustomer.phone,
        email: data.email || editCustomer.email,
        street: data.logradouro || "",
        number: data.numero || "",
        complement: data.complemento || "",
        neighborhood: data.bairro || "",
        city: data.municipio || "",
        state: data.uf || "",
        zipCode: data.cep ? data.cep.replace(/(\d{5})(\d{3})/, '$1-$2') : "",
      });
      
      toast.success("Dados do CNPJ carregados com sucesso!");
    } catch (error) {
      toast.error("Erro ao conectar com o serviço de busca. Tente novamente.");
      console.error("Erro na busca CNPJ:", error);
    } finally {
      setIsEditSearchingCNPJ(false);
    }
  };

  const handleSearchCNPJ = async () => {
    if (!newCustomer.document) {
      toast.error("Digite um CNPJ para buscar");
      return;
    }

    const cnpj = newCustomer.document.replace(/\D/g, '');
    
    if (cnpj.length !== 14) {
      toast.error("CNPJ deve ter 14 dígitos");
      return;
    }

    setIsSearchingCNPJ(true);
    
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          toast.error("CNPJ não encontrado na base de dados");
        } else if (response.status === 429) {
          toast.error("Muitas requisições. Tente novamente em alguns segundos.");
        } else {
          toast.error("Erro ao buscar CNPJ. Tente novamente.");
        }
        return;
      }

      const data = await response.json();
      
      // Formata o telefone se existir
      let phoneFormatted = "";
      if (data.ddd_telefone_1) {
        const ddd = data.ddd_telefone_1.substring(0, 2);
        const tel = data.ddd_telefone_1.substring(2);
        if (tel.length === 8) {
          phoneFormatted = `+55 (${ddd}) ${tel.substring(0, 4)}-${tel.substring(4)}`;
        } else if (tel.length === 9) {
          phoneFormatted = `+55 (${ddd}) ${tel.substring(0, 5)}-${tel.substring(5)}`;
        } else {
          phoneFormatted = `+55 (${ddd}) ${tel}`;
        }
      }
      
      setNewCustomer({
        ...newCustomer,
        company: data.razao_social || "",
        tradeName: data.nome_fantasia || data.razao_social || "",
        phone: phoneFormatted || newCustomer.phone,
        email: data.email || newCustomer.email,
        street: data.logradouro || "",
        number: data.numero || "",
        complement: data.complemento || "",
        neighborhood: data.bairro || "",
        city: data.municipio || "",
        state: data.uf || "",
        zipCode: data.cep ? data.cep.replace(/(\d{5})(\d{3})/, '$1-$2') : "",
      });
      
      toast.success("Dados do CNPJ carregados com sucesso!");
    } catch (error) {
      toast.error("Erro ao conectar com o serviço de busca. Tente novamente.");
      console.error("Erro na busca CNPJ:", error);
    } finally {
      setIsSearchingCNPJ(false);
    }
  };

  const handleAddSegment = () => {
    if (!newSegmentName.trim()) {
      toast.error("Digite um nome para o segmento");
      return;
    }

    const newSegment: Segment = {
      id: String(segments.length + 1),
      name: newSegmentName
    };

    setSegments([...segments, newSegment]);
    setNewCustomer({ ...newCustomer, segment: newSegmentName });
    setNewSegmentName("");
    setIsSegmentDialogOpen(false);
    toast.success("Segmento adicionado com sucesso!");
  };

  const handleAddCustomer = () => {
    // VALIDAÇÃO DE E-MAIL
    if (newCustomer.email && !validateEmail(newCustomer.email)) {
      toast.error("E-mail inválido", {
        description: "Por favor, corrija o e-mail antes de salvar. Formato esperado: usuario@exemplo.com"
      });
      return;
    }

    // VALIDAÇÃO COMPLETA
    const validation = validateCustomer({
      ...newCustomer,
      name: newCustomer.documentType === "PJ" ? newCustomer.company : newCustomer.name,
      address: `${newCustomer.street} ${newCustomer.number}`
    });
    
    setNewCustomerValidation(validation);
    
    if (!validation.isValid) {
      // Exibir mensagem detalhada com a lista de erros
      const errorList = validation.errors.map((err, idx) => `${idx + 1}. ${err}`).join('\n');
      toast.error(`${validation.errors.length} erro(s) encontrado(s)`, {
        description: validation.errors.join(', '),
        duration: 6000
      });
      
      // Log detalhado no console para debugging
      console.error('❌ ERROS DE VALIDAÇÃO:');
      validation.errors.forEach((error, index) => {
        console.error(`  ${index + 1}. ${error}`);
      });
      console.error('\n📋 DETALHES DOS CAMPOS:');
      validation.fields.forEach(field => {
        if (!field.isValid && field.required) {
          console.error(`  ❌ ${field.label}: ${field.message}`);
        }
      });
      return;
    }

    if (validation.warnings.length > 0) {
      console.log('ℹ️ Informações de validação (campos opcionais):', validation.warnings);
    }

    const fullAddress = `${newCustomer.street} ${newCustomer.number}${newCustomer.complement ? ', ' + newCustomer.complement : ''}, ${newCustomer.neighborhood}, ${newCustomer.city}, ${newCustomer.state} ${newCustomer.zipCode}`;

    // Adicionar no contexto global (persiste automaticamente)
    addCustomer({
      documentType: newCustomer.documentType,
      document: newCustomer.document,
      name: newCustomer.documentType === "PJ" ? newCustomer.company : newCustomer.name,
      company: newCustomer.documentType === "PJ" ? newCustomer.company : newCustomer.name,
      tradeName: newCustomer.tradeName,
      segment: newCustomer.segment,
      contactPerson: newCustomer.contactPerson,
      email: newCustomer.email,
      phone: newCustomer.phone,
      address: fullAddress,
      street: newCustomer.street,
      number: newCustomer.number,
      complement: newCustomer.complement,
      neighborhood: newCustomer.neighborhood,
      city: newCustomer.city,
      state: newCustomer.state,
      zipCode: newCustomer.zipCode,
      stateRegistration: newCustomer.stateRegistration,
      cityRegistration: newCustomer.cityRegistration,
      icmsContributor: newCustomer.icmsContributor,
      status: "Ativo",
      priceTableId: newCustomer.priceTableId || undefined
    });
    setNewCustomer({
      documentType: "PJ",
      document: "",
      name: "",
      company: "",
      tradeName: "",
      segment: "",
      phone: "",
      contactPerson: "",
      email: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zipCode: "",
      stateRegistration: "",
      cityRegistration: "",
      icmsContributor: true,
      priceTableId: ""
    });
    setIsDialogOpen(false);
    // Toast já é exibido pela função addCustomer do contexto
  };

  const activeCustomers = customers.filter(c => c.status === "Ativo").length;
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-gray-900 mb-2">Gestão de Clientes</h1>
            <p className="text-gray-600">Gerencie sua base de clientes</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[rgb(32,251,225)] hover:bg-[#18CBB5] text-[rgb(0,0,0)]">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Adicionar Novo Cliente</DialogTitle>
                <DialogDescription>
                  Preencha os dados do cliente abaixo. Campos marcados com * são obrigatórios.
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto px-1">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
                    <TabsTrigger value="contact">Contato</TabsTrigger>
                    <TabsTrigger value="address">Endereço</TabsTrigger>
                    <TabsTrigger value="pricing">Tabela de Preço</TabsTrigger>
                  </TabsList>

                  {/* Tab: Dados Básicos */}
                  <TabsContent value="basic" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Tipo *</Label>
                        <Select 
                          value={newCustomer.documentType} 
                          onValueChange={(value: "PJ" | "PF") => setNewCustomer({...newCustomer, documentType: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PJ">Pessoa Jurídica (PJ)</SelectItem>
                            <SelectItem value="PF">Pessoa Física (PF)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>{newCustomer.documentType === "PJ" ? "CNPJ *" : "CPF *"}</Label>
                        <div className="flex gap-2">
                          <Input
                            value={newCustomer.document}
                            onChange={(e) => {
                              const formatted = newCustomer.documentType === "PJ" 
                                ? formatCNPJ(e.target.value)
                                : formatCPF(e.target.value);
                              setNewCustomer({...newCustomer, document: formatted});
                            }}
                            placeholder={newCustomer.documentType === "PJ" ? "00.000.000/0000-00" : "000.000.000-00"}
                          />
                          {newCustomer.documentType === "PJ" && (
                            <Button 
                              type="button"
                              variant="outline" 
                              size="icon"
                              onClick={handleSearchCNPJ}
                              disabled={isSearchingCNPJ}
                              title="Buscar dados do CNPJ automaticamente"
                              className="shrink-0"
                            >
                              {isSearchingCNPJ ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <SearchIcon className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </div>
                        {newCustomer.documentType === "PJ" && (
                          <p className="text-xs text-gray-500 mt-1">
                            💡 Clique na lupa para preencher automaticamente os dados da empresa
                          </p>
                        )}
                      </div>
                    </div>

                    {newCustomer.documentType === "PJ" ? (
                      <>
                        <div>
                          <Label>Razão Social *</Label>
                          <Input
                            value={newCustomer.company}
                            onChange={(e) => setNewCustomer({...newCustomer, company: e.target.value})}
                            placeholder="Nome completo da empresa"
                          />
                        </div>
                        <div>
                          <Label>Nome Fantasia</Label>
                          <Input
                            value={newCustomer.tradeName}
                            onChange={(e) => setNewCustomer({...newCustomer, tradeName: e.target.value})}
                            placeholder="Nome comercial da empresa"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <Label>Nome Completo *</Label>
                          <Input
                            value={newCustomer.name}
                            onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                            placeholder="Nome completo do cliente"
                          />
                        </div>
                        <div>
                          <Label>Nome Curto</Label>
                          <Input
                            value={newCustomer.tradeName}
                            onChange={(e) => setNewCustomer({...newCustomer, tradeName: e.target.value})}
                            placeholder="Como prefere ser chamado"
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <Label>Segmento *</Label>
                      <div className="flex gap-2">
                        <Select 
                          value={newCustomer.segment} 
                          onValueChange={(value) => setNewCustomer({...newCustomer, segment: value})}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Selecione o segmento" />
                          </SelectTrigger>
                          <SelectContent>
                            {segments.map((segment) => (
                              <SelectItem key={segment.id} value={segment.name}>
                                {segment.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Dialog open={isSegmentDialogOpen} onOpenChange={setIsSegmentDialogOpen}>
                          <DialogTrigger asChild>
                            <Button type="button" variant="outline" size="icon" title="Adicionar novo segmento">
                              <Plus className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Adicionar Novo Segmento</DialogTitle>
                              <DialogDescription>
                                Digite o nome do novo segmento de mercado.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                              <div>
                                <Label>Nome do Segmento</Label>
                                <Input
                                  value={newSegmentName}
                                  onChange={(e) => setNewSegmentName(e.target.value)}
                                  placeholder="ex: Farmacêutico, Tecnologia..."
                                />
                              </div>
                              <Button onClick={handleAddSegment} className="w-full bg-green-600 hover:bg-green-700">
                                Adicionar Segmento
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>

                    {newCustomer.documentType === "PJ" && (
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Inscrição Estadual</Label>
                          <Input
                            value={newCustomer.stateRegistration}
                            onChange={(e) => setNewCustomer({...newCustomer, stateRegistration: e.target.value})}
                            placeholder="000.000.000.000"
                          />
                        </div>
                        <div>
                          <Label>Inscrição Municipal</Label>
                          <Input
                            value={newCustomer.cityRegistration}
                            onChange={(e) => setNewCustomer({...newCustomer, cityRegistration: e.target.value})}
                            placeholder="0000000"
                          />
                        </div>
                        <div>
                          <Label>Contribuinte ICMS</Label>
                          <Select 
                            value={newCustomer.icmsContributor ? "sim" : "nao"} 
                            onValueChange={(value) => setNewCustomer({...newCustomer, icmsContributor: value === "sim"})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sim">Sim</SelectItem>
                              <SelectItem value="nao">Não</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* Tab: Contato */}
                  <TabsContent value="contact" className="space-y-4 mt-4">
                    <div>
                      <Label>Pessoa de Contato</Label>
                      <Input
                        value={newCustomer.contactPerson}
                        onChange={(e) => setNewCustomer({...newCustomer, contactPerson: e.target.value})}
                        placeholder="Nome da pessoa responsável"
                      />
                    </div>
                    <div>
                      <Label>E-mail Principal *</Label>
                      <Input
                        type="email"
                        value={newCustomer.email}
                        onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                        onBlur={(e) => {
                          const email = e.target.value.trim();
                          if (email && !validateEmail(email)) {
                            toast.error("E-mail inválido", {
                              description: "Por favor, insira um e-mail válido (ex: usuario@exemplo.com)"
                            });
                          }
                        }}
                        placeholder="email@exemplo.com"
                        className={newCustomer.email && !validateEmail(newCustomer.email) ? "border-red-500" : ""}
                      />
                      {newCustomer.email && !validateEmail(newCustomer.email) && (
                        <p className="text-xs text-red-600 mt-1">
                          ⚠️ E-mail inválido. Formato esperado: usuario@exemplo.com
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>Telefone</Label>
                      <Input
                        type="tel"
                        value={newCustomer.phone}
                        onChange={(e) => {
                          const formatted = formatPhone(e.target.value);
                          setNewCustomer({...newCustomer, phone: formatted});
                        }}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </TabsContent>

                  {/* Tab: Endereço */}
                  <TabsContent value="address" className="space-y-4 mt-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <Label>Logradouro</Label>
                        <Input
                          value={newCustomer.street}
                          onChange={(e) => setNewCustomer({...newCustomer, street: e.target.value})}
                          placeholder="Rua, Avenida..."
                        />
                      </div>
                      <div>
                        <Label>Número</Label>
                        <Input
                          value={newCustomer.number}
                          onChange={(e) => setNewCustomer({...newCustomer, number: e.target.value})}
                          placeholder="000"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Complemento</Label>
                        <Input
                          value={newCustomer.complement}
                          onChange={(e) => setNewCustomer({...newCustomer, complement: e.target.value})}
                          placeholder="Sala, Bloco, Apto..."
                        />
                      </div>
                      <div>
                        <Label>Bairro</Label>
                        <Input
                          value={newCustomer.neighborhood}
                          onChange={(e) => setNewCustomer({...newCustomer, neighborhood: e.target.value})}
                          placeholder="Bairro"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <Label>Cidade</Label>
                        <Input
                          value={newCustomer.city}
                          onChange={(e) => setNewCustomer({...newCustomer, city: e.target.value})}
                          placeholder="Cidade"
                        />
                      </div>
                      <div>
                        <Label>Estado (UF)</Label>
                        <Input
                          value={newCustomer.state}
                          onChange={(e) => setNewCustomer({...newCustomer, state: e.target.value.toUpperCase()})}
                          placeholder="SP"
                          maxLength={2}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>CEP</Label>
                      <Input
                        value={newCustomer.zipCode}
                        onChange={(e) => {
                          const formatted = formatCEP(e.target.value);
                          setNewCustomer({...newCustomer, zipCode: formatted});
                        }}
                        placeholder="00000-000"
                      />
                    </div>
                  </TabsContent>

                  {/* Tab: Tabela de Preço */}
                  <TabsContent value="pricing" className="space-y-4 mt-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <Tag className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm text-blue-900 mb-1">💰 Tabela de Preço Personalizada</h4>
                          <p className="text-xs text-blue-700">
                            Selecione uma tabela de preços específica para este cliente. Se nenhuma for selecionada, será utilizada a tabela padrão.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label>Tabela de Preço</Label>
                      <Select 
                        value={newCustomer.priceTableId || "none"} 
                        onValueChange={(value) => setNewCustomer({...newCustomer, priceTableId: value === "none" ? "" : value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma tabela (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Usar Tabela Padrão</SelectItem>
                          {priceTables
                            .filter(table => !table.isDefault)
                            .map((table) => (
                              <SelectItem key={table.id} value={table.id}>
                                {table.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {newCustomer.priceTableId && newCustomer.priceTableId !== "none" && (
                        <p className="text-xs text-gray-500 mt-1">
                          ✓ Tabela selecionada: {priceTables.find(t => t.id === newCustomer.priceTableId)?.name}
                        </p>
                      )}
                    </div>

                    {newCustomer.priceTableId && newCustomer.priceTableId !== "none" && (
                      <Card className="p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm text-gray-700">Prévia dos Preços</h4>
                          <Badge className="bg-purple-100 text-purple-700">
                            {priceTables.find(t => t.id === newCustomer.priceTableId)?.items.length || 0} produtos
                          </Badge>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {priceTables
                            .find(t => t.id === newCustomer.priceTableId)
                            ?.items.slice(0, 5)
                            .map((item, index) => (
                              <div key={index} className="flex justify-between text-sm py-1 border-b border-gray-200 last:border-0">
                                <span className="text-gray-600">{item.productName}</span>
                                <span className="text-gray-900">R$ {item.price.toFixed(2)}</span>
                              </div>
                            ))}
                        </div>
                      </Card>
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              <div className="pt-4 border-t mt-4 flex gap-2">
                <Button onClick={handleAddCustomer} className="flex-1 bg-green-600 hover:bg-green-700">
                  <Building2 className="w-4 h-4 mr-2" />
                  Adicionar Cliente
                </Button>
                <Button onClick={() => setIsDialogOpen(false)} variant="outline">
                  Cancelar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total de Clientes</p>
                <p className="text-gray-900">{customers.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Clientes Ativos</p>
                <p className="text-gray-900">{activeCustomers}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Receita Total</p>
                <p className="text-gray-900">R$ {totalRevenue.toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Pesquisar clientes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Customers Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Ações</TableHead>
              <TableHead>ID do Cliente</TableHead>
              <TableHead>Nome do Contato</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Tabela de Preço</TableHead>
              <TableHead>Total de Pedidos</TableHead>
              <TableHead>Total Gasto</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => handleEditClick(customer)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar Cadastro
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleHistoryClick(customer)}>
                        <History className="mr-2 h-4 w-4" />
                        Histórico de Pedidos
                      </DropdownMenuItem>
                      {customer.priceTableId && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => {
                            setSelectedCustomer(customer);
                            setIsPriceTableDialogOpen(true);
                          }}>
                            <Tag className="mr-2 h-4 w-4" />
                            Ver Tabela de Preço
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
                <TableCell>{customer.id}</TableCell>
                <TableCell>{customer.name}</TableCell>
                <TableCell>{customer.company}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    {customer.email}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {customer.phone}
                  </div>
                </TableCell>
                <TableCell>
                  {customer.priceTableId ? (
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-purple-600" />
                      <span className="text-sm text-purple-700">
                        {priceTables.find(t => t.id === customer.priceTableId)?.name || 'N/A'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-gray-400" />
                      Padrão
                    </span>
                  )}
                </TableCell>
                <TableCell>{customer.totalOrders}</TableCell>
                <TableCell>R$ {customer.totalSpent.toLocaleString('pt-BR')}</TableCell>
                <TableCell>
                  <span className={`inline-block px-2 py-1 rounded text-xs ${
                    customer.status === "Ativo" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                  }`}>
                    {customer.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Atualize os dados do cliente {selectedCustomer?.id}. Campos marcados com * são obrigatórios.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-1">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
                <TabsTrigger value="contact">Contato</TabsTrigger>
                <TabsTrigger value="address">Endereço</TabsTrigger>
                <TabsTrigger value="pricing">Tabela de Preço</TabsTrigger>
              </TabsList>

              {/* Tab: Dados Básicos */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo *</Label>
                    <Select 
                      value={editCustomer.documentType} 
                      onValueChange={(value: "PJ" | "PF") => setEditCustomer({...editCustomer, documentType: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PJ">Pessoa Jurídica (PJ)</SelectItem>
                        <SelectItem value="PF">Pessoa Física (PF)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>{editCustomer.documentType === "PJ" ? "CNPJ *" : "CPF *"}</Label>
                    <div className="flex gap-2">
                      <Input
                        value={editCustomer.document}
                        onChange={(e) => setEditCustomer({...editCustomer, document: e.target.value})}
                        placeholder={editCustomer.documentType === "PJ" ? "00.000.000/0000-00" : "000.000.000-00"}
                      />
                      {editCustomer.documentType === "PJ" && (
                        <Button 
                          type="button"
                          variant="outline" 
                          size="icon"
                          onClick={handleEditSearchCNPJ}
                          disabled={isEditSearchingCNPJ}
                          title="Buscar dados do CNPJ automaticamente"
                          className="shrink-0"
                        >
                          {isEditSearchingCNPJ ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <SearchIcon className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {editCustomer.documentType === "PJ" ? (
                  <>
                    <div>
                      <Label>Razão Social *</Label>
                      <Input
                        value={editCustomer.company}
                        onChange={(e) => setEditCustomer({...editCustomer, company: e.target.value})}
                        placeholder="Nome completo da empresa"
                      />
                    </div>
                    <div>
                      <Label>Nome Fantasia</Label>
                      <Input
                        value={editCustomer.tradeName}
                        onChange={(e) => setEditCustomer({...editCustomer, tradeName: e.target.value})}
                        placeholder="Nome comercial da empresa"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label>Nome Completo *</Label>
                      <Input
                        value={editCustomer.name}
                        onChange={(e) => setEditCustomer({...editCustomer, name: e.target.value})}
                        placeholder="Nome completo do cliente"
                      />
                    </div>
                    <div>
                      <Label>Nome Curto</Label>
                      <Input
                        value={editCustomer.tradeName}
                        onChange={(e) => setEditCustomer({...editCustomer, tradeName: e.target.value})}
                        placeholder="Como prefere ser chamado"
                      />
                    </div>
                  </>
                )}

                <div>
                  <Label>Segmento *</Label>
                  <Select 
                    value={editCustomer.segment} 
                    onValueChange={(value) => setEditCustomer({...editCustomer, segment: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o segmento" />
                    </SelectTrigger>
                    <SelectContent>
                      {segments.map((segment) => (
                        <SelectItem key={segment.id} value={segment.name}>
                          {segment.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {editCustomer.documentType === "PJ" && (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Inscrição Estadual</Label>
                      <Input
                        value={editCustomer.stateRegistration}
                        onChange={(e) => setEditCustomer({...editCustomer, stateRegistration: e.target.value})}
                        placeholder="000.000.000.000"
                      />
                    </div>
                    <div>
                      <Label>Inscrição Municipal</Label>
                      <Input
                        value={editCustomer.cityRegistration}
                        onChange={(e) => setEditCustomer({...editCustomer, cityRegistration: e.target.value})}
                        placeholder="0000000"
                      />
                    </div>
                    <div>
                      <Label>Contribuinte ICMS</Label>
                      <Select 
                        value={editCustomer.icmsContributor ? "sim" : "nao"} 
                        onValueChange={(value) => setEditCustomer({...editCustomer, icmsContributor: value === "sim"})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sim">Sim</SelectItem>
                          <SelectItem value="nao">Não</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Tab: Contato */}
              <TabsContent value="contact" className="space-y-4 mt-4">
                <div>
                  <Label>Pessoa de Contato</Label>
                  <Input
                    value={editCustomer.contactPerson}
                    onChange={(e) => setEditCustomer({...editCustomer, contactPerson: e.target.value})}
                    placeholder="Nome da pessoa responsável"
                  />
                </div>
                <div>
                  <Label>E-mail Principal *</Label>
                  <Input
                    type="email"
                    value={editCustomer.email}
                    onChange={(e) => setEditCustomer({...editCustomer, email: e.target.value})}
                    onBlur={(e) => {
                      const email = e.target.value.trim();
                      if (email && !validateEmail(email)) {
                        toast.error("E-mail inválido", {
                          description: "Por favor, insira um e-mail válido (ex: usuario@exemplo.com)"
                        });
                      }
                    }}
                    placeholder="email@exemplo.com"
                    className={editCustomer.email && !validateEmail(editCustomer.email) ? "border-red-500" : ""}
                  />
                  {editCustomer.email && !validateEmail(editCustomer.email) && (
                    <p className="text-xs text-red-600 mt-1">
                      ⚠️ E-mail inválido. Formato esperado: usuario@exemplo.com
                    </p>
                  )}
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input
                    type="tel"
                    value={editCustomer.phone}
                    onChange={(e) => setEditCustomer({...editCustomer, phone: e.target.value})}
                    placeholder="+55 (00) 00000-0000"
                  />
                </div>
              </TabsContent>

              {/* Tab: Endereço */}
              <TabsContent value="address" className="space-y-4 mt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Label>Logradouro</Label>
                    <Input
                      value={editCustomer.street}
                      onChange={(e) => setEditCustomer({...editCustomer, street: e.target.value})}
                      placeholder="Rua, Avenida..."
                    />
                  </div>
                  <div>
                    <Label>Número</Label>
                    <Input
                      value={editCustomer.number}
                      onChange={(e) => setEditCustomer({...editCustomer, number: e.target.value})}
                      placeholder="000"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Complemento</Label>
                    <Input
                      value={editCustomer.complement}
                      onChange={(e) => setEditCustomer({...editCustomer, complement: e.target.value})}
                      placeholder="Sala, Bloco, Apto..."
                    />
                  </div>
                  <div>
                    <Label>Bairro</Label>
                    <Input
                      value={editCustomer.neighborhood}
                      onChange={(e) => setEditCustomer({...editCustomer, neighborhood: e.target.value})}
                      placeholder="Bairro"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Label>Cidade</Label>
                    <Input
                      value={editCustomer.city}
                      onChange={(e) => setEditCustomer({...editCustomer, city: e.target.value})}
                      placeholder="Cidade"
                    />
                  </div>
                  <div>
                    <Label>Estado (UF)</Label>
                    <Input
                      value={editCustomer.state}
                      onChange={(e) => setEditCustomer({...editCustomer, state: e.target.value.toUpperCase()})}
                      placeholder="SP"
                      maxLength={2}
                    />
                  </div>
                </div>

                <div>
                  <Label>CEP</Label>
                  <Input
                    value={editCustomer.zipCode}
                    onChange={(e) => setEditCustomer({...editCustomer, zipCode: e.target.value})}
                    placeholder="00000-000"
                  />
                </div>
              </TabsContent>

              {/* Tab: Tabela de Preço */}
              <TabsContent value="pricing" className="space-y-4 mt-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <Tag className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm text-blue-900 mb-1">💰 Tabela de Preço Personalizada</h4>
                      <p className="text-xs text-blue-700">
                        Selecione uma tabela de preços específica para este cliente. Se nenhuma for selecionada, será utilizada a tabela padrão.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Tabela de Preço</Label>
                  <Select 
                    value={editCustomer.priceTableId || "none"} 
                    onValueChange={(value) => setEditCustomer({...editCustomer, priceTableId: value === "none" ? "" : value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma tabela (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Usar Tabela Padrão</SelectItem>
                      {priceTables
                        .filter(table => !table.isDefault)
                        .map((table) => (
                          <SelectItem key={table.id} value={table.id}>
                            {table.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {editCustomer.priceTableId && editCustomer.priceTableId !== "none" && (
                    <p className="text-xs text-gray-500 mt-1">
                      ✓ Tabela selecionada: {priceTables.find(t => t.id === editCustomer.priceTableId)?.name}
                    </p>
                  )}
                </div>

                {editCustomer.priceTableId && editCustomer.priceTableId !== "none" && (
                  <Card className="p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm text-gray-700">Prévia dos Preços</h4>
                      <Badge className="bg-purple-100 text-purple-700">
                        {priceTables.find(t => t.id === editCustomer.priceTableId)?.items.length || 0} produtos
                      </Badge>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {priceTables
                        .find(t => t.id === editCustomer.priceTableId)
                        ?.items.slice(0, 5)
                        .map((item, index) => (
                          <div key={index} className="flex justify-between text-sm py-1 border-b border-gray-200 last:border-0">
                            <span className="text-gray-600">{item.productName}</span>
                            <span className="text-gray-900">R$ {item.price.toFixed(2)}</span>
                          </div>
                        ))}
                    </div>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div className="pt-4 border-t mt-4 flex gap-2">
            <Button onClick={handleSaveEdit} className="flex-1 bg-green-600 hover:bg-green-700">
              <Building2 className="w-4 h-4 mr-2" />
              Salvar Alterações
            </Button>
            <Button onClick={() => setIsEditDialogOpen(false)} variant="outline">
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-[95vw] w-[1200px] h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-xl">Histórico de Pedidos</DialogTitle>
            <DialogDescription>
              Histórico completo de pedidos do cliente <span className="font-medium text-gray-700">{selectedCustomer?.company}</span> ({selectedCustomer?.id})
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden px-6 pb-6 flex flex-col">
            {/* Customer Info Card */}
            <Card className="p-4 mb-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Cliente</p>
                  <p className="text-gray-900">{selectedCustomer?.company}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Contato</p>
                  <p className="text-gray-900">{selectedCustomer?.contactPerson || selectedCustomer?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Total de Pedidos</p>
                  <p className="text-gray-900 text-lg">{selectedCustomer?.totalOrders || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Total Gasto</p>
                  <p className="text-gray-900 text-lg">R$ {selectedCustomer?.totalSpent.toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Segmento</p>
                  <p className="text-gray-900">{selectedCustomer?.segment}</p>
                </div>
              </div>
            </Card>

            {/* Orders Table */}
            <div className="flex-1 border rounded-lg overflow-hidden bg-white">
              {getCustomerOrders(selectedCustomer?.id || "").length === 0 ? (
                <div className="h-full flex items-center justify-center p-8 text-center text-gray-500">
                  <div>
                    <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg mb-2">Nenhum pedido registrado para este cliente.</p>
                    <p className="text-sm text-gray-400">Os pedidos aparecerão aqui quando forem realizados.</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-auto h-full">
                  <Table>
                    <TableHeader className="sticky top-0 bg-gray-50 z-10">
                      <TableRow>
                        <TableHead className="w-[120px]">Nº Pedido</TableHead>
                        <TableHead className="w-[110px]">Data Emissão</TableHead>
                        <TableHead className="w-[110px]">Data Entrega</TableHead>
                        <TableHead className="w-[140px] text-right">Valor Total</TableHead>
                        <TableHead className="w-[150px]">Status</TableHead>
                        <TableHead className="min-w-[150px]">Vendedor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getCustomerOrders(selectedCustomer?.id || "").map((order) => (
                        <TableRow key={order.id} className="hover:bg-gray-50">
                          <TableCell>
                            <span className="font-medium text-blue-600">{order.orderNumber}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              <span>{formatDateLocal(order.issueDate)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              <span>{formatDateLocal(order.deliveryDate)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-medium text-gray-900">
                              R$ {order.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(order.status)}>
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span>{order.seller}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm text-gray-500">
                {getCustomerOrders(selectedCustomer?.id || "").length > 0 && (
                  <>Mostrando {getCustomerOrders(selectedCustomer?.id || "").length} pedido(s)</>
                )}
              </p>
              <Button onClick={() => setIsHistoryDialogOpen(false)} variant="outline">
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Price Table View Dialog */}
      <Dialog open={isPriceTableDialogOpen} onOpenChange={setIsPriceTableDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-purple-600" />
              Tabela de Preço do Cliente
            </DialogTitle>
            <DialogDescription>
              Cliente: {selectedCustomer?.name} - {selectedCustomer?.company}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {selectedCustomer?.priceTableId && (
              <>
                <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-purple-900">
                      {priceTables.find(t => t.id === selectedCustomer.priceTableId)?.name}
                    </h4>
                    <Badge className="bg-purple-600 text-white">Personalizada</Badge>
                  </div>
                  <p className="text-sm text-purple-700">
                    {priceTables.find(t => t.id === selectedCustomer.priceTableId)?.description}
                  </p>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Preço Padrão</TableHead>
                      <TableHead className="text-right">Preço Cliente</TableHead>
                      <TableHead className="text-right">Variação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priceTables
                      .find(t => t.id === selectedCustomer.priceTableId)
                      ?.items.map((item, index) => {
                        const defaultPrice = getDefaultPriceTable()?.items.find(i => i.productName === item.productName)?.price || 0;
                        const variation = defaultPrice > 0 ? ((item.price - defaultPrice) / defaultPrice) * 100 : 0;
                        
                        return (
                          <TableRow key={index}>
                            <TableCell>{item.productName}</TableCell>
                            <TableCell className="text-right">R$ {defaultPrice.toFixed(2)}</TableCell>
                            <TableCell className="text-right">R$ {item.price.toFixed(2)}</TableCell>
                            <TableCell className="text-right">
                              <Badge className={
                                variation < 0 ? 'bg-red-100 text-red-700' : 
                                variation > 0 ? 'bg-green-100 text-green-700' : 
                                'bg-gray-100 text-gray-700'
                              }>
                                {variation > 0 ? '+' : ''}{variation.toFixed(1)}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </>
            )}
          </div>

          <div className="pt-4 border-t mt-4">
            <Button onClick={() => setIsPriceTableDialogOpen(false)} variant="outline" className="w-full">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
