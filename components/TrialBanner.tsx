import { useAuth } from '../contexts/AuthContext';
import { Alert } from './ui/alert';
import { Clock, CreditCard } from 'lucide-react';
import { Button } from './ui/button';

export function TrialBanner() {
  const { company, profile } = useAuth();

  if (!company || company.status !== 'trial') {
    return null;
  }

  const trialEndsAt = company.trial_ends_at ? new Date(company.trial_ends_at) : null;
  const now = new Date();
  const daysRemaining = trialEndsAt 
    ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  if (daysRemaining <= 0) {
    return (
      <Alert className="m-4 bg-red-50 border-red-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-red-600" />
            <div>
              <p className="text-sm text-red-800">
                <strong>Seu período de trial expirou.</strong> Faça upgrade para continuar usando o sistema.
              </p>
            </div>
          </div>
          <Button size="sm" className="bg-red-600 hover:bg-red-700">
            <CreditCard className="w-4 h-4 mr-2" />
            Fazer Upgrade
          </Button>
        </div>
      </Alert>
    );
  }

  if (daysRemaining <= 3) {
    return (
      <Alert className="m-4 bg-orange-50 border-orange-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-orange-600" />
            <div>
              <p className="text-sm text-orange-800">
                <strong>Atenção!</strong> Seu trial expira em {daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'}. 
                Faça upgrade para não perder o acesso.
              </p>
            </div>
          </div>
          <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
            <CreditCard className="w-4 h-4 mr-2" />
            Fazer Upgrade
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <div className="bg-[rgb(119,247,74)] border-0 mx-4 my-0 px-6 py-3 rounded-[2px]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-black">
          <span className="uppercase tracking-wide font-bold">
            {profile?.name?.toUpperCase() || 'USUÁRIO'}
          </span>
          <span className="font-normal">
            {daysRemaining} {daysRemaining === 1 ? 'dia restante' : 'dias restantes'} para conclusão do Teste Grátis
          </span>
        </div>
        <Button 
          className="bg-white text-black hover:bg-gray-100 border-0 shadow-none px-6 py-2 h-auto rounded-md"
        >
          Comprar agora
        </Button>
      </div>
    </div>
  );
}