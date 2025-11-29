// =====================================================
// SUPABASE EDGE FUNCTION ENTRY POINT
// =====================================================
// Este arquivo é o ponto de entrada oficial para o Supabase Edge Function.
// Ele importa o servidor principal que está em ../server/index.tsx

import app from '../server/index.tsx';

console.log('[ENTRY POINT] 🚀 Iniciando Supabase Edge Function...');
Deno.serve(app.fetch);
