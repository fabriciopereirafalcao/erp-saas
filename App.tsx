import { Suspense, lazy, useState } from "react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Sidebar } from "./components/Sidebar.tsx";
import { TopBar } from "./components/TopBar.tsx";
import { Toaster } from "./components/ui/sonner.tsx";
import { ERPProvider } from "./contexts/ERPContext.tsx";
import { AuthProvider, useAuth } from "./contexts/AuthContext.tsx";
import { ThemeProvider } from "./contexts/ThemeContext.tsx";
import { AuthFlow } from "./components/auth/AuthFlow.tsx";
import { LoadingScreen } from "./components/LoadingScreen.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { FEATURES, IS_DEVELOPMENT } from "./utils/environment.ts";
import { DebugPersistence } from "./components/DebugPersistence.tsx";
import { checkAuth, handleUnauthorized } from "./utils/authFetch.tsx";

// Importar utilitário de limpeza (disponível no console do navegador)
import "./utils/cleanDuplicates.ts";

// ⚡ LAZY LOADING - Componentes carregados sob demanda
const Dashboard = lazy(() =>
  import("./components/Dashboard.tsx").then((m) => ({
    default: m.Dashboard,
  })),
);
const Inventory = lazy(() =>
  import("./components/Inventory.tsx").then((m) => ({
    default: m.Inventory,
  })),
);
const SalesOrders = lazy(() =>
  import("./components/SalesOrders.tsx").then((m) => ({
    default: m.SalesOrders,
  })),
);
const PurchaseOrders = lazy(() =>
  import("./components/PurchaseOrders.tsx").then((m) => ({
    default: m.PurchaseOrders,
  })),
);
const Customers = lazy(() =>
  import("./components/Customers.tsx").then((m) => ({
    default: m.Customers,
  })),
);
const Suppliers = lazy(() =>
  import("./components/Suppliers.tsx").then((m) => ({
    default: m.Suppliers,
  })),
);
const FinancialTransactions = lazy(() =>
  import("./components/FinancialTransactions.tsx").then((m) => ({
    default: m.FinancialTransactions,
  })),
);
const AccountsPayableReceivable = lazy(() =>
  import("./components/AccountsPayableReceivable.tsx").then(
    (m) => ({ default: m.AccountsPayableReceivable }),
  ),
);
const BalanceReconciliation = lazy(() =>
  import("./components/BalanceReconciliation.tsx").then((m) => ({
    default: m.BalanceReconciliation,
  })),
);
const CashFlow = lazy(() =>
  import("./components/CashFlow.tsx").then((m) => ({
    default: m.CashFlow,
  })),
);
const Reports = lazy(() =>
  import("./components/Reports.tsx").then((m) => ({
    default: m.Reports,
  })),
);
const PriceTables = lazy(() =>
  import("./components/PriceTables.tsx").then((m) => ({
    default: m.PriceTables,
  })),
);
const CompanySettings = lazy(() =>
  import("./components/CompanySettings.tsx").then((m) => ({
    default: m.CompanySettings,
  })),
);
const TaxInvoicing = lazy(() =>
  import("./components/TaxInvoicingModern.tsx").then((m) => ({
    default: m.TaxInvoicingModern,
  })),
);
const UsersPermissions = lazy(() =>
  import("./components/UsersPermissions.tsx").then((m) => ({
    default: m.UsersPermissions,
  })),
);
const TestePersistencia = lazy(() =>
  import("./components/TestePersistencia.tsx").then((m) => ({
    default: m.TestePersistencia,
  })),
);

// Novos cadastros
const ChartOfAccounts = lazy(() =>
  import("./components/ChartOfAccounts.tsx").then((m) => ({
    default: m.ChartOfAccounts,
  })),
);
const CostCenters = lazy(() =>
  import("./components/CostCenters.tsx").then((m) => ({
    default: m.CostCenters,
  })),
);
const DigitalCertificate = lazy(() =>
  import("./components/DigitalCertificate.tsx").then((m) => ({
    default: m.DigitalCertificate,
  })),
);
const Salespeople = lazy(() =>
  import("./components/Salespeople.tsx").then((m) => ({
    default: m.Salespeople,
  })),
);
const Buyers = lazy(() =>
  import("./components/Buyers.tsx").then((m) => ({
    default: m.Buyers,
  })),
);
const ProductCategories = lazy(() =>
  import("./components/ProductCategories.tsx").then((m) => ({
    default: m.ProductCategories,
  })),
);
const StockLocations = lazy(() =>
  import("./components/StockLocations.tsx").then((m) => ({
    default: m.StockLocations,
  })),
);
const ManufacturingBatches = lazy(() =>
  import("./components/ManufacturingBatches.tsx").then((m) => ({
    default: m.ManufacturingBatches,
  })),
);

// Perfil do usuário
const ProfileView = lazy(() =>
  import("./components/ProfileView.tsx").then((m) => ({
    default: m.ProfileView,
  })),
);

// Aceitar convite
const AcceptInvite = lazy(() =>
  import("./components/AcceptInvite.tsx").then((m) => ({
    default: m.AcceptInvite,
  })),
);

// Configurações de Email
const EmailSettings = lazy(() =>
  import("./components/EmailSettings.tsx").then((m) => ({
    default: m.EmailSettings,
  })),
);

