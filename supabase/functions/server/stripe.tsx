/* =========================================================================
 * STRIPE ROUTES - Gateway de Pagamento
 * ========================================================================= */

import { Hono } from "npm:hono@4";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";
import * as kv from "./kv_store.tsx";

// Criar app Hono para rotas do Stripe
const app = new Hono();

console.log('[STRIPE] 🔧 Módulo Stripe iniciando...');
console.log('[STRIPE] 🔑 STRIPE_SECRET_KEY configurado:', !!Deno.env.get("STRIPE_SECRET_KEY"));
console.log('[STRIPE] 🔐 STRIPE_WEBHOOK_SECRET configurado:', !!Deno.env.get("STRIPE_WEBHOOK_SECRET"));

// Cliente Supabase
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Cliente Stripe
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-11-20.acacia",
});

// Configuração de preços (BRL) - IDs reais do Stripe Dashboard
const PRICE_CONFIG = {
  basico: {
    monthly: "price_1Sa6SqRyrexM1yHBRXPxDyo3",
    semiannual: "price_1Sa6SqRyrexM1yHB5Omvn8F9",
    yearly: "price_1Sa6SqRyrexM1yHBA06baOgZ",
  },
  intermediario: {
    monthly: "price_1Sa6U0RyrexM1yHBaTbjtcwA",
    semiannual: "price_1Sa6WGRyrexM1yHBP5vVWStp",
    yearly: "price_1Sa6WGRyrexM1yHBzp6j660N",
  },
  avancado: {
    monthly: "price_1Sa6WnRyrexM1yHBEzgDLFPK",
    semiannual: "price_1Sa6YXRyrexM1yHBNqQltgjN",
    yearly: "price_1Sa6YXRyrexM1yHBJemzgpwt",
  },
  ilimitado: {
    monthly: "price_1Sa6ZCRyrexM1yHBKAj1KJOi",
    semiannual: "price_1Sa6brRyrexM1yHBG5lIFLKT",
    yearly: "price_1Sa6brRyrexM1yHBynXXCukW",
  },
};

/* =========================================================================
 * ROTA: GET /health (Health Check / Test)
 * Verifica se o módulo Stripe está funcionando
 * ========================================================================= */

app.get("/health", async (c) => {
  return c.json({
    status: "ok",
    message: "Stripe module is running",
    timestamp: new Date().toISOString(),
    routes: [
      "POST /create-checkout-session",
      "POST /create-portal-session",
      "POST /webhook",
      "GET /payment-methods",
      "GET /health"
    ]
  });
});

/* =========================================================================
 * ROTA: POST /create-checkout-session
 * Cria sessão de checkout do Stripe para upgrade de plano
 * ========================================================================= */

