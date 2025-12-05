/**
 * Componente de Teste de Persistência
 * Use este componente para testar se os dados estão sendo salvos e carregados corretamente
 */

import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { useERP } from '../contexts/ERPContext';
import { toast } from 'sonner@2.0.3';
import { RefreshCw, Plus, Database, Trash2 } from 'lucide-react';

export function TestePersistencia() {
  const { customers, addCustomer, deleteCustomer } = useERP();
  const [loading, setLoading] = useState(false);

  const adicionarClienteTeste = async () => {
    setLoading(true);
    try {
      const timestamp = Date.now();
      const novoCliente = {
        id: `teste_${timestamp}`,
        documentType: "PJ" as const,
        document: `12345678000${timestamp.toString().slice(-3)}`,
        name: `Cliente Teste ${new Date().toLocaleTimeString()}`,
        company: `Empresa Teste ${timestamp}`,
        tradeName: `Nome Fantasia ${timestamp}`,
        segment: 'Teste',
        contactPerson: 'Pessoa de Contato',
        email: `teste${timestamp}@teste.com`,
        phone: '11999999999',
        address: 'Rua Teste, 123',
        street: 'Rua Teste',
        number: '123',
        complement: 'Sala 1',
        neighborhood: 'Bairro Teste',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
        stateRegistration: 'ISENTO',
        cityRegistration: '',
        icmsContributor: false,
        totalOrders: 0,
        totalSpent: 0,
        status: "Ativo" as const,
      };

      await addCustomer(novoCliente);
      
      console.log('🧪 [TESTE] Cliente adicionado:', novoCliente.id);
      console.log('🧪 [TESTE] Total de clientes agora:', customers.length + 1);
      
      toast.success('Cliente teste adicionado!', {
        description: `ID: ${novoCliente.id}`,
      });
    } catch (error: any) {
      console.error('🧪 [TESTE] Erro ao adicionar cliente:', error);
      toast.error('Erro ao adicionar cliente', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const limparClientesTeste = async () => {
    setLoading(true);
    try {
      const clientesTeste = customers.filter(c => c.id.startsWith('teste_'));
      
      console.log(`🧪 [TESTE] Removendo ${clientesTeste.length} clientes de teste...`);
      
      for (const cliente of clientesTeste) {
        await deleteCustomer(cliente.id);
      }
      
      toast.success(`${clientesTeste.length} clientes de teste removidos!`);
    } catch (error: any) {
      console.error('🧪 [TESTE] Erro ao limpar clientes:', error);
      toast.error('Erro ao limpar clientes', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const recarregarPagina = () => {
    console.log('🧪 [TESTE] Recarregando página...');
    window.location.reload();
  };

  const verificarLocalStorage = () => {
    console.log('🧪 [TESTE] ===== VERIFICAÇÃO DO LOCALSTORAGE =====');
    
    const allKeys = Object.keys(localStorage).filter(k => k.startsWith('erp_system_'));
    console.log(`🧪 [TESTE] Total de chaves ERP no localStorage: ${allKeys.length}`);
    
    allKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            console.log(`🧪 [TESTE] ${key}: ${parsed.length} items`);
            if (key.includes('customers') && parsed.length > 0) {
              console.log(`🧪 [TESTE] Primeiro cliente:`, parsed[0]);
            }
          } else {
            console.log(`🧪 [TESTE] ${key}:`, typeof parsed);
          }
        } catch {
          console.log(`🧪 [TESTE] ${key}: (não é JSON)`);
        }
      }
    });
    
    console.log('🧪 [TESTE] =====================================');
    toast.info('Verifique o console (F12) para ver os dados');
  };

  const clientesTeste = customers.filter(c => c.id.startsWith('teste_'));

  return (
    <div className="p-6 space-y-6">
      <Card className="p-6">
        <h2 className="mb-4">🧪 Teste de Persistência de Dados</h2>
        
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <h3 className="font-medium mb-2">📊 Status Atual</h3>
            <p className="text-sm">
              <strong>Total de clientes:</strong> {customers.length}<br/>
              <strong>Clientes de teste:</strong> {clientesTeste.length}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={adicionarClienteTeste}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar Cliente Teste
            </Button>

            <Button
              onClick={limparClientesTeste}
              disabled={loading || clientesTeste.length === 0}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Limpar Clientes Teste ({clientesTeste.length})
            </Button>

            <Button
              onClick={recarregarPagina}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Recarregar Página
            </Button>

            <Button
              onClick={verificarLocalStorage}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Database className="w-4 h-4" />
              Ver localStorage (Console)
            </Button>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
            <h3 className="font-medium mb-2">📋 Como testar:</h3>
            <ol className="text-sm space-y-1 list-decimal list-inside">
              <li>Abra o Console do navegador (F12)</li>
              <li>Clique em "Adicionar Cliente Teste"</li>
              <li>Aguarde 3 segundos (tempo do debounce do Supabase)</li>
              <li>Verifique os logs no Console: <code>[SYNC]</code> e <code>[DATA_POST]</code></li>
              <li>Clique em "Recarregar Página"</li>
              <li>Verifique se o cliente permanece na lista</li>
              <li>Verifique os logs: <code>[SUPABASE]</code> e <code>[DATA_GET]</code></li>
            </ol>
          </div>

          {clientesTeste.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <h3 className="font-medium mb-2">✅ Clientes de Teste</h3>
              <ul className="text-sm space-y-1">
                {clientesTeste.map(c => (
                  <li key={c.id}>
                    <strong>{c.name}</strong> - ID: {c.id}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
