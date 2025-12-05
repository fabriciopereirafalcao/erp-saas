/**
 * Componente de Gerenciamento de Certificado Digital A1
 * 
 * Permite upload, visualização e remoção de certificado digital
 */

import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Upload, FileKey, Calendar, AlertCircle, CheckCircle, Trash2, Info } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface CertificadoInfo {
  cnpj: string;
  razaoSocial: string;
  validoDe: string;
  validoAte: string;
  emissor: string;
  diasRestantes: number;
  isValido: boolean;
  avisoVencimento?: string;
}

export function CertificadoDigitalSettings() {
  const [certificado, setCertificado] = useState<CertificadoInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Upload form
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [senha, setSenha] = useState('');

  useEffect(() => {
    carregarCertificado();
  }, []);

  const carregarCertificado = async () => {
    try {
      setLoading(true);

      const { supabase } = await import('../utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/certificado/info`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
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
      console.error('[CERT_SETTINGS] Erro ao carregar certificado:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar extensão
      if (!file.name.toLowerCase().endsWith('.pfx') && !file.name.toLowerCase().endsWith('.p12')) {
        toast.error('Arquivo inválido. Selecione um arquivo .pfx ou .p12');
        return;
      }
      
      setArquivo(file);
    }
  };

  const handleUpload = async () => {
    if (!arquivo || !senha) {
      toast.error('Selecione um arquivo e digite a senha');
      return;
    }

    try {
      setUploading(true);

      const { supabase } = await import('../utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error('Você precisa estar logado');
        return;
      }

      // Criar FormData
      const formData = new FormData();
      formData.append('certificado', arquivo);
      formData.append('senha', senha);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/certificado/upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          },
          body: formData
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro ao fazer upload do certificado');
      }

      toast.success('Certificado enviado e validado com sucesso!');
      
      // Limpar form
      setArquivo(null);
      setSenha('');
      (document.getElementById('file-upload') as HTMLInputElement).value = '';
      
      // Recarregar informações
      await carregarCertificado();

    } catch (error: any) {
      console.error('[CERT_SETTINGS] Erro no upload:', error);
      toast.error(error.message || 'Erro ao fazer upload do certificado');
    } finally {
      setUploading(false);
    }
  };

  const handleRemover = async () => {
    if (!confirm('Tem certeza que deseja remover o certificado digital? Você não poderá emitir NF-es até enviar um novo certificado.')) {
      return;
    }

    try {
      const { supabase } = await import('../utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error('Você precisa estar logado');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/certificado`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro ao remover certificado');
      }

      toast.success('Certificado removido com sucesso');
      setCertificado(null);

    } catch (error: any) {
      console.error('[CERT_SETTINGS] Erro ao remover:', error);
      toast.error(error.message || 'Erro ao remover certificado');
    }
  };

  const formatarCNPJ = (cnpj: string) => {
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const formatarData = (dataISO: string) => {
    return new Date(dataISO).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[rgb(32,251,225)]"></div>
          <p className="ml-3 text-gray-600">Carregando...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-gray-900">Certificado Digital A1</h3>
        <p className="text-sm text-gray-600 mt-1">
          Faça upload do seu certificado digital para assinar NF-es com segurança
        </p>
      </div>

      {/* Informações Importantes */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="mb-2"><strong>Importante:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>O certificado A1 é obrigatório para emissão de NF-e em produção</li>
              <li>O arquivo deve ter extensão .pfx ou .p12</li>
              <li>A senha é a mesma definida ao exportar o certificado</li>
              <li>O certificado fica armazenado de forma segura no Supabase Storage</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Certificado Atual */}
      {certificado ? (
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${
                certificado.diasRestantes > 30 ? 'bg-green-100' :
                certificado.diasRestantes > 0 ? 'bg-yellow-100' : 'bg-red-100'
              }`}>
                <FileKey className={`w-6 h-6 ${
                  certificado.diasRestantes > 30 ? 'text-green-600' :
                  certificado.diasRestantes > 0 ? 'text-yellow-600' : 'text-red-600'
                }`} />
              </div>
              <div>
                <h4 className="text-gray-900">Certificado Instalado</h4>
                <p className="text-sm text-gray-500">Certificado digital ativo</p>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemover}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remover
            </Button>
          </div>

          {certificado.avisoVencimento && (
            <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${
              certificado.diasRestantes > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'
            }`}>
              <AlertCircle className={`w-5 h-5 ${
                certificado.diasRestantes > 0 ? 'text-yellow-600' : 'text-red-600'
              }`} />
              <p className={`text-sm ${
                certificado.diasRestantes > 0 ? 'text-yellow-800' : 'text-red-800'
              }`}>
                {certificado.avisoVencimento}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">CNPJ</p>
              <p className="text-gray-900">{formatarCNPJ(certificado.cnpj)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Razão Social</p>
              <p className="text-gray-900">{certificado.razaoSocial}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Emissor</p>
              <p className="text-gray-900">{certificado.emissor}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Validade</p>
              <p className="text-gray-900">
                {formatarData(certificado.validoDe)} até {formatarData(certificado.validoAte)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <div className="flex items-center gap-2">
                {certificado.isValido ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-green-600">Válido</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-red-600">Expirado</span>
                  </>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500">Dias Restantes</p>
              <p className={`${
                certificado.diasRestantes > 30 ? 'text-green-600' :
                certificado.diasRestantes > 0 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {certificado.diasRestantes} dias
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileKey className="w-8 h-8 text-gray-400" />
            </div>
            <h4 className="text-gray-900 mb-2">Nenhum certificado instalado</h4>
            <p className="text-sm text-gray-500 mb-6">
              Faça upload do seu certificado digital A1 para começar a emitir NF-es
            </p>
          </div>
        </Card>
      )}

      {/* Formulário de Upload */}
      <Card className="p-6">
        <h4 className="text-gray-900 mb-4">
          {certificado ? 'Substituir Certificado' : 'Upload de Certificado'}
        </h4>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Arquivo do Certificado (.pfx ou .p12)
            </label>
            <div className="flex items-center gap-3">
              <Input
                id="file-upload"
                type="file"
                accept=".pfx,.p12"
                onChange={handleFileChange}
                disabled={uploading}
              />
              {arquivo && (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              )}
            </div>
            {arquivo && (
              <p className="text-sm text-gray-600 mt-2">
                Arquivo selecionado: <strong>{arquivo.name}</strong> ({(arquivo.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Senha do Certificado
            </label>
            <Input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Digite a senha do certificado"
              disabled={uploading}
            />
            <p className="text-xs text-gray-500 mt-1">
              A senha será armazenada de forma segura no banco de dados
            </p>
          </div>

          <Button
            onClick={handleUpload}
            disabled={!arquivo || !senha || uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Enviando e validando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                {certificado ? 'Substituir Certificado' : 'Fazer Upload'}
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
