/**
 * ============================================================================
 * FATURAMENTO FISCAL - VERSÃO MODERNA E INTEGRADA
 * ============================================================================
 * - Integração completa com certificados A1 (sem upload .pem)
 * - Busca automática de dados do emitente (Company Settings)
 * - Seleção de destinatário dos clientes cadastrados
 * - Seleção de produtos do inventário
 * - Fluxo intuitivo e profissional
 */

import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Textarea } from "./ui/textarea";
import { Separator } from "./ui/separator";
import { Alert, AlertDescription } from "./ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "./ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { 
  Plus, FileText, Send, CheckCircle, XCircle, Clock, AlertCircle, 
  Building2, User, Package, ShoppingCart, Trash2, Edit, Eye, Download,
  Shield, BarChart3, Settings, FileCheck, X
} from "lucide-react";
import { useERP } from "../contexts/ERPContext";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner@2.0.3";
import { mapToNFeXMLData } from "../utils/nfeDataMapper";
import { projectId } from "../utils/supabase/info";
import { NFeList } from "./NFeList";
import { FiscalDashboard } from "./FiscalDashboard";

/* ========================================================================= */
/*                            INTERFACES                                     */
/* ========================================================================= */

interface NFeItem {
  id: string;
  productId: string;
  productName: string;
  ncm: string;
  cfop: string;
  quantity: number;
  unitValue: number;
  totalValue: number;
  // Tributos
  icmsAliquota: number;
  ipiAliquota: number;
  pisAliquota: number;
  cofinsAliquota: number;
}

interface CertificadoInfo {
  ativo: boolean;
  titular: string;
  cnpj: string;
  validade: string;
  vencido: boolean;
  diasRestantes: number;
}

/* ========================================================================= */
/*                         COMPONENTE PRINCIPAL                              */
/* ========================================================================= */

