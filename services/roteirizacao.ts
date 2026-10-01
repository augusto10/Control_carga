import { NotaFiscalExterna } from './api-externa';

interface Endereco {
  rua: string;
  numero?: string;
  bairro?: string;
  cidade: string;
  estado: string;
  cep?: string;
}

interface Rota {
  id: string;
  nome: string;
  enderecoBase: string;
  cidade: string;
  estado: string;
  notas: NotaFiscalExterna[];
  box?: string;
  distanciaTotal?: number;
  ordemEntrega?: number;
}

interface Box {
  id: string;
  rotaId: string;
  rotaNome: string;
  numero: string;
  notas: NotaFiscalExterna[];
  capacidade: number;
  pesoTotal?: number;
  volumeTotal?: number;
}

class RoteirizacaoService {
  private static gerarIdRota(endereco: string): string {
    const normalized = endereco
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 20);
    return `rota_${normalized}_${Date.now()}`;
  }

  private static gerarIdBox(rotaId: string, numero: number): string {
    return `box_${rotaId}_${numero}`;
  }

  private static normalizarEndereco(endereco?: string): string {
    if (!endereco) return '';
    
    return endereco
      .toLowerCase()
      .replace(/[áàâãä]/g, 'a')
      .replace(/[éèêë]/g, 'e')
      .replace(/[íìîï]/g, 'i')
      .replace(/[óòôõö]/g, 'o')
      .replace(/[úùûü]/g, 'u')
      .replace(/[^a-z0-9\s]/g, '')
      .trim();
  }

  private static agruparPorCidade(notas: NotaFiscalExterna[]): Map<string, NotaFiscalExterna[]> {
    const agrupadas = new Map<string, NotaFiscalExterna[]>();

    notas.forEach(nota => {
      const cidade = nota.cliente?.cidade || 'Não informada';
      
      if (!agrupadas.has(cidade)) {
        agrupadas.set(cidade, []);
      }
      
      agrupadas.get(cidade)!.push(nota);
    });

    return agrupadas;
  }

  private static agruparPorBairro(notas: NotaFiscalExterna[]): Map<string, NotaFiscalExterna[]> {
    const agrupadas = new Map<string, NotaFiscalExterna[]>();

    notas.forEach(nota => {
      const bairro = nota.cliente?.bairro || 'Não informado';
      
      if (!agrupadas.has(bairro)) {
        agrupadas.set(bairro, []);
      }
      
      agrupadas.get(bairro)!.push(nota);
    });

    return agrupadas;
  }

  private static agruparPorLogradouro(notas: NotaFiscalExterna[]): Map<string, NotaFiscalExterna[]> {
    const agrupadas = new Map<string, NotaFiscalExterna[]>();

    notas.forEach(nota => {
      const endereco = this.normalizarEndereco(nota.cliente?.endereco);
      const logradouro = endereco.split(' ')[0] || 'Não informado';
      
      if (!agrupadas.has(logradouro)) {
        agrupadas.set(logradouro, []);
      }
      
      agrupadas.get(logradouro)!.push(nota);
    });

    return agrupadas;
  }

  static criarRotas(notas: NotaFiscalExterna[], estrategia: 'cidade' | 'bairro' | 'logradouro' = 'cidade'): Rota[] {
    const rotas: Rota[] = [];
    let agrupadas: Map<string, NotaFiscalExterna[]>;

    switch (estrategia) {
      case 'cidade':
        agrupadas = this.agruparPorCidade(notas);
        break;
      case 'bairro':
        agrupadas = this.agruparPorBairro(notas);
        break;
      case 'logradouro':
        agrupadas = this.agruparPorLogradouro(notas);
        break;
      default:
        agrupadas = this.agruparPorCidade(notas);
    }

    let ordem = 1;
    agrupadas.forEach((notasGrupo, chave) => {
      if (notasGrupo.length > 0) {
        const primeiraNota = notasGrupo[0];
        const rota: Rota = {
          id: this.gerarIdRota(chave),
          nome: `Rota ${chave}`,
          enderecoBase: primeiraNota.cliente?.endereco || chave,
          cidade: primeiraNota.cliente?.cidade || chave,
          estado: primeiraNota.cliente?.estado || 'N/A',
          notas: notasGrupo,
          ordemEntrega: ordem++
        };

        rotas.push(rota);
      }
    });

    console.log(`[Roteirização] Criadas ${rotas.length} rotas usando estratégia: ${estrategia}`);
    return rotas;
  }

  static criarBoxes(rotas: Rota[], capacidadeMaxima: number = 10): Box[] {
    const boxes: Box[] = [];

    rotas.forEach(rota => {
      if (rota.notas.length === 0) return;

      const numeroBoxes = Math.ceil(rota.notas.length / capacidadeMaxima);
      
      for (let i = 0; i < numeroBoxes; i++) {
        const inicio = i * capacidadeMaxima;
        const fim = Math.min(inicio + capacidadeMaxima, rota.notas.length);
        const notasBox = rota.notas.slice(inicio, fim);

        const box: Box = {
          id: this.gerarIdBox(rota.id, i + 1),
          rotaId: rota.id,
          rotaNome: rota.nome,
          numero: `${i + 1}`,
          notas: notasBox,
          capacidade: capacidadeMaxima,
          pesoTotal: notasBox.reduce((total, nota) => total + (nota.peso || 0), 0),
          volumeTotal: notasBox.reduce((total, nota) => total + (nota.volumes || 0), 0)
        };

        boxes.push(box);
      }
    });

    console.log(`[Roteirização] Criados ${boxes.length} boxes para ${rotas.length} rotas`);
    return boxes;
  }

  static otimizarRotas(rotas: Rota[]): Rota[] {
    // Implementação simples de ordenação por proximidade geográfica
    // Em uma implementação real, usaríamos APIs como Google Maps ou algoritmos mais complexos
    
    return rotas.map(rota => {
      // Ordenar notas por endereço para otimizar o percurso
      const notasOrdenadas = [...rota.notas].sort((a, b) => {
        const enderecoA = this.normalizarEndereco(a.cliente?.endereco);
        const enderecoB = this.normalizarEndereco(b.cliente?.endereco);
        
        return enderecoA.localeCompare(enderecoB);
      });

      return {
        ...rota,
        notas: notasOrdenadas
      };
    });
  }

  static gerarRelatorio(rotas: Rota[], boxes: Box[]): string {
    let relatorio = '=== RELATÓRIO DE ROTEIRIZAÇÃO ===\n\n';
    
    relatorio += `Total de Rotas: ${rotas.length}\n`;
    relatorio += `Total de Boxes: ${boxes.length}\n`;
    relatorio += `Total de Notas: ${rotas.reduce((total, rota) => total + rota.notas.length, 0)}\n\n`;

    rotas.forEach((rota, index) => {
      relatorio += `--- Rota ${index + 1}: ${rota.nome} ---\n`;
      relatorio += `Cidade: ${rota.cidade}/${rota.estado}\n`;
      relatorio += `Notas: ${rota.notas.length}\n`;
      
      const boxesRota = boxes.filter(box => box.rotaId === rota.id);
      relatorio += `Boxes: ${boxesRota.length}\n`;
      
      boxesRota.forEach(box => {
        relatorio += `  - Box ${box.numero}: ${box.notas.length} notas, ${box.pesoTotal || 0}kg, ${box.volumeTotal || 0} volumes\n`;
      });
      
      relatorio += '\n';
    });

    return relatorio;
  }
}

export { RoteirizacaoService };
export type { Rota, Box, Endereco };
