import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { PaginationConfig, PaginationControls as Controls, getPaginationInfo, getPageNumbers } from "../hooks/usePagination";

interface PaginationControlsProps {
  pagination: PaginationConfig;
  controls: Controls;
  itemsPerPageOptions?: number[];
  className?: string;
}

export function PaginationControls({
  pagination,
  controls,
  itemsPerPageOptions = [10, 25, 50, 100],
  className = ""
}: PaginationControlsProps) {
  const pageNumbers = getPageNumbers(pagination.currentPage, pagination.totalPages);
  const paginationInfo = getPaginationInfo(pagination);

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      {/* Info e seletor de itens por página */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          {paginationInfo}
        </span>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Itens por página:</span>
          <Select
            value={pagination.itemsPerPage.toString()}
            onValueChange={(value) => controls.setItemsPerPage(Number(value))}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {itemsPerPageOptions.map((option) => (
                <SelectItem key={option} value={option.toString()}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Controles de navegação */}
      <div className="flex items-center gap-2">
        {/* Primeira página */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => controls.goToPage(1)}
          disabled={!controls.canGoPrevious}
          className="h-8 w-8 p-0"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Página anterior */}
        <Button
          variant="outline"
          size="sm"
          onClick={controls.previousPage}
          disabled={!controls.canGoPrevious}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Números de página */}
        {pageNumbers.map((pageNum, index) => {
          if (pageNum === '...') {
            return (
              <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
                ...
              </span>
            );
          }

          const isActive = pageNum === pagination.currentPage;
          
          return (
            <Button
              key={pageNum}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => controls.goToPage(pageNum as number)}
              className={`h-8 w-8 p-0 ${isActive ? 'bg-green-600 hover:bg-green-700' : ''}`}
            >
              {pageNum}
            </Button>
          );
        })}

        {/* Próxima página */}
        <Button
          variant="outline"
          size="sm"
          onClick={controls.nextPage}
          disabled={!controls.canGoNext}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Última página */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => controls.goToPage(pagination.totalPages)}
          disabled={!controls.canGoNext}
          className="h-8 w-8 p-0"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
