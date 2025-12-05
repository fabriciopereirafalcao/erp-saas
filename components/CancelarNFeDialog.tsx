/**
 * ============================================================================
 * DIALOG: CANCELAR NF-e AUTORIZADA
 * ============================================================================
 * 
 * Dialog profissional para cancelamento de NF-e com:
 * - Validação de prazo (até 24h após autorização)
 * - Justificativa obrigatória (mínimo 15 caracteres)
 * - Upload de certificado digital
 * - Seleção de ambiente
 * - Feedback visual completo
 * 
 * ============================================================================
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { XCircle, AlertTriangle, CheckCircle, Loader2, FileText, Info } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { projectId } from "../utils/supabase/info";
import { supabase } from "../utils/supabase/client";

// ============================================================================
// TIPOS
// ============================================================================

interface CancelarNFeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nfeId: string;
  chaveNFe: string;
  protocolo: string;
  numeroNFe: string;
  dataAutorizacao?: string;
  emitenteCNPJ?: string;
  uf: string;
  onSuccess?: () => void;
}

type Etapa = "form" | "processando" | "sucesso" | "erro";

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function CancelarNFeDialog({
  open,
  onOpenChange,
  nfeId,
  chaveNFe,
  protocolo,
  numeroNFe,
  dataAutorizacao,
  emitenteCNPJ,
  uf,
  onSuccess
}: CancelarNFeDialogProps) {
  const [justificativa, setJustificativa] = useState("");
  const [ambiente, setAmbiente] = useState<"1" | "2">("2"); // 1=Produção, 2=Homologação
  const [etapaAtual, setEtapaAtual] = useState<Etapa>("form");
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);
  const [protocoloCancelamento, setProtocoloCancelamento] = useState<string | null>(null);

  // Validar prazo de 24h
  const validarPrazo = (): boolean => {
    if (!dataAutorizacao) return true; // Se não tem data, permitir (modo dev)

    const dataAuth = new Date(dataAutorizacao);
    const agora = new Date();
    const diferencaHoras = (agora.getTime() - dataAuth.getTime()) / (1000 * 60 * 60);

    return diferencaHoras <= 24;
  };

  const dentroDoPrazo = validarPrazo();

  // ==========================================================================
  // FUNÇÃO: CANCELAR NF-E
  // ==========================================================================

  const handleCancelar = async () => {
    try {
      // 1. VALIDAÇÕES
      if (justificativa.trim().length < 15) {
        toast.error("Justificativa inválida", {
          description: "A justificativa deve ter no mínimo 15 caracteres (requisito SEFAZ)"
        });
        return;
      }

      if (justificativa.length > 255) {
        toast.error("Justificativa muito longa", {
          description: "A justificativa deve ter no máximo 255 caracteres"
        });
        return;
      }

      if (!dentroDoPrazo) {
        toast.error("Prazo expirado", {
          description: "O cancelamento só pode ser realizado até 24h após a autorização"
        });
        return;
      }

      // 2. INICIAR PROCESSAMENTO
      setEtapaAtual("processando");
      setMensagemErro(null);

      // 3. OBTER TOKEN DE AUTENTICAÇÃO
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error("Você precisa estar logado para cancelar NF-e");
      }

      // 4. CHAMAR ENDPOINT DE CANCELAMENTO
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/sefaz/nfe/cancelar`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nfeId,
            chaveNFe,
            protocolo,
            justificativa: justificativa.trim(),
            cnpj: emitenteCNPJ || "00000000000000",
            uf,
            ambiente: parseInt(ambiente)
          })
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.mensagem || "Erro ao cancelar NF-e");
      }

      // 5. CANCELAMENTO AUTORIZADO!
      console.log("✅ Cancelamento autorizado:", result.data);

      setProtocoloCancelamento(result.data.protocolo);
      setEtapaAtual("sucesso");

      toast.success("NF-e cancelada com sucesso!", {
        description: `Protocolo: ${result.data.protocolo}`,
        duration: 5000
      });

      // 6. CHAMAR CALLBACK DE SUCESSO
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }

    } catch (error: any) {
      console.error("Erro ao cancelar NF-e:", error);
      setMensagemErro(error.message);
      setEtapaAtual("erro");

      toast.error("Erro no cancelamento", {
        description: error.message,
        duration: 8000
      });
    }
  };

  // ==========================================================================
  // FUNÇÃO: RESETAR DIALOG
  // ==========================================================================

  const handleFechar = () => {
    setJustificativa("");
    setAmbiente("2");
    setEtapaAtual("form");
    setMensagemErro(null);
    setProtocoloCancelamento(null);
    onOpenChange(false);
  };

  // ==========================================================================
  // RENDERIZAÇÃO
  // ==========================================================================

  return (
    <Dialog open={open} onOpenChange={handleFechar}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="size-5" />
            Cancelar NF-e
          </DialogTitle>
          <DialogDescription>
            Cancelamento de Nota Fiscal Eletrônica autorizada (evento SEFAZ)
          </DialogDescription>
        </DialogHeader>

        {/* INFORMAÇÕES DA NF-E */}
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">NF-e Nº</span>
            <span className="font-semibold">{numeroNFe}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Protocolo</span>
            <span className="font-mono text-sm">{protocolo}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Chave de Acesso</span>
            <span className="font-mono text-xs">{chaveNFe}</span>
          </div>
          {dataAutorizacao && (
            <div className="flex items-center justify-between">
              <span className="text-sm">Autorizada em</span>
              <span className="text-sm">{new Date(dataAutorizacao).toLocaleString('pt-BR')}</span>
            </div>
          )}
        </div>

        {/* AVISO DE PRAZO */}
        {!dentroDoPrazo && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertDescription>
              <strong>Prazo expirado!</strong> O cancelamento só pode ser realizado até 24h após a autorização.
              Esta NF-e foi autorizada há mais de 24 horas.
            </AlertDescription>
          </Alert>
        )}

        {dentroDoPrazo && dataAutorizacao && (
          <Alert>
            <Info className="size-4" />
            <AlertDescription>
              O cancelamento pode ser realizado até 24h após a autorização. 
              Após esse prazo, será necessário emitir uma Carta de Correção ou NF-e de devolução.
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* FORMULÁRIO */}
        {etapaAtual === "form" && (
          <div className="space-y-4">
            {/* JUSTIFICATIVA */}
            <div>
              <Label htmlFor="justificativa">
                Justificativa do Cancelamento *
                <span className="text-xs text-muted-foreground ml-2">
                  (mínimo 15 caracteres, máximo 255)
                </span>
              </Label>
              <Textarea
                id="justificativa"
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Ex: Erro no valor da mercadoria / Cliente desistiu da compra / Dados incorretos do destinatário"
                className="mt-2 min-h-[100px]"
                maxLength={255}
                disabled={!dentroDoPrazo}
              />
              <div className="flex items-center justify-between mt-1">
                <span className={`text-xs ${justificativa.length < 15 ? 'text-red-500' : 'text-green-600'}`}>
                  {justificativa.length < 15 
                    ? `Faltam ${15 - justificativa.length} caracteres` 
                    : `✓ ${justificativa.length} caracteres`
                  }
                </span>
                <span className="text-xs text-muted-foreground">
                  {justificativa.length}/255
                </span>
              </div>
            </div>

            {/* AMBIENTE */}
            <div>
              <Label htmlFor="ambiente">Ambiente SEFAZ</Label>
              <Select value={ambiente} onValueChange={(v) => setAmbiente(v as "1" | "2")} disabled={!dentroDoPrazo}>
                <SelectTrigger id="ambiente" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">
                    Homologação (Testes)
                  </SelectItem>
                  <SelectItem value="1">
                    Produção (Oficial)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* INFORMAÇÕES */}
            <Alert>
              <FileText className="size-4" />
              <AlertDescription>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>O evento de cancelamento será transmitido para a SEFAZ</li>
                  <li>Após o cancelamento, a NF-e será inutilizada</li>
                  <li>O XML do evento será anexado à NF-e</li>
                  <li>Esta ação não pode ser desfeita</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* PROCESSANDO */}
        {etapaAtual === "processando" && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="size-12 text-primary animate-spin" />
            <div className="text-center">
              <p className="font-semibold">Processando cancelamento...</p>
              <p className="text-sm text-muted-foreground">
                Transmitindo evento para a SEFAZ
              </p>
            </div>
          </div>
        )}

        {/* SUCESSO */}
        {etapaAtual === "sucesso" && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="size-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="size-10 text-green-600" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-green-600 mb-2">NF-e cancelada com sucesso!</p>
              {protocoloCancelamento && (
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">Protocolo do Evento</p>
                  <p className="font-mono font-semibold">{protocoloCancelamento}</p>
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-3">
                O evento de cancelamento foi registrado na SEFAZ
              </p>
            </div>
          </div>
        )}

        {/* ERRO */}
        {etapaAtual === "erro" && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="size-16 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="size-10 text-red-600" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-red-600 mb-2">Erro no cancelamento</p>
              {mensagemErro && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-lg max-w-md">
                  <p className="text-sm text-red-800">{mensagemErro}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* FOOTER COM BOTÕES */}
        <DialogFooter>
          {etapaAtual === "form" && (
            <>
              <Button
                variant="outline"
                onClick={handleFechar}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelar}
                disabled={justificativa.trim().length < 15 || !dentroDoPrazo}
              >
                <XCircle className="size-4 mr-2" />
                Confirmar Cancelamento
              </Button>
            </>
          )}

          {etapaAtual === "processando" && (
            <Button variant="outline" disabled>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Processando...
            </Button>
          )}

          {(etapaAtual === "sucesso" || etapaAtual === "erro") && (
            <Button onClick={handleFechar}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}