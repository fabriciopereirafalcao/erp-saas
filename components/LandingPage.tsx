import { Button } from "./ui/button";
import { 
  ArrowRight, 
  CheckCircle2, 
  Sparkles,
  FileText,
  TrendingUp,
  Shield,
  Zap,
  Package,
  ShoppingCart,
  Wallet,
  BarChart3,
  Users,
  Clock,
  Check,
  X,
  Crown,
  Star,
  ChevronDown,
  HelpCircle
} from "lucide-react";
import { useState } from "react";

interface LandingPageProps {
  onNavigateToSignup?: () => void;
  onNavigateToLogin?: () => void;
}

export function LandingPage({ onNavigateToSignup, onNavigateToLogin }: LandingPageProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "semiannual" | "yearly">("monthly");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const handleGetStarted = () => {
    if (onNavigateToSignup) {
      onNavigateToSignup();
    } else {
      console.log('Navegar para cadastro');
    }
  };

  const handleLogin = () => {
    if (onNavigateToLogin) {
      onNavigateToLogin();
    } else {
      console.log('Navegar para login');
    }
  };

  const handleViewDemo = () => {
    // Scroll para features section
    const featuresSection = document.getElementById('features');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Função para obter os preços baseado no plano e ciclo
  type PlanId = "basico" | "intermediario" | "avancado" | "ilimitado";
  
  const getPlanPrice = (planId: PlanId) => {
    const prices = {
      basico: { monthly: 49.90, semiannual: 269.46, yearly: 479.04 },
      intermediario: { monthly: 69.90, semiannual: 377.46, yearly: 671.04 },
      avancado: { monthly: 109.90, semiannual: 593.46, yearly: 1055.04 },
      ilimitado: { monthly: 139.90, semiannual: 755.46, yearly: 1343.04 },
    };
    return prices[planId][billingCycle];
  };

  const getFormattedPrice = (planId: PlanId) => {
    const price = getPlanPrice(planId);
    const [reais, centavos] = price.toFixed(2).split('.');
    return { reais, centavos };
  };

  const getPriceLabel = () => {
    if (billingCycle === 'monthly') return '/mês';
    if (billingCycle === 'semiannual') return '/semestre';
    return '/ano';
  };

  const getDiscount = () => {
    if (billingCycle === 'semiannual') return '10%';
    if (billingCycle === 'yearly') return '20%';
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Navigation Bar */}
      <nav className="border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">
                <span className="text-[#20FBE1]">META</span>{" "}
                <span className="text-gray-900 dark:text-white">ERP</span>
              </div>
            </div>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                Recursos
              </a>
              <a href="#pricing" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                Preços
              </a>
              <a href="#faq" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                FAQ
              </a>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center gap-3">
              <Button variant="ghost" className="hidden sm:inline-flex" onClick={handleLogin}>
                Entrar
              </Button>
              <Button className="bg-[#20FBE1] hover:bg-[#1BCFBA] text-gray-900" onClick={handleGetStarted}>
                Começar Grátis
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#20FBE1]/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Column - Text Content */}
            <div className="space-y-6">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-sm">
                <Zap className="w-4 h-4 text-[#20FBE1]" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sistema ERP 100% Integrado com SEFAZ
                </span>
              </div>

              {/* Main Headline */}
              <div className="space-y-3">
                <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                  Gerencie seu negócio com{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#20FBE1] to-green-500">
                    inteligência
                  </span>
                </h1>
                <p className="text-lg lg:text-xl text-gray-600 dark:text-gray-300 max-w-2xl">
                  Sistema ERP completo para PMEs: Estoque, Financeiro, NF-e Real, 
                  Vendas e Compras em uma plataforma moderna e intuitiva.
                </p>
              </div>

              {/* Key Benefits */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">
                    <strong>NF-e Real</strong> - Emissão integrada com SEFAZ
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">
                    <strong>Gestão 360°</strong> - Estoque, Vendas, Compras e Financeiro
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">
                    <strong>7 dias grátis</strong> - Teste sem compromisso
                  </span>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Button 
                  size="lg" 
                  className="bg-[#20FBE1] hover:bg-[#1BCFBA] text-gray-900 shadow-lg shadow-[#20FBE1]/25 text-base px-8"
                  onClick={handleGetStarted}
                >
                  Começar Teste Grátis
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-2 text-base px-8"
                  onClick={handleViewDemo}
                >
                  Ver Demonstração
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap gap-6 pt-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Sem cartão de crédito</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Cancele quando quiser</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Suporte dedicado</span>
                </div>
              </div>
            </div>

            {/* Right Column - Visual/Screenshot */}
            <div className="relative">
              {/* Decorative Elements */}
              <div className="absolute -top-4 -right-4 w-72 h-72 bg-gradient-to-br from-[#20FBE1]/30 to-green-500/30 rounded-full blur-3xl"></div>
              
              {/* Dashboard Screenshot - Modern Mockup */}
              <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transform hover:scale-[1.02] transition-transform duration-300">
                {/* Browser Chrome */}
                <div className="bg-gray-100 dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    <div className="ml-4 flex-1 bg-gray-200 dark:bg-gray-700 rounded px-3 py-1 text-xs text-gray-500 dark:text-gray-400">
                      metaerp.com.br/dashboard
                    </div>
                  </div>
                </div>

                {/* Real Dashboard Image */}
                <div className="relative overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1608222351212-18fe0ec7b13b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMGRhc2hib2FyZCUyMGFuYWx5dGljc3xlbnwxfHx8fDE3NjUwMzYxMDl8MA&ixlib=rb-4.1.0&q=80&w=1080"
                    alt="Dashboard META ERP - Visão Geral do Sistema" 
                    className="w-full h-auto"
                  />
                  {/* Subtle gradient overlay for depth */}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/5 to-transparent pointer-events-none"></div>
                </div>
              </div>

              {/* Floating Badge - SEFAZ Integration */}
              <div className="absolute -bottom-6 -left-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 backdrop-blur-sm bg-white/90 dark:bg-gray-800/90">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">SEFAZ</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">100% Integrado</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 lg:py-16 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#20FBE1]/10 dark:bg-[#20FBE1]/20 rounded-full mb-4">
              <Sparkles className="w-4 h-4 text-[#20FBE1]" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Recursos Principais</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-3">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="text-base lg:text-lg text-gray-600 dark:text-gray-300">
              Sistema completo de gestão empresarial com recursos profissionais para alavancar seu negócio
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 - NF-e Real */}
            <div className="group relative bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-[#20FBE1] dark:hover:border-[#20FBE1] hover:shadow-xl hover:shadow-[#20FBE1]/10 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-[#20FBE1] to-[#1BCFBA] rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6 text-gray-900" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                NF-e Real Integrada
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                Emissão de Nota Fiscal Eletrônica homologada e integrada diretamente com a SEFAZ. 
                Assinatura digital, transmissão automática e DANFE profissional.
              </p>
              <div className="mt-3 flex items-center gap-2 text-sm text-[#20FBE1]">
                <CheckCircle2 className="w-4 h-4" />
                <span>100% Homologado</span>
              </div>
            </div>

            {/* Feature 2 - Estoque */}
            <div className="group relative bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 hover:shadow-xl hover:shadow-green-500/10 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Package className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Gestão de Estoque
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                Controle completo de inventário com categorias, locais, lotes de fabricação, 
                alertas de estoque mínimo e rastreabilidade total de movimentações.
              </p>
              <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                <span>Controle em Tempo Real</span>
              </div>
            </div>

            {/* Feature 3 - Vendas e Compras */}
            <div className="group relative bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Vendas & Compras
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                Gerencie pedidos de venda e compra com facilidade. Controle de clientes, fornecedores, 
                tabelas de preço e conversão direta para NF-e.
              </p>
              <div className="mt-3 flex items-center gap-2 text-sm text-blue-600">
                <CheckCircle2 className="w-4 h-4" />
                <span>Fluxo Completo</span>
              </div>
            </div>

            {/* Feature 4 - Financeiro */}
            <div className="group relative bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-amber-500 dark:hover:border-amber-500 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Financeiro Completo
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                Contas a pagar e receber, plano de contas, centros de custo, reconciliação bancária, 
                fluxo de caixa e transações financeiras integradas.
              </p>
              <div className="mt-3 flex items-center gap-2 text-sm text-amber-600">
                <CheckCircle2 className="w-4 h-4" />
                <span>Gestão Profissional</span>
              </div>
            </div>

            {/* Feature 5 - Relatórios */}
            <div className="group relative bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Relatórios e Dashboards
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                Visualize seus dados com dashboards interativos e relatórios gerenciais. 
                Métricas de vendas, estoque, financeiro e muito mais em tempo real.
              </p>
              <div className="mt-3 flex items-center gap-2 text-sm text-purple-600">
                <CheckCircle2 className="w-4 h-4" />
                <span>Insights Inteligentes</span>
              </div>
            </div>

            {/* Feature 6 - Multi-usuários */}
            <div className="group relative bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-rose-500 dark:hover:border-rose-500 hover:shadow-xl hover:shadow-rose-500/10 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-rose-400 to-rose-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Controle de Acesso
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                Gerencie múltiplos usuários com sistema completo de permissões por módulo. 
                Auditoria de ações, convites por email e hierarquia de acessos.
              </p>
              <div className="mt-3 flex items-center gap-2 text-sm text-rose-600">
                <CheckCircle2 className="w-4 h-4" />
                <span>Segurança Avançada</span>
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="mt-10 text-center">
            <div className="inline-flex flex-col sm:flex-row items-center gap-4 bg-gradient-to-r from-[#20FBE1]/10 to-green-500/10 dark:from-[#20FBE1]/20 dark:to-green-500/20 p-6 rounded-2xl border border-[#20FBE1]/30 dark:border-[#20FBE1]/50">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-[#20FBE1]" />
                <span className="text-lg text-gray-900 dark:text-white">
                  <strong>Comece agora</strong> com 7 dias grátis
                </span>
              </div>
              <Button 
                size="lg" 
                className="bg-[#20FBE1] hover:bg-[#1BCFBA] text-gray-900 shadow-lg"
                onClick={handleGetStarted}
              >
                Criar conta gratuita
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-12 lg:py-16 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#20FBE1]/10 dark:bg-[#20FBE1]/20 rounded-full mb-4">
              <Star className="w-4 h-4 text-[#20FBE1]" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Planos e Preços</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-3">
              Escolha o plano ideal para o seu negócio
            </h2>
            <p className="text-base lg:text-lg text-gray-600 dark:text-gray-300">
              Todos os planos incluem 7 dias de teste grátis. Cancele quando quiser.
            </p>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <Button
              variant={billingCycle === "monthly" ? "default" : "outline"}
              onClick={() => setBillingCycle("monthly")}
              className="min-w-[120px]"
            >
              Mensal
            </Button>
            <Button
              variant={billingCycle === "semiannual" ? "default" : "outline"}
              onClick={() => setBillingCycle("semiannual")}
              className="min-w-[120px] relative"
            >
              Semestral
              <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                -10%
              </span>
            </Button>
            <Button
              variant={billingCycle === "yearly" ? "default" : "outline"}
              onClick={() => setBillingCycle("yearly")}
              className="min-w-[120px] relative"
            >
              Anual
              <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                -20%
              </span>
            </Button>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Plano Básico */}
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-6 hover:border-gray-300 dark:hover:border-gray-600 transition-all">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  Básico
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Ideal para começar
                </p>
              </div>

              <div className="mb-5">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400">R$</span>
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">{getFormattedPrice("basico").reais}</span>
                  <span className="text-base text-gray-600 dark:text-gray-400">,{getFormattedPrice("basico").centavos}</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                  {getPriceLabel()}
                  {getDiscount() && ` (economize ${getDiscount()})`}
                </p>
              </div>

              <Button 
                className="w-full mb-5 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900"
                onClick={handleGetStarted}
              >
                Começar grátis
              </Button>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">1 usuário</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">500 produtos</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">200 clientes</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">50 fornecedores</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Módulos básicos</span>
                </div>
                <div className="flex items-start gap-3 opacity-50">
                  <X className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-500 dark:text-gray-500">NF-e</span>
                </div>
                <div className="flex items-start gap-3 opacity-50">
                  <X className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-500 dark:text-gray-500">Financeiro</span>
                </div>
              </div>
            </div>

            {/* Plano Intermediário */}
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl border-2 border-blue-500 dark:border-blue-500 p-6 hover:border-blue-600 dark:hover:border-blue-400 transition-all shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-xs font-medium">
                Recomendado
              </div>

              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  Intermediário
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Para pequenas empresas
                </p>
              </div>

              <div className="mb-5">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400">R$</span>
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">{getFormattedPrice("intermediario").reais}</span>
                  <span className="text-base text-gray-600 dark:text-gray-400">,{getFormattedPrice("intermediario").centavos}</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                  {getPriceLabel()}
                  {getDiscount() && ` (economize ${getDiscount()})`}
                </p>
              </div>

              <Button 
                className="w-full mb-5 bg-blue-500 hover:bg-blue-600 text-white"
                onClick={handleGetStarted}
              >
                Começar grátis
              </Button>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">3 usuários</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">2.000 produtos</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">1.000 clientes</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">200 fornecedores</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">100 NF-e/mês</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">200 transações/mês</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Relatórios avançados</span>
                </div>
              </div>
            </div>

            {/* Plano Avançado */}
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl border-2 border-[#20FBE1] dark:border-[#20FBE1] p-6 hover:border-[#1BCFBA] dark:hover:border-[#1BCFBA] transition-all shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#20FBE1] text-gray-900 px-4 py-1 rounded-full text-xs font-medium">
                Mais Popular
              </div>

              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  Avançado
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Todos os módulos inclusos
                </p>
              </div>

              <div className="mb-5">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400">R$</span>
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">{getFormattedPrice("avancado").reais}</span>
                  <span className="text-base text-gray-600 dark:text-gray-400">,{getFormattedPrice("avancado").centavos}</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                  {getPriceLabel()}
                  {getDiscount() && ` (economize ${getDiscount()})`}
                </p>
              </div>

              <Button 
                className="w-full mb-5 bg-[#20FBE1] hover:bg-[#1BCFBA] text-gray-900"
                onClick={handleGetStarted}
              >
                Começar grátis
              </Button>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">10 usuários</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">10.000 produtos</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">5.000 clientes</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">1.000 fornecedores</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">500 NF-e/mês</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">2.000 transações/mês</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Relatórios avançados</span>
                </div>
              </div>
            </div>

            {/* Plano Ilimitado */}
            <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-700 dark:to-gray-600 rounded-2xl border-2 border-amber-500 dark:border-amber-400 p-6 hover:border-amber-400 dark:hover:border-amber-300 transition-all shadow-xl">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-4 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                <Crown className="w-3 h-3" />
                Premium
              </div>

              <div className="mb-4">
                <h3 className="text-xl font-bold text-white mb-1">
                  Ilimitado
                </h3>
                <p className="text-sm text-gray-300">
                  Sem limites para crescer
                </p>
              </div>

              <div className="mb-5">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-gray-400">R$</span>
                  <span className="text-3xl font-bold text-white">{getFormattedPrice("ilimitado").reais}</span>
                  <span className="text-base text-gray-300">,{getFormattedPrice("ilimitado").centavos}</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  {getPriceLabel()}
                  {getDiscount() && ` (economize ${getDiscount()})`}
                </p>
              </div>

              <Button 
                className="w-full mb-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white border-0"
                onClick={handleGetStarted}
              >
                Começar grátis
              </Button>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-white">Usuários ilimitados</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-white">Produtos ilimitados</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-white">Clientes ilimitados</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-white">Fornecedores ilimitados</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-white">NF-e ilimitadas</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-white">Transações ilimitadas</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-white">Todos os recursos</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Info */}
          <div className="mt-16 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Todos os planos incluem suporte por email • Atualizações gratuitas • Backups automáticos
            </p>
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-700 dark:text-green-300">
                <strong>Garantia de 7 dias:</strong> Teste sem compromisso e sem cartão de crédito
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-12 lg:py-16 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#20FBE1]/10 dark:bg-[#20FBE1]/20 rounded-full mb-4">
              <HelpCircle className="w-4 h-4 text-[#20FBE1]" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Perguntas Frequentes</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-3">
              Tire suas dúvidas
            </h2>
            <p className="text-base lg:text-lg text-gray-600 dark:text-gray-300">
              Encontre respostas para as perguntas mais comuns sobre o META ERP
            </p>
          </div>

          {/* FAQ Accordion */}
          <div className="space-y-3">
            {/* FAQ Item 1 */}
            <div className="group bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-[#20FBE1] dark:hover:border-[#20FBE1] transition-all">
              <button
                onClick={() => setOpenFaqIndex(openFaqIndex === 0 ? null : 0)}
                className="w-full p-6 flex items-center justify-between text-left"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white pr-4">
                  Como funciona o teste grátis de 7 dias?
                </h3>
                <ChevronDown 
                  className={`w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 transition-transform ${
                    openFaqIndex === 0 ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaqIndex === 0 && (
                <div className="px-6 pb-6 text-gray-600 dark:text-gray-300 leading-relaxed">
                  Você pode criar uma conta e usar TODOS os recursos do sistema por 7 dias, sem pagar nada e sem precisar cadastrar cartão de crédito. 
                  Durante o trial, você tem acesso completo às funcionalidades de NF-e, financeiro, estoque e relatórios. 
                  Após o período, você pode escolher um plano ou cancelar sem qualquer custo.
                </div>
              )}
            </div>

            {/* FAQ Item 2 */}
            <div className="group bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-[#20FBE1] dark:hover:border-[#20FBE1] transition-all">
              <button
                onClick={() => setOpenFaqIndex(openFaqIndex === 1 ? null : 1)}
                className="w-full p-6 flex items-center justify-between text-left"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white pr-4">
                  A NF-e é realmente integrada com a SEFAZ?
                </h3>
                <ChevronDown 
                  className={`w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 transition-transform ${
                    openFaqIndex === 1 ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaqIndex === 1 && (
                <div className="px-6 pb-6 text-gray-600 dark:text-gray-300 leading-relaxed">
                  Sim! Nossa emissão de NF-e é 100% homologada e integrada diretamente com os servidores da SEFAZ. 
                  Incluímos assinatura digital XML-DSig, transmissão automática, consulta de status em tempo real, 
                  download de XML/PDF e geração profissional de DANFE. Tudo conforme o padrão SEFAZ 4.0.
                </div>
              )}
            </div>

            {/* FAQ Item 3 */}
            <div className="group bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-[#20FBE1] dark:hover:border-[#20FBE1] transition-all">
              <button
                onClick={() => setOpenFaqIndex(openFaqIndex === 2 ? null : 2)}
                className="w-full p-6 flex items-center justify-between text-left"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white pr-4">
                  Posso mudar de plano depois de assinar?
                </h3>
                <ChevronDown 
                  className={`w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 transition-transform ${
                    openFaqIndex === 2 ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaqIndex === 2 && (
                <div className="px-6 pb-6 text-gray-600 dark:text-gray-300 leading-relaxed">
                  Sim, você pode fazer upgrade ou downgrade a qualquer momento. No upgrade, você recebe acesso imediato aos novos recursos 
                  e pagará apenas a diferença proporcional. No downgrade, os créditos são aplicados à próxima fatura. 
                  Seus dados são preservados durante a mudança.
                </div>
              )}
            </div>

            {/* FAQ Item 4 */}
            <div className="group bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-[#20FBE1] dark:hover:border-[#20FBE1] transition-all">
              <button
                onClick={() => setOpenFaqIndex(openFaqIndex === 3 ? null : 3)}
                className="w-full p-6 flex items-center justify-between text-left"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white pr-4">
                  Meus dados estão seguros?
                </h3>
                <ChevronDown 
                  className={`w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 transition-transform ${
                    openFaqIndex === 3 ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaqIndex === 3 && (
                <div className="px-6 pb-6 text-gray-600 dark:text-gray-300 leading-relaxed">
                  Absolutamente. Utilizamos a infraestrutura do Supabase, com criptografia end-to-end, backups automáticos diários, 
                  autenticação segura e controle de acesso granular. Todos os dados ficam armazenados em servidores seguros e 
                  são protegidos de acordo com as melhores práticas do mercado.
                </div>
              )}
            </div>

            {/* FAQ Item 5 */}
            <div className="group bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-[#20FBE1] dark:hover:border-[#20FBE1] transition-all">
              <button
                onClick={() => setOpenFaqIndex(openFaqIndex === 4 ? null : 4)}
                className="w-full p-6 flex items-center justify-between text-left"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white pr-4">
                  O que acontece se eu atingir o limite do meu plano?
                </h3>
                <ChevronDown 
                  className={`w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 transition-transform ${
                    openFaqIndex === 4 ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaqIndex === 4 && (
                <div className="px-6 pb-6 text-gray-600 dark:text-gray-300 leading-relaxed">
                  Você receberá alertas quando estiver próximo do limite (80%, 90% e 100%). Ao atingir 100%, não será possível criar 
                  novos registros daquele tipo até fazer upgrade do plano. Seus dados existentes permanecem acessíveis e 
                  você pode fazer o upgrade imediatamente para continuar operando.
                </div>
              )}
            </div>

            {/* FAQ Item 6 */}
            <div className="group bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-[#20FBE1] dark:hover:border-[#20FBE1] transition-all">
              <button
                onClick={() => setOpenFaqIndex(openFaqIndex === 5 ? null : 5)}
                className="w-full p-6 flex items-center justify-between text-left"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white pr-4">
                  Como funciona o suporte técnico?
                </h3>
                <ChevronDown 
                  className={`w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 transition-transform ${
                    openFaqIndex === 5 ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaqIndex === 5 && (
                <div className="px-6 pb-6 text-gray-600 dark:text-gray-300 leading-relaxed">
                  Todos os planos incluem suporte por email com resposta em até 24 horas úteis. 
                  Temos documentação completa do sistema, tutoriais em vídeo e base de conhecimento para consultas rápidas. 
                  Para clientes dos planos Avançado e Ilimitado, oferecemos prioridade no atendimento.
                </div>
              )}
            </div>

            {/* FAQ Item 7 */}
            <div className="group bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-[#20FBE1] dark:hover:border-[#20FBE1] transition-all">
              <button
                onClick={() => setOpenFaqIndex(openFaqIndex === 6 ? null : 6)}
                className="w-full p-6 flex items-center justify-between text-left"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white pr-4">
                  Posso exportar meus dados caso queira sair?
                </h3>
                <ChevronDown 
                  className={`w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 transition-transform ${
                    openFaqIndex === 6 ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaqIndex === 6 && (
                <div className="px-6 pb-6 text-gray-600 dark:text-gray-300 leading-relaxed">
                  Sim! Você tem total controle sobre seus dados. Oferecemos exportação completa em formatos padrão (CSV, Excel, JSON) 
                  para produtos, clientes, fornecedores, transações e relatórios. As NF-e podem ser baixadas em XML/PDF a qualquer momento. 
                  Não fazemos retenção de dados após o cancelamento.
                </div>
              )}
            </div>

            {/* FAQ Item 8 */}
            <div className="group bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-[#20FBE1] dark:hover:border-[#20FBE1] transition-all">
              <button
                onClick={() => setOpenFaqIndex(openFaqIndex === 7 ? null : 7)}
                className="w-full p-6 flex items-center justify-between text-left"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white pr-4">
                  Qual a diferença entre pagamento mensal, semestral e anual?
                </h3>
                <ChevronDown 
                  className={`w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 transition-transform ${
                    openFaqIndex === 7 ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaqIndex === 7 && (
                <div className="px-6 pb-6 text-gray-600 dark:text-gray-300 leading-relaxed">
                  O pagamento mensal oferece mais flexibilidade, enquanto os pagamentos semestrais e anuais oferecem descontos significativos: 
                  10% no semestral e 20% no anual. Você economiza ao pagar antecipadamente e garante o mesmo preço por todo o período, 
                  mesmo se houver reajustes futuros.
                </div>
              )}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="mt-16 text-center">
            <div className="inline-flex flex-col items-center gap-4 p-8 bg-gradient-to-r from-[#20FBE1]/10 to-green-500/10 dark:from-[#20FBE1]/20 dark:to-green-500/20 rounded-2xl border border-[#20FBE1]/30 dark:border-[#20FBE1]/50">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Ainda tem dúvidas?
              </h3>
              <p className="text-gray-600 dark:text-gray-300 max-w-md">
                Entre em contato conosco e teremos prazer em ajudar você a escolher o melhor plano para o seu negócio.
              </p>
              <Button 
                size="lg" 
                className="bg-[#20FBE1] hover:bg-[#1BCFBA] text-gray-900 shadow-lg"
                onClick={handleGetStarted}
              >
                Começar teste grátis
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}