import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Clock, User, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { StatusHistoryEntry } from "../contexts/ERPContext";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface StatusHistoryTimelineProps {
  history: StatusHistoryEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
}

export function StatusHistoryTimeline({ history, open, onOpenChange, orderId }: StatusHistoryTimelineProps) {
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      "Processando": "bg-blue-100 text-blue-700 border-blue-300",
      "Confirmado": "bg-purple-100 text-purple-700 border-purple-300",
      "Enviado": "bg-yellow-100 text-yellow-700 border-yellow-300",
      "Entregue": "bg-green-100 text-green-700 border-green-300",
      "Pago": "bg-emerald-100 text-emerald-700 border-emerald-300",
      "Cancelado": "bg-red-100 text-red-700 border-red-300"
    };
    return colors[status] || "bg-gray-100 text-gray-700 border-gray-300";
  };

  const getActionIcon = (action: string) => {
    if (action.startsWith("✅")) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (action.startsWith("⚠️")) return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    if (action.startsWith("ℹ️")) return <AlertCircle className="w-4 h-4 text-blue-600" />;
    return <CheckCircle className="w-4 h-4 text-gray-600" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Histórico de Status - Pedido {orderId}</DialogTitle>
          <DialogDescription>
            Timeline completa de alterações de status e ações executadas automaticamente
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[600px] pr-4">
          <div className="relative">
            {/* Timeline vertical */}
            <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-gray-200" />

            {/* Entradas do histórico */}
            <div className="space-y-6">
              {history.map((entry, index) => (
                <div key={entry.id} className="relative pl-10">
                  {/* Marcador da timeline */}
                  <div className="absolute left-0 w-8 h-8 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center">
                    <Clock className="w-4 h-4 text-gray-600" />
                  </div>

                  {/* Card de entrada */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    {/* Cabeçalho */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {entry.previousStatus && (
                            <>
                              <Badge className={getStatusColor(entry.previousStatus)}>
                                {entry.previousStatus}
                              </Badge>
                              <span className="text-gray-400">→</span>
                            </>
                          )}
                          <Badge className={getStatusColor(entry.newStatus)}>
                            {entry.newStatus}
                          </Badge>
                          {entry.isExceptional && (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
                              Modo Excepcional
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <User className="w-3 h-3" />
                          <span>{entry.user}</span>
                          <span>•</span>
                          <span>
                            {format(parseISO(entry.timestamp), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Ações executadas */}
                    {entry.actionsExecuted.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">Ações Executadas:</p>
                        <div className="space-y-1.5">
                          {entry.actionsExecuted.map((action, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                              {getActionIcon(action)}
                              <span className="flex-1">{action}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* IDs gerados */}
                    {entry.generatedIds.length > 0 && (
                      <div className="border-t pt-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">Registros Gerados:</p>
                        <div className="flex flex-wrap gap-2">
                          {entry.generatedIds.map((item, idx) => (
                            <Badge key={idx} variant="outline" className="bg-gray-50">
                              {item.type}: {item.id}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notas */}
                    {entry.notes && (
                      <div className="border-t pt-3 mt-3">
                        <p className="text-sm text-gray-600 italic">{entry.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Mensagem se não houver histórico */}
            {history.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Nenhum histórico de status disponível</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
