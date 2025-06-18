import { createContext, useContext, ReactNode } from 'react';
import { useConfiguracoes, ConfiguracaoSistema } from '../hooks/useConfiguracoes';

interface ConfiguracaoContextType {
  configs: Record<string, any>;
  loading: boolean;
  error: Error | null;
  getConfig: (chave: string, valorPadrao?: any) => any;
  atualizarConfigs: (novasConfigs: Record<string, any>) => Promise<Record<string, any>>;
  recarregarConfigs: () => Promise<Record<string, any>>;
}

const ConfiguracaoContext = createContext<ConfiguracaoContextType | undefined>(undefined);

export function ConfiguracaoProvider({ children }: { children: ReactNode }) {
  const {
    configuracoes,
    loading,
    error,
    getConfiguracao,
    carregarConfiguracoes,
    atualizarConfiguracoes
  } = useConfiguracoes();

  // Função auxiliar para obter uma configuração com tipo seguro
  const getConfig = <T = any>(chave: string, valorPadrao: T = null as any): T => {
    return getConfiguracao(chave, valorPadrao) as T;
  };

  return (
    <ConfiguracaoContext.Provider
      value={{
        configs: configuracoes,
        loading,
        error,
        getConfig,
        atualizarConfigs: async (novasConfigs: Record<string, any>) => {
          // Convert the Record into individual updates
          for (const [chave, novoValor] of Object.entries(novasConfigs)) {
            await atualizarConfiguracoes(chave, novoValor);
          }
          return novasConfigs;
        },
        recarregarConfigs: carregarConfiguracoes
      }}
    >
      {children}
    </ConfiguracaoContext.Provider>
  );
}

export function useConfiguracao() {
  const context = useContext(ConfiguracaoContext);
  if (context === undefined) {
    throw new Error('useConfiguracao deve ser usado dentro de um ConfiguracaoProvider');
  }
  return context;
}

// Hook para acessar uma configuração específica com tipagem
export function useConfig<T = any>(chave: string, valorPadrao?: T): {
  valor: T;
  loading: boolean;
  error: Error | null;
  atualizar: (novoValor: T) => Promise<void>;
} {
  const { configs, loading, error, getConfig, atualizarConfigs } = useConfiguracao();
  
  const atualizar = async (novoValor: T) => {
    await atualizarConfigs({ [chave]: novoValor });
  };
  
  return {
    valor: getConfig(chave, valorPadrao) as T,
    loading,
    error,
    atualizar
  };
}
