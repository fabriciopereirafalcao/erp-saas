/**
 * ============================================================================
 * COMPONENTE: Upload de Certificado Digital (Formato PEM)
 * ============================================================================
 * 
 * Interface para upload de certificado e chave privada em formato PEM
 * (já convertidos de .pfx usando OpenSSL)
 * 
 * CONVERSÃO PRÉVIA NECESSÁRIA:
 * openssl pkcs12 -in cert.pfx -clcerts -nokeys -out certificado.pem
 * openssl pkcs12 -in cert.pfx -nocerts -nodes -out chave-privada.pem
 * 
 * ============================================================================
 */

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Upload, Key, CheckCircle, XCircle, FileText, Info } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// ============================================================================
// TIPOS
// ============================================================================

export interface CertificadoPEM {
  certificadoPem: string; // Certificado X.509 em formato PEM
  chavePrivadaPem: string; // Chave privada em formato PEM
  valido: boolean;
  titular?: string;
}

interface CertificateUploadPEMProps {
  onCertificateLoaded: (certificado: CertificadoPEM) => void;
  className?: string;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function CertificateUploadPEM({ 
  onCertificateLoaded,
  className = ''
}: CertificateUploadPEMProps) {
  
  const [certificadoPem, setCertificadoPem] = useState('');
  const [chavePrivadaPem, setChavePrivadaPem] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<'file' | 'paste'>('file');

  // ==========================================================================
  // VALIDAÇÃO
  // ==========================================================================

  /**
   * Valida formato PEM do certificado
   */
  const validarCertificadoPEM = (pem: string): boolean => {
    return pem.includes('-----BEGIN CERTIFICATE-----') && 
           pem.includes('-----END CERTIFICATE-----');
  };

  /**
   * Valida formato PEM da chave privada
   */
  const validarChavePrivadaPEM = (pem: string): boolean => {
    return (
      (pem.includes('-----BEGIN PRIVATE KEY-----') && pem.includes('-----END PRIVATE KEY-----')) ||
      (pem.includes('-----BEGIN RSA PRIVATE KEY-----') && pem.includes('-----END RSA PRIVATE KEY-----'))
    );
  };

  // ==========================================================================
  // HANDLERS - UPLOAD DE ARQUIVO
  // ==========================================================================

  /**
   * Handler para upload de certificado (arquivo)
   */
  const handleCertificateFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      
      if (!validarCertificadoPEM(text)) {
        setError('Arquivo não contém um certificado PEM válido');
        toast.error('Certificado inválido');
        return;
      }

      setCertificadoPem(text);
      setError(null);
      toast.success('Certificado carregado');
    } catch (err: any) {
      setError(`Erro ao ler arquivo: ${err.message}`);
      toast.error('Erro ao ler arquivo');
    }
  };

  /**
   * Handler para upload de chave privada (arquivo)
   */
  const handlePrivateKeyFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      
      if (!validarChavePrivadaPEM(text)) {
        setError('Arquivo não contém uma chave privada PEM válida');
        toast.error('Chave privada inválida');
        return;
      }

      setChavePrivadaPem(text);
      setError(null);
      toast.success('Chave privada carregada');
    } catch (err: any) {
      setError(`Erro ao ler arquivo: ${err.message}`);
      toast.error('Erro ao ler arquivo');
    }
  };

  // ==========================================================================
  // HANDLERS - VALIDAÇÃO E SUBMISSÃO
  // ==========================================================================

  /**
   * Valida e processa certificado
   */
  const handleValidate = () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Validar certificado
      if (!certificadoPem || !validarCertificadoPEM(certificadoPem)) {
        throw new Error('Certificado PEM inválido ou não fornecido');
      }

      // Validar chave privada
      if (!chavePrivadaPem || !validarChavePrivadaPEM(chavePrivadaPem)) {
        throw new Error('Chave privada PEM inválida ou não fornecida');
      }

      // Extrair informações do certificado (simplificado)
      // Em produção, usar biblioteca para parsing completo
      const titular = extrairTitular(certificadoPem);

      // Criar objeto certificado
      const certificado: CertificadoPEM = {
        certificadoPem: certificadoPem.trim(),
        chavePrivadaPem: chavePrivadaPem.trim(),
        valido: true,
        titular
      };

      // Callback
      onCertificateLoaded(certificado);
      
      setSuccess(true);
      toast.success('Certificado validado com sucesso!');
      
    } catch (err: any) {
      console.error('Erro ao validar certificado:', err);
      setError(err.message);
      toast.error('Erro na validação', {
        description: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Extrai titular do certificado (parsing simplificado)
   */
  const extrairTitular = (certPem: string): string | undefined => {
    try {
      // Parse básico do Subject do certificado
      // Em produção, usar biblioteca como node-forge ou x509.js
      const base64Match = certPem.match(/-----BEGIN CERTIFICATE-----\s*([\s\S]+?)\s*-----END CERTIFICATE-----/);
      if (base64Match) {
        // Aqui você implementaria parsing real do certificado X.509
        // Por enquanto, retornar mensagem genérica
        return 'Certificado Digital A1';
      }
      return undefined;
    } catch {
      return undefined;
    }
  };

  /**
   * Limpar formulário
   */
  const handleClear = () => {
    setCertificadoPem('');
    setChavePrivadaPem('');
    setError(null);
    setSuccess(false);
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="size-5" />
          Certificado Digital A1 (PEM)
        </CardTitle>
        <CardDescription>
          Faça upload do certificado e chave privada em formato PEM para assinar XML NF-e
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        
        {/* Instruções de Conversão */}
        <Alert>
          <Info className="size-4" />
          <AlertDescription>
            <p className="font-medium mb-2">💡 Como converter .pfx para PEM:</p>
            <div className="space-y-1 text-sm font-mono">
              <p>1. Extrair certificado:</p>
              <p className="pl-4 text-xs">openssl pkcs12 -in cert.pfx -clcerts -nokeys -out cert.pem</p>
              <p className="mt-2">2. Extrair chave privada:</p>
              <p className="pl-4 text-xs">openssl pkcs12 -in cert.pfx -nocerts -nodes -out key.pem</p>
            </div>
          </AlertDescription>
        </Alert>

        {/* Tabs: Upload ou Colar */}
        <Tabs value={uploadMethod} onValueChange={(v) => setUploadMethod(v as 'file' | 'paste')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file">
              <Upload className="size-4 mr-2" />
              Upload de Arquivo
            </TabsTrigger>
            <TabsTrigger value="paste">
              <FileText className="size-4 mr-2" />
              Colar Texto
            </TabsTrigger>
          </TabsList>

          {/* Tab: Upload de Arquivo */}
          <TabsContent value="file" className="space-y-4">
            {/* Certificado */}
            <div className="space-y-2">
              <Label htmlFor="cert-file">Arquivo do Certificado (cert.pem)</Label>
              <Input
                id="cert-file"
                type="file"
                accept=".pem,.crt,.cer"
                onChange={handleCertificateFileUpload}
                disabled={loading}
              />
              {certificadoPem && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="size-3" />
                  Certificado carregado ({certificadoPem.length} caracteres)
                </p>
              )}
            </div>

            {/* Chave Privada */}
            <div className="space-y-2">
              <Label htmlFor="key-file">Arquivo da Chave Privada (key.pem)</Label>
              <Input
                id="key-file"
                type="file"
                accept=".pem,.key"
                onChange={handlePrivateKeyFileUpload}
                disabled={loading}
              />
              {chavePrivadaPem && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="size-3" />
                  Chave privada carregada ({chavePrivadaPem.length} caracteres)
                </p>
              )}
            </div>
          </TabsContent>

          {/* Tab: Colar Texto */}
          <TabsContent value="paste" className="space-y-4">
            {/* Certificado */}
            <div className="space-y-2">
              <Label htmlFor="cert-text">Certificado PEM</Label>
              <Textarea
                id="cert-text"
                placeholder="-----BEGIN CERTIFICATE-----&#10;MIIDXTCCAkWg...&#10;-----END CERTIFICATE-----"
                value={certificadoPem}
                onChange={(e) => setCertificadoPem(e.target.value)}
                disabled={loading}
                rows={8}
                className="font-mono text-xs"
              />
            </div>

            {/* Chave Privada */}
            <div className="space-y-2">
              <Label htmlFor="key-text">Chave Privada PEM</Label>
              <Textarea
                id="key-text"
                placeholder="-----BEGIN PRIVATE KEY-----&#10;MIIEvQIBADANBg...&#10;-----END PRIVATE KEY-----"
                value={chavePrivadaPem}
                onChange={(e) => setChavePrivadaPem(e.target.value)}
                disabled={loading}
                rows={8}
                className="font-mono text-xs"
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Botões de Ação */}
        <div className="flex gap-2">
          <Button
            onClick={handleValidate}
            disabled={!certificadoPem || !chavePrivadaPem || loading}
            className="flex-1"
          >
            {loading ? (
              <>Validando...</>
            ) : (
              <>
                <CheckCircle className="size-4 mr-2" />
                Validar e Usar Certificado
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={loading}
          >
            Limpar
          </Button>
        </div>

        {/* Alerta de Erro */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Alerta de Sucesso */}
        {success && (
          <Alert>
            <CheckCircle className="size-4" />
            <AlertDescription>
              ✅ Certificado validado e pronto para uso!
            </AlertDescription>
          </Alert>
        )}

      </CardContent>
    </Card>
  );
}
