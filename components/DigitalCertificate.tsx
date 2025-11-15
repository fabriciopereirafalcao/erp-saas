import { FileKey } from 'lucide-react';

export function DigitalCertificate() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <FileKey className="w-8 h-8 text-green-600" />
          <h1 className="text-gray-900">Certificado Digital (A1)</h1>
        </div>
        <p className="text-gray-500">Gerencie o certificado digital para emissão de notas fiscais</p>
      </div>

      <div className="bg-white rounded-lg shadow p-8 text-center">
        <FileKey className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-gray-700 mb-2">Certificado Digital A1</h3>
        <p className="text-gray-500">
          Configure o certificado digital tipo A1 necessário para emissão de documentos fiscais eletrônicos.
        </p>
      </div>
    </div>
  );
}
