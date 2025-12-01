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
 * ROTA: POST /subscription/initialize
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
    trialEnd.setDate(trialEnd.getDate() + 14); // 14 dias de trial

    const defaultSubscription = {
      userId: user.id,
      planId: "intermediario", // Plano padrão: Intermediário
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