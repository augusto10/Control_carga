import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

interface ConfiguracaoSistema {
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
  const carregarConfiguracoes = useCallback(async () => {
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
      
      setConfiguracoes(configs);
      setError(null);
      return configs;
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
      setError(err instanceof Error ? err : new Error('Erro ao carregar configurações'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Atualizar configurações
  const atualizarConfiguracoes = useCallback(async (novasConfiguracoes: Record<string, any>) => {
    try {
      setLoading(true);
      
      // Preparar os dados para envio
      const dadosAtualizacao = Object.entries(novasConfiguracoes).map(([chave, valor]) => ({
        chave,
        valor: typeof valor === 'boolean' ? String(valor) : 
              typeof valor === 'object' ? JSON.stringify(valor) : String(valor)
      }));
      
      const response = await api.put('/api/admin/configuracoes', { 
        configuracoes: dadosAtualizacao 
      });
      
      // Atualizar o estado local com as configurações retornadas
      const configsAtualizadas: Record<string, any> = {};
      response.data.forEach((config: ConfiguracaoSistema) => {
        switch (config.tipo) {
          case 'number':
            configsAtualizadas[config.chave] = parseFloat(config.valor) || 0;
            break;
          case 'boolean':
            configsAtualizadas[config.chave] = config.valor === 'true';
            break;
          case 'json':
            try {
              configsAtualizadas[config.chave] = JSON.parse(config.valor);
            } catch {
              configsAtualizadas[config.chave] = {};
            }
            break;
          default:
            configsAtualizadas[config.chave] = config.valor;
        }
      });
      
      setConfiguracoes(prev => ({
        ...prev,
        ...configsAtualizadas
      }));
      
      return configsAtualizadas;
    } catch (err) {
      console.error('Erro ao atualizar configurações:', err);
      setError(err instanceof Error ? err : new Error('Erro ao atualizar configurações'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Obter uma configuração específica
  const getConfiguracao = useCallback((chave: string, valorPadrao: any = null) => {
    return configuracoes[chave] !== undefined ? configuracoes[chave] : valorPadrao;
  }, [configuracoes]);

  // Efeito para carregar as configurações quando o hook for montado
  useEffect(() => {
    carregarConfiguracoes();
  }, [carregarConfiguracoes]);

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
export function useConfiguracao(chave: string, valorPadrao: any = null) {
  const { getConfiguracao, ...rest } = useConfiguracoes();
  
  return {
    valor: getConfiguracao(chave, valorPadrao),
    ...rest
  };
}
