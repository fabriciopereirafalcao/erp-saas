import { useState, useMemo, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "./ui/dropdown-menu";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Switch } from "./ui/switch";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Separator } from "./ui/separator";
import { Alert, AlertDescription } from "./ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Shield, 
  Users, 
  UserCheck, 
  UserX, 
  Key, 
  Lock,
  Mail,
  Phone,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Send,
  Copy,
  RefreshCw,
  Building2
} from "lucide-react";
import { toast } from "sonner";
import { validateEmail } from "../utils/fieldValidation";
import { InviteUserDialog } from "./InviteUserDialog";
import { supabase } from "../utils/supabase/client";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { useERP } from "../contexts/ERPContext";

// Helper para verificar se os dados essenciais da empresa estão cadastrados
const isCompanyDataComplete = (companySettings: any): { complete: boolean; missingFields: string[] } => {
  const missingFields: string[] = [];
  
  // Campos obrigatórios dos Dados Gerais
  if (!companySettings.cnpj || companySettings.cnpj.trim() === '') missingFields.push('CNPJ');
  if (!companySettings.companyName || companySettings.companyName.trim() === '') missingFields.push('Razão Social');
  if (!companySettings.tradeName || companySettings.tradeName.trim() === '') missingFields.push('Nome Fantasia');
  if (!companySettings.email || companySettings.email.trim() === '') missingFields.push('Email');
  if (!companySettings.phone || companySettings.phone.trim() === '') missingFields.push('Telefone');
  
  // Campos obrigatórios do Endereço
  if (!companySettings.zipCode || companySettings.zipCode.trim() === '') missingFields.push('CEP');
  if (!companySettings.street || companySettings.street.trim() === '') missingFields.push('Logradouro');
  if (!companySettings.number || companySettings.number.trim() === '') missingFields.push('Número');
  if (!companySettings.city || companySettings.city.trim() === '') missingFields.push('Cidade');
  if (!companySettings.state || companySettings.state.trim() === '') missingFields.push('Estado');
  
  return {
    complete: missingFields.length === 0,
    missingFields
  };
};

// Tipos
interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: "Ativo" | "Inativo" | "Bloqueado";
  createdAt: string;
  lastAccess?: string;
  avatar?: string;
}

interface Invite {
  id: string;
  email: string;
  role: string;
  status: "Pendente" | "Aceito" | "Expirado" | "Cancelado";
  invitedBy: string;
  invitedAt: string;
  acceptedAt?: string;
  expiresAt: string;
  inviteLink: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: RolePermissions;
  isSystem: boolean;
}

interface ModulePermission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  export?: boolean;
  approve?: boolean;
}

interface RolePermissions {
  dashboard: ModulePermission;
  inventory: ModulePermission;
  purchases: ModulePermission;
  sales: ModulePermission;
  customers: ModulePermission;
  suppliers: ModulePermission;
  priceTables: ModulePermission;
  taxInvoicing: ModulePermission;
  financial: ModulePermission;
  accounts: ModulePermission;
  bankReconciliation: ModulePermission;
  cashFlow: ModulePermission;
  reports: ModulePermission;
  company: ModulePermission;
  users: ModulePermission;
}

const defaultModulePermission: ModulePermission = {
  view: false,
  create: false,
  edit: false,
  delete: false,
  export: false,
  approve: false
};

const MODULES = [
  { id: "dashboard", name: "Dashboard", hasApprove: false },
  { id: "inventory", name: "Estoque", hasApprove: false },
  { id: "purchases", name: "Compras", hasApprove: true },
  { id: "sales", name: "Vendas", hasApprove: true },
  { id: "customers", name: "Clientes", hasApprove: false },
  { id: "suppliers", name: "Fornecedores", hasApprove: false },
  { id: "priceTables", name: "Tabelas de Preço", hasApprove: false },
  { id: "taxInvoicing", name: "Faturamento Fiscal", hasApprove: true },
  { id: "financial", name: "Financeiro", hasApprove: true },
  { id: "accounts", name: "Contas a Pagar/Receber", hasApprove: true },
  { id: "bankReconciliation", name: "Conciliação Bancária", hasApprove: false },
  { id: "cashFlow", name: "Fluxo de Caixa", hasApprove: false },
  { id: "reports", name: "Relatórios", hasApprove: false },
  { id: "company", name: "Minha Empresa", hasApprove: false },
  { id: "users", name: "Usuários e Permissões", hasApprove: false },
];

