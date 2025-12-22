import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { AlertCircle, Package, Truck, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { useERP } from '../contexts/ERPContext';
import { projectId } from '../utils/supabase/info';
import { getAccessToken } from '../utils/authFetch';
import { BatchAllocationModal } from './BatchAllocationModal';
import type { BatchAllocation } from '../contexts/ERPContext';

interface SalesOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountType?: string;
  discountAmount?: number;
  subtotal: number;
}

interface SalesOrder {
  id: string;
  uuid?: string; // ✅ UUID real do banco para chamadas API
  orderNumber?: string;
  customer: string;
  productName: string;
  quantity: number;
  totalAmount: number;
  items?: SalesOrderItem[];
}

interface ItemAllocationConfig {
  productId: string;
  quantity: number;
  allocations?: BatchAllocation[];
}

interface ShipSalesOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: SalesOrder | null;
  onSuccess: () => void;
}

export function ShipSalesOrderModal({
  isOpen,
  onClose,
  order,
  onSuccess
}: ShipSalesOrderModalProps) {
  const { inventory, updateSalesOrderStatus } = useERP();
  const [isLoading, setIsLoading] = useState(false);
  const [itemsConfig, setItemsConfig] = useState<Record<string, ItemAllocationConfig>>({});
  
  // Estados para BatchAllocationModal
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [currentProductForBatch, setCurrentProductForBatch] = useState<{
    id: string;
    name: string;
    quantity: number;
    trackBatches: boolean;
    batchFifoAuto: boolean;
  } | null>(null);

  // Determinar itens do pedido (suporte a multi-item e single-item)
  const orderItems: SalesOrderItem[] = order?.items && order.items.length > 0
    ? order.items
    : order
    ? [{
        productId: '', // Será resolvido abaixo
        productName: order.productName,
        quantity: order.quantity,
        unitPrice: order.totalAmount / order.quantity,
        subtotal: order.totalAmount
      }]
    : [];

  // Reset ao abrir modal
  useEffect(() => {
    if (isOpen && order) {
      console.log('[SHIP-MODAL] 🔍 Abrindo modal para pedido:', order.id);
      
      // Inicializar configurações dos itens
      const initialConfig: Record<string, ItemAllocationConfig> = {};
      
      orderItems.forEach((item) => {
        const product = inventory.find(p => 
          p.productName === item.productName || p.id === item.productId
        );
        
        if (product) {
          initialConfig[product.id] = {
            productId: product.id,
            quantity: item.quantity,
            allocations: product.trackBatches ? [] : undefined
          };
        }
      });

      setItemsConfig(initialConfig);
    }
  }, [isOpen, order, inventory]);

  // Abrir modal de alocação de lotes
  const openBatchAllocation = (productId: string) => {
    const product = inventory.find(p => p.id === productId);
    if (!product) return;

    const config = itemsConfig[productId];
    if (!config) return;

    setCurrentProductForBatch({
      id: product.id,
      name: product.productName,
      quantity: config.quantity,
      trackBatches: product.trackBatches || false,
      batchFifoAuto: product.batchFifoAuto || false
    });
    setIsBatchModalOpen(true);
  };

  // Confirmar alocações do modal de lotes
  const handleConfirmAllocations = (allocations: BatchAllocation[]) => {
    if (!currentProductForBatch) return;

    setItemsConfig(prev => ({
      ...prev,
      [currentProductForBatch.id]: {
        ...prev[currentProductForBatch.id],
        allocations
      }
    }));

    setIsBatchModalOpen(false);
    setCurrentProductForBatch(null);
  };

  // Validar formulário
  const validateForm = (): boolean => {
    for (const item of orderItems) {
      const product = inventory.find(p => p.productName === item.productName || p.id === item.productId);
      if (!product) {
        toast.error(`Produto "${item.productName}" não encontrado no inventário`);
        return false;
      }

      const config = itemsConfig[product.id];
      if (!config) {
        toast.error(`Configuração não encontrada para ${product.productName}`);
        return false;
      }

      // Validar alocações para produtos com controle de lote
      if (product.trackBatches) {
        if (!config.allocations || config.allocations.length === 0) {
          toast.error(`Aloque lotes para ${product.productName}`);
          return false;
        }

        const totalAllocated = config.allocations.reduce((sum, a) => sum + a.quantityAllocated, 0);
        if (totalAllocated !== config.quantity) {
          toast.error(`Alocação incompleta para ${product.productName}: ${totalAllocated}/${config.quantity}`);
          return false;
        }
      } else {
        // Validar estoque disponível para produtos sem lote
        if (product.currentStock < config.quantity) {
          toast.error(`Estoque insuficiente para ${product.productName}: disponível ${product.currentStock}, solicitado ${config.quantity}`);
          return false;
        }
      }
    }

    return true;
  };

  // Confirmar expedição
  const handleConfirm = async () => {
    if (!order) return;

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      console.log('[SHIP-MODAL] 📦 Enviando expedição...');

      // Preparar dados dos itens
      const items = orderItems.map((item) => {
        const product = inventory.find(p => p.productName === item.productName || p.id === item.productId);
        if (!product) throw new Error(`Produto ${item.productName} não encontrado`);

        const config = itemsConfig[product.id];
        if (!config) throw new Error(`Configuração não encontrada para ${product.productName}`);

        return {
          productId: product.id,
          quantity: config.quantity,
          allocations: config.allocations || []
        };
      });

      // Chamar endpoint de expedição
      const token = await getAccessToken();
      const orderId = order.uuid || order.id; // ✅ Usar UUID se disponível, senão fallback para id
      console.log('[SHIP-MODAL] 🔍 DEBUG:', { 
        orderIdDisplay: order.id, 
        orderUUID: order.uuid, 
        usingOrderId: orderId,
        fullOrder: order 
      });
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/api/sales-orders/${orderId}/ship`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ items })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao expedir pedido');
      }

      const result = await response.json();
      console.log('[SHIP-MODAL] ✅ Pedido expedido com sucesso:', result);

      // ✅ Atualizar status do pedido (cria transação financeira + atualiza histórico)
      // IMPORTANTE: Backend já criou stock_movements, então passamos skipStockUpdate=true
      console.log('[SHIP-MODAL] 🔄 Atualizando status do pedido para "Enviado"...');
      updateSalesOrderStatus(orderId, 'Enviado', 'Sistema', false, true);
      console.log('[SHIP-MODAL] ✅ Status atualizado e transação financeira criada');

      toast.success('Pedido expedido com sucesso!', {
        description: `${result.data.itemsProcessed} item(ns) processado(s), ${result.data.batchesProcessed} lote(s) consumido(s)`
      });

      // ✅ Chamar onSuccess para fechar modal e atualizar lista
      onSuccess();
      onClose();
      
    } catch (error: any) {
      console.error('[SHIP-MODAL] ❌ Erro ao expedir pedido:', error);
      toast.error(error.message || 'Erro ao expedir pedido');
    } finally {
      setIsLoading(false);
    }
  };

  if (!order) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Expedir Pedido de Venda - {order.id}
            </DialogTitle>
            <DialogDescription>
              Configure a alocação de lotes para cada item do pedido
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Informações do Pedido */}
            <Alert>
              <AlertDescription>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Cliente:</span> {order.customer}
                  </div>
                  <div>
                    <span className="font-medium">Total:</span> R$ {order.totalAmount.toFixed(2)}
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {/* Lista de Itens */}
            <div className="space-y-4">
              <h3 className="font-medium">Itens do Pedido</h3>
              
              {orderItems.map((item) => {
                const product = inventory.find(p => 
                  p.productName === item.productName || p.id === item.productId
                );
                
                if (!product) {
                  return (
                    <Alert key={item.productName} variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Produto "{item.productName}" não encontrado no inventário
                      </AlertDescription>
                    </Alert>
                  );
                }

                const config = itemsConfig[product.id];
                const hasAllocations = config?.allocations && config.allocations.length > 0;
                const totalAllocated = config?.allocations?.reduce((sum, a) => sum + a.quantityAllocated, 0) || 0;

                return (
                  <Card key={product.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{product.productName}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">
                              Quantidade: {item.quantity}
                            </Badge>
                            {product.trackBatches && (
                              <Badge variant="secondary">
                                Controle de Lote
                              </Badge>
                            )}
                            <Badge variant="outline">
                              Estoque: {product.currentStock}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Produto com Controle de Lote */}
                      {product.trackBatches && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>Alocação de Lotes</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openBatchAllocation(product.id)}
                            >
                              {hasAllocations ? 'Editar Alocação' : 'Alocar Lotes'}
                            </Button>
                          </div>

                          {hasAllocations && (
                            <Alert>
                              <CheckCircle2 className="h-4 w-4" />
                              <AlertDescription>
                                <div className="space-y-1">
                                  <div>
                                    <strong>Alocado:</strong> {totalAllocated}/{item.quantity} unidades
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    {config.allocations!.map((a, i) => (
                                      <div key={i}>
                                        • Lote {a.batchNumber}: {a.quantityAllocated} unidades
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      )}

                      {/* Produto sem Controle de Lote */}
                      {!product.trackBatches && (
                        <div className="space-y-2">
                          <Label>Quantidade</Label>
                          <Input
                            type="number"
                            value={config?.quantity || item.quantity}
                            disabled
                            className="w-32"
                          />
                          {product.currentStock < item.quantity && (
                            <Alert variant="destructive">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                Estoque insuficiente! Disponível: {product.currentStock}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={isLoading}>
              {isLoading ? 'Expedindo...' : 'Confirmar Expedição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Alocação de Lotes */}
      {currentProductForBatch && (
        <BatchAllocationModal
          isOpen={isBatchModalOpen}
          onClose={() => {
            setIsBatchModalOpen(false);
            setCurrentProductForBatch(null);
          }}
          productId={currentProductForBatch.id}
          productName={currentProductForBatch.name}
          quantityNeeded={currentProductForBatch.quantity}
          currentAllocations={itemsConfig[currentProductForBatch.id]?.allocations || []}
          onConfirmAllocations={handleConfirmAllocations}
          trackBatches={currentProductForBatch.trackBatches}
          batchFifoAuto={currentProductForBatch.batchFifoAuto}
        />
      )}
    </>
  );
}