app.post("/create-checkout-session", async (c) => {
  try {
    // Autenticação
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (!user || authError) {
      return c.json({ success: false, error: "Não autenticado" }, 401);
    }

    // Obter dados do body
    const { planId, billingCycle, frontendUrl } = await c.req.json();

    // Validações
    if (!["basico", "intermediario", "avancado", "ilimitado"].includes(planId)) {
      return c.json({ success: false, error: "Plano inválido" }, 400);
    }

    if (!["monthly", "semiannual", "yearly"].includes(billingCycle)) {
      return c.json({ success: false, error: "Ciclo de cobrança inválido" }, 400);
    }

    // 🔍 VERIFICAR SE JÁ EXISTE ASSINATURA ATIVA
    const subscriptionKey = `subscription:${user.id}`;
    const currentSubscription = await kv.get(subscriptionKey);
    
    // 🔍 DEBUG: Logs detalhados
    console.log("🔍 [DEBUG] Verificando assinatura existente:");
    console.log("  - UserId:", user.id);
    console.log("  - Subscription key:", subscriptionKey);
    console.log("  - Current subscription:", JSON.stringify(currentSubscription, null, 2));
    console.log("  - Has stripeSubscriptionId:", !!currentSubscription?.stripeSubscriptionId);
    console.log("  - Status:", currentSubscription?.status);
    
    // 🔧 FIX: SEMPRE criar checkout session (mesmo para upgrades)
    // O Stripe vai calcular automaticamente o crédito proporcional
    console.log("💳 [STRIPE] Criando checkout session para upgrade/nova assinatura");

    // Buscar ou criar cliente Stripe
    let stripeCustomerId: string;
    
    // Verificar se já existe customer_id salvo
    const customerData = await kv.get(`stripe_customer:${user.id}`);
    
    if (customerData) {
      stripeCustomerId = customerData;
    } else {
      // Buscar email do usuário
      const { data: userData } = await supabase
        .from("users")
        .select("email, name")
        .eq("id", user.id)
        .single();

      // Criar novo cliente no Stripe
      const customer = await stripe.customers.create({
        email: userData?.email || user.email,
        name: userData?.name,
        metadata: {
          userId: user.id,
        },
      });

      stripeCustomerId = customer.id;
      
      // Salvar customer_id para uso futuro
      await kv.set(`stripe_customer:${user.id}`, stripeCustomerId);
    }

    // Obter ID do preço correto
    const priceId = PRICE_CONFIG[planId]?.[billingCycle];
    
    if (!priceId) {
      console.error(`⚠️ Price ID não encontrado para ${planId} - ${billingCycle}`);
      return c.json({ 
        success: false, 
        error: "Configuração de preço não encontrada. Configure os preços no Stripe Dashboard." 
      }, 400);
    }

    // Criar sessão de checkout (para primeira assinatura ou trial)
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${frontendUrl}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}?checkout=cancel`,
      metadata: {
        userId: user.id,
        planId,
        billingCycle,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          planId,
          billingCycle,
        },
      },
    });

    console.log(`✅ [STRIPE] Sessão de checkout criada: ${session.id} (Usuário: ${user.id}, Plano: ${planId})`);

    return c.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("❌ [STRIPE] Erro ao criar checkout session:", error);
    return c.json(
      {
        success: false,
        error: `Erro ao criar sessão de checkout: ${error instanceof Error ? error.message : String(error)}`,
      },
      500
    );
  }
});

/* =========================================================================
 * ROTA: POST /create-portal-session
 * Cria sessão do Customer Portal do Stripe
 * ========================================================================= */

app.post("/create-portal-session", async (c) => {
  try {
    // Autenticação
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (!user || authError) {
      return c.json({ success: false, error: "Não autenticado" }, 401);
    }

    // Buscar customer_id
    const customerData = await kv.get(`stripe_customer:${user.id}`);
    
    if (!customerData) {
      return c.json({ 
        success: false, 
        error: "Cliente Stripe não encontrado. Faça um upgrade primeiro." 
      }, 404);
    }

    // URL base para retorno
    const baseUrl = c.req.url.split('/functions')[0];

    // Criar sessão do portal
    const session = await stripe.billingPortal.sessions.create({
      customer: customerData,
      return_url: baseUrl,
    });

    console.log(`✅ [STRIPE] Portal session criada para usuário: ${user.id}`);

    return c.json({
      success: true,
      data: {
        url: session.url,
      },
    });
  } catch (error) {
    console.error("❌ [STRIPE] Erro ao criar portal session:", error);
    return c.json(
      {
        success: false,
        error: `Erro ao criar portal session: ${error instanceof Error ? error.message : String(error)}`,
      },
      500
    );
  }
});

/* =========================================================================
 * ROTA: GET /webhook (Test endpoint)
 * Verifica se o webhook está acessível
 * ========================================================================= */

app.get("/webhook", async (c) => {
  return c.json({
    status: "ok",
    message: "Webhook endpoint is accessible",
    method: "GET",
    note: "Stripe will POST events to this endpoint",
    webhook_secret_configured: !!Deno.env.get("STRIPE_WEBHOOK_SECRET"),
    timestamp: new Date().toISOString()
  });
});

/* =========================================================================
 * ROTA: POST /webhook
 * Recebe eventos do Stripe (webhooks)
 * ========================================================================= */

app.post("/webhook", async (c) => {
  try {
    const body = await c.req.text();
    const signature = c.req.header("stripe-signature");

    if (!signature) {
      console.error("❌ [STRIPE WEBHOOK] Assinatura não encontrada");
      return c.json({ error: "Assinatura ausente" }, 400);
    }

    // Verificar assinatura do webhook
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    // 🔍 LOG DETALHADO PARA DEBUG
    console.log("🔐 [STRIPE WEBHOOK] Debug da assinatura:");
    console.log("  - Webhook Secret configurado:", webhookSecret ? `${webhookSecret.substring(0, 10)}...` : "NÃO CONFIGURADO");
    console.log("  - Signature recebida:", signature.substring(0, 50) + "...");
    console.log("  - Body length:", body.length);
    
    let event: Stripe.Event;

    if (webhookSecret) {
      try {
        // 🔧 FIX: Usar constructEventAsync para ambiente Deno/Edge Runtime
        event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
        console.log("✅ [STRIPE WEBHOOK] Assinatura validada com sucesso!");
      } catch (err) {
        console.error("❌ [STRIPE WEBHOOK] Erro de verificação:", err);
        console.error("❌ [STRIPE WEBHOOK] Mensagem do erro:", err instanceof Error ? err.message : String(err));
        return c.json({ error: "Assinatura inválida" }, 400);
      }
    } else {
      // Modo desenvolvimento: aceitar sem verificação
      console.log("⚠️ [STRIPE WEBHOOK] WEBHOOK_SECRET não configurado - aceitando sem verificação");
      event = JSON.parse(body);
    }

    console.log(`📥 [STRIPE WEBHOOK] Evento recebido: ${event.type}`);

    // Processar eventos
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`⚠️ [STRIPE WEBHOOK] Evento não tratado: ${event.type}`);
    }

    return c.json({ received: true });
  } catch (error) {
    console.error("❌ [STRIPE WEBHOOK] Erro ao processar:", error);
    return c.json(
      {
        error: `Erro ao processar webhook: ${error instanceof Error ? error.message : String(error)}`,
      },
      500
    );
  }
});

/* =========================================================================
 * ROTA: GET /payment-methods
 * Lista métodos de pagamento do cliente
 * ========================================================================= */

app.get("/payment-methods", async (c) => {
  try {
    // Autenticação
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (!user || authError) {
      return c.json({ success: false, error: "Não autenticado" }, 401);
    }

    // Buscar customer_id
    const customerData = await kv.get(`stripe_customer:${user.id}`);
    
    if (!customerData) {
      return c.json({ 
        success: true, 
        data: { paymentMethods: [] } 
      });
    }

    // Buscar métodos de pagamento
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerData,
      type: "card",
    });

    return c.json({
      success: true,
      data: {
        paymentMethods: paymentMethods.data.map((pm) => ({
          id: pm.id,
          brand: pm.card?.brand,
          last4: pm.card?.last4,
          expMonth: pm.card?.exp_month,
          expYear: pm.card?.exp_year,
        })),
      },
    });
  } catch (error) {
    console.error("❌ [STRIPE] Erro ao listar payment methods:", error);
    return c.json(
      {
        success: false,
        error: `Erro ao listar métodos de pagamento: ${error instanceof Error ? error.message : String(error)}`,
      },
      500
    );
  }
});

/* =========================================================================
 * WEBHOOK HANDLERS
 * ========================================================================= */

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  try {
    const userId = session.metadata?.userId;
    const planId = session.metadata?.planId;
    const billingCycle = session.metadata?.billingCycle;

    if (!userId || !planId || !billingCycle) {
      console.error("❌ Metadata ausente no checkout session");
      return;
    }

    console.log(`✅ [WEBHOOK] Checkout completado - Usuário: ${userId}, Plano: ${planId}`);

    // Buscar assinatura do Stripe
    const subscriptionId = session.subscription as string;
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Atualizar assinatura no KV store
    const subscriptionKey = `subscription:${userId}`;
    const subscription = await kv.get(subscriptionKey);

    if (subscription) {
      subscription.planId = planId;
      subscription.billingCycle = billingCycle;
      subscription.status = "active";
      subscription.stripeSubscriptionId = subscriptionId;
      subscription.stripeCustomerId = session.customer as string;
      subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000).toISOString();
      subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000).toISOString();
      subscription.updatedAt = new Date().toISOString();

      // Remover trial se existir
      delete subscription.trialEnd;

      await kv.set(subscriptionKey, subscription);
      console.log(`✅ Assinatura atualizada para usuário ${userId}`);
    }
  } catch (error) {
    console.error("❌ Erro ao processar checkout completed:", error);
  }
}

async function handleSubscriptionUpdate(stripeSubscription: Stripe.Subscription) {
  try {
    const userId = stripeSubscription.metadata?.userId;
    
    if (!userId) {
      console.error("❌ userId ausente na subscription");
      return;
    }

    console.log(`🔄 [WEBHOOK] Subscription atualizada - Usuário: ${userId}`);

    const subscriptionKey = `subscription:${userId}`;
    const subscription = await kv.get(subscriptionKey);

    if (subscription) {
      subscription.status = stripeSubscription.status === "active" ? "active" : "past_due";
      
      // 🔧 FIX: Validar timestamps antes de converter
      if (stripeSubscription.current_period_start) {
        subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000).toISOString();
      }
      
      if (stripeSubscription.current_period_end) {
        subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000).toISOString();
      }
      
      subscription.updatedAt = new Date().toISOString();

      await kv.set(subscriptionKey, subscription);
      console.log(`✅ Status da assinatura atualizado: ${subscription.status}`);
    }
  } catch (error) {
    console.error("❌ Erro ao processar subscription update:", error);
  }
}

async function handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
  try {
    const userId = stripeSubscription.metadata?.userId;
    
    if (!userId) {
      console.error("❌ userId ausente na subscription");
      return;
    }

    console.log(`🗑️ [WEBHOOK] Subscription deletada - Usuário: ${userId}`);

    const subscriptionKey = `subscription:${userId}`;
    const subscription = await kv.get(subscriptionKey);

    if (subscription) {
      // Voltar para plano básico gratuito
      subscription.planId = "basico";
      subscription.status = "canceled";
      subscription.updatedAt = new Date().toISOString();
      
      delete subscription.stripeSubscriptionId;

      await kv.set(subscriptionKey, subscription);
      console.log(`✅ Assinatura cancelada - voltou para plano básico`);
    }
  } catch (error) {
    console.error("❌ Erro ao processar subscription deleted:", error);
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    const customerId = invoice.customer as string;
    
    // Buscar userId pelo customerId
    const allCustomers = await kv.getByPrefix("stripe_customer:");
    const userEntry = allCustomers.find((entry: any) => entry.value === customerId);
    
    if (!userEntry) {
      console.error("❌ Cliente não encontrado no KV store");
      return;
    }

    const userId = userEntry.key.replace("stripe_customer:", "");
    
    console.log(`💰 [WEBHOOK] Pagamento bem-sucedido - Usuário: ${userId}, Valor: ${invoice.amount_paid / 100}`);

    // Registrar histórico de pagamento
    const paymentHistory = await kv.get(`payment_history:${userId}`) || [];
    paymentHistory.push({
      invoiceId: invoice.id,
      amount: invoice.amount_paid / 100,
      currency: invoice.currency,
      status: "succeeded",
      paidAt: new Date(invoice.status_transitions.paid_at! * 1000).toISOString(),
    });
    await kv.set(`payment_history:${userId}`, paymentHistory);
  } catch (error) {
    console.error("❌ Erro ao processar payment succeeded:", error);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  try {
    const customerId = invoice.customer as string;
    
    // Buscar userId pelo customerId
    const allCustomers = await kv.getByPrefix("stripe_customer:");
    const userEntry = allCustomers.find((entry: any) => entry.value === customerId);
    
    if (!userEntry) {
      console.error("❌ Cliente não encontrado no KV store");
      return;
    }

    const userId = userEntry.key.replace("stripe_customer:", "");
    
    console.log(`❌ [WEBHOOK] Pagamento falhou - Usuário: ${userId}`);

    // Atualizar status da assinatura
    const subscriptionKey = `subscription:${userId}`;
    const subscription = await kv.get(subscriptionKey);

    if (subscription) {
      subscription.status = "past_due";
      subscription.updatedAt = new Date().toISOString();
      await kv.set(subscriptionKey, subscription);
    }

    // TODO: Enviar email notificando falha de pagamento
  } catch (error) {
    console.error("❌ Erro ao processar payment failed:", error);
  }
}

// Exportar app como default
console.log('[STRIPE] ✅ Módulo Stripe carregado. Rotas disponíveis:');
console.log('[STRIPE]    GET  /health');
console.log('[STRIPE]    POST /create-checkout-session');
console.log('[STRIPE]    POST /create-portal-session');
console.log('[STRIPE]    GET  /webhook (test)');
console.log('[STRIPE]    POST /webhook (production)');
console.log('[STRIPE]    GET  /payment-methods');

export default app;