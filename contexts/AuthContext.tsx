import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../utils/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { FEATURES } from '../utils/environment';

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
  const [loading, setLoading] = useState(true);

  // Carregar perfil do usuário
  const loadUserProfile = async (userId: string) => {
    try {
      // ⚡ TIMEOUT: Se a query demorar mais de 5 segundos, abortar
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout ao carregar perfil')), 5000)
      );
      
      // Query do perfil do usuário
      const profilePromise = supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      const { data: profileData, error: profileError } = await Promise.race([
        profilePromise,
        timeoutPromise
      ]) as any;

      if (profileError) {
        console.error('[AuthContext] Erro ao buscar perfil:', profileError);
        throw profileError;
      }

      if (!profileData) {
        console.error('[AuthContext] Perfil não encontrado');
        throw new Error('Perfil não encontrado');
      }

      setProfile(profileData);
      
      // Buscar company separadamente (não travar se falhar)
      if (profileData.company_id) {
        try {
          const companyPromise = supabase
            .from('companies')
            .select('*')
            .eq('id', profileData.company_id)
            .single();
          
          const { data: companyData, error: companyError } = await Promise.race([
            companyPromise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout ao carregar company')), 5000)
            )
          ]) as any;
          
          if (companyError) {
            console.warn('[AuthContext] Erro ao buscar company:', companyError);
          } else if (companyData) {
            setCompany(companyData);
          }
        } catch (error) {
          console.warn('[AuthContext] Erro ao carregar company:', error);
          // Continuar mesmo sem company
        }
      }
      
    } catch (error) {
      console.error('[AuthContext] Erro crítico ao carregar perfil:', error);
      // Não propagar o erro - permitir que o app continue
      // O usuário ainda pode usar o app mesmo sem perfil completo
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
      setLoading(false);
      return; // Não executar lógica de autenticação real
    }

    // ✅ Autenticação real com Supabase
    const initializeAuth = async () => {
      try {
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
          } else {
            setProfile(null);
            setCompany(null);
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

  // Login
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

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
  return context;
}