import { useEffect, useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Clock, AlertCircle } from "lucide-react";

interface TrialCountdownProps {
  trialEnd: string;
  onUpgradeClick: () => void;
}

export function TrialCountdown({ trialEnd, onUpgradeClick }: TrialCountdownProps) {
  const [daysLeft, setDaysLeft] = useState<number>(0);
  const [hoursLeft, setHoursLeft] = useState<number>(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const end = new Date(trialEnd);
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setDaysLeft(0);
        setHoursLeft(0);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      setDaysLeft(days);
      setHoursLeft(hours);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000 * 60); // Atualizar a cada minuto

    return () => clearInterval(interval);
  }, [trialEnd]);

  // Se o trial acabou
  if (daysLeft === 0 && hoursLeft === 0) {
    return (
      <Card className="p-6 border-2 border-red-500 bg-red-50">
        <div className="flex items-start gap-4">
          <AlertCircle className="size-6 text-red-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-red-900 mb-2">Período de Trial Expirado</h3>
            <p className="text-red-700 text-sm mb-4">
              Seu período de avaliação terminou. Faça upgrade agora para continuar usando todos os recursos.
            </p>
            <Button onClick={onUpgradeClick} className="bg-red-600 hover:bg-red-700">
              Fazer Upgrade Agora
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Se faltam 3 dias ou menos
  const isCritical = daysLeft <= 3;

  return (
    <Card
      className={`p-6 border-2 ${
        isCritical
          ? "border-yellow-500 bg-yellow-50"
          : "border-blue-500 bg-blue-50"
      }`}
    >
      <div className="flex items-start gap-4">
        <Clock
          className={`size-6 flex-shrink-0 mt-1 ${
            isCritical ? "text-yellow-600" : "text-blue-600"
          }`}
        />
        <div className="flex-1">
          <h3
            className={`mb-2 ${
              isCritical ? "text-yellow-900" : "text-blue-900"
            }`}
          >
            {isCritical ? "⚠️ Trial Terminando em Breve!" : "🎉 Período de Trial Ativo"}
          </h3>
          <p
            className={`text-sm mb-4 ${
              isCritical ? "text-yellow-700" : "text-blue-700"
            }`}
          >
            {daysLeft > 0 ? (
              <>
                Faltam <strong className="text-lg">{daysLeft}</strong> dia{daysLeft !== 1 ? "s" : ""}{" "}
                {hoursLeft > 0 && (
                  <>
                    e <strong>{hoursLeft}</strong> hora{hoursLeft !== 1 ? "s" : ""}
                  </>
                )}{" "}
                para o fim do seu período de avaliação.
              </>
            ) : (
              <>
                Faltam <strong className="text-lg">{hoursLeft}</strong> hora{hoursLeft !== 1 ? "s" : ""}{" "}
                para o fim do seu período de avaliação.
              </>
            )}
          </p>
          <Button
            onClick={onUpgradeClick}
            className={
              isCritical
                ? "bg-yellow-600 hover:bg-yellow-700"
                : "bg-blue-600 hover:bg-blue-700"
            }
          >
            {isCritical ? "Fazer Upgrade Agora" : "Ver Planos"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
