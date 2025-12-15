import { 
  Bell, 
  Settings, 
  LogOut, 
  User, 
  Moon, 
  Sun, 
  Shield, 
  ChevronDown, 
  Users, 
  BarChart3, 
  Package, 
  Building2, 
  Menu,
  ListTree,
  Target,
  FileKey,
  ShoppingBag,
  Tags,
  Warehouse,
  PackageCheck,
  Crown,
  CreditCard,
  ArrowUpCircle,
  Wallet
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { projectId } from '../utils/supabase/info';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useState, memo } from 'react';
import { NavigationView } from '../App';

interface TopBarProps {
  onNavigate: (view: NavigationView) => void;
  onToggleSidebar?: () => void;
}

// ⚡ Memoizado para evitar rerenders desnecessários
export const TopBar = memo(function TopBar({ onNavigate, onToggleSidebar }: TopBarProps) {
  const { profile, company, signOut } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  
  // Pegar primeiro nome do usuário
  const firstName = profile?.name?.split(' ')[0] || 'Usuário';
  
  // Dynamically build Supabase Storage URL based on project
  const supabaseStorageUrl = `https://${projectId}.supabase.co/storage/v1/object/public/meta-erp-assets`;

  return (
    <div className={`fixed top-0 left-0 right-0 h-16 border-b shadow-sm z-50 ${isDarkMode ? 'dark bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center h-full px-4 gap-4">
        {/* Botão hambúrguer para mobile */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="Abrir menu"
        >
          <Menu className="w-6 h-6" />
        </Button>

        {/* Logo META ERP - versão texto */}
        <div className="flex items-center gap-2 min-w-[180px]">
          <img 
            src={isDarkMode 
              ? `${supabaseStorageUrl}/logo-dark.svg`
              : `${supabaseStorageUrl}/logo-light.svg`
            } 
            alt="META ERP" 
            className="h-8"
          />
        </div>

        {/* Spacer quando não há trial banner */}
        <div className="flex-1" />

        {/* Ícones de ação */}
        <div className="flex items-center gap-2">
          {/* Notificações */}
          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Notificações"
          >
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            {/* Badge de notificação (exemplo) */}
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </Button>

          {/* Configurações e Cadastros */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Configurações e Cadastros"
              >
                <Settings className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Configurações e Cadastros</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => onNavigate('company')}>
                <Building2 className="w-4 h-4 mr-2" />
                Minha Empresa
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => onNavigate('chartOfAccounts')}>
                <ListTree className="w-4 h-4 mr-2" />
                Plano de Contas
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => onNavigate('costCenters')}>
                <Target className="w-4 h-4 mr-2" />
                Centros de Custo
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => onNavigate('paymentMethods')}>
                <Wallet className="w-4 h-4 mr-2" />
                Formas de Pagamento
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => onNavigate('digitalCertificate')}>
                <FileKey className="w-4 h-4 mr-2" />
                Certificado Digital (A1)
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => onNavigate('salespeople')}>
                <Users className="w-4 h-4 mr-2" />
                Vendedores
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => onNavigate('buyers')}>
                <ShoppingBag className="w-4 h-4 mr-2" />
                Compradores
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => onNavigate('usersPermissions')}>
                <Shield className="w-4 h-4 mr-2" />
                Usuários e Permissões
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => onNavigate('productCategories')}>
                <Tags className="w-4 h-4 mr-2" />
                Categorias de Produtos
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => onNavigate('stockLocations')}>
                <Warehouse className="w-4 h-4 mr-2" />
                Locais de Estoque
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => onNavigate('manufacturingBatches')}>
                <PackageCheck className="w-4 h-4 mr-2" />
                Lotes de Fabricação
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Planos e Cobrança */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Planos e Cobrança"
              >
                <Crown className="w-5 h-5 text-amber-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Planos e Cobrança</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => onNavigate('myPlan')}>
                <CreditCard className="w-4 h-4 mr-2" />
                Meu Plano
              </DropdownMenuItem>
              
              {/* Apenas para owner */}
              {profile?.role === 'owner' && (
                <DropdownMenuItem onClick={() => onNavigate('changePlan')}>
                  <ArrowUpCircle className="w-4 h-4 mr-2" />
                  Alterar Plano
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Toggle Tema (apenas UI por enquanto) */}
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-gray-100 dark:hover:bg-gray-800"
            title={isDarkMode ? "Mudar para tema claro" : "Mudar para tema escuro"}
            onClick={toggleTheme}
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            )}
          </Button>

          {/* Separador */}
          <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-2"></div>

          {/* Menu do Usuário */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 px-3"
              >
                {/* Avatar */}
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    {firstName.charAt(0).toUpperCase()}
                  </span>
                </div>
                {/* Nome */}
                <span className="text-sm text-gray-700 dark:text-gray-200">{firstName}</span>
                <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm">{profile?.name || 'Usuário'}</span>
                  <span className="text-xs text-gray-500">{profile?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onNavigate('profile')}>
                <User className="w-4 h-4 mr-2" />
                Meu Perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={signOut}
                className="text-red-600 focus:text-red-600"
              >
                Sair da conta
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
});