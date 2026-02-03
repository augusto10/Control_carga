import { NextApiRequest, NextApiResponse } from 'next';
import { apiExternaService } from '../../services/api-externa';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const { numero, serie, chave } = req.query;

    if ((!numero && !chave) || (numero && !serie && !chave)) {
      return res.status(400).json({ 
        message: 'Parâmetros obrigatórios: (numero e serie) ou chave' 
      });
    }

    const username = process.env.API_EXTERNA_USERNAME || 'admin';
    const password = process.env.API_EXTERNA_PASSWORD || 'password';
    const bearerToken = process.env.API_EXTERNA_BEARER_TOKEN || process.env.EXTERNAL_API_BEARER_TOKEN || '';

    let notaExterna = null;

    if (chave && typeof chave === 'string') {
      // Tenta via serviço autenticado
      notaExterna = await apiExternaService.buscarNotaFiscalPorChave(
        chave,
        username,
        password
      );
      // Fallback: chamada direta com Bearer se disponível
      if (!notaExterna && bearerToken) {
        try {
          const url = `http://ec2-15-229-152-29.sa-east-1.compute.amazonaws.com/api/v1/notas-fiscais/identificacao-nfe/${chave}`;
          const resp = await fetch(url, {
            headers: {
              accept: 'application/json',
              Authorization: `Bearer ${bearerToken}`
            }
          });
          if (resp.ok) {
            notaExterna = await resp.json();
          }
        } catch (e) {
          // ignora e segue
        }
      }
    } else if (numero && typeof numero === 'string') {
      // Se a série não for informada, assume '1'
      const serieStr = typeof serie === 'string' ? serie : '1';
      
      notaExterna = await apiExternaService.buscarNotaFiscalPorNumeroSerie(
        numero,
        serieStr,
        username,
        password
      );
      // Fallback: se não encontrar, tenta identificação-nfe com número como chave
      if (!notaExterna && bearerToken) {
        try {
          const url = `http://ec2-15-229-152-29.sa-east-1.compute.amazonaws.com/api/v1/notas-fiscais/identificacao-nfe/${numero}`;
          const resp = await fetch(url, {
            headers: {
              accept: 'application/json',
              Authorization: `Bearer ${bearerToken}`
            }
          });
          if (resp.ok) {
            notaExterna = await resp.json();
          }
        } catch (e) {
          // ignora e segue
        }
      }
    }

    // Fallback adicional: busca na lista quando não encontrado pelos endpoints diretos
    if (!notaExterna && bearerToken) {
      try {
        const listUrl = `http://ec2-15-229-152-29.sa-east-1.compute.amazonaws.com/api/v1/notas-fiscais?limit=100`;
        const respList = await fetch(listUrl, {
          headers: {
            accept: 'application/json',
            Authorization: `Bearer ${bearerToken}`
          }
        });
        if (respList.ok) {
          const json: any = await respList.json();
          const arr = json?.data || [];
          if (chave && typeof chave === 'string') {
            notaExterna = arr.find((n: any) => 
              n?.CHAVE_NFE?.toString?.() === chave || n?.CHAVE_NFE?.toString?.().includes(chave)
            ) || null;
          } else if (numero && typeof numero === 'string') {
            const serieStr = typeof serie === 'string' ? serie : '1';
            notaExterna = arr.find((n: any) => 
              (n?.NUMERO?.toString?.() === numero && n?.SERIE?.toString?.() === serieStr) ||
              n?.IDENTIFICACAO_NFE?.toString?.() === numero
            ) || null;
          }
        }
      } catch (e) {
        // silencioso
      }
    }

    if (!notaExterna) {
      return res.status(404).json({ 
        message: 'Nota fiscal não encontrada na API externa' 
      });
    }

    const num = (x: any) => {
      if (x === null || x === undefined) return undefined;
      let s = String(x).trim().replace(/R\$\s*/g, '');
      if (s === '') return undefined;
      const hasComma = s.includes(',');
      if (hasComma) {
        s = s.replace(/\./g, '').replace(',', '.');
      }
      const n = Number(s);
      return isNaN(n) ? undefined : n;
    };
    const pick = (...vals: any[]) => {
      for (const v of vals) {
        if (v !== undefined && v !== null && String(v).trim() !== '') return v;
      }
      return undefined;
    };
    const valorCand = pick(
      (notaExterna as any).valor,
      (notaExterna as any).VALOR_TOTAL,
      (notaExterna as any).VALOR_TOTAL_NOTA,
      (notaExterna as any).valor_total,
      (notaExterna as any).TOTAL,
      (notaExterna as any).VALOR
    );
    const valorPedidoCand = pick(
      (notaExterna as any).valorPedido,
      (notaExterna as any).VALOR_TOTAL,
      (notaExterna as any).VALOR_TOTAL_NOTA,
      (notaExterna as any).valor
    );
    const pesoCand = pick(
      (notaExterna as any).TOTAL_PESO,
      (notaExterna as any).PESO_TOTAL,
      (notaExterna as any).PESO_NOTA,
      (notaExterna as any).pesoBruto,
      (notaExterna as any).PESO_BRUTO,
      (notaExterna as any).PESO,
      (notaExterna as any).peso,
      (notaExterna as any).PESO_LIQUIDO,
      (notaExterna as any).peso_liquido
    );
    const cnpjCand = pick(
      (notaExterna as any).cnpj,
      (notaExterna as any).CNPJ,
      (notaExterna as any).CNPJ_CPF,
      (notaExterna as any).CPF_CNPJ,
      (notaExterna as any).cliente?.cnpj,
      (notaExterna as any).emitente?.cnpj,
      (notaExterna as any).destinatario?.cnpj
    );
    const cnpjDigits = cnpjCand ? String(cnpjCand).replace(/\D/g, '') : '';
    const cnpjOut = cnpjDigits.length === 14 ? cnpjDigits : (cnpjCand ?? '');
    const dataEmissaoCand = pick(
      (notaExterna as any).dataEmissao,
      (notaExterna as any).DATA_EMISSAO,
      (notaExterna as any).emissao,
      (notaExterna as any).DATA
    );
    const resposta = {
      ...notaExterna,
      volumes:
        (notaExterna as any).volumes?.toString?.() ||
        (notaExterna as any).VOLUMES?.toString?.() ||
        '1',
      cliente:
        (notaExterna as any).cliente?.nome ||
        (notaExterna as any).NOME_RAZAO_SOCIAL ||
        '',
      endereco:
        (notaExterna as any).cliente?.endereco ||
        (notaExterna as any).ENDERECO ||
        '',
      cidade:
        (notaExterna as any).cliente?.cidade ||
        (notaExterna as any).CIDADE ||
        '',
      estado:
        (notaExterna as any).cliente?.estado ||
        (notaExterna as any).UF ||
        '',
      cep:
        (notaExterna as any).cliente?.cep ||
        (notaExterna as any).CEP ||
        '',
      bairro:
        (notaExterna as any).cliente?.bairro ||
        (notaExterna as any).BAIRRO ||
        '',
      valor: num(valorCand),
      valorPedido: num(valorPedidoCand),
      razaoSocial:
        (notaExterna as any).razaoSocial ??
        (notaExterna as any).NOME_RAZAO_SOCIAL ??
        (notaExterna as any).cliente?.nome ??
        (notaExterna as any).emitente?.razaoSocial ??
        (notaExterna as any).destinatario?.razaoSocial ??
        '',
      pesoBruto: num(pesoCand),
      dataEmissao: dataEmissaoCand ?? null,
      cnpj: cnpjOut || ''
    };

    res.status(200).json(resposta);
  } catch (error: any) {
    console.error('[API Nota Externa] Erro:', error.message);
    res.status(500).json({ 
      message: 'Erro ao buscar nota fiscal na API externa',
      error: error.message 
    });
  }
}
