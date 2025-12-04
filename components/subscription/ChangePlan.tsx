import { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Check, X, Zap, ArrowRight, Info, CreditCard, QrCode, FileText } from "lucide-react";
import { useSubscription } from "../../contexts/SubscriptionContext";
import { PLANS } from "../../config/plans";
import { PlanTier } from "../../types/subscription";
import { toast } from "sonner";
import { projectId } from "../../utils/supabase/info";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "../ui/alert";
import { UpgradePreview } from "./UpgradePreview";
import { PixPaymentModal } from "./PixPaymentModal";
import { BoletoPaymentModal } from "./BoletoPaymentModal";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

type PaymentMethod = "credit_card" | "pix" | "boleto";

export function ChangePlan() {
  const { subscription, loading, refreshSubscription } = useSubscription();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "semiannual" | "yearly">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<{
    planId: PlanTier;
    billingCycle: "monthly" | "semiannual" | "yearly";
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // 🔥 NOVO: Estados para PIX/Boleto
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("credit_card");
  const [showPixModal, setShowPixModal] = useState(false);
  const [showBoletoModal, setShowBoletoModal] = useState(false);
  const [pixData, setPixData] = useState<any>(null);
  const [boletoData, setBoletoData] = useState<any>(null);
  
  // 🔥 NOVO: Dados de cobrança (obrigatórios para boleto)
  const [billingDetails, setBillingDetails] = useState({
    name: "",
    email: "",
    tax_id: "", // CPF ou CNPJ
  });

  if (loading || !subscription) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  const currentPlanId = subscription.planId;
  const currentBillingCycle = subscription.billingCycle as "monthly" | "semiannual" | "yearly";
  const isTrial = subscription.status === "trial";
  
  const planHierarchy: PlanTier[] = ["basico", "intermediario", "avancado", "ilimitado"];
  const currentIndex = planHierarchy.indexOf(currentPlanId as PlanTier);

  // 🔧 FIX: Considerar mudança de ciclo no mesmo plano
  const isCurrentPlanAndCycle = (planId: PlanTier, cycle: "monthly" | "semiannual" | "yearly") => {
    return planId === currentPlanId && cycle === currentBillingCycle && !isTrial;
  };

  const isDowngrade = (targetPlanId: PlanTier) => {
    const targetIndex = planHierarchy.indexOf(targetPlanId);
    return targetIndex < currentIndex && !isTrial;
  };

  const isUpgrade = (targetPlanId: PlanTier, targetCycle: "monthly" | "semiannual" | "yearly") => {
    const targetIndex = planHierarchy.indexOf(targetPlanId);
    
    // Upgrade de plano (ex: Intermediário → Avançado)
    if (targetIndex > currentIndex) return true;
    
    // Upgrade de ciclo no mesmo plano (ex: Ilimitado Mensal → Ilimitado Semestral)
    if (targetIndex === currentIndex && targetCycle !== currentBillingCycle) return true;
    
    // Trial para qualquer plano é upgrade
    if (isTrial) return true;
    
    return false;
  };

  const handleSelectPlan = (planId: PlanTier, billingCycle: "monthly" | "semiannual" | "yearly") => {
    setSelectedPlan({ planId, billingCycle });
    
    // Se for upgrade, mostrar preview
    if (isUpgrade(planId, billingCycle)) {
      setShowPreview(true);
    }
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setSelectedPlan(null);
  };

  const handleConfirmChange = async () => {
    if (!selectedPlan) return;

    setIsProcessing(true);

    try {
      // 🔧 FIX: Obter token via Supabase Auth (método correto)
      const { supabase } = await import('../../utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error("Sessão expirada. Faça login novamente.");
        setIsProcessing(false);
        return;
      }

      const token = session.access_token;
      const willBeDowngrade = isDowngrade(selectedPlan.planId);
      
      // 🔥 NOVO: Se for PIX ou Boleto, usar nova lógica
      if (paymentMethod === "pix") {
        await handlePixPayment(token);
        return;
      }
      
      if (paymentMethod === "boleto") {
        await handleBoletoPayment(token);
        return;
      }
      
      // Se for upgrade (incluindo trial), usar Stripe Checkout (CARTÃO)
      if (!willBeDowngrade) {
        // Chamar API do Stripe para criar checkout
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/stripe/create-checkout-session`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              planId: selectedPlan.planId,
              billingCycle: selectedPlan.billingCycle,
              frontendUrl: window.location.origin,
            }),
          }
        );

        const data = await response.json();

        // Verificar resposta do backend
        if (data.success && data.upgraded) {
          // ✅ Upgrade processado via API (não precisa redirecionar)
          toast.success(data.message || "Plano atualizado! Cobrança proporcional será processada.");
          await refreshSubscription();
          setSelectedPlan(null);
          setShowPreview(false);
          setIsProcessing(false);
        } else if (data.success && data.checkoutUrl) {
          // Redirecionar para Stripe Checkout (primeira assinatura ou trial)
          toast.success("Redirecionando para checkout...");
          window.location.href = data.checkoutUrl;
        } else {
          toast.error(data.error || "Erro ao criar sessão de checkout");
          setIsProcessing(false);
        }
      } else {
        // Downgrade - usar lógica antiga
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/subscription/downgrade`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              newPlanId: selectedPlan.planId,
              billingCycle: selectedPlan.billingCycle,
            }),
          }
        );

        const data = await response.json();

        if (data.success) {
          toast.success(
            "Downgrade agendado! Será efetivado no próximo período de cobrança."
          );
          await refreshSubscription();
          setSelectedPlan(null);
        } else {
          toast.error(data.error || "Erro ao processar downgrade");
        }
      }
    } catch (error) {
      console.error("Erro ao mudar plano:", error);
      toast.error("Erro ao processar mudança de plano");
      setIsProcessing(false);
    }
  };
  
  // 🔥 NOVO: Processar pagamento PIX
  const handlePixPayment = async (token: string) => {
    if (!selectedPlan) return;
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/stripe/create-pix-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            planId: selectedPlan.planId,
            billingCycle: selectedPlan.billingCycle,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        // Armazenar dados do PIX e abrir modal
        setPixData({
          pixQrCode: data.pixQrCode,
          pixQrCodeUrl: data.pixQrCodeUrl,
          amount: data.amount,
          expiresAt: data.expiresAt,
          paymentIntentId: data.paymentIntentId,
          planName: PLANS[selectedPlan.planId].name,
          billingCycle: selectedPlan.billingCycle,
        });
        
        setShowPixModal(true);
        setShowPreview(false);
        toast.success("QR Code PIX gerado com sucesso!");
      } else {
        toast.error(data.error || "Erro ao gerar PIX");
      }
    } catch (error) {
      console.error("Erro ao criar pagamento PIX:", error);
      toast.error("Erro ao processar pagamento PIX");
    } finally {
      setIsProcessing(false);
    }
  };
  
  // 🔥 NOVO: Processar pagamento Boleto
  const handleBoletoPayment = async (token: string) => {
    if (!selectedPlan) return;
    
    // Validar dados de cobrança
    if (!billingDetails.name || !billingDetails.email || !billingDetails.tax_id) {
      toast.error("Preencha todos os dados de cobrança para gerar o boleto");
      setIsProcessing(false);
      return;
    }
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/stripe/create-boleto-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            planId: selectedPlan.planId,
            billingCycle: selectedPlan.billingCycle,
            billingDetails,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        // Armazenar dados do boleto e abrir modal
        setBoletoData({
          boletoNumber: data.boletoNumber,
          boletoUrl: data.boletoUrl,
          boletoBarcode: data.boletoBarcode,
          amount: data.amount,
          expiresAt: data.expiresAt,
          paymentIntentId: data.paymentIntentId,
          planName: PLANS[selectedPlan.planId].name,
          billingCycle: selectedPlan.billingCycle,
        });
        
        setShowBoletoModal(true);
        setShowPreview(false);
        toast.success("Boleto gerado com sucesso!");
      } else {
        toast.error(data.error || "Erro ao gerar boleto");
      }
    } catch (error) {
      console.error("Erro ao criar boleto:", error);
      toast.error("Erro ao processar boleto");
    } finally {
      setIsProcessing(false);
    }
  };

  const plans: PlanTier[] = ["basico", "intermediario", "avancado", "ilimitado"];

  return (
    <div className="p-8">
      {/* Preview de Upgrade */}
      {showPreview && selectedPlan && (
        <UpgradePreview
          open={showPreview}
          onClose={handleCancelPreview}
          onConfirm={handleConfirmChange}
          currentPlan={{
            planId: currentPlanId as PlanTier,
            billingCycle: subscription.billingCycle as "monthly" | "semiannual" | "yearly",
            currentPeriodEnd: subscription.currentPeriodEnd,
            status: subscription.status, // ← CRITICAL FIX: Passar status para verificar trial
          }}
          newPlan={{
            planId: selectedPlan.planId,
            billingCycle: selectedPlan.billingCycle,
          }}
          isProcessing={isProcessing}
        />
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Alterar Plano</h1>
        <p className="text-gray-600">
          Compare os planos e escolha o melhor para sua empresa
        </p>
      </div>

      {/* Toggle de Ciclo de Cobrança */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <Button
          variant={billingCycle === "monthly" ? "default" : "outline"}
          onClick={() => setBillingCycle("monthly")}
          className="min-w-[120px]"
        >
          Mensal
        </Button>
        <Button
          variant={billingCycle === "semiannual" ? "default" : "outline"}
          onClick={() => setBillingCycle("semiannual")}
          className="min-w-[120px]"
        >
          Semestral
          <Badge className="ml-2 bg-green-600">-10%</Badge>
        </Button>
        <Button
          variant={billingCycle === "yearly" ? "default" : "outline"}
          onClick={() => setBillingCycle("yearly")}
          className="min-w-[120px]"
        >
          Anual
          <Badge className="ml-2 bg-green-600">-20%</Badge>
        </Button>
      </div>

      {/* Grid de Planos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {plans.map((planId) => {
          const plan = PLANS[planId];
          const isCurrentPlan = isCurrentPlanAndCycle(planId, billingCycle);
          const isSelected = selectedPlan?.planId === planId;
          const willBeUpgrade = isUpgrade(planId, billingCycle);
          const willBeDowngrade = isDowngrade(planId);
          const price = billingCycle === "monthly" ? plan.price.monthly : billingCycle === "semiannual" ? plan.price.semiannual : plan.price.yearly;

          return (
            <Card
              key={planId}
              className={`p-6 relative ${
                isSelected
                  ? "border-2 border-green-500 shadow-lg"
                  : isCurrentPlan
                  ? "border-2 border-blue-500"
                  : "border border-gray-200"
              }`}
            >
              {/* Badge Plano Atual */}
              {isCurrentPlan && (
                <Badge className="absolute top-4 right-4 bg-blue-600">
                  Plano Atual
                </Badge>
              )}

              {/* Header do Card */}
              <div className="mb-6">
                <h3 className="text-xl capitalize mb-2 text-gray-900">{plan.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl text-gray-900">
                    {price === 0 ? "Grátis" : `R$ ${price.toFixed(2)}`}
                  </span>
                  {price > 0 && (
                    <span className="text-sm text-gray-600">
                      /{billingCycle === "monthly" ? "mês" : billingCycle === "semiannual" ? "6 meses" : "ano"}
                    </span>
                  )}
                </div>
                {billingCycle !== "monthly" && price > 0 && (
                  <div className="mt-2">
                    <span className="text-sm text-gray-500 line-through">
                      R$ {billingCycle === "semiannual" ? (plan.price.monthly * 6).toFixed(2) : (plan.price.monthly * 12).toFixed(2)}
                    </span>
                    <span className="ml-2 text-sm text-green-600">
                      Economize {billingCycle === "semiannual" ? "10%" : "20%"}
                    </span>
                  </div>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">
                    <strong>
                      {plan.limits.maxInvoices >= 999999 ? "Ilimitado" : plan.limits.maxInvoices}
                    </strong>{" "}
                    NF-e/mês
                  </span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">
                    <strong>
                      {plan.limits.maxTransactions >= 999999 ? "Ilimitado" : plan.limits.maxTransactions}
                    </strong>{" "}
                    Transações/mês
                  </span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">
                    <strong>
                      {plan.limits.maxUsers >= 999999 ? "Ilimitado" : plan.limits.maxUsers}
                    </strong>{" "}
                    {plan.limits.maxUsers === 1 ? "Usuário" : "Usuários"}
                  </span>
                </li>
                {plan.limits.maxUsers > 1 ? (
                  <li className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Multi-usuário</span>
                  </li>
                ) : (
                  <li className="flex items-start gap-2 text-sm">
                    <X className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-400">Multi-usuário</span>
                  </li>
                )}
                {plan.limits.features.advancedReports ? (
                  <li className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Relatórios Avançados</span>
                  </li>
                ) : (
                  <li className="flex items-start gap-2 text-sm">
                    <X className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-400">Relatórios Avançados</span>
                  </li>
                )}
                {plan.limits.features.apiAccess ? (
                  <li className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Acesso API</span>
                  </li>
                ) : (
                  <li className="flex items-start gap-2 text-sm">
                    <X className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-400">Acesso API</span>
                  </li>
                )}
                {plan.limits.features.prioritySupport && (
                  <li className="flex items-start gap-2 text-sm">
                    <Zap className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Suporte Prioritário</span>
                  </li>
                )}
              </ul>

              {/* Botão de Ação */}
              {isCurrentPlan ? (
                <Button disabled className="w-full">
                  Plano Atual
                </Button>
              ) : (
                <Button
                  onClick={() => handleSelectPlan(planId, billingCycle)}
                  variant={isSelected ? "default" : "outline"}
                  className="w-full"
                >
                  {isSelected ? "Selecionado" : "Contratar"}
                </Button>
              )}

              {/* Badge de tipo de mudança - só mostrar se NÃO for plano atual+ciclo */}
              {!isCurrentPlan && (
                <div className="mt-3 text-center">
                  {willBeUpgrade ? (
                    <Badge className="bg-green-600">Efeito Imediato</Badge>
                  ) : willBeDowngrade ? (
                    <Badge className="bg-orange-600">Agendado</Badge>
                  ) : null}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Área de Confirmação */}
      {selectedPlan && (
        <>
          {/* 🔥 NOVO: Seletor de Método de Pagamento */}
          <Card className="p-6 mb-6 bg-blue-50 border-2 border-blue-500">
            <h3 className="text-blue-900 mb-4">Escolha o método de pagamento</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Cartão de Crédito */}
              <button
                onClick={() => setPaymentMethod("credit_card")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  paymentMethod === "credit_card"
                    ? "border-blue-600 bg-blue-100"
                    : "border-gray-300 bg-white hover:border-blue-400"
                }`}
              >
                <CreditCard className={`w-8 h-8 mx-auto mb-2 ${paymentMethod === "credit_card" ? "text-blue-600" : "text-gray-600"}`} />
                <p className="font-semibold text-gray-900 text-center">Cartão de Crédito</p>
                <p className="text-xs text-gray-600 text-center mt-1">Renovação automática</p>
              </button>

              {/* PIX */}
              <button
                onClick={() => setPaymentMethod("pix")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  paymentMethod === "pix"
                    ? "border-green-600 bg-green-100"
                    : "border-gray-300 bg-white hover:border-green-400"
                }`}
              >
                <QrCode className={`w-8 h-8 mx-auto mb-2 ${paymentMethod === "pix" ? "text-green-600" : "text-gray-600"}`} />
                <p className="font-semibold text-gray-900 text-center">PIX</p>
                <p className="text-xs text-gray-600 text-center mt-1">Ativação instantânea</p>
              </button>

              {/* Boleto */}
              <button
                onClick={() => setPaymentMethod("boleto")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  paymentMethod === "boleto"
                    ? "border-orange-600 bg-orange-100"
                    : "border-gray-300 bg-white hover:border-orange-400"
                }`}
              >
                <FileText className={`w-8 h-8 mx-auto mb-2 ${paymentMethod === "boleto" ? "text-orange-600" : "text-gray-600"}`} />
                <p className="font-semibold text-gray-900 text-center">Boleto</p>
                <p className="text-xs text-gray-600 text-center mt-1">Até 3 dias úteis</p>
              </button>
            </div>

            {/* Informações do método escolhido */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {paymentMethod === "credit_card" && (
                  <span><strong>Renovação automática:</strong> Seu plano será renovado automaticamente no final de cada período.</span>
                )}
                {paymentMethod === "pix" && (
                  <span><strong>Pagamento único:</strong> Plano ativo pelo período escolhido. Não renova automaticamente.</span>
                )}
                {paymentMethod === "boleto" && (
                  <span><strong>Pagamento único:</strong> Plano ativo pelo período escolhido. Confirmação em até 3 dias úteis.</span>
                )}
              </AlertDescription>
            </Alert>

            {/* 🔥 NOVO: Formulário de dados de cobrança (obrigatório para boleto) */}
            {paymentMethod === "boleto" && (
              <div className="mt-6 pt-6 border-t border-blue-300">
                <h4 className="text-blue-900 mb-4">Dados de Cobrança (obrigatórios)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input
                      id="name"
                      value={billingDetails.name}
                      onChange={(e) => setBillingDetails({ ...billingDetails, name: e.target.value })}
                      placeholder="João Silva"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={billingDetails.email}
                      onChange={(e) => setBillingDetails({ ...billingDetails, email: e.target.value })}
                      placeholder="joao@empresa.com"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="tax_id">CPF ou CNPJ</Label>
                    <Input
                      id="tax_id"
                      value={billingDetails.tax_id}
                      onChange={(e) => setBillingDetails({ ...billingDetails, tax_id: e.target.value })}
                      placeholder="000.000.000-00 ou 00.000.000/0000-00"
                      required
                    />
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Área de Confirmação Final */}
          <Card className="p-6 bg-green-50 border-2 border-green-500">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-green-900 mb-2">
                  {isDowngrade(selectedPlan.planId) ? "Confirmar Downgrade" : "Confirmar Contratação"}
                </h3>
                <p className="text-green-700 text-sm">
                  Você está alterando para o plano{" "}
                  <strong className="capitalize">{PLANS[selectedPlan.planId].name}</strong> (
                  {selectedPlan.billingCycle === "monthly" ? "Mensal" : selectedPlan.billingCycle === "semiannual" ? "Semestral" : "Anual"}) via{" "}
                  <strong>{paymentMethod === "credit_card" ? "Cartão de Crédito" : paymentMethod === "pix" ? "PIX" : "Boleto"}</strong>.
                  {isDowngrade(selectedPlan.planId)
                    ? " A mudança será efetivada no próximo período de cobrança."
                    : paymentMethod === "credit_card"
                    ? " A mudança será aplicada imediatamente."
                    : " Você receberá as instruções de pagamento."}
                </p>
              </div>
              <div className="flex gap-3 ml-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedPlan(null);
                    setPaymentMethod("credit_card");
                    setBillingDetails({ name: "", email: "", tax_id: "" });
                  }}
                  disabled={isProcessing}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmChange}
                  disabled={isProcessing}
                  className="gap-2"
                >
                  {isProcessing ? "Processando..." : "Confirmar"}
                  {!isProcessing && <ArrowRight className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* 🔥 MODAIS PIX/BOLETO */}
      {showPixModal && pixData && (
        <PixPaymentModal
          isOpen={showPixModal}
          onClose={() => {
            setShowPixModal(false);
            setPixData(null);
            setSelectedPlan(null);
          }}
          pixQrCode={pixData.pixQrCode}
          pixQrCodeUrl={pixData.pixQrCodeUrl}
          amount={pixData.amount}
          expiresAt={pixData.expiresAt}
          paymentIntentId={pixData.paymentIntentId}
          planName={pixData.planName}
          billingCycle={pixData.billingCycle}
        />
      )}

      {showBoletoModal && boletoData && (
        <BoletoPaymentModal
          isOpen={showBoletoModal}
          onClose={() => {
            setShowBoletoModal(false);
            setBoletoData(null);
            setSelectedPlan(null);
          }}
          boletoNumber={boletoData.boletoNumber}
          boletoUrl={boletoData.boletoUrl}
          boletoBarcode={boletoData.boletoBarcode}
          amount={boletoData.amount}
          expiresAt={boletoData.expiresAt}
          paymentIntentId={boletoData.paymentIntentId}
          planName={boletoData.planName}
          billingCycle={boletoData.billingCycle}
        />
      )}
    </div>
  );
}