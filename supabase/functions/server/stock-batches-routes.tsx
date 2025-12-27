// ==================== ROTAS - STOCK LOCATIONS ====================

// GET - Listar locais de estoque
app.get('/stock-locations', async (c) => {
  try {
    console.log('[STOCK LOCATIONS] 🟢 GET /stock-locations - Início');
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      console.error('[STOCK LOCATIONS] ❌ Não autorizado');
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabase
      .from('stock_locations')
      .select('*')
      .eq('company_id', auth.companyId)
      .eq('is_active', true)
      .order('code', { ascending: true });

    if (error) throw error;

    console.log(`[STOCK LOCATIONS] ✅ ${data.length} locais carregados`);
    return c.json({ success: true, data });

  } catch (error) {
    console.error('[STOCK LOCATIONS] ❌ Erro ao carregar:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST - Criar local de estoque
app.post('/stock-locations/create', async (c) => {
  try {
    console.log('[STOCK LOCATIONS] 🔵 POST /stock-locations/create - Início');
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const body = await c.req.json();
    console.log('[STOCK LOCATIONS] 📝 Criando novo local:', JSON.stringify(body, null, 2));

    // Validação
    if (!body.name || body.name.trim() === '') {
      return c.json({ error: 'Nome é obrigatório' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Gerar código automaticamente (LOC-001, LOC-002, etc)
    const { data: existing } = await supabase
      .from('stock_locations')
      .select('code')
      .eq('company_id', auth.companyId)
      .order('code', { ascending: false })
      .limit(1);

    let nextCode = 'LOC-001';
    if (existing && existing.length > 0) {
      const lastCode = existing[0].code;
      const lastNumber = parseInt(lastCode.replace('LOC-', ''));
      nextCode = `LOC-${String(lastNumber + 1).padStart(3, '0')}`;
    }

    // Verificar duplicidade de nome
    const { data: duplicateName } = await supabase
      .from('stock_locations')
      .select('id, name')
      .eq('company_id', auth.companyId)
      .eq('name', body.name.trim())
      .eq('is_active', true)
      .limit(1);

    if (duplicateName && duplicateName.length > 0) {
      return c.json({ 
        error: `Local "${body.name.trim()}" já existe` 
      }, 400);
    }

    // Inserir local
    const insertData = {
      company_id: auth.companyId,
      code: nextCode,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      address: body.address?.trim() || null,
      type: body.type || 'Outro',
      capacity_m3: body.capacityM3 || null,
      is_active: true,
    };

    const { data, error } = await supabase
      .from('stock_locations')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('[STOCK LOCATIONS] ❌ Erro ao inserir:', error);
      throw error;
    }

    console.log('[STOCK LOCATIONS] ✅ Local criado:', data.id);
    return c.json({ success: true, data });

  } catch (error) {
    console.error('[STOCK LOCATIONS] ❌ Erro:', error);
    return c.json({ error: error.message }, 500);
  }
});

// PUT - Atualizar local de estoque
app.put('/stock-locations/:id', async (c) => {
  try {
    console.log('[STOCK LOCATIONS] 🟡 PUT /stock-locations/:id - Início');
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const locationId = c.req.param('id');
    const body = await c.req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verificar se local existe
    const { data: existing, error: fetchError } = await supabase
      .from('stock_locations')
      .select('*')
      .eq('id', locationId)
      .eq('company_id', auth.companyId)
      .single();

    if (fetchError || !existing) {
      return c.json({ error: 'Local não encontrado' }, 404);
    }

    // Se mudou o nome, verificar duplicidade
    if (body.name && body.name.trim() !== existing.name) {
      const { data: duplicateName } = await supabase
        .from('stock_locations')
        .select('id')
        .eq('company_id', auth.companyId)
        .eq('name', body.name.trim())
        .eq('is_active', true)
        .neq('id', locationId)
        .limit(1);

      if (duplicateName && duplicateName.length > 0) {
        return c.json({ 
          error: `Local "${body.name.trim()}" já existe` 
        }, 400);
      }
    }

    // Atualizar
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.description !== undefined) updateData.description = body.description?.trim() || null;
    if (body.address !== undefined) updateData.address = body.address?.trim() || null;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.capacityM3 !== undefined) updateData.capacity_m3 = body.capacityM3;

    const { data, error } = await supabase
      .from('stock_locations')
      .update(updateData)
      .eq('id', locationId)
      .eq('company_id', auth.companyId)
      .select()
      .single();

    if (error) {
      console.error('[STOCK LOCATIONS] ❌ Erro ao atualizar:', error);
      throw error;
    }

    console.log('[STOCK LOCATIONS] ✅ Local atualizado:', locationId);
    return c.json({ success: true, data });

  } catch (error) {
    console.error('[STOCK LOCATIONS] ❌ Erro:', error);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE - Soft delete de local de estoque
app.delete('/stock-locations/:id', async (c) => {
  try {
    console.log('[STOCK LOCATIONS] 🔴 DELETE /stock-locations/:id - Início');
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const locationId = c.req.param('id');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Soft delete
    const { error } = await supabase
      .from('stock_locations')
      .update({ is_active: false })
      .eq('id', locationId)
      .eq('company_id', auth.companyId);

    if (error) {
      console.error('[STOCK LOCATIONS] ❌ Erro ao deletar:', error);
      throw error;
    }

    console.log('[STOCK LOCATIONS] ✅ Local deletado:', locationId);
    return c.json({ success: true, message: 'Local removido com sucesso' });

  } catch (error) {
    console.error('[STOCK LOCATIONS] ❌ Erro:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== ROTAS - PRODUCT BATCHES ====================

// GET - Listar lotes de fabricação
app.get('/product-batches', async (c) => {
  try {
    console.log('[PRODUCT BATCHES] 🟢 GET /product-batches - Início');
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      console.error('[PRODUCT BATCHES] ❌ Não autorizado');
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabase
      .from('product_batches')
      .select('*')
      .eq('company_id', auth.companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log(`[PRODUCT BATCHES] ✅ ${data.length} lotes carregados`);
    return c.json({ success: true, data });

  } catch (error) {
    console.error('[PRODUCT BATCHES] ❌ Erro ao carregar:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST - Criar lote de fabricação
app.post('/product-batches/create', async (c) => {
  try {
    console.log('[PRODUCT BATCHES] 🔵 POST /product-batches/create - Início');
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const body = await c.req.json();
    console.log('[PRODUCT BATCHES] 📝 Criando novo lote:', JSON.stringify(body, null, 2));

    // Validações
    if (!body.productName || body.productName.trim() === '') {
      return c.json({ error: 'Nome do produto é obrigatório' }, 400);
    }
    if (!body.batchNumber || body.batchNumber.trim() === '') {
      return c.json({ error: 'Número do lote é obrigatório' }, 400);
    }
    if (!body.quantity || body.quantity <= 0) {
      return c.json({ error: 'Quantidade deve ser maior que zero' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Para product_batches, vamos simplificar: não exigir product_id por enquanto
    // O usuário pode cadastrar lote com apenas o nome do produto
    
    // Verificar duplicidade de lote
    const { data: duplicateBatch } = await supabase
      .from('product_batches')
      .select('id')
      .eq('company_id', auth.companyId)
      .eq('batch_number', body.batchNumber.trim())
      .eq('product_name', body.productName.trim())
      .limit(1);

    if (duplicateBatch && duplicateBatch.length > 0) {
      return c.json({ 
        error: `Lote "${body.batchNumber.trim()}" já existe para este produto` 
      }, 400);
    }

    // Inserir lote
    const insertData = {
      company_id: auth.companyId,
      product_id: body.productId || null, // Opcional por enquanto
      product_name: body.productName.trim(),
      batch_number: body.batchNumber.trim(),
      manufacturing_date: body.manufacturingDate || null,
      expiry_date: body.expiryDate || null,
      location_id: null,
      location_name: null,
      shelf_position: null,
      initial_quantity: body.quantity,
      current_quantity: body.quantity,
      reserved_quantity: 0,
      supplier_id: null,
      supplier_name: null,
      purchase_order_id: null,
      status: body.status || 'Ativo',
      notes: null,
    };

    const { data, error } = await supabase
      .from('product_batches')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('[PRODUCT BATCHES] ❌ Erro ao inserir:', error);
      throw error;
    }

    console.log('[PRODUCT BATCHES] ✅ Lote criado:', data.id);
    return c.json({ success: true, data });

  } catch (error) {
    console.error('[PRODUCT BATCHES] ❌ Erro:', error);
    return c.json({ error: error.message }, 500);
  }
});

// PUT - Atualizar lote de fabricação
app.put('/product-batches/:id', async (c) => {
  try {
    console.log('[PRODUCT BATCHES] 🟡 PUT /product-batches/:id - Início');
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const batchId = c.req.param('id');
    const body = await c.req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verificar se lote existe
    const { data: existing, error: fetchError } = await supabase
      .from('product_batches')
      .select('*')
      .eq('id', batchId)
      .eq('company_id', auth.companyId)
      .single();

    if (fetchError || !existing) {
      return c.json({ error: 'Lote não encontrado' }, 404);
    }

    // Atualizar
    const updateData: any = {};
    if (body.batchNumber !== undefined) updateData.batch_number = body.batchNumber.trim();
    if (body.productName !== undefined) updateData.product_name = body.productName.trim();
    if (body.quantity !== undefined) {
      updateData.current_quantity = body.quantity;
      updateData.initial_quantity = body.quantity;
      
      // ✅ CORREÇÃO: Recalcular status quando quantidade mudar
      // Se estava "Esgotado" e agora tem quantidade, volta para "Ativo"
      if (body.quantity > 0 && existing.status === 'Esgotado') {
        updateData.status = 'Ativo';
        console.log('[PRODUCT BATCHES] 🔄 Status alterado de "Esgotado" para "Ativo" devido a nova quantidade');
      }
      // Se quantidade ficou zerada, marca como "Esgotado"
      else if (body.quantity === 0 && existing.status !== 'Esgotado') {
        updateData.status = 'Esgotado';
        console.log('[PRODUCT BATCHES] 🔄 Status alterado para "Esgotado" devido a quantidade zero');
      }
    }
    if (body.manufacturingDate !== undefined) updateData.manufacturing_date = body.manufacturingDate;
    if (body.expiryDate !== undefined) updateData.expiry_date = body.expiryDate;
    // ✅ Status manual só sobrescreve se não foi calculado automaticamente acima
    if (body.status !== undefined && updateData.status === undefined) updateData.status = body.status;

    const { data, error } = await supabase
      .from('product_batches')
      .update(updateData)
      .eq('id', batchId)
      .eq('company_id', auth.companyId)
      .select()
      .single();

    if (error) {
      console.error('[PRODUCT BATCHES] ❌ Erro ao atualizar:', error);
      throw error;
    }

    console.log('[PRODUCT BATCHES] ✅ Lote atualizado:', batchId);
    return c.json({ success: true, data });

  } catch (error) {
    console.error('[PRODUCT BATCHES] ❌ Erro:', error);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE - Deletar lote de fabricação
app.delete('/product-batches/:id', async (c) => {
  try {
    console.log('[PRODUCT BATCHES] 🔴 DELETE /product-batches/:id - Início');
    const auth = await sqlService.authenticate(c.req.header('Authorization'));
    if (!auth) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const batchId = c.req.param('id');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Hard delete (product_batches não tem soft delete no schema)
    const { error } = await supabase
      .from('product_batches')
      .delete()
      .eq('id', batchId)
      .eq('company_id', auth.companyId);

    if (error) {
      console.error('[PRODUCT BATCHES] ❌ Erro ao deletar:', error);
      throw error;
    }

    console.log('[PRODUCT BATCHES] ✅ Lote deletado:', batchId);
    return c.json({ success: true, message: 'Lote removido com sucesso' });

  } catch (error) {
    console.error('[PRODUCT BATCHES] ❌ Erro:', error);
    return c.json({ error: error.message }, 500);
  }
});