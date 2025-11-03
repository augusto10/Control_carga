'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';

export function PrinterSelect({ volumeId, onPrint }) {
  const [impressoras, setImpressoras] = useState([]);
  const [selecionada, setSelecionada] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Carregar lista de impressoras
  useEffect(() => {
    async function carregarImpressoras() {
      try {
        const response = await fetch('/api/impressoras');
        const data = await response.json();
        setImpressoras(data);
        
        // Selecionar primeira impressora por padrão
        if (data.length > 0) {
          setSelecionada(data[0]);
        }
      } catch (error) {
        console.error('Erro ao carregar impressoras:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar a lista de impressoras",
          variant: "destructive"
        });
      }
    }
    
    carregarImpressoras();
  }, []);
  
  // Função para imprimir
  async function handlePrint() {
    if (!selecionada) {
      toast({
        title: "Aviso",
        description: "Selecione uma impressora primeiro",
        variant: "warning"
      });
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/impressoras/imprimir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          volumeId,
          impressora: selecionada
        })
      });
      
      if (!response.ok) {
        throw new Error('Erro ao imprimir');
      }
      
      toast({
        title: "Sucesso",
        description: "Etiqueta enviada para impressão"
      });
      
      if (onPrint) onPrint();
      
    } catch (error) {
      console.error('Erro ao imprimir:', error);
      toast({
        title: "Erro",
        description: "Não foi possível imprimir a etiqueta",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div className="space-y-4">
      {/* Preview da etiqueta */}
      <div className="border rounded p-4">
        <iframe
          src={`/api/impressoras/preview/${volumeId}`}
          className="w-full h-[432px]"
          title="Preview da etiqueta"
        />
      </div>
      
      {/* Seleção de impressora e botão */}
      <div className="flex gap-2 items-center">
        <Select
          value={selecionada}
          onChange={e => setSelecionada(e.target.value)}
          disabled={loading}
        >
          <option value="">Selecione uma impressora</option>
          {impressoras.map(imp => (
            <option key={imp} value={imp}>
              {imp}
            </option>
          ))}
        </Select>
        
        <Button
          onClick={handlePrint}
          disabled={!selecionada || loading}
          loading={loading}
        >
          Imprimir
        </Button>
      </div>
    </div>
  );
}