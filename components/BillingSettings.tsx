import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Progress } from "./ui/progress";
import { Separator } from "./ui/separator";
import { Alert, AlertDescription } from "./ui/alert";
import {
  CreditCard,
  TrendingUp,
  Users,
  Package,
  FileText,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Crown,
  Zap,
  Shield,
  Download,
  Clock,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner@2.0.3";
import { Subscription, PlanTier, BillingCycle } from "../types/subscription";
import { PLANS, getPlan, formatPrice, getAllPlans, getBillingCycleLabel } from "../config/plans";
import { getUsageOverview, getUsageWarnings } from "../utils/subscriptionLimits";
import { projectId, publicAnonKey } from "../utils/supabase/info";

/* =========================================================================
 * COMPONENTE PRINCIPAL
 * ========================================================================= */

export function BillingSettings() {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<"plano" | "uso" | "faturas">("plano");
  
  // STATE - ASSINATURA
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>("monthly");

  /* =======================================================================
   * EFEITOS
   * ======================================================================= */

  useEffect(() => {
    if (session?.access_token) {
      loadSubscription();
    }
  }, [session]);

  /* =======================================================================
   * FUNÇÕES - CARREGAR DADOS
   * ======================================================================= */

  const loadSubscription = async () => {
    try {
      setLoading(true);
      const token = session?.access_token;
      if (!token) {
        throw new Error("Não autenticado");
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/subscription/current`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setSubscription(data.data);
        setSelectedCycle(data.data.billingCycle || "monthly");
      } else {
        throw new Error(data.error || "Erro ao carregar assinatura");
      }
    } catch (error) {
      console.error("Erro ao carregar assinatura:", error);
      toast.error("Erro ao carregar dados da assinatura");
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================================
   * RENDER - LOADING
   * ======================================================================= */

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2>Planos & Cobrança</h2>
            <p className="text-muted-foreground">
              Gerenciamento de assinatura e pagamentos
            </p>
          </div>
        </div>
        <Card className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </Card>
      </div>
    );
  }

  const currentPlan = subscription ? getPlan(subscription.planId) : null;
  const usageOverview = subscription ? getUsageOverview(subscription) : null;
  const warnings = subscription ? getUsageWarnings(subscription) : [];

  /* =======================================================================
   * RENDER PRINCIPAL
   * ======================================================================= */

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2>Planos & Cobrança</h2>
          <p className="text-muted-foreground">
            Gerenciamento de assinatura e pagamentos
          </p>
        </div>
      </div>

      {/* ALERTAS DE USO */}
      {warnings.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {warnings.map((warning, index) => (
                <div key={index}>• {warning}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* CARD DO PLANO ATUAL */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3>Plano {currentPlan?.name}</h3>
              {currentPlan?.popular && (
                <Badge variant="default">Mais Popular</Badge>
              )}
              {currentPlan?.highlighted && (
                <Badge variant="default">Recomendado</Badge>
              )}
            </div>
            <p className="text-muted-foreground">{currentPlan?.description}</p>
            {subscription?.status === "trial" && (
              <div className="flex items-center gap-2 mt-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-amber-600">
                  🎉 Trial ativo até{" "}
                  {subscription.trialEndDate
                    ? new Date(subscription.trialEndDate).toLocaleDateString(
                        "pt-BR"
                      )
                    : "—"}
                  {" "}(Plano Ilimitado)
                </span>
              </div>
            )}
          </div>
          <div className="text-right">
            {subscription?.status !== "trial" && (
              <>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">
                    {formatPrice(currentPlan?.price[subscription?.billingCycle || "monthly"] || 0)}
                  </span>
                  <span className="text-muted-foreground">
                    /{getBillingCycleLabel(subscription?.billingCycle || "monthly").toLowerCase()}
                  </span>
                </div>
                {subscription?.billingCycle !== "monthly" &&
                  currentPlan?.discount && (
                    <Badge variant="secondary" className="mt-1">
                      {currentPlan.discount[subscription.billingCycle]}% de desconto
                    </Badge>
                  )}
              </>
            )}
            {subscription?.status === "trial" && (
              <div className="text-green-600 font-bold text-xl">
                GRÁTIS
              </div>
            )}
          </div>
        </div>

        <Separator className="my-6" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Status</div>
            <div className="flex items-center gap-2">
              {subscription?.status === "active" && (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-green-600 font-medium">Ativa</span>
                </>
              )}
              {subscription?.status === "trial" && (
                <>
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span className="text-amber-600 font-medium">Trial (Teste Grátis)</span>
                </>
              )}
              {subscription?.status === "expired" && (
                <>
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-red-600 font-medium">Expirada</span>
                </>
              )}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">
              {subscription?.status === "trial" ? "Fim do Trial" : "Próximo Pagamento"}
            </div>
            <div className="font-medium">
              {subscription?.currentPeriodEnd
                ? new Date(subscription.currentPeriodEnd).toLocaleDateString(
                    "pt-BR"
                  )
                : "—"}
            </div>
          </div>
        </div>
      </Card>

      {/* TABS */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="plano">Planos</TabsTrigger>
          <TabsTrigger value="uso">Uso</TabsTrigger>
          <TabsTrigger value="faturas">Faturas</TabsTrigger>
        </TabsList>

        {/* TAB: PLANOS */}
        <TabsContent value="plano" className="space-y-4">
          {/* SELETOR DE CICLO */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4>Ciclo de Cobrança</h4>
                <p className="text-sm text-muted-foreground">
                  Escolha o ciclo e economize mais
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={selectedCycle === "monthly" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCycle("monthly")}
                >
                  Mensal
                </Button>
                <Button
                  variant={selectedCycle === "quarterly" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCycle("quarterly")}
                >
                  Trimestral
                  <Badge variant="secondary" className="ml-2">-5%</Badge>
                </Button>
                <Button
                  variant={selectedCycle === "semiannual" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCycle("semiannual")}
                >
                  Semestral
                  <Badge variant="secondary" className="ml-2">-10%</Badge>
                </Button>
                <Button
                  variant={selectedCycle === "yearly" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCycle("yearly")}
                >
                  Anual
                  <Badge variant="secondary" className="ml-2">-20%</Badge>
                </Button>
              </div>
            </div>
          </Card>

          <PlansGrid
            currentPlanId={subscription?.planId || "basico"}
            selectedCycle={selectedCycle}
            isTrial={subscription?.status === "trial"}
          />
        </TabsContent>

        {/* TAB: USO */}
        <TabsContent value="uso" className="space-y-4">
          {usageOverview && (
            <UsageTab usageOverview={usageOverview} subscription={subscription!} />
          )}
        </TabsContent>

        {/* TAB: FATURAS */}
        <TabsContent value="faturas" className="space-y-4">
          <InvoicesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* =========================================================================
 * COMPONENTE: GRID DE PLANOS
 * ========================================================================= */

function PlansGrid({
  currentPlanId,
  selectedCycle,
  isTrial,
}: {
  currentPlanId: PlanTier;
  selectedCycle: BillingCycle;
  isTrial: boolean;
}) {
  const plans = getAllPlans();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {plans.map((plan) => {
        const price = plan.price[selectedCycle];
        const isCurrentPlan = plan.id === currentPlanId && !isTrial;

        return (
          <Card
            key={plan.id}
            className={`p-6 relative ${
              isCurrentPlan ? "border-primary border-2" : ""
            } ${plan.highlighted ? "shadow-lg" : ""}`}
          >
            {/* BADGES */}
            {isCurrentPlan && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge>Plano Atual</Badge>
              </div>
            )}
            {plan.popular && !isCurrentPlan && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge variant="default">Mais Popular</Badge>
              </div>
            )}
            {plan.highlighted && !isCurrentPlan && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-green-600">Recomendado</Badge>
              </div>
            )}

            {/* HEADER */}
            <div className="text-center mb-4">
              <h3 className="mb-2">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {plan.description}
              </p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl font-bold">
                  {formatPrice(price)}
                </span>
                <span className="text-muted-foreground">
                  /{selectedCycle === "monthly" ? "mês" : selectedCycle === "quarterly" ? "trim" : selectedCycle === "semiannual" ? "sem" : "ano"}
                </span>
              </div>
              {selectedCycle !== "monthly" && plan.discount && (
                <div className="text-sm text-green-600 mt-1 font-medium">
                  Economize {plan.discount[selectedCycle]}%
                </div>
              )}
            </div>

            <Separator className="my-4" />

            {/* FEATURES */}
            <ul className="space-y-2 mb-6 min-h-[300px]">
              {plan.features.map((feature, index) => {
                const isNegative = feature.startsWith("❌");
                return (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    {isNegative ? (
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    )}
                    <span className={isNegative ? "text-muted-foreground" : ""}>
                      {feature.replace("✅ ", "").replace("❌ ", "")}
                    </span>
                  </li>
                );
              })}
            </ul>

            {/* CTA */}
            {isCurrentPlan ? (
              <Button className="w-full" variant="outline" disabled>
                Plano Atual
              </Button>
            ) : (
              <Button className="w-full" variant="default">
                {isTrial ? "Assinar Agora" : "Mudar para este Plano"}
              </Button>
            )}
          </Card>
        );
      })}
    </div>
  );
}

/* =========================================================================
 * COMPONENTE: TAB DE USO
 * ========================================================================= */

function UsageTab({
  usageOverview,
  subscription,
}: {
  usageOverview: any;
  subscription: Subscription;
}) {
  const plan = getPlan(subscription.planId);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* PEDIDOS DE VENDA */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            <h4>Pedidos de Venda</h4>
          </div>
          <Badge variant={usageOverview.salesOrders.nearLimit ? "destructive" : "secondary"}>
            {usageOverview.salesOrders.current} / {usageOverview.salesOrders.max >= 99999 ? "∞" : usageOverview.salesOrders.max}
          </Badge>
        </div>
        <Progress value={Math.min(usageOverview.salesOrders.percentage, 100)} />
        <p className="text-sm text-muted-foreground mt-2">
          {usageOverview.salesOrders.max >= 99999 ? "Ilimitado" : `${usageOverview.salesOrders.percentage.toFixed(1)}% utilizado este mês`}
        </p>
      </Card>

      {/* PEDIDOS DE COMPRA */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-purple-500" />
            <h4>Pedidos de Compra</h4>
          </div>
          <Badge variant={usageOverview.purchaseOrders.nearLimit ? "destructive" : "secondary"}>
            {usageOverview.purchaseOrders.current} / {usageOverview.purchaseOrders.max >= 99999 ? "∞" : usageOverview.purchaseOrders.max}
          </Badge>
        </div>
        <Progress value={Math.min(usageOverview.purchaseOrders.percentage, 100)} />
        <p className="text-sm text-muted-foreground mt-2">
          {usageOverview.purchaseOrders.max >= 99999 ? "Ilimitado" : `${usageOverview.purchaseOrders.percentage.toFixed(1)}% utilizado este mês`}
        </p>
      </Card>

      {/* NF-es */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-500" />
            <h4>Notas Fiscais</h4>
          </div>
          <Badge variant={usageOverview.invoices.nearLimit ? "destructive" : "secondary"}>
            {usageOverview.invoices.current} / {usageOverview.invoices.max >= 99999 ? "∞" : usageOverview.invoices.max}
          </Badge>
        </div>
        <Progress value={Math.min(usageOverview.invoices.percentage, 100)} />
        <p className="text-sm text-muted-foreground mt-2">
          {!plan.limits.features.fiscalModule 
            ? "Módulo fiscal não disponível no seu plano"
            : usageOverview.invoices.max >= 99999 
            ? "Ilimitado" 
            : `${usageOverview.invoices.percentage.toFixed(1)}% utilizado este mês`}
        </p>
      </Card>

      {/* TRANSAÇÕES */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-amber-500" />
            <h4>Transações</h4>
          </div>
          <Badge variant={usageOverview.transactions.nearLimit ? "destructive" : "secondary"}>
            {usageOverview.transactions.current} / {usageOverview.transactions.max >= 99999 ? "∞" : usageOverview.transactions.max}
          </Badge>
        </div>
        <Progress value={Math.min(usageOverview.transactions.percentage, 100)} />
        <p className="text-sm text-muted-foreground mt-2">
          {usageOverview.transactions.max >= 99999 ? "Ilimitado" : `${usageOverview.transactions.percentage.toFixed(1)}% utilizado este mês`}
        </p>
      </Card>

      {/* ARMAZENAMENTO */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-pink-500" />
            <h4>Armazenamento</h4>
          </div>
          <Badge variant={usageOverview.storage.nearLimit ? "destructive" : "secondary"}>
            {usageOverview.storage.current.toFixed(2)} MB / {usageOverview.storage.max >= 99999 ? "∞" : `${usageOverview.storage.max} MB`}
          </Badge>
        </div>
        <Progress value={Math.min(usageOverview.storage.percentage, 100)} />
        <p className="text-sm text-muted-foreground mt-2">
          {usageOverview.storage.max >= 99999 ? "Ilimitado" : `${usageOverview.storage.percentage.toFixed(1)}% utilizado`}
        </p>
      </Card>
    </div>
  );
}

/* =========================================================================
 * COMPONENTE: TAB DE FATURAS
 * ========================================================================= */

function InvoicesTab() {
  return (
    <Card className="p-8 text-center">
      <Download className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="mb-2">Nenhuma fatura ainda</h3>
      <p className="text-muted-foreground mb-4">
        Suas faturas e histórico de pagamentos aparecerão aqui
      </p>
    </Card>
  );
}
