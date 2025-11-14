/**
 * Hook para verificação de permissões de usuário
 * 
 * Este hook implementa controle de acesso baseado em roles (RBAC)
 * e pode ser expandido para incluir políticas mais complexas
 */

import { FEATURES } from "../utils/environment";

// Tipos de perfis de usuário
export type UserRole = 
  | "super_admin"      // Administrador técnico (acesso total, incluindo auditoria)
  | "admin"            // Administrador de negócio
  | "manager"          // Gerente
  | "salesperson"      // Vendedor
  | "buyer"            // Comprador
  | "financial"        // Financeiro
  | "viewer";          // Visualizador

// Módulos do sistema
export type SystemModule =
  | "dashboard"
  | "inventory"
  | "purchases"
  | "sales"
  | "customers"
  | "suppliers"
  | "priceTables"
  | "taxInvoicing"
  | "financial"
  | "accounts"
  | "bankReconciliation"
  | "cashFlow"
  | "reports"
  | "users"
  | "systemAudit"  // Módulo especial - apenas dev + super admin
  | "company";

// Ações disponíveis
export type Permission = "view" | "create" | "edit" | "delete" | "approve" | "export";

/**
 * Hook principal de permissões
 */
export const usePermissions = () => {
  // TODO: Pegar usuário atual do contexto de autenticação
  // Por enquanto, simula um super admin em desenvolvimento
  const currentUser = {
    id: "user-1",
    name: "Administrador",
    email: "admin@erp.com",
    role: FEATURES.SYSTEM_AUDIT ? "super_admin" : "admin" as UserRole
  };

  /**
   * Verifica se usuário tem permissão para um módulo
   */
  const hasModuleAccess = (module: SystemModule): boolean => {
    // Módulo de auditoria tem regras especiais
    if (module === "systemAudit") {
      return FEATURES.SYSTEM_AUDIT && currentUser.role === "super_admin";
    }

    // Outros módulos seguem regras normais de role
    return true; // Por enquanto, permite tudo
  };

  /**
   * Verifica se usuário tem permissão específica em um módulo
   */
  const hasPermission = (module: SystemModule, action: Permission): boolean => {
    // Primeiro verifica acesso ao módulo
    if (!hasModuleAccess(module)) {
      return false;
    }

    // Super admin tem acesso total
    if (currentUser.role === "super_admin") {
      return true;
    }

    // TODO: Implementar lógica baseada em roles
    // Por enquanto, permite tudo exceto auditoria
    return module !== "systemAudit";
  };

  /**
   * Helpers para verificações comuns
   */
  const canView = (module: SystemModule) => hasPermission(module, "view");
  const canCreate = (module: SystemModule) => hasPermission(module, "create");
  const canEdit = (module: SystemModule) => hasPermission(module, "edit");
  const canDelete = (module: SystemModule) => hasPermission(module, "delete");
  const canApprove = (module: SystemModule) => hasPermission(module, "approve");
  const canExport = (module: SystemModule) => hasPermission(module, "export");

  /**
   * Verifica se é super admin (acesso técnico)
   */
  const isSuperAdmin = () => currentUser.role === "super_admin";

  /**
   * Verifica se é admin (acesso administrativo)
   */
  const isAdmin = () => currentUser.role === "admin" || currentUser.role === "super_admin";

  return {
    currentUser,
    hasModuleAccess,
    hasPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canApprove,
    canExport,
    isSuperAdmin,
    isAdmin,
  };
};

/**
 * HOC para proteger componentes por permissão
 */
export const withPermission = (
  WrappedComponent: React.ComponentType<any>,
  module: SystemModule,
  action?: Permission
) => {
  return (props: any) => {
    const { hasModuleAccess, hasPermission } = usePermissions();

    // Verifica permissão
    const hasAccess = action 
      ? hasPermission(module, action)
      : hasModuleAccess(module);

    if (!hasAccess) {
      return (
        <div className="p-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
            <p className="text-gray-600">
              Você não tem permissão para acessar este módulo.
            </p>
          </div>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
};
