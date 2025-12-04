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
    
    // 🎯 LÓGICA CORRETA DE UPGRADE:
    // - Se JÁ tem assinatura PAGA (status "active") do Stripe → Usar subscriptions.update() com proration
    // - Se está em TRIAL (status "trial") ou primeira vez → Criar checkout session SEM proration
    // - IMPORTANTE: Trial é GRÁTIS, NÃO pode ter crédito proporcional!
    
    const isPaidSubscription = 
      currentSubscription?.stripeSubscriptionId && 
      currentSubscription.status === "active" &&
      currentSubscription.status !== "trial"; // ← NÃO considerar trial como paga!
    
    const isTrialSubscription = 
      currentSubscription?.status === "trial";
    
    console.log(`🔍 [DEBUG] isPaidSubscription: ${isPaidSubscription}, isTrialSubscription: ${isTrialSubscription}`);
    
    if (isPaidSubscription && !isTrialSubscription) {
      console.log(`🔄 [STRIPE] Upgrade via API com proration automática (assinatura PAGA)`);
      
      try {
        // Obter assinatura atual do Stripe
        const stripeSubscription = await stripe.subscriptions.retrieve(currentSubscription.stripeSubscriptionId);
        
        // Obter ID do novo preço
        const newPriceId = PRICE_CONFIG[planId]?.[billingCycle];
        
        if (!newPriceId) {
          return c.json({ 
            success: false, 
            error: "Configuração de preço não encontrada." 
          }, 400);
        }
        
        console.log(`💰 [STRIPE] Atualizando de ${stripeSubscription.items.data[0].price.id} para ${newPriceId}`);
        
        // ✅ ATUALIZAR assinatura com proration automática
        const updatedSubscription = await stripe.subscriptions.update(
          currentSubscription.stripeSubscriptionId,
          {
            items: [
              {
                id: stripeSubscription.items.data[0].id,
                price: newPriceId,
              },
            ],
            proration_behavior: "create_prorations", // Cria prorations automáticas
            billing_cycle_anchor: "now", // Reinicia ciclo de cobrança
            metadata: {
              userId: user.id,
              planId,
              billingCycle,
            },
          }
        );
        
        console.log(`✅ [STRIPE] Assinatura atualizada. Nova period_end: ${new Date(updatedSubscription.current_period_end * 1000).toISOString()}`);
        
        // Atualizar no KV store
        currentSubscription.planId = planId;
        currentSubscription.billingCycle = billingCycle;
        currentSubscription.currentPeriodStart = new Date(updatedSubscription.current_period_start * 1000).toISOString();
        currentSubscription.currentPeriodEnd = new Date(updatedSubscription.current_period_end * 1000).toISOString();
        currentSubscription.updatedAt = new Date().toISOString();
        
        await kv.set(subscriptionKey, currentSubscription);
        
        console.log(`💾 [KV] Subscription atualizada no KV store`);
        
        // 🎯 O Stripe criou uma invoice proporcional automaticamente
        // Retornar sucesso sem redirect (foi processado via API)
        return c.json({
          success: true,
          upgraded: true,
          requiresPayment: true, // Cliente receberá invoice por email
          message: "Plano atualizado! O valor proporcional será cobrado automaticamente.",
        });
        
      } catch (error) {
        console.error("❌ Erro ao atualizar assinatura:", error);
        return c.json({ 
          success: false, 
          error: `Erro ao processar upgrade: ${error.message}` 
        }, 500);
      }
    }
    
    // Se não tem assinatura ativa, criar checkout session normal
    console.log("💳 [STRIPE] Criando checkout session (primeira assinatura ou trial)");

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
      payment_method_types: ["card", "boleto"],
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

      // 🔥 NOVO: Payment Intent succeeded (PIX/Boleto confirmado)
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent);
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
 * ROTA: POST /create-pix-payment
 * Cria pagamento PIX (não recorrente) via Stripe
 * ========================================================================= */

