import { useState, useEffect } from 'react';
import Head from 'next/head';
import { 
  Settings, 
  Save, 
  Mail, 
  Shield, 
  Bell, 
  Database, 
  Sliders, 
  HelpCircle,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { api } from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfiguracoesSistema {
  id: string;
  chave: string;
  valor: string;
  descricao: string;
  tipo: 'TEXTO' | 'NUMERO' | 'BOOLEANO' | 'SELECAO';
  opcoes?: string[];
}

function ConfiguracoesContent() {
  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesSistema[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Toast
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ 
    show: false, 
    message: '', 
    type: 'success' 
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  // Carregar configurações quando o componente for montado
  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  const carregarConfiguracoes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/admin/configuracoes');
      setConfiguracoes(response.data.data || []);
    } catch (error: any) {
      console.error('Erro ao carregar configurações:', error);
      setError('Não foi possível carregar as configurações do sistema.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (id: string, value: string | boolean) => {
    setConfiguracoes(prev => 
      prev.map(config => 
        config.id === id ? { ...config, valor: String(value) } : config
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      const configuracoesAtualizadas = configuracoes.map(({ id, valor }) => ({
        id,
        valor
      }));
      
      await api.put('/api/admin/configuracoes', { configuracoes: configuracoesAtualizadas });
      showToast('Configurações salvas com sucesso!');
    } catch (error: any) {
      console.error('Erro ao salvar configurações:', error);
      showToast(error.response?.data?.message || 'Erro ao salvar configurações', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getIconForConfig = (chave: string) => {
    const chaveLower = chave.toLowerCase();
    if (chaveLower.includes('email') || chaveLower.includes('smtp')) return Mail;
    if (chaveLower.includes('seguranca') || chaveLower.includes('senha')) return Shield;
    if (chaveLower.includes('notificacao')) return Bell;
    if (chaveLower.includes('banco') || chaveLower.includes('storage')) return Database;
    if (chaveLower.includes('geral')) return Sliders;
    return Settings;
  };

  const renderConfiguracaoInput = (config: ConfiguracoesSistema) => {
    switch (config.tipo) {
      case 'BOOLEANO':
        const isEnabled = config.valor === 'true';
        return (
          <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-100 transition-all hover:bg-slate-50">
            <span className="text-sm font-medium text-textMuted">
              {isEnabled ? 'Ativado' : 'Desativado'}
            </span>
            <button
              type="button"
              onClick={() => handleInputChange(config.id, !isEnabled)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20",
                isEnabled ? "bg-primary" : "bg-slate-300"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  isEnabled ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>
        );
      case 'SELECAO':
        return (
          <select 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm appearance-none"
            value={config.valor}
            onChange={(e) => handleInputChange(config.id, e.target.value)}
          >
            {config.opcoes?.map((opcao) => (
              <option key={opcao} value={opcao}>
                {opcao}
              </option>
            ))}
          </select>
        );
      case 'NUMERO':
        return (
          <input 
            type="number"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
            value={config.valor}
            onChange={(e) => handleInputChange(config.id, e.target.value)}
          />
        );
      case 'TEXTO':
      default:
        return (
          <textarea 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm min-h-[42px] resize-y"
            rows={config.valor.length > 50 ? 3 : 1}
            value={config.valor}
            onChange={(e) => handleInputChange(config.id, e.target.value)}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="w-10 h-10 text-primary animate-spin opacity-20" />
        <p className="text-textMuted font-medium animate-pulse">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <AppLayout 
      title="Configurações do Sistema" 
      subtitle="Personalize o comportamento e parâmetros globais da plataforma"
    >
      <Head>
        <title>Configurações | ControlCarga</title>
      </Head>

      <div className="max-w-5xl mx-auto">
        {error ? (
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-8 text-center flex flex-col items-center gap-4">
            <AlertCircle className="w-12 h-12 text-rose-500 opacity-50" />
            <div className="space-y-1">
              <h3 className="font-bold text-rose-900">Erro ao carregar dados</h3>
              <p className="text-rose-700 text-sm">{error}</p>
            </div>
            <Button variant="danger" onClick={carregarConfiguracoes}>
              Tentar Novamente
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8 pb-20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {configuracoes.map((config, index) => {
                const ConfigIcon = getIconForConfig(config.chave);
                return (
                  <motion.div
                    key={config.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="h-full group hover:border-primary/30 transition-all duration-300">
                      <div className="space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                            <ConfigIcon className="w-5 h-5" />
                          </div>
                          <div className="space-y-1 flex-1">
                            <h3 className="font-bold text-textMain capitalize leading-tight">
                              {config.chave.replace(/_/g, ' ')}
                            </h3>
                            <p className="text-xs text-textMuted leading-relaxed">
                              {config.descricao}
                            </p>
                          </div>
                        </div>
                        
                        <div className="pt-2">
                          {renderConfiguracaoInput(config)}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* Ações do Formulário */}
            <div className="fixed bottom-4 sm:bottom-8 left-0 right-0 px-4 sm:px-6 md:left-[calc(50%+140px)] md:w-[calc(100%-320px)] md:max-w-5xl md:mx-auto z-50">
              <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-2xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom-4">
                <div className="hidden lg:flex items-center gap-2 text-textMuted text-sm">
                  <Info className="w-4 h-4 text-primary" />
                  <span>As alterações só serão aplicadas após salvar.</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={carregarConfiguracoes}
                    disabled={saving}
                    className="flex-1 sm:flex-none text-xs sm:text-sm h-10 sm:h-11"
                  >
                    Descartar
                  </Button>
                  <Button 
                    type="submit" 
                    variant="primary" 
                    loading={saving}
                    iconLeft={<Save className="w-4 h-4" />}
                    className="flex-1 sm:flex-none px-4 sm:px-8 text-xs sm:text-sm h-10 sm:h-11"
                  >
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-6 z-[100] px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-10 md:slide-in-from-right-10 w-[calc(100%-2rem)] max-w-[400px] md:w-auto"
          >
            <div className={cn(
              "flex items-center gap-3 px-6 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold whitespace-nowrap w-full",
              toast.type === 'success' 
                ? "bg-emerald-600 text-white border-emerald-500" 
                : "bg-rose-600 text-white border-rose-500"
            )}>
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}

import AdminRoute from '../../../components/admin/AdminRoute';

export default function Configuracoes() {
  return (
    <AdminRoute>
      <ConfiguracoesContent />
    </AdminRoute>
  );
}

(Configuracoes as any).usesAppLayout = true;
