import { useState, useRef } from 'react';
import { FileKey, Upload, Trash2, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';

interface Certificate {
  fileName: string;
  password: string;
  uploadDate: string;
  expiryDate: string;
  issuer: string;
  owner: string;
}

export function DigitalCertificate() {
  const [certificate, setCertificate] = useState<Certificate | null>(() => {
    const saved = localStorage.getItem('erp_digital_certificate');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveCertificate = (cert: Certificate | null) => {
    setCertificate(cert);
    if (cert) {
      localStorage.setItem('erp_digital_certificate', JSON.stringify(cert));
    } else {
      localStorage.removeItem('erp_digital_certificate');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!password) {
      toast.error('Por favor, informe a senha do certificado');
      return;
    }

    // Validar extensão .pfx ou .p12
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'pfx' && extension !== 'p12') {
      toast.error('O certificado deve ser um arquivo .pfx ou .p12');
      return;
    }

    // Simular dados do certificado (em produção, seria processado no backend)
    const newCertificate: Certificate = {
      fileName: file.name,
      password: password,
      uploadDate: new Date().toISOString(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // +1 ano
      issuer: 'AC SERASA SSL EV',
      owner: 'EMPRESA EXEMPLO LTDA',
    };

    saveCertificate(newCertificate);
    setPassword('');
    toast.success('Certificado digital carregado com sucesso!');
  };

  const handleRemoveCertificate = () => {
    if (confirm('Deseja realmente remover o certificado digital?')) {
      saveCertificate(null);
      setPassword('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      toast.success('Certificado removido com sucesso');
    }
  };

  const isExpiringSoon = () => {
    if (!certificate) return false;
    const expiryDate = new Date(certificate.expiryDate);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30;
  };

  const isExpired = () => {
    if (!certificate) return false;
    return new Date(certificate.expiryDate) < new Date();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <FileKey className="w-8 h-8 text-green-600" />
          <h1 className="text-gray-900">Certificado Digital (A1)</h1>
        </div>
        <p className="text-gray-500">Gerencie o certificado digital para emissão de notas fiscais</p>
      </div>

      <div className="grid gap-6">
        {certificate ? (
          <>
            {/* Status do Certificado */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {isExpired() ? (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  ) : isExpiringSoon() ? (
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                  Certificado Configurado
                </CardTitle>
                <CardDescription>
                  {isExpired()
                    ? 'Certificado vencido - atualize para continuar emitindo documentos fiscais'
                    : isExpiringSoon()
                    ? 'Atenção: Certificado próximo do vencimento'
                    : 'Seu certificado digital está ativo e válido'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500">Arquivo</Label>
                    <p>{certificate.fileName}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Proprietário</Label>
                    <p>{certificate.owner}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Emissor</Label>
                    <p>{certificate.issuer}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Data de Upload</Label>
                    <p>{formatDate(certificate.uploadDate)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Data de Validade</Label>
                    <p className={isExpired() ? 'text-red-600' : isExpiringSoon() ? 'text-orange-600' : ''}>
                      <Calendar className="w-4 h-4 inline mr-1" />
                      {formatDate(certificate.expiryDate)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Status</Label>
                    <p>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${
                          isExpired()
                            ? 'bg-red-100 text-red-800'
                            : isExpiringSoon()
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {isExpired() ? 'Vencido' : isExpiringSoon() ? 'Próximo ao Vencimento' : 'Válido'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button
                    variant="destructive"
                    onClick={handleRemoveCertificate}
                    className="gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remover Certificado
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Upload do Certificado Digital</CardTitle>
              <CardDescription>
                Faça upload do arquivo .pfx ou .p12 do certificado digital tipo A1
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Senha do Certificado *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Digite a senha do certificado"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? 'Ocultar' : 'Mostrar'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certificate">Arquivo do Certificado (.pfx ou .p12) *</Label>
                  <div className="flex gap-2">
                    <Input
                      ref={fileInputRef}
                      id="certificate"
                      type="file"
                      accept=".pfx,.p12"
                      onChange={handleFileUpload}
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-2 whitespace-nowrap"
                    >
                      <Upload className="w-4 h-4" />
                      Selecionar Arquivo
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500">
                    Formato aceito: .pfx ou .p12
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Informações Importantes</h4>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>O certificado tipo A1 é armazenado em arquivo digital</li>
                    <li>Mantenha a senha do certificado em local seguro</li>
                    <li>Certificados A1 têm validade de 1 ano</li>
                    <li>Renove o certificado antes do vencimento para evitar interrupções</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
