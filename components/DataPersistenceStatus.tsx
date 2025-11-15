import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";
import { Database, Trash2, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { clearAllStorage, hasStoredData, isLocalStorageAvailable, STORAGE_KEYS } from "../utils/localStorage";
import { toast } from "sonner@2.0.3";
import { useERP } from "../contexts/ERPContext";

export function DataPersistenceStatus() {
  const { customers, suppliers, inventory } = useERP();
  const [hasData, setHasData] = useState(hasStoredData());
  const [isAvailable, setIsAvailable] = useState(isLocalStorageAvailable());
  const [storageInfo, setStorageInfo] = useState({ customers: 0, suppliers: 0, products: 0 });

  // Atualiza informações de armazenamento
  useEffect(() => {
    setHasData(hasStoredData());
    setStorageInfo({
      customers: customers.length,
      suppliers: suppliers.length,
      products: inventory.length,
    });
  }, [customers, suppliers, inventory]);

  // Testa disponibilidade do localStorage periodicamente
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAvailable(isLocalStorageAvailable());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleClearData = () => {
    clearAllStorage();
    setHasData(false);
    toast.success("Todos os dados foram limpos com sucesso!");
    
    // Recarregar a página para reinicializar o sistema
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  const handleTestStorage = () => {
    const available = isLocalStorageAvailable();
    if (available) {
      toast.success("✅ localStorage está funcionando corretamente!");
      console.log("=== TESTE DE PERSISTÊNCIA ===");
      console.log("localStorage disponível:", available);
      console.log("Dados salvos:", hasStoredData());
      console.log("Clientes:", customers.length);
      console.log("Fornecedores:", suppliers.length);
      console.log("Produtos:", inventory.length);
      
      // Testa salvar e carregar
      localStorage.setItem('erp_test', JSON.stringify({ test: true }));
      const loaded = localStorage.getItem('erp_test');
      console.log("Teste de salvamento:", loaded ? "✅ Funcionando" : "❌ Falhou");
      localStorage.removeItem('erp_test');
    } else {
      toast.error("❌ localStorage não está disponível!");
      console.error("localStorage não disponível - possíveis causas:");
      console.error("- Navegação privada/anônima");
      console.error("- Quota excedida");
      console.error("- Bloqueado por configurações do navegador");
    }
  };

  if (!isAvailable) {
    return (
      <Card className="p-4 bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-red-900 mb-1">⚠️ Persistência Desabilitada</h3>
            <p className="text-sm text-red-700 mb-2">
              O localStorage não está disponível. Seus dados não serão salvos.
            </p>
            <p className="text-xs text-gray-600">
              Possíveis causas: navegação privada/anônima, quota excedida, ou configurações do navegador.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Database className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-purple-900 mb-1">Persistência de Dados</h3>
            <div className="flex items-center gap-2 mb-2">
              {hasData ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-600">
                    {storageInfo.customers} clientes, {storageInfo.suppliers} fornecedores, {storageInfo.products} produtos
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    Nenhum dado cadastrado ainda
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-gray-600">
              Seus dados permanecem salvos mesmo após fechar o navegador.
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 flex-shrink-0 ml-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleTestStorage}
            className="border-blue-200 text-blue-600 hover:bg-blue-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Testar
          </Button>
          
          {hasData && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>⚠️ Confirmar Limpeza de Dados</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>
                      Esta ação irá <strong>remover permanentemente</strong> todos os dados cadastrados no sistema:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Clientes e Fornecedores</li>
                      <li>Produtos e Estoque</li>
                      <li>Pedidos de Venda e Compra</li>
                      <li>Transações Financeiras</li>
                      <li>Configurações da Empresa</li>
                      <li>Todos os outros dados</li>
                    </ul>
                    <p className="text-red-600 mt-4">
                      <strong>Esta ação não pode ser desfeita!</strong>
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearData}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Sim, Limpar Todos os Dados
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </Card>
  );
}
