import { useState, useEffect } from "react";
import React from "react";
import { Card } from "./ui/card";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { CheckCircle2, XCircle, Calendar as CalendarIcon, FileText, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { useERP } from "../contexts/ERPContext";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

export function BalanceReconciliation() {
  const {
    financialTransactions,
    companySettings,
    reconciliationStatus,
    toggleReconciliationStatus
  } = useERP();

  // ✅ Proteções contra arrays undefined
  const safeFinancialTransactions = financialTransactions || [];
  const safeBankAccounts = companySettings?.bankAccounts || [];
  const safeReconciliationStatus = reconciliationStatus || {};

  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedBank, setSelectedBank] = useState<string>("");
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // Ao carregar, seleciona automaticamente a conta principal (isPrimary) ou a primeira conta
  useEffect(() => {
    if (!selectedBank && safeBankAccounts.length > 0) {
      const primaryBank = safeBankAccounts.find(b => b.isPrimary);
      const defaultBank = primaryBank || safeBankAccounts[0];
      if (defaultBank) {
        setSelectedBank(defaultBank.id);
      }
    }
  }, [safeBankAccounts, selectedBank]);

  // Calcular fluxo de caixa diário para o banco selecionado
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const calculateDailyReconciliation = () => {
    if (!selectedBank) return [];

    const bank = safeBankAccounts.find(b => b.id === selectedBank);
    if (!bank) return [];

    // ✅ CORREÇÃO: Calcular saldo inicial do mês baseado em initialBalance + transações anteriores
    const monthStartDate = format(monthStart, 'yyyy-MM-dd');
    
    // Filtrar transações do banco selecionado
    const bankTransactions = safeFinancialTransactions.filter(t => t.bankAccountId === selectedBank);
    
    // Calcular transações anteriores ao início do mês (mas depois da startDate se existir)
    const transactionsBeforeMonth = bankTransactions.filter(t => {
      if (!t.effectiveDate) return false;
      if (t.effectiveDate >= monthStartDate) return false;
      if (t.status !== 'Recebido' && t.status !== 'Pago') return false;
      // ✅ Se tem startDate, só considerar transações depois da startDate
      // EXCETO se tem flag de override (então incluir para auditoria)
      if (bank.startDate && t.effectiveDate < bank.startDate && !t.hasStartDateOverride) return false;
      return true;
    });
    
    const balanceBeforeMonth = transactionsBeforeMonth.reduce((sum, t) => {
      if (t.type === 'Receita' && t.status === 'Recebido') {
        return sum + t.amount;
      } else if (t.type === 'Despesa' && t.status === 'Pago') {
        return sum - t.amount;
      }
      return sum;
    }, bank.initialBalance || 0);
    
    console.log('[CONCILIAÇÃO] 💰 Cálculo de saldo inicial:', {
      bankName: bank.bankName,
      initialBalance: bank.initialBalance,
      currentBalance: bank.balance,
      startDate: bank.startDate,
      monthStartDate,
      transactionsBeforeMonth: transactionsBeforeMonth.length,
      balanceBeforeMonth
    });

    const reconciliationData: any[] = [];
    let currentBalance = balanceBeforeMonth;

    days.forEach((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      
      // ✅ VERIFICAR SE DIA É ANTERIOR À DATA DE INÍCIO
      const isBeforeStartDate = bank.startDate && dateStr < bank.startDate;
      
      // Saldo inicial do dia (zerar se anterior à data de início)
      const dayInitialBalance = isBeforeStartDate ? 0 : currentBalance;
      
      // Filtrar transações realizadas do banco selecionado
      const filteredTransactions = safeFinancialTransactions.filter(t => t.bankAccountId === selectedBank);
      
      // ✅ Transações do dia (incluindo overrides)
      const dayTransactions = filteredTransactions.filter(t => 
        t.effectiveDate === dateStr && 
        (t.status === "Recebido" || t.status === "Pago")
      );

      // Entradas realizadas (Recebido) - incluir overrides
      const realizedIncome = dayTransactions
        .filter(t => t.type === "Receita" && t.status === "Recebido")
        .reduce((sum, t) => sum + t.amount, 0);

      // Saídas realizadas (Pago) - incluir overrides
      const realizedExpenses = dayTransactions
        .filter(t => t.type === "Despesa" && t.status === "Pago")
        .reduce((sum, t) => sum + t.amount, 0);

      // Atualizar saldo atual
      currentBalance += realizedIncome - realizedExpenses;

      // Buscar status de conciliação
      const reconciliationKey = `${selectedBank}-${dateStr}`;
      const isReconciled = safeReconciliationStatus[reconciliationKey] || false;

      // ✅ Verificar se há transações com override
      const hasOverrideTransactions = dayTransactions.some(t => t.hasStartDateOverride);

      reconciliationData.push({
        date: format(day, 'dd/MM/yyyy'),
        dateStr,
        initialBalance: dayInitialBalance || 0,
        realizedIncome: realizedIncome || 0,
        realizedExpenses: realizedExpenses || 0,
        finalBalance: currentBalance || 0,
        isReconciled,
        reconciliationKey,
        isBeforeStartDate, // ✅ Flag para destacar visualmente (opcional)
        transactions: dayTransactions, // ✅ NOVO: Transações do dia
        hasOverrideTransactions // ✅ NOVO: Flag de override
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

  // ✅ Toggle expansão de detalhes do dia
  const toggleDayExpansion = (dateStr: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateStr)) {
        newSet.delete(dateStr);
      } else {
        newSet.add(dateStr);
      }
      return newSet;
    });
  };

  // ✅ Função para gerar PDF profissional
  const handleGeneratePDF = async () => {
    const bank = safeBankAccounts.find(b => b.id === selectedBank);
    if (!bank) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    let yPosition = 20;

    // ===== CABEÇALHO COM LOGO =====
    if (companySettings?.companyLogo) {
      try {
        doc.addImage(companySettings.companyLogo, 'PNG', 15, yPosition, 30, 30);
      } catch (error) {
        console.error('Erro ao adicionar logo:', error);
      }
    }

    // Dados da empresa
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(companySettings?.companyName || 'Empresa', companySettings?.companyLogo ? 50 : 15, yPosition + 5);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    if (companySettings?.cnpj) {
      doc.text(`CNPJ: ${companySettings.cnpj}`, companySettings?.companyLogo ? 50 : 15, yPosition + 12);
    }
    if (companySettings?.address) {
      doc.text(companySettings.address, companySettings?.companyLogo ? 50 : 15, yPosition + 17);
    }
    if (companySettings?.phone) {
      doc.text(`Tel: ${companySettings.phone}`, companySettings?.companyLogo ? 50 : 15, yPosition + 22);
    }

    yPosition += 40;

    // ===== TÍTULO DO RELATÓRIO =====
    doc.setFillColor(59, 130, 246); // Blue
    doc.rect(0, yPosition, pageWidth, 15, 'F');
    
    doc.setTextColor(255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('CONCILIAÇÃO BANCÁRIA', pageWidth / 2, yPosition + 10, { align: 'center' });

    yPosition += 20;

    // ===== INFORMAÇÕES DO PERÍODO =====
    doc.setTextColor(0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Informações do Relatório', 15, yPosition);
    
    yPosition += 7;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const monthName = monthNames[selectedMonth.getMonth()];
    
    doc.text(`Período: ${monthName} de ${selectedMonth.getFullYear()}`, 15, yPosition);
    yPosition += 5;
    doc.text(`Conta: ${bank.bankName} - ${bank.accountNumber}`, 15, yPosition);
    yPosition += 5;
    doc.text(`Data de Geração: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 15, yPosition);
    
    yPosition += 10;

    // ===== RESUMO ESTATÍSTICO =====
    doc.setFillColor(243, 244, 246);
    doc.rect(15, yPosition, pageWidth - 30, 25, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo do Período', 20, yPosition + 7);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    const col1X = 20;
    const col2X = pageWidth / 2 + 10;
    
    doc.text(`Total de Dias: ${totalDays}`, col1X, yPosition + 14);
    doc.text(`Dias Conciliados: ${totalReconciled}`, col1X, yPosition + 19);
    
    doc.setTextColor(34, 197, 94); // Green
    doc.text(`Taxa de Conciliação: ${reconciliationPercentage}%`, col2X, yPosition + 14);
    
    doc.setTextColor(249, 115, 22); // Orange
    doc.text(`Dias Pendentes: ${totalDays - totalReconciled}`, col2X, yPosition + 19);
    
    doc.setTextColor(0);
    yPosition += 32;

    // ===== TABELA DE CONCILIAÇÃO =====
    const tableData = reconciliationData.map(day => [
      day.date,
      `R$ ${day.initialBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      day.realizedIncome > 0 ? `R$ ${day.realizedIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-',
      day.realizedExpenses > 0 ? `R$ ${day.realizedExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-',
      `R$ ${day.finalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      day.isReconciled ? '✓ Conciliado' : '✗ Pendente'
    ]);

    (doc as any).autoTable({
      startY: yPosition,
      head: [['Data', 'Saldo Inicial', 'Entradas', 'Saídas', 'Saldo Final', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 8,
        textColor: 50
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 25 },
        1: { halign: 'right', cellWidth: 28 },
        2: { halign: 'right', cellWidth: 28 },
        3: { halign: 'right', cellWidth: 28 },
        4: { halign: 'right', cellWidth: 30 },
        5: { halign: 'center', cellWidth: 30 }
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      },
      didParseCell: (data: any) => {
        // Destacar dias conciliados em verde e pendentes em laranja
        if (data.column.index === 5 && data.section === 'body') {
          if (data.cell.raw === '✓ Conciliado') {
            data.cell.styles.textColor = [34, 197, 94]; // Green
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [249, 115, 22]; // Orange
          }
        }
        // Destacar saldos negativos em vermelho
        if (data.column.index === 4 && data.section === 'body') {
          const value = parseFloat(data.cell.raw.replace('R$', '').replace(/\./g, '').replace(',', '.'));
          if (value < 0) {
            data.cell.styles.textColor = [239, 68, 68]; // Red
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
      margin: { left: 15, right: 15 },
      tableWidth: 'auto'
    });

    // ===== RODAPÉ =====
    const finalY = (doc as any).lastAutoTable.finalY || yPosition + 100;
    
    if (finalY < pageHeight - 30) {
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.setFont('helvetica', 'italic');
      doc.text('Este relatório foi gerado automaticamente pelo sistema ERP.', pageWidth / 2, pageHeight - 15, { align: 'center' });
      doc.text(`Página 1 de 1`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    // ===== SALVAR PDF =====
    const fileName = `Conciliacao_${bank.bankName.replace(/\s+/g, '_')}_${monthName}_${selectedMonth.getFullYear()}.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Conciliação de Saldos</h1>
            <p className="text-gray-600">Compare os saldos do ERP com os extratos bancários reais</p>
          </div>
          
          {/* Botão GERAR PDF - Canto Superior Direito */}
          {selectedBank && (
            <Button 
              onClick={handleGeneratePDF}
              variant="outline" 
              className="gap-2 border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              <FileText className="w-4 h-4" />
              GERAR PDF
            </Button>
          )}
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
        {/* Filtros de Competência e Banco - Lado a Lado */}
        <div className="mb-6 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          {/* Filtro de Ano/Mês - Esquerda */}
          <div className="flex items-center justify-center gap-6 bg-gray-50 p-4 rounded-lg border">
            {/* Seletor de Ano */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear() - 1, selectedMonth.getMonth(), 1))}
                className="h-8 w-8 p-0"
              >
                <ChevronDown className="h-4 w-4 rotate-90" />
              </Button>
              <span className="text-lg font-semibold min-w-[70px] text-center">{selectedMonth.getFullYear()}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear() + 1, selectedMonth.getMonth(), 1))}
                className="h-8 w-8 p-0"
                disabled={selectedMonth.getFullYear() >= new Date().getFullYear()}
              >
                <ChevronDown className="h-4 w-4 -rotate-90" />
              </Button>
            </div>
            
            {/* Pills de Meses - Seleção Única */}
            <div className="flex flex-wrap gap-2 justify-center">
              {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"].map((monthName, index) => (
                <Button
                  key={index}
                  variant={selectedMonth.getMonth() === index ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), index, 1))}
                  className={`h-8 px-3 text-sm ${selectedMonth.getMonth() === index ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                >
                  {monthName}
                </Button>
              ))}
            </div>
          </div>

          {/* Filtro de Banco - Direita */}
          <div className="flex flex-col justify-center">
            <Label className="text-sm mb-2 block">Banco / Caixa *</Label>
            <Select value={selectedBank} onValueChange={setSelectedBank}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um banco" />
              </SelectTrigger>
              <SelectContent>
                {safeBankAccounts.map(bank => (
                  <SelectItem key={bank.id} value={bank.id}>
                    {bank.bankName} - {bank.accountNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

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
                  <th className="px-3 py-3 text-left text-sm text-gray-700 w-10"></th>
                  <th className="px-3 py-3 text-left text-sm text-gray-700">Data</th>
                  <th className="px-3 py-3 text-right text-sm text-gray-700">Saldo Inicial</th>
                  <th className="px-3 py-3 text-right text-sm text-gray-700">Entradas</th>
                  <th className="px-3 py-3 text-right text-sm text-gray-700">Saídas</th>
                  <th className="px-3 py-3 text-right text-sm text-gray-700">Saldo Final</th>
                  <th className="px-3 py-3 text-center text-sm text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {reconciliationData.map((day, index) => {
                  const isExpanded = expandedDays.has(day.dateStr);
                  const hasTransactions = day.transactions && day.transactions.length > 0;
                  
                  return (
                    <React.Fragment key={index}>
                      <tr 
                        className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors ${day.isBeforeStartDate ? 'opacity-40' : ''}`}
                      >
                        <td className="px-3 py-2.5 text-sm">
                          {hasTransactions && (
                            <button
                              onClick={() => toggleDayExpansion(day.dateStr)}
                              className="text-gray-500 hover:text-gray-700 transition-colors"
                              title={isExpanded ? "Ocultar detalhes" : "Ver detalhes"}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            {day.date}
                            {day.hasOverrideTransactions && (
                              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Override
                              </Badge>
                            )}
                          </div>
                        </td>
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
                      
                      {/* ✅ Linha expansível com detalhes das transações */}
                      {isExpanded && hasTransactions && (
                        <tr className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                          <td colSpan={7} className="px-8 py-3">
                            <div className="space-y-2">
                              <p className="text-xs text-gray-500 mb-2">Transações do dia:</p>
                              {day.transactions.map((t: any) => (
                                <div 
                                  key={t.id} 
                                  className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded ${t.type === 'Receita' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                      {t.type}
                                    </span>
                                    <span className="text-gray-900">{t.description || t.partyName}</span>
                                    {t.hasStartDateOverride && (
                                      <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-300 text-xs">
                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                        Data Anterior ao Início da conta
                                      </Badge>
                                    )}
                                  </div>
                                  <span className={`font-medium ${t.type === 'Receita' ? 'text-green-600' : 'text-red-600'}`}>
                                    {t.type === 'Receita' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {reconciliationData.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
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