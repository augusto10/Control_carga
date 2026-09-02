import { motion } from 'framer-motion';
import { LucideIcon, AlertCircle, Loader2, Siren, ShieldAlert } from 'lucide-react';
import { cn } from '@/utils/cn';

interface StageCardItem {
  key: string;
  titulo: string;
  total: number;
  icon: LucideIcon;
  iconClassName?: string;
  colorClass: string;
  onClick: () => void;
}

interface AlertSummary {
  naoSeparado: number;
  naoConferido: number;
  naoEmbarcado: number;
  total: number;
  onClick: () => void;
}

interface PendenciasSummary {
  total: number;
  previewItems: string[];
  onClick: () => void;
}

interface ExpedicaoCardsProps {
  stageCards: StageCardItem[];
  alertas: AlertSummary;
  pendencias: PendenciasSummary;
  loadingStages?: boolean;
  loadingSecondary?: boolean;
}

const StageCard = ({
  item,
  index,
  loading,
}: {
  item: StageCardItem;
  index: number;
  loading: boolean;
}) => {
  const Icon = item.icon;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
      onClick={item.onClick}
      className={cn(
        'group relative min-h-[220px] overflow-hidden rounded-[18px] p-3.5 text-left text-white shadow-[0_10px_24px_rgba(15,23,42,0.14)] transition',
        'hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(15,23,42,0.2)]',
        `bg-gradient-to-b ${item.colorClass}`
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.35),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(0,0,0,0.18),_transparent_32%)]" />
      <div className="absolute bottom-6 right-4 opacity-[0.09] transition group-hover:opacity-[0.14]">
        <Icon className="h-12 w-12" strokeWidth={1.2} />
      </div>

      <div className="relative flex h-full flex-col items-center justify-between text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 shadow-lg shadow-black/10">
          <Icon className={cn('h-6 w-6', item.iconClassName || 'text-slate-700')} strokeWidth={2} />
        </div>

        <div className="space-y-1">
          <h3 className="text-[1rem] font-black uppercase leading-tight tracking-tight text-white sm:text-[1.05rem]">
            {item.titulo}
          </h3>
        </div>

        <div className="space-y-1">
          {loading ? (
            <Loader2 className="h-8 w-8 animate-spin text-white/90" aria-label="Carregando" />
          ) : (
            <p className="text-4xl font-black leading-none tracking-tight text-white sm:text-5xl">
              {item.total}
            </p>
          )}
        </div>
      </div>
    </motion.button>
  );
};

