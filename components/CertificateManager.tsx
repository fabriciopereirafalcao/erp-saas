/**
 * ============================================================================
 * COMPONENTE: Gerenciador de Certificado Digital
 * ============================================================================
 * 
 * Permite upload de certificado digital A1 (.pfx/.p12) e conversão para PEM
 * para uso na assinatura de XML NF-e
 * 
 * IMPORTANTE: Este componente converte certificado .pfx para formato PEM
 * usando bibliotecas JavaScript puras (sem dependências do Node.js)
 * 
 * ============================================================================
 */

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Upload, Key, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// ============================================================================
// TIPOS
// ============================================================================

export interface CertificadoPEM {
  certificadoPem: string; // Certificado X.509 em formato PEM
  chavePrivadaPem: string; // Chave privada em formato PEM
  valido: boolean;
  dataExpiracao?: string;
  titular?: string;
  emissor?: string;
}

interface CertificateManagerProps {
  onCertificateLoaded?: (certificado: CertificadoPEM) => void;
  autoLoad?: boolean; // Se true, carrega certificado automaticamente após upload
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function CertificateManager({ 
  onCertificateLoaded,
  autoLoad = false 
}: CertificateManagerProps) {
  
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [certificado, setCertificado] = useState<CertificadoPEM | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  /**
   * Handler para seleção de arquivo
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) {
      return;
    }

    // Validar extensão
    const validExtensions = ['.pfx', '.p12'];
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
      setError('Por favor, selecione um arquivo .pfx ou .p12');
      toast.error('Formato inválido', {
        description: 'Por favor, selecione um arquivo .pfx ou .p12'
      });
      return;
    }

    setCertificateFile(file);
    setError(null);
    setCertificado(null);
    
    toast.success('Arquivo selecionado', {
      description: file.name
    });

    // Se autoLoad estiver ativado e já tiver senha, carregar automaticamente
    if (autoLoad && password) {
      handleLoadCertificate();
    }
  };

  /**
   * Handler para carregar e converter certificado
   */
  const handleLoadCertificate = async () => {
    if (!certificateFile) {
      setError('Por favor, selecione um arquivo de certificado');
      toast.error('Certificado não selecionado');
      return;
    }

    if (!password) {
      setError('Por favor, informe a senha do certificado');
      toast.error('Senha não informada');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Ler arquivo como ArrayBuffer
      const arrayBuffer = await certificateFile.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );

      // NOTA IMPORTANTE:
      // A conversão de .pfx para PEM requer bibliotecas criptográficas específicas
      // como node-forge ou pkijs, que não estão disponíveis diretamente no browser
      // 
      // OPÇÕES PARA IMPLEMENTAÇÃO REAL:
      // 
      // 1. Backend: Implementar endpoint que recebe .pfx + senha e retorna PEM
      // 2. Biblioteca: Adicionar node-forge ao projeto via npm
      // 3. Conversão Manual: Usuário converte localmente e faz upload dos PEMs
      //
      // Para este protótipo, vamos instruir o usuário a fornecer
      // os arquivos PEM já convertidos

      setError(
        'IMPLEMENTAÇÃO PENDENTE: A conversão automática de .pfx para PEM ' +
        'requer biblioteca criptográfica adicional (node-forge ou pkijs). ' +
        'Por favor, converta seu certificado manualmente usando OpenSSL:\n\n' +
        '1. Extrair certificado:\n' +
        '   openssl pkcs12 -in certificado.pfx -clcerts -nokeys -out certificado.pem\n\n' +
        '2. Extrair chave privada:\n' +
        '   openssl pkcs12 -in certificado.pfx -nocerts -nodes -out chave.pem\n\n' +
        'Depois, use o componente CertificateUploadPEM para fazer upload dos arquivos convertidos.'
      );

      toast.error('Conversão não disponível', {
        description: 'Use CertificateUploadPEM ou converta manualmente com OpenSSL'
      });

    } catch (err: any) {
      console.error('Erro ao processar certificado:', err);
      setError(`Erro ao processar certificado: ${err.message}`);
      toast.error('Erro ao processar', {
        description: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handler para limpar dados
   */
  const handleClear = () => {
    setCertificateFile(null);
    setPassword('');
    setCertificado(null);
    setError(null);
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="size-5" />
          Gerenciador de Certificado Digital
        </CardTitle>
        <CardDescription>
          Faça upload do seu certificado digital A1 (.pfx ou .p12) para assinar XML NF-e
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        
        {/* Upload de Arquivo */}
        <div className="space-y-2">
          <Label htmlFor="certificate-file">Arquivo do Certificado (.pfx ou .p12)</Label>
          <div className="flex gap-2">
            <Input
              id="certificate-file"
              type="file"
              accept=".pfx,.p12"
              onChange={handleFileSelect}
              disabled={loading}
            />
            {certificateFile && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={loading}
              >
                Limpar
              </Button>
            )}
          </div>
          {certificateFile && (
            <p className="text-sm text-muted-foreground">
              Arquivo selecionado: {certificateFile.name}
            </p>
          )}
        </div>

        {/* Senha */}
        <div className="space-y-2">
          <Label htmlFor="certificate-password">Senha do Certificado</Label>
          <Input
            id="certificate-password"
            type="password"
            placeholder="Digite a senha do certificado"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Botão de Carregar */}
        <Button
          onClick={handleLoadCertificate}
          disabled={!certificateFile || !password || loading}
          className="w-full"
        >
          {loading ? (
            <>Processando...</>
          ) : (
            <>
              <Upload className="size-4 mr-2" />
              Carregar e Validar Certificado
            </>
          )}
        </Button>

        {/* Alerta de Erro */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="size-4" />
            <AlertDescription className="whitespace-pre-line">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Informações do Certificado Carregado */}
        {certificado && certificado.valido && (
          <Alert>
            <CheckCircle className="size-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">Certificado carregado com sucesso!</p>
                {certificado.titular && <p>Titular: {certificado.titular}</p>}
                {certificado.emissor && <p>Emissor: {certificado.emissor}</p>}
                {certificado.dataExpiracao && (
                  <p>Válido até: {new Date(certificado.dataExpiracao).toLocaleDateString('pt-BR')}</p>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Aviso sobre Conversão Manual */}
        <Alert>
          <AlertCircle className="size-4" />
          <AlertDescription>
            <p className="font-medium mb-2">⚠️ IMPORTANTE:</p>
            <p>
              A conversão automática de .pfx para PEM não está implementada neste protótipo.
              Para assinar XML NF-e, use o componente <code>CertificateUploadPEM</code> e faça
              upload dos arquivos PEM já convertidos.
            </p>
            <p className="mt-2">
              Ou converta manualmente usando OpenSSL conforme instruções acima.
            </p>
          </AlertDescription>
        </Alert>

      </CardContent>
    </Card>
  );
}
