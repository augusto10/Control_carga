import Layout from '../../components/Layout';
import { useEffect, useMemo, useState } from 'react';

type Row = {
  motorista: string;
  cpfMotorista: string | null;
  qtdPalletsLevados: number;
  qtdPalletsDevolvidos: number;
  diferenca: number;
  totalControles: number;
};

type ApiResponse = {
  period: { start: string | null; end: string | null };
  totalMotoristas: number;
  data: Row[];
};

export default function RelatorioPalletsPorMotorista() {
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');

  const totalLevados = useMemo(() => data.reduce((acc, r) => acc + r.qtdPalletsLevados, 0), [data]);
  const totalDevolvidos = useMemo(() => data.reduce((acc, r) => acc + r.qtdPalletsDevolvidos, 0), [data]);
  const totalDiferenca = useMemo(() => data.reduce((acc, r) => acc + r.diferenca, 0), [data]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (start) params.set('start', start);
      if (end) params.set('end', end);
      const res = await fetch(`/api/relatorios/pallets-por-motorista?${params.toString()}`);
      if (!res.ok) throw new Error('Falha ao buscar relatório');
      const body: ApiResponse = await res.json();
      setData(body.data || []);
    } catch (e) {
      console.error(e);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Layout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Relatórios Gerencial - Pallets por Motorista</h1>

        <div className="bg-white shadow-md rounded p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Início</label>
              <input type="date" value={start} onChange={e => setStart(e.target.value)} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fim</label>
              <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="w-full border rounded px-3 py-2" />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button onClick={fetchData} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60" disabled={loading}>
                {loading ? 'Carregando...' : 'Aplicar Filtros'}
              </button>
              <button onClick={() => { setStart(''); setEnd(''); fetchData(); }} className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">
                Limpar
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-md rounded p-4 mb-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div><span className="font-semibold">Total Motoristas:</span> {data.length}</div>
            <div><span className="font-semibold">Pallets Levados:</span> {totalLevados}</div>
            <div><span className="font-semibold">Pallets Devolvidos:</span> {totalDevolvidos}</div>
            <div><span className="font-semibold">Diferença Pallets:</span> <span className={totalDevolvidos > totalLevados ? 'text-green-700' : 'text-red-700'}>{totalDevolvidos > totalLevados ? '+' : '-'}{Math.abs(totalDiferenca)}</span></div>
          </div>
        </div>

        <div className="overflow-x-auto bg-white shadow-md rounded">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Motorista</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPF</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Levados</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Devolvidos</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Diferença Pallets</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qtde Controles</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((row) => (
                <tr key={`${row.motorista}-${row.cpfMotorista}`}>
                  <td className="px-4 py-2 whitespace-nowrap">{row.motorista}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{row.cpfMotorista || '-'}</td>
                  <td className="px-4 py-2 text-right">{row.qtdPalletsLevados}</td>
                  <td className="px-4 py-2 text-right">{row.qtdPalletsDevolvidos}</td>
                  <td className={`px-4 py-2 text-right ${row.qtdPalletsDevolvidos > row.qtdPalletsLevados ? 'text-green-700' : 'text-red-700'}`}>{row.qtdPalletsDevolvidos > row.qtdPalletsLevados ? '+' : '-'}{Math.abs(row.diferenca)}</td>
                  <td className="px-4 py-2 text-right">{row.totalControles}</td>
                </tr>
              ))}
              {data.length === 0 && !loading && (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>Nenhum dado encontrado para o período selecionado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
