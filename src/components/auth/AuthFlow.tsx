import { useState } from 'react';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';
import { ForgotPasswordPage } from './ForgotPasswordPage';

type AuthView = 'login' | 'register' | 'forgot-password';

export function AuthFlow() {
  const [view, setView] = useState<AuthView>('login');

  switch (view) {
    case 'login':
      return (
        <LoginPage
          onNavigateToRegister={() => setView('register')}
          onNavigateToForgotPassword={() => setView('forgot-password')}
        />
      );
    case 'register':
      return (
        <RegisterPage
          onNavigateToLogin={() => setView('login')}
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
