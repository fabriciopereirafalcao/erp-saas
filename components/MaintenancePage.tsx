/**
 * Página de Manutenção
 * Exibida apenas em PRODUÇÃO durante migração SQL
 */
export function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="text-center p-8 max-w-2xl">
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-cyan-500/10 flex items-center justify-center">
            <svg className="w-12 h-12 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Sistema em Manutenção</h1>
          <p className="text-xl text-slate-300 mb-8">
            Estamos realizando melhorias importantes no <span className="text-cyan-400 font-semibold">MetaERP</span>
          </p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">🚀 O que estamos fazendo?</h2>
          <ul className="text-slate-300 space-y-2 text-left">
            <li className="flex items-start">
              <span className="text-cyan-400 mr-2">•</span>
              <span>Migração para arquitetura SQL de alta performance</span>
            </li>
            <li className="flex items-start">
              <span className="text-cyan-400 mr-2">•</span>
              <span>Otimização de velocidade e escalabilidade</span>
            </li>
            <li className="flex items-start">
              <span className="text-cyan-400 mr-2">•</span>
              <span>Preparação para lançamento comercial</span>
            </li>
          </ul>
        </div>

        <div className="text-slate-400">
          <p className="mb-2">⏱️ Previsão de retorno: <span className="text-white font-semibold">Em breve</span></p>
          <p className="text-sm">Caso tenha dúvidas, entre em contato: <a href="mailto:contato@metaerp.com.br" className="text-cyan-400 hover:underline">contato@metaerp.com.br</a></p>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-700">
          <p className="text-sm text-slate-500">
            Versão em manutenção - Migração para SQL em progresso
          </p>
        </div>
      </div>
    </div>
  );
}
