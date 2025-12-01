/* =========================================================================
 * SUBSCRIPTION ROUTES - Gerenciamento de Assinaturas
 * ========================================================================= */

import { Hono } from "npm:hono@4";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

// Criar app Hono para rotas de subscription
const app = new Hono();

// Cliente Supabase (reutilizar para autenticação)
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

/* =========================================================================
 * ROTA: GET /current
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

    // Buscar assinatura do usuário
    const subscriptionKey = `subscription:${user.id}`;
    const subscription = await kv.get(subscriptionKey);

    if (!subscription) {
      return c.json(
        { success: false, error: "Assinatura não encontrada" },
        404
      );
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
 * ROTA: POST /initialize
 * Cria assinatura padrão para usuários que não têm (REPARAÇÃO)
 * ========================================================================= */

app.post("/initialize", async (c) => {
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

    // Verificar se já existe assinatura
    const subscriptionKey = `subscription:${user.id}`;
    const existingSubscription = await kv.get(subscriptionKey);

    if (existingSubscription) {
      return c.json({
        success: true,
        data: existingSubscription,
        message: "Assinatura já existe",
      });
    }

    // Criar assinatura padrão
    const now = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14); // 14 dias de trial (conforme TRIAL_DURATION_DAYS)

    const defaultSubscription = {
      userId: user.id,
      planId: "ilimitado", // Plano padrão: Ilimitado (para testes completos)
      billingCycle: "monthly",
      status: "trial",
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: trialEnd.toISOString(),
      trialEnd: trialEnd.toISOString(),
      usage: {
        users: 1,
        products: 0,
        customers: 0,
        nfe: 0,
      },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    // Salvar no KV store
    await kv.set(subscriptionKey, defaultSubscription);

    console.log(
      `✅ [REPARAÇÃO] Assinatura criada para usuário ${user.id} - Plano: ${defaultSubscription.planId} (Trial)`
    );

    return c.json({
      success: true,
      data: defaultSubscription,
      message: "Assinatura padrão criada com sucesso",
    });
  } catch (error) {
    console.error("Erro ao inicializar assinatura:", error);
    return c.json(
      {
        success: false,
        error: `Erro ao inicializar assinatura: ${error instanceof Error ? error.message : String(error)}`,
      },
      500
    );
  }
});

/* =========================================================================
 * ROTA: POST /increment-usage
 * Incrementa uso de uma categoria
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

    // Obter dados do body
    const { type, amount = 1 } = await c.req.json();

    // Buscar assinatura
    const subscriptionKey = `subscription:${user.id}`;
    const subscription = await kv.get(subscriptionKey);

    if (!subscription) {
      return c.json(
        { success: false, error: "Assinatura não encontrada" },
        404
      );
    }

    // Mapear tipo para campo de uso
    const usageFieldMap: Record<string, string> = {
      salesOrders: "salesOrders",
      purchaseOrders: "purchaseOrders",
      invoices: "nfe",
      transactions: "transactions",
    };

    const usageField = usageFieldMap[type];
    if (!usageField) {
      return c.json(
        { success: false, error: "Tipo de uso inválido" },
        400
      );
    }

    // Incrementar uso
    subscription.usage[usageField] =
      (subscription.usage[usageField] || 0) + amount;
    subscription.updatedAt = new Date().toISOString();

    // Salvar
    await kv.set(subscriptionKey, subscription);

    return c.json({ success: true, data: subscription });
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
 * ROTA: POST /test/set-plan (MODO DE TESTE)
 * Altera plano para testar funcionalidades
 * ========================================================================= */

app.post("/test/set-plan", async (c) => {
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

    // Obter planId do body
    const { planId } = await c.req.json();

    if (!["basico", "intermediario", "avancado", "ilimitado"].includes(planId)) {
      return c.json({ success: false, error: "Plano inválido" }, 400);
    }

    // Buscar assinatura
    const subscriptionKey = `subscription:${user.id}`;
    const subscription = await kv.get(subscriptionKey);

    if (!subscription) {
      return c.json(
        { success: false, error: "Assinatura não encontrada" },
        404
      );
    }

    // Atualizar plano (modo de teste)
    subscription.planId = planId;
    subscription.updatedAt = new Date().toISOString();

    // Salvar
    await kv.set(subscriptionKey, subscription);

    console.log(`🧪 [TESTE] Plano alterado para: ${planId} (usuário ${user.id})`);

    return c.json({
      success: true,
      data: subscription,
      message: `Plano alterado para ${planId} (modo de teste)`,
    });
  } catch (error) {
    console.error("Erro ao alterar plano:", error);
    return c.json(
      {
        success: false,
        error: `Erro ao alterar plano: ${error instanceof Error ? error.message : String(error)}`,
      },
      500
    );
  }
});

