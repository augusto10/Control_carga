import Layout from '../components/Layout';
import { useState, useEffect } from 'react';

export default function Relatorios() {
  const [relatorios, setRelatorios] = useState([]);

  // TODO: Implementar lógica para buscar relatórios da API
  useEffect(() => {
    // fetch('/api/relatorios')
    //   .then(res => res.json())
    //   .then(data => setRelatorios(data));
  }, []);

  return (
    <Layout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Relatórios</h1>
        
        <div className="bg-white shadow-md rounded p-4 mb-4">
          <p className="text-gray-700">
            Página de relatórios em desenvolvimento. Em breve você poderá gerar relatórios completos aqui.
          </p>
        </div>
        
        {/* Exemplo de card de relatório */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white shadow-md rounded p-4">
            <h2 className="text-xl font-semibold mb-2">Relatório de Controles</h2>
            <p className="text-gray-600 mb-3">Resumo de todos os controles de carga</p>
            <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              Gerar Relatório
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
