import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSubscription } from "../../contexts/SubscriptionContext";
import { PLAN_CONFIG } from "../../lib/plans";

interface UsageAlert {
  type: "users" | "products" | "customers" | "nfe" | "transactions";
  percentage: number;
  current: number;
  limit: number;
  shown: boolean;
}

export function SubscriptionAlerts() {
  const { subscription } = useSubscription();
  const [shownAlerts, setShownAlerts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!subscription) return;

    const plan = PLAN_CONFIG[subscription.planId];
    const usage = subscription.usage;

    const alerts: UsageAlert[] = [];

    // Verificar cada limite
    const checkLimit = (
      type: "users" | "products" | "customers" | "nfe" | "transactions",
      label: string
    ) => {
      const limit = plan.limits[type === "nfe" ? "invoices" : type];
      if (limit === null) return; // Ilimitado

      const current = usage[type] || 0;
      const percentage = (current / limit) * 100;

      // Alertas em 80%, 90%, 100%
      if (percentage >= 100 && !shownAlerts[`${type}-100`]) {
        alerts.push({ type, percentage, current, limit, shown: false });
        setShownAlerts((prev) => ({ ...prev, [`${type}-100`]: true }));
      } else if (percentage >= 90 && percentage < 100 && !shownAlerts[`${type}-90`]) {
        alerts.push({ type, percentage, current, limit, shown: false });
        setShownAlerts((prev) => ({ ...prev, [`${type}-90`]: true }));
      } else if (percentage >= 80 && percentage < 90 && !shownAlerts[`${type}-80`]) {
        alerts.push({ type, percentage, current, limit, shown: false });
        setShownAlerts((prev) => ({ ...prev, [`${type}-80`]: true }));
      }
    };

    checkLimit("users", "Usuários");
    checkLimit("products", "Produtos");
    checkLimit("customers", "Clientes");
    checkLimit("nfe", "NF-e");
    checkLimit("transactions", "Transações");

    // Mostrar alertas
    alerts.forEach((alert) => {
      const labels: Record<typeof alert.type, string> = {
        users: "Usuários",
        products: "Produtos",
        customers: "Clientes",
        nfe: "NF-e",
        transactions: "Transações",
      };

      const label = labels[alert.type];

      if (alert.percentage >= 100) {
        toast.error(
          `⚠️ Limite de ${label} Atingido!`,
          {
            description: `Você atingiu o limite de ${alert.limit} ${label.toLowerCase()} do seu plano. Faça upgrade para continuar.`,
            duration: 10000,
          }
        );
      } else if (alert.percentage >= 90) {
        toast.warning(
          `⚠️ Limite de ${label} Quase Atingido!`,
          {
            description: `Você usou ${alert.current} de ${alert.limit} ${label.toLowerCase()} (${alert.percentage.toFixed(0)}%). Considere fazer upgrade.`,
            duration: 8000,
          }
        );
      } else if (alert.percentage >= 80) {
        toast.info(
          `📊 Alerta de Uso: ${label}`,
          {
            description: `Você usou ${alert.current} de ${alert.limit} ${label.toLowerCase()} (${alert.percentage.toFixed(0)}%).`,
            duration: 6000,
          }
        );
      }
    });
  }, [subscription, shownAlerts]);

  // Verificar trial expirando
  useEffect(() => {
    if (!subscription || subscription.status !== "trial" || !subscription.trialEnd) return;

    const trialEnd = new Date(subscription.trialEnd);
    const now = new Date();
    const daysLeft = Math.floor((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Alerta 3 dias antes
    if (daysLeft === 3 && !shownAlerts["trial-3-days"]) {
      toast.warning(
        "⏰ Trial Terminando em Breve!",
        {
          description: `Faltam apenas ${daysLeft} dias para o fim do seu período de avaliação. Faça upgrade para continuar.`,
          duration: 10000,
        }
      );
      setShownAlerts((prev) => ({ ...prev, "trial-3-days": true }));
    }

    // Alerta 1 dia antes
    if (daysLeft === 1 && !shownAlerts["trial-1-day"]) {
      toast.error(
        "🚨 Trial Termina Amanhã!",
        {
          description: "Seu período de avaliação termina amanhã. Faça upgrade agora para não perder acesso.",
          duration: 15000,
        }
      );
      setShownAlerts((prev) => ({ ...prev, "trial-1-day": true }));
    }

    // Alerta trial expirado
    if (daysLeft <= 0 && !shownAlerts["trial-expired"]) {
      toast.error(
        "❌ Trial Expirado!",
        {
          description: "Seu período de avaliação terminou. Faça upgrade para continuar usando o sistema.",
          duration: 20000,
        }
      );
      setShownAlerts((prev) => ({ ...prev, "trial-expired": true }));
    }
  }, [subscription, shownAlerts]);

  // Este componente não renderiza nada, apenas gerencia os alertas
  return null;
}
