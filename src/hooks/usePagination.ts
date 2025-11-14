import { useState, useMemo } from 'react';

export interface PaginationConfig {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginationControls {
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setItemsPerPage: (items: number) => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
}

export interface UsePaginationReturn<T> {
  paginatedData: T[];
  pagination: PaginationConfig;
  controls: PaginationControls;
}

/**
 * Hook personalizado para paginação de dados
 * @param data - Array de dados a serem paginados
 * @param initialItemsPerPage - Número inicial de itens por página (padrão: 10)
 * @returns Dados paginados e controles de paginação
 */
export function usePagination<T>(
  data: T[],
  initialItemsPerPage: number = 10
): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPageState] = useState(initialItemsPerPage);

  // Calcular total de páginas
  const totalPages = Math.ceil(data.length / itemsPerPage);

  // Ajustar página atual se estiver fora do range
  useMemo(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Calcular dados paginados
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, itemsPerPage]);

  // Controles de navegação
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const setItemsPerPage = (items: number) => {
    setItemsPerPageState(items);
    setCurrentPage(1); // Resetar para primeira página ao mudar itens por página
  };

  return {
    paginatedData,
    pagination: {
      currentPage,
      itemsPerPage,
      totalItems: data.length,
      totalPages: totalPages || 1,
    },
    controls: {
      goToPage,
      nextPage,
      previousPage,
      setItemsPerPage,
      canGoNext: currentPage < totalPages,
      canGoPrevious: currentPage > 1,
    },
  };
}

/**
 * Componente helper para exibir informações de paginação
 */
export function getPaginationInfo(pagination: PaginationConfig): string {
  const start = (pagination.currentPage - 1) * pagination.itemsPerPage + 1;
  const end = Math.min(
    pagination.currentPage * pagination.itemsPerPage,
    pagination.totalItems
  );
  
  if (pagination.totalItems === 0) {
    return 'Nenhum item encontrado';
  }
  
  return `Exibindo ${start} a ${end} de ${pagination.totalItems} itens`;
}

/**
 * Gera array de números de página para exibição
 * @param currentPage - Página atual
 * @param totalPages - Total de páginas
 * @param maxVisible - Máximo de páginas visíveis (padrão: 5)
 * @returns Array de números de página
 */
export function getPageNumbers(
  currentPage: number,
  totalPages: number,
  maxVisible: number = 5
): (number | string)[] {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | string)[] = [];
  const halfVisible = Math.floor(maxVisible / 2);
  
  let startPage = Math.max(currentPage - halfVisible, 1);
  let endPage = Math.min(startPage + maxVisible - 1, totalPages);
  
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(endPage - maxVisible + 1, 1);
  }
  
  if (startPage > 1) {
    pages.push(1);
    if (startPage > 2) {
      pages.push('...');
    }
  }
  
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }
  
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      pages.push('...');
    }
    pages.push(totalPages);
  }
  
  return pages;
}
