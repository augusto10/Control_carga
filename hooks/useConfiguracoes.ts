// hooks/useConfiguracoes.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';

export interface ConfiguracaoSistema {
  chave: string;
  valor: string;
  tipo: 'string' | 'number' | 'boolean' | 'json';
  descricao?: string;
  editavel: boolean;
  opcoes?: string;
}

export function useConfiguracoes() {
  const [configuracoes, setConfiguracoes] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Carregar configurações
  const carregarConfiguracoes = useCallback(async (): Promise<Record<string, any>> => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/configuracoes');
      
      // Converter os valores para seus respectivos tipos
      const configs: Record<string, any> = {};
      response.data.forEach((config: ConfiguracaoSistema) => {
        switch (config.tipo) {
          case 'number':
            configs[config.chave] = parseFloat(config.valor) || 0;
            break;
          case 'boolean':
            configs[config.chave] = config.valor === 'true';
            break;
          case 'json':
            try {
              configs[config.chave] = JSON.parse(config.valor);
            } catch {
              configs[config.chave] = {};
            }
            break;
          default:
            configs[config.chave] = config.valor;
        }
      });
      
      setConfiguracoes(prevConfigs => {
        // Só atualiza se as configurações forem diferentes
        if (JSON.stringify(prevConfigs) !== JSON.stringify(configs)) {
          return configs;
        }
        return prevConfigs;
      });
      
      setError(null);
      return configs;
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
      setError(err instanceof Error ? err : new Error('Erro desconhecido'));
      return {}; // Retorna um objeto vazio em caso de erro
    } finally {
      setLoading(false);
    }
  }, [setConfiguracoes, setLoading, setError]);

  // Atualizar configurações
  const atualizarConfiguracoes = useCallback(async (chave: string, novoValor: any) => {
    try {
      setLoading(true);
      const response = await api.put(`/api/admin/configuracoes/${chave}`, { valor: novoValor });
      
      // Atualizar estado local
      setConfiguracoes(prev => ({
        ...prev,
        [chave]: novoValor
      }));
      
      setError(null);
      return response.data;
    } catch (err) {
      console.error('Erro ao atualizar configuração:', err);
      setError(err instanceof Error ? err : new Error('Erro ao atualizar configuração'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Função auxiliar para obter uma configuração
  const getConfiguracao = useCallback((chave: string, valorPadrao: any = null) => {
    return configuracoes[chave] ?? valorPadrao;
  }, [configuracoes]);

  // Removido o carregamento automático para ser controlado pelo ConfiguracaoProvider
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return {
    configuracoes,
    loading,
    error,
    getConfiguracao,
    carregarConfiguracoes,
    atualizarConfiguracoes
  };
}

// Hook para acessar uma configuração específica
export function useConfiguracao<T>(chave: string, valorPadrao: T = null as T) {
  const { configuracoes, loading, error, atualizarConfiguracoes } = useConfiguracoes();

  const valor = configuracoes[chave] ?? valorPadrao;

  const atualizar = useCallback(async (novoValor: T) => {
    await atualizarConfiguracoes(chave, novoValor);
  }, [chave, atualizarConfiguracoes]);

  return {
    valor,
    loading,
    error,
    atualizar
  };
};