// Utilitários para exportação de dados para Excel e PDF

import { format } from "date-fns@4.1.0";
import { ptBR } from "date-fns@4.1.0/locale";

/**
 * Exporta dados para Excel (CSV)
 * @param data - Array de objetos com os dados
 * @param headers - Array com os cabeçalhos das colunas
 * @param filename - Nome do arquivo (sem extensão)
 */
export function exportToExcel(
  data: Record<string, any>[],
  headers: { key: string; label: string }[],
  filename: string
) {
  // Criar cabeçalhos
  const csvHeaders = headers.map(h => h.label).join(',');
  
  // Criar linhas de dados
  const csvRows = data.map(row => {
    return headers.map(header => {
      let value = row[header.key];
      
      // Formatar valores especiais
      if (value === null || value === undefined) {
        value = '';
      } else if (typeof value === 'number') {
        value = value.toString().replace('.', ',');
      } else if (typeof value === 'object' && value instanceof Date) {
        value = format(value, 'dd/MM/yyyy', { locale: ptBR });
      } else {
        value = String(value);
      }
      
      // Escapar aspas e envolver em aspas se contém vírgula
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      
      return value;
    }).join(',');
  });
  
  // Combinar tudo
  const csv = [csvHeaders, ...csvRows].join('\n');
  
  // Adicionar BOM para suporte a caracteres UTF-8 no Excel
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  
  // Criar link para download
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exporta dados para PDF simples (usando HTML2Canvas + jsPDF)
 * @param elementId - ID do elemento HTML a ser convertido em PDF
 * @param filename - Nome do arquivo (sem extensão)
 */
export async function exportToPDF(elementId: string, filename: string) {
  try {
    // Importar bibliotecas dinamicamente
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');
    
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Elemento com ID "${elementId}" não encontrado`);
    }
    
    // Capturar elemento como imagem
    const canvas = await html2canvas(element, {
      scale: 2,
      logging: false,
      useCORS: true
    });
    
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    let heightLeft = imgHeight;
    let position = 0;
    
    // Adicionar imagem ao PDF (com paginação se necessário)
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    pdf.save(`${filename}.pdf`);
    return true;
  } catch (error) {
    console.error('Erro ao exportar para PDF:', error);
    throw error;
  }
}

/**
 * Exporta tabela específica para Excel
 * @param tableData - Dados da tabela
 * @param columns - Definição das colunas
 * @param filename - Nome do arquivo
 */
export function exportTableToExcel(
  tableData: Record<string, any>[],
  columns: { key: string; label: string; format?: (value: any) => string }[],
  filename: string
) {
  const formattedData = tableData.map(row => {
    const formattedRow: Record<string, any> = {};
    columns.forEach(col => {
      formattedRow[col.key] = col.format 
        ? col.format(row[col.key]) 
        : row[col.key];
    });
    return formattedRow;
  });
  
  exportToExcel(formattedData, columns, filename);
}

/**
 * Formata valor monetário para exportação
 */
export function formatCurrencyForExport(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

/**
 * Formata data para exportação
 */
export function formatDateForExport(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'dd/MM/yyyy', { locale: ptBR });
}

/**
 * Formata data e hora para exportação
 */
export function formatDateTimeForExport(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}
