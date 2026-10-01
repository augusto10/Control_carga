type StatusResumo = { codigo: string; titulo: string; total: number };

export function ResumoStatusPedidos({ itens }: { itens: StatusResumo[] }) {
  return (
    <section aria-label="Resumo de pedidos por status" className="space-y-2">
      <h3 className="text-sm font-bold text-slate-800">Resumo por status</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {itens.filter((item) => item.total > 0 || (!item.codigo.startsWith('ALERTAS_') && item.codigo !== 'PENDENCIAS')).map((item) => (
          <div key={item.codigo} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase text-slate-600">{item.titulo}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{item.total}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
