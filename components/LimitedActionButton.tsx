/* =========================================================================
 * LIMITED ACTION BUTTON - Botão com validação de limites
 * ========================================================================= */

import { Button } from "./ui/button";
import { useSubscription } from "../contexts/SubscriptionContext";
import { toast } from "sonner@2.0.3";
import { ComponentProps, ReactNode } from "react";
import { Lock, Crown } from "lucide-react";

interface LimitedActionButtonProps extends Omit<ComponentProps<typeof Button>, 'onClick'> {
  actionType: 
    | 'salesOrder' 
    | 'purchaseOrder' 
    | 'invoice' 
    | 'transaction' 
    | 'product' 
    | 'customer' 
    | 'supplier' 
    | 'user';
  onAction: () => void;
  children: ReactNode;
  showUpgradeOnLimit?: boolean;
}

/**
 * Botão que valida limites antes de executar ação
 * Mostra toast de erro ou dialog de upgrade se limite atingido
 */
export function LimitedActionButton({
  actionType,
  onAction,
  children,
  showUpgradeOnLimit = true,
  ...buttonProps
}: LimitedActionButtonProps) {
  const {
    canCreateSalesOrder,
    canCreatePurchaseOrder,
    canCreateInvoice,
    canCreateTransaction,
    canCreateProduct,
    canCreateCustomer,
    canCreateSupplier,
    canCreateUser,
    triggerUpgrade,
  } = useSubscription();

  const handleClick = () => {
    let validation: { allowed: boolean; reason?: string };

    // Selecionar validação baseada no tipo
    switch (actionType) {
      case 'salesOrder':
        validation = canCreateSalesOrder();
        break;
      case 'purchaseOrder':
        validation = canCreatePurchaseOrder();
        break;
      case 'invoice':
        validation = canCreateInvoice();
        break;
      case 'transaction':
        validation = canCreateTransaction();
        break;
      case 'product':
        validation = canCreateProduct();
        break;
      case 'customer':
        validation = canCreateCustomer();
        break;
      case 'supplier':
        validation = canCreateSupplier();
        break;
      case 'user':
        validation = canCreateUser();
        break;
      default:
        validation = { allowed: true };
    }

    // Se não permitido
    if (!validation.allowed) {
      if (showUpgradeOnLimit) {
        // Mostrar dialog de upgrade
        triggerUpgrade(
          validation.reason || `Limite atingido para ${getActionLabel(actionType)}`,
        );
      } else {
        // Apenas mostrar toast
        toast.error(validation.reason || `Limite atingido para ${getActionLabel(actionType)}`);
      }
      return;
    }

    // Se permitido, executar ação
    onAction();
  };

  return (
    <Button {...buttonProps} onClick={handleClick}>
      {children}
    </Button>
  );
}

function getActionLabel(actionType: string): string {
  const labels: Record<string, string> = {
    salesOrder: 'pedidos de venda',
    purchaseOrder: 'pedidos de compra',
    invoice: 'notas fiscais',
    transaction: 'transações financeiras',
    product: 'produtos',
    customer: 'clientes',
    supplier: 'fornecedores',
    user: 'usuários',
  };
  return labels[actionType] || actionType;
}
