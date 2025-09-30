import { useState } from 'react';
import { useRouter } from 'next/router';

export default function FixDatabase() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const router = useRouter();

  const executeFix = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/admin/fix-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      setResults(data);

      if (!response.ok) {
        setError('Erro ao executar correção');
      }
    } catch (err) {
      setError('Erro de conexão: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔧 Correção Crítica do Banco de Dados</h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '5px' }}>
        <h3>⚠️ ATENÇÃO</h3>
        <p>Esta página executa correções críticas no banco de dados para resolver:</p>
        <ul>
          <li>Campo <code>tipo</code> ausente na tabela Motorista</li>
          <li>Valores <code>ACERT</code> incorretos (devem ser <code>ACCERT</code>)</li>
        </ul>
        <p><strong>Execute apenas se você tem certeza!</strong></p>
      </div>

      <button 
        onClick={executeFix}
        disabled={loading}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: loading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? '🔄 Executando...' : '🚀 Executar Correção'}
      </button>

      {error && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '5px' }}>
          <h3>❌ Erro</h3>
          <p>{error}</p>
        </div>
      )}

      {results && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ 
            padding: '15px', 
            backgroundColor: results.success ? '#d4edda' : '#f8d7da', 
            border: `1px solid ${results.success ? '#c3e6cb' : '#f5c6cb'}`, 
            borderRadius: '5px' 
          }}>
            <h3>{results.success ? '✅ Sucesso' : '❌ Erro'}</h3>
            
            <div style={{ marginTop: '15px' }}>
              <h4>📋 Log de Execução:</h4>
              <pre style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '10px', 
                borderRadius: '3px', 
                overflow: 'auto',
                whiteSpace: 'pre-wrap'
              }}>
                {results.steps.join('\n')}
              </pre>
            </div>

            {results.errors.length > 0 && (
              <div style={{ marginTop: '15px' }}>
                <h4>🚨 Erros:</h4>
                <ul>
                  {results.errors.map((err, index) => (
                    <li key={index} style={{ color: '#721c24' }}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {results.success && (
            <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#d1ecf1', border: '1px solid #bee5eb', borderRadius: '5px' }}>
              <h4>🎉 Próximos Passos:</h4>
              <ol>
                <li>Aguarde alguns minutos para o cache do Vercel atualizar</li>
                <li>Teste as APIs que estavam com erro 500</li>
                <li>Verifique os logs do Vercel para confirmar que os erros sumiram</li>
              </ol>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#e2e3e5', border: '1px solid #d6d8db', borderRadius: '5px' }}>
        <h4>📖 Informações Técnicas</h4>
        <p>Esta correção executa:</p>
        <ol>
          <li>Adiciona campo <code>tipo</code> na tabela Motorista (se não existir)</li>
          <li>Define valores padrão baseado em CNH e transportadoraId</li>
          <li>Corrige todos os valores ACERT para ACCERT</li>
          <li>Testa as APIs principais para confirmar funcionamento</li>
        </ol>
      </div>
    </div>
  );
}