// Importação condicional do SystemAudit (apenas em dev)
const SystemAudit = IS_DEVELOPMENT
  ? lazy(() =>
      import("./components/SystemAudit.tsx").then((m) => ({
        default: m.SystemAudit,
      })),
    )
  : null;

export type NavigationView =
  | "dashboard"
  | "inventory"
  | "purchases"
  | "sales"
  | "customers"
  | "suppliers"
  | "financialTransactions"
  | "accountsPayableReceivable"
  | "balanceReconciliation"
  | "cashFlow"
  | "priceTables"
  | "taxInvoicing"
  | "reports"
  | "usersPermissions"
  | "emailSettings"
  | "systemAudit"
  | "company"
  | "chartOfAccounts"
  | "costCenters"
  | "digitalCertificate"
  | "salespeople"
  | "buyers"
  | "productCategories"
  | "stockLocations"
  | "manufacturingBatches"
  | "profile"
  | "testePersistencia";

// ⚡ Loading fallback leve
function ViewLoader() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] =
    useState<NavigationView>("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [nfeDataFromOrder, setNfeDataFromOrder] = useState<any>(null);

  // Callback para navegar para NF-e a partir de um pedido
  const handleNavigateToNFeFromOrder = (orderData: any) => {
    setNfeDataFromOrder(orderData);
    setCurrentView("taxInvoicing");
    // Limpar dados após 3 segundos para permitir que sejam usados
    setTimeout(() => {
      setNfeDataFromOrder(null);
    }, 3000);
  };

  // Verificar se há um token de convite na URL
  const hasInviteToken = () => {
    const params = new URLSearchParams(window.location.search);
    return params.has("token");
  };

  // Mostrar tela de loading enquanto verifica autenticação
  if (loading) {
    return <LoadingScreen />;
  }

  // Se houver token de convite na URL, mostrar tela de aceite (independente de estar logado)
  if (hasInviteToken()) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <AcceptInvite
          onSuccess={() => {
            // Limpar token da URL e redirecionar para login
            window.history.replaceState({}, "", "/");
            window.location.reload();
          }}
        />
      </Suspense>
    );
  }

  // Mostrar tela de autenticação se não estiver logado
  if (!user) {
    return <AuthFlow />;
  }

  // ⚡ Renderizar view com Suspense para lazy loading
  const renderView = () => {
    switch (currentView) {
      case "dashboard":
        return <Dashboard />;
      case "inventory":
        return <Inventory />;
      case "purchases":
        return <PurchaseOrders />;
      case "sales":
        return <SalesOrders onNavigateToNFe={handleNavigateToNFeFromOrder} />;
      case "customers":
        return <Customers />;
      case "suppliers":
        return <Suppliers />;
      case "financialTransactions":
        return <FinancialTransactions />;
      case "accountsPayableReceivable":
        return <AccountsPayableReceivable />;
      case "balanceReconciliation":
        return <BalanceReconciliation />;
      case "cashFlow":
        return <CashFlow />;
      case "priceTables":
        return <PriceTables />;
      case "taxInvoicing":
        return <TaxInvoicing orderData={nfeDataFromOrder} />;
      case "reports":
        return <Reports />;
      case "usersPermissions":
        return <UsersPermissions />;
      case "emailSettings":
        return <EmailSettings />;
      case "systemAudit":
        // PROTEÇÃO TRIPLA: Apenas em desenvolvimento
        if (!FEATURES.SYSTEM_AUDIT || !SystemAudit) {
          console.warn(
            "Módulo de Auditoria não disponível em produção",
          );
          return <Dashboard />;
        }
        return <SystemAudit />;
      case "company":
        return <CompanySettings />;
      case "chartOfAccounts":
        return <ChartOfAccounts />;
      case "costCenters":
        return <CostCenters />;
      case "digitalCertificate":
        return <DigitalCertificate />;
      case "salespeople":
        return <Salespeople />;
      case "buyers":
        return <Buyers />;
      case "productCategories":
        return <ProductCategories />;
      case "stockLocations":
        return <StockLocations />;
      case "manufacturingBatches":
        return <ManufacturingBatches />;
      case "profile":
        return <ProfileView onNavigate={setCurrentView} />;
      case "testePersistencia":
        return <TestePersistencia />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ERPProvider>
      <div className="flex flex-col h-screen bg-gray-50">
        {/* TopBar fixa no topo */}
        <TopBar
          onNavigate={setCurrentView}
          onToggleSidebar={() => setIsSidebarOpen(true)}
        />

        {/* Container principal: Sidebar + Conteúdo */}
        <div
          className="flex flex-1 overflow-hidden"
          style={{ marginTop: "64px" }}
        >
          <Sidebar
            currentView={currentView}
            onNavigate={setCurrentView}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />
          <main className="flex-1 overflow-auto bg-gray-50">
            {/* ⚡ Error Boundary + Suspense para lazy loading seguro */}
            <ErrorBoundary>
              <Suspense fallback={<ViewLoader />}>
                {renderView()}
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>

        <Toaster position="top-right" richColors />
        <DebugPersistence />
      </div>
    </ERPProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
        <SpeedInsights />
      </AuthProvider>
    </ThemeProvider>
  );
}