export function TaxInvoicingModern() {
  const { customers, inventory, companySettings } = useERP();
  const { session } = useAuth();
  
  // ===== STATE - TABS =====
  const [activeTab, setActiveTab] = useState<"emissao" | "dashboard" | "historico">("emissao");
  
  // ===== STATE - CERTIFICADO =====
  const [certificado, setCertificado] = useState<CertificadoInfo | null>(null);
  const [loadingCertificado, setLoadingCertificado] = useState(true);
  
  // ===== STATE - NF-e EM EDIÇÃO =====
  const [destinatarioId, setDestinatarioId] = useState("");
  const [naturezaOperacao, setNaturezaOperacao] = useState("Venda de mercadoria");
  const [serie, setSerie] = useState("1");
  const [numero, setNumero] = useState("1");
  const [items, setItems] = useState<NFeItem[]>([]);
  const [informacoesAdicionais, setInformacoesAdicionais] = useState("");
  
  // ===== STATE - DIALOG ADICIONAR PRODUTO =====
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productQuantity, setProductQuantity] = useState("1");
  const [productCFOP, setProductCFOP] = useState("5102");
  
  // ===== STATE - TRANSMISSÃO =====
  const [isTransmitting, setIsTransmitting] = useState(false);

  /* ======================================================================= */
  /*                       EFEITOS - CARREGAR DADOS                          */
  /* ======================================================================= */

  // Carregar informações do certificado
  useEffect(() => {
    carregarCertificado();
  }, []);

  // Sugerir próximo número de NF-e
  useEffect(() => {
    sugerirProximoNumero();
  }, []);

  /* ======================================================================= */
  /*                           FUNÇÕES - CERTIFICADO                         */
  /* ======================================================================= */

  const carregarCertificado = async () => {
    try {
      setLoadingCertificado(true);
      
      const token = session?.access_token;
      if (!token) {
        throw new Error("Não autenticado");
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/certificado/info`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (data.success && data.data) {
        setCertificado(data.data);
      } else {
        setCertificado(null);
      }

    } catch (error: any) {
      console.error("Erro ao carregar certificado:", error);
      setCertificado(null);
    } finally {
      setLoadingCertificado(false);
    }
  };

  /* ======================================================================= */
  /*                        FUNÇÕES - NUMERAÇÃO NF-e                         */
  /* ======================================================================= */

  const sugerirProximoNumero = async () => {
    try {
      const token = session?.access_token;
      if (!token) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/nfe/listar`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (data.success && data.data) {
        // Buscar maior número da série atual
        const nfesSerie = data.data.filter((n: any) => n.serie === parseInt(serie));
        if (nfesSerie.length > 0) {
          const maiorNumero = Math.max(...nfesSerie.map((n: any) => n.numero));
          setNumero(String(maiorNumero + 1));
        }
      }

    } catch (error) {
      console.error("Erro ao sugerir número:", error);
    }
  };

  /* ======================================================================= */
  /*                       FUNÇÕES - GERENCIAR ITENS                         */
  /* ======================================================================= */

  const limparFormulario = () => {
    setDestinatarioId("");
    setNaturezaOperacao("Venda de mercadoria");
    setSerie("1");
    setItems([]);
    setInformacoesAdicionais("");
    setActiveTab("emissao");
    sugerirProximoNumero();
    toast.success("Formulário limpo - Nova NF-e");
  };

  const adicionarProduto = () => {
    const produto = inventory.find(p => p.id === selectedProductId);
    
    if (!produto) {
      toast.error("Selecione um produto");
      return;
    }

    const qtd = parseFloat(productQuantity);
    if (isNaN(qtd) || qtd <= 0) {
      toast.error("Quantidade inválida");
      return;
    }

    // Validar preço do produto
    const precoUnitario = produto.sellPrice || 0;
    if (precoUnitario <= 0) {
      toast.error("Produto sem preço cadastrado", {
        description: "Configure o preço de venda do produto no inventário"
      });
      return;
    }

    // Validar estoque disponível
    if (qtd > produto.currentStock) {
      toast.error("Quantidade indisponível", {
        description: `Estoque disponível: ${produto.currentStock} ${produto.unit || ''}`
      });
      return;
    }

    const novoItem: NFeItem = {
      id: `item_${Date.now()}`,
      productId: produto.id,
      productName: produto.productName,
      ncm: produto.ncm || "00000000",
      cfop: productCFOP,
      quantity: qtd,
      unitValue: precoUnitario,
      totalValue: qtd * precoUnitario,
      icmsAliquota: produto.icmsRate || 18,
      ipiAliquota: produto.ipiRate || 0,
      pisAliquota: produto.pisRate || 1.65,
      cofinsAliquota: produto.cofinsRate || 7.6
    };

    setItems([...items, novoItem]);
    
    // Resetar form
    setSelectedProductId("");
    setProductQuantity("1");
    setProductCFOP("5102");
    setIsAddProductDialogOpen(false);
    
    toast.success(`${produto.productName} adicionado`);
  };

  const removerItem = (itemId: string) => {
    setItems(items.filter(i => i.id !== itemId));
    toast.success("Item removido");
  };

  /* ======================================================================= */
  /*                      FUNÇÕES - EMISSÃO E TRANSMISSÃO                    */
  /* ======================================================================= */

  const emitirNFe = async () => {
    try {
      // Validações
      if (!certificado?.ativo) {
        toast.error("Certificado digital não configurado", {
          description: "Vá em Configurações → Certificado Digital para fazer upload"
        });
        return;
      }

      if (!destinatarioId) {
        toast.error("Selecione um destinatário");
        return;
      }

      if (items.length === 0) {
        toast.error("Adicione pelo menos um produto");
        return;
      }

      if (!companySettings?.companyName || !companySettings?.cnpj) {
        toast.error("Configure os dados da empresa em Configurações");
        return;
      }

      setIsTransmitting(true);
      const token = session?.access_token;

      // 1. BUSCAR DADOS DO DESTINATÁRIO
      const destinatario = customers.find(c => c.id === destinatarioId);
      if (!destinatario) {
        throw new Error("Destinatário não encontrado");
      }

      // 2. PREPARAR DADOS DA NF-e
      const nfeData = mapToNFeXMLData(
        {
          serie,
          numero,
          naturezaOperacao,
          items,
          informacoesAdicionais
        },
        companySettings,
        destinatario
      );

      console.log("[EMITIR] Dados da NF-e:", nfeData);

      // 3. GERAR XML
      toast.loading("Gerando XML...", { id: "emitir" });
      
      const xmlResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/fiscal/nfe/gerar-xml-direto`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(nfeData)
        }
      );

      const xmlData = await xmlResponse.json();
      
      if (!xmlData.success) {
        throw new Error(xmlData.error || "Erro ao gerar XML");
      }

      // 4. ASSINAR XML
      toast.loading("Assinando digitalmente...", { id: "emitir" });
      
      const assinaturaResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/fiscal/nfe/assinar-xml`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            xml: xmlData.xml,
            chaveAcesso: xmlData.chaveAcesso
          })
        }
      );

      const assinaturaData = await assinaturaResponse.json();
      
      if (!assinaturaData.success) {
        throw new Error(assinaturaData.error || "Erro ao assinar XML");
      }

      // 5. TRANSMITIR PARA SEFAZ
      toast.loading("Transmitindo para SEFAZ...", { id: "emitir" });
      
      const transmissaoResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/sefaz/nfe/transmitir`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            xmlAssinado: assinaturaData.xmlAssinado,
            chaveAcesso: xmlData.chaveAcesso
          })
        }
      );

      const transmissaoData = await transmissaoResponse.json();
      
      if (!transmissaoData.success) {
        throw new Error(transmissaoData.error || "Erro ao transmitir");
      }

      // 6. CONSULTAR RESULTADO
      if (transmissaoData.nRec) {
        toast.loading("Consultando resultado...", { id: "emitir" });
        
        await new Promise(resolve => setTimeout(resolve, 3000)); // Aguardar 3s
        
        const consultaResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/sefaz/nfe/consultar-recibo`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              nRec: transmissaoData.nRec,
              chaveAcesso: xmlData.chaveAcesso
            })
          }
        );

        const consultaData = await consultaResponse.json();
        
        if (consultaData.success && consultaData.cStat === 100) {
          // 7. SALVAR NF-e AUTORIZADA
          await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/nfe/salvar`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({
                numero: parseInt(numero),
                serie: parseInt(serie),
                chaveAcesso: xmlData.chaveAcesso,
                status: "autorizada",
                ambiente: "homologacao",
                emitente: nfeData.emitente,
                destinatario: nfeData.destinatario,
                valorTotal: items.reduce((sum, i) => sum + i.totalValue, 0),
                valorProdutos: items.reduce((sum, i) => sum + i.totalValue, 0),
                xml: xmlData.xml,
                xmlAssinado: assinaturaData.xmlAssinado,
                protocolo: consultaData.nProt,
                dataAutorizacao: new Date().toISOString()
              })
            }
          );

          toast.success("NF-e autorizada com sucesso!", { 
            id: "emitir",
            description: `Protocolo: ${consultaData.nProt}` 
          });
          
          // Limpar formulário
          setItems([]);
          setDestinatarioId("");
          setInformacoesAdicionais("");
          sugerirProximoNumero();
          
        } else {
          throw new Error(consultaData.xMotivo || "NF-e rejeitada");
        }
      }

    } catch (error: any) {
      console.error("[EMITIR] Erro:", error);
      toast.error("Erro ao emitir NF-e", { 
        id: "emitir",
        description: error.message 
      });
    } finally {
      setIsTransmitting(false);
    }
  };

  /* ======================================================================= */
  /*                           CÁLCULOS                                      */
  /* ======================================================================= */

  const valorTotalProdutos = items.reduce((sum, item) => sum + item.totalValue, 0);
  const valorTotalICMS = items.reduce((sum, item) => sum + (item.totalValue * item.icmsAliquota / 100), 0);
  const valorTotalIPI = items.reduce((sum, item) => sum + (item.totalValue * item.ipiAliquota / 100), 0);
  const valorTotalPIS = items.reduce((sum, item) => sum + (item.totalValue * item.pisAliquota / 100), 0);
  const valorTotalCOFINS = items.reduce((sum, item) => sum + (item.totalValue * item.cofinsAliquota / 100), 0);
  const valorTotalNFe = valorTotalProdutos + valorTotalIPI;

  /* ======================================================================= */
  /*                              RENDER                                     */
  /* ======================================================================= */

  return (
    <div className="p-8">
      {/* HEADER */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl text-gray-900">Faturamento Fiscal</h1>
            <p className="text-gray-600">Emissão e gerenciamento de notas fiscais eletrônicas</p>
          </div>
          <Button onClick={limparFormulario} variant="default">
            <FileText className="h-4 w-4 mr-2" />
            Nova NF-e
          </Button>
        </div>

        {/* STATUS DO CERTIFICADO */}
        {loadingCertificado ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Carregando informações do certificado...</AlertDescription>
          </Alert>
        ) : certificado?.ativo ? (
          <Alert className="border-green-200 bg-green-50">
            <Shield className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Certificado ativo:</strong> {certificado.titular} ({certificado.cnpj}) · 
              Válido até {new Date(certificado.validade).toLocaleDateString()} · 
              <span className={certificado.diasRestantes < 30 ? "text-orange-600" : ""}>
                {certificado.diasRestantes} dias restantes
              </span>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Certificado não configurado.</strong> 
              Vá em <strong>Configurações &gt; Certificado Digital</strong> para fazer upload do seu certificado A1 (.pfx)
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* TABS */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList>
          <TabsTrigger value="emissao">
            <FileText className="h-4 w-4 mr-2" />
            Emissão
          </TabsTrigger>
          <TabsTrigger value="dashboard">
            <BarChart3 className="h-4 w-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="historico">
            <FileCheck className="h-4 w-4 mr-2" />
            Histórico
          </TabsTrigger>
        </TabsList>

        {/* =============================================================== */}
        {/*                     TAB: EMISSÃO                                */}
        {/* =============================================================== */}
        <TabsContent value="emissao" className="space-y-6 mt-6">
          <Card className="p-6">
            <h2 className="text-xl text-gray-900 mb-6">Nova Nota Fiscal Eletrônica</h2>

            <div className="space-y-6">
              {/* SEÇÃO: IDENTIFICAÇÃO */}
              <div>
                <h3 className="text-lg text-gray-900 mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-blue-600" />
                  Identificação
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Série</Label>
                    <Input 
                      value={serie} 
                      onChange={(e) => setSerie(e.target.value)}
                      type="number"
                    />
                  </div>
                  <div>
                    <Label>Número</Label>
                    <Input 
                      value={numero} 
                      onChange={(e) => setNumero(e.target.value)}
                      type="number"
                    />
                  </div>
                  <div>
                    <Label>Natureza da Operação</Label>
                    <Select value={naturezaOperacao} onValueChange={setNaturezaOperacao}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Venda de mercadoria">Venda de mercadoria</SelectItem>
                        <SelectItem value="Venda de produção">Venda de produção</SelectItem>
                        <SelectItem value="Remessa para demonstração">Remessa para demonstração</SelectItem>
                        <SelectItem value="Devolução de mercadoria">Devolução de mercadoria</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* SEÇÃO: EMITENTE */}
              <div>
                <h3 className="text-lg text-gray-900 mb-4 flex items-center">
                  <Building2 className="h-5 w-5 mr-2 text-green-600" />
                  Emitente
                </h3>
                {companySettings?.companyName ? (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-600">Razão Social</Label>
                        <p className="text-gray-900">{companySettings.companyName}</p>
                      </div>
                      <div>
                        <Label className="text-gray-600">Nome Fantasia</Label>
                        <p className="text-gray-900">{companySettings.tradeName || companySettings.companyName}</p>
                      </div>
                      <div>
                        <Label className="text-gray-600">CNPJ</Label>
                        <p className="text-gray-900">{companySettings.cnpj}</p>
                      </div>
                      <div>
                        <Label className="text-gray-600">IE</Label>
                        <p className="text-gray-900">{companySettings.stateRegistration || "Não informado"}</p>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-gray-600">Endereço</Label>
                        <p className="text-gray-900">
                          {companySettings.street ? 
                            `${companySettings.street}, ${companySettings.number || 'SN'}, ${companySettings.neighborhood || ''}, ${companySettings.city || ''} - ${companySettings.state || ''} ${companySettings.zipCode || ''}` 
                            : "Não informado"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Configure os dados da empresa em <strong>Configurações &gt; Empresa</strong>
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <Separator />

              {/* SEÇÃO: DESTINATÁRIO */}
              <div>
                <h3 className="text-lg text-gray-900 mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2 text-purple-600" />
                  Destinatário
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label>Selecione o Cliente</Label>
                    <Select value={destinatarioId} onValueChange={setDestinatarioId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente..." />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.length === 0 ? (
                          <div className="p-4 text-center text-gray-500">
                            Nenhum cliente cadastrado
                          </div>
                        ) : (
                          customers.map(customer => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name} - {customer.document}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {destinatarioId && (() => {
                    const cliente = customers.find(c => c.id === destinatarioId);
                    return cliente ? (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-gray-600">Nome</Label>
                            <p className="text-gray-900">{cliente.name}</p>
                          </div>
                          <div>
                            <Label className="text-gray-600">CPF/CNPJ</Label>
                            <p className="text-gray-900">{cliente.document}</p>
                          </div>
                          <div>
                            <Label className="text-gray-600">Cidade/UF</Label>
                            <p className="text-gray-900">{cliente.city || "N/A"}, {cliente.state || "N/A"}</p>
                          </div>
                          <div>
                            <Label className="text-gray-600">IE</Label>
                            <p className="text-gray-900">{cliente.stateRegistration || "Não contribuinte"}</p>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>

              <Separator />

              {/* SEÇÃO: PRODUTOS */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg text-gray-900 flex items-center">
                    <Package className="h-5 w-5 mr-2 text-orange-600" />
                    Produtos
                  </h3>
                  <Button 
                    onClick={() => setIsAddProductDialogOpen(true)}
                    size="sm"
                    disabled={inventory.length === 0}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Produto
                  </Button>
                </div>

                {items.length === 0 ? (
                  <Alert>
                    <Package className="h-4 w-4" />
                    <AlertDescription>
                      Nenhum produto adicionado. Clique em "Adicionar Produto" para incluir itens na nota fiscal.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead>NCM</TableHead>
                          <TableHead>CFOP</TableHead>
                          <TableHead className="text-right">Qtd</TableHead>
                          <TableHead className="text-right">Valor Unit.</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map(item => (
                          <TableRow key={item.id}>
                            <TableCell>{item.productName}</TableCell>
                            <TableCell>{item.ncm}</TableCell>
                            <TableCell>{item.cfop}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">
                              R$ {(item.unitValue || 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              R$ {(item.totalValue || 0).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removerItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <Separator />

              {/* SEÇÃO: TOTALIZADORES */}
              <div>
                <h3 className="text-lg text-gray-900 mb-4 flex items-center">
                  <ShoppingCart className="h-5 w-5 mr-2 text-indigo-600" />
                  Totalizadores
                </h3>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-gray-600">Valor dos Produtos</Label>
                      <p className="text-2xl text-gray-900">
                        R$ {valorTotalProdutos.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Total de Tributos</Label>
                      <p className="text-lg text-gray-700">
                        R$ {(valorTotalICMS + valorTotalIPI + valorTotalPIS + valorTotalCOFINS).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Valor Total da NF-e</Label>
                      <p className="text-2xl text-green-600">
                        R$ {valorTotalNFe.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <Label className="text-gray-600">ICMS</Label>
                      <p className="text-gray-900">R$ {valorTotalICMS.toFixed(2)}</p>
                    </div>
                    <div>
                      <Label className="text-gray-600">IPI</Label>
                      <p className="text-gray-900">R$ {valorTotalIPI.toFixed(2)}</p>
                    </div>
                    <div>
                      <Label className="text-gray-600">PIS</Label>
                      <p className="text-gray-900">R$ {valorTotalPIS.toFixed(2)}</p>
                    </div>
                    <div>
                      <Label className="text-gray-600">COFINS</Label>
                      <p className="text-gray-900">R$ {valorTotalCOFINS.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* SEÇÃO: INFORMAÇÕES ADICIONAIS */}
              <div>
                <Label>Informações Adicionais (opcional)</Label>
                <Textarea
                  value={informacoesAdicionais}
                  onChange={(e) => setInformacoesAdicionais(e.target.value)}
                  placeholder="Informações complementares da nota fiscal..."
                  rows={3}
                />
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setItems([]);
                    setDestinatarioId("");
                    setInformacoesAdicionais("");
                    toast.info("Formulário limpo");
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
                <Button
                  onClick={emitirNFe}
                  disabled={isTransmitting || !certificado?.ativo || items.length === 0 || !destinatarioId}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isTransmitting ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Emitir e Transmitir NF-e
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* =============================================================== */}
        {/*                     TAB: DASHBOARD                              */}
        {/* =============================================================== */}
        <TabsContent value="dashboard">
          <FiscalDashboard />
        </TabsContent>

        {/* =============================================================== */}
        {/*                     TAB: HISTÓRICO                              */}
        {/* =============================================================== */}
        <TabsContent value="historico">
          <NFeList />
        </TabsContent>
      </Tabs>

      {/* ================================================================= */}
      {/*                 DIALOG: ADICIONAR PRODUTO                         */}
      {/* ================================================================= */}
      <Dialog open={isAddProductDialogOpen} onOpenChange={setIsAddProductDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Produto</DialogTitle>
            <DialogDescription>
              Selecione um produto do inventário para adicionar à nota fiscal
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Produto</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto..." />
                </SelectTrigger>
                <SelectContent>
                  {inventory.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      Nenhum produto cadastrado no inventário
                    </div>
                  ) : (
                    inventory.map(produto => {
                      const displayName = produto.productName || produto.id || produto.ncm || `Produto #${produto.id?.slice(0, 8)}`;
                      const hasPrice = produto.sellPrice && produto.sellPrice > 0;
                      
                      return (
                        <SelectItem 
                          key={produto.id} 
                          value={produto.id}
                          disabled={!hasPrice}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className={!hasPrice ? "text-gray-400" : ""}>
                              {displayName}
                            </span>
                            <span className={`ml-4 ${!hasPrice ? "text-red-500" : "text-gray-600"}`}>
                              {hasPrice ? `R$ ${produto.sellPrice.toFixed(2)}` : "Sem preço"}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedProductId && (() => {
              const produto = inventory.find(p => p.id === selectedProductId);
              return produto ? (
                <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                  <p><strong>Nome:</strong> {produto.productName || <span className="text-gray-400 italic">Não informado</span>}</p>
                  <p><strong>ID:</strong> {produto.id || <span className="text-gray-400 italic">Não informado</span>}</p>
                  <p><strong>Estoque:</strong> {produto.currentStock !== undefined ? `${produto.currentStock} ${produto.unit || ''}` : <span className="text-gray-400 italic">Não informado</span>}</p>
                  <p><strong>Preço Venda:</strong> {produto.sellPrice ? `R$ ${produto.sellPrice.toFixed(2)}` : <span className="text-red-500">Sem preço cadastrado</span>}</p>
                  <p><strong>NCM:</strong> {produto.ncm || <span className="text-gray-400 italic">Não informado</span>}</p>
                </div>
              ) : null;
            })()}

            <div>
              <Label>Quantidade</Label>
              <Input
                type="number"
                value={productQuantity}
                onChange={(e) => setProductQuantity(e.target.value)}
                min="1"
                step="0.01"
              />
            </div>

            <div>
              <Label>CFOP</Label>
              <Select value={productCFOP} onValueChange={setProductCFOP}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5102">5102 - Venda de mercadoria adquirida</SelectItem>
                  <SelectItem value="5101">5101 - Venda de produção do estabelecimento</SelectItem>
                  <SelectItem value="6102">6102 - Venda de mercadoria (interestadual)</SelectItem>
                  <SelectItem value="5403">5403 - Venda para entrega futura</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddProductDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={adicionarProduto}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
