import { useState, useMemo } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Activity,
  Download,
  Filter,
  Search,
  Shield,
  User,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  AlertTriangle,
  LogIn,
  LogOut,
  Eye,
  TrendingUp,
  Calendar
} from "lucide-react";
import { 
  getAuditLogs, 
  getAccessLogs,
  getAuditStatistics,
  getAccessStatistics,
  exportLogs,
  AUDIT_MODULES
} from "../utils/auditLogger";
import { toast } from "sonner";
import { PaginationControls } from "./PaginationControls";
import { usePagination } from "../hooks/usePagination";

export function AuditLogsViewer() {
  const [searchTerm, setSearchTerm] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");

  // Obter logs e estatísticas
  const auditLogs = getAuditLogs();
  const accessLogs = getAccessLogs();
  const auditStats = getAuditStatistics();
  const accessStats = getAccessStatistics();

  // Paginação para logs de auditoria
  const auditPagination = usePagination({
    totalItems: auditLogs.length,
    itemsPerPage: 50
  });

  // Paginação para logs de acesso
  const accessPagination = usePagination({
    totalItems: accessLogs.length,
    itemsPerPage: 50
  });

  // Filtrar logs de auditoria
  const filteredAuditLogs = useMemo(() => {
    let filtered = [...auditLogs];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(log =>
        log.user.toLowerCase().includes(search) ||
        log.action.toLowerCase().includes(search) ||
        log.module.toLowerCase().includes(search) ||
        log.entityId?.toLowerCase().includes(search)
      );
    }

    if (moduleFilter !== "all") {
      filtered = filtered.filter(log => log.module === moduleFilter);
    }

    if (severityFilter !== "all") {
      filtered = filtered.filter(log => log.severity === severityFilter);
    }

    return filtered;
  }, [auditLogs, searchTerm, moduleFilter, severityFilter]);

  // Filtrar logs de acesso
  const filteredAccessLogs = useMemo(() => {
    let filtered = [...accessLogs];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(log =>
        log.user.toLowerCase().includes(search) ||
        log.action.toLowerCase().includes(search) ||
        log.module?.toLowerCase().includes(search)
      );
    }

    if (actionFilter !== "all") {
      filtered = filtered.filter(log => log.action === actionFilter);
    }

    return filtered;
  }, [accessLogs, searchTerm, actionFilter]);

  // Paginar logs
  const paginatedAuditLogs = filteredAuditLogs.slice(
    (auditPagination.currentPage - 1) * auditPagination.itemsPerPage,
    auditPagination.currentPage * auditPagination.itemsPerPage
  );

  const paginatedAccessLogs = filteredAccessLogs.slice(
    (accessPagination.currentPage - 1) * accessPagination.itemsPerPage,
    accessPagination.currentPage * accessPagination.itemsPerPage
  );

  // Exportar logs
  const handleExportLogs = () => {
    try {
      const data = exportLogs();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Logs exportados com sucesso!");
    } catch (error) {
      toast.error("Erro ao exportar logs");
      console.error(error);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical": return <XCircle className="w-4 h-4 text-red-600" />;
      case "error": return <AlertCircle className="w-4 h-4 text-orange-600" />;
      case "warning": return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default: return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors = {
      critical: "bg-red-100 text-red-700 border-red-200",
      error: "bg-orange-100 text-orange-700 border-orange-200",
      warning: "bg-yellow-100 text-yellow-700 border-yellow-200",
      info: "bg-blue-100 text-blue-700 border-blue-200"
    };
    return colors[severity as keyof typeof colors] || colors.info;
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "login": return <LogIn className="w-4 h-4 text-green-600" />;
      case "logout": return <LogOut className="w-4 h-4 text-gray-600" />;
      case "login_failed": return <XCircle className="w-4 h-4 text-red-600" />;
      case "module_access": return <Eye className="w-4 h-4 text-blue-600" />;
      case "unauthorized_attempt": return <Shield className="w-4 h-4 text-red-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-gray-900 mb-2">Logs de Auditoria e Acesso</h1>
            <p className="text-gray-600">
              Visualize e monitore todas as ações realizadas no sistema
            </p>
          </div>
          <Button onClick={handleExportLogs} className="bg-blue-600 hover:bg-blue-700">
            <Download className="w-4 h-4 mr-2" />
            Exportar Logs
          </Button>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 border-l-4 border-l-blue-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total de Ações</p>
                <p className="text-2xl text-gray-900">{auditStats.total}</p>
                <p className="text-xs text-gray-500">Últimas 24h: {auditStats.last24h}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-l-4 border-l-green-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Logins Bem-Sucedidos</p>
                <p className="text-2xl text-gray-900">{accessStats.successfulLogins}</p>
                <p className="text-xs text-gray-500">Taxa: {accessStats.successRate}%</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-l-4 border-l-red-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Tentativas Falhas</p>
                <p className="text-2xl text-gray-900">{accessStats.failedLogins}</p>
                <p className="text-xs text-gray-500">Monitoramento ativo</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-l-4 border-l-purple-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Usuários Ativos</p>
                <p className="text-2xl text-gray-900">{accessStats.activeUsers}</p>
                <p className="text-xs text-gray-500">Com acesso registrado</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por usuário, ação, módulo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="audit" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="audit">
            <Activity className="w-4 h-4 mr-2" />
            Logs de Auditoria ({auditStats.total})
          </TabsTrigger>
          <TabsTrigger value="access">
            <Shield className="w-4 h-4 mr-2" />
            Logs de Acesso ({accessStats.totalAccess})
          </TabsTrigger>
        </TabsList>

        {/* Tab de Logs de Auditoria */}
        <TabsContent value="audit" className="space-y-4">
          <div className="flex gap-4 mb-4">
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por módulo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Módulos</SelectItem>
                {Object.entries(AUDIT_MODULES).map(([key, value]) => (
                  <SelectItem key={key} value={value}>{value}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por severidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Severidades</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
                <SelectItem value="warning">Aviso</SelectItem>
                <SelectItem value="info">Informação</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Data/Hora</TableHead>
                  <TableHead className="w-[100px]">Severidade</TableHead>
                  <TableHead className="w-[120px]">Módulo</TableHead>
                  <TableHead className="w-[150px]">Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead className="w-[120px]">Entidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAuditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      Nenhum log de auditoria registrado
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedAuditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(log.timestamp).toLocaleString('pt-BR')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getSeverityBadge(log.severity)}>
                          <div className="flex items-center gap-1">
                            {getSeverityIcon(log.severity)}
                            <span className="capitalize">{log.severity}</span>
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.module}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-gray-400" />
                          {log.user}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{log.action}</TableCell>
                      <TableCell className="text-xs text-gray-600">
                        {log.entityType && (
                          <div>
                            <div className="font-medium">{log.entityType}</div>
                            <div className="text-gray-500">{log.entityId}</div>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {filteredAuditLogs.length > auditPagination.itemsPerPage && (
            <PaginationControls
              currentPage={auditPagination.currentPage}
              totalPages={auditPagination.totalPages}
              onPageChange={auditPagination.goToPage}
              onPrevious={auditPagination.previousPage}
              onNext={auditPagination.nextPage}
            />
          )}
        </TabsContent>

        {/* Tab de Logs de Acesso */}
        <TabsContent value="access" className="space-y-4">
          <div className="flex gap-4 mb-4">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Ações</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
                <SelectItem value="login_failed">Login Falho</SelectItem>
                <SelectItem value="module_access">Acesso a Módulo</SelectItem>
                <SelectItem value="unauthorized_attempt">Tentativa Não Autorizada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Data/Hora</TableHead>
                  <TableHead className="w-[150px]">Ação</TableHead>
                  <TableHead className="w-[150px]">Usuário</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[120px]">IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAccessLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      Nenhum log de acesso registrado
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedAccessLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(log.timestamp).toLocaleString('pt-BR')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          <span className="text-sm capitalize">
                            {log.action.replace('_', ' ')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-gray-400" />
                          {log.user}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.module || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={log.success 
                            ? "bg-green-100 text-green-700 border-green-200" 
                            : "bg-red-100 text-red-700 border-red-200"
                          }
                        >
                          {log.success ? (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Sucesso
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              Falha
                            </div>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-600">
                        {log.ip}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {filteredAccessLogs.length > accessPagination.itemsPerPage && (
            <PaginationControls
              currentPage={accessPagination.currentPage}
              totalPages={accessPagination.totalPages}
              onPageChange={accessPagination.goToPage}
              onPrevious={accessPagination.previousPage}
              onNext={accessPagination.nextPage}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}