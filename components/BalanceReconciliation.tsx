import { useState, useEffect } from "react";
import React from "react";
import { Card } from "./ui/card";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { CheckCircle2, XCircle, Calendar as CalendarIcon, FileText, AlertTriangle, ChevronDown, ChevronUp, History, Lock, Info } from "lucide-react";
import { useERP } from "../contexts/ERPContext";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";

export function BalanceReconciliation() {
  const {
    financialTransactions,
    companySettings,
    reconciliationStatus,
    reconciliationAudit,
    toggleReconciliationStatus,
    getReconciliationHistory,
    isMonthClosed,
    closePeriod,
    canClosePeriod,
    getMonthReconciliationStatus
  } = useERP();
  
  const { profile } = useAuth();

  // ✅ Proteções contra arrays undefined
  const safeFinancialTransactions = financialTransactions || [];
  const safeBankAccounts = companySettings?.bankAccounts || [];
  const safeReconciliationStatus = reconciliationStatus || {};
  const safeReconciliationAudit = reconciliationAudit || [];

  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedBank, setSelectedBank] = useState<string>("");
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedReconciliationKey, setSelectedReconciliationKey] = useState<string>("");
  const [closePeriodDialogOpen, setClosePeriodDialogOpen] = useState(false);
  const [closePeriodJustification, setClosePeriodJustification] = useState("");

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

  const handleToggleReconciliation = (reconciliationKey: string, dayData: any) => {
    // ✅ Bloquear alteração em períodos fechados
    const dayDate = new Date(dayData.dateStr);
    if (isMonthClosed(dayDate)) {
      toast.error('Período fechado', {
        description: 'Não é possível alterar conciliações em períodos fechados'
      });
      return;
    }
    
    const bank = safeBankAccounts.find(b => b.id === selectedBank);
    if (!bank) return;

    toggleReconciliationStatus(reconciliationKey, {
      bankAccountId: selectedBank,
      bankName: bank.bankName,
      date: dayData.dateStr,
      initialBalance: dayData.initialBalance,
      finalBalance: dayData.finalBalance,
      realizedIncome: dayData.realizedIncome,
      realizedExpenses: dayData.realizedExpenses,
      transactionCount: dayData.transactions?.length || 0
    });
  };

  // ✅ Abrir modal de histórico
  const handleOpenHistory = (reconciliationKey: string) => {
    setSelectedReconciliationKey(reconciliationKey);
    setHistoryDialogOpen(true);
  };

  // ✅ Obter histórico da chave selecionada
  const currentHistory = selectedReconciliationKey ? getReconciliationHistory(selectedReconciliationKey) : [];

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
    let yPosition = 15;

    // ===== CABEÇALHO COM LOGO =====
    const logoSize = 25;
    const logoX = pageWidth - 15 - logoSize; // Posicionar logo no canto direito
    const logoY = yPosition;
    
    // Variável para armazenar se conseguiu adicionar a logo
    let logoAdded = false;
    
    if (companySettings?.logo) {
      try {
        const logoData = companySettings.logo;
        console.log('📷 Tentando adicionar logo ao PDF. Primeiros 100 chars:', logoData.substring(0, 100));
        
        // Determinar formato da imagem a partir do data URL
        let imageFormat = 'PNG';
        if (logoData.includes('data:image/jpeg') || logoData.includes('data:image/jpg')) {
          imageFormat = 'JPEG';
        } else if (logoData.includes('data:image/png')) {
          imageFormat = 'PNG';
        } else if (logoData.includes('data:image/')) {
          // Tentar extrair o formato do data URL
          const match = logoData.match(/data:image\/([^;]+);/);
          if (match) {
            imageFormat = match[1].toUpperCase();
          }
        }
        
        // Tentar adicionar a imagem no canto direito
        doc.addImage(logoData, imageFormat, logoX, logoY, logoSize, logoSize);
        logoAdded = true;
        console.log('✅ Logo adicionada ao PDF com sucesso! Formato:', imageFormat);
      } catch (error) {
        console.error('❌ Erro ao adicionar logo ao PDF:', error);
        console.log('Logo data disponível:', !!companySettings?.logo);
      }
    } else {
      console.warn('⚠️ Nenhuma logo configurada em companySettings.logo');
    }

    // Dados da empresa à esquerda (independente da logo)
    const textX = 15;
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(companySettings?.companyName || 'Empresa', textX, yPosition + 5);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    
    let textY = yPosition + 10;
    if (companySettings?.cnpj) {
      doc.text(`CNPJ: ${companySettings.cnpj}`, textX, textY);
      textY += 4;
    }
    if (companySettings?.phone) {
      doc.text(`Tel: ${companySettings.phone}`, textX, textY);
    }

    yPosition += 30;

    // ===== TÍTULO DO RELATÓRIO =====
    doc.setFillColor(59, 130, 246); // Blue
    doc.rect(0, yPosition, pageWidth, 12, 'F');
    
    doc.setTextColor(255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('CONCILIAÇÃO BANCÁRIA', pageWidth / 2, yPosition + 8, { align: 'center' });

    yPosition += 17;

    // ===== INFORMAÇÕES DO PERÍODO =====
    doc.setTextColor(0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Informações do Relatório', 15, yPosition);
    
    yPosition += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const monthName = monthNames[selectedMonth.getMonth()];
    
    doc.text(`Período: ${monthName} de ${selectedMonth.getFullYear()}`, 15, yPosition);
    yPosition += 4.5;
    doc.text(`Conta: ${bank.bankName} - ${bank.accountNumber}`, 15, yPosition);
    yPosition += 4.5;
    doc.text(`Data de Geração: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 15, yPosition);
    
    yPosition += 8;

    // ===== RESUMO ESTATÍSTICO =====
    doc.setFillColor(243, 244, 246);
    doc.rect(15, yPosition, pageWidth - 30, 22, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Resumo do Período', 20, yPosition + 6);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    const col1X = 20;
    const col2X = pageWidth / 2 + 10;
    
    doc.text(`Total de Dias: ${totalDays}`, col1X, yPosition + 12);
    doc.text(`Dias Conciliados: ${totalReconciled}`, col1X, yPosition + 17);
    
    doc.setTextColor(34, 197, 94); // Green
    doc.text(`Taxa de Conciliação: ${reconciliationPercentage}%`, col2X, yPosition + 12);
    
    doc.setTextColor(249, 115, 22); // Orange
    doc.text(`Dias Pendentes: ${totalDays - totalReconciled}`, col2X, yPosition + 17);
    
    doc.setTextColor(0);
    yPosition += 27;

    // ===== TABELA DE CONCILIAÇÃO =====
    const tableData = reconciliationData.map(day => [
      day.date,
      `R$ ${day.initialBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      day.realizedIncome > 0 ? `R$ ${day.realizedIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-',
      day.realizedExpenses > 0 ? `R$ ${day.realizedExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-',
      `R$ ${day.finalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      day.isReconciled ? 'Conciliado' : 'Pendente'
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
          if (data.cell.raw === 'Conciliado') {
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
      // ✅ Adicionar rodapé em TODAS as páginas com numeração correta
      didDrawPage: (data: any) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        const currentPage = data.pageNumber;
        
        // Rodapé com texto e numeração
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.setFont('helvetica', 'italic');
        doc.text('Este relatório foi gerado automaticamente pelo META ERP.', pageWidth / 2, pageHeight - 15, { align: 'center' });
        doc.text(`Página ${currentPage} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      },
      margin: { left: 15, right: 15, bottom: 25 },
      tableWidth: 'auto'
    });

    // ===== SALVAR PDF =====
    const fileName = `Conciliacao_${bank.bankName.replace(/\s+/g, '_')}_${monthName}_${selectedMonth.getFullYear()}.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">Conciliação de Saldos</h1>
              <p className="text-gray-600">Compare os saldos do ERP com os extratos bancários reais</p>
            </div>
            
            {/* Info Badge Explicativo */}
            <div className="group relative">
              <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center cursor-help">
                <Info className="w-3 h-3 text-blue-600" />
              </div>
              <div className="absolute left-0 top-8 w-96 p-4 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <h4 className="font-semibold text-gray-900 mb-2">Como funciona?</h4>
                <div className="text-xs text-gray-600 space-y-2">
                  <p><strong>Conciliação:</strong> Marque cada dia como conciliado após conferir com o extrato bancário real.</p>
                  <p><strong>Períodos Fechados:</strong> Após 100% de conciliação do mês, feche o período para bloquear alterações e garantir a integridade contábil.</p>
                  <p><strong>Permissões:</strong> Apenas Owners e Administradores podem fechar períodos.</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Botões - Canto Superior Direito */}
          {selectedBank && (
            <div className="flex items-center gap-3">
              {/* Botão Fechar Período - Apenas para Owner/Admin */}
              {(profile?.role === 'Owner' || profile?.role === 'Administrador') && (
                <Button 
                  onClick={() => {
                    const month = selectedMonth.getMonth() + 1;
                    const year = selectedMonth.getFullYear();
                    
                    // Verificar se período já está fechado
                    if (isMonthClosed(selectedMonth)) {
                      toast.info('Período já fechado', {
                        description: `O período ${month.toString().padStart(2, '0')}/${year} já se encontra fechado`
                      });
                      return;
                    }
                    
                    // Abrir dialog de confirmação
                    setClosePeriodDialogOpen(true);
                  }}
                  variant="outline" 
                  className="gap-2 border-purple-600 text-purple-600 hover:bg-purple-50"
                >
                  <Lock className="w-4 h-4" />
                  FECHAR PERÍODO
                </Button>
              )}
              
              {/* Botão Gerar PDF */}
              <Button 
                onClick={handleGeneratePDF}
                variant="outline" 
                className="gap-2 border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                <FileText className="w-4 h-4" />
                GERAR PDF
              </Button>
            </div>
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
        {/* Filtros - Seletor de Mês (esquerda) e Banco (direita) lado a lado */}
        <div className="mb-6 flex items-start gap-4">
          {/* Filtro de Competência - Ano e Meses */}
          <div className="flex-1 flex items-center gap-4 bg-gray-50 p-3 rounded-lg border">
            {/* Seletor de Ano */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear() - 1, selectedMonth.getMonth(), 1))}
                className="h-7 w-7 p-0"
              >
                <ChevronDown className="h-4 w-4 rotate-90" />
              </Button>
              <span className="font-semibold min-w-[60px] text-center">{selectedMonth.getFullYear()}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear() + 1, selectedMonth.getMonth(), 1))}
                className="h-7 w-7 p-0"
                disabled={selectedMonth.getFullYear() >= new Date().getFullYear()}
              >
                <ChevronDown className="h-4 w-4 -rotate-90" />
              </Button>
            </div>
            
            {/* Pills de Meses - Compactos */}
            <div className="flex gap-1.5">
              {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"].map((monthName, index) => {
                const monthDate = new Date(selectedMonth.getFullYear(), index, 1);
                const isClosed = isMonthClosed(monthDate);
                
                return (
                  <Button
                    key={index}
                    variant={selectedMonth.getMonth() === index ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), index, 1))}
                    className={`h-7 px-2.5 text-xs whitespace-nowrap flex items-center gap-1 ${
                      selectedMonth.getMonth() === index 
                        ? isClosed 
                          ? "bg-gray-600 hover:bg-gray-700" 
                          : "bg-blue-600 hover:bg-blue-700" 
                        : isClosed
                          ? "bg-gray-100 text-gray-700"
                          : ""
                    }`}
                  >
                    {isClosed && <Lock className="w-3 h-3" />}
                    {monthName}
                  </Button>
                );
              })}
            </div>
          </div>
          
          {/* Badge de Período Fechado */}
          {isMonthClosed(selectedMonth) && (
            <Badge className="bg-red-100 text-red-700 border-red-300 flex items-center gap-1.5">
              <Lock className="w-3 h-3" />
              Período Fechado - Somente Leitura
            </Badge>
          )}

          {/* Filtro de Banco - Direita */}
          <div className="flex items-center gap-3">
            <Label className="text-sm whitespace-nowrap">Banco / Caixa</Label>
            <Select value={selectedBank} onValueChange={setSelectedBank}>
              <SelectTrigger className="w-[280px]">
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
                  <th className="px-3 py-3 text-center text-sm text-gray-700">Ações</th>
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
                            onClick={() => handleToggleReconciliation(day.reconciliationKey, day)}
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
                        <td className="px-3 py-2.5 text-sm text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenHistory(day.reconciliationKey)}
                            className="h-8 gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <History className="w-4 h-4" />
                            Ver Histórico
                          </Button>
                        </td>
                      </tr>
                      
                      {/* ✅ Linha expansível com detalhes das transações */}
                      {isExpanded && hasTransactions && (
                        <tr className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                          <td colSpan={8} className="px-8 py-3">
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
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      Nenhum dado encontrado para o período selecionado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de Histórico de Auditoria */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              Histórico de Auditoria
            </DialogTitle>
            <DialogDescription>
              Registro completo de todas as ações de conciliação realizadas
            </DialogDescription>
          </DialogHeader>

          {currentHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <History className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg">Nenhum histórico encontrado</p>
              <p className="text-sm mt-2">Esta conciliação ainda não possui registros de auditoria.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Informações da Conciliação */}
              {currentHistory[0] && (
                <Card className="p-4 bg-blue-50 border-blue-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 font-medium">Conta Bancária</p>
                      <p className="text-gray-900">{currentHistory[0].bankName}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 font-medium">Data</p>
                      <p className="text-gray-900">
                        {format(new Date(currentHistory[0].date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Timeline de Ações */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Histórico de Ações ({currentHistory.length})
                </h3>

                <div className="relative border-l-2 border-gray-200 ml-3 pl-6 space-y-4">
                  {currentHistory.map((entry, index) => (
                    <div key={entry.id} className="relative">
                      {/* Marcador da timeline */}
                      <div className={`absolute -left-[1.6rem] w-6 h-6 rounded-full flex items-center justify-center ${
                        entry.isReconciled 
                          ? 'bg-green-100 border-2 border-green-600' 
                          : 'bg-orange-100 border-2 border-orange-600'
                      }`}>
                        {entry.isReconciled ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-orange-600" />
                        )}
                      </div>

                      {/* Card da ação */}
                      <Card className={`p-4 ${index === 0 ? 'border-2 border-blue-500' : ''}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <Badge 
                              variant={entry.isReconciled ? "default" : "secondary"}
                              className={entry.isReconciled ? "bg-green-600" : "bg-orange-600"}
                            >
                              {entry.isReconciled ? "✓ Conciliado" : "○ Não Conciliado"}
                            </Badge>
                            {index === 0 && (
                              <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-300">
                                Mais Recente
                              </Badge>
                            )}
                          </div>
                          <div className="text-right text-sm">
                            <p className="text-gray-900 font-medium">
                              {format(new Date(entry.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                            <p className="text-gray-600 text-xs">{entry.user}</p>
                          </div>
                        </div>

                        {/* Valores da Conciliação */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-gray-200">
                          <div>
                            <p className="text-xs text-gray-500">Saldo Inicial</p>
                            <p className="text-sm font-medium text-gray-900">
                              R$ {entry.initialBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Entradas</p>
                            <p className="text-sm font-medium text-green-600">
                              R$ {entry.realizedIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Saídas</p>
                            <p className="text-sm font-medium text-red-600">
                              R$ {entry.realizedExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Saldo Final</p>
                            <p className="text-sm font-medium text-gray-900">
                              R$ {entry.finalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>

                        {/* Transações */}
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <p className="text-xs text-gray-500">
                            {entry.transactionCount} {entry.transactionCount === 1 ? 'transação' : 'transações'} neste dia
                          </p>
                        </div>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Fechamento de Período */}
      <Dialog open={closePeriodDialogOpen} onOpenChange={setClosePeriodDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-600" />
              Fechar Período
            </DialogTitle>
            <DialogDescription>
              Confirme o fechamento do período para garantir a integridade dos dados
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Informações do Período */}
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 font-medium">Período</p>
                  <p className="text-gray-900">
                    {format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 font-medium">Status</p>
                  <p className="text-gray-900">
                    {isMonthClosed(selectedMonth) ? "Fechado" : "Aberto"}
                  </p>
                </div>
              </div>
            </Card>

            {/* Justificativa para Fechamento */}
            <div className="space-y-2">
              <Label className="text-sm whitespace-nowrap">Justificativa para Fechamento</Label>
              <textarea
                value={closePeriodJustification}
                onChange={(e) => setClosePeriodJustification(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded text-sm"
                placeholder="Digite a justificativa para o fechamento do período"
              />
            </div>

            {/* Resumo de Conciliação */}
            <div className="space-y-2">
              <Label className="text-sm whitespace-nowrap">Resumo de Conciliação</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-gray-200">
                <div>
                  <p className="text-xs text-gray-500">Total de Dias</p>
                  <p className="text-sm font-medium text-gray-900">
                    {totalDays}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Dias Conciliados</p>
                  <p className="text-sm font-medium text-green-600">
                    {totalReconciled}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Dias Pendentes</p>
                  <p className="text-sm font-medium text-red-600">
                    {totalDays - totalReconciled}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Taxa de Conciliação</p>
                  <p className="text-sm font-medium text-gray-900">
                    {reconciliationPercentage}%
                  </p>
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center justify-end gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setClosePeriodDialogOpen(false)}
                className="h-8 gap-1.5 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  if (canClosePeriod(selectedMonth)) {
                    closePeriod(selectedMonth, closePeriodJustification);
                    setClosePeriodDialogOpen(false);
                    toast.success("Período fechado com sucesso!");
                  } else {
                    toast.error("Não é possível fechar o período. Verifique as conciliações pendentes.");
                  }
                }}
                className="h-8 gap-1.5 text-white hover:bg-blue-700"
              >
                Fechar Período
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}