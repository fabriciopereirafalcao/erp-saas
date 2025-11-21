/**
 * Utilitários para manipulação de datas sem problemas de timezone
 * 
 * PROBLEMA: Quando usamos `new Date('YYYY-MM-DD')`, o JavaScript assume UTC
 * e pode causar diferença de 1 dia devido ao fuso horário local.
 * 
 * SOLUÇÃO: Fazer parsing manual da data para evitar conversão automática de timezone.
 */

/**
 * Formata uma data no formato YYYY-MM-DD para DD/MM/YYYY sem problema de timezone
 * @param dateString - Data no formato YYYY-MM-DD
 * @returns Data formatada como DD/MM/YYYY ou '-' se inválida
 */
export const formatDateLocal = (dateString: string | undefined | null): string => {
  if (!dateString) return '-';
  
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    
    // Validar se os valores são números válidos
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return '-';
    }
    
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  } catch (error) {
    console.error('Erro ao formatar data:', dateString, error);
    return '-';
  }
};

/**
 * Cria um objeto Date a partir de uma string YYYY-MM-DD sem problema de timezone
 * @param dateString - Data no formato YYYY-MM-DD
 * @returns Objeto Date no timezone local
 */
export const parseDateLocal = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Adiciona dias a uma data no formato YYYY-MM-DD
 * @param dateString - Data no formato YYYY-MM-DD
 * @param days - Número de dias a adicionar (pode ser negativo)
 * @returns Nova data no formato YYYY-MM-DD
 */
export const addDaysToDate = (dateString: string, days: number): string => {
  const date = parseDateLocal(dateString);
  date.setDate(date.getDate() + days);
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Formata uma data completa com horário para exibição
 * @param isoString - String ISO completa (com horário)
 * @returns Data e hora formatadas como DD/MM/YYYY HH:MM
 */
export const formatDateTimeLocal = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (error) {
    console.error('Erro ao formatar data/hora:', isoString, error);
    return '-';
  }
};

/**
 * Obtém a data atual no formato YYYY-MM-DD
 * @returns Data atual no formato YYYY-MM-DD
 */
export const getTodayString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Compara duas datas no formato YYYY-MM-DD
 * @param date1 - Primeira data
 * @param date2 - Segunda data
 * @returns -1 se date1 < date2, 0 se iguais, 1 se date1 > date2
 */
export const compareDates = (date1: string, date2: string): number => {
  const d1 = parseDateLocal(date1);
  const d2 = parseDateLocal(date2);
  
  if (d1 < d2) return -1;
  if (d1 > d2) return 1;
  return 0;
};

/**
 * Verifica se uma data está vencida (é anterior à data atual)
 * @param dateString - Data no formato YYYY-MM-DD
 * @returns true se a data está vencida
 */
export const isOverdue = (dateString: string): boolean => {
  const today = getTodayString();
  return compareDates(dateString, today) < 0;
};

/**
 * Calcula o número de dias entre duas datas
 * @param date1 - Data inicial no formato YYYY-MM-DD
 * @param date2 - Data final no formato YYYY-MM-DD
 * @returns Número de dias entre as datas (positivo se date2 > date1)
 */
export const daysBetween = (date1: string, date2: string): number => {
  const d1 = parseDateLocal(date1);
  const d2 = parseDateLocal(date2);
  
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};
