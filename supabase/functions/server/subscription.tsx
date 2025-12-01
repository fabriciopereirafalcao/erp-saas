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

/* =========================================================================
 * ROTA: POST /subscription/change-plan (APENAS DEV/TESTE)
 * Troca o plano do usuário para fins de teste
 * ========================================================================= */

app.post("/change-plan", async (c) => {
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
    const body = await c.req.json();
    const { planId } = body;

    if (!planId || !["basico", "intermediario", "avancado", "ilimitado"].includes(planId)) {
      return c.json(
        { success: false, error: "planId inválido" },
        400
      );
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

    // Atualizar plano
    const updatedSubscription = {
      ...subscription,
      planId,
      status: "active", // Remover trial ao trocar plano
      updatedAt: new Date().toISOString(),
    };

    // Salvar no KV
    await kv.set(subscriptionKey, updatedSubscription);

    return c.json({
      success: true,
      data: updatedSubscription,
      message: `Plano alterado para ${planId}`,
    });
  } catch (error) {
    console.error("Erro ao trocar plano:", error);
    return c.json(
      {
        success: false,
        error: `Erro ao trocar plano: ${error instanceof Error ? error.message : String(error)}`,
      },
      500
    );
  }
});

export default app;