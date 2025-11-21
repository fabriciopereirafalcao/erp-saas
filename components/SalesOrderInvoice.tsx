import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { FileDown, Printer, X } from "lucide-react";
import { useERP } from "../contexts/ERPContext";
import { SalesOrder } from "../contexts/ERPContext";

interface SalesOrderInvoiceProps {
  order: SalesOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SalesOrderInvoice({ order, isOpen, onClose }: SalesOrderInvoiceProps) {
  const { customers, companySettings, getPriceTableById, inventory, priceTables } = useERP();

  if (!order) return null;

  const customer = customers.find(c => c.id === order.customerId);
  const priceTable = order.priceTableId ? getPriceTableById(order.priceTableId) : priceTables.find(t => t.isDefault);
  // Para pedidos multi-item, não buscar produto individual (será mostrado na lista de itens)
  const isMultiItemOrder = order.productName.includes('e mais') && order.productName.includes('item(ns)');
  const product = isMultiItemOrder ? null : inventory.find(p => p.productName === order.productName);

  const handlePrint = () => {
    window.print();
  };

  const formatPaymentMethod = (method?: string) => {
    if (!method) return '-';
    const methods: Record<string, string> = {
      'pix': 'PIX',
      'credit_card': 'Cartão de Crédito',
      'debit_card': 'Cartão de Débito',
      'bank_slip': 'Boleto Bancário',
      'bank_transfer': 'Transferência Bancária',
      'check': 'Cheque',
      'cash': 'Dinheiro'
    };
    return methods[method] || method;
  };

  const calculateFirstDueDate = () => {
    let baseDate: Date;
    if (order.dueDateReference === "billing" && order.billingDate) {
      baseDate = new Date(order.billingDate);
    } else if (order.dueDateReference === "delivery") {
      baseDate = new Date(order.deliveryDate);
    } else if (order.issueDate) {
      baseDate = new Date(order.issueDate);
    } else {
      baseDate = new Date(order.orderDate);
    }
    
    const firstInstallmentDays = order.firstInstallmentDays || 0;
    const dueDate = new Date(baseDate);
    dueDate.setDate(dueDate.getDate() + firstInstallmentDays);
    return dueDate;
  };

  const productSubtotal = order.quantity * order.unitPrice;
  const shippingCost = 0;
  const totalAmount = order.totalAmount || productSubtotal;

  const InvoiceContent = () => (
    <div className="bg-white" style={{ width: '210mm', minHeight: '297mm', padding: '10mm' }}>
      {/* CABEÇALHO PRINCIPAL */}
      <div className="border-b-2 border-gray-300 pb-4 mb-4">
        <div className="grid grid-cols-12 gap-4">
          {/* Logo */}
          <div className="col-span-2 flex items-start">
            {companySettings.logo ? (
              <div className="w-full h-20 flex items-center justify-start">
                <img
                  src={companySettings.logo}
                  alt="Logo da empresa"
                  className="max-w-full max-h-20 object-contain"
                />
              </div>
            ) : (
              <div className="w-20 h-20 border border-dashed border-gray-300 rounded flex items-center justify-center bg-gray-50">
                <span className="text-xs text-gray-400">Logo</span>
              </div>
            )}
          </div>

          {/* Dados da Empresa */}
          <div className="col-span-7 space-y-1.5 text-sm">
            <h1 className="text-lg text-gray-900 mb-2">{companySettings.companyName}</h1>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div>
                <span className="text-gray-600">CNPJ: </span>
                <span className="text-gray-900">{companySettings.cnpj || '-'}</span>
              </div>
              <div>
                <span className="text-gray-600">I.E.: </span>
                <span className="text-gray-900">{companySettings.stateRegistration || '-'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">Endereço: </span>
                <span className="text-gray-900">
                  {companySettings.street}, {companySettings.number}
                  {companySettings.complement && ` - ${companySettings.complement}`}
                  {' - '}{companySettings.neighborhood}, {companySettings.city}/{companySettings.state} - CEP: {companySettings.zipCode}
                </span>
              </div>
              <div>
                <span className="text-gray-600">E-mail: </span>
                <span className="text-gray-900">{companySettings.email || '-'}</span>
              </div>
              <div>
                <span className="text-gray-600">Telefone: </span>
                <span className="text-gray-900">{companySettings.phone || '-'}</span>
              </div>
              {order.salesPerson && (
                <div className="col-span-2 mt-1 pt-1 border-t border-gray-200">
                  <span className="text-gray-600">Vendedor: </span>
                  <span className="text-gray-900">{order.salesPerson}</span>
                </div>
              )}
            </div>
          </div>

          {/* Número do Pedido */}
          <div className="col-span-3 border-l-2 border-blue-600 pl-4 flex flex-col justify-center">
            <div className="text-xs text-gray-600 uppercase tracking-wide">Pedido Nº</div>
            <div className="text-2xl text-blue-600 my-1">{order.id}</div>
            <div className="text-xs text-gray-600">
              Emissão: {order.issueDate ? new Date(order.issueDate).toLocaleDateString('pt-BR') : new Date(order.orderDate).toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>
      </div>

      {/* DADOS DO CLIENTE */}
      <div className="mb-4">
        <div className="bg-gray-800 text-white px-3 py-1 mb-1.5 text-sm">
          DADOS DO CLIENTE
        </div>
        {customer ? (
          <div className="border border-gray-300 p-2.5 text-xs">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              <div>
                <span className="text-gray-600">Razão Social: </span>
                <span className="text-gray-900">{customer.company}</span>
              </div>
              <div>
                <span className="text-gray-600">Nome Fantasia: </span>
                <span className="text-gray-900">{customer.tradeName || '-'}</span>
              </div>
              <div>
                <span className="text-gray-600">CNPJ/CPF: </span>
                <span className="text-gray-900">{customer.document}</span>
              </div>
              <div>
                <span className="text-gray-600">Código: </span>
                <span className="text-gray-900">{customer.id}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">Endereço: </span>
                <span className="text-gray-900">
                  {customer.street}, {customer.number}
                  {customer.complement && ` - ${customer.complement}`}
                  {' - '}{customer.neighborhood}, {customer.city}/{customer.state} - CEP: {customer.zipCode}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Telefone: </span>
                <span className="text-gray-900">{customer.phone}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-gray-300 p-3 text-xs text-gray-500">Cliente não encontrado</div>
        )}
      </div>

      {/* DADOS DOS PRODUTOS */}
      <div className="mb-4">
        <div className="bg-gray-800 text-white px-3 py-1 mb-1.5 text-sm">
          DADOS DOS PRODUTOS
        </div>
        <div className="border border-gray-300">
          <table className="w-full text-xs">
            <thead className="bg-gray-100">
              <tr className="border-b border-gray-300">
                <th className="px-2 py-1.5 text-left border-r border-gray-300">Código</th>
                <th className="px-2 py-1.5 text-left border-r border-gray-300">Nome do Produto</th>
                <th className="px-2 py-1.5 text-center border-r border-gray-300">NCM</th>
                <th className="px-2 py-1.5 text-center border-r border-gray-300">Unidade</th>
                <th className="px-2 py-1.5 text-right border-r border-gray-300">Quantidade</th>
                <th className="px-2 py-1.5 text-right border-r border-gray-300">Valor Unitário</th>
                <th className="px-2 py-1.5 text-right">Valor Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="px-2 py-1.5 border-r border-gray-300">{product?.id || '-'}</td>
                <td className="px-2 py-1.5 border-r border-gray-300">{order.productName}</td>
                <td className="px-2 py-1.5 text-center border-r border-gray-300">{product?.ncm || '-'}</td>
                <td className="px-2 py-1.5 text-center border-r border-gray-300">{product?.unit || '-'}</td>
                <td className="px-2 py-1.5 text-right border-r border-gray-300">
                  {order.quantity.toLocaleString('pt-BR')}
                </td>
                <td className="px-2 py-1.5 text-right border-r border-gray-300">
                  R$ {order.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-2 py-1.5 text-right">
                  R$ {productSubtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
              </tr>
              {/* Linhas vazias para preenchimento */}
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100" style={{ height: '20px' }}>
                  <td className="px-2 border-r border-gray-300"></td>
                  <td className="px-2 border-r border-gray-300"></td>
                  <td className="px-2 border-r border-gray-300"></td>
                  <td className="px-2 border-r border-gray-300"></td>
                  <td className="px-2 border-r border-gray-300"></td>
                  <td className="px-2 border-r border-gray-300"></td>
                  <td className="px-2"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* VALORES */}
      <div className="mb-4">
        <div className="bg-gray-800 text-white px-3 py-1 mb-1.5 text-sm">
          VALORES
        </div>
        <div className="border border-gray-300 p-2.5 text-xs">
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-600">Valor Total dos Produtos:</span>
            <span className="text-gray-900">R$ {productSubtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-600">Frete:</span>
            <span className="text-gray-900">R$ {shippingCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="border-t-2 border-gray-300 pt-1.5 mt-1.5 flex justify-between items-center">
            <span className="text-gray-900">VALOR TOTAL DO PEDIDO:</span>
            <span className="text-lg text-blue-600">
              R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* OUTRAS INFORMAÇÕES */}
      <div className="mb-4">
        <div className="bg-gray-800 text-white px-3 py-1 mb-1.5 text-sm">
          OUTRAS INFORMAÇÕES
        </div>
        <div className="border border-gray-300 p-2.5 text-xs">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            <div>
              <span className="text-gray-600">Previsão de Entrega: </span>
              <span className="text-gray-900">{new Date(order.deliveryDate).toLocaleDateString('pt-BR')}</span>
            </div>
            <div>
              <span className="text-gray-600">Vencimento: </span>
              <span className="text-gray-900">
                {order.paymentCondition ? calculateFirstDueDate().toLocaleDateString('pt-BR') : '-'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Forma de Pagamento: </span>
              <span className="text-gray-900">{formatPaymentMethod(order.paymentMethod)}</span>
            </div>
            <div>
              <span className="text-gray-600">Quantidade de Itens: </span>
              <span className="text-gray-900">{order.quantity}</span>
            </div>
          </div>
        </div>
      </div>

      {/* RODAPÉ */}
      <div className="mt-auto pt-4 text-xs text-center text-gray-500">
        <p>Este documento é um espelho do pedido de venda e não possui valor fiscal.</p>
        <p className="mt-0.5">
          Gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
        </p>
      </div>
    </div>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Espelho do Pedido {order.id}</DialogTitle>
            <DialogDescription>
              Visualize e exporte o espelho do pedido de venda em formato profissional para impressão ou PDF
            </DialogDescription>
          </DialogHeader>

          {/* Header com ações */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10 print:hidden">
            <div>
              <h2 className="text-xl text-gray-900">Espelho do Pedido</h2>
              <p className="text-sm text-gray-600">Visualize e exporte o espelho do pedido de venda</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handlePrint} variant="outline" size="sm">
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
              <Button onClick={handlePrint} variant="outline" size="sm">
                <FileDown className="w-4 h-4 mr-2" />
                Exportar PDF
              </Button>
              <Button onClick={onClose} variant="ghost" size="sm">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Conteúdo preview */}
          <div className="flex justify-center p-8 bg-gray-50 print:hidden">
            <InvoiceContent />
          </div>
        </DialogContent>
      </Dialog>

      {/* Conteúdo para impressão */}
      {isOpen && (
        <div className="hidden print:block print-content">
          <InvoiceContent />
        </div>
      )}

      {/* Estilos de impressão */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          
          body * {
            visibility: hidden !important;
          }
          
          .print-content,
          .print-content * {
            visibility: visible !important;
          }
          
          .print-content {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>
    </>
  );
}
