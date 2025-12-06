import { useState, useEffect } from 'react';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { LandingPage } from '../LandingPage';

type AuthView = 'landing' | 'login' | 'register' | 'forgot-password';

export function AuthFlow() {
  // ✅ Detectar se deve iniciar na tela de cadastro via URL param
  const getInitialView = (): AuthView => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('signup') === 'true') {
      return 'register';
    }
    return 'landing';
  };

  const [view, setView] = useState<AuthView>(getInitialView);

  // ✅ Limpar parâmetro signup=true da URL quando mudar de view
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
  }
}