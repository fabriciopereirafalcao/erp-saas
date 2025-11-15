import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "./ui/dropdown-menu";
import { Plus, Search, DollarSign, MoreVertical, Edit, Trash2, Eye, TrendingDown, TrendingUp, Tag, Copy } from "lucide-react";
import { useERP, PriceTableItem } from "../contexts/ERPContext";
import { toast } from "sonner@2.0.3";

export function PriceTables() {
  const { priceTables, inventory, addPriceTable, updatePriceTable, deletePriceTable, getDefaultPriceTable } = useERP();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  
  const [newTable, setNewTable] = useState({
    name: "",
    description: "",
    items: [] as PriceTableItem[]
  });

  const [editTable, setEditTable] = useState({
    name: "",
    description: "",
    items: [] as PriceTableItem[]
  });

  const defaultTable = getDefaultPriceTable();

  const filteredTables = priceTables.filter(table =>
    table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    table.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateTable = () => {
    if (!newTable.name.trim()) {
      toast.error("Digite um nome para a tabela");
      return;
    }

    if (newTable.items.length === 0) {
      toast.error("Adicione pelo menos um produto à tabela");
      return;
    }

    addPriceTable({
      name: newTable.name,
      description: newTable.description,
      isDefault: false,
      items: newTable.items
    });

    setNewTable({
      name: "",
      description: "",
      items: []
    });
    setIsCreateDialogOpen(false);
  };

  const handleEditTable = () => {
    if (!selectedTable) return;

    if (!editTable.name.trim()) {
      toast.error("Digite um nome para a tabela");
      return;
    }

    if (editTable.items.length === 0) {
      toast.error("A tabela deve ter pelo menos um produto");
      return;
    }

    updatePriceTable(selectedTable.id, {
      name: editTable.name,
      description: editTable.description,
      items: editTable.items
    });

    setIsEditDialogOpen(false);
    setSelectedTable(null);
  };

  const handleOpenEdit = (table: any) => {
    if (table.isDefault) {
      toast.error("A tabela padrão não pode ser editada. Ela é atualizada automaticamente pelo sistema.");
      return;
    }
    setSelectedTable(table);
    setEditTable({
      name: table.name,
      description: table.description,
      items: [...table.items]
    });
    setIsEditDialogOpen(true);
  };

  const handleOpenView = (table: any) => {
    setSelectedTable(table);
    setIsViewDialogOpen(true);
  };

  const handleDuplicate = (table: any) => {
    addPriceTable({
      name: `${table.name} (Cópia)`,
      description: table.description,
      isDefault: false,
      items: [...table.items]
    });
  };

  const handleDelete = (tableId: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta tabela de preços?")) {
      deletePriceTable(tableId);
    }
  };

  const addProductToNewTable = () => {
    const availableProducts = inventory.filter(
      item => !newTable.items.some(i => i.productName === item.productName)
    );
    
    if (availableProducts.length === 0) {
      toast.error("Todos os produtos já foram adicionados");
      return;
    }

    const defaultPrice = defaultTable?.items.find(
      i => i.productName === availableProducts[0].productName
    )?.price || availableProducts[0].pricePerUnit;

    setNewTable({
      ...newTable,
      items: [
        ...newTable.items,
        {
          productName: availableProducts[0].productName,
          price: defaultPrice,
          discount: 0
        }
      ]
    });
  };

  const addProductToEditTable = () => {
    const availableProducts = inventory.filter(
      item => !editTable.items.some(i => i.productName === item.productName)
    );
    
    if (availableProducts.length === 0) {
      toast.error("Todos os produtos já foram adicionados");
      return;
    }

    const defaultPrice = defaultTable?.items.find(
      i => i.productName === availableProducts[0].productName
    )?.price || availableProducts[0].pricePerUnit;

    setEditTable({
      ...editTable,
      items: [
        ...editTable.items,
        {
          productName: availableProducts[0].productName,
          price: defaultPrice,
          discount: 0
        }
      ]
    });
  };

  const updateNewTableItem = (index: number, field: keyof PriceTableItem, value: any) => {
    const updatedItems = [...newTable.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Recalculate discount if price changes
    if (field === 'price') {
      const defaultPrice = defaultTable?.items.find(
        i => i.productName === updatedItems[index].productName
      )?.price || 0;
      
      if (defaultPrice > 0) {
        const discount = ((defaultPrice - value) / defaultPrice) * 100;
        updatedItems[index].discount = Math.max(0, discount);
      }
    }
    
    setNewTable({ ...newTable, items: updatedItems });
  };

  const updateEditTableItem = (index: number, field: keyof PriceTableItem, value: any) => {
    const updatedItems = [...editTable.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Recalculate discount if price changes
    if (field === 'price') {
      const defaultPrice = defaultTable?.items.find(
        i => i.productName === updatedItems[index].productName
      )?.price || 0;
      
      if (defaultPrice > 0) {
        const discount = ((defaultPrice - value) / defaultPrice) * 100;
        updatedItems[index].discount = Math.max(0, discount);
      }
    }
    
    setEditTable({ ...editTable, items: updatedItems });
  };

  const removeNewTableItem = (index: number) => {
    setNewTable({
      ...newTable,
      items: newTable.items.filter((_, i) => i !== index)
    });
  };

  const removeEditTableItem = (index: number) => {
    setEditTable({
      ...editTable,
      items: editTable.items.filter((_, i) => i !== index)
    });
  };

  const calculateVariation = (price: number, productName: string) => {
    const defaultPrice = defaultTable?.items.find(i => i.productName === productName)?.price;
    if (!defaultPrice || defaultPrice === 0) return 0;
    return ((price - defaultPrice) / defaultPrice) * 100;
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-gray-900 mb-2">Tabelas de Preço</h1>
            <p className="text-gray-600">Gerencie tabelas de preço personalizadas para seus clientes</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[rgb(32,251,225)] hover:bg-[#18CBB5] text-[rgb(0,0,0)]">
                <Plus className="w-4 h-4 mr-2" />
                Nova Tabela
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Criar Nova Tabela de Preços</DialogTitle>
                <DialogDescription>
                  Configure uma nova tabela de preços personalizada com produtos e valores diferenciados
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto px-1">
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Nome da Tabela *</Label>
                    <Input
                      value={newTable.name}
                      onChange={(e) => setNewTable({ ...newTable, name: e.target.value })}
                      placeholder="ex: Atacado Premium, Clientes VIP"
                    />
                  </div>
                  
                  <div>
                    <Label>Descrição</Label>
                    <Textarea
                      value={newTable.description}
                      onChange={(e) => setNewTable({ ...newTable, description: e.target.value })}
                      placeholder="Descreva para que serve esta tabela..."
                      rows={2}
                    />
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <Label>Produtos e Preços</Label>
                      <Button onClick={addProductToNewTable} size="sm" variant="outline">
                        <Plus className="w-4 h-4 mr-1" />
                        Adicionar Produto
                      </Button>
                    </div>

                    {newTable.items.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                        <Tag className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                        <p>Nenhum produto adicionado ainda</p>
                        <p className="text-sm">Clique em "Adicionar Produto" para começar</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {newTable.items.map((item, index) => {
                          const defaultPrice = defaultTable?.items.find(i => i.productName === item.productName)?.price || 0;
                          const variation = calculateVariation(item.price, item.productName);
                          
                          return (
                            <Card key={index} className="p-3">
                              <div className="grid grid-cols-12 gap-3 items-center">
                                <div className="col-span-4">
                                  <Label className="text-xs text-gray-600">Produto</Label>
                                  <select
                                    className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                                    value={item.productName}
                                    onChange={(e) => updateNewTableItem(index, 'productName', e.target.value)}
                                  >
                                    {inventory.map((invItem) => (
                                      <option 
                                        key={invItem.id} 
                                        value={invItem.productName}
                                        disabled={newTable.items.some((i, idx) => idx !== index && i.productName === invItem.productName)}
                                      >
                                        {invItem.productName}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                
                                <div className="col-span-2">
                                  <Label className="text-xs text-gray-600">Preço Padrão</Label>
                                  <div className="mt-1 px-3 py-2 bg-gray-50 rounded-md text-sm px-[16px] py-[8px]">
                                    R$ {defaultPrice.toFixed(2)}
                                  </div>
                                </div>

                                <div className="col-span-2">
                                  <Label className="text-xs text-gray-600">Novo Preço *</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={item.price}
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value) || 0;
                                      updateNewTableItem(index, 'price', parseFloat(value.toFixed(2)));
                                    }}
                                    onBlur={(e) => {
                                      const value = parseFloat(e.target.value) || 0;
                                      updateNewTableItem(index, 'price', parseFloat(value.toFixed(2)));
                                    }}
                                    className="mt-1 px-[16px] py-[4px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                </div>

                                <div className="col-span-3">
                                  <Label className="text-xs text-gray-600">Variação</Label>
                                  <div className={`mt-1 px-3 py-2 rounded-md text-sm flex items-center gap-1 ${
                                    variation < 0 ? 'bg-red-50 text-red-700' : 
                                    variation > 0 ? 'bg-green-50 text-green-700' : 
                                    'bg-gray-50 text-gray-700'
                                  }`}>
                                    {variation < 0 ? (
                                      <TrendingDown className="w-4 h-4" />
                                    ) : variation > 0 ? (
                                      <TrendingUp className="w-4 h-4" />
                                    ) : null}
                                    {variation > 0 ? '+' : ''}{variation.toFixed(1)}%
                                  </div>
                                </div>

                                <div className="col-span-1 flex justify-end">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeNewTableItem(index)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t mt-4 flex gap-2">
                <Button onClick={handleCreateTable} className="flex-1 bg-green-600 hover:bg-green-700">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Criar Tabela
                </Button>
                <Button onClick={() => setIsCreateDialogOpen(false)} variant="outline">
                  Cancelar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Tag className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total de Tabelas</p>
                <p className="text-gray-900">{priceTables.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Tabelas Personalizadas</p>
                <p className="text-gray-900">{priceTables.filter(t => !t.isDefault).length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Tag className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Produtos Disponíveis</p>
                <p className="text-gray-900">{inventory.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Pesquisar tabelas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Info sobre Tabela Padrão */}
      {defaultTable && (
        <Card className="p-4 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Tag className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm text-blue-900 mb-1">
                💡 Tabela de Preço Padrão
              </h4>
              <p className="text-xs text-blue-800">
                A tabela padrão é gerada e atualizada <strong>automaticamente</strong> sempre que você cadastra 
                ou atualiza um produto no estoque. Os preços são baseados no "Preço de Venda" definido 
                no cadastro de produtos. Esta tabela não pode ser editada ou excluída manualmente.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Price Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTables.map((table) => (
          <Card key={table.id} className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
            table.isDefault 
              ? 'border-2 border-blue-400 bg-gradient-to-br from-blue-50 via-white to-blue-50' 
              : 'border border-gray-200 bg-gradient-to-br from-white to-gray-50 hover:border-purple-300'
          }`}>
            {/* Header com gradiente */}
            <div className={`p-4 border-b ${
              table.isDefault 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 border-blue-400' 
                : 'bg-gradient-to-r from-purple-500 to-pink-500 border-purple-400'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-5 h-5 text-white" />
                    <h3 className="text-white">{table.name}</h3>
                    {table.isDefault && (
                      <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                        <Tag className="w-3 h-3 mr-1" />
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-white/90 line-clamp-2">
                    {table.isDefault ? "Mesmo preço dos produtos cadastrados no estoque." : table.description}
                  </p>
                </div>
                
                {!table.isDefault ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white hover:bg-white/20">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenView(table)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Visualizar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenEdit(table)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(table)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleDelete(table.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            </div>

            {/* Conteúdo do card */}
            <div className="p-6">
              {/* Estatísticas com cards coloridos */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className={`p-4 rounded-lg border-2 ${
                  table.isDefault 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-purple-50 border-purple-200'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Tag className={`w-4 h-4 ${table.isDefault ? 'text-blue-600' : 'text-purple-600'}`} />
                    <span className="text-xs text-gray-600">Produtos</span>
                  </div>
                  <p className={`text-2xl ${table.isDefault ? 'text-blue-700' : 'text-purple-700'}`}>
                    {table.items.length}
                  </p>
                </div>

                <div className={`p-4 rounded-lg border-2 ${
                  table.isDefault 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-pink-50 border-pink-200'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className={`w-4 h-4 ${table.isDefault ? 'text-green-600' : 'text-pink-600'}`} />
                    <span className="text-xs text-gray-600">Atualizado</span>
                  </div>
                  <p className={`text-sm ${table.isDefault ? 'text-green-700' : 'text-pink-700'}`}>
                    {new Date(table.updatedAt).toLocaleDateString('pt-BR', { 
                      day: '2-digit', 
                      month: 'short' 
                    })}
                  </p>
                </div>
              </div>

              {/* Botão de ação */}
              <Button 
                onClick={() => handleOpenView(table)}
                className={`w-full ${
                  table.isDefault 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white' 
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
                } shadow-md transition-all duration-300`}
              >
                <Eye className="w-4 h-4 mr-2" />
                Ver Detalhes Completos
              </Button>
            </div>

            {/* Indicador visual de canto */}
            <div className={`absolute top-0 right-0 w-20 h-20 -mr-10 -mt-10 rounded-full blur-2xl opacity-30 ${
              table.isDefault ? 'bg-blue-400' : 'bg-purple-400'
            }`}></div>
          </Card>
        ))}
      </div>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTable?.name}
              {selectedTable?.isDefault && (
                <Badge className="bg-blue-100 text-blue-700">Padrão - Automática</Badge>
              )}
            </DialogTitle>
            <DialogDescription>{selectedTable?.description}</DialogDescription>
          </DialogHeader>

          {selectedTable?.isDefault && (
            <Card className="p-3 bg-blue-50 border-blue-200">
              <p className="text-xs text-blue-800">
                <strong>ℹ️ Tabela Automática:</strong> Esta tabela é atualizada automaticamente 
                sempre que você cadastra ou edita produtos no estoque. Os preços refletem o 
                "Preço de Venda" definido no cadastro de cada produto.
              </p>
            </Card>
          )}

          <div className="flex-1 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Preço Padrão</TableHead>
                  <TableHead className="text-right">Preço Tabela</TableHead>
                  <TableHead className="text-right">Variação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedTable?.items.map((item: PriceTableItem, index: number) => {
                  const defaultPrice = defaultTable?.items.find(i => i.productName === item.productName)?.price || 0;
                  const variation = calculateVariation(item.price, item.productName);
                  
                  return (
                    <TableRow key={index}>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell className="text-right">R$ {defaultPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right">R$ {item.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Badge className={
                          variation < 0 ? 'bg-red-100 text-red-700' : 
                          variation > 0 ? 'bg-green-100 text-green-700' : 
                          'bg-gray-100 text-gray-700'
                        }>
                          {variation > 0 ? '+' : ''}{variation.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="pt-4 border-t mt-4">
            <Button onClick={() => setIsViewDialogOpen(false)} variant="outline" className="w-full">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog - Similar to Create but with edit state */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Editar Tabela de Preços</DialogTitle>
            <DialogDescription>
              Atualize os dados e preços da tabela personalizada
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-1">
            <div className="space-y-4 mt-4">
              <div>
                <Label>Nome da Tabela *</Label>
                <Input
                  value={editTable.name}
                  onChange={(e) => setEditTable({ ...editTable, name: e.target.value })}
                  placeholder="ex: Atacado Premium, Clientes VIP"
                />
              </div>
              
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={editTable.description}
                  onChange={(e) => setEditTable({ ...editTable, description: e.target.value })}
                  placeholder="Descreva para que serve esta tabela..."
                  rows={2}
                />
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label>Produtos e Preços</Label>
                  <Button onClick={addProductToEditTable} size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar Produto
                  </Button>
                </div>

                {editTable.items.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    <Tag className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>Nenhum produto adicionado ainda</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {editTable.items.map((item, index) => {
                      const defaultPrice = defaultTable?.items.find(i => i.productName === item.productName)?.price || 0;
                      const variation = calculateVariation(item.price, item.productName);
                      
                      return (
                        <Card key={index} className="p-3">
                          <div className="grid grid-cols-12 gap-3 items-center">
                            <div className="col-span-4">
                              <Label className="text-xs text-gray-600">Produto</Label>
                              <select
                                className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                                value={item.productName}
                                onChange={(e) => updateEditTableItem(index, 'productName', e.target.value)}
                              >
                                {inventory.map((invItem) => (
                                  <option 
                                    key={invItem.id} 
                                    value={invItem.productName}
                                    disabled={editTable.items.some((i, idx) => idx !== index && i.productName === invItem.productName)}
                                  >
                                    {invItem.productName}
                                  </option>
                                ))}
                              </select>
                            </div>
                            
                            <div className="col-span-2">
                              <Label className="text-xs text-gray-600">Preço Padrão</Label>
                              <div className="mt-1 px-3 py-2 bg-gray-50 rounded-md text-sm">
                                R$ {defaultPrice.toFixed(2)}
                              </div>
                            </div>

                            <div className="col-span-2">
                              <Label className="text-xs text-gray-600">Novo Preço *</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.price}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value) || 0;
                                  updateEditTableItem(index, 'price', parseFloat(value.toFixed(2)));
                                }}
                                onBlur={(e) => {
                                  const value = parseFloat(e.target.value) || 0;
                                  updateEditTableItem(index, 'price', parseFloat(value.toFixed(2)));
                                }}
                                className="mt-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>

                            <div className="col-span-3">
                              <Label className="text-xs text-gray-600">Variação</Label>
                              <div className={`mt-1 px-3 py-2 rounded-md text-sm flex items-center gap-1 ${
                                variation < 0 ? 'bg-red-50 text-red-700' : 
                                variation > 0 ? 'bg-green-50 text-green-700' : 
                                'bg-gray-50 text-gray-700'
                              }`}>
                                {variation < 0 ? (
                                  <TrendingDown className="w-4 h-4" />
                                ) : variation > 0 ? (
                                  <TrendingUp className="w-4 h-4" />
                                ) : null}
                                {variation > 0 ? '+' : ''}{variation.toFixed(1)}%
                              </div>
                            </div>

                            <div className="col-span-1 flex justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeEditTableItem(index)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t mt-4 flex gap-2">
            <Button onClick={handleEditTable} className="flex-1 bg-green-600 hover:bg-green-700">
              <DollarSign className="w-4 h-4 mr-2" />
              Salvar Alterações
            </Button>
            <Button onClick={() => setIsEditDialogOpen(false)} variant="outline">
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Info Box */}
      <Card className="mt-6 p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
            <Tag className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-blue-900 mb-2">💰 Como funcionam as Tabelas de Preço</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• A <strong>Tabela Padrão</strong> é gerada automaticamente com os preços cadastrados no estoque</p>
              <p>• Crie <strong>tabelas personalizadas</strong> para oferecer preços diferenciados para grupos específicos de clientes</p>
              <p>• A <strong>variação</strong> mostra o percentual de diferença em relação à tabela padrão</p>
              <p>• Você pode <strong>vincular uma tabela</strong> ao cadastro de um cliente para aplicar preços especiais</p>
              <p className="mt-2 text-blue-700">💡 <strong>Dica:</strong> Use tabelas diferentes para atacado, varejo, clientes VIP, promoções, etc.</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}