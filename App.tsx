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
  import("./components/TaxInvoicingModern").then((m) => ({
    default: m.TaxInvoicingModern,
  })),
);
const UsersPermissions = lazy(() =>
  import("./components/UsersPermissions").then((m) => ({
    default: m.UsersPermissions,
  })),
);
const TestePersistencia = lazy(() =>
  import("./components/TestePersistencia").then((m) => ({
    default: m.TestePersistencia,
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

// Billing & Assinaturas
const BillingSettings = lazy(() =>
  import("./components/BillingSettings").then((m) => ({
    default: m.BillingSettings,
  })),
);

// Nova tela de Alterar Plano
const ChangePlan = lazy(() =>
  import("./components/subscription/ChangePlan").then((m) => ({
    default: m.ChangePlan,
  })),
);

// Telas de Checkout Stripe
const CheckoutSuccess = lazy(() =>
  import("./components/subscription/CheckoutSuccess").then((m) => ({
    default: m.CheckoutSuccess,
  })),
);

const CheckoutCancel = lazy(() =>
  import("./components/subscription/CheckoutCancel").then((m) => ({
    default: m.CheckoutCancel,
  })),
);

// Webhook Debug Admin (apenas em desenvolvimento)
let WebhookDebug: any = null;
if (IS_DEVELOPMENT) {
  WebhookDebug = lazy(() =>
    import("./components/admin/WebhookDebug").then((m) => ({
      default: m.default,
    })),
  );
}

// Stripe Test Page
const StripeTestPage = lazy(() =>
  import("./components/stripe/StripeTestPage").then((m) => ({
    default: m.default,
  })),
);

// Subscription Debug (apenas em desenvolvimento)
let SubscriptionDebug: any = null;
if (IS_DEVELOPMENT) {
  SubscriptionDebug = lazy(() =>
    import("./components/subscription/SubscriptionDebug").then((m) => ({
      default: m.default,
    })),
  );
}

// System Audit (apenas em desenvolvimento)
let SystemAudit: any = null;
if (FEATURES.SYSTEM_AUDIT) {
  SystemAudit = lazy(() =>
    import("./components/SystemAudit").then((m) => ({
      default: m.SystemAudit,
    })),
  );
}

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
  | "billing"
  | "myPlan"
  | "changePlan"
  | "checkoutSuccess"
  | "checkoutCancel"
  | "webhookDebug"
  | "stripeTest"
  | "subscriptionDebug"
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
  
  // ✅ FLAG para evitar processamento duplicado de checkout
  const [hasProcessedCheckout, setHasProcessedCheckout] = useState(false);

  // Callback para navegar para NF-e a partir de um pedido
  const handleNavigateToNFeFromOrder = (orderData: any) => {
    setNfeDataFromOrder(orderData);
    setCurrentView("taxInvoicing");
    // Limpar dados após 3 segundos para permitir que sejam usados
    setTimeout(() => {
      setNfeDataFromOrder(null);
    }, 3000);
  };

  // Verificar hash (#stripeTest, #systemAudit, etc) na URL
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && hash !== '') {
        // Verificar se é uma view válida
        const validViews: NavigationView[] = [
          'stripeTest', 
          'systemAudit', 
          'webhookDebug', 
          'subscriptionDebug',
          'testePersistencia',
          'checkoutSuccess',
          'checkoutCancel',
          'billing',
          'myPlan',
          'changePlan'
        ];
        
        if (validViews.includes(hash as NavigationView)) {
          setCurrentView(hash as NavigationView);
        }
      }
    };

    // Executar na montagem
    handleHashChange();

    // Listener para mudanças no hash
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Verificar query params para redirecionamentos do Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get('checkout');
    
    if (checkoutStatus === 'success' && !hasProcessedCheckout) {
      setCurrentView('checkoutSuccess');
      setHasProcessedCheckout(true);
      // Limpar URL após um pequeno delay para garantir que a view seja renderizada
      setTimeout(() => {
        window.history.replaceState({}, '', window.location.pathname);
      }, 100);
    } else if (checkoutStatus === 'cancel' && !hasProcessedCheckout) {
      setCurrentView('checkoutCancel');
      setHasProcessedCheckout(true);
      // Limpar URL após um pequeno delay para garantir que a view seja renderizada
      setTimeout(() => {
        window.history.replaceState({}, '', window.location.pathname);
      }, 100);
    }
  }, []); // Executar apenas na montagem inicial

  // Listener para navegar para billing via evento customizado
  useEffect(() => {
    const handleNavigateToBilling = () => {
      setCurrentView("billing");
    };
    
    window.addEventListener('navigate-to-billing', handleNavigateToBilling);
    
    return () => {
      window.removeEventListener('navigate-to-billing', handleNavigateToBilling);
    };
  }, []);

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
      case "billing":
        return <BillingSettings />;
      case "myPlan":
        return <BillingSettings />;
      case "changePlan":
        return <ChangePlan />;
      case "checkoutSuccess":
        return <CheckoutSuccess onNavigate={setCurrentView} />;
      case "checkoutCancel":
        return <CheckoutCancel onNavigate={setCurrentView} />;
      case "webhookDebug":
        // PROTEÇÃO: Apenas em desenvolvimento
        if (!IS_DEVELOPMENT || !WebhookDebug) {
          console.warn("Webhook Debug não disponível em produção");
          return <Dashboard />;
        }
        return <WebhookDebug />;
      case "stripeTest":
        return <StripeTestPage />;
      case "subscriptionDebug":
        // PROTEÇÃO: Apenas em desenvolvimento
        if (!IS_DEVELOPMENT || !SubscriptionDebug) {
          console.warn("Subscription Debug não disponível em produção");
          return <Dashboard />;
        }
        return <SubscriptionDebug />;
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
            {/* 🔒 PLAN ACCESS GUARD - Bloqueia acesso se trial/plano expirou */}
            <PlanAccessGuard 
              currentView={currentView}
              onNavigateToPlans={() => setCurrentView("changePlan")}
            >
              {/* ⚡ Error Boundary + Suspense para lazy loading seguro */}
              <ErrorBoundary>
                <Suspense fallback={<ViewLoader />}>
                  {renderView()}
                </Suspense>
              </ErrorBoundary>
            </PlanAccessGuard>
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
        <SubscriptionProvider>
          <AppContent />
          <SpeedInsights />
          <UpgradeDialog />
          <SubscriptionAlerts />
        </SubscriptionProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}