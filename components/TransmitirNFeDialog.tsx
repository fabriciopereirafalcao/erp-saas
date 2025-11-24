/**
 * ============================================================================
 * DIALOG: TRANSMITIR NF-e PARA SEFAZ
 * ============================================================================
 * 
 * Dialog profissional para transmissão de NF-e com:
 * - Seleção de ambiente (Homologação/Produção)
 * - Progresso em 4 etapas
 * - Resultados detalhados (autorizada/rejeitada)
 * - Download de XML autorizado
 * 
 * ============================================================================
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { CheckCircle, XCircle, Clock, Send, AlertCircle, Download, Loader2 } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { projectId, publicAnonKey } from "../utils/supabase/info";

// ============================================================================
// TIPOS
// ============================================================================

interface TransmitirNFeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nfeId: string;
  xml: string;
  uf: string;
  onSuccess?: () => void;
}

type Etapa = "idle" | "validando" | "transmitindo" | "aguardando" | "consultando" | "sucesso" | "erro";

interface ResultadoTransmissao {
  sucesso: boolean;
  etapa: Etapa;
  protocolo?: string;
  dataAutorizacao?: string;
  xmlAutorizado?: string;
  codigo?: string;
  mensagem?: string;
  erro?: string;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function TransmitirNFeDialog({
  open,
  onOpenChange,
  nfeId,
  xml,
  uf,
  onSuccess
}: TransmitirNFeDialogProps) {
  const [ambiente, setAmbiente] = useState<"1" | "2">("2"); // 1=Produção, 2=Homologação
  const [etapaAtual, setEtapaAtual] = useState<Etapa>("idle");
  const [resultado, setResultado] = useState<ResultadoTransmissao | null>(null);
  const [recibo, setRecibo] = useState<string | null>(null);

  // ==========================================================================
  // FUNÇÃO: TRANSMITIR NF-E
  // ==========================================================================

  const handleTransmitir = async () => {
    try {
      // 1. VALIDAÇÃO
      setEtapaAtual("validando");
      setResultado(null);

      if (!xml || xml.trim() === "") {
        throw new Error("XML da NF-e não encontrado");
      }

      // Aguardar 500ms (simular validação)
      await new Promise(resolve => setTimeout(resolve, 500));

      // 2. TRANSMITIR PARA SEFAZ
      setEtapaAtual("transmitindo");

      const accessToken = (await import("../utils/supabase/client")).supabase.auth.getSession().then(s => s.data.session?.access_token);

      const transmitirResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/sefaz/nfe/transmitir`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            nfeId,
            xml,
            uf,
            ambiente: parseInt(ambiente)
          })
        }
      );

      const transmitirData = await transmitirResponse.json();

      console.log("[TRANSMITIR] Resposta:", transmitirData);

      if (!transmitirData.success) {
        setEtapaAtual("erro");
        setResultado({
          sucesso: false,
          etapa: "erro",
          codigo: transmitirData.codigo,
          mensagem: transmitirData.mensagem,
          erro: transmitirData.error
        });
        toast.error("Erro na transmissão", {
          description: transmitirData.error || transmitirData.mensagem
        });
        return;
      }

      // 3. VERIFICAR SE FOI AUTORIZADO IMEDIATAMENTE (raro)
      if (transmitirData.data.protocolo) {
        setEtapaAtual("sucesso");
        setResultado({
          sucesso: true,
          etapa: "sucesso",
          protocolo: transmitirData.data.protocolo,
          mensagem: transmitirData.data.mensagem
        });
        toast.success("NF-e Autorizada!", {
          description: `Protocolo: ${transmitirData.data.protocolo}`
        });
        onSuccess?.();
        return;
      }

      // 4. LOTE RECEBIDO - AGUARDAR PROCESSAMENTO
      if (transmitirData.data.recibo) {
        setRecibo(transmitirData.data.recibo);
        setEtapaAtual("aguardando");

        toast.info("Lote recebido pela SEFAZ", {
          description: "Aguardando processamento..."
        });

        // Aguardar 3 segundos (tempo médio de processamento)
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 5. CONSULTAR RECIBO
        setEtapaAtual("consultando");

        const consultarResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/sefaz/nfe/consultar-recibo`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${publicAnonKey}`
            },
            body: JSON.stringify({
              nfeId,
              recibo: transmitirData.data.recibo,
              uf,
              ambiente: parseInt(ambiente),
              xmlOriginal: xml
            })
          }
        );

        const consultarData = await consultarResponse.json();

        console.log("[CONSULTAR] Resposta:", consultarData);

        if (!consultarData.success) {
          setEtapaAtual("erro");
          setResultado({
            sucesso: false,
            etapa: "erro",
            codigo: consultarData.codigo,
            mensagem: consultarData.mensagem,
            erro: consultarData.error
          });
          toast.error("NF-e Rejeitada", {
            description: consultarData.mensagem || consultarData.error
          });
          return;
        }

        // 6. AINDA PROCESSANDO?
        if (consultarData.data.status === "processando") {
          setEtapaAtual("aguardando");
          toast.warning("Ainda processando", {
            description: "Tente consultar novamente em alguns segundos"
          });
          return;
        }

        // 7. AUTORIZADO!
        if (consultarData.data.autorizado) {
          setEtapaAtual("sucesso");
          setResultado({
            sucesso: true,
            etapa: "sucesso",
            protocolo: consultarData.data.protocolo,
            dataAutorizacao: consultarData.data.dataAutorizacao,
            xmlAutorizado: consultarData.data.xmlAutorizado,
            mensagem: consultarData.data.mensagem
          });
          toast.success("NF-e Autorizada!", {
            description: `Protocolo: ${consultarData.data.protocolo}`
          });
          onSuccess?.();
          return;
        }

      }

    } catch (error: any) {
      console.error("[TRANSMITIR] Erro:", error);
      setEtapaAtual("erro");
      setResultado({
        sucesso: false,
        etapa: "erro",
        erro: error.message || "Erro desconhecido"
      });
      toast.error("Erro ao transmitir NF-e", {
        description: error.message
      });
    }
  };

  // ==========================================================================
  // FUNÇÃO: DOWNLOAD XML AUTORIZADO
  // ==========================================================================

  const handleDownloadXml = () => {
    if (!resultado?.xmlAutorizado) return;

    const blob = new Blob([resultado.xmlAutorizado], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nfe-autorizada-${resultado.protocolo}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("XML baixado com sucesso!");
  };

  // ==========================================================================
  // FUNÇÃO: RESETAR ESTADO
  // ==========================================================================

  const handleReset = () => {
    setEtapaAtual("idle");
    setResultado(null);
    setRecibo(null);
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  // ==========================================================================
  // RENDER: ETAPAS
  // ==========================================================================

  const renderEtapas = () => {
    const etapas = [
      { id: "validando", label: "Validando", icon: CheckCircle },
      { id: "transmitindo", label: "Transmitindo", icon: Send },
      { id: "aguardando", label: "Aguardando", icon: Clock },
      { id: "consultando", label: "Consultando", icon: CheckCircle }
    ];

    const etapaIndex = etapas.findIndex(e => e.id === etapaAtual);

    return (
      <div className="flex items-center justify-between mb-6">
        {etapas.map((etapa, index) => {
          const Icon = etapa.icon;
          const isActive = etapa.id === etapaAtual;
          const isCompleted = etapaIndex > index;
          const isFuture = etapaIndex < index;

          return (
            <div key={etapa.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center mb-2
                    ${isActive ? "bg-blue-500 text-white animate-pulse" : ""}
                    ${isCompleted ? "bg-green-500 text-white" : ""}
                    ${isFuture ? "bg-gray-200 text-gray-400" : ""}
                  `}
                >
                  {isActive ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={`
                    ${isActive ? "text-blue-600" : ""}
                    ${isCompleted ? "text-green-600" : ""}
                    ${isFuture ? "text-gray-400" : ""}
                  `}
                >
                  {etapa.label}
                </span>
              </div>
              {index < etapas.length - 1 && (
                <div
                  className={`
                    flex-1 h-0.5 mx-2 mt-[-24px]
                    ${isCompleted ? "bg-green-500" : "bg-gray-200"}
                  `}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ==========================================================================
  // RENDER: RESULTADO
  // ==========================================================================

  const renderResultado = () => {
    if (!resultado) return null;

    if (resultado.sucesso) {
      return (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="text-green-800">
                <strong>NF-e Autorizada com Sucesso!</strong>
              </p>
              {resultado.protocolo && (
                <p className="text-green-700">
                  <strong>Protocolo:</strong> {resultado.protocolo}
                </p>
              )}
              {resultado.dataAutorizacao && (
                <p className="text-green-700">
                  <strong>Data/Hora:</strong> {new Date(resultado.dataAutorizacao).toLocaleString("pt-BR")}
                </p>
              )}
              {resultado.mensagem && (
                <p className="text-green-700 text-sm">{resultado.mensagem}</p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Alert className="border-red-500 bg-red-50">
        <XCircle className="h-4 w-4 text-red-600" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="text-red-800">
              <strong>NF-e Rejeitada</strong>
            </p>
            {resultado.codigo && (
              <p className="text-red-700">
                <strong>Código:</strong> {resultado.codigo}
              </p>
            )}
            {resultado.mensagem && (
              <p className="text-red-700">{resultado.mensagem}</p>
            )}
            {resultado.erro && (
              <p className="text-red-600 text-sm">{resultado.erro}</p>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  // ==========================================================================
  // RENDER PRINCIPAL
  // ==========================================================================

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Transmitir NF-e para SEFAZ
          </DialogTitle>
          <DialogDescription>
            Envie a NF-e para autorização pela SEFAZ
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Seleção de Ambiente */}
          {etapaAtual === "idle" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ambiente">Ambiente de Emissão</Label>
                <Select value={ambiente} onValueChange={(v) => setAmbiente(v as "1" | "2")}>
                  <SelectTrigger id="ambiente">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-blue-50">Homologação</Badge>
                        <span className="text-sm text-gray-600">(Testes)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-green-50">Produção</Badge>
                        <span className="text-sm text-gray-600">(Oficial)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Use <strong>Homologação</strong> para testes. Apenas use <strong>Produção</strong> para NF-e reais.
                </p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="mb-2"><strong>Antes de transmitir, certifique-se:</strong></p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>XML foi assinado digitalmente</li>
                    <li>Dados do emitente estão corretos</li>
                    <li>Dados do destinatário estão corretos</li>
                    <li>Valores e impostos foram calculados</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <Separator />

              <div className="flex gap-2">
                <Button onClick={handleTransmitir} className="flex-1">
                  <Send className="w-4 h-4 mr-2" />
                  Transmitir para SEFAZ
                </Button>
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Progresso */}
          {(etapaAtual !== "idle" && etapaAtual !== "sucesso" && etapaAtual !== "erro") && (
            <div>
              {renderEtapas()}
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  {etapaAtual === "validando" && "Validando XML da NF-e..."}
                  {etapaAtual === "transmitindo" && "Enviando lote para SEFAZ..."}
                  {etapaAtual === "aguardando" && `Aguardando processamento (Recibo: ${recibo})...`}
                  {etapaAtual === "consultando" && "Consultando resultado..."}
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Resultado */}
          {(etapaAtual === "sucesso" || etapaAtual === "erro") && (
            <div className="space-y-4">
              {renderResultado()}

              <Separator />

              <div className="flex gap-2">
                {resultado?.sucesso && resultado.xmlAutorizado && (
                  <Button onClick={handleDownloadXml} variant="outline" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Baixar XML Autorizado
                  </Button>
                )}
                <Button onClick={handleClose} className="flex-1">
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
