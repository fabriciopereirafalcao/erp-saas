import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { Package, Calendar, AlertTriangle, CheckCircle2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { projectId } from '../utils/supabase/info';
import { getAccessToken } from '../utils/authFetch';

interface BatchAllocation {
  batchId: string;
  batchNumber: string;
  quantityAllocated: number;
  manufacturingDate?: string;
  expiryDate?: string;
}

interface AvailableBatch {
  id: string;
  batch_number: string;
  manufacturing_date?: string;
  expiry_date?: string;
  current_quantity: number;
  days_to_expiry?: number;
  expiring_soon: boolean;
  status: string;
}

interface BatchAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  quantityNeeded: number;
  currentAllocations?: BatchAllocation[];
  onConfirmAllocations: (allocations: BatchAllocation[]) => void;
  trackBatches: boolean;
  batchFifoAuto: boolean;
}

export function BatchAllocationModal({
  isOpen,
  onClose,
  productId,
  productName,
  quantityNeeded,
  currentAllocations = [],
  onConfirmAllocations,
  trackBatches,
  batchFifoAuto
}: BatchAllocationModalProps) {
  const [availableBatches, setAvailableBatches] = useState<AvailableBatch[]>([]);
  const [allocations, setAllocations] = useState<BatchAllocation[]>(currentAllocations);
  const [loading, setLoading] = useState(false);
  const [manualQuantities, setManualQuantities] = useState<Record<string, string>>({});

  // Buscar lotes disponíveis ao abrir o modal
  useEffect(() => {
    if (isOpen && productId) {
      fetchAvailableBatches();
    }
  }, [isOpen, productId]);

  // Inicializar alocações existentes
  useEffect(() => {
    setAllocations(currentAllocations);
  }, [currentAllocations]);

  const fetchAvailableBatches = async () => {
    setLoading(true);
    try {
      const accessToken = await getAccessToken();

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/api/available-batches/${productId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao buscar lotes disponíveis');
      }

      const data = await response.json();
      setAvailableBatches(data.batches || []);
    } catch (error) {
      console.error('Erro ao buscar lotes:', error);
      toast.error('Erro ao carregar lotes disponíveis');
    } finally {
      setLoading(false);
    }
  };

  const handleFifoAutomatic = async () => {
    setLoading(true);
    try {
      const accessToken = await getAccessToken();

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/api/allocate-batches-fifo`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            productId,
            quantityNeeded
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao alocar lotes automaticamente');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Falha na alocação automática');
      }

      // Converter alocações para o formato do frontend
      const newAllocations: BatchAllocation[] = data.allocations.map((alloc: any) => ({
        batchId: alloc.batch_id,
        batchNumber: alloc.batch_number,
        quantityAllocated: alloc.quantity_allocated,
        manufacturingDate: alloc.manufacturing_date,
        expiryDate: alloc.expiry_date
      }));

      setAllocations(newAllocations);
      toast.success('Lotes alocados automaticamente via FIFO');
    } catch (error: any) {
      console.error('Erro ao alocar via FIFO:', error);
      toast.error(error.message || 'Erro ao alocar lotes automaticamente');
    } finally {
      setLoading(false);
    }
  };

  const handleManualAllocation = (batch: AvailableBatch) => {
    const quantityStr = manualQuantities[batch.id] || '';
    const quantity = parseFloat(quantityStr);

    if (!quantity || quantity <= 0) {
      toast.error('Informe uma quantidade válida');
      return;
    }

    // Verificar quantidade disponível
    const alreadyAllocated = allocations.find(a => a.batchId === batch.id)?.quantityAllocated || 0;
    const availableInBatch = batch.current_quantity - alreadyAllocated;

    if (quantity > availableInBatch) {
      toast.error(`Quantidade indisponível. Máximo: ${availableInBatch.toFixed(3)}`);
      return;
    }

    // Verificar se não ultrapassa a quantidade necessária
    const totalAllocated = allocations.reduce((sum, a) => sum + a.quantityAllocated, 0);
    const remaining = quantityNeeded - totalAllocated;

    if (quantity > remaining) {
      toast.error(`Quantidade excede o necessário. Faltam: ${remaining.toFixed(3)}`);
      return;
    }

    // Adicionar ou atualizar alocação
    const existingIndex = allocations.findIndex(a => a.batchId === batch.id);
    
    if (existingIndex >= 0) {
      const updated = [...allocations];
      updated[existingIndex].quantityAllocated += quantity;
      setAllocations(updated);
    } else {
      setAllocations([...allocations, {
        batchId: batch.id,
        batchNumber: batch.batch_number,
        quantityAllocated: quantity,
        manufacturingDate: batch.manufacturing_date,
        expiryDate: batch.expiry_date
      }]);
    }

    // Limpar campo de quantidade
    setManualQuantities({ ...manualQuantities, [batch.id]: '' });
    toast.success(`${quantity.toFixed(3)} alocado(s) do lote ${batch.batch_number}`);
  };

  const handleRemoveAllocation = (batchId: string) => {
    setAllocations(allocations.filter(a => a.batchId !== batchId));
    toast.info('Alocação removida');
  };

  const handleConfirm = () => {
    const totalAllocated = allocations.reduce((sum, a) => sum + a.quantityAllocated, 0);

    if (totalAllocated === 0) {
      toast.error('Nenhum lote foi alocado');
      return;
    }

    if (Math.abs(totalAllocated - quantityNeeded) > 0.001) {
      toast.error(`Quantidade alocada (${totalAllocated.toFixed(3)}) difere da necessária (${quantityNeeded.toFixed(3)})`);
      return;
    }

    onConfirmAllocations(allocations);
    onClose();
  };

  const totalAllocated = allocations.reduce((sum, a) => sum + a.quantityAllocated, 0);
  const remaining = quantityNeeded - totalAllocated;
  const isComplete = Math.abs(remaining) < 0.001;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Alocar Lotes - {productName}
          </DialogTitle>
          <DialogDescription>
            Quantidade necessária: <span className="font-semibold">{quantityNeeded.toFixed(3)}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Status da alocação */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Total Necessário</p>
            <p className="text-xl font-semibold">{quantityNeeded.toFixed(3)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Alocado</p>
            <p className={`text-xl font-semibold ${isComplete ? 'text-green-600' : 'text-orange-600'}`}>
              {totalAllocated.toFixed(3)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Faltando</p>
            <p className={`text-xl font-semibold ${isComplete ? 'text-green-600' : 'text-red-600'}`}>
              {remaining.toFixed(3)}
            </p>
          </div>
        </div>

        {/* Botão FIFO Automático */}
        {batchFifoAuto && (
          <Button
            onClick={handleFifoAutomatic}
            disabled={loading || allocations.length > 0}
            className="w-full"
            variant="outline"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Alocar Automaticamente (FIFO)
          </Button>
        )}

        {/* Alocações atuais */}
        {allocations.length > 0 && (
          <div className="space-y-2">
            <Label>Alocações Confirmadas</Label>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lote</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Fabricação</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocations.map((allocation) => (
                    <TableRow key={allocation.batchId}>
                      <TableCell className="font-medium">{allocation.batchNumber}</TableCell>
                      <TableCell>{allocation.quantityAllocated.toFixed(3)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {allocation.manufacturingDate 
                          ? format(new Date(allocation.manufacturingDate), "dd/MM/yyyy", { locale: ptBR })
                          : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {allocation.expiryDate 
                          ? format(new Date(allocation.expiryDate), "dd/MM/yyyy", { locale: ptBR })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAllocation(allocation.batchId)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Lotes disponíveis */}
        <div className="space-y-2">
          <Label>Lotes Disponíveis - Alocação Manual</Label>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando lotes...</div>
          ) : availableBatches.length === 0 ? (
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                Nenhum lote disponível para este produto
              </AlertDescription>
            </Alert>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lote</TableHead>
                    <TableHead>Disponível</TableHead>
                    <TableHead>Fabricação</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Alocar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableBatches.map((batch) => {
                    const alreadyAllocated = allocations.find(a => a.batchId === batch.id)?.quantityAllocated || 0;
                    const availableInBatch = batch.current_quantity - alreadyAllocated;

                    return (
                      <TableRow key={batch.id}>
                        <TableCell className="font-medium">{batch.batch_number}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div>{availableInBatch.toFixed(3)}</div>
                            {alreadyAllocated > 0 && (
                              <div className="text-xs text-muted-foreground">
                                ({alreadyAllocated.toFixed(3)} já alocado)
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {batch.manufacturing_date 
                            ? format(new Date(batch.manufacturing_date), "dd/MM/yyyy", { locale: ptBR })
                            : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {batch.expiry_date ? (
                            <div className="space-y-1">
                              <div>{format(new Date(batch.expiry_date), "dd/MM/yyyy", { locale: ptBR })}</div>
                              {batch.days_to_expiry !== null && batch.days_to_expiry !== undefined && (
                                <div className={`text-xs ${batch.expiring_soon ? 'text-red-600' : 'text-muted-foreground'}`}>
                                  {batch.days_to_expiry > 0 
                                    ? `${batch.days_to_expiry} dias`
                                    : batch.days_to_expiry === 0 
                                    ? 'Vence hoje'
                                    : 'Vencido'}
                                </div>
                              )}
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {batch.expiring_soon ? (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Vence em breve
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Normal
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="0.001"
                              min="0"
                              max={availableInBatch}
                              placeholder="Qtd"
                              value={manualQuantities[batch.id] || ''}
                              onChange={(e) => setManualQuantities({
                                ...manualQuantities,
                                [batch.id]: e.target.value
                              })}
                              className="w-24"
                              disabled={availableInBatch <= 0}
                            />
                            <Button
                              size="sm"
                              onClick={() => handleManualAllocation(batch)}
                              disabled={availableInBatch <= 0 || isComplete}
                            >
                              <Package className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!isComplete || loading}
          >
            {isComplete ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Confirmar Alocações
              </>
            ) : (
              <>Alocar Restante ({remaining.toFixed(3)})</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}