export function UsersPermissions() {
  const { companySettings } = useERP();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  
  // Verificar se dados da empresa estão completos
  const companyDataStatus = isCompanyDataComplete(companySettings);

  // Estado do formulário de usuário
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    status: "Ativo" as "Ativo" | "Inativo" | "Bloqueado",
    password: ""
  });

  // Estado do formulário de perfil
  const [roleForm, setRoleForm] = useState({
    name: "",
    description: "",
    permissions: {} as RolePermissions
  });

  // Mock de perfis do sistema
  const [roles, setRoles] = useState<Role[]>([
    {
      id: "admin",
      name: "Administrador",
      description: "Acesso completo a todos os módulos do sistema",
      isSystem: true,
      permissions: {
        dashboard: { view: true, create: true, edit: true, delete: true, export: true, approve: true },
        inventory: { view: true, create: true, edit: true, delete: true, export: true, approve: true },
        purchases: { view: true, create: true, edit: true, delete: true, export: true, approve: true },
        sales: { view: true, create: true, edit: true, delete: true, export: true, approve: true },
        customers: { view: true, create: true, edit: true, delete: true, export: true, approve: true },
        suppliers: { view: true, create: true, edit: true, delete: true, export: true, approve: true },
        priceTables: { view: true, create: true, edit: true, delete: true, export: true, approve: true },
        taxInvoicing: { view: true, create: true, edit: true, delete: true, export: true, approve: true },
        financial: { view: true, create: true, edit: true, delete: true, export: true, approve: true },
        accounts: { view: true, create: true, edit: true, delete: true, export: true, approve: true },
        bankReconciliation: { view: true, create: true, edit: true, delete: true, export: true, approve: true },
        cashFlow: { view: true, create: true, edit: true, delete: true, export: true, approve: true },
        reports: { view: true, create: true, edit: true, delete: true, export: true, approve: true },
        company: { view: true, create: true, edit: true, delete: true, export: true, approve: true },
        users: { view: true, create: true, edit: true, delete: true, export: true, approve: true }
      }
    },
    {
      id: "manager",
      name: "Gerente",
      description: "Acesso a operações e relatórios, com poder de aprovação",
      isSystem: true,
      permissions: {
        dashboard: { view: true, create: false, edit: false, delete: false, export: true, approve: false },
        inventory: { view: true, create: true, edit: true, delete: false, export: true, approve: false },
        purchases: { view: true, create: true, edit: true, delete: false, export: true, approve: true },
        sales: { view: true, create: true, edit: true, delete: false, export: true, approve: true },
        customers: { view: true, create: true, edit: true, delete: false, export: true, approve: false },
        suppliers: { view: true, create: true, edit: true, delete: false, export: true, approve: false },
        priceTables: { view: true, create: true, edit: true, delete: false, export: true, approve: false },
        taxInvoicing: { view: true, create: true, edit: true, delete: false, export: true, approve: true },
        financial: { view: true, create: true, edit: true, delete: false, export: true, approve: true },
        accounts: { view: true, create: true, edit: true, delete: false, export: true, approve: true },
        bankReconciliation: { view: true, create: true, edit: true, delete: false, export: true, approve: false },
        cashFlow: { view: true, create: false, edit: false, delete: false, export: true, approve: false },
        reports: { view: true, create: false, edit: false, delete: false, export: true, approve: false },
        company: { view: true, create: false, edit: true, delete: false, export: false, approve: false },
        users: { view: true, create: false, edit: false, delete: false, export: false, approve: false }
      }
    },
    {
      id: "salesperson",
      name: "Vendedor",
      description: "Acesso aos módulos de vendas, clientes e estoque",
      isSystem: true,
      permissions: {
        dashboard: { view: true, create: false, edit: false, delete: false, export: false, approve: false },
        inventory: { view: true, create: false, edit: false, delete: false, export: false, approve: false },
        purchases: { view: false, create: false, edit: false, delete: false, export: false, approve: false },
        sales: { view: true, create: true, edit: true, delete: false, export: true, approve: false },
        customers: { view: true, create: true, edit: true, delete: false, export: true, approve: false },
        suppliers: { view: false, create: false, edit: false, delete: false, export: false, approve: false },
        priceTables: { view: true, create: false, edit: false, delete: false, export: false, approve: false },
        taxInvoicing: { view: false, create: false, edit: false, delete: false, export: false, approve: false },
        financial: { view: false, create: false, edit: false, delete: false, export: false, approve: false },
        accounts: { view: false, create: false, edit: false, delete: false, export: false, approve: false },
        bankReconciliation: { view: false, create: false, edit: false, delete: false, export: false, approve: false },
        cashFlow: { view: false, create: false, edit: false, delete: false, export: false, approve: false },
        reports: { view: true, create: false, edit: false, delete: false, export: true, approve: false },
        company: { view: false, create: false, edit: false, delete: false, export: false, approve: false },
        users: { view: false, create: false, edit: false, delete: false, export: false, approve: false }
      }
    },
    {
      id: "buyer",
      name: "Comprador",
      description: "Acesso aos módulos de compras, fornecedores e estoque",
      isSystem: true,
      permissions: {
        dashboard: { view: true, create: false, edit: false, delete: false, export: false, approve: false },
        inventory: { view: true, create: true, edit: true, delete: false, export: true, approve: false },
        purchases: { view: true, create: true, edit: true, delete: false, export: true, approve: false },
        sales: { view: false, create: false, edit: false, delete: false, export: false, approve: false },
        customers: { view: false, create: false, edit: false, delete: false, export: false, approve: false },
        suppliers: { view: true, create: true, edit: true, delete: false, export: true, approve: false },
        priceTables: { view: true, create: false, edit: false, delete: false, export: false, approve: false },
        taxInvoicing: { view: false, create: false, edit: false, delete: false, export: false, approve: false },
        financial: { view: false, create: false, edit: false, delete: false, export: false, approve: false },
        accounts: { view: false, create: false, edit: false, delete: false, export: false, approve: false },
        bankReconciliation: { view: false, create: false, edit: false, delete: false, export: false, approve: false },
        cashFlow: { view: false, create: false, edit: false, delete: false, export: false, approve: false },
        reports: { view: true, create: false, edit: false, delete: false, export: true, approve: false },
        company: { view: false, create: false, edit: false, delete: false, export: false, approve: false },
        users: { view: false, create: false, edit: false, delete: false, export: false, approve: false }
      }
    },
    {
      id: "financial",
      name: "Financeiro",
      description: "Acesso aos módulos financeiros e relatórios",
      isSystem: true,
      permissions: {
        dashboard: { view: true, create: false, edit: false, delete: false, export: false, approve: false },
        inventory: { view: true, create: false, edit: false, delete: false, export: false, approve: false },
        purchases: { view: true, create: false, edit: false, delete: false, export: true, approve: false },
        sales: { view: true, create: false, edit: false, delete: false, export: true, approve: false },
        customers: { view: true, create: false, edit: false, delete: false, export: true, approve: false },
        suppliers: { view: true, create: false, edit: false, delete: false, export: true, approve: false },
        priceTables: { view: true, create: false, edit: false, delete: false, export: false, approve: false },
        taxInvoicing: { view: true, create: true, edit: true, delete: false, export: true, approve: false },
        financial: { view: true, create: true, edit: true, delete: false, export: true, approve: false },
        accounts: { view: true, create: true, edit: true, delete: false, export: true, approve: true },
        bankReconciliation: { view: true, create: true, edit: true, delete: false, export: true, approve: false },
        cashFlow: { view: true, create: false, edit: false, delete: false, export: true, approve: false },
        reports: { view: true, create: false, edit: false, delete: false, export: true, approve: false },
        company: { view: false, create: false, edit: false, delete: false, export: false, approve: false },
        users: { view: false, create: false, edit: false, delete: false, export: false, approve: false }
      }
    },
    {
      id: "viewer",
      name: "Visualizador",
      description: "Acesso somente leitura aos principais módulos",
      isSystem: true,
      permissions: {
        dashboard: { view: true, create: false, edit: false, delete: false, export: false, approve: false },
        inventory: { view: true, create: false, edit: false, delete: false, export: false, approve: false },
        purchases: { view: true, create: false, edit: false, delete: false, export: false, approve: false },
        sales: { view: true, create: false, edit: false, delete: false, export: false, approve: false },
        customers: { view: true, create: false, edit: false, delete: false, export: false, approve: false },
        suppliers: { view: true, create: false, edit: false, delete: false, export: false, approve: false },
        priceTables: { view: true, create: false, edit: false, delete: false, export: false, approve: false },
        taxInvoicing: { view: false, create: false, edit: false, delete: false, export: false, approve: false },
        financial: { view: false, create: false, edit: false, delete: false, export: false, approve: false },
        accounts: { view: false, create: false, edit: false, delete: false, export: false, approve: false },
        bankReconciliation: { view: false, create: false, edit: false, delete: false, export: false, approve: false },
        cashFlow: { view: false, create: false, edit: false, delete: false, export: false, approve: false },
        reports: { view: true, create: false, edit: false, delete: false, export: false, approve: false },
        company: { view: false, create: false, edit: false, delete: false, export: false, approve: false },
        users: { view: false, create: false, edit: false, delete: false, export: false, approve: false }
      }
    }
  ]);

  // Mock de usuários
  const [users, setUsers] = useState<User[]>([
    {
      id: "USR-001",
      name: "João Silva",
      email: "joao.silva@empresa.com",
      phone: "(11) 98765-4321",
      role: "admin",
      status: "Ativo",
      createdAt: "2024-01-10",
      lastAccess: "2024-11-06"
    },
    {
      id: "USR-002",
      name: "Maria Santos",
      email: "maria.santos@empresa.com",
      phone: "(11) 98765-4322",
      role: "manager",
      status: "Ativo",
      createdAt: "2024-02-15",
      lastAccess: "2024-11-05"
    },
    {
      id: "USR-003",
      name: "Carlos Oliveira",
      email: "carlos.oliveira@empresa.com",
      phone: "(11) 98765-4323",
      role: "salesperson",
      status: "Ativo",
      createdAt: "2024-03-20",
      lastAccess: "2024-11-06"
    },
    {
      id: "USR-004",
      name: "Ana Costa",
      email: "ana.costa@empresa.com",
      phone: "(11) 98765-4324",
      role: "financial",
      status: "Ativo",
      createdAt: "2024-04-10",
      lastAccess: "2024-11-04"
    },
    {
      id: "USR-005",
      name: "Pedro Alves",
      email: "pedro.alves@empresa.com",
      phone: "(11) 98765-4325",
      role: "buyer",
      status: "Inativo",
      createdAt: "2024-05-15",
      lastAccess: "2024-10-20"
    }
  ]);

  // Convites do banco de dados
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);

  // Estado para filtros de convites
  const [inviteSearchTerm, setInviteSearchTerm] = useState("");
  const [inviteStatusFilter, setInviteStatusFilter] = useState<string>("all");

  // Carregar convites do banco de dados
  useEffect(() => {
    loadInvites();
  }, []);

  const loadInvites = async () => {
    setLoadingInvites(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('Usuário não logado');
        setLoadingInvites(false);
        return;
      }

      // Buscar convites do backend
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-686b5e88/invites`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao carregar convites');
      }

      const data = await response.json();
      
      // Mapear os dados do backend para o formato esperado
      const mappedInvites: Invite[] = data.invites.map((invite: any) => {
        // Calcular status baseado na data de expiração e se foi aceito
        let status: "Pendente" | "Aceito" | "Expirado" | "Cancelado" = "Pendente";
        
        if (invite.accepted_at) {
          status = "Aceito";
        } else if (new Date(invite.expires_at) < new Date()) {
          status = "Expirado";
        } else if (invite.status === 'cancelled') {
          status = "Cancelado";
        }

        return {
          id: invite.id,
          email: invite.email,
          role: invite.role,
          status: status,
          invitedBy: invite.inviter_name || "Sistema",
          invitedAt: invite.created_at ? new Date(invite.created_at).toLocaleDateString('pt-BR') : '-',
          acceptedAt: invite.accepted_at ? new Date(invite.accepted_at).toLocaleDateString('pt-BR') : undefined,
          expiresAt: new Date(invite.expires_at).toLocaleDateString('pt-BR'),
          inviteLink: invite.invite_link
        };
      });

      setInvites(mappedInvites);
    } catch (error: any) {
      console.error('Erro ao carregar convites:', error);
      toast.error('Erro ao carregar convites', {
        description: error.message
      });
    } finally {
      setLoadingInvites(false);
    }
  };

  // Filtrar usuários
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || user.status === statusFilter;
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, searchTerm, statusFilter, roleFilter]);

  // Filtrar convites
  const filteredInvites = useMemo(() => {
    return invites.filter(invite => {
      const matchesSearch = 
        invite.email.toLowerCase().includes(inviteSearchTerm.toLowerCase()) ||
        invite.role.toLowerCase().includes(inviteSearchTerm.toLowerCase()) ||
        invite.id.toLowerCase().includes(inviteSearchTerm.toLowerCase());
      
      const matchesStatus = inviteStatusFilter === "all" || invite.status === inviteStatusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [invites, inviteSearchTerm, inviteStatusFilter]);

  // Estatísticas
  const stats = useMemo(() => {
    const active = users.filter(u => u.status === "Ativo").length;
    const inactive = users.filter(u => u.status === "Inativo").length;
    const blocked = users.filter(u => u.status === "Bloqueado").length;

    return { total: users.length, active, inactive, blocked };
  }, [users]);

  // Abrir diálogo para criar usuário
  const handleNewUser = () => {
    setIsInviteDialogOpen(true);
  };

  // Callback quando convite é criado com sucesso
  const handleInviteSuccess = () => {
    loadInvites(); // Recarregar lista de convites
  };

  // Abrir diálogo para editar usuário
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      password: ""
    });
    setIsUserDialogOpen(true);
  };

  // Salvar usuário
  const handleSaveUser = () => {
    if (!userForm.name || !userForm.email || !userForm.role) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    // VALIDAÇÃO DE E-MAIL
    if (userForm.email && !validateEmail(userForm.email)) {
      toast.error("E-mail inválido", {
        description: "Por favor, corrija o e-mail antes de salvar. Formato esperado: usuario@empresa.com"
      });
      return;
    }

    if (editingUser) {
      // Atualizar usuário existente
      setUsers(users.map(u => 
        u.id === editingUser.id 
          ? { ...u, ...userForm }
          : u
      ));
      toast.success("Usuário atualizado com sucesso!");
    } else {
      // Criar novo usuário
      const newUser: User = {
        id: `USR-${String(users.length + 1).padStart(3, '0')}`,
        ...userForm,
        createdAt: new Date().toISOString().split('T')[0]
      };
      setUsers([...users, newUser]);
      toast.success("Usuário criado com sucesso!");
    }

    setIsUserDialogOpen(false);
  };

  // Excluir usuário
  const handleDeleteUser = (userId: string) => {
    if (confirm("Tem certeza que deseja excluir este usuário?")) {
      setUsers(users.filter(u => u.id !== userId));
      toast.success("Usuário excluído com sucesso!");
    }
  };

  // Resetar senha
  const handleResetPassword = (user: User) => {
    toast.success(`Email de redefinição de senha enviado para ${user.email}`);
  };

  // Abrir diálogo para criar perfil
  const handleNewRole = () => {
    setEditingRole(null);
    setRoleForm({
      name: "",
      description: "",
      permissions: MODULES.reduce((acc, module) => {
        acc[module.id as keyof RolePermissions] = { ...defaultModulePermission };
        return acc;
      }, {} as RolePermissions)
    });
    setIsRoleDialogOpen(true);
  };

  // Abrir diálogo para editar perfil
  const handleEditRole = (role: Role) => {
    if (role.isSystem) {
      toast.error("Não é possível editar perfis do sistema");
      return;
    }
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      description: role.description,
      permissions: role.permissions
    });
    setIsRoleDialogOpen(true);
  };

  // Salvar perfil
  const handleSaveRole = () => {
    if (!roleForm.name || !roleForm.description) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (editingRole) {
      // Atualizar perfil existente
      setRoles(roles.map(r => 
        r.id === editingRole.id 
          ? { ...r, name: roleForm.name, description: roleForm.description, permissions: roleForm.permissions }
          : r
      ));
      toast.success("Perfil atualizado com sucesso!");
    } else {
      // Criar novo perfil
      const newRole: Role = {
        id: `role-${Date.now()}`,
        name: roleForm.name,
        description: roleForm.description,
        permissions: roleForm.permissions,
        isSystem: false
      };
      setRoles([...roles, newRole]);
      toast.success("Perfil criado com sucesso!");
    }

    setIsRoleDialogOpen(false);
  };

  // Excluir perfil
  const handleDeleteRole = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;

    if (role.isSystem) {
      toast.error("Não é possível excluir perfis do sistema");
      return;
    }

    const usersWithRole = users.filter(u => u.role === roleId);
    if (usersWithRole.length > 0) {
      toast.error(`Não é possível excluir. Existem ${usersWithRole.length} usuário(s) com este perfil.`);
      return;
    }

    if (confirm("Tem certeza que deseja excluir este perfil?")) {
      setRoles(roles.filter(r => r.id !== roleId));
      toast.success("Perfil excluído com sucesso!");
    }
  };

  // Atualizar permissão do perfil
  const handlePermissionChange = (moduleId: string, permission: keyof ModulePermission, value: boolean) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [moduleId]: {
          ...prev.permissions[moduleId as keyof RolePermissions],
          [permission]: value
        }
      }
    }));
  };

  // Funções para gerenciar convites
  const handleResendInvite = (inviteId: string) => {
    const invite = invites.find(i => i.id === inviteId);
    if (!invite) return;

    if (invite.status !== "Pendente") {
      toast.error("Só é possível reenviar convites pendentes");
      return;
    }

    // Atualizar data de expiração
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    setInvites(invites.map(i => 
      i.id === inviteId 
        ? { ...i, expiresAt: newExpiresAt.toISOString().split('T')[0] }
        : i
    ));

    toast.success(`Convite reenviado para ${invite.email}`);
  };

  const handleCopyInviteLink = (inviteLink: string) => {
    navigator.clipboard.writeText(inviteLink);
    toast.success("Link do convite copiado para a área de transferência!");
  };

  const handleCancelInvite = (inviteId: string) => {
    const invite = invites.find(i => i.id === inviteId);
    if (!invite) return;

    if (invite.status !== "Pendente") {
      toast.error("Só é possível cancelar convites pendentes");
      return;
    }

    if (confirm("Tem certeza que deseja cancelar este convite?")) {
      setInvites(invites.map(i => 
        i.id === inviteId 
          ? { ...i, status: "Cancelado" as const }
          : i
      ));
      toast.success("Convite cancelado com sucesso!");
    }
  };

  const handleDeleteInvite = (inviteId: string) => {
    if (confirm("Tem certeza que deseja excluir este convite?")) {
      setInvites(invites.filter(i => i.id !== inviteId));
      toast.success("Convite excluído com sucesso!");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Ativo":
      case "Pendente":
        return "bg-green-100 text-green-700";
      case "Aceito":
        return "bg-blue-100 text-blue-700";
      case "Inativo":
        return "bg-gray-100 text-gray-700";
      case "Bloqueado":
      case "Cancelado":
        return "bg-red-100 text-red-700";
      case "Expirado":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Ativo":
      case "Aceito":
        return <CheckCircle2 className="w-4 h-4" />;
      case "Pendente":
        return <Clock className="w-4 h-4" />;
      case "Inativo":
        return <XCircle className="w-4 h-4" />;
      case "Bloqueado":
      case "Cancelado":
      case "Expirado":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const getRoleName = (roleId: string) => {
    return roles.find(r => r.id === roleId)?.name || "Sem perfil";
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-gray-900 mb-2">Usuários e Permissões</h1>
            <p className="text-gray-600">Gerencie usuários, perfis de acesso e permissões do sistema</p>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total de Usuários</p>
                <p className="text-gray-900">{stats.total}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Ativos</p>
                <p className="text-gray-900">{stats.active}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <UserX className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Inativos</p>
                <p className="text-gray-900">{stats.inactive}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Perfis de Acesso</p>
                <p className="text-gray-900">{roles.length}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Abas */}
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="invites">Convites</TabsTrigger>
          <TabsTrigger value="roles">Perfis de Acesso</TabsTrigger>
        </TabsList>

        {/* ABA: USUÁRIOS */}
        <TabsContent value="users" className="space-y-4">
          {/* Filtros e Ações */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Pesquisar por nome, email ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Inativo">Inativo</SelectItem>
                <SelectItem value="Bloqueado">Bloqueado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Perfis</SelectItem>
                {roles.map(role => (
                  <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button 
                      onClick={handleNewUser} 
                      className="bg-[rgb(32,251,225)] hover:bg-green-700 text-[rgb(0,0,0)]"
                      disabled={!companyDataStatus.complete}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Convidar Usuário
                    </Button>
                  </span>
                </TooltipTrigger>
                {!companyDataStatus.complete && (
                  <TooltipContent>
                    <p>Cadastre os dados da empresa primeiro</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Tabela de Usuários */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Último Acesso</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-green-100 text-green-700">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {user.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getRoleName(user.role)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(user.status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(user.status)}
                          {user.status}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.lastAccess ? (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          {new Date(user.lastAccess).toLocaleDateString('pt-BR')}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Nunca</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleEditUser(user)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                            <Key className="mr-2 h-4 w-4" />
                            Resetar Senha
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ABA: CONVITES */}
        <TabsContent value="invites" className="space-y-4">
          {/* Alerta: Cadastro da empresa obrigatório */}
          {!companyDataStatus.complete && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <AlertDescription className="ml-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-orange-900 mb-2">
                      Cadastre os dados da sua empresa antes de convidar usuários
                    </p>
                    <p className="text-sm text-orange-700 mb-3">
                      Para manter a organização e profissionalismo, é necessário cadastrar as informações básicas da empresa antes de convidar membros para a equipe.
                    </p>
                    <div className="bg-white rounded-md p-3 border border-orange-100">
                      <p className="text-sm font-medium text-orange-900 mb-2">Campos obrigatórios pendentes:</p>
                      <div className="flex flex-wrap gap-2">
                        {companyDataStatus.missingFields.map((field) => (
                          <Badge key={field} variant="outline" className="border-orange-300 text-orange-700 bg-orange-50">
                            {field}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      toast.info("Acesse 'Minha Empresa' na engrenagem da barra superior para completar os dados necessários.");
                    }}
                    className="bg-orange-600 hover:bg-orange-700 whitespace-nowrap"
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    Como Completar?
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Filtros e Ações */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Pesquisar por email, perfil ou ID..."
                value={inviteSearchTerm}
                onChange={(e) => setInviteSearchTerm(e.target.value)}
                className="pl-10"
                disabled={!companyDataStatus.complete}
              />
            </div>
            <Select value={inviteStatusFilter} onValueChange={setInviteStatusFilter} disabled={!companyDataStatus.complete}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Aceito">Aceito</SelectItem>
                <SelectItem value="Expirado">Expirado</SelectItem>
                <SelectItem value="Cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={loadInvites} 
              variant="outline"
              disabled={loadingInvites || !companyDataStatus.complete}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loadingInvites ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>

          {/* Tabela de Convites */}
          <Card className={!companyDataStatus.complete ? 'opacity-50 pointer-events-none' : ''}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Convidado por</TableHead>
                  <TableHead>Data do Convite</TableHead>
                  <TableHead>Data de Expiração</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingInvites ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Carregando convites...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredInvites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      {invites.length === 0 ? (
                        <div className="flex flex-col items-center gap-2">
                          <Mail className="w-8 h-8 text-gray-300" />
                          <p>Nenhum convite enviado ainda</p>
                          <p className="text-sm">Convide membros para a sua equipe usando o botão acima</p>
                        </div>
                      ) : (
                        "Nenhum convite encontrado com os filtros aplicados"
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvites.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          {invite.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getRoleName(invite.role)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(invite.status)}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(invite.status)}
                            {invite.status}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {invite.invitedBy}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          {invite.invitedAt}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          {invite.expiresAt}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            {invite.status === "Pendente" && (
                              <>
                                <DropdownMenuItem onClick={() => handleResendInvite(invite.id)}>
                                  <Send className="mr-2 h-4 w-4" />
                                  Reenviar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCopyInviteLink(invite.inviteLink)}>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copiar Link
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCancelInvite(invite.id)}>
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Cancelar
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteInvite(invite.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ABA: PERFIS DE ACESSO */}
        <TabsContent value="roles" className="space-y-4">
          <div className="flex justify-end mb-4">
            <Button onClick={handleNewRole} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Novo Perfil
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => (
              <Card key={role.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${role.isSystem ? 'bg-purple-100' : 'bg-blue-100'} rounded-lg flex items-center justify-center`}>
                      <Shield className={`w-5 h-5 ${role.isSystem ? 'text-purple-600' : 'text-blue-600'}`} />
                    </div>
                    <div>
                      <h3 className="text-gray-900">{role.name}</h3>
                      {role.isSystem && (
                        <Badge variant="outline" className="text-xs">Sistema</Badge>
                      )}
                    </div>
                  </div>
                  {!role.isSystem && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditRole(role)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteRole(role.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-4">{role.description}</p>

                <Separator className="my-4" />

                <div className="space-y-2">
                  <p className="text-xs text-gray-500 mb-2">Permissões:</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(role.permissions).filter(([_, perms]) => perms.view).length > 0 ? (
                      <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                        {Object.entries(role.permissions).filter(([_, perms]) => perms.view).length} módulos
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Nenhuma permissão</span>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t text-sm text-gray-600">
                  <p>{users.filter(u => u.role === role.id).length} usuário(s) com este perfil</p>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog de Usuário */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
            <DialogDescription>
              {editingUser ? "Altere as informações do usuário" : "Preencha os dados do novo usuário"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome Completo *</Label>
                <Input
                  value={userForm.name}
                  onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                  placeholder="João Silva"
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                  onBlur={(e) => {
                    const email = e.target.value.trim();
                    if (email && !validateEmail(email)) {
                      toast.error("E-mail inválido", {
                        description: "Por favor, insira um e-mail válido (ex: usuario@empresa.com)"
                      });
                    }
                  }}
                  placeholder="joao.silva@empresa.com"
                  className={userForm.email && !validateEmail(userForm.email) ? "border-red-500" : ""}
                />
                {userForm.email && !validateEmail(userForm.email) && (
                  <p className="text-xs text-red-600 mt-1">
                    ⚠️ E-mail inválido. Formato esperado: usuario@empresa.com
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Telefone</Label>
                <Input
                  value={userForm.phone}
                  onChange={(e) => setUserForm({...userForm, phone: e.target.value})}
                  placeholder="(11) 98765-4321"
                />
              </div>
              <div>
                <Label>Perfil de Acesso *</Label>
                <Select value={userForm.role} onValueChange={(value) => setUserForm({...userForm, role: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(role => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select 
                  value={userForm.status} 
                  onValueChange={(value: "Ativo" | "Inativo" | "Bloqueado") => setUserForm({...userForm, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                    <SelectItem value="Bloqueado">Bloqueado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!editingUser && (
                <div>
                  <Label>Senha Inicial *</Label>
                  <Input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                    placeholder="••••••••"
                  />
                </div>
              )}
            </div>

            {editingUser && (
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  Para alterar a senha, utilize a opção "Resetar Senha" no menu de ações do usuário.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsUserDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveUser} className="bg-green-600 hover:bg-green-700">
              {editingUser ? "Salvar Alterações" : "Criar Usuário"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Perfil */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? "Editar Perfil de Acesso" : "Novo Perfil de Acesso"}</DialogTitle>
            <DialogDescription>
              {editingRole ? "Altere as permissões do perfil" : "Configure as permissões do novo perfil"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome do Perfil *</Label>
                <Input
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({...roleForm, name: e.target.value})}
                  placeholder="Ex: Gerente de Vendas"
                />
              </div>
              <div>
                <Label>Descrição *</Label>
                <Input
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({...roleForm, description: e.target.value})}
                  placeholder="Ex: Acesso completo ao módulo de vendas"
                />
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-gray-900 mb-4">Matriz de Permissões</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-64">Módulo</TableHead>
                      <TableHead className="text-center">Visualizar</TableHead>
                      <TableHead className="text-center">Criar</TableHead>
                      <TableHead className="text-center">Editar</TableHead>
                      <TableHead className="text-center">Excluir</TableHead>
                      <TableHead className="text-center">Exportar</TableHead>
                      <TableHead className="text-center">Aprovar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MODULES.map((module) => {
                      const perms = roleForm.permissions[module.id as keyof RolePermissions] || defaultModulePermission;
                      return (
                        <TableRow key={module.id}>
                          <TableCell>{module.name}</TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={perms.view}
                              onCheckedChange={(checked) => handlePermissionChange(module.id, 'view', checked)}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={perms.create}
                              onCheckedChange={(checked) => handlePermissionChange(module.id, 'create', checked)}
                              disabled={!perms.view}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={perms.edit}
                              onCheckedChange={(checked) => handlePermissionChange(module.id, 'edit', checked)}
                              disabled={!perms.view}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={perms.delete}
                              onCheckedChange={(checked) => handlePermissionChange(module.id, 'delete', checked)}
                              disabled={!perms.view}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={perms.export}
                              onCheckedChange={(checked) => handlePermissionChange(module.id, 'export', checked)}
                              disabled={!perms.view}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            {module.hasApprove ? (
                              <Switch
                                checked={perms.approve}
                                onCheckedChange={(checked) => handlePermissionChange(module.id, 'approve', checked)}
                                disabled={!perms.view}
                              />
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveRole} className="bg-green-600 hover:bg-green-700">
              {editingRole ? "Salvar Alterações" : "Criar Perfil"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Convidar Usuário */}
      <InviteUserDialog 
        open={isInviteDialogOpen} 
        onOpenChange={setIsInviteDialogOpen} 
        onSuccess={handleInviteSuccess}
      />
    </div>
  );
}