app.post("/create-pix-payment", async (c) => {
  try {
    console.log('[STRIPE] 🔷 Iniciando criação de pagamento PIX...');
    
    // Autenticação
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (!user || authError) {
      console.error('[STRIPE] ❌ Erro de autenticação:', authError);
      return c.json({ success: false, error: "Não autenticado" }, 401);
    }

    // Obter dados
    const { planId, billingCycle } = await c.req.json();
    console.log(`[STRIPE] 📦 Dados recebidos: planId=${planId}, billingCycle=${billingCycle}`);

    // Validações
    if (!["basico", "intermediario", "avancado", "ilimitado"].includes(planId)) {
      return c.json({ success: false, error: "Plano inválido" }, 400);
    }

    if (!["monthly", "semiannual", "yearly"].includes(billingCycle)) {
      return c.json({ success: false, error: "Ciclo inválido" }, 400);
    }

    // Calcular valor
    const PLAN_PRICES = {
      basico: { monthly: 39.90, semiannual: 215.46, yearly: 383.04 },
      intermediario: { monthly: 79.90, semiannual: 431.46, yearly: 767.04 },
      avancado: { monthly: 129.90, semiannual: 701.46, yearly: 1247.04 },
      ilimitado: { monthly: 249.90, semiannual: 1349.46, yearly: 2399.04 },
    };

    const amount = PLAN_PRICES[planId][billingCycle];
    const amountInCents = Math.round(amount * 100);
    console.log(`[STRIPE] 💰 Valor: R$ ${amount} (${amountInCents} cents)`);

    // Buscar ou criar Stripe Customer
    const subscriptionKey = `subscription:${user.id}`;
    const currentSubscription = await kv.get(subscriptionKey);
    
    let stripeCustomerId = currentSubscription?.stripeCustomerId;

    if (!stripeCustomerId) {
      console.log('[STRIPE] 👤 Criando novo Stripe Customer...');
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      stripeCustomerId = customer.id;
      console.log(`[STRIPE] ✅ Customer criado: ${stripeCustomerId}`);
    }

    // 🔥 CRIAR PAYMENT INTENT COM PIX
    console.log('[STRIPE] 🔷 Criando Payment Intent PIX...');
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "brl",
      customer: stripeCustomerId,
      payment_method_types: ["pix"],
      metadata: {
        userId: user.id,
        planId,
        billingCycle,
        paymentType: "pix",
      },
      description: `Plano ${planId} - ${billingCycle === "monthly" ? "Mensal" : billingCycle === "semiannual" ? "Semestral" : "Anual"}`,
    });

    console.log(`[STRIPE] ✅ Payment Intent criado: ${paymentIntent.id}`);

    // 🔥 OBTER DADOS PIX
    const pixData = paymentIntent.next_action?.pix_display_qr_code;

    if (!pixData) {
      console.error('[STRIPE] ❌ Falha ao gerar QR Code PIX');
      throw new Error("Falha ao gerar QR Code PIX");
    }

    console.log('[STRIPE] 🎯 QR Code PIX gerado com sucesso');
    console.log(`[STRIPE] ⏰ Expira em: ${new Date((pixData.expires_at || 0) * 1000).toISOString()}`);

    return c.json({
      success: true,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      pixQrCode: pixData.data,           // Código PIX (string)
      pixQrCodeUrl: pixData.hosted_url,  // URL da imagem do QR Code
      amount: amount,
      expiresAt: pixData.expires_at,     // Timestamp de expiração (24h)
    });

  } catch (error: any) {
    console.error("[STRIPE] ❌ Erro ao criar pagamento PIX:", error);
    return c.json({
      success: false,
      error: error.message || "Erro ao processar pagamento PIX",
    }, 500);
  }
});

/* =========================================================================
 * ROTA: POST /create-boleto-payment
 * Cria pagamento via Boleto (não recorrente) via Stripe
 * ========================================================================= */

