import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

interface SettlementDateWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  warning: {
    accountName: string;
    accountStartDate: string;
    settlementDate: string;
  };
}

export function SettlementDateWarningDialog({
  open,
  onOpenChange,
  onConfirm,
  warning
}: SettlementDateWarningDialogProps) {
  const formatDate = (dateStr: string) => {
    try {
      // ✅ Parse manual para evitar problema de timezone
      // dateStr vem no formato "YYYY-MM-DD"
      const [year, month, day] = dateStr.split('-').map(Number);
      return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const daysDifference = (() => {
    try {
      // ✅ Parse manual para calcular diferença sem problema de timezone
      const [y1, m1, d1] = warning.accountStartDate.split('-').map(Number);
      const [y2, m2, d2] = warning.settlementDate.split('-').map(Number);
      const date1 = new Date(y1, m1 - 1, d1);
      const date2 = new Date(y2, m2 - 1, d2);
      return Math.abs(Math.floor((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24)));
    } catch {
      return 1;
    }
  })();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <AlertDialogTitle className="text-lg">
                ⚠️ Data Anterior ao Início da Conta
              </AlertDialogTitle>
            </div>
          </div>
          <AlertDialogDescription className="space-y-3 text-base">
            <p>
              A data de liquidação <strong className="text-orange-600">{formatDate(warning.settlementDate)}</strong> é 
              anterior à data de início da conta <strong>"{warning.accountName}"</strong> ({formatDate(warning.accountStartDate)}).
            </p>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2">
              <p className="text-sm text-orange-800">
                <strong>⚠️ Consequências:</strong>
              </p>
              <ul className="text-sm text-orange-700 space-y-1 list-disc list-inside">
                <li>Esta transação <strong>não aparecerá</strong> nos relatórios de conciliação para períodos anteriores a {formatDate(warning.accountStartDate)}</li>
                <li>O saldo será zerado para datas anteriores ao início da conta</li>
                <li>A diferença é de <strong>{daysDifference} dia{daysDifference !== 1 ? 's' : ''}</strong></li>
              </ul>
            </div>

            <p className="text-sm text-gray-600">
              <strong>Recomendação:</strong> Ajuste a data de início da conta ou a data de liquidação para manter a consistência dos relatórios.
            </p>

            <p className="text-sm font-medium text-gray-900">
              Deseja continuar mesmo assim?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-orange-600 hover:bg-orange-700"
          >
            Confirmar Liquidação
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
