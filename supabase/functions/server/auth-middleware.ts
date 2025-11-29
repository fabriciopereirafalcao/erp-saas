/**
 * 🛡️ MIDDLEWARE DE AUTENTICAÇÃO E AUTORIZAÇÃO
 * 
 * Este arquivo demonstra como validar autenticação e permissões no BACKEND.
 * 
 * ⚠️ IMPORTANTE: NUNCA confie apenas no frontend/localStorage!
 * O frontend pode ser manipulado. Toda validação de segurança DEVE estar no backend.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import type { Context } from 'npm:hono';

// Tipos de roles (sincronizado com o frontend)
export type UserRole = 'owner' | 'admin' | 'manager' | 'operator' | 'viewer';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  company_id: string;
  role: UserRole;
  is_active: boolean;
}

/**
 * 🔐 Extrai e valida o token JWT do header Authorization
 * 
 * @param c - Hono Context
 * @returns Token JWT ou null se inválido
 */
export function extractToken(c: Context): string | null {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) {
    return null;
  }

  // Formato esperado: "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * 🔐 Valida token JWT e retorna dados do usuário autenticado
 * 
 * ⚠️ Esta função faz 2 validações:
 * 1. Token JWT é válido? (Supabase Auth)
 * 2. Usuário existe e está ativo no banco? (Tabela users)
 * 
 * @param token - Token JWT do header Authorization
 * @returns Dados do usuário ou null se inválido
 */
export async function authenticateUser(token: string): Promise<AuthenticatedUser | null> {
  try {
    // ✅ PASSO 1: Validar token JWT com Supabase Auth
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.warn('❌ Token inválido ou expirado:', authError?.message);
      return null;
    }

    // ✅ PASSO 2: Buscar perfil REAL do banco (não confiar no frontend)
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.warn('❌ Usuário não encontrado no banco:', user.id);
      return null;
    }

    // ✅ PASSO 3: Verificar se usuário está ativo
    if (!profile.is_active) {
      console.warn('❌ Usuário inativo:', user.id);
      return null;
    }

    // ✅ PASSO 4: Retornar dados validados
    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      company_id: profile.company_id,
      role: profile.role,
      is_active: profile.is_active,
    };
  } catch (error) {
    console.error('❌ Erro ao autenticar usuário:', error);
    return null;
  }
}

/**
 * 🔐 Middleware Hono: Requer autenticação
 * 
 * Uso:
 * ```typescript
 * app.get('/api/protected', requireAuth, async (c) => {
 *   const user = c.get('user'); // Dados validados do usuário
 *   return c.json({ message: 'Acesso permitido', user });
 * });
 * ```
 */
export async function requireAuth(c: Context, next: Function) {
  const token = extractToken(c);
  
  if (!token) {
    return c.json({ error: 'Token não fornecido' }, 401);
  }

  const user = await authenticateUser(token);
  
  if (!user) {
    return c.json({ error: 'Não autorizado' }, 401);
  }

  // Adicionar usuário ao contexto para uso nas rotas
  c.set('user', user);
  
  await next();
}

/**
 * 🔐 Middleware Hono: Requer role específica
 * 
 * Uso:
 * ```typescript
 * app.delete('/api/admin/users/:id', requireRole(['owner', 'admin']), async (c) => {
 *   // Apenas owner e admin podem acessar
 * });
 * ```
 * 
 * @param allowedRoles - Array de roles permitidas
 */
export function requireRole(allowedRoles: UserRole[]) {
  return async (c: Context, next: Function) => {
    // Assumir que requireAuth já foi executado
    const user = c.get('user') as AuthenticatedUser;
    
    if (!user) {
      return c.json({ error: 'Não autenticado' }, 401);
    }

    if (!allowedRoles.includes(user.role)) {
      return c.json({ 
        error: 'Acesso negado', 
        message: `Requer uma das roles: ${allowedRoles.join(', ')}` 
      }, 403);
    }

    await next();
  };
}

/**
 * 🔐 Middleware Hono: Requer acesso à empresa específica
 * 
 * Garante isolamento multi-tenant: usuário só pode acessar dados da própria empresa
 * 
 * Uso:
 * ```typescript
 * app.get('/api/companies/:companyId/data', requireAuth, requireCompanyAccess, async (c) => {
 *   // Usuário só acessa se company_id bater
 * });
 * ```
 */
export async function requireCompanyAccess(c: Context, next: Function) {
  const user = c.get('user') as AuthenticatedUser;
  const companyId = c.req.param('companyId');

  if (!user) {
    return c.json({ error: 'Não autenticado' }, 401);
  }

  if (user.company_id !== companyId) {
    console.warn(`❌ Tentativa de acesso cross-company: ${user.id} tentou acessar ${companyId}`);
    return c.json({ 
      error: 'Acesso negado', 
      message: 'Você não tem acesso a dados desta empresa' 
    }, 403);
  }

  await next();
}

/**
 * 📝 EXEMPLO DE USO COMPLETO:
 * 
 * ```typescript
 * import { Hono } from 'npm:hono';
 * import { requireAuth, requireRole, requireCompanyAccess } from './auth-middleware.ts';
 * 
 * const app = new Hono();
 * 
 * // ✅ Rota pública (sem autenticação)
 * app.get('/api/public/health', (c) => {
 *   return c.json({ status: 'ok' });
 * });
 * 
 * // ✅ Rota protegida (qualquer usuário autenticado)
 * app.get('/api/profile', requireAuth, (c) => {
 *   const user = c.get('user');
 *   return c.json({ user });
 * });
 * 
 * // ✅ Rota com role específica
 * app.delete('/api/users/:id', requireAuth, requireRole(['owner', 'admin']), async (c) => {
 *   const userId = c.req.param('id');
 *   // Apenas owner e admin podem deletar usuários
 *   return c.json({ message: 'Usuário deletado' });
 * });
 * 
 * // ✅ Rota com isolamento multi-tenant
 * app.get('/api/companies/:companyId/customers', 
 *   requireAuth, 
 *   requireCompanyAccess, 
 *   async (c) => {
 *     const user = c.get('user');
 *     // Usuário só vê clientes da própria empresa
 *     return c.json({ customers: [] });
 *   }
 * );
 * 
 * // ✅ Rota combinando role + multi-tenant
 * app.post('/api/companies/:companyId/settings', 
 *   requireAuth,
 *   requireCompanyAccess,
 *   requireRole(['owner', 'admin']),
 *   async (c) => {
 *     // Apenas owner/admin da própria empresa pode alterar configurações
 *     return c.json({ message: 'Configurações atualizadas' });
 *   }
 * );
 * ```
 */
