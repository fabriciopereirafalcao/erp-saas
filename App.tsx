import { Suspense, lazy, useState, useEffect } from "react";
import { Toaster } from "sonner@2.0.3";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Sidebar } from "./components/Sidebar.tsx";
import { TopBar } from "./components/TopBar.tsx";
import { AuthFlow } from "./components/auth/AuthFlow.tsx";
import { LoadingScreen } from "./components/LoadingScreen.tsx";
import { AuthProvider, useAuth } from "./contexts/AuthContext.tsx";
import { ThemeProvider } from "./contexts/ThemeContext.tsx";
import { ERPProvider } from "./contexts/ERPContext.tsx";
import { SubscriptionProvider } from "./contexts/SubscriptionContext.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { UpgradeDialog } from "./components/UpgradeDialog.tsx";
import { SubscriptionAlerts } from "./components/subscription/SubscriptionAlerts.tsx";
import { PlanAccessGuard } from "./components/subscription/PlanAccessGuard.tsx";
import { FEATURES, IS_DEVELOPMENT } from "./utils/environment.ts";
import { DebugPersistence } from "./components/DebugPersistence.tsx";
import { checkAuth, handleUnauthorized } from "./utils/authFetch.tsx";
import { MaintenancePage } from "./components/MaintenancePage.tsx";

// Importar utilitário de limpeza (disponível no console do navegador)
import "./utils/cleanDuplicates.ts";

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
const AccountsPayableReceivable = lazy(() =>
  import("./components/AccountsPayableReceivable").then((m) => ({
    default: m.AccountsPayableReceivable,
  })),
);
const Reports = lazy(() =>
  import("./components/Reports").then((m) => ({
    default: m.Reports,
  })),
);
const CashFlow = lazy(() =>
  import("./components/CashFlow").then((m) => ({
    default: m.CashFlow,
  })),
);
const BalanceReconciliation = lazy(() =>
  import("./components/BalanceReconciliation").then((m) => ({
    default: m.BalanceReconciliation,
  })),
);
const TaxInvoicing = lazy(() =>
  import("./components/TaxInvoicing").then((m) => ({
    default: m.TaxInvoicing,
  })),
);
const CompanySettings = lazy(() =>
  import("./components/CompanySettings").then((m) => ({
    default: m.CompanySettings,
  })),
);
const UsersPermissions = lazy(() =>
  import("./components/UsersPermissions").then((m) => ({
    default: m.UsersPermissions,
  })),
);
const SystemAudit = lazy(() =>
  import("./components/SystemAudit").then((m) => ({
    default: m.SystemAudit,
  })),
);
const LandingPage = lazy(() =>
  import("./components/LandingPage").then((m) => ({
    default: m.LandingPage,
  })),
);
const BillingSettings = lazy(() =>
  import("./components/BillingSettings").then((m) => ({
    default: m.BillingSettings,
  })),
);
const AcceptInvite = lazy(() =>
  import("./components/AcceptInvite").then((m) => ({
    default: m.AcceptInvite,
  })),
);

// 🔒 VERIFICAÇÃO DE AMBIENTE - Manutenção apenas em PRODUÇÃO
// IMPORTANTE: Só ativa manutenção quando VITE_VERCEL_ENV for explicitamente 'production'
const IS_MAINTENANCE_MODE = import.meta.env?.VITE_VERCEL_ENV === 'production';

console.log('🔧 Environment Check:', {
  VITE_VERCEL_ENV: import.meta.env?.VITE_VERCEL_ENV,
  IS_PROD: import.meta.env?.PROD,
  IS_MAINTENANCE_MODE,
  mode: import.meta.env?.MODE
});

