import { useState, useEffect } from 'react';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { LandingPage } from '../LandingPage';
import { AcceptInvite } from '../AcceptInvite';
import { useAuth } from '../../contexts/AuthContext';

type AuthView = 'landing' | 'login' | 'register' | 'forgot-password' | 'accept-invite';

export function AuthFlow({ children }: { children: React.ReactNode }) {
  // ✅ Detectar se deve iniciar na tela de cadastro via URL param
  const getInitialView = (): AuthView => {
    const params = new URLSearchParams(window.location.search);
    // Se tem token de convite, vai para aceitar convite
    if (params.get('token')) {
      return 'accept-invite';
    }
    // Se tem signup=true, vai para registro
    if (params.get('signup') === 'true') {
      return 'register';
    }
    return 'landing';
  };

  const [view, setView] = useState<AuthView>(getInitialView);
  const { currentUser, loading } = useAuth();

  console.log('🔐 AuthFlow State:', {
    currentUser: currentUser?.email,
    loading,
    view
  });

  // ✅ Limpar parâmetro signup=true da URL quando mudar de view (mas manter token)
  useEffect(() => {
    if (view !== 'register') {
      const params = new URLSearchParams(window.location.search);
      if (params.has('signup')) {
        params.delete('signup');
        const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [view]);

  // ✅ Se usuário está autenticado, renderizar children (AppContent)
  if (currentUser) {
    console.log('✅ AuthFlow: Usuário autenticado, renderizando children');
    return <>{children}</>;
  }

  // ❌ Se não está autenticado, mostrar telas de login/registro
  console.log('❌ AuthFlow: Usuário não autenticado, renderizando', view);
  switch (view) {
    case 'landing':
      return (
        <LandingPage
          onNavigateToSignup={() => setView('register')}
          onNavigateToLogin={() => setView('login')}
        />
      );
    case 'login':
      return (
        <LoginPage
          onNavigateToRegister={() => setView('register')}
          onNavigateToForgotPassword={() => setView('forgot-password')}
          onNavigateToLanding={() => setView('landing')}
        />
      );
    case 'register':
      return (
        <RegisterPage
          onNavigateToLogin={() => setView('login')}
          onNavigateToLanding={() => setView('landing')}
        />
      );
    case 'forgot-password':
      return (
        <ForgotPasswordPage
          onNavigateToLogin={() => setView('login')}
        />
      );
    case 'accept-invite':
      return (
        <AcceptInvite
          onNavigateToLogin={() => setView('login')}
        />
      );
  }
}