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
  }
  
  // Processar request com Hono
  return app.fetch(req);
});