export function ExpedicaoCards({
  stageCards,
  alertas,
  pendencias,
  loadingStages = false,
  loadingSecondary = false,
}: ExpedicaoCardsProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stageCards.map((item, index) => (
          <StageCard key={item.key} item={item} index={index} loading={loadingStages} />
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.35 }}
          onClick={alertas.onClick}
          className="group relative min-h-[180px] overflow-hidden rounded-[18px] bg-gradient-to-br from-red-950 via-red-800 to-rose-950 p-4 text-left text-white shadow-[0_10px_24px_rgba(239,68,68,0.3)] transition hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(239,68,68,0.45)]"
        >
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-[18px] border-[4px] border-red-400 bg-gradient-to-br from-red-500 via-red-600 to-red-700"
            animate={{
              opacity: [0.05, 0.9, 0.08, 0.95, 0.05, 0.05],
              scale: [1, 1.015, 1, 1.015, 1, 1],
              boxShadow: [
                'inset 0 0 0 rgba(255, 0, 0, 0)',
                'inset 0 0 70px rgba(255, 35, 35, 1)',
                'inset 0 0 5px rgba(255, 0, 0, 0.1)',
                'inset 0 0 80px rgba(255, 35, 35, 1)',
                'inset 0 0 0 rgba(255, 0, 0, 0)',
                'inset 0 0 0 rgba(255, 0, 0, 0)',
              ],
            }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', times: [0, 0.1, 0.22, 0.32, 0.44, 1] }}
          />
          <div className="absolute bottom-6 right-6 opacity-[0.09] transition group-hover:opacity-[0.14]">
            <AlertCircle className="h-20 w-20" strokeWidth={1.2} />
          </div>

          <div className="relative flex h-full flex-col">
            <div className="flex items-center gap-3">
              <motion.div
                className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 ring-4 ring-red-200/10"
                animate={{
                  backgroundColor: ['rgba(127, 29, 29, 0.4)', 'rgba(255, 30, 30, 1)', 'rgba(127, 29, 29, 0.4)', 'rgba(255, 30, 30, 1)', 'rgba(127, 29, 29, 0.4)', 'rgba(127, 29, 29, 0.4)'],
                  boxShadow: [
                    '0 0 0 rgba(255, 50, 50, 0)',
                    '0 0 42px 14px rgba(255, 30, 30, 0.95)',
                    '0 0 0 rgba(255, 50, 50, 0)',
                    '0 0 48px 16px rgba(255, 30, 30, 1)',
                    '0 0 0 rgba(255, 50, 50, 0)',
                    '0 0 0 rgba(255, 50, 50, 0)',
                  ],
                }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', times: [0, 0.1, 0.22, 0.32, 0.44, 1] }}
              >
                <Siren className="h-6 w-6 text-white" />
              </motion.div>
              <div>
                <h3 className="text-lg font-black uppercase leading-tight sm:text-xl">Alertas</h3>
                <div className="mt-2 h-px w-32 bg-white/28" />
              </div>
            </div>

            <div className="mt-3 space-y-1 text-[11px] font-bold sm:text-xs">
              <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                <span className="uppercase">Nao separado:</span>
                <strong className="text-lg sm:text-xl">{loadingSecondary ? '-' : alertas.naoSeparado}</strong>
              </div>
              <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                <span className="uppercase">Nao conferido:</span>
                <strong className="text-lg sm:text-xl">{loadingSecondary ? '-' : alertas.naoConferido}</strong>
              </div>
              <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                <span className="uppercase">Nao embarcado:</span>
                <strong className="text-lg sm:text-xl">{loadingSecondary ? '-' : alertas.naoEmbarcado}</strong>
              </div>
            </div>
          </div>
        </motion.button>

        <motion.button
          type="button"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36, duration: 0.35 }}
          onClick={pendencias.onClick}
          className="group relative min-h-[180px] overflow-hidden rounded-[18px] bg-gradient-to-br from-red-950 via-red-900 to-rose-950 p-4 text-left text-white shadow-[0_10px_24px_rgba(239,68,68,0.3)] transition hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(239,68,68,0.45)]"
        >
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-[18px] border-[4px] border-red-400 bg-gradient-to-br from-red-500 via-red-600 to-red-700"
            animate={{
              opacity: [0.05, 0.9, 0.08, 0.95, 0.05, 0.05],
              scale: [1, 1.015, 1, 1.015, 1, 1],
              boxShadow: [
                'inset 0 0 0 rgba(255, 0, 0, 0)',
                'inset 0 0 70px rgba(255, 35, 35, 1)',
                'inset 0 0 5px rgba(255, 0, 0, 0.1)',
                'inset 0 0 80px rgba(255, 35, 35, 1)',
                'inset 0 0 0 rgba(255, 0, 0, 0)',
                'inset 0 0 0 rgba(255, 0, 0, 0)',
              ],
            }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', times: [0, 0.1, 0.22, 0.32, 0.44, 1] }}
          />
          <div className="absolute bottom-6 right-6 opacity-[0.09] transition group-hover:opacity-[0.14]">
            <ShieldAlert className="h-20 w-20" strokeWidth={1.2} />
          </div>

          <div className="relative flex h-full min-h-0 flex-col">
            <div className="flex items-center gap-3">
              <motion.div
                className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 ring-4 ring-red-200/10"
                animate={{
                  backgroundColor: ['rgba(127, 29, 29, 0.4)', 'rgba(255, 30, 30, 1)', 'rgba(127, 29, 29, 0.4)', 'rgba(255, 30, 30, 1)', 'rgba(127, 29, 29, 0.4)', 'rgba(127, 29, 29, 0.4)'],
                  boxShadow: [
                    '0 0 0 rgba(255, 50, 50, 0)',
                    '0 0 42px 14px rgba(255, 30, 30, 0.95)',
                    '0 0 0 rgba(255, 50, 50, 0)',
                    '0 0 48px 16px rgba(255, 30, 30, 1)',
                    '0 0 0 rgba(255, 50, 50, 0)',
                    '0 0 0 rgba(255, 50, 50, 0)',
                  ],
                }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', times: [0, 0.1, 0.22, 0.32, 0.44, 1] }}
              >
                <ShieldAlert className="h-6 w-6 text-white" />
              </motion.div>
              <div>
                <h3 className="text-lg font-black uppercase leading-tight sm:text-xl">Pendencias</h3>
                <div className="mt-2 h-px w-28 bg-white/28" />
              </div>
            </div>

            <div className="mt-3 grid min-h-0 flex-1 content-start gap-1 overflow-y-auto pr-1 text-[10px] sm:text-[11px]">
              {loadingSecondary ? (
                <div className="flex items-center gap-2 font-bold">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Carregando pendencias...</span>
                </div>
              ) : pendencias.previewItems.length > 0 ? (
                pendencias.previewItems.map((item) => (
                  <div key={item} className="grid grid-cols-1 items-center gap-2 font-bold leading-tight">
                    <strong className="text-xs sm:text-sm">{item}</strong>
                  </div>
                ))
              ) : (
                <div className="grid grid-cols-[1fr_auto] items-center gap-2 font-bold leading-tight">
                  <span className="uppercase">Pedido:</span>
                  <strong className="text-sm sm:text-base">{pendencias.total}</strong>
                </div>
              )}
            </div>
          </div>
        </motion.button>
      </div>
    </div>
  );
}
