import Link from 'next/link';
import { ArrowRight, LayoutDashboard } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';

export default function Paineis() {
  return (
    <AppLayout title="PAINÉIS" subtitle="PAINÉIS" showHeader={false} fluid>
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-[1600px]">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Central de painéis</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Painéis operacionais</h1>
            </div>
            <span className="hidden rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm sm:inline-flex">
              1 painel disponível
            </span>
          </div>

          <Link
            href="/paineis/controle-pedidos"
            target="_blank"
            rel="noopener noreferrer"
            className="block max-w-xl"
          >
            <Card className="group border-slate-200 shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <LayoutDashboard className="h-7 w-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Painel 01</p>
                  <h2 className="mt-1 text-lg font-bold text-slate-900">Controle de Pedidos</h2>
                  <p className="mt-1 text-sm text-slate-500">Visão geral das etapas, alertas e pendências.</p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-primary" />
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}

Paineis.usesAppLayout = true;
