/**
 * ============================================================================
 * COMPONENTE: Diálogo de Assinatura Digital de XML NF-e
 * ============================================================================
 * 
 * Interface para assinatura digital de XML NF-e com certificado A1
 * 
 * ============================================================================
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { 
  CheckCircle, 
  XCircle, 
  FileCheck, 
  Download, 
  Loader2,
  PenTool 
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { CertificateUploadPEM, type CertificadoPEM } from './CertificateUploadPEM';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';

// ============================================================================
// TIPOS
// ============================================================================

interface SignXmlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  xmlContent: string;
  chaveAcesso: string;
  nfeId?: string; // Opcional: ID da NF-e para atualizar no banco após assinatura
  accessToken: string;
  onSuccess?: (xmlAssinado: string) => void; // Callback após assinar com sucesso
}

enum SigningStage {
  CERTIFICATE_UPLOAD = 'certificate_upload',
  SIGNING = 'signing',
  SUCCESS = 'success',
  ERROR = 'error'
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function SignXmlDialog({
  open,
  onOpenChange,
  xmlContent,
  chaveAcesso,
  nfeId,
  accessToken,
  onSuccess
}: SignXmlDialogProps) {
  
  const [stage, setStage] = useState<SigningStage>(SigningStage.CERTIFICATE_UPLOAD);
  const [certificado, setCertificado] = useState<CertificadoPEM | null>(null);
  const [xmlAssinado, setXmlAssinado] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState(0);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  /**
   * Handler quando certificado é carregado
   */
  const handleCertificateLoaded = (cert: CertificadoPEM) => {
    console.log('Certificado carregado:', cert.titular);
    setCertificado(cert);
    toast.success('Certificado pronto para uso');
  };

  /**
   * Handler para assinar XML
   */
  const handleSignXml = async () => {
    if (!certificado) {
      toast.error('Certificado não carregado');
      return;
    }

    setStage(SigningStage.SIGNING);
    setProgress(0);
    setError('');

    try {
      // Progresso: Preparando dados
      setProgress(20);
      console.log('📝 Preparando assinatura...');

      // Buscar token de acesso (fallback se não foi passado via prop)
      let token = accessToken;
      if (!token) {
        console.log('⚠️ Token não fornecido via prop, buscando da sessão...');
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast.error('Sessão expirada. Faça login novamente.');
          setStage(SigningStage.ERROR);
          setError('Sessão expirada. Faça login novamente.');
          return;
        }
        token = session.access_token;
      }

      console.log('🔑 Token obtido:', token ? 'SIM' : 'NÃO');

      // Preparar payload
      const payload = {
        xml: xmlContent,
        certificadoPem: certificado.certificadoPem,
        chavePrivadaPem: certificado.chavePrivadaPem,
        nfeId: nfeId || undefined
      };

      // DEBUG: Verificar se a chave privada existe
      console.log('🔍 DEBUG Payload:');
      console.log('  - xml:', xmlContent ? `${xmlContent.length} bytes` : 'VAZIO');
      console.log('  - certificadoPem:', certificado.certificadoPem ? `${certificado.certificadoPem.length} bytes` : 'VAZIO');
      console.log('  - chavePrivadaPem:', certificado.chavePrivadaPem ? `${certificado.chavePrivadaPem.length} bytes` : 'VAZIO');
      console.log('  - chavePrivadaPem (primeiros 50):', certificado.chavePrivadaPem?.substring(0, 50) || 'VAZIO');

      // Progresso: Enviando para backend
      setProgress(40);
      console.log('🔐 Enviando para assinatura...');

      // Chamar API de assinatura
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/fiscal/nfe/assinar-xml`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        }
      );

      // Progresso: Processando resposta
      setProgress(70);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Erro na resposta da API:', errorData);
        throw new Error(errorData.details || errorData.error || 'Erro ao assinar XML');
      }

      const result = await response.json();
      console.log('✅ Resposta da API:', result);

      if (!result.success || !result.data?.xmlAssinado) {
        throw new Error('Resposta inválida da API de assinatura');
      }

      // Progresso: Finalizado
      setProgress(100);
      setXmlAssinado(result.data.xmlAssinado);
      setStage(SigningStage.SUCCESS);

      toast.success('XML assinado com sucesso!');
      console.log('✅ XML assinado com sucesso!');

      // Chamar callback de sucesso se fornecido
      if (onSuccess) {
        onSuccess(result.data.xmlAssinado);
      }

    } catch (err: any) {
      console.error('❌ Erro ao assinar XML:', err);
      setError(err.message || 'Erro desconhecido ao assinar XML');
      setStage(SigningStage.ERROR);
      toast.error('Erro ao assinar XML', {
        description: err.message
      });
    }
  };

  /**
   * Handler para baixar XML assinado
   */
  const handleDownloadSignedXml = () => {
    try {
      const blob = new Blob([xmlAssinado], { type: 'application/xml' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NFe-${chaveAcesso}-ASSINADO.xml`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('XML assinado baixado com sucesso!');
    } catch (err: any) {
      console.error('Erro ao baixar XML:', err);
      toast.error('Erro ao baixar XML');
    }
  };

  /**
   * Handler para fechar diálogo
   */
  const handleClose = () => {
    // Resetar estado
    setStage(SigningStage.CERTIFICATE_UPLOAD);
    setCertificado(null);
    setXmlAssinado('');
    setError('');
    setProgress(0);
    
    onOpenChange(false);
  };

  /**
   * Handler para tentar novamente
   */
  const handleRetry = () => {
    setStage(SigningStage.CERTIFICATE_UPLOAD);
    setError('');
    setProgress(0);
  };

  // ==========================================================================
  // RENDER - CONTEÚDO BASEADO NO ESTÁGIO
  // ==========================================================================

  const renderContent = () => {
    switch (stage) {
      
      // ESTÁGIO 1: Upload do Certificado
      case SigningStage.CERTIFICATE_UPLOAD:
        return (
          <div className="space-y-4">
            <Alert>
              <FileCheck className="size-4" />
              <AlertDescription>
                <p className="font-medium">XML pronto para assinatura</p>
                <p className="text-sm mt-1">Chave de Acesso: {chaveAcesso}</p>
                <p className="text-sm">Tamanho: {xmlContent.length} bytes</p>
              </AlertDescription>
            </Alert>

            <CertificateUploadPEM onCertificateLoaded={handleCertificateLoaded} />

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSignXml}
                disabled={!certificado}
                className="flex-1"
              >
                <PenTool className="size-4 mr-2" />
                Assinar XML Digitalmente
              </Button>
              <Button
                variant="outline"
                onClick={handleClose}
              >
                Cancelar
              </Button>
            </div>
          </div>
        );

      // ESTÁGIO 2: Assinando
      case SigningStage.SIGNING:
        return (
          <div className="space-y-6 py-8">
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="size-12 animate-spin text-primary" />
              <div className="text-center space-y-2">
                <p className="font-medium">Assinando XML digitalmente...</p>
                <p className="text-sm text-muted-foreground">
                  Processando assinatura com certificado digital
                </p>
              </div>
            </div>
            
            <Progress value={progress} className="w-full" />
            
            <p className="text-center text-sm text-muted-foreground">
              Progresso: {progress}%
            </p>
          </div>
        );

      // ESTÁGIO 3: Sucesso
      case SigningStage.SUCCESS:
        return (
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="size-4 text-green-600" />
              <AlertDescription>
                <p className="font-medium text-green-900">✅ XML assinado com sucesso!</p>
                <div className="mt-2 text-sm text-green-800 space-y-1">
                  <p>Chave de Acesso: {chaveAcesso}</p>
                  <p>Tamanho do XML assinado: {xmlAssinado.length} bytes</p>
                  {nfeId && <p>NF-e atualizada no banco de dados</p>}
                </div>
              </AlertDescription>
            </Alert>

            <div className="rounded-lg border p-4 bg-muted/30">
              <p className="font-medium mb-2">Próximos Passos:</p>
              <ol className="text-sm space-y-1 list-decimal list-inside">
                <li>Baixar XML assinado</li>
                <li>Validar assinatura (opcional)</li>
                <li>Transmitir para SEFAZ</li>
              </ol>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleDownloadSignedXml}
                className="flex-1"
              >
                <Download className="size-4 mr-2" />
                Baixar XML Assinado
              </Button>
              <Button
                variant="outline"
                onClick={handleClose}
              >
                Fechar
              </Button>
            </div>
          </div>
        );

      // ESTÁGIO 4: Erro
      case SigningStage.ERROR:
        return (
          <div className="space-y-4">
            <Alert variant="destructive">
              <XCircle className="size-4" />
              <AlertDescription>
                <p className="font-medium">❌ Erro ao assinar XML</p>
                <p className="text-sm mt-2">{error}</p>
              </AlertDescription>
            </Alert>

            <div className="rounded-lg border p-4 bg-muted/30">
              <p className="font-medium mb-2">Possíveis causas:</p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Certificado digital inválido ou expirado</li>
                <li>Chave privada não corresponde ao certificado</li>
                <li>Formato PEM incorreto</li>
                <li>Erro de rede ou servidor</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleRetry}
                variant="outline"
                className="flex-1"
              >
                Tentar Novamente
              </Button>
              <Button
                variant="outline"
                onClick={handleClose}
              >
                Fechar
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ==========================================================================
  // RENDER PRINCIPAL
  // ==========================================================================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenTool className="size-5" />
            Assinatura Digital de XML NF-e
          </DialogTitle>
          <DialogDescription>
            Assine o XML da NF-e com seu certificado digital A1 (formato PEM)
          </DialogDescription>
        </DialogHeader>

        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}