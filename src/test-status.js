// Teste para verificar se getSkippedStatuses está funcionando

const SALES_STATUS_ORDER = [
  "Processando",
  "Confirmado", 
  "Enviado",
  "Entregue",
  "Parcialmente Concluído",
  "Concluído"
];

function getSkippedStatuses(currentStatus, requestedStatus) {
  if (requestedStatus === "Cancelado") {
    return [];
  }
  
  const currentIndex = SALES_STATUS_ORDER.indexOf(currentStatus);
  const requestedIndex = SALES_STATUS_ORDER.indexOf(requestedStatus);
  
  console.log(`currentIndex: ${currentIndex}, requestedIndex: ${requestedIndex}`);
  
  if (currentIndex === -1 || requestedIndex === -1 || requestedIndex <= currentIndex) {
    return [];
  }
  
  return SALES_STATUS_ORDER.slice(currentIndex + 1, requestedIndex);
}

// Teste: Processando -> Entregue
console.log("Teste: Processando -> Entregue");
const result = getSkippedStatuses("Processando", "Entregue");
console.log("Skipped statuses:", result);
console.log("Expected: ['Confirmado', 'Enviado']");
