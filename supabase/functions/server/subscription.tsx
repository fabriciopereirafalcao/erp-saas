/* =========================================================================
 * ROTAS - GESTÃO DE ASSINATURAS
 * ========================================================================= */

import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const app = new Hono();

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

/* =========================================================================
 * UTILITÁRIOS
 * ========================================================================= */

/**
 * Gera ID único para assinatura
 */
function generateSubscriptionId(): string {
  return `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Gera ID único para fatura
 */
function generateInvoiceId(): string {
  return `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Calcula data de fim do trial (14 dias)
 */
function calculateTrialEndDate(startDate: Date): string {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 14);
  return endDate.toISOString();
}

/**
 * Calcula data de fim do período (mensal ou anual)
 */
function calculatePeriodEnd(startDate: Date, billingCycle: 'monthly' | 'yearly'): string {
  const endDate = new Date(startDate);
  
  if (billingCycle === 'monthly') {
    endDate.setMonth(endDate.getMonth() + 1);
  } else {
    endDate.setFullYear(endDate.getFullYear() + 1);
  }
  
  return endDate.toISOString();
}

/* =========================================================================
 * ROTA: GET /subscription/current
 * Retorna assinatura atual do usuário autenticado
 * ========================================================================= */

app.get("/current", async (c) => {
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

    // Buscar assinatura
    const subscriptionKey = `subscription:${user.id}`;
    const subscription = await kv.get(subscriptionKey);

    if (!subscription) {
      // Criar assinatura trial automática se não existir
      const now = new Date();
      const newSubscription = {
        id: generateSubscriptionId(),
        userId: user.id,
        planId: "ilimitado",         // Trial usa plano ILIMITADO
        status: "trial",
        billingCycle: "monthly",
        trialStartDate: now.toISOString(),
        trialEndDate: calculateTrialEndDate(now),
        startDate: now.toISOString(),
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: calculateTrialEndDate(now),
        amount: 0,
        currency: "BRL",
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

      await kv.set(subscriptionKey, newSubscription);
      
      return c.json({
        success: true,
        data: newSubscription,
        message: "Trial de 14 dias iniciado - Plano Ilimitado",
      });
    }

    return c.json({ success: true, data: subscription });
  } catch (error) {
    console.error("Erro ao buscar assinatura:", error);
    return c.json(
      {
        success: false,
        error: `Erro ao buscar assinatura: ${error instanceof Error ? error.message : String(error)}`,
      },
      500
    );
  }
});

/* =========================================================================
 * ROTA: POST /subscription/upgrade
 * Faz upgrade do plano
 * Body: { planId, billingCycle }
 * ========================================================================= */

app.post("/upgrade", async (c) => {
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

    const body = await c.req.json();
    const { planId, billingCycle = 'monthly' } = body;

    if (!planId) {
      return c.json({ success: false, error: "planId é obrigatório" }, 400);
    }

    // Buscar assinatura atual
    const subscriptionKey = `subscription:${user.id}`;
    const currentSubscription = await kv.get(subscriptionKey);

    if (!currentSubscription) {
      return c.json({ success: false, error: "Assinatura não encontrada" }, 404);
    }

    // Atualizar assinatura
    const now = new Date();
    const updatedSubscription = {
      ...currentSubscription,
      planId,
      billingCycle,
      status: "active",
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: calculatePeriodEnd(now, billingCycle),
      updatedAt: now.toISOString(),
    };

    await kv.set(subscriptionKey, updatedSubscription);

    // Registrar mudança de plano
    const changeId = `plan_change_${Date.now()}`;
    const planChange = {
      id: changeId,
      subscriptionId: currentSubscription.id,
      userId: user.id,
      fromPlan: currentSubscription.planId,
      toPlan: planId,
      type: planId > currentSubscription.planId ? "upgrade" : "downgrade",
      effectiveDate: now.toISOString(),
      createdAt: now.toISOString(),
    };

    await kv.set(`plan_change:${changeId}`, planChange);

    return c.json({
      success: true,
      data: updatedSubscription,
      message: `Plano atualizado para ${planId} com sucesso`,
    });
  } catch (error) {
    console.error("Erro ao fazer upgrade:", error);
    return c.json(
      {
        success: false,
        error: `Erro ao fazer upgrade: ${error instanceof Error ? error.message : String(error)}`,
      },
      500
    );
  }
});

/* =========================================================================
 * ROTA: POST /subscription/increment-usage
 * Incrementa contador de uso
 * Body: { feature: 'salesOrders' | 'purchaseOrders' | 'invoices' | 'transactions', count: 1 }
 * ========================================================================= */

app.post("/increment-usage", async (c) => {
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

    const body = await c.req.json();
    const { feature, count = 1 } = body;

    if (!feature) {
      return c.json({ success: false, error: "feature é obrigatório" }, 400);
    }

    // Buscar assinatura
    const subscriptionKey = `subscription:${user.id}`;
    const subscription = await kv.get(subscriptionKey);

    if (!subscription) {
      return c.json({ success: false, error: "Assinatura não encontrada" }, 404);
    }

    // Incrementar uso
    subscription.usage[feature] = (subscription.usage[feature] || 0) + count;
    subscription.updatedAt = new Date().toISOString();

    await kv.set(subscriptionKey, subscription);

    return c.json({
      success: true,
      data: subscription,
      message: `Uso de ${feature} incrementado`,
    });
  } catch (error) {
    console.error("Erro ao incrementar uso:", error);
    return c.json(
      {
        success: false,
        error: `Erro ao incrementar uso: ${error instanceof Error ? error.message : String(error)}`,
      },
      500
    );
  }
});

/* =========================================================================
 * ROTA: POST /subscription/reset-usage
 * Reseta contadores mensais (chamado por cron job)
 * ========================================================================= */

app.post("/reset-usage", async (c) => {
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

    // Buscar assinatura
    const subscriptionKey = `subscription:${user.id}`;
    const subscription = await kv.get(subscriptionKey);

    if (!subscription) {
      return c.json({ success: false, error: "Assinatura não encontrada" }, 404);
    }

    // Resetar contadores
    subscription.usage = {
      salesOrders: 0,
      purchaseOrders: 0,
      invoices: 0,
      transactions: 0,
      storageMB: subscription.usage.storageMB || 0, // Storage não reseta
    };
    subscription.updatedAt = new Date().toISOString();

    await kv.set(subscriptionKey, subscription);

    return c.json({
      success: true,
      data: subscription,
      message: "Contadores de uso resetados",
    });
  } catch (error) {
    console.error("Erro ao resetar uso:", error);
    return c.json(
      {
        success: false,
        error: `Erro ao resetar uso: ${error instanceof Error ? error.message : String(error)}`,
      },
      500
    );
  }
});

/* =========================================================================
 * ROTA: GET /subscription/invoices
 * Lista faturas do usuário
 * ========================================================================= */

app.get("/invoices", async (c) => {
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

    // Buscar faturas
    const invoices = await kv.getByPrefix(`invoice:${user.id}:`);

    return c.json({ success: true, data: invoices || [] });
  } catch (error) {
    console.error("Erro ao listar faturas:", error);
    return c.json(
      {
        success: false,
        error: `Erro ao listar faturas: ${error instanceof Error ? error.message : String(error)}`,
      },
      500
    );
  }
});

export default app;