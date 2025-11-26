/**
 * ============================================================================
 * DIALOG: TESTE RÁPIDO DE ENDPOINTS SEFAZ
 * ============================================================================
 * 
 * Dialog para testar rapidamente os endpoints REST do sistema SEFAZ.
 * 
 * ============================================================================
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { CheckCircle, XCircle, Loader2, AlertCircle, Play, Code } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { projectId } from "../utils/supabase/info";

// ============================================================================
// TIPOS
// ============================================================================

interface TesteSefazDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function TesteSefazDialog({ open, onOpenChange }: TesteSefazDialogProps) {
  const [uf, setUf] = useState("SP");
  const [ambiente, setAmbiente] = useState("2");
  const [recibo, setRecibo] = useState("123456789");
  const [chave, setChave] = useState("35240112345678000190550010000000011234567890");
  
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadingRecibo, setLoadingRecibo] = useState(false);
  const [loadingChave, setLoadingChave] = useState(false);
  
  const [resultStatus, setResultStatus] = useState<any>(null);
  const [resultRecibo, setResultRecibo] = useState<any>(null);
  const [resultChave, setResultChave] = useState<any>(null);

  const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88`;

  // ==========================================================================
  // TESTE 1: STATUS DO SERVIÇO
  // ==========================================================================

  const handleTestStatus = async () => {
    setLoadingStatus(true);
    setResultStatus(null);

    try {
      const url = `${baseUrl}/sefaz/status/${uf}/${ambiente}`;
      console.log(`[TESTE] GET ${url}`);
      
      const response = await fetch(url);
      const data = await response.json();
      
      setResultStatus(data);
      
      if (data.success) {
        toast.success("Status consultado com sucesso!");
      } else {
        toast.error("Erro ao consultar status");
      }
    } catch (error: any) {
      console.error("[TESTE] Erro:", error);
      setResultStatus({ success: false, error: error.message });
      toast.error("Erro na requisição");
    } finally {
      setLoadingStatus(false);
    }
  };

  // ==========================================================================
  // TESTE 2: CONSULTA DE RECIBO
  // ==========================================================================

  const handleTestRecibo = async () => {
    setLoadingRecibo(true);
    setResultRecibo(null);

    try {
      const url = `${baseUrl}/sefaz/consultar-recibo/${recibo}/${uf}/${ambiente}`;
      console.log(`[TESTE] GET ${url}`);
      
      const response = await fetch(url);
      const data = await response.json();
      
      setResultRecibo(data);
      
      if (data.success) {
        toast.success("Recibo consultado com sucesso!");
      } else {
        toast.error("Erro ao consultar recibo");
      }
    } catch (error: any) {
      console.error("[TESTE] Erro:", error);
      setResultRecibo({ success: false, error: error.message });
      toast.error("Erro na requisição");
    } finally {
      setLoadingRecibo(false);
    }
  };

  // ==========================================================================
  // TESTE 3: CONSULTA DE NF-E
  // ==========================================================================

  const handleTestChave = async () => {
    setLoadingChave(true);
    setResultChave(null);

    try {
      const url = `${baseUrl}/sefaz/consultar/${chave}/${uf}/${ambiente}`;
      console.log(`[TESTE] GET ${url}`);
      
      const response = await fetch(url);
      const data = await response.json();
      
      setResultChave(data);
      
      if (data.success) {
        toast.success("Chave consultada com sucesso!");
      } else {
        toast.error("Erro ao consultar chave");
      }
    } catch (error: any) {
      console.error("[TESTE] Erro:", error);
      setResultChave({ success: false, error: error.message });
      toast.error("Erro na requisição");
    } finally {
      setLoadingChave(false);
    }
  };

  // ==========================================================================
  // RENDER: RESULTADO JSON
  // ==========================================================================

  const renderResult = (result: any) => {
    if (!result) return null;

    const isSuccess = result.success;

    return (
      <Alert className={`mt-4 ${isSuccess ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}`}>
        {isSuccess ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <XCircle className="h-4 w-4 text-red-600" />
        )}
        <AlertDescription>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={isSuccess ? "default" : "destructive"}>
                {isSuccess ? "✓ Sucesso" : "✗ Erro"}
              </Badge>
            </div>
            
            <div className="mt-3 p-3 bg-white rounded border">
              <div className="flex items-center gap-2 mb-2">
                <Code className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-mono text-gray-700">JSON Response:</span>
              </div>
              <pre className="text-xs font-mono text-gray-800 overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>🧪 Teste Rápido de Endpoints SEFAZ</DialogTitle>
          <DialogDescription>
            Teste os endpoints REST do sistema de integração fiscal
          </DialogDescription>
        </DialogHeader>

        {/* Configurações Globais */}
        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <Label>UF</Label>
            <Select value={uf} onValueChange={setUf}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AC">AC - Acre</SelectItem>
                <SelectItem value="AL">AL - Alagoas</SelectItem>
                <SelectItem value="AP">AP - Amapá</SelectItem>
                <SelectItem value="AM">AM - Amazonas</SelectItem>
                <SelectItem value="BA">BA - Bahia</SelectItem>
                <SelectItem value="CE">CE - Ceará</SelectItem>
                <SelectItem value="DF">DF - Distrito Federal</SelectItem>
                <SelectItem value="ES">ES - Espírito Santo</SelectItem>
                <SelectItem value="GO">GO - Goiás</SelectItem>
                <SelectItem value="MA">MA - Maranhão</SelectItem>
                <SelectItem value="MT">MT - Mato Grosso</SelectItem>
                <SelectItem value="MS">MS - Mato Grosso do Sul</SelectItem>
                <SelectItem value="MG">MG - Minas Gerais</SelectItem>
                <SelectItem value="PA">PA - Pará</SelectItem>
                <SelectItem value="PB">PB - Paraíba</SelectItem>
                <SelectItem value="PR">PR - Paraná</SelectItem>
                <SelectItem value="PE">PE - Pernambuco</SelectItem>
                <SelectItem value="PI">PI - Piauí</SelectItem>
                <SelectItem value="RJ">RJ - Rio de Janeiro</SelectItem>
                <SelectItem value="RN">RN - Rio Grande do Norte</SelectItem>
                <SelectItem value="RS">RS - Rio Grande do Sul</SelectItem>
                <SelectItem value="RO">RO - Rondônia</SelectItem>
                <SelectItem value="RR">RR - Roraima</SelectItem>
                <SelectItem value="SC">SC - Santa Catarina</SelectItem>
                <SelectItem value="SP">SP - São Paulo</SelectItem>
                <SelectItem value="SE">SE - Sergipe</SelectItem>
                <SelectItem value="TO">TO - Tocantins</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Ambiente</Label>
            <Select value={ambiente} onValueChange={setAmbiente}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 - Produção</SelectItem>
                <SelectItem value="2">2 - Homologação</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabs de Testes */}
        <Tabs defaultValue="status" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="status">Status Serviço</TabsTrigger>
            <TabsTrigger value="recibo">Consulta Recibo</TabsTrigger>
            <TabsTrigger value="chave">Consulta Chave</TabsTrigger>
          </TabsList>

          {/* TESTE 1: STATUS */}
          <TabsContent value="status" className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Endpoint:</strong> GET /sefaz/status/:uf/:ambiente
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleTestStatus}
              disabled={loadingStatus}
              className="w-full"
            >
              {loadingStatus ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Consultando...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Testar Status do Serviço
                </>
              )}
            </Button>

            {renderResult(resultStatus)}
          </TabsContent>

          {/* TESTE 2: RECIBO */}
          <TabsContent value="recibo" className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Endpoint:</strong> GET /sefaz/consultar-recibo/:recibo/:uf/:ambiente
              </AlertDescription>
            </Alert>

            <div>
              <Label>Número do Recibo</Label>
              <Input
                value={recibo}
                onChange={(e) => setRecibo(e.target.value)}
                placeholder="123456789"
              />
            </div>

            <Button
              onClick={handleTestRecibo}
              disabled={loadingRecibo || !recibo}
              className="w-full"
            >
              {loadingRecibo ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Consultando...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Consultar Recibo
                </>
              )}
            </Button>

            {renderResult(resultRecibo)}
          </TabsContent>

          {/* TESTE 3: CHAVE */}
          <TabsContent value="chave" className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Endpoint:</strong> GET /sefaz/consultar/:chave/:uf/:ambiente
              </AlertDescription>
            </Alert>

            <div>
              <Label>Chave de Acesso (44 dígitos)</Label>
              <Input
                value={chave}
                onChange={(e) => setChave(e.target.value)}
                placeholder="35240112345678000190550010000000011234567890"
                maxLength={44}
              />
            </div>

            <Button
              onClick={handleTestChave}
              disabled={loadingChave || chave.length !== 44}
              className="w-full"
            >
              {loadingChave ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Consultando...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Consultar Chave
                </>
              )}
            </Button>

            {renderResult(resultChave)}
          </TabsContent>
        </Tabs>

        {/* Rodapé com Info */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
          <strong>💡 Dica:</strong> Todos os endpoints possuem fallback simulado e funcionam sem certificado SSL válido.
        </div>
      </DialogContent>
    </Dialog>
  );
}
