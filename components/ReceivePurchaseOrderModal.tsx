import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { toast } from 'sonner';
import { AlertCircle, Package, Plus, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { useERP } from '../contexts/ERPContext';
import { projectId } from '../utils/supabase/info';
import { useAuth } from '../contexts/AuthContext';

interface PurchaseOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountType?: string;
  discountAmount?: number;
  subtotal: number;
}

interface PurchaseOrder {
  id: string;
  uuid?: string; // ✅ NOVO: UUID real do banco para chamadas API
  orderNumber?: string;
  supplier: string;
  productName: string;
  quantity: number;
  totalAmount: number;
  items?: PurchaseOrderItem[];
}

interface BatchData {
  mode: 'create' | 'select';
  batchNumber?: string;
  manufacturingDate?: string;
  expiryDate?: string;
  locationName?: string;
  notes?: string;
  batchId?: string;
}

interface ItemBatchConfig {
  productId: string;
  quantity: number;
  costPrice: number;
  sellPrice: number;
  batch?: BatchData;
}

interface ReceivePurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PurchaseOrder | null;
  onSuccess: () => void;
}

export function ReceivePurchaseOrderModal({
  isOpen,
  onClose,
  order,
  onSuccess
}: ReceivePurchaseOrderModalProps) {
  const { inventory, updatePurchaseOrderStatus } = useERP();
  const { accessToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [itemsConfig, setItemsConfig] = useState<Record<string, ItemBatchConfig>>({});
  const [availableBatches, setAvailableBatches] = useState<Record<string, any[]>>({});
  const [stockLocations, setStockLocations] = useState<any[]>([]); // ✅ NOVO: Localizações de estoque

  // ✅ NOVO: Carregar localizações de estoque
  useEffect(() => {
    const loadStockLocations = async () => {
      if (!accessToken) return;
      
      try {
        console.log('[RECEIVE-MODAL] 📍 Carregando localizações de estoque...');
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/stock-locations`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        const result = await response.json();
        console.log('[RECEIVE-MODAL] 📍 Resposta da API:', result);
        
        if (result.success) {
          console.log('[RECEIVE-MODAL] ✅ Localizações carregadas:', result.data?.length || 0);
          setStockLocations(result.data || []);
        } else {
          console.error('[RECEIVE-MODAL] ❌ Erro ao carregar localizações:', result.error);
        }
      } catch (err: any) {
        console.error('[RECEIVE-MODAL] ❌ Exceção ao carregar localizações:', err);
      }
    };
    
    loadStockLocations();
  }, [accessToken]);

  // Determinar itens do pedido (suporte a multi-item e single-item)
  const orderItems: PurchaseOrderItem[] = order?.items && order.items.length > 0
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
      console.log('[RECEIVE-MODAL] 🔍 Abrindo modal para pedido:', order.id);
      
      // Inicializar configurações dos itens
      const initialConfig: Record<string, ItemBatchConfig> = {};
      
      orderItems.forEach((item) => {
        const product = inventory.find(p => 
          p.productName === item.productName || p.id === item.productId
        );
        
        if (product) {
          initialConfig[product.id] = {
            productId: product.id,
            quantity: item.quantity,
            costPrice: product.costPrice || item.unitPrice,
            sellPrice: product.sellPrice || item.unitPrice * 1.5,
            batch: product.trackBatches
              ? {
                  mode: 'create',
                  batchNumber: '',
                  manufacturingDate: '',
                  expiryDate: '',
                  locationName: '',
                  notes: ''
                }
              : undefined
          };

          // Buscar lotes disponíveis se produto tem controle
          if (product.trackBatches) {
            fetchProductBatches(product.id);
          }
        }
      });

      setItemsConfig(initialConfig);
    }
  }, [isOpen, order, inventory]);

  // Buscar lotes de um produto
  const fetchProductBatches = async (productId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/api/batches?productId=${productId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        console.warn('[RECEIVE-MODAL] ⚠️ Erro ao buscar lotes:', response.status);
        setAvailableBatches(prev => ({ ...prev, [productId]: [] }));
        return;
      }

      const result = await response.json();
      const batches = result.data || [];
      
      setAvailableBatches(prev => ({ ...prev, [productId]: batches }));
      console.log('[RECEIVE-MODAL] ✅ Lotes carregados:', batches.length);
    } catch (error) {
      console.error('[RECEIVE-MODAL] ❌ Erro ao buscar lotes:', error);
      setAvailableBatches(prev => ({ ...prev, [productId]: [] }));
    }
  };

  // Atualizar configuração de um item
  const updateItemConfig = (productId: string, updates: Partial<ItemBatchConfig>) => {
    setItemsConfig(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        ...updates,
        batch: updates.batch ? {
          ...prev[productId]?.batch,
          ...updates.batch
        } : prev[productId]?.batch
      }
    }));
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

      // Validar lotes para produtos com controle
      if (product.trackBatches && config.batch) {
        if (config.batch.mode === 'create') {
          if (!config.batch.batchNumber?.trim()) {
            toast.error(`Código do lote é obrigatório para ${product.productName}`);
            return false;
          }
        } else if (config.batch.mode === 'select') {
          if (!config.batch.batchId) {
            toast.error(`Selecione um lote para ${product.productName}`);
            return false;
          }
        }
      }
    }

    return true;
  };

  // Confirmar recebimento
  const handleConfirm = async () => {
    if (!order) return;

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      console.log('[RECEIVE-MODAL] 📦 Enviando recebimento...');

      // Preparar dados dos itens
      const items = orderItems.map((item) => {
        const product = inventory.find(p => p.productName === item.productName || p.id === item.productId);
        if (!product) throw new Error(`Produto ${item.productName} não encontrado`);

        const config = itemsConfig[product.id];
        if (!config) throw new Error(`Configuração não encontrada para ${product.productName}`);

        return {
          productId: product.id,
          quantity: config.quantity,
          costPrice: config.costPrice,
          sellPrice: config.sellPrice,
          batch: config.batch
        };
      });

      // Chamar endpoint de recebimento
      const orderId = order.uuid || order.id; // ✅ Usar UUID se disponível, senão fallback para id
      console.log('[RECEIVE-MODAL] 🔍 DEBUG:', { 
        orderIdDisplay: order.id, 
        orderUUID: order.uuid, 
        usingOrderId: orderId,
        fullOrder: order 
      });
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/data/api/purchase-orders/${orderId}/receive`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ items })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao receber pedido');
      }

      const result = await response.json();
      console.log('[RECEIVE-MODAL] ✅ Pedido recebido com sucesso:', result);

      // ✅ Atualizar status do pedido (cria transação financeira + atualiza histórico)
      // IMPORTANTE: Backend já criou stock_movements, então passamos skipStockUpdate=true
      // IMPORTANTE: Usar order.id (display ID) para encontrar no Context, não orderId (UUID)
      console.log('[RECEIVE-MODAL] 🔄 Atualizando status do pedido para "Recebido"...');
      updatePurchaseOrderStatus(order.id, 'Recebido', 'Sistema', false, true);
      console.log('[RECEIVE-MODAL] ✅ Status atualizado e transação financeira criada');

      toast.success('Pedido recebido com sucesso!', {
        description: `${result.data.itemsProcessed} item(ns) processado(s), ${result.data.batchesCreated} lote(s) criado(s)`
      });

      // ✅ Chamar onSuccess para fechar modal e atualizar lista
      onSuccess();
      onClose();
      
    } catch (error: any) {
      console.error('[RECEIVE-MODAL] ❌ Erro ao receber pedido:', error);
      toast.error(error.message || 'Erro ao receber pedido');
    } finally {
      setIsLoading(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Receber Pedido de Compra - {order.id}
          </DialogTitle>
          <DialogDescription>
            Configure os detalhes de recebimento para cada item do pedido
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Pedido */}
          <Alert>
            <AlertDescription>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Fornecedor:</strong> {order.supplier}</div>
                <div><strong>Total do Pedido:</strong> R$ {order.totalAmount.toFixed(2)}</div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Lista de Itens */}
          <div className="space-y-4">
            <h3 className="font-medium">Itens do Pedido ({orderItems.length})</h3>

            {orderItems.map((item, index) => {
              const product = inventory.find(p => 
                p.productName === item.productName || p.id === item.productId
              );
              
              if (!product) {
                return (
                  <Alert key={index} variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Produto "{item.productName}" não encontrado no inventário
                    </AlertDescription>
                  </Alert>
                );
              }

              const config = itemsConfig[product.id] || {};
              const batches = availableBatches[product.id] || [];

              return (
                <Card key={product.id} className="p-4">
                  {/* Cabeçalho do Item */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-medium">{product.productName}</h4>
                      <p className="text-sm text-gray-500">
                        Quantidade: {item.quantity} {product.unit}
                      </p>
                    </div>
                    {product.trackBatches && (
                      <Badge variant="outline" className="bg-blue-50">
                        Controle de Lote
                      </Badge>
                    )}
                  </div>

                  {/* Preços */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <Label htmlFor={`cost-${product.id}`}>Custo Unitário</Label>
                      <Input
                        id={`cost-${product.id}`}
                        type="number"
                        step="0.01"
                        value={config.costPrice || ''}
                        onChange={(e) => updateItemConfig(product.id, { 
                          costPrice: parseFloat(e.target.value) || 0 
                        })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`sell-${product.id}`}>Preço de Venda</Label>
                      <Input
                        id={`sell-${product.id}`}
                        type="number"
                        step="0.01"
                        value={config.sellPrice || ''}
                        onChange={(e) => updateItemConfig(product.id, { 
                          sellPrice: parseFloat(e.target.value) || 0 
                        })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Configuração de Lote (se produto tiver controle) */}
                  {product.trackBatches && config.batch && (
                    <div className="space-y-3 pt-3 border-t">
                      <Label>Configuração de Lote</Label>

                      {/* Modo: Criar ou Selecionar */}
                      <RadioGroup 
                        value={config.batch.mode} 
                        onValueChange={(value: 'create' | 'select') => 
                          updateItemConfig(product.id, { 
                            batch: { ...config.batch, mode: value } 
                          })
                        }
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="create" id={`create-${product.id}`} />
                          <Label htmlFor={`create-${product.id}`} className="cursor-pointer">
                            Criar novo lote
                          </Label>
                        </div>
                        {batches.length > 0 && (
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="select" id={`select-${product.id}`} />
                            <Label htmlFor={`select-${product.id}`} className="cursor-pointer">
                              Usar lote existente
                            </Label>
                          </div>
                        )}
                      </RadioGroup>

                      {/* Formulário de Novo Lote */}
                      {config.batch.mode === 'create' && (
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div className="col-span-2">
                            <Label htmlFor={`batch-num-${product.id}`}>Código do Lote *</Label>
                            <Input
                              id={`batch-num-${product.id}`}
                              value={config.batch.batchNumber || ''}
                              onChange={(e) => updateItemConfig(product.id, {
                                batch: { ...config.batch, batchNumber: e.target.value }
                              })}
                              placeholder="Ex: LOTE-2025-001"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`mfg-${product.id}`}>Data de Fabricação</Label>
                            <Input
                              id={`mfg-${product.id}`}
                              type="date"
                              value={config.batch.manufacturingDate || ''}
                              onChange={(e) => updateItemConfig(product.id, {
                                batch: { ...config.batch, manufacturingDate: e.target.value }
                              })}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`exp-${product.id}`}>Data de Validade</Label>
                            <Input
                              id={`exp-${product.id}`}
                              type="date"
                              value={config.batch.expiryDate || ''}
                              onChange={(e) => updateItemConfig(product.id, {
                                batch: { ...config.batch, expiryDate: e.target.value }
                              })}
                            />
                          </div>
                          <div className="col-span-2">
                            <Label htmlFor={`loc-${product.id}`}>Localização</Label>
                            <Select
                              value={config.batch.locationName || ''}
                              onValueChange={(value) => updateItemConfig(product.id, {
                                batch: { ...config.batch, locationName: value }
                              })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a localização" />
                              </SelectTrigger>
                              <SelectContent>
                                {stockLocations.filter(loc => loc.isActive).length === 0 ? (
                                  <div className="px-2 py-6 text-center text-sm text-gray-500">
                                    Nenhuma localização ativa cadastrada.<br />
                                    Configure em Configurações → Localizações de Estoque.
                                  </div>
                                ) : (
                                  stockLocations.filter(loc => loc.isActive).map((location) => (
                                    <SelectItem key={location.id} value={location.name}>
                                      {location.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}

                      {/* Seleção de Lote Existente */}
                      {config.batch.mode === 'select' && (
                        <div>
                          <Label htmlFor={`batch-select-${product.id}`}>Selecione o Lote</Label>
                          {batches.length === 0 ? (
                            <Alert variant="destructive" className="mt-2">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                Nenhum lote disponível. Crie um novo lote.
                              </AlertDescription>
                            </Alert>
                          ) : (
                            <Select
                              value={config.batch.batchId || ''}
                              onValueChange={(value) => updateItemConfig(product.id, {
                                batch: { ...config.batch, batchId: value }
                              })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um lote" />
                              </SelectTrigger>
                              <SelectContent>
                                {batches.map((batch: any) => (
                                  <SelectItem key={batch.id} value={batch.id}>
                                    {batch.batch_number} - Estoque: {batch.current_quantity} un
                                    {batch.expiry_date && ` - Val: ${new Date(batch.expiry_date).toLocaleDateString('pt-BR')}`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
            {isLoading ? (
              <>Processando...</>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Confirmar Recebimento
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}