function AppContent() {
  const { currentUser, loading: authLoading } = useAuth();
  const [currentView, setCurrentView] = useState<string>("dashboard");

  console.log('👤 AppContent State:', {
    currentUser: currentUser?.email,
    authLoading,
    IS_MAINTENANCE_MODE
  });

  useEffect(() => {
    // Verificar autenticação periodicamente
    const interval = setInterval(() => {
      checkAuth().catch(() => {
        handleUnauthorized();
      });
    }, 5 * 60 * 1000); // A cada 5 minutos

    return () => clearInterval(interval);
  }, []);

  // 🛑 MODO DE MANUTENÇÃO - Exibir apenas em PRODUÇÃO
  if (IS_MAINTENANCE_MODE) {
    console.log('🛑 Modo de manutenção ativo');
    return <MaintenancePage />;
  }

  // ⏳ Aguardar autenticação
  if (authLoading) {
    console.log('⏳ Aguardando autenticação...');
    return <LoadingScreen />;
  }

  // ⚠️ IMPORTANTE: O AuthFlow já cuida de verificar se o usuário está autenticado!
  // Se chegamos aqui, é porque o usuário ESTÁ autenticado (AuthFlow validou)
  // Mas por segurança, vamos verificar mesmo assim
  if (!currentUser) {
    console.warn('⚠️ AppContent renderizado sem usuário (não deveria acontecer)');
    return <LoadingScreen />;
  }

  // Rota de convite
  const urlParams = new URLSearchParams(window.location.search);
  const inviteId = urlParams.get('invite');
  if (inviteId) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <AcceptInvite inviteId={inviteId} />
      </Suspense>
    );
  }

  console.log('✅ Usuário autenticado - Renderizando app');

  // Renderizar conteúdo com base na view selecionada
  const renderContent = () => {
    switch (currentView) {
      case "dashboard":
        return (
          <PlanAccessGuard feature="dashboard">
            <Dashboard />
          </PlanAccessGuard>
        );
      case "inventory":
        return (
          <PlanAccessGuard feature="inventory">
            <Inventory />
          </PlanAccessGuard>
        );
      case "sales-orders":
        return (
          <PlanAccessGuard feature="orders">
            <SalesOrders />
          </PlanAccessGuard>
        );
      case "purchase-orders":
        return (
          <PlanAccessGuard feature="orders">
            <PurchaseOrders />
          </PlanAccessGuard>
        );
      case "customers":
        return (
          <PlanAccessGuard feature="customers">
            <Customers />
          </PlanAccessGuard>
        );
      case "suppliers":
        return (
          <PlanAccessGuard feature="suppliers">
            <Suppliers />
          </PlanAccessGuard>
        );
      case "accounts":
        return (
          <PlanAccessGuard feature="financial">
            <AccountsPayableReceivable />
          </PlanAccessGuard>
        );
      case "reports":
        return (
          <PlanAccessGuard feature="reports">
            <Reports />
          </PlanAccessGuard>
        );
      case "cash-flow":
        return (
          <PlanAccessGuard feature="financial">
            <CashFlow />
          </PlanAccessGuard>
        );
      case "balance-reconciliation":
        return (
          <PlanAccessGuard feature="financial">
            <BalanceReconciliation />
          </PlanAccessGuard>
        );
      case "tax-invoicing":
        return (
          <PlanAccessGuard feature="nfe">
            <TaxInvoicing />
          </PlanAccessGuard>
        );
      case "company-settings":
        return (
          <PlanAccessGuard feature="settings">
            <CompanySettings />
          </PlanAccessGuard>
        );
      case "users-permissions":
        return (
          <PlanAccessGuard feature="users">
            <UsersPermissions />
          </PlanAccessGuard>
        );
      case "system-audit":
        return (
          <PlanAccessGuard feature="audit">
            <SystemAudit />
          </PlanAccessGuard>
        );
      case "billing":
        return (
          <PlanAccessGuard feature="billing">
            <BillingSettings />
          </PlanAccessGuard>
        );
      default:
        return (
          <PlanAccessGuard feature="dashboard">
            <Dashboard />
          </PlanAccessGuard>
        );
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <SubscriptionAlerts />
        <main className="flex-1 overflow-y-auto p-6">
          <ErrorBoundary>
            <Suspense fallback={<LoadingScreen />}>
              {renderContent()}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      <UpgradeDialog />
      {IS_DEVELOPMENT && FEATURES.DEBUG_PERSISTENCE && <DebugPersistence />}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <ERPProvider>
              <AuthFlow>
                <AppContent />
              </AuthFlow>
              <Toaster position="top-right" />
              <SpeedInsights />
            </ERPProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}