import { Card } from "../ui/card";
import { Progress } from "../ui/progress";
import { AlertTriangle, TrendingUp } from "lucide-react";

interface UsageProgressCardProps {
  label: string;
  current: number;
  limit: number | null;
  icon?: React.ReactNode;
  color?: string;
}

export function UsageProgressCard({
  label,
  current,
  limit,
  icon,
  color = "bg-blue-500",
}: UsageProgressCardProps) {
  // Se for ilimitado
  if (limit === null) {
    return (
      <Card className="p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-gray-700">{label}</span>
          </div>
          <span className="text-green-600">Ilimitado</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="size-4 text-green-500" />
          <span className="text-2xl">{current.toLocaleString()}</span>
        </div>
      </Card>
    );
  }

  // Calcular porcentagem
  const percentage = Math.min((current / limit) * 100, 100);
  const isWarning = percentage >= 80;
  const isCritical = percentage >= 90;
  const isOverLimit = current >= limit;

  // Determinar cor
  let progressColor = color;
  if (isOverLimit || isCritical) {
    progressColor = "bg-red-500";
  } else if (isWarning) {
    progressColor = "bg-yellow-500";
  }

  return (
    <Card className="p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-gray-700">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {isOverLimit && <AlertTriangle className="size-4 text-red-500" />}
          <span
            className={`${
              isOverLimit || isCritical
                ? "text-red-600"
                : isWarning
                  ? "text-yellow-600"
                  : "text-gray-900"
            }`}
          >
            {current} / {limit}
          </span>
        </div>
      </div>

      <Progress value={percentage} className="h-2 mb-2" indicatorColor={progressColor} />

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">{percentage.toFixed(0)}% usado</span>
        {isOverLimit && (
          <span className="text-red-600 font-medium">Limite excedido!</span>
        )}
        {!isOverLimit && isWarning && (
          <span className="text-yellow-600 font-medium">Próximo ao limite</span>
        )}
      </div>
    </Card>
  );
}
