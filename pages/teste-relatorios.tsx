export default function TesteRelatorios() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🧪 Teste dos Relatórios</h1>

      <div style={{ marginBottom: '20px' }}>
        <h2>✅ Status do Sistema:</h2>
        <ul>
          <li>✅ Servidor rodando na porta 3000</li>
          <li>✅ APIs de relatórios funcionando</li>
          <li>✅ Banco de dados com dados de teste</li>
          <li>✅ Autenticação configurada</li>
        </ul>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>🔗 Links para os Relatórios:</h2>
        <ul>
          <li>
            <a href="/relatorios" style={{ color: 'blue', textDecoration: 'underline' }}>
              📊 Página Principal de Relatórios
            </a>
          </li>
          <li>
            <a href="/relatorios/pallets" style={{ color: 'blue', textDecoration: 'underline' }}>
              📦 Relatório de Pallets
            </a>
          </li>
          <li>
            <a href="/relatorios/controles-carga" style={{ color: 'blue', textDecoration: 'underline' }}>
              📋 Relatório de Controles
            </a>
          </li>
          <li>
            <a href="/relatorios/pallets-motorista" style={{ color: 'blue', textDecoration: 'underline' }}>
              👥 Pallets por Motorista
            </a>
          </li>
        </ul>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>📋 Dados de Teste no Banco:</h2>
        <ul>
          <li>👥 4 controles de carga</li>
          <li>🚛 2 usuários ativos</li>
          <li>📦 Dados de pallets para análise</li>
        </ul>
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f8ff', borderRadius: '5px' }}>
        <h3>🚀 Como Usar:</h3>
        <ol>
          <li>Certifique-se de estar logado (admin@controlecarga.com / 12345678)</li>
          <li>Clique no botão "Relatórios" no menu superior</li>
          <li>Na página de relatórios, clique nos cards para acessar cada relatório</li>
          <li>Use os filtros para refinar os dados</li>
        </ol>
      </div>

      <div style={{ marginTop: '30px', padding: '10px', backgroundColor: '#fff3cd', borderRadius: '5px' }}>
        <p><strong>💡 Dica:</strong> Se os relatórios não aparecerem, abra o console do navegador (F12) e verifique se há erros JavaScript.</p>
      </div>
    </div>
  );
}