app.post("/create-boleto-payment", async (c) => {
  try {
    console.log('[STRIPE] 📄 Iniciando criação de boleto...');
    
    // Autenticação
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (!user || authError) {
      console.error('[STRIPE] ❌ Erro de autenticação:', authError);
      return c.json({ success: false, error: "Não autenticado" }, 401);
    }

    // Obter dados (incluindo dados de cobrança para boleto)
    const { planId, billingCycle, billingDetails } = await c.req.json();
    console.log(`[STRIPE] 📦 Dados recebidos: planId=${planId}, billingCycle=${billingCycle}`);

    // Validações
    if (!["basico", "intermediario", "avancado", "ilimitado"].includes(planId)) {
      return c.json({ success: false, error: "Plano inválido" }, 400);
    }

    if (!["monthly", "semiannual", "yearly"].includes(billingCycle)) {
      return c.json({ success: false, error: "Ciclo inválido" }, 400);
    }

    // Validar dados de cobrança (obrigatórios para boleto)
    if (!billingDetails?.name || !billingDetails?.email || !billingDetails?.tax_id) {
      return c.json({ 
        success: false, 
        error: "Dados de cobrança incompletos. Nome, email e CPF/CNPJ são obrigatórios para boleto." 
      }, 400);
    }

    // Calcular valor
    const PLAN_PRICES = {
      basico: { monthly: 39.90, semiannual: 215.46, yearly: 383.04 },
      intermediario: { monthly: 79.90, semiannual: 431.46, yearly: 767.04 },
      avancado: { monthly: 129.90, semiannual: 701.46, yearly: 1247.04 },
      ilimitado: { monthly: 249.90, semiannual: 1349.46, yearly: 2399.04 },
    };

    const amount = PLAN_PRICES[planId][billingCycle];
    const amountInCents = Math.round(amount * 100);
    console.log(`[STRIPE] 💰 Valor: R$ ${amount} (${amountInCents} cents)`);

    // Buscar ou criar Stripe Customer
    const subscriptionKey = `subscription:${user.id}`;
    const currentSubscription = await kv.get(subscriptionKey);
    
    let stripeCustomerId = currentSubscription?.stripeCustomerId;

    if (!stripeCustomerId) {
      console.log('[STRIPE] 👤 Criando novo Stripe Customer...');
      const customer = await stripe.customers.create({
        email: user.email,
        name: billingDetails.name,
        metadata: { 
          userId: user.id,
          tax_id: billingDetails.tax_id,
        },
      });
      stripeCustomerId = customer.id;
      console.log(`[STRIPE] ✅ Customer criado: ${stripeCustomerId}`);
    }

    // 🔥 CRIAR PAYMENT INTENT COM BOLETO
    console.log('[STRIPE] 📄 Criando Payment Intent Boleto...');
    console.log('[STRIPE] 🔍 Debug - Dados enviados:', {
      amount: amountInCents,
      customer: stripeCustomerId,
      tax_id_clean: billingDetails.tax_id.replace(/\D/g, ''),
      name: billingDetails.name,
      email: billingDetails.email,
    });
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "brl",
      customer: stripeCustomerId,
      payment_method_types: ["boleto"],
      payment_method_options: {
        boleto: {
          expires_after_days: 3, // Boleto expira em 3 dias
        },
      },
      payment_method_data: {
        type: 'boleto',
        billing_details: {
          name: billingDetails.name,
          email: billingDetails.email,
          address: {
            line1: billingDetails.address?.line1 || 'Rua Exemplo, 123',
            line2: billingDetails.address?.line2 || null,
            city: billingDetails.address?.city || 'São Paulo',
            state: billingDetails.address?.state || 'SP',
            postal_code: billingDetails.address?.postal_code || '01310-100',
            country: 'BR',
          },
        },
        boleto: {
          tax_id: billingDetails.tax_id.replace(/\D/g, ''), // ← CPF/CNPJ apenas números
        },
      },
      confirm: true, // ← CRÍTICO: Confirmar imediatamente para gerar boleto
      metadata: {
        userId: user.id,
        planId,
        billingCycle,
        paymentType: "boleto",
      },
      description: `Plano ${planId} - ${billingCycle === "monthly" ? "Mensal" : billingCycle === "semiannual" ? "Semestral" : "Anual"}`,
    });

    console.log(`[STRIPE] ✅ Payment Intent criado: ${paymentIntent.id}`);

    // 🔥 OBTER DADOS DO BOLETO
    const boletoData = paymentIntent.next_action?.boleto_display_details;

    if (!boletoData) {
      console.error('[STRIPE] ❌ Falha ao gerar boleto');
      throw new Error("Falha ao gerar boleto");
    }

    console.log('[STRIPE] 🎯 Boleto gerado com sucesso');
    console.log(`[STRIPE] ⏰ Expira em: ${new Date((boletoData.expires_at || 0) * 1000).toISOString()}`);

    return c.json({
      success: true,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      boletoNumber: boletoData.number,
      boletoUrl: boletoData.pdf,          // URL do PDF do boleto
      boletoBarcode: boletoData.number,   // Código de barras
      amount: amount,
      expiresAt: boletoData.expires_at,   // Timestamp de expiração (3 dias)
    });

  } catch (error: any) {
    console.error("[STRIPE] ❌ Erro ao criar boleto:", error);
    
    // 🔍 LOG DETALHADO DO ERRO
    if (error.type === 'StripeInvalidRequestError') {
      console.error('[STRIPE] ❌ Stripe Invalid Request Error:');
      console.error('  - Message:', error.message);
      console.error('  - Code:', error.code);
      console.error('  - Param:', error.param);
      console.error('  - Type:', error.type);
    }
    
    return c.json({
      success: false,
      error: error.message || "Erro ao processar boleto",
      details: {
        type: error.type,
        code: error.code,
        param: error.param,
      }
    }, 500);
  }
});

