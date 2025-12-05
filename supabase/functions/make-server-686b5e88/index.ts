// =====================================================
// SUPABASE EDGE FUNCTION ENTRY POINT
// =====================================================
// Este arquivo é o ponto de entrada oficial para o Supabase Edge Function.
// Ele importa o servidor principal que está em ../server/index.tsx

import app from '../server/index.tsx';

console.log('[ENTRY POINT] 🚀 Iniciando Supabase Edge Function...');

// Custom handler para permitir rotas públicas (stripe webhooks, health checks, etc)
Deno.serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname;
  
  // Lista de rotas públicas que NÃO requerem autenticação JWT
  const publicRoutes = [
    '/make-server-686b5e88/stripe/webhook',
    '/make-server-686b5e88/stripe/health',
    '/make-server-686b5e88/health',
    '/make-server-686b5e88/auth/signup',
    '/make-server-686b5e88/auth/signin',
  ];
  
  // Se a rota é pública, processar diretamente
  const isPublicRoute = publicRoutes.some(route => path.includes(route));
  
  if (isPublicRoute) {
    console.log(`[ENTRY POINT] ✅ Rota pública detectada: ${path}`);
  } else {
    console.log(`[ENTRY POINT] 🔒 Rota protegida: ${path}`);
  }
  
  // 🔧 FIX: Para rotas do Stripe webhook, adicionar header de bypass se não existir
  if (path.includes('/stripe/webhook') && req.method === 'POST') {
    console.log(`[ENTRY POINT] 🔧 Webhook do Stripe detectado - verificando headers`);
    console.log(`[ENTRY POINT] 📋 Headers recebidos:`, Object.fromEntries(req.headers.entries()));
    
    // Se não tem Authorization header, criar um request modificado
    if (!req.headers.get('Authorization')) {
      console.log(`[ENTRY POINT] ⚠️ Authorization header ausente - criando request modificado`);
      
      // Clonar o request e adicionar header vazio para não quebrar
      // (o webhook do Stripe usa stripe-signature para autenticação)
      const modifiedHeaders = new Headers(req.headers);
      modifiedHeaders.set('X-Webhook-Bypass', 'true');
      
      const modifiedReq = new Request(req.url, {
        method: req.method,
        headers: modifiedHeaders,
        body: req.body,
        // @ts-ignore - duplex é necessário para streaming
        duplex: 'half'
      });
      
      return app.fetch(modifiedReq);
    }
  }
  
  // Processar request com Hono
  return app.fetch(req);
});