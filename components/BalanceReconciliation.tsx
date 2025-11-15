import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { CheckCircle2, XCircle, Calendar as CalendarIcon, FileText } from "lucide-react";
import { useERP } from "../contexts/ERPContext";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

export function BalanceReconciliation() {
  const {
    financialTransactions,
    companySettings,
    reconciliationStatus,
    toggleReconciliationStatus
  } = useERP();

  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedBank, setSelectedBank] = useState<string>("");

  // Ao carregar, seleciona automaticamente a conta principal (isPrimary) ou a primeira conta
  useEffect(() => {
    if (!selectedBank && companySettings.bankAccounts.length > 0) {
      const primaryBank = companySettings.bankAccounts.find(b => b.isPrimary);
      const defaultBank = primaryBank || companySettings.bankAccounts[0];
      if (defaultBank) {
        setSelectedBank(defaultBank.id);
      }
    }
  }, [companySettings.bankAccounts, selectedBank]);

  // Calcular fluxo de caixa diário para o banco selecionado
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const calculateDailyReconciliation = () => {
    if (!selectedBank) return [];

    const bank = companySettings.bankAccounts.find(b => b.id === selectedBank);
    if (!bank) return [];

    const reconciliationData: any[] = [];
    let currentBalance = bank.balance || 0;

    days.forEach((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      
      // Saldo inicial do dia
      const dayInitialBalance = currentBalance;
      
      // Filtrar transações realizadas do banco selecionado
      const filteredTransactions = financialTransactions.filter(t => t.bankAccountId === selectedBank);
      
      // Entradas realizadas (Recebido)
      const realizedIncome = filteredTransactions
        .filter(t => t.type === "Receita" && t.paymentDate === dateStr && t.status === "Recebido")
        .reduce((sum, t) => sum + t.amount, 0);

      // Saídas realizadas (Pago)
      const realizedExpenses = filteredTransactions
        .filter(t => t.type === "Despesa" && t.paymentDate === dateStr && t.status === "Pago")
        .reduce((sum, t) => sum + t.amount, 0);

      // Atualizar saldo atual
      currentBalance += realizedIncome - realizedExpenses;

      // Buscar status de conciliação
      const reconciliationKey = `${selectedBank}-${dateStr}`;
      const isReconciled = reconciliationStatus[reconciliationKey] || false;

      reconciliationData.push({
        date: format(day, 'dd/MM/yyyy'),
        dateStr,
        initialBalance: dayInitialBalance || 0,
        realizedIncome: realizedIncome || 0,
        realizedExpenses: realizedExpenses || 0,
        finalBalance: currentBalance || 0,
        isReconciled,
        reconciliationKey
      });
    });

    return reconciliationData;
  };

  const reconciliationData = calculateDailyReconciliation();

  // Estatísticas
  const totalReconciled = reconciliationData.filter(d => d.isReconciled).length;
  const totalDays = reconciliationData.length;
  const reconciliationPercentage = totalDays > 0 ? (totalReconciled / totalDays * 100).toFixed(0) : 0;

  const handleToggleReconciliation = (reconciliationKey: string) => {
    toggleReconciliationStatus(reconciliationKey);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="mb-4">
          <h1 className="text-gray-900 mb-2">Conciliação de Saldos</h1>
          <p className="text-gray-600">Compare os saldos do ERP com os extratos bancários reais</p>
        </div>

        {/* Summary Cards */}
        {selectedBank && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total de Dias</p>
                  <p className="text-blue-600">{totalDays}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Conciliados</p>
                  <p className="text-green-600">{totalReconciled}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pendentes</p>
                  <p className="text-orange-600">{totalDays - totalReconciled}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Progresso</p>
                  <p className="text-purple-600">{reconciliationPercentage}%</p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      <Card className="p-6">
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Competência */}
          <div>
            <Label className="text-sm mb-2 block">Competência</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedMonth, "MM/yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedMonth}
                  onSelect={(date) => date && setSelectedMonth(date)}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Banco/Caixa */}
          <div>
            <Label className="text-sm mb-2 block">Banco / Caixa *</Label>
            <Select value={selectedBank} onValueChange={setSelectedBank}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um banco" />
              </SelectTrigger>
              <SelectContent>
                {companySettings.bankAccounts.map(bank => (
                  <SelectItem key={bank.id} value={bank.id}>
                    {bank.bankName} - {bank.accountNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Botão GERAR PDF */}
        {selectedBank && (
          <div className="flex gap-3 mb-6">
            <Button variant="outline" className="gap-2">
              <FileText className="w-4 h-4" />
              GERAR PDF
            </Button>
          </div>
        )}

        {/* Tabela */}
        {!selectedBank ? (
          <div className="text-center py-12 text-gray-500">
            <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg">Selecione um banco para visualizar a conciliação</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-200 border-b">
                  <th className="px-3 py-3 text-left text-sm text-gray-700">Data</th>
                  <th className="px-3 py-3 text-right text-sm text-gray-700">Saldo Inicial</th>
                  <th className="px-3 py-3 text-right text-sm text-gray-700">Entradas</th>
                  <th className="px-3 py-3 text-right text-sm text-gray-700">Saídas</th>
                  <th className="px-3 py-3 text-right text-sm text-gray-700">Saldo Final</th>
                  <th className="px-3 py-3 text-center text-sm text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {reconciliationData.map((day, index) => (
                  <tr 
                    key={index} 
                    className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}
                  >
                    <td className="px-3 py-2.5 text-sm text-gray-900">{day.date}</td>
                    <td className="px-3 py-2.5 text-sm text-right text-gray-900">
                      R$ {(day.initialBalance ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-right text-green-600">
                      {(day.realizedIncome ?? 0) > 0 ? `R$ ${(day.realizedIncome ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-right text-red-600">
                      {(day.realizedExpenses ?? 0) > 0 ? `R$ ${(day.realizedExpenses ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td className={`px-3 py-2.5 text-sm text-right ${(day.finalBalance ?? 0) >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                      R$ {(day.finalBalance ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-center">
                      <button
                        onClick={() => handleToggleReconciliation(day.reconciliationKey)}
                        className="inline-flex items-center gap-1 hover:opacity-70 transition-opacity"
                      >
                        {day.isReconciled ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            <span className="text-green-600">Conciliado</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-5 h-5 text-orange-600" />
                            <span className="text-orange-600">Não Conciliado</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
                {reconciliationData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      Nenhum dado encontrado para o período selecionado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}