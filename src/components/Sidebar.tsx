import { NavigationView } from "../App";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  Users, 
  Truck,
  Receipt,
  Wallet,
  CreditCard,
  GitCompare,
  TrendingUpDown,
  BarChart3,
  Tag,
  Building2,
  FileText,
  Shield,
  AlertCircle,
  CheckSquare,
  LogOut,
  Mail
} from "lucide-react";
import { FEATURES } from "../utils/environment";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { Button } from "./ui/button";
import { memo } from "react";

interface SidebarProps {
  currentView: NavigationView;
  onNavigate: (view: NavigationView) => void;
}

// ⚡ Memoizado para evitar rerenders desnecessários
export const Sidebar = memo(function Sidebar({ currentView, onNavigate }: SidebarProps) {
  const { signOut, profile, company } = useAuth();
  const { isDarkMode } = useTheme();

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
    { id: "accountsPayableReceivable" as NavigationView, label: "Contas a Pagar/Receber", icon: CreditCard },
    { id: "balanceReconciliation" as NavigationView, label: "Conciliação de Saldos", icon: CheckSquare },
    { id: "cashFlow" as NavigationView, label: "Fluxo de Caixa", icon: TrendingUpDown },
    { id: "reports" as NavigationView, label: "Relatórios", icon: BarChart3 },
    { id: "emailSettings" as NavigationView, label: "Configurações de Email", icon: Mail },
    { id: "systemAudit" as NavigationView, label: "Auditoria do Sistema", icon: AlertCircle },
    { id: "company" as NavigationView, label: "Minha Empresa", icon: Building2 },
  ];

  return (
    <aside className={`w-64 border-r flex flex-col ${isDarkMode ? 'dark bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
      {/* Header removido - agora está na TopBar */}
      
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
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                  {/* Badge de DEV para módulo de auditoria */}
                  {item.id === "systemAudit" && (
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
  );
});