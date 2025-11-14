import { useState, lazy, Suspense } from "react";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { Toaster } from "./components/ui/sonner";
import { ERPProvider } from "./contexts/ERPContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthFlow } from "./components/auth/AuthFlow";
import { LoadingScreen } from "./components/LoadingScreen";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { FEATURES, IS_DEVELOPMENT } from "./utils/environment";
import { DebugPersistence } from "./components/DebugPersistence";

// Importar utilitário de limpeza (disponível no console do navegador)
import "./utils/cleanDuplicates";

// ⚡ LAZY LOADING - Componentes carregados sob demanda
const Dashboard = lazy(() =>
  import("./components/Dashboard").then((m) => ({
    default: m.Dashboard,
  })),
);
const Inventory = lazy(() =>
  import("./components/Inventory").then((m) => ({
    default: m.Inventory,
  })),
);
const SalesOrders = lazy(() =>
  import("./components/SalesOrders").then((m) => ({
    default: m.SalesOrders,
  })),
);
const PurchaseOrders = lazy(() =>
  import("./components/PurchaseOrders").then((m) => ({
    default: m.PurchaseOrders,
  })),
);
const Customers = lazy(() =>
  import("./components/Customers").then((m) => ({
    default: m.Customers,
  })),
);
const Suppliers = lazy(() =>
  import("./components/Suppliers").then((m) => ({
    default: m.Suppliers,
  })),
);
const FinancialTransactions = lazy(() =>
  import("./components/FinancialTransactions").then((m) => ({
    default: m.FinancialTransactions,
  })),
);
const AccountsPayableReceivable = lazy(() =>
  import("./components/AccountsPayableReceivable").then(
    (m) => ({ default: m.AccountsPayableReceivable }),
  ),
);
const BalanceReconciliation = lazy(() =>
  import("./components/BalanceReconciliation").then((m) => ({
    default: m.BalanceReconciliation,
  })),
);
const CashFlow = lazy(() =>
  import("./components/CashFlow").then((m) => ({
    default: m.CashFlow,
  })),
);
const Reports = lazy(() =>
  import("./components/Reports").then((m) => ({
    default: m.Reports,
  })),
);
const PriceTables = lazy(() =>
  import("./components/PriceTables").then((m) => ({
    default: m.PriceTables,
  })),
);
const CompanySettings = lazy(() =>
  import("./components/CompanySettings").then((m) => ({
    default: m.CompanySettings,
  })),
);
const TaxInvoicing = lazy(() =>
  import("./components/TaxInvoicing").then((m) => ({
    default: m.TaxInvoicing,
  })),
);
const UsersPermissions = lazy(() =>
  import("./components/UsersPermissions").then((m) => ({
    default: m.UsersPermissions,
  })),
);

// Novos cadastros
const ChartOfAccounts = lazy(() =>
  import("./components/ChartOfAccounts").then((m) => ({
    default: m.ChartOfAccounts,
  })),
);
const CostCenters = lazy(() =>
  import("./components/CostCenters").then((m) => ({
    default: m.CostCenters,
  })),
);
const DigitalCertificate = lazy(() =>
  import("./components/DigitalCertificate").then((m) => ({
    default: m.DigitalCertificate,
  })),
);
const Salespeople = lazy(() =>
  import("./components/Salespeople").then((m) => ({
    default: m.Salespeople,
  })),
);
const Buyers = lazy(() =>
  import("./components/Buyers").then((m) => ({
    default: m.Buyers,
  })),
);
const ProductCategories = lazy(() =>
  import("./components/ProductCategories").then((m) => ({
    default: m.ProductCategories,
  })),
);
const StockLocations = lazy(() =>
  import("./components/StockLocations").then((m) => ({
    default: m.StockLocations,
  })),
);
const ManufacturingBatches = lazy(() =>
  import("./components/ManufacturingBatches").then((m) => ({
    default: m.ManufacturingBatches,
  })),
);

// Perfil do usuário
const ProfileView = lazy(() =>
  import("./components/ProfileView").then((m) => ({
    default: m.ProfileView,
  })),
);

// Aceitar convite
const AcceptInvite = lazy(() =>
  import("./components/AcceptInvite").then((m) => ({
    default: m.AcceptInvite,
  })),
);

// Configurações de Email
const EmailSettings = lazy(() =>
  import("./components/EmailSettings").then((m) => ({
    default: m.EmailSettings,
  })),
);

// Importação condicional do SystemAudit (apenas em dev)
const SystemAudit = IS_DEVELOPMENT
  ? lazy(() =>
      import("./components/SystemAudit").then((m) => ({
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
  | "profile";

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
        return <SalesOrders />;
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
        return <TaxInvoicing />;
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
      default:
        return <Dashboard />;
    }
  };

  return (
    <ERPProvider>
      <div className="flex flex-col h-screen bg-gray-50">
        {/* TopBar fixa no topo */}
        <TopBar onNavigate={setCurrentView} />

        {/* Container principal: Sidebar + Conteúdo */}
        <div
          className="flex flex-1 overflow-hidden"
          style={{ marginTop: "64px" }}
        >
          <Sidebar
            currentView={currentView}
            onNavigate={setCurrentView}
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
      </AuthProvider>
    </ThemeProvider>
  );
}