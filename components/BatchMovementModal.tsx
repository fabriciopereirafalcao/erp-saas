import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { toast } from 'sonner';
import { AlertCircle, Package, Plus } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { formatDateLocal } from '../utils/dateUtils';

interface Batch {
  id: string;
  batchNumber: string;
  currentQuantity: number;
  expiryDate?: string;
  manufacturingDate?: string;
  locationName?: string;
  status: string;
}

interface Product {
  id: string;
  productName: string;
  sku: string;
  trackBatches: boolean;
  batchFifoAuto: boolean;
}

interface BatchMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  movementType: 'entrada-producao' | 'entrada-devolucao' | 'entrada-ajuste' | 'saida-perda' | 'saida-doacao' | 'saida-ajuste' | 'saida-consumo';
  quantity: number;
  onConfirm: (batchData: any) => void;
  availableBatches: Batch[];
}

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  'entrada-producao': 'Entrada - Produção',
  'entrada-devolucao': 'Entrada - Devolução',
  'entrada-ajuste': 'Entrada - Ajuste Inventário',
  'saida-perda': 'Saída - Perda',
  'saida-doacao': 'Saída - Doação',
  'saida-ajuste': 'Saída - Ajuste Inventário',
  'saida-consumo': 'Saída - Consumo Interno'
};

const MOVEMENT_TYPE_ACTIONS: Record<string, 'create' | 'update'> = {
  'entrada-producao': 'create',
  'entrada-devolucao': 'update',
  'entrada-ajuste': 'update',
  'saida-perda': 'update',
  'saida-doacao': 'update',
  'saida-ajuste': 'update',
  'saida-consumo': 'update'
};