/* =========================================================================
 * ROTA: POST /check-payment-status
 * Verifica status de um payment intent
 * ========================================================================= */

app.post("/check-payment-status", async (c) => {
  try {
    const { paymentIntentId } = await c.req.json();

    if (!paymentIntentId) {
      return c.json({ success: false, error: "Payment Intent ID obrigatório" }, 400);
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    return c.json({
      success: true,
      status: paymentIntent.status, // 'succeeded', 'pending', 'failed', 'canceled'
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
    });

  } catch (error: any) {
    console.error("[STRIPE] Erro ao verificar status:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/* =========================================================================
 * WEBHOOK HANDLER: payment_intent.succeeded
 * Processa pagamento confirmado via PIX ou Boleto
 * ========================================================================= */

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    // Verificar se é pagamento PIX ou Boleto
    const paymentType = paymentIntent.metadata?.paymentType;
    
    if (!paymentType || !["pix", "boleto"].includes(paymentType)) {
      console.log(`⚠️ [WEBHOOK] Payment Intent ignorado (não é PIX/Boleto): ${paymentIntent.id}`);
      return;
    }
    
    console.log(`✅ [WEBHOOK] ${paymentType.toUpperCase()} confirmado: ${paymentIntent.id}`);
    
    const userId = paymentIntent.metadata.userId;
    const planId = paymentIntent.metadata.planId;
    const billingCycle = paymentIntent.metadata.billingCycle;
    
    if (!userId || !planId || !billingCycle) {
      console.error("[WEBHOOK] Metadata incompleto no payment intent");
      return;
    }
    
    // Calcular datas do período
    const now = new Date();
    const periodEnd = new Date(now);
    
    if (billingCycle === "monthly") {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else if (billingCycle === "semiannual") {
      periodEnd.setMonth(periodEnd.getMonth() + 6);
    } else if (billingCycle === "yearly") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }
    
    console.log(`📅 [WEBHOOK] Período: ${now.toISOString()} até ${periodEnd.toISOString()}`);
    
    // 🔥 CRIAR/ATUALIZAR SUBSCRIPTION NO KV
    const subscriptionKey = `subscription:${userId}`;
    
    const subscription = {
      id: `sub_${userId}_${Date.now()}`,
      userId,
      planId,
      status: "active",
      billingCycle,
      paymentMethod: paymentType, // "pix" ou "boleto"
      isRecurring: false, // ← Não renovação automática!
      startDate: now.toISOString(),
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      stripeCustomerId: paymentIntent.customer as string,
      stripePaymentIntentId: paymentIntent.id,
      stripeSubscriptionId: null, // ← NULL para PIX/Boleto
      usage: {
        salesOrders: 0,
        purchaseOrders: 0,
        invoices: 0,
        transactions: 0,
        storageMB: 0,
      },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    
    await kv.set(subscriptionKey, subscription);
    
    console.log(`💾 [KV] Subscription ${paymentType.toUpperCase()} criada/atualizada para userId: ${userId}`);
    console.log(`🎯 [KV] Plano ${planId} ativo até ${periodEnd.toLocaleDateString('pt-BR')}`);
    
    // TODO: Enviar email de confirmação de pagamento
    
  } catch (error) {
    console.error("❌ [WEBHOOK] Erro ao processar payment_intent.succeeded:", error);
  }
}

export default app;