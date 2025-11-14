import { useState, useRef, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Textarea } from "./ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Building2, MapPin, Mail, Phone, Globe, FileText, Landmark, Plus, Trash2, DollarSign, Image, Receipt, Info, Edit2, Save, X, History, Search, Loader2 } from "lucide-react";
import { useERP } from "../contexts/ERPContext";
import { toast } from "sonner@2.0.3";
import type { BankAccount, ICMSInterstateRate } from "../contexts/ERPContext";
import { Switch } from "./ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { consultarCNPJ, maskCNPJ, isValidCNPJ } from "../utils/cnpjValidation";
import { buscarCEP } from "../utils/cepValidation";
import { validateEmail } from "../utils/fieldValidation";

// Lista de principais bancos brasileiros
const BANCOS_BRASILEIROS = [
  { codigo: "001", nome: "Banco do Brasil" },
  { codigo: "033", nome: "Santander" },
  { codigo: "104", nome: "Caixa Econômica Federal" },
  { codigo: "237", nome: "Bradesco" },
  { codigo: "341", nome: "Itaú" },
  { codigo: "077", nome: "Banco Inter" },
  { codigo: "260", nome: "Nubank" },
  { codigo: "290", nome: "Pagseguro" },
  { codigo: "323", nome: "Mercado Pago" },
  { codigo: "336", nome: "Banco C6" },
  { codigo: "389", nome: "Banco Mercantil" },
  { codigo: "422", nome: "Banco Safra" },
  { codigo: "745", nome: "Citibank" },
  { codigo: "756", nome: "Bancoob (Sicoob)" },
  { codigo: "748", nome: "Sicredi" },
  { codigo: "212", nome: "Banco Original" },
  { codigo: "637", nome: "Banco Sofisa" },
  { codigo: "655", nome: "Banco Votorantim" },
  { codigo: "041", nome: "Banrisul" },
  { codigo: "070", nome: "BRB - Banco de Brasília" },
  { codigo: "136", nome: "Unicred" },
  { codigo: "208", nome: "Banco BTG Pactual" },
  { codigo: "218", nome: "Banco BS2" },
  { codigo: "246", nome: "Banco ABC Brasil" },
  { codigo: "318", nome: "Banco BMG" },
  { codigo: "473", nome: "Banco Caixa Geral" },
  { codigo: "623", nome: "Banco Pan" },
  { codigo: "653", nome: "Banco Indusval" },
  { codigo: "707", nome: "Banco Daycoval" },
  { codigo: "739", nome: "Banco Cetelem" },
].sort((a, b) => a.nome.localeCompare(b.nome));

export function CompanySettings() {
  const {
    companySettings,
    updateCompanySettings,
    companyHistory,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
  } = useERP();

  // Ref para input de upload da logo
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Estado de edição
  const [isEditMode, setIsEditMode] = useState(false);
  const [localSettings, setLocalSettings] = useState(companySettings);

  // Sincronizar localSettings com companySettings quando não estiver em modo de edição
  useEffect(() => {
    if (!isEditMode) {
      setLocalSettings(companySettings);
    }
  }, [companySettings, isEditMode]);

  // Estado para drag and drop
  const [isDragging, setIsDragging] = useState(false);

  // Estado para busca de CNPJ
  const [isSearchingCNPJ, setIsSearchingCNPJ] = useState(false);

  // Estados para dialogs
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [icmsDialogOpen, setIcmsDialogOpen] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  
  // Estados para ICMS interestadual
  const [newICMSRate, setNewICMSRate] = useState({ state: "", rate: "" });

  // Estados para formulários
  const [newBank, setNewBank] = useState<Omit<BankAccount, 'id'>>({
    bankName: "",
    accountType: "Conta Corrente",
    agency: "",
    accountNumber: "",
    balance: 0,
    isPrimary: false
  });

  // Funções de controle de edição
  const handleEdit = () => {
    setLocalSettings(companySettings);
    setIsEditMode(true);
    toast.info("Modo de edição ativado", {
      description: "Você pode alterar os campos agora"
    });
  };

  const handleSave = () => {
    // VALIDAÇÃO DE E-MAIL
    if (localSettings.email && !validateEmail(localSettings.email)) {
      toast.error("E-mail inválido", {
        description: "Por favor, corrija o e-mail antes de salvar. Formato esperado: contato@empresa.com.br"
      });
      return;
    }

    updateCompanySettings(localSettings, true);
    setIsEditMode(false);
  };

  const handleCancel = () => {
    setLocalSettings(companySettings);
    setIsEditMode(false);
    toast.info("Alterações descartadas", {
      description: "Os campos voltaram ao estado anterior"
    });
  };

  const handleViewHistory = () => {
    setShowHistoryDialog(true);
  };

  // Atualizar settings locais durante edição
  const updateLocalSettings = (updates: Partial<typeof companySettings>) => {
    if (isEditMode) {
      setLocalSettings({ ...localSettings, ...updates });
    }
  };

  // Obter valores dos campos baseado no modo de edição
  const getCurrentSettings = () => isEditMode ? localSettings : companySettings;

  // Função para buscar CNPJ
  const handleBuscarCNPJ = async () => {
    const cnpj = getCurrentSettings().cnpj;
    
    if (!cnpj) {
      toast.error("Digite um CNPJ para buscar");
      return;
    }

    if (!isValidCNPJ(cnpj)) {
      toast.error("CNPJ inválido", {
        description: "Verifique o número digitado"
      });
      return;
    }

    setIsSearchingCNPJ(true);
    
    try {
      toast.info("🔍 Consultando CNPJ na Receita Federal...", {
        description: "Aguarde, estamos buscando os dados"
      });

      const dados = await consultarCNPJ(cnpj);
      
      // Preencher campos com os dados retornados
      const updates = {
        cnpj: dados.cnpj,
        companyName: dados.razaoSocial,
        tradeName: dados.nomeFantasia,
        sector: dados.atividadePrincipal,
        street: dados.logradouro,
        number: dados.numero,
        complement: dados.complemento,
        neighborhood: dados.bairro,
        city: dados.cidade,
        state: dados.estado,
        zipCode: dados.cep,
        phone: dados.telefone,
        email: dados.email
      };

      updateLocalSettings(updates);
      
      toast.success("✅ CNPJ encontrado com sucesso!", {
        description: `${dados.razaoSocial} - ${dados.situacao}`
      });

      // Se o CEP foi preenchido, buscar dados complementares
      if (dados.cep) {
        try {
          const dadosCEP = await buscarCEP(dados.cep);
          if (dadosCEP) {
            updateLocalSettings({
              ...updates,
              street: dadosCEP.logradouro || dados.logradouro,
              neighborhood: dadosCEP.bairro || dados.bairro,
              city: dadosCEP.cidade || dados.cidade,
              state: dadosCEP.estado || dados.estado
            });
          }
        } catch (error) {
          // Erro ao buscar CEP é silencioso, dados do CNPJ já foram preenchidos
          console.warn("Erro ao buscar CEP complementar:", error);
        }
      }

    } catch (error) {
      console.error("Erro ao buscar CNPJ:", error);
      toast.error("Erro ao consultar CNPJ", {
        description: error instanceof Error ? error.message : "Tente novamente em alguns instantes"
      });
    } finally {
      setIsSearchingCNPJ(false);
    }
  };

  // Função para processar o upload da logo
  const handleLogoUpload = (file: File) => {
    console.log("Upload iniciado:", file.name, file.type, file.size);
    
    // Validar tamanho (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Tamanho máximo: 2 MB");
      return;
    }

    // Validar formato
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast.error("Formato inválido. Use PNG, JPG ou SVG");
      return;
    }

    // Converter para base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      console.log("Base64 gerado, tamanho:", base64.length, "primeiros chars:", base64.substring(0, 100));
      updateLocalSettings({ logo: base64 });
      toast.success("✅ Logo carregada com sucesso!", {
        description: "Não esqueça de salvar as alterações"
      });
    };
    reader.onerror = (error) => {
      console.error("Erro ao ler arquivo:", error);
      toast.error("Erro ao carregar a imagem");
    };
    reader.readAsDataURL(file);
  };

  // Handlers para drag and drop
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleLogoUpload(file);
    }
  };

  const handleAddBank = () => {
    if (!newBank.bankName || !newBank.agency || !newBank.accountNumber) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    addBankAccount(newBank);
    setNewBank({
      bankName: "",
      accountType: "Conta Corrente",
      agency: "",
      accountNumber: "",
      balance: 0,
      isPrimary: false
    });
    setBankDialogOpen(false);
  };

  const handleAddICMSRate = () => {
    if (!newICMSRate.state || !newICMSRate.rate) {
      toast.error("Preencha o estado e a alíquota");
      return;
    }
    const icmsRates = companySettings.icmsInterstateRates || [];
    const newRate: ICMSInterstateRate = {
      id: `ICMS-${String(icmsRates.length + 1).padStart(3, '0')}`,
      state: newICMSRate.state.toUpperCase(),
      rate: Number(newICMSRate.rate)
    };
    updateCompanySettings({ icmsInterstateRates: [...icmsRates, newRate] });
    setNewICMSRate({ state: "", rate: "" });
    setIcmsDialogOpen(false);
    toast.success("Alíquota ICMS adicionada");
  };

  const handleDeleteICMSRate = (id: string) => {
    const icmsRates = companySettings.icmsInterstateRates || [];
    updateCompanySettings({ icmsInterstateRates: icmsRates.filter(r => r.id !== id) });
    toast.success("Alíquota ICMS removida");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            Configurações da Empresa
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Gerencie informações da empresa e contas bancárias
          </p>
        </div>

        {/* Botões de Controle */}
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewHistory}
                  className="gap-2"
                >
                  <History className="w-4 h-4" />
                  Histórico
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ver histórico de alterações</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {!isEditMode ? (
            <Button
              onClick={handleEdit}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Edit2 className="w-4 h-4" />
              Editar
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4" />
                Salvar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Indicador de Modo de Edição */}
      {isEditMode && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            <p className="text-sm text-blue-900">
              <strong>Modo de Edição Ativo:</strong> Faça as alterações necessárias e clique em "Salvar" para aplicar
            </p>
          </div>
        </Card>
      )}

      {/* Tabs - APENAS 4 ABAS */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">
            <Building2 className="w-4 h-4 mr-2" />
            Dados Gerais
          </TabsTrigger>
          <TabsTrigger value="branding">
            <Image className="w-4 h-4 mr-2" />
            Identidade Visual
          </TabsTrigger>
          <TabsTrigger value="fiscal">
            <FileText className="w-4 h-4 mr-2" />
            Fiscal e Tributário
          </TabsTrigger>
          <TabsTrigger value="banks">
            <Landmark className="w-4 h-4 mr-2" />
            Contas Bancárias
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: DADOS GERAIS */}
        <TabsContent value="general" className="space-y-6 mt-6">
          {/* Alerta informativo sobre busca de CNPJ */}
          {isEditMode && (
            <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Search className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm text-blue-900 mb-1">
                    💡 Dica: Preencha automaticamente os dados da empresa
                  </h4>
                  <p className="text-xs text-blue-800">
                    Digite o CNPJ e clique no ícone de <strong>busca (🔍)</strong> ao lado do campo para preencher automaticamente 
                    os dados da empresa consultando a Receita Federal (Razão Social, Nome Fantasia, Endereço, etc.)
                  </p>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-6">
            <h3 className="text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Informações da Empresa
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">CNPJ *</Label>
                <div className="flex gap-2">
                  <Input
                    value={getCurrentSettings().cnpj}
                    onChange={(e) => updateLocalSettings({ cnpj: maskCNPJ(e.target.value) })}
                    placeholder="00.000.000/0001-00"
                    disabled={!isEditMode}
                    maxLength={18}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && isEditMode && !isSearchingCNPJ) {
                        e.preventDefault();
                        handleBuscarCNPJ();
                      }
                    }}
                  />
                  {isEditMode && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={handleBuscarCNPJ}
                            disabled={isSearchingCNPJ || !getCurrentSettings().cnpj}
                            className="flex-shrink-0"
                          >
                            {isSearchingCNPJ ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Search className="w-4 h-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Buscar dados na Receita Federal</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>

              <div>
                <Label>Razão Social *</Label>
                <Input
                  value={getCurrentSettings().companyName}
                  onChange={(e) => updateLocalSettings({ companyName: e.target.value })}
                  placeholder="Nome completo da empresa"
                  disabled={!isEditMode}
                />
              </div>

              <div>
                <Label>Nome Fantasia</Label>
                <Input
                  value={getCurrentSettings().tradeName}
                  onChange={(e) => updateLocalSettings({ tradeName: e.target.value })}
                  placeholder="Nome comercial"
                  disabled={!isEditMode}
                />
              </div>

              <div>
                <Label>Setor de Atuação</Label>
                <Input
                  value={getCurrentSettings().sector}
                  onChange={(e) => updateLocalSettings({ sector: e.target.value })}
                  placeholder="Ex: Comércio de Alimentos"
                  disabled={!isEditMode}
                />
              </div>

              <div className="col-span-2">
                <Label>Descrição do Negócio</Label>
                <Textarea
                  value={getCurrentSettings().description}
                  onChange={(e) => updateLocalSettings({ description: e.target.value })}
                  placeholder="Descreva brevemente o negócio"
                  disabled={!isEditMode}
                  rows={3}
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-gray-900 mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-green-600" />
              Contato
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    className={`pl-10 ${getCurrentSettings().email && !validateEmail(getCurrentSettings().email) ? "border-red-500" : ""}`}
                    type="email"
                    value={getCurrentSettings().email}
                    onChange={(e) => updateLocalSettings({ email: e.target.value })}
                    onBlur={(e) => {
                      const email = e.target.value.trim();
                      if (email && !validateEmail(email)) {
                        toast.error("E-mail inválido", {
                          description: "Por favor, insira um e-mail válido (ex: contato@empresa.com.br)"
                        });
                      }
                    }}
                    placeholder="contato@empresa.com.br"
                    disabled={!isEditMode}
                  />
                </div>
                {getCurrentSettings().email && !validateEmail(getCurrentSettings().email) && (
                  <p className="text-xs text-red-600 mt-1">
                    ⚠️ E-mail inválido. Formato esperado: contato@empresa.com.br
                  </p>
                )}
              </div>

              <div>
                <Label>Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    className="pl-10"
                    value={getCurrentSettings().phone}
                    onChange={(e) => updateLocalSettings({ phone: e.target.value })}
                    placeholder="(00) 0000-0000"
                    disabled={!isEditMode}
                  />
                </div>
              </div>

              <div className="col-span-2">
                <Label>Website</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    className="pl-10"
                    value={getCurrentSettings().website}
                    onChange={(e) => updateLocalSettings({ website: e.target.value })}
                    placeholder="www.empresa.com.br"
                    disabled={!isEditMode}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-600" />
              Endereço
            </h3>
            
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-2">
                <Label>Logradouro</Label>
                <Input
                  value={getCurrentSettings().street}
                  onChange={(e) => updateLocalSettings({ street: e.target.value })}
                  placeholder="Rua, Avenida, etc"
                  disabled={!isEditMode}
                />
              </div>

              <div>
                <Label>Número</Label>
                <Input
                  value={getCurrentSettings().number}
                  onChange={(e) => updateLocalSettings({ number: e.target.value })}
                  placeholder="000"
                  disabled={!isEditMode}
                />
              </div>

              <div>
                <Label>Complemento</Label>
                <Input
                  value={getCurrentSettings().complement}
                  onChange={(e) => updateLocalSettings({ complement: e.target.value })}
                  placeholder="Sala, Bloco"
                  disabled={!isEditMode}
                />
              </div>

              <div>
                <Label>Bairro</Label>
                <Input
                  value={getCurrentSettings().neighborhood}
                  onChange={(e) => updateLocalSettings({ neighborhood: e.target.value })}
                  placeholder="Bairro"
                  disabled={!isEditMode}
                />
              </div>

              <div>
                <Label>Cidade</Label>
                <Input
                  value={getCurrentSettings().city}
                  onChange={(e) => updateLocalSettings({ city: e.target.value })}
                  placeholder="Cidade"
                  disabled={!isEditMode}
                />
              </div>

              <div>
                <Label>Estado</Label>
                <Select
                  value={getCurrentSettings().state}
                  onValueChange={(value) => updateLocalSettings({ state: value })}
                  disabled={!isEditMode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AC">AC</SelectItem>
                    <SelectItem value="AL">AL</SelectItem>
                    <SelectItem value="AP">AP</SelectItem>
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="BA">BA</SelectItem>
                    <SelectItem value="CE">CE</SelectItem>
                    <SelectItem value="DF">DF</SelectItem>
                    <SelectItem value="ES">ES</SelectItem>
                    <SelectItem value="GO">GO</SelectItem>
                    <SelectItem value="MA">MA</SelectItem>
                    <SelectItem value="MT">MT</SelectItem>
                    <SelectItem value="MS">MS</SelectItem>
                    <SelectItem value="MG">MG</SelectItem>
                    <SelectItem value="PA">PA</SelectItem>
                    <SelectItem value="PB">PB</SelectItem>
                    <SelectItem value="PR">PR</SelectItem>
                    <SelectItem value="PE">PE</SelectItem>
                    <SelectItem value="PI">PI</SelectItem>
                    <SelectItem value="RJ">RJ</SelectItem>
                    <SelectItem value="RN">RN</SelectItem>
                    <SelectItem value="RS">RS</SelectItem>
                    <SelectItem value="RO">RO</SelectItem>
                    <SelectItem value="RR">RR</SelectItem>
                    <SelectItem value="SC">SC</SelectItem>
                    <SelectItem value="SP">SP</SelectItem>
                    <SelectItem value="SE">SE</SelectItem>
                    <SelectItem value="TO">TO</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>CEP</Label>
                <Input
                  value={getCurrentSettings().zipCode}
                  onChange={(e) => updateLocalSettings({ zipCode: e.target.value })}
                  placeholder="00000-000"
                  disabled={!isEditMode}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ABA 2: IDENTIDADE VISUAL */}
        <TabsContent value="branding" className="space-y-6 mt-6">
          <Card className="p-6">
            <h3 className="text-gray-900 mb-4 flex items-center gap-2">
              <Image className="w-5 h-5 text-purple-600" />
              Logo da Empresa
            </h3>

            <div className="space-y-4">
              {/* Visualização da logo */}
              <div className="flex items-center gap-4">
                <div className="w-32 h-32 border-2 border-gray-200 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
                  {getCurrentSettings().logo ? (
                    <ImageWithFallback
                      src={getCurrentSettings().logo}
                      alt="Logo da empresa"
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <div className="text-center text-gray-400">
                      <Image className="w-12 h-12 mx-auto mb-2" />
                      <p className="text-xs">Sem logo</p>
                    </div>
                  )}
                </div>

                {isEditMode && (
                  <div className="flex-1">
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                        isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
                      }`}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onClick={() => logoInputRef.current?.click()}
                    >
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleLogoUpload(file);
                        }}
                      />
                      <Image className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600 mb-1">
                        Arraste uma imagem ou clique para selecionar
                      </p>
                      <p className="text-xs text-gray-500">
                        PNG, JPG ou SVG (máx. 2MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {getCurrentSettings().logo && isEditMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateLocalSettings({ logo: "" })}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remover Logo
                </Button>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* ABA 3: FISCAL E TRIBUTÁRIO */}
        <TabsContent value="fiscal" className="space-y-6 mt-6">
          <Card className="p-6">
            <h3 className="text-gray-900 mb-4 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-orange-600" />
              Informações Fiscais
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Inscrição Estadual</Label>
                <Input
                  value={getCurrentSettings().stateRegistration}
                  onChange={(e) => updateLocalSettings({ stateRegistration: e.target.value })}
                  placeholder="000.000.000.000"
                  disabled={!isEditMode}
                />
              </div>

              <div>
                <Label>Inscrição Municipal</Label>
                <Input
                  value={getCurrentSettings().municipalRegistration}
                  onChange={(e) => updateLocalSettings({ municipalRegistration: e.target.value })}
                  placeholder="00000000"
                  disabled={!isEditMode}
                />
              </div>

              <div>
                <Label>Regime Tributário</Label>
                <Select
                  value={getCurrentSettings().taxRegime}
                  onValueChange={(value) => updateLocalSettings({ taxRegime: value })}
                  disabled={!isEditMode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
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
                <Label>CNAE Principal</Label>
                <Input
                  value={getCurrentSettings().cnae}
                  onChange={(e) => updateLocalSettings({ cnae: e.target.value })}
                  placeholder="0000-0/00"
                  disabled={!isEditMode}
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-gray-900 flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-600" />
                  Alíquotas ICMS Interestadual
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Configure as alíquotas de ICMS para operações interestaduais
                </p>
              </div>
              {isEditMode && (
                <Dialog open={icmsDialogOpen} onOpenChange={setIcmsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Alíquota
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Alíquota ICMS</DialogTitle>
                      <DialogDescription>
                        Configure a alíquota de ICMS para um estado específico
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Estado (UF)</Label>
                        <Input
                          value={newICMSRate.state}
                          onChange={(e) => setNewICMSRate({ ...newICMSRate, state: e.target.value.toUpperCase() })}
                          placeholder="Ex: SP"
                          maxLength={2}
                        />
                      </div>
                      <div>
                        <Label>Alíquota (%)</Label>
                        <Input
                          type="number"
                          value={newICMSRate.rate}
                          onChange={(e) => setNewICMSRate({ ...newICMSRate, rate: e.target.value })}
                          placeholder="Ex: 12"
                          min="0"
                          max="100"
                          step="0.01"
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setIcmsDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleAddICMSRate}>
                          Adicionar
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            <div className="space-y-2">
              {(companySettings.icmsInterstateRates || []).map((rate) => (
                <div
                  key={rate.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <Badge>{rate.state}</Badge>
                    <span className="text-sm text-gray-700">{rate.rate}%</span>
                  </div>
                  {isEditMode && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteICMSRate(rate.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  )}
                </div>
              ))}
              {(!companySettings.icmsInterstateRates || companySettings.icmsInterstateRates.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <Info className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Nenhuma alíquota cadastrada</p>
                  {isEditMode && <p className="text-sm">Clique em "Adicionar Alíquota" para começar</p>}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* ABA 4: CONTAS BANCÁRIAS */}
        <TabsContent value="banks" className="space-y-6 mt-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-gray-900">Contas Bancárias</h3>
              <p className="text-sm text-gray-600">Gerencie as contas bancárias da empresa</p>
            </div>
            {isEditMode && (
              <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Conta
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Conta Bancária</DialogTitle>
                    <DialogDescription>
                      Cadastre uma nova conta bancária para controle financeiro
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Banco *</Label>
                      <Select
                        value={newBank.bankName}
                        onValueChange={(value) => setNewBank({ ...newBank, bankName: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o banco" />
                        </SelectTrigger>
                        <SelectContent>
                          {BANCOS_BRASILEIROS.map((banco) => (
                            <SelectItem key={banco.codigo} value={banco.nome}>
                              {banco.codigo} - {banco.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Tipo de Conta *</Label>
                      <Select
                        value={newBank.accountType}
                        onValueChange={(value: "Conta Corrente" | "Conta Poupança") => 
                          setNewBank({ ...newBank, accountType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Conta Corrente">Conta Corrente</SelectItem>
                          <SelectItem value="Conta Poupança">Conta Poupança</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Agência *</Label>
                      <Input
                        value={newBank.agency}
                        onChange={(e) => setNewBank({ ...newBank, agency: e.target.value })}
                        placeholder="0000"
                      />
                    </div>

                    <div>
                      <Label>Número da Conta *</Label>
                      <Input
                        value={newBank.accountNumber}
                        onChange={(e) => setNewBank({ ...newBank, accountNumber: e.target.value })}
                        placeholder="00000-0"
                      />
                    </div>

                    <div>
                      <Label>Saldo Inicial</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          className="pl-10"
                          type="number"
                          value={newBank.balance}
                          onChange={(e) => setNewBank({ ...newBank, balance: Number(e.target.value) })}
                          placeholder="0.00"
                          step="0.01"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Conta Principal</Label>
                      <Switch
                        checked={newBank.isPrimary}
                        onCheckedChange={(checked) => setNewBank({ ...newBank, isPrimary: checked })}
                      />
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setBankDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleAddBank}>
                        Adicionar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="grid gap-4">
            {companySettings.bankAccounts.map((account) => (
              <Card key={account.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Landmark className="w-5 h-5 text-blue-600" />
                      <h4 className="text-gray-900">{account.bankName}</h4>
                      {account.isPrimary && (
                        <Badge className="bg-green-100 text-green-700">Principal</Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>{account.accountType}</p>
                      <p>
                        Ag: {account.agency} | Conta: {account.accountNumber}
                      </p>
                      <p className="text-gray-900">
                        Saldo: R$ {account.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  {isEditMode && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteBankAccount(account.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}

            {companySettings.bankAccounts.length === 0 && (
              <Card className="p-8 text-center text-gray-500">
                <Landmark className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Nenhuma conta bancária cadastrada</p>
                {isEditMode && <p className="text-sm">Clique em "Nova Conta" para adicionar</p>}
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              Histórico de Alterações
            </DialogTitle>
            <DialogDescription>
              Visualize todas as alterações realizadas nas configurações da empresa
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[60vh]">
            {companyHistory.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nenhuma alteração registrada</p>
                <p className="text-sm text-gray-400 mt-1">
                  As alterações começarão a aparecer aqui quando você salvar modificações
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {companyHistory.map((entry, index) => (
                  <Card key={entry.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-blue-100 text-blue-700">
                            {new Date(entry.timestamp).toLocaleDateString('pt-BR')}
                          </Badge>
                          <Badge variant="outline">
                            {new Date(entry.timestamp).toLocaleTimeString('pt-BR')}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          Alterado por: <span className="text-gray-900">{entry.user}</span>
                        </p>
                      </div>
                      <Badge className="bg-purple-100 text-purple-700">
                        {entry.changes.length} {entry.changes.length === 1 ? 'campo' : 'campos'}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      {entry.changes.map((change, changeIndex) => (
                        <div 
                          key={changeIndex} 
                          className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                        >
                          <p className="text-sm text-gray-900 mb-2">
                            <strong>{change.fieldLabel}</strong>
                          </p>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <p className="text-gray-500 mb-1">Valor Anterior:</p>
                              <p className="text-red-700 bg-red-50 p-2 rounded border border-red-200">
                                {change.field === 'logo' 
                                  ? (change.oldValue ? '(Logo carregada)' : '(Sem logo)')
                                  : (change.oldValue || '(Vazio)')
                                }
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 mb-1">Novo Valor:</p>
                              <p className="text-green-700 bg-green-50 p-2 rounded border border-green-200">
                                {change.field === 'logo'
                                  ? (change.newValue ? '(Logo carregada)' : '(Sem logo)')
                                  : (change.newValue || '(Vazio)')
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setShowHistoryDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