export function BatchMovementModal({
  isOpen,
  onClose,
  product,
  movementType,
  quantity,
  onConfirm,
  availableBatches
}: BatchMovementModalProps) {
  const [mode, setMode] = useState<'create' | 'select'>('select');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [newBatch, setNewBatch] = useState({
    batchNumber: '',
    manufacturingDate: '',
    expiryDate: '',
    locationName: '',
    notes: ''
  });

  const action = movementType ? MOVEMENT_TYPE_ACTIONS[movementType] : 'update';
  const isEntradaProducao = movementType === 'entrada-producao';
  const isEntrada = movementType?.startsWith('entrada');
  const isSaida = movementType?.startsWith('saida');

  // Reset ao abrir modal
  useEffect(() => {
    if (isOpen) {
      console.log('[BATCH_MODAL] 🔍 Abrindo modal com lotes:', availableBatches);
      console.log('[BATCH_MODAL] 📊 Quantidade de lotes:', availableBatches.length);
      if (availableBatches.length > 0) {
        console.log('[BATCH_MODAL] 📦 Primeiro lote:', JSON.stringify(availableBatches[0], null, 2));
      }
      
      if (isEntradaProducao) {
        setMode('create');
      } else {
        setMode('select');
      }
      setSelectedBatchId('');
      setNewBatch({
        batchNumber: '',
        manufacturingDate: '',
        expiryDate: '',
        locationName: '',
        notes: ''
      });
    }
  }, [isOpen, isEntradaProducao, availableBatches]);

  const handleConfirm = () => {
    if (mode === 'create') {
      // Validar novo lote
      if (!newBatch.batchNumber.trim()) {
        toast.error('Código do lote é obrigatório');
        return;
      }

      onConfirm({
        mode: 'create',
        batch: {
          batchNumber: newBatch.batchNumber.trim(),
          manufacturingDate: newBatch.manufacturingDate || null,
          expiryDate: newBatch.expiryDate || null,
          locationName: newBatch.locationName.trim() || null,
          notes: newBatch.notes.trim() || null
        }
      });
    } else {
      // Validar seleção de lote existente
      if (!selectedBatchId) {
        toast.error('Selecione um lote');
        return;
      }

      const selectedBatch = availableBatches.find(b => b.id === selectedBatchId);
      if (!selectedBatch) {
        toast.error('Lote não encontrado');
        return;
      }

      // Validar quantidade para saídas
      if (isSaida && selectedBatch.currentQuantity < quantity) {
        toast.error(`Lote selecionado tem apenas ${selectedBatch.currentQuantity} unidades disponíveis`);
        return;
      }

      onConfirm({
        mode: 'select',
        batchId: selectedBatchId,
        batch: selectedBatch
      });
    }
  };

  const selectedBatch = availableBatches.find(b => b.id === selectedBatchId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Controle de Lotes - {MOVEMENT_TYPE_LABELS[movementType]}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do Produto */}
          <Alert>
            <AlertDescription>
              <div className="space-y-1">
                <div><strong>Produto:</strong> {product?.productName}</div>
                <div><strong>SKU:</strong> {product?.sku}</div>
                <div><strong>Quantidade a movimentar:</strong> {quantity} un</div>
                <div><strong>Tipo:</strong> {MOVEMENT_TYPE_LABELS[movementType]}</div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Modo: Criar Novo ou Selecionar Existente */}
          {!isEntradaProducao && (
            <div className="space-y-2">
              <Label>Escolha uma opção:</Label>
              <RadioGroup value={mode} onValueChange={(value: any) => setMode(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="select" id="select" />
                  <Label htmlFor="select" className="cursor-pointer">
                    Usar lote existente (seleção manual)
                  </Label>
                </div>
                {isEntrada && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="create" id="create" />
                    <Label htmlFor="create" className="cursor-pointer">
                      Criar novo lote
                    </Label>
                  </div>
                )}
              </RadioGroup>
            </div>
          )}

          {isEntradaProducao && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Entrada - Produção:</strong> Um novo lote será criado automaticamente.
              </AlertDescription>
            </Alert>
          )}

          {/* MODO: SELECIONAR LOTE EXISTENTE */}
          {mode === 'select' && (
            <div className="space-y-3">
              <Label>Selecione o Lote</Label>
              
              {availableBatches.length === 0 ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Nenhum lote cadastrado para este produto. {isEntrada ? 'Crie um novo lote.' : 'Não é possível fazer saída sem lotes.'}
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um lote" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBatches.map(batch => (
                        <SelectItem key={batch.id} value={batch.id}>
                          {batch.batchNumber || 'Sem código'} - Estoque: {batch.currentQuantity ?? 0} un
                          {batch.expiryDate && ` - Validade: ${formatDateLocal(batch.expiryDate)}`}
                          {batch.status && batch.status !== 'Ativo' && ` - ${batch.status}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Detalhes do lote selecionado */}
                  {selectedBatch && (
                    <div className="p-3 bg-muted rounded-md space-y-1 text-sm">
                      <div><strong>Lote:</strong> {selectedBatch.batchNumber}</div>
                      <div><strong>Estoque Atual:</strong> {selectedBatch.currentQuantity} un</div>
                      {selectedBatch.manufacturingDate && (
                        <div><strong>Fabricação:</strong> {formatDateLocal(selectedBatch.manufacturingDate)}</div>
                      )}
                      {selectedBatch.expiryDate && (
                        <div><strong>Validade:</strong> {formatDateLocal(selectedBatch.expiryDate)}</div>
                      )}
                      {selectedBatch.locationName && (
                        <div><strong>Localização:</strong> {selectedBatch.locationName}</div>
                      )}
                      <div><strong>Status:</strong> {selectedBatch.status}</div>
                      
                      {/* Validação de quantidade */}
                      {isSaida && selectedBatch.currentQuantity < quantity && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            ⚠️ Estoque insuficiente! Disponível: {selectedBatch.currentQuantity} un
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* MODO: CRIAR NOVO LOTE */}
          {mode === 'create' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Plus className="h-4 w-4" />
                Dados do Novo Lote
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="batchNumber">Código do Lote *</Label>
                  <Input
                    id="batchNumber"
                    value={newBatch.batchNumber}
                    onChange={(e) => setNewBatch({ ...newBatch, batchNumber: e.target.value })}
                    placeholder="Ex: LOTE-2024-001"
                  />
                </div>

                <div>
                  <Label htmlFor="locationName">Localização</Label>
                  <Input
                    id="locationName"
                    value={newBatch.locationName}
                    onChange={(e) => setNewBatch({ ...newBatch, locationName: e.target.value })}
                    placeholder="Ex: Prateleira A1"
                  />
                </div>

                <div>
                  <Label htmlFor="manufacturingDate">Data de Fabricação</Label>
                  <Input
                    id="manufacturingDate"
                    type="date"
                    value={newBatch.manufacturingDate}
                    onChange={(e) => setNewBatch({ ...newBatch, manufacturingDate: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="expiryDate">Data de Validade</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={newBatch.expiryDate}
                    onChange={(e) => setNewBatch({ ...newBatch, expiryDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Observações</Label>
                <Input
                  id="notes"
                  value={newBatch.notes}
                  onChange={(e) => setNewBatch({ ...newBatch, notes: e.target.value })}
                  placeholder="Informações adicionais sobre o lote"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={
              (mode === 'select' && !selectedBatchId) ||
              (mode === 'select' && isSaida && selectedBatch && selectedBatch.currentQuantity < quantity)
            }
          >
            {mode === 'create' ? 'Criar Lote e Confirmar' : 'Confirmar Movimentação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}