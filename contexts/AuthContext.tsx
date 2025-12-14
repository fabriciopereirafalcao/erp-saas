import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../utils/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { FEATURES } from '../utils/environment';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  company_id: string;
  role: 'owner' | 'admin' | 'manager' | 'salesperson' | 'buyer' | 'financial' | 'viewer';
}

interface Company {
  id: string;
  name: string;
  plan: 'trial' | 'basic' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'trial' | 'cancelled';
  trial_ends_at: string | null;
}

// 🔓 Usuário MOCK para desenvolvimento sem autenticação
const MOCK_USER = {
  id: 'dev-user-123',
  email: 'dev@metaerp.com',
  aud: 'authenticated',
  role: 'authenticated',
  created_at: new Date().toISOString(),
} as User;

const MOCK_PROFILE: UserProfile = {
  id: 'dev-user-123',
  email: 'dev@metaerp.com',
  name: 'Desenvolvedor',
  company_id: 'dev-company-123',
  role: 'owner',
};

const MOCK_COMPANY: Company = {
  id: 'dev-company-123',
  name: 'Empresa de Desenvolvimento',
  plan: 'enterprise',
  status: 'active',
  trial_ends_at: null,
};

const MOCK_SESSION = {
  access_token: 'dev-token-123',
  user: MOCK_USER,
} as Session;

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  company: Company | null;
  session: Session | null;
  accessToken: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: Error }>;
  signUp: (email: string, password: string, name: string, companyName: string) => Promise<{ error?: Error }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: Error }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error?: Error }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Carregar perfil do usuário
  const loadUserProfile = async (userId: string, silent = false) => {
    let hasCache = false;
    
    try {
      // 📦 PRIMEIRO: Tentar carregar do cache (instantâneo)
      const cachedProfile = localStorage.getItem('erp_system_auth_profile');
      if (cachedProfile) {
        try {
          const parsed = JSON.parse(cachedProfile);
          if (parsed.id === userId) {
            console.log('[AuthContext] ⚡ Perfil carregado do cache (instantâneo)');
            setProfile(parsed);
            hasCache = true;
            // Continuar para validar em background
          }
        } catch (e) {
          console.warn('[AuthContext] Cache inválido, ignorando...');
        }
      }
      
      // ⚡ DEPOIS: Validar com Supabase em background (timeout 5s)
      const queryStartTime = performance.now();
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => {
          const elapsed = Math.round(performance.now() - queryStartTime);
          reject(new Error(`Timeout ao carregar perfil (${elapsed}ms)`));
        }, 5000)
      );
      
      // 🚀 SOLUÇÃO COMPLETA: Bypasear TUDO do Supabase Auth (lento)
      // - supabase.from() → fetch() direto
      // - supabase.auth.getSession() → localStorage direto
      
      // 🔑 Pegar token direto do localStorage (Supabase guarda lá)
      // Supabase armazena em: sb-{projectId}-auth-token
      let accessToken = publicAnonKey;
      try {
        const storageKey = `sb-${projectId}-auth-token`;
        const authData = localStorage.getItem(storageKey);
        if (authData) {
          const parsed = JSON.parse(authData);
          accessToken = parsed.access_token || publicAnonKey;
          if (!silent) {
            console.log(`[AuthContext] 🔑 Token obtido do localStorage`);
          }
        }
      } catch (e) {
        console.warn('[AuthContext] ⚠️ Erro ao buscar token do localStorage, usando anon key');
      }
      
      const profilePromise = fetch(
        `https://${projectId}.supabase.co/rest/v1/users?id=eq.${userId}&select=*`,
        {
          headers: {
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          }
        }
      )
        .then(async (response) => {
          const elapsed = Math.round(performance.now() - queryStartTime);
          
          if (!response.ok) {
            if (!silent) {
              console.log(`[AuthContext] ❌ Erro HTTP ${response.status} em ${elapsed}ms`);
            }
            throw new Error(`HTTP ${response.status}`);
          }
          
          const data = await response.json();
          
          if (!silent) {
            console.log(`[AuthContext] ✅ Perfil validado em ${elapsed}ms`);
          }
          
          // Retornar no mesmo formato do Supabase client
          return {
            data: data[0] || null,
            error: data.length === 0 ? { message: 'Perfil não encontrado' } : null
          };
        });
      
      const { data: profileData, error: profileError } = await Promise.race([
        profilePromise,
        timeoutPromise
      ]) as any;

      if (profileError) {
        // ✅ Se temos cache, erro não é crítico (validação em background)
        if (hasCache) {
          if (!silent) {
            console.warn('[AuthContext] ⚠️ Validação do perfil falhou (usando cache):', profileError.message);
          }
          return; // Usar cache
        }
        // ❌ Sem cache, é crítico
        console.error('[AuthContext] ❌ ERRO CRÍTICO - Sem cache disponível:', profileError);
        throw profileError;
      }

      if (!profileData) {
        if (hasCache) {
          if (!silent) {
            console.warn('[AuthContext] ⚠️ Perfil não encontrado no banco (usando cache)');
          }
          return;
        }
        console.error('[AuthContext] ❌ ERRO CRÍTICO - Perfil não encontrado');
        throw new Error('Perfil não encontrado');
      }

      // 🔄 Verificar se dados mudaram
      if (hasCache) {
        const cached = JSON.parse(cachedProfile!);
        const changed = JSON.stringify(cached) !== JSON.stringify(profileData);
        if (changed) {
          console.log('[AuthContext] 🔄 Perfil atualizado (dados mudaram no servidor)');
          setProfile(profileData);
        } else if (!silent) {
          console.log('[AuthContext] ✅ Perfil validado (sem mudanças)');
        }
      } else {
        console.log('[AuthContext] ✅ Perfil carregado do Supabase');
        setProfile(profileData);
      }
      
      // 💾 Atualizar cache
      localStorage.setItem('erp_system_auth_profile', JSON.stringify(profileData));
      
      // Buscar company separadamente (não travar se falhar)
      if (profileData.company_id) {
        try {
          // 🚀 Usar fetch() direto também para company
          const companyResponse = await Promise.race([
            fetch(
              `https://${projectId}.supabase.co/rest/v1/companies?id=eq.${profileData.company_id}&select=*`,
              {
                headers: {
                  'apikey': publicAnonKey,
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                }
              }
            ).then(async (res) => {
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const data = await res.json();
              return { data: data[0] || null, error: null };
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout ao carregar company')), 5000)
            )
          ]) as any;
          
          if (companyResponse.error) {
            console.warn('[AuthContext] Erro ao buscar company:', companyResponse.error);
          } else if (companyResponse.data) {
            setCompany(companyResponse.data);
          }
        } catch (error) {
          console.warn('[AuthContext] ⚠️ Company não carregada (não crítico):', error);
          // Continuar mesmo sem company
        }
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // ✅ Se temos cache, erro não é crítico (validação em background falhou)
      if (hasCache) {
        if (!silent) {
          console.warn('[AuthContext] ⚠️ Validação em background falhou (usando cache):', errorMessage);
        }
        return; // Continuar usando cache
      }
      
      // ❌ Sem cache, é crítico
      console.error('[AuthContext] ❌ ERRO CRÍTICO ao carregar perfil:', errorMessage);
      console.error('[AuthContext] Stack trace:', error);
      // Não propagar o erro - permitir que o app continue
    }
  };

  // Monitorar mudanças na autenticação
  useEffect(() => {
    // 🔓 BYPASS AUTH: Usar dados MOCK em desenvolvimento
    if (FEATURES.BYPASS_AUTH) {
      setUser(MOCK_USER);
      setProfile(MOCK_PROFILE);
      setCompany(MOCK_COMPANY);
      setSession(MOCK_SESSION);
      setAccessToken(MOCK_SESSION.access_token);
      setLoading(false);
      return; // Não executar lógica de autenticação real
    }

    // ✅ Autenticação real com Supabase
    const initializeAuth = async () => {
      try {
        // 📂 Tentar carregar do localStorage primeiro (otimização)
        const cachedProfile = localStorage.getItem('erp_system_auth_profile');
        if (cachedProfile) {
          try {
            const parsedProfile = JSON.parse(cachedProfile);
            setProfile(parsedProfile);
            console.log('[AuthContext] ✅ Perfil carregado do cache:', parsedProfile.email);
          } catch (e) {
            console.warn('[AuthContext] Erro ao parsear perfil do cache');
          }
        }
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[AuthContext] Erro ao verificar sessão:', error);
          setSession(null);
          setUser(null);
          setProfile(null);
          setCompany(null);
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await loadUserProfile(session.user.id);
          
          // 💾 Salvar token
          if (session.access_token) {
            localStorage.setItem('erp_system_auth_token', session.access_token);
            setAccessToken(session.access_token);
          }
        }
      } catch (error) {
        console.error('[AuthContext] Erro crítico ao inicializar autenticação:', error);
        setSession(null);
        setUser(null);
        setProfile(null);
        setCompany(null);
      } finally {
        // ⚡ CRÍTICO: Sempre desabilitar loading, mesmo em caso de erro
        setLoading(false);
      }
    };

    initializeAuth();

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            await loadUserProfile(session.user.id);
            
            // 💾 Salvar token
            if (session.access_token) {
              localStorage.setItem('erp_system_auth_token', session.access_token);
              setAccessToken(session.access_token);
            }
          } else {
            setProfile(null);
            setCompany(null);
            
            // 🗑️ Limpar cache ao fazer logout
            localStorage.removeItem('erp_system_auth_token');
            localStorage.removeItem('erp_system_auth_profile');
          }
        } catch (error) {
          console.error('[AuthContext] Erro ao processar mudança de autenticação:', error);
        } finally {
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // 🔄 Verificação e revalidação periódica (a cada 5 minutos)
  useEffect(() => {
    // Não executar em modo BYPASS_AUTH
    if (FEATURES.BYPASS_AUTH) {
      return;
    }

    const checkAndRevalidate = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // Se não houver sessão e o usuário estava logado, fazer logout
        if (!session && user) {
          console.warn('[AuthContext] 🚨 Sessão inválida detectada - fazendo logout');
          await signOut();
          return;
        }
        
        // Se temos sessão, revalidar perfil em background
        if (session?.user && profile) {
          console.log('[AuthContext] 🔄 Revalidação periódica do perfil...');
          await loadUserProfile(session.user.id, true); // silent=true
        }
      } catch (error) {
        console.error('[AuthContext] Erro ao verificar/revalidar sessão:', error);
      }
    };

    // Verificar a cada 5 minutos (300.000ms)
    const interval = setInterval(checkAndRevalidate, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user, profile]);

  // Login
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // 💾 Salvar token no localStorage
      if (data?.session?.access_token) {
        localStorage.setItem('erp_system_auth_token', data.session.access_token);
        setAccessToken(data.session.access_token);
      }

      return { error: undefined };
    } catch (error) {
      return { error: error as Error };
    }
  };

  // Registro
  const signUp = async (
    email: string,
    password: string,
    name: string,
    companyName: string
  ) => {
    try {
      // Chamar rota de signup no backend (usa SERVICE_ROLE_KEY, bypass RLS)
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/auth/signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            email,
            password,
            name,
            companyName,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Erro ao criar conta');
      }

      // Após criar a conta, fazer login automático
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('Erro ao fazer login após signup:', signInError);
        throw new Error('Conta criada, mas falha ao fazer login. Tente fazer login manualmente.');
      }

      return { error: undefined };
    } catch (error) {
      console.error('Erro no signup:', error);
      return { error: error as Error };
    }
  };

  // Logout
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setCompany(null);
    setSession(null);
    
    // 🗑️ Limpar localStorage
    localStorage.removeItem('erp_system_auth_token');
    localStorage.removeItem('erp_system_auth_profile');
  };

  // Recuperar senha
  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      return { error: undefined };
    } catch (error) {
      return { error: error as Error };
    }
  };

  // Atualizar perfil
  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      // Recarregar perfil
      await loadUserProfile(user.id);

      return { error: undefined };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const value = {
    user,
    profile,
    company,
    session,
    accessToken,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  // Adicionar alias currentUser para compatibilidade
  return {
    ...context,
    currentUser: context.user,
  };
}