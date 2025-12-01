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
    trialEnd.setDate(trialEnd.getDate() + 7); // 7 dias de trial

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

// Exportar app como default
export default app;