/* =========================================================================
 * ROTA: POST /upgrade
 * Faz upgrade do plano da assinatura
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

    // Obter dados do body
    const { newPlanId, billingCycle } = await c.req.json();

    // Validar plano
    if (!["basico", "intermediario", "avancado", "ilimitado"].includes(newPlanId)) {
      return c.json({ success: false, error: "Plano inválido" }, 400);
    }

    // Validar ciclo de cobrança
    if (billingCycle && !["monthly", "yearly"].includes(billingCycle)) {
      return c.json({ success: false, error: "Ciclo de cobrança inválido" }, 400);
    }

    // Buscar assinatura atual
    const subscriptionKey = `subscription:${user.id}`;
    const subscription = await kv.get(subscriptionKey);

    if (!subscription) {
      return c.json(
        { success: false, error: "Assinatura não encontrada" },
        404
      );
    }

    // Hierarquia de planos
    const planHierarchy = ["basico", "intermediario", "avancado", "ilimitado"];
    const currentIndex = planHierarchy.indexOf(subscription.planId);
    const newIndex = planHierarchy.indexOf(newPlanId);

    // Verificar se é upgrade
    if (newIndex <= currentIndex) {
      return c.json(
        { success: false, error: "O novo plano deve ser superior ao atual" },
        400
      );
    }

    // Atualizar assinatura
    const now = new Date();
    subscription.planId = newPlanId;
    subscription.billingCycle = billingCycle || subscription.billingCycle;
    subscription.status = "active"; // Sair de trial
    subscription.updatedAt = now.toISOString();

    // Se estava em trial, definir período de cobrança
    if (subscription.status === "trial") {
      subscription.currentPeriodStart = now.toISOString();
      const periodEnd = new Date(now);
      if (subscription.billingCycle === "yearly") {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }
      subscription.currentPeriodEnd = periodEnd.toISOString();
    }

    // Salvar
    await kv.set(subscriptionKey, subscription);

    console.log(
      `✅ [UPGRADE] Usuário ${user.id}: ${subscription.planId} → ${newPlanId}`
    );

    return c.json({
      success: true,
      data: subscription,
      message: `Upgrade realizado com sucesso para o plano ${newPlanId}`,
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
 * ROTA: POST /downgrade
 * Faz downgrade do plano da assinatura (efetivado no fim do período)
 * ========================================================================= */

app.post("/downgrade", async (c) => {
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
    const { newPlanId } = await c.req.json();

    // Validar plano
    if (!["basico", "intermediario", "avancado", "ilimitado"].includes(newPlanId)) {
      return c.json({ success: false, error: "Plano inválido" }, 400);
    }

    // Buscar assinatura atual
    const subscriptionKey = `subscription:${user.id}`;
    const subscription = await kv.get(subscriptionKey);

    if (!subscription) {
      return c.json(
        { success: false, error: "Assinatura não encontrada" },
        404
      );
    }

    // Hierarquia de planos
    const planHierarchy = ["basico", "intermediario", "avancado", "ilimitado"];
    const currentIndex = planHierarchy.indexOf(subscription.planId);
    const newIndex = planHierarchy.indexOf(newPlanId);

    // Verificar se é downgrade
    if (newIndex >= currentIndex) {
      return c.json(
        { success: false, error: "O novo plano deve ser inferior ao atual" },
        400
      );
    }

    // Agendar downgrade para o fim do período
    subscription.scheduledPlanChange = {
      newPlanId,
      scheduledFor: subscription.currentPeriodEnd,
      requestedAt: new Date().toISOString(),
    };
    subscription.updatedAt = new Date().toISOString();

    // Salvar
    await kv.set(subscriptionKey, subscription);

    console.log(
      `⏳ [DOWNGRADE] Agendado para usuário ${user.id}: ${subscription.planId} → ${newPlanId} em ${subscription.currentPeriodEnd}`
    );

    return c.json({
      success: true,
      data: subscription,
      message: `Downgrade agendado para ${newPlanId}. Será efetivado em ${new Date(subscription.currentPeriodEnd).toLocaleDateString("pt-BR")}`,
    });
  } catch (error) {
    console.error("Erro ao fazer downgrade:", error);
    return c.json(
      {
        success: false,
        error: `Erro ao fazer downgrade: ${error instanceof Error ? error.message : String(error)}`,
      },
      500
    );
  }
});

/* =========================================================================
 * ROTA: POST /cancel-scheduled-change
 * Cancela mudança de plano agendada
 * ========================================================================= */

app.post("/cancel-scheduled-change", async (c) => {
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

    // Buscar assinatura atual
    const subscriptionKey = `subscription:${user.id}`;
    const subscription = await kv.get(subscriptionKey);

    if (!subscription) {
      return c.json(
        { success: false, error: "Assinatura não encontrada" },
        404
      );
    }

    if (!subscription.scheduledPlanChange) {
      return c.json(
        { success: false, error: "Não há mudança de plano agendada" },
        400
      );
    }

    // Remover agendamento
    delete subscription.scheduledPlanChange;
    subscription.updatedAt = new Date().toISOString();

    // Salvar
    await kv.set(subscriptionKey, subscription);

    console.log(`❌ [CANCEL] Mudança de plano cancelada para usuário ${user.id}`);

    return c.json({
      success: true,
      data: subscription,
      message: "Mudança de plano cancelada com sucesso",
    });
  } catch (error) {
    console.error("Erro ao cancelar mudança:", error);
    return c.json(
      {
        success: false,
        error: `Erro ao cancelar mudança: ${error instanceof Error ? error.message : String(error)}`,
      },
      500
    );
  }
});

// Exportar app como default
export default app;