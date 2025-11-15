import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Plus, Trash2, User, Users } from "lucide-react";
import { useERP } from "../contexts/ERPContext";
import { toast } from "sonner@2.0.3";

interface SalesAndPurchasePersonManagementProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "salespeople" | "buyers";
}

export function SalesAndPurchasePersonManagement({ 
  isOpen, 
  onClose,
  defaultTab = "salespeople"
}: SalesAndPurchasePersonManagementProps) {
  const { 
    salespeople, 
    buyers,
    addSalesperson, 
    deleteSalesperson,
    addBuyer,
    deleteBuyer
  } = useERP();

  const [activeTab, setActiveTab] = useState(defaultTab);
  
  // Estados para vendedor
  const [salespersonName, setSalespersonName] = useState("");
  const [salespersonCPF, setSalespersonCPF] = useState("");

  // Estados para comprador
  const [buyerName, setBuyerName] = useState("");
  const [buyerCPF, setBuyerCPF] = useState("");

  // Função para formatar CPF
  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return value;
  };

  // Validar CPF
  const validateCPF = (cpf: string): boolean => {
    const numbers = cpf.replace(/\D/g, '');
    if (numbers.length !== 11) return false;
    
    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(numbers)) return false;
    
    return true;
  };

  const handleAddSalesperson = () => {
    if (!salespersonName.trim()) {
      toast.error("Digite o nome do vendedor");
      return;
    }
    
    if (!salespersonCPF.trim()) {
      toast.error("Digite o CPF do vendedor");
      return;
    }

    if (!validateCPF(salespersonCPF)) {
      toast.error("CPF inválido");
      return;
    }

    // Verificar duplicidade de CPF
    if (salespeople.some(sp => sp.cpf === salespersonCPF)) {
      toast.error("Já existe um vendedor cadastrado com este CPF");
      return;
    }

    addSalesperson({
      name: salespersonName,
      cpf: salespersonCPF
    });

    setSalespersonName("");
    setSalespersonCPF("");
  };

  const handleAddBuyer = () => {
    if (!buyerName.trim()) {
      toast.error("Digite o nome do comprador");
      return;
    }
    
    if (!buyerCPF.trim()) {
      toast.error("Digite o CPF do comprador");
      return;
    }

    if (!validateCPF(buyerCPF)) {
      toast.error("CPF inválido");
      return;
    }

    // Verificar duplicidade de CPF
    if (buyers.some(b => b.cpf === buyerCPF)) {
      toast.error("Já existe um comprador cadastrado com este CPF");
      return;
    }

    addBuyer({
      name: buyerName,
      cpf: buyerCPF
    });

    setBuyerName("");
    setBuyerCPF("");
  };

  const handleDeleteSalesperson = (id: string, name: string) => {
    if (window.confirm(`Deseja realmente remover o vendedor "${name}"?`)) {
      deleteSalesperson(id);
    }
  };

  const handleDeleteBuyer = (id: string, name: string) => {
    if (window.confirm(`Deseja realmente remover o comprador "${name}"?`)) {
      deleteBuyer(id);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Gerenciar Vendedores e Compradores
          </DialogTitle>
          <DialogDescription>
            Cadastre e gerencie vendedores e compradores da sua empresa
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="salespeople">
              <User className="w-4 h-4 mr-2" />
              Vendedores
            </TabsTrigger>
            <TabsTrigger value="buyers">
              <User className="w-4 h-4 mr-2" />
              Compradores
            </TabsTrigger>
          </TabsList>

          {/* Aba de Vendedores */}
          <TabsContent value="salespeople" className="space-y-4">
            <div className="rounded-lg border p-4 space-y-4">
              <h3 className="font-medium">Adicionar Vendedor</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salesperson-name">Nome Completo</Label>
                  <Input
                    id="salesperson-name"
                    value={salespersonName}
                    onChange={(e) => setSalespersonName(e.target.value)}
                    placeholder="Digite o nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salesperson-cpf">CPF</Label>
                  <Input
                    id="salesperson-cpf"
                    value={salespersonCPF}
                    onChange={(e) => setSalespersonCPF(formatCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>
              </div>
              <Button onClick={handleAddSalesperson} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Vendedor
              </Button>
            </div>

            {/* Lista de Vendedores */}
            <div className="space-y-2">
              <h3 className="font-medium">Vendedores Cadastrados ({salespeople.length})</h3>
              {salespeople.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum vendedor cadastrado</p>
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead className="w-[100px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salespeople.map((person) => (
                        <TableRow key={person.id}>
                          <TableCell className="font-mono text-sm">{person.id}</TableCell>
                          <TableCell>{person.name}</TableCell>
                          <TableCell className="font-mono text-sm">{person.cpf}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSalesperson(person.id, person.name)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Aba de Compradores */}
          <TabsContent value="buyers" className="space-y-4">
            <div className="rounded-lg border p-4 space-y-4">
              <h3 className="font-medium">Adicionar Comprador</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="buyer-name">Nome Completo</Label>
                  <Input
                    id="buyer-name"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Digite o nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buyer-cpf">CPF</Label>
                  <Input
                    id="buyer-cpf"
                    value={buyerCPF}
                    onChange={(e) => setBuyerCPF(formatCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>
              </div>
              <Button onClick={handleAddBuyer} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Comprador
              </Button>
            </div>

            {/* Lista de Compradores */}
            <div className="space-y-2">
              <h3 className="font-medium">Compradores Cadastrados ({buyers.length})</h3>
              {buyers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum comprador cadastrado</p>
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead className="w-[100px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {buyers.map((person) => (
                        <TableRow key={person.id}>
                          <TableCell className="font-mono text-sm">{person.id}</TableCell>
                          <TableCell>{person.name}</TableCell>
                          <TableCell className="font-mono text-sm">{person.cpf}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteBuyer(person.id, person.name)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
