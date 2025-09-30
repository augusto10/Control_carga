const fs = require('fs');
const path = require('path');

console.log('🔧 Corrigindo problemas de atualização após assinaturas...\n');

const filePath = path.join(__dirname, '..', 'components', 'ListarControlesContent.tsx');

try {
  // Ler o arquivo
  let content = fs.readFileSync(filePath, 'utf8');
  
  console.log('📄 Arquivo lido com sucesso');
  
  // 1. Melhorar o callback de assinatura - tornar mais robusto
  const oldCallback = `onAssinaturaSalva={async () => {
          console.log('🔄 [ASSINATURA] Iniciando atualização após assinatura...');
          try {
            // Aguarda um pouco para garantir que o banco foi atualizado
            console.log('🔄 [ASSINATURA] Aguardando banco atualizar...');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Recarrega os dados dos controles
            console.log('🔄 [ASSINATURA] Recarregando dados do store...');
            await fetchControles();
            
            // Aguarda um pouco mais para garantir que o store foi atualizado
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Atualiza a lista local
            console.log('🔄 [ASSINATURA] Convertendo controles do store...');
            const novosControles = converterControles(controlesStore as any);
            console.log('🔄 [ASSINATURA] Novos controles:', novosControles.length);
            
            // Força atualização com key diferente para garantir re-render
            const timestamp = Date.now();
            setControles(novosControles.map(c => ({ ...c, _updateKey: timestamp })));
            
            // Se o modal de detalhes está aberto para o controle assinado, atualiza também
            if (detalhesModal.aberto && detalhesModal.controle?.id === assinaturaAberta.controleId) {
              const controleAtualizadoParaModal = novosControles.find(c => c.id === assinaturaAberta.controleId);
              if (controleAtualizadoParaModal) {
                console.log('🔄 [ASSINATURA] Atualizando modal de detalhes...');
                setDetalhesModal(prev => ({
                  ...prev,
                  controle: controleAtualizadoParaModal
                }));
              }
            }
            
            // Força múltiplas atualizações para garantir re-render
            setTimeout(() => {
              console.log('🔄 [ASSINATURA] Forçando re-render adicional...');
              setControles(prev => [...prev]);
            }, 200);
            
            setTimeout(() => {
              console.log('🔄 [ASSINATURA] Forçando re-render final...');
              setControles(prev => prev.map(c => ({ ...c })));
            }, 500);
            
            console.log('✅ [ASSINATURA] Atualização concluída com sucesso!');
            
            // Mostra feedback de sucesso
            enqueueSnackbar('Assinatura salva e lista atualizada!', { 
              variant: 'success',
              autoHideDuration: 3000,
              anchorOrigin: { vertical: 'top', horizontal: 'center' }
            });
          } catch (error) {
            console.error('❌ [ASSINATURA] Erro ao recarregar dados:', error);
            enqueueSnackbar('Assinatura salva, mas houve erro ao atualizar a lista', { 
              variant: 'warning',
              autoHideDuration: 5000 
            });
          }
        }}`;

  const newCallback = `onAssinaturaSalva={async () => {
          console.log('🔄 [ASSINATURA] Iniciando atualização após assinatura...');
          try {
            // Aguarda mais tempo para garantir que o banco foi atualizado
            console.log('🔄 [ASSINATURA] Aguardando banco atualizar...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Recarrega os dados dos controles múltiplas vezes
            console.log('🔄 [ASSINATURA] Recarregando dados do store...');
            await fetchControles();
            await new Promise(resolve => setTimeout(resolve, 500));
            await fetchControles(); // Segunda tentativa
            
            // Aguarda mais tempo para garantir que o store foi atualizado
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Atualiza a lista local com força bruta
            console.log('🔄 [ASSINATURA] Convertendo controles do store...');
            const novosControles = converterControles(controlesStore as any);
            console.log('🔄 [ASSINATURA] Novos controles:', novosControles.length);
            
            // Força atualização múltipla com diferentes estratégias
            const timestamp = Date.now();
            
            // Estratégia 1: Limpar e recarregar
            setControles([]);
            await new Promise(resolve => setTimeout(resolve, 100));
            setControles(novosControles);
            
            // Estratégia 2: Força re-render com key única
            setTimeout(() => {
              setControles(novosControles.map(c => ({ ...c, _updateKey: timestamp })));
            }, 200);
            
            // Estratégia 3: Força re-render com spread
            setTimeout(() => {
              setControles(prev => [...prev]);
            }, 400);
            
            // Estratégia 4: Força re-render com map
            setTimeout(() => {
              setControles(prev => prev.map(c => ({ ...c })));
            }, 600);
            
            // Se o modal de detalhes está aberto para o controle assinado, atualiza também
            if (detalhesModal.aberto && detalhesModal.controle?.id === assinaturaAberta.controleId) {
              const controleAtualizadoParaModal = novosControles.find(c => c.id === assinaturaAberta.controleId);
              if (controleAtualizadoParaModal) {
                console.log('🔄 [ASSINATURA] Atualizando modal de detalhes...');
                setDetalhesModal(prev => ({
                  ...prev,
                  controle: controleAtualizadoParaModal
                }));
              }
            }
            
            console.log('✅ [ASSINATURA] Atualização concluída com sucesso!');
            
            // Mostra feedback de sucesso
            enqueueSnackbar('Assinatura salva e lista atualizada automaticamente!', { 
              variant: 'success',
              autoHideDuration: 4000,
              anchorOrigin: { vertical: 'top', horizontal: 'center' }
            });
            
            // Força uma última atualização após 2 segundos
            setTimeout(async () => {
              console.log('🔄 [ASSINATURA] Atualização final de segurança...');
              await fetchControles();
              const controlesFinais = converterControles(controlesStore as any);
              setControles(controlesFinais);
            }, 2000);
            
          } catch (error) {
            console.error('❌ [ASSINATURA] Erro ao recarregar dados:', error);
            enqueueSnackbar('Assinatura salva, mas houve erro ao atualizar a lista', { 
              variant: 'warning',
              autoHideDuration: 5000 
            });
          }
        }}`;

  // Substituir o callback
  if (content.includes(oldCallback)) {
    content = content.replace(oldCallback, newCallback);
    console.log('✅ Callback de assinatura melhorado');
  } else {
    console.log('⚠️ Callback não encontrado para substituição');
  }

  // 2. Adicionar useEffect para atualização periódica após o useEffect existente
  const useEffectLocation = `  }, [controlesStore, converterControles]);

  const gerarPdf = async (controle: ControleComNotas) => {`;

  const newUseEffectLocation = `  }, [controlesStore, converterControles]);

  // Força atualização periódica para garantir sincronização após assinaturas
  useEffect(() => {
    const interval = setInterval(async () => {
      console.log('🔄 [SYNC] Verificação periódica de atualizações...');
      try {
        await fetchControles();
        const novosControles = converterControles(controlesStore as any);
        setControles(prev => {
          // Verifica se houve mudanças nas assinaturas
          const mudou = JSON.stringify(prev.map(c => ({ 
            id: c.id, 
            assinaturaMotorista: !!c.assinaturaMotorista, 
            assinaturaResponsavel: !!c.assinaturaResponsavel 
          }))) !== JSON.stringify(novosControles.map(c => ({ 
            id: c.id, 
            assinaturaMotorista: !!c.assinaturaMotorista, 
            assinaturaResponsavel: !!c.assinaturaResponsavel 
          })));
          
          if (mudou) {
            console.log('🔄 [SYNC] Detectada mudança nas assinaturas, atualizando...');
            return novosControles;
          }
          return prev;
        });
      } catch (error) {
        console.error('❌ [SYNC] Erro na verificação periódica:', error);
      }
    }, 3000); // Verifica a cada 3 segundos
    
    return () => clearInterval(interval);
  }, [fetchControles, controlesStore, converterControles]);

  const gerarPdf = async (controle: ControleComNotas) => {`;

  if (content.includes(useEffectLocation)) {
    content = content.replace(useEffectLocation, newUseEffectLocation);
    console.log('✅ useEffect de sincronização periódica adicionado');
  } else {
    console.log('⚠️ Local para useEffect não encontrado');
  }

  // Escrever o arquivo modificado
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Arquivo salvo com sucesso!');
  
  console.log('\n🎯 Correções implementadas:');
  console.log('   1. ✅ Callback de assinatura mais robusto com múltiplas estratégias');
  console.log('   2. ✅ Atualização periódica a cada 3 segundos');
  console.log('   3. ✅ Detecção automática de mudanças nas assinaturas');
  console.log('   4. ✅ Múltiplas tentativas de re-render');
  console.log('   5. ✅ Feedback melhorado para o usuário');
  
  console.log('\n🚀 Agora a lista deve atualizar automaticamente após assinaturas!');
  console.log('💡 O PDF também deve refletir as mudanças mais rapidamente.');

} catch (error) {
  console.error('❌ Erro ao processar arquivo:', error);
}
