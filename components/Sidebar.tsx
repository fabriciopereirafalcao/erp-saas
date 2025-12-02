import { useModuleAccess } from "../hooks/useModuleAccess";
import { Button } from "./ui/button";
import { memo, useEffect } from "react";

interface SidebarProps {
  currentView: NavigationView;
  onNavigate: (view: NavigationView) => void;
  isOpen: boolean;
  onClose: () => void;
}

// ⚡ Memoizado para evitar rerenders desnecessários
export const Sidebar = memo(function Sidebar({ currentView, onNavigate, isOpen, onClose }: SidebarProps) {
  const { signOut, profile, company } = useAuth();
  const { isDarkMode } = useTheme();
  const { checkModuleAccess, tryAccessModule } = useModuleAccess();

  // Fechar sidebar ao pressionar ESC em mobile
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Prevenir scroll do body quando sidebar mobile está aberta
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleNavigate = (view: NavigationView) => {
    // Verificar acesso ao módulo antes de navegar
    const access = checkModuleAccess(view);
    
    if (!access.allowed) {
      // Tenta acessar (mostrará dialog de upgrade)
      tryAccessModule(view);
      return;
    }
    
    onNavigate(view);
    // Fechar sidebar em mobile após navegação
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  const menuItems = [
    { id: "dashboard" as NavigationView, label: "Painel", icon: LayoutDashboard },
    { id: "inventory" as NavigationView, label: "Estoque", icon: Package },
    { id: "purchases" as NavigationView, label: "Compras", icon: ShoppingCart },
    { id: "sales" as NavigationView, label: "Vendas", icon: TrendingUp },
    { id: "customers" as NavigationView, label: "Clientes", icon: Users },
    { id: "suppliers" as NavigationView, label: "Fornecedores", icon: Truck },
    { id: "priceTables" as NavigationView, label: "Tabelas de Preço", icon: Tag },
    { id: "taxInvoicing" as NavigationView, label: "Faturamento Fiscal", icon: FileText },
    { id: "financialTransactions" as NavigationView, label: "Financeiro", icon: Wallet },
    { id: "accountsPayableReceivable" as NavigationView, label: "Gestão de Contas", icon: CreditCard },
    { id: "balanceReconciliation" as NavigationView, label: "Conciliações", icon: CheckSquare },
    { id: "cashFlow" as NavigationView, label: "Fluxo de Caixa", icon: ArrowUpDown },
    { id: "reports" as NavigationView, label: "Relatórios", icon: BarChart3 },
    { id: "systemAudit" as NavigationView, label: "Auditoria do Sistema", icon: AlertCircle },
    { id: "company" as NavigationView, label: "Minha Empresa", icon: Building2 },
  ];

  return (
    <>
      {/* Overlay para mobile - clique fora fecha a sidebar */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-64 border-r flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${isDarkMode ? 'dark bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}
        `}
        style={{ top: '64px' }}
      >
        {/* Botão fechar para mobile */}
        <div className="md:hidden flex justify-end p-4 border-b border-gray-200 dark:border-gray-700">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              // Ocultar Auditoria do Sistema em produção
              if (item.id === "systemAudit" && !FEATURES.SYSTEM_AUDIT) {
                return null;
              }
              
              // Ocultar Minha Empresa (disponível na TopBar)
              if (item.id === "company") {
                return null;
              }
              
              const Icon = item.icon;
              const isActive = currentView === item.id;
              const access = checkModuleAccess(item.id);
              const isLocked = !access.allowed && access.requiresUpgrade;
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                        : isLocked
                        ? "text-gray-400 dark:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 opacity-60"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    
                    {/* Badge de bloqueio */}
                    {isLocked && (
                      <Lock className="w-4 h-4 text-amber-500" />
                    )}
                    
                    {/* Badge de DEV para módulo de auditoria */}
                    {item.id === "systemAudit" && !isLocked && (
                      <span className="ml-auto text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded">
                        DEV
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
});