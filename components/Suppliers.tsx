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
import { Plus, Search, Truck, Mail, Phone, SearchIcon, Loader2, Building2, MoreVertical, Edit, History, Calendar, User, Package } from "lucide-react";
import { toast } from "sonner";
import { useERP } from "../contexts/ERPContext";
import { validateEmail } from "../utils/fieldValidation";

interface Supplier {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  totalPurchases: number;
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
}

interface Segment {
  id: string;
  name: string;
}

const initialSuppliers: Supplier[] = [];

export function Suppliers() {
  const { suppliers, addSupplier, updateSupplier, purchaseOrders } = useERP();
  const [segments, setSegments] = useState<Segment[]>([
    { id: "1", name: "Produtos Agrícolas" },
    { id: "2", name: "Importação" },
    { id: "3", name: "Produtos Orgânicos" },
    { id: "4", name: "Commodities" },
    { id: "5", name: "Distribuição" },
  ]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isSegmentDialogOpen, setIsSegmentDialogOpen] = useState(false);
  const [newSegmentName, setNewSegmentName] = useState("");
  const [isSearchingCNPJ, setIsSearchingCNPJ] = useState(false);
  const [isEditSearchingCNPJ, setIsEditSearchingCNPJ] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [editSupplier, setEditSupplier] = useState({
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
    icmsContributor: true
  });

  const [newSupplier, setNewSupplier] = useState({
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
    icmsContributor: true
  });

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditClick = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setEditSupplier({
      documentType: supplier.documentType,
      document: supplier.document,
      name: supplier.name,
      company: supplier.company,
      tradeName: supplier.tradeName,
      segment: supplier.segment,
      phone: supplier.phone,
      contactPerson: supplier.contactPerson,
      email: supplier.email,
      street: supplier.street,
      number: supplier.number,
      complement: supplier.complement,
      neighborhood: supplier.neighborhood,
      city: supplier.city,
      state: supplier.state,
      zipCode: supplier.zipCode,
      stateRegistration: supplier.stateRegistration,
      cityRegistration: supplier.cityRegistration,
      icmsContributor: supplier.icmsContributor
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedSupplier) return;

    // VALIDAÇÃO DE E-MAIL
    if (editSupplier.email && !validateEmail(editSupplier.email)) {
      toast.error("E-mail inválido", {
        description: "Por favor, corrija o e-mail antes de salvar. Formato esperado: usuario@exemplo.com"
      });
      return;
    }

    const requiredFieldsValid = editSupplier.documentType === "PJ" 
      ? (editSupplier.document && editSupplier.company && editSupplier.email && editSupplier.segment)
      : (editSupplier.document && editSupplier.name && editSupplier.email && editSupplier.segment);
    
    if (!requiredFieldsValid) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const fullAddress = `${editSupplier.street} ${editSupplier.number}${editSupplier.complement ? ', ' + editSupplier.complement : ''}, ${editSupplier.neighborhood}, ${editSupplier.city}, ${editSupplier.state} ${editSupplier.zipCode}`;

    // Atualizar no contexto global (persiste automaticamente)
    updateSupplier(selectedSupplier.id, {
      documentType: editSupplier.documentType,
      document: editSupplier.document,
      name: editSupplier.documentType === "PJ" ? editSupplier.company : editSupplier.name,
      company: editSupplier.documentType === "PJ" ? editSupplier.company : editSupplier.name,
      tradeName: editSupplier.tradeName,
      segment: editSupplier.segment,
      contactPerson: editSupplier.contactPerson,
      email: editSupplier.email,
      phone: editSupplier.phone,
      address: fullAddress,
      street: editSupplier.street,
      number: editSupplier.number,
      complement: editSupplier.complement,
      neighborhood: editSupplier.neighborhood,
      city: editSupplier.city,
      state: editSupplier.state,
      zipCode: editSupplier.zipCode,
      stateRegistration: editSupplier.stateRegistration,
      cityRegistration: editSupplier.cityRegistration,
      icmsContributor: editSupplier.icmsContributor
    });
    setIsEditDialogOpen(false);
    setSelectedSupplier(null);
    toast.success("Fornecedor atualizado com sucesso!");
  };

  const handleHistoryClick = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsHistoryDialogOpen(true);
  };

  const getSupplierOrders = (supplierId: string) => {
    return purchaseOrders.filter(order => order.supplierId === supplierId);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      "Processando": "bg-yellow-100 text-yellow-700",
      "Confirmado": "bg-blue-100 text-blue-700",
      "Enviado": "bg-purple-100 text-purple-700",
      "Recebido": "bg-green-100 text-green-700",
      "Parcialmente Concluído": "bg-teal-100 text-teal-700",
      "Concluído": "bg-emerald-100 text-emerald-700",
      "Cancelado": "bg-red-100 text-red-700"
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const handleEditSearchCNPJ = async () => {
    if (!editSupplier.document) {
      toast.error("Digite um CNPJ para buscar");
      return;
    }

    const cnpj = editSupplier.document.replace(/\D/g, '');
    
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
      
      setEditSupplier({
        ...editSupplier,
        company: data.razao_social || "",
        tradeName: data.nome_fantasia || data.razao_social || "",
        phone: phoneFormatted || editSupplier.phone,
        email: data.email || editSupplier.email,
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
    if (!newSupplier.document) {
      toast.error("Digite um CNPJ para buscar");
      return;
    }

    const cnpj = newSupplier.document.replace(/\D/g, '');
    
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
      
      setNewSupplier({
        ...newSupplier,
        company: data.razao_social || "",
        tradeName: data.nome_fantasia || data.razao_social || "",
        phone: phoneFormatted || newSupplier.phone,
        email: data.email || newSupplier.email,
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
    setNewSupplier({ ...newSupplier, segment: newSegmentName });
    setNewSegmentName("");
    setIsSegmentDialogOpen(false);
    toast.success("Segmento adicionado com sucesso!");
  };

  const handleAddSupplier = () => {
    // VALIDAÇÃO DE E-MAIL
    if (newSupplier.email && !validateEmail(newSupplier.email)) {
      toast.error("E-mail inválido", {
        description: "Por favor, corrija o e-mail antes de salvar. Formato esperado: usuario@exemplo.com"
      });
      return;
    }

    // Validação baseada no tipo de documento
    const requiredFieldsValid = newSupplier.documentType === "PJ" 
      ? (newSupplier.document && newSupplier.company && newSupplier.email && newSupplier.segment)
      : (newSupplier.document && newSupplier.name && newSupplier.email && newSupplier.segment);
    
    if (!requiredFieldsValid) {
      toast.error("Preencha todos os campos obrigatórios (*, Tipo, Documento, Nome/Razão Social, E-mail e Segmento)");
      return;
    }

    const fullAddress = `${newSupplier.street} ${newSupplier.number}${newSupplier.complement ? ', ' + newSupplier.complement : ''}, ${newSupplier.neighborhood}, ${newSupplier.city}, ${newSupplier.state} ${newSupplier.zipCode}`;

    // Adicionar no contexto global (persiste automaticamente)
    addSupplier({
      documentType: newSupplier.documentType,
      document: newSupplier.document,
      name: newSupplier.documentType === "PJ" ? newSupplier.company : newSupplier.name,
      company: newSupplier.documentType === "PJ" ? newSupplier.company : newSupplier.name,
      tradeName: newSupplier.tradeName,
      segment: newSupplier.segment,
      contactPerson: newSupplier.contactPerson,
      email: newSupplier.email,
      phone: newSupplier.phone,
      address: fullAddress,
      street: newSupplier.street,
      number: newSupplier.number,
      complement: newSupplier.complement,
      neighborhood: newSupplier.neighborhood,
      city: newSupplier.city,
      state: newSupplier.state,
      zipCode: newSupplier.zipCode,
      stateRegistration: newSupplier.stateRegistration,
      cityRegistration: newSupplier.cityRegistration,
      icmsContributor: newSupplier.icmsContributor,
      status: "Ativo"
    });
    setNewSupplier({
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
      icmsContributor: true
    });
    setIsDialogOpen(false);
    // Toast já é exibido pela função addSupplier do contexto
  };

  const activeSuppliers = suppliers.filter(s => s.status === "Ativo").length;
  const totalSpent = suppliers.reduce((sum, s) => sum + s.totalSpent, 0);

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-gray-900 mb-2">Gestão de Fornecedores</h1>
            <p className="text-gray-600">Gerencie sua base de fornecedores</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[rgb(32,251,225)] hover:bg-[#18CBB5] text-[rgb(0,0,0)]">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Fornecedor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Adicionar Novo Fornecedor</DialogTitle>
                <DialogDescription>
                  Cadastre um novo fornecedor no sistema. Campos marcados com * são obrigatórios.
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto px-1">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
                    <TabsTrigger value="contact">Contato</TabsTrigger>
                    <TabsTrigger value="address">Endereço</TabsTrigger>
                  </TabsList>

                  {/* Tab: Dados Básicos */}
                  <TabsContent value="basic" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Tipo *</Label>
                        <Select 
                          value={newSupplier.documentType} 
                          onValueChange={(value: "PJ" | "PF") => setNewSupplier({...newSupplier, documentType: value})}
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
                        <Label>{newSupplier.documentType === "PJ" ? "CNPJ *" : "CPF *"}</Label>
                        <div className="flex gap-2">
                          <Input
                            value={newSupplier.document}
                            onChange={(e) => setNewSupplier({...newSupplier, document: e.target.value})}
                            placeholder={newSupplier.documentType === "PJ" ? "00.000.000/0000-00" : "000.000.000-00"}
                          />
                          {newSupplier.documentType === "PJ" && (
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
                        {newSupplier.documentType === "PJ" && (
                          <p className="text-xs text-gray-500 mt-1">
                            💡 Clique na lupa para preencher automaticamente os dados da empresa
                          </p>
                        )}
                      </div>
                    </div>

                    {newSupplier.documentType === "PJ" ? (
                      <>
                        <div>
                          <Label>Razão Social *</Label>
                          <Input
                            value={newSupplier.company}
                            onChange={(e) => setNewSupplier({...newSupplier, company: e.target.value})}
                            placeholder="Nome completo da empresa"
                          />
                        </div>
                        <div>
                          <Label>Nome Fantasia</Label>
                          <Input
                            value={newSupplier.tradeName}
                            onChange={(e) => setNewSupplier({...newSupplier, tradeName: e.target.value})}
                            placeholder="Nome comercial da empresa"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <Label>Nome Completo *</Label>
                          <Input
                            value={newSupplier.name}
                            onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})}
                            placeholder="Nome completo do fornecedor"
                          />
                        </div>
                        <div>
                          <Label>Nome Curto</Label>
                          <Input
                            value={newSupplier.tradeName}
                            onChange={(e) => setNewSupplier({...newSupplier, tradeName: e.target.value})}
                            placeholder="Como prefere ser chamado"
                          />
                        </div>
                      </>
                    )}

                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label>Segmento *</Label>
                        <Select 
                          value={newSupplier.segment} 
                          onValueChange={(value) => setNewSupplier({...newSupplier, segment: value})}
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
                      <div className="pt-6">
                        <Dialog open={isSegmentDialogOpen} onOpenChange={setIsSegmentDialogOpen}>
                          <DialogTrigger asChild>
                            <Button type="button" variant="outline" size="icon" title="Adicionar novo segmento">
                              <Plus className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Adicionar Segmento</DialogTitle>
                              <DialogDescription>
                                Crie um novo segmento para classificar seus fornecedores
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                              <div>
                                <Label>Nome do Segmento</Label>
                                <Input
                                  value={newSegmentName}
                                  onChange={(e) => setNewSegmentName(e.target.value)}
                                  placeholder="ex: Produtos Agrícolas"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleAddSegment();
                                    }
                                  }}
                                />
                              </div>
                              <Button onClick={handleAddSegment} className="w-full">
                                Adicionar Segmento
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>

                    {newSupplier.documentType === "PJ" && (
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Inscrição Estadual</Label>
                          <Input
                            value={newSupplier.stateRegistration}
                            onChange={(e) => setNewSupplier({...newSupplier, stateRegistration: e.target.value})}
                            placeholder="000.000.000.000"
                          />
                        </div>
                        <div>
                          <Label>Inscrição Municipal</Label>
                          <Input
                            value={newSupplier.cityRegistration}
                            onChange={(e) => setNewSupplier({...newSupplier, cityRegistration: e.target.value})}
                            placeholder="0000000"
                          />
                        </div>
                        <div>
                          <Label>Contribuinte ICMS</Label>
                          <Select 
                            value={newSupplier.icmsContributor ? "sim" : "nao"} 
                            onValueChange={(value) => setNewSupplier({...newSupplier, icmsContributor: value === "sim"})}
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
                        value={newSupplier.contactPerson}
                        onChange={(e) => setNewSupplier({...newSupplier, contactPerson: e.target.value})}
                        placeholder="Nome da pessoa responsável"
                      />
                    </div>
                    <div>
                      <Label>E-mail Principal *</Label>
                      <Input
                        type="email"
                        value={newSupplier.email}
                        onChange={(e) => setNewSupplier({...newSupplier, email: e.target.value})}
                        onBlur={(e) => {
                          const email = e.target.value.trim();
                          if (email && !validateEmail(email)) {
                            toast.error("E-mail inválido", {
                              description: "Por favor, insira um e-mail válido (ex: usuario@exemplo.com)"
                            });
                          }
                        }}
                        placeholder="email@exemplo.com"
                        className={newSupplier.email && !validateEmail(newSupplier.email) ? "border-red-500" : ""}
                      />
                      {newSupplier.email && !validateEmail(newSupplier.email) && (
                        <p className="text-xs text-red-600 mt-1">
                          ⚠️ E-mail inválido. Formato esperado: usuario@exemplo.com
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>Telefone</Label>
                      <Input
                        type="tel"
                        value={newSupplier.phone}
                        onChange={(e) => setNewSupplier({...newSupplier, phone: e.target.value})}
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
                          value={newSupplier.street}
                          onChange={(e) => setNewSupplier({...newSupplier, street: e.target.value})}
                          placeholder="Rua, Avenida..."
                        />
                      </div>
                      <div>
                        <Label>Número</Label>
                        <Input
                          value={newSupplier.number}
                          onChange={(e) => setNewSupplier({...newSupplier, number: e.target.value})}
                          placeholder="000"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Complemento</Label>
                        <Input
                          value={newSupplier.complement}
                          onChange={(e) => setNewSupplier({...newSupplier, complement: e.target.value})}
                          placeholder="Sala, Bloco, Apto..."
                        />
                      </div>
                      <div>
                        <Label>Bairro</Label>
                        <Input
                          value={newSupplier.neighborhood}
                          onChange={(e) => setNewSupplier({...newSupplier, neighborhood: e.target.value})}
                          placeholder="Bairro"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <Label>Cidade</Label>
                        <Input
                          value={newSupplier.city}
                          onChange={(e) => setNewSupplier({...newSupplier, city: e.target.value})}
                          placeholder="Cidade"
                        />
                      </div>
                      <div>
                        <Label>Estado (UF)</Label>
                        <Input
                          value={newSupplier.state}
                          onChange={(e) => setNewSupplier({...newSupplier, state: e.target.value.toUpperCase()})}
                          placeholder="SP"
                          maxLength={2}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>CEP</Label>
                      <Input
                        value={newSupplier.zipCode}
                        onChange={(e) => setNewSupplier({...newSupplier, zipCode: e.target.value})}
                        placeholder="00000-000"
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="pt-4 border-t mt-4 flex gap-2">
                <Button onClick={handleAddSupplier} className="flex-1 bg-green-600 hover:bg-green-700">
                  <Building2 className="w-4 h-4 mr-2" />
                  Adicionar Fornecedor
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
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total de Fornecedores</p>
                <p className="text-gray-900">{suppliers.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Fornecedores Ativos</p>
                <p className="text-gray-900">{activeSuppliers}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total de Compras</p>
                <p className="text-gray-900">R$ {totalSpent.toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Pesquisar fornecedores..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Suppliers Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Ações</TableHead>
              <TableHead>ID do Fornecedor</TableHead>
              <TableHead>Nome do Contato</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Total de Compras</TableHead>
              <TableHead>Total Gasto</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSuppliers.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => handleEditClick(supplier)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar Cadastro
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleHistoryClick(supplier)}>
                        <History className="mr-2 h-4 w-4" />
                        Histórico de Pedidos
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
                <TableCell>{supplier.id}</TableCell>
                <TableCell>{supplier.name}</TableCell>
                <TableCell>{supplier.company}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    {supplier.email}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {supplier.phone}
                  </div>
                </TableCell>
                <TableCell>{supplier.totalPurchases}</TableCell>
                <TableCell>R$ {supplier.totalSpent.toLocaleString('pt-BR')}</TableCell>
                <TableCell>
                  <span className={`inline-block px-2 py-1 rounded text-xs ${
                    supplier.status === "Ativo" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                  }`}>
                    {supplier.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Edit Supplier Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Editar Fornecedor</DialogTitle>
            <DialogDescription>
              Atualize os dados do fornecedor {selectedSupplier?.id}. Campos marcados com * são obrigatórios.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-1">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
                <TabsTrigger value="contact">Contato</TabsTrigger>
                <TabsTrigger value="address">Endereço</TabsTrigger>
              </TabsList>

              {/* Tab: Dados Básicos */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo *</Label>
                    <Select 
                      value={editSupplier.documentType} 
                      onValueChange={(value: "PJ" | "PF") => setEditSupplier({...editSupplier, documentType: value})}
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
                    <Label>{editSupplier.documentType === "PJ" ? "CNPJ *" : "CPF *"}</Label>
                    <div className="flex gap-2">
                      <Input
                        value={editSupplier.document}
                        onChange={(e) => setEditSupplier({...editSupplier, document: e.target.value})}
                        placeholder={editSupplier.documentType === "PJ" ? "00.000.000/0000-00" : "000.000.000-00"}
                      />
                      {editSupplier.documentType === "PJ" && (
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

                {editSupplier.documentType === "PJ" ? (
                  <>
                    <div>
                      <Label>Razão Social *</Label>
                      <Input
                        value={editSupplier.company}
                        onChange={(e) => setEditSupplier({...editSupplier, company: e.target.value})}
                        placeholder="Nome completo da empresa"
                      />
                    </div>
                    <div>
                      <Label>Nome Fantasia</Label>
                      <Input
                        value={editSupplier.tradeName}
                        onChange={(e) => setEditSupplier({...editSupplier, tradeName: e.target.value})}
                        placeholder="Nome comercial da empresa"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label>Nome Completo *</Label>
                      <Input
                        value={editSupplier.name}
                        onChange={(e) => setEditSupplier({...editSupplier, name: e.target.value})}
                        placeholder="Nome completo do fornecedor"
                      />
                    </div>
                    <div>
                      <Label>Nome Curto</Label>
                      <Input
                        value={editSupplier.tradeName}
                        onChange={(e) => setEditSupplier({...editSupplier, tradeName: e.target.value})}
                        placeholder="Como prefere ser chamado"
                      />
                    </div>
                  </>
                )}

                <div>
                  <Label>Segmento *</Label>
                  <Select 
                    value={editSupplier.segment} 
                    onValueChange={(value) => setEditSupplier({...editSupplier, segment: value})}
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

                {editSupplier.documentType === "PJ" && (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Inscrição Estadual</Label>
                      <Input
                        value={editSupplier.stateRegistration}
                        onChange={(e) => setEditSupplier({...editSupplier, stateRegistration: e.target.value})}
                        placeholder="000.000.000.000"
                      />
                    </div>
                    <div>
                      <Label>Inscrição Municipal</Label>
                      <Input
                        value={editSupplier.cityRegistration}
                        onChange={(e) => setEditSupplier({...editSupplier, cityRegistration: e.target.value})}
                        placeholder="0000000"
                      />
                    </div>
                    <div>
                      <Label>Contribuinte ICMS</Label>
                      <Select 
                        value={editSupplier.icmsContributor ? "sim" : "nao"} 
                        onValueChange={(value) => setEditSupplier({...editSupplier, icmsContributor: value === "sim"})}
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
                    value={editSupplier.contactPerson}
                    onChange={(e) => setEditSupplier({...editSupplier, contactPerson: e.target.value})}
                    placeholder="Nome da pessoa responsável"
                  />
                </div>
                <div>
                  <Label>E-mail Principal *</Label>
                  <Input
                    type="email"
                    value={editSupplier.email}
                    onChange={(e) => setEditSupplier({...editSupplier, email: e.target.value})}
                    onBlur={(e) => {
                      const email = e.target.value.trim();
                      if (email && !validateEmail(email)) {
                        toast.error("E-mail inválido", {
                          description: "Por favor, insira um e-mail válido (ex: usuario@exemplo.com)"
                        });
                      }
                    }}
                    placeholder="email@exemplo.com"
                    className={editSupplier.email && !validateEmail(editSupplier.email) ? "border-red-500" : ""}
                  />
                  {editSupplier.email && !validateEmail(editSupplier.email) && (
                    <p className="text-xs text-red-600 mt-1">
                      ⚠️ E-mail inválido. Formato esperado: usuario@exemplo.com
                    </p>
                  )}
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input
                    type="tel"
                    value={editSupplier.phone}
                    onChange={(e) => setEditSupplier({...editSupplier, phone: e.target.value})}
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
                      value={editSupplier.street}
                      onChange={(e) => setEditSupplier({...editSupplier, street: e.target.value})}
                      placeholder="Rua, Avenida..."
                    />
                  </div>
                  <div>
                    <Label>Número</Label>
                    <Input
                      value={editSupplier.number}
                      onChange={(e) => setEditSupplier({...editSupplier, number: e.target.value})}
                      placeholder="000"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Complemento</Label>
                    <Input
                      value={editSupplier.complement}
                      onChange={(e) => setEditSupplier({...editSupplier, complement: e.target.value})}
                      placeholder="Sala, Bloco, Apto..."
                    />
                  </div>
                  <div>
                    <Label>Bairro</Label>
                    <Input
                      value={editSupplier.neighborhood}
                      onChange={(e) => setEditSupplier({...editSupplier, neighborhood: e.target.value})}
                      placeholder="Bairro"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Label>Cidade</Label>
                    <Input
                      value={editSupplier.city}
                      onChange={(e) => setEditSupplier({...editSupplier, city: e.target.value})}
                      placeholder="Cidade"
                    />
                  </div>
                  <div>
                    <Label>Estado (UF)</Label>
                    <Input
                      value={editSupplier.state}
                      onChange={(e) => setEditSupplier({...editSupplier, state: e.target.value.toUpperCase()})}
                      placeholder="SP"
                      maxLength={2}
                    />
                  </div>
                </div>

                <div>
                  <Label>CEP</Label>
                  <Input
                    value={editSupplier.zipCode}
                    onChange={(e) => setEditSupplier({...editSupplier, zipCode: e.target.value})}
                    placeholder="00000-000"
                  />
                </div>
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

      {/* Purchase Order History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-[95vw] w-[1200px] h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-xl">Histórico de Pedidos de Compra</DialogTitle>
            <DialogDescription>
              Histórico completo de pedidos de compra do fornecedor <span className="font-medium text-gray-700">{selectedSupplier?.company}</span> ({selectedSupplier?.id})
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden px-6 pb-6 flex flex-col">
            {/* Supplier Info Card */}
            <Card className="p-4 mb-4 bg-gradient-to-br from-orange-50 to-amber-50 border-orange-100">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Fornecedor</p>
                  <p className="text-gray-900">{selectedSupplier?.company}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Contato</p>
                  <p className="text-gray-900">{selectedSupplier?.contactPerson || selectedSupplier?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Total de Pedidos</p>
                  <p className="text-gray-900 text-lg">{selectedSupplier?.totalPurchases || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Total Gasto</p>
                  <p className="text-gray-900 text-lg">R$ {selectedSupplier?.totalSpent.toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Segmento</p>
                  <p className="text-gray-900">{selectedSupplier?.segment}</p>
                </div>
              </div>
            </Card>

            {/* Orders Table */}
            <div className="flex-1 border rounded-lg overflow-hidden bg-white">
              {getSupplierOrders(selectedSupplier?.id || "").length === 0 ? (
                <div className="h-full flex items-center justify-center p-8 text-center text-gray-500">
                  <div>
                    <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg mb-2">Nenhum pedido registrado para este fornecedor.</p>
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
                        <TableHead className="min-w-[150px]">Comprador</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getSupplierOrders(selectedSupplier?.id || "").map((order) => (
                        <TableRow key={order.id} className="hover:bg-gray-50">
                          <TableCell>
                            <span className="font-medium text-blue-600">{order.id}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              <span>{order.issueDate ? new Date(order.issueDate).toLocaleDateString('pt-BR') : new Date(order.orderDate).toLocaleDateString('pt-BR')}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              <span>{new Date(order.deliveryDate).toLocaleDateString('pt-BR')}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-medium text-gray-900">
                              R$ {order.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                              <span>{order.buyer || "Não informado"}</span>
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
                {getSupplierOrders(selectedSupplier?.id || "").length > 0 && (
                  <>Mostrando {getSupplierOrders(selectedSupplier?.id || "").length} pedido(s)</>
                )}
              </p>
              <Button onClick={() => setIsHistoryDialogOpen(false)} variant="outline">
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
