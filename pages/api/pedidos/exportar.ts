import { NextApiRequest, NextApiResponse } from 'next';
import ExcelJS from 'exceljs';
import { apiExternaService } from '../../../services/api-externa';
import { format } from 'date-fns';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const { data_inicio, data_fim, tipo_data, search, status, tipo_entrega } = req.query;

    const username = process.env.API_EXTERNA_USERNAME;
    const password = process.env.API_EXTERNA_PASSWORD;

    if (!username || !password) {
      console.warn('[Exportar Pedidos] Credenciais da API externa não configuradas.');
      return res.status(200).json({ 
        message: 'Download indisponível: Credenciais da API externa não configuradas no .env',
        warning: true 
      });
    }

    const tipoData = typeof tipo_data === 'string' ? tipo_data.toLowerCase() : 'recebimento';

    // ===============================
    // 🔥 BUSCA COMPLETA PAGINADA
    // ===============================

    let offset = 0;
    const limit = 200;
    const todosPedidos: any[] = [];

    while (true) {
      const filtrosApi: any = {
        limit,
        offset,
        data_inicio,
        data_fim,
        tipo_data: tipoData
      };

      const resultado = await apiExternaService.listarPedidos(
        filtrosApi,
        username,
        password
      );

      const data = resultado?.data || [];
      if (data.length === 0) break;

      // Aplicar filtros locais se necessário (seguindo a lógica do externos.ts)
      const filtrados = data.filter((p: any) => {
        // Filtro de Busca
        if (search && typeof search === 'string') {
          const s = search.toLowerCase();
          const matches = [
            String(p.ORCAMENTO_ID || ''),
            String(p.CLIENTE_NOME || '').toLowerCase(),
            String(p.VENDEDOR_NOME || '').toLowerCase()
          ].some(v => v.includes(s));
          if (!matches) return false;
        }

        // Filtro de Status
        if (status === 'FECHADO' && p.PEDIDO_FECHADO !== 'S') return false;

        // Filtro de Tipo Entrega
        if (tipo_entrega && typeof tipo_entrega === 'string') {
          const tipos = tipo_entrega.split(',').map(t => t.trim().toUpperCase());
          if (!tipos.includes(String(p.TIPO_ENTREGA || '').toUpperCase())) return false;
        }

        return true;
      });

      todosPedidos.push(...filtrados);
      offset += limit;
      if (data.length < limit) break;
    }

    // ===============================
    // 📊 ESTATÍSTICA POR MÊS
    // ===============================

    const estatisticas: Record<string, { total: number; qtd: number }> = {};

    todosPedidos.forEach((p) => {
      let dataRefStr = null;
      if (tipoData === 'entrega') {
        dataRefStr = p.DATA_ENTREGA || p.data_entrega;
      } else {
        dataRefStr = p.DATA_HORA_RECEBIMENTO || p.data_hora_recebimento || p.DATA_RECEBIMENTO || p.data_recebimento;
      }

      if (!dataRefStr) return;

      const d = new Date(dataRefStr);
      if (isNaN(d.getTime())) return;

      const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const valor = Number(p.VALOR_PEDIDO || p.VALOR_TOTAL || 0) || 0;

      if (!estatisticas[chave]) {
        estatisticas[chave] = { total: 0, qtd: 0 };
      }
      estatisticas[chave].total += valor;
      estatisticas[chave].qtd += 1;
    });

    // ===============================
    // 📁 CRIAR EXCEL
    // ===============================

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema Controle de Carga';
    workbook.lastModifiedBy = 'Sistema';
    workbook.created = new Date();

    // Aba 1 - Pedidos
    const sheetPedidos = workbook.addWorksheet('Pedidos');

    sheetPedidos.columns = [
      { header: 'ID Pedido', key: 'pedido', width: 15 },
      { header: 'Data Ref', key: 'data', width: 20 },
      { header: 'Cliente', key: 'cliente', width: 40 },
      { header: 'Vendedor', key: 'vendedor', width: 30 },
      { header: 'Tipo Entrega', key: 'tipo', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Valor', key: 'valor', width: 15 }
    ];

    // Estilizar cabeçalho
    sheetPedidos.getRow(1).font = { bold: true };
    sheetPedidos.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    todosPedidos.forEach((p) => {
      let dataRef = null;
      if (tipoData === 'entrega') {
        dataRef = p.DATA_ENTREGA || p.data_entrega;
      } else {
        dataRef = p.DATA_HORA_RECEBIMENTO || p.data_hora_recebimento || p.DATA_RECEBIMENTO || p.data_recebimento;
      }

      sheetPedidos.addRow({
        pedido: p.ORCAMENTO_ID,
        data: dataRef ? format(new Date(dataRef), 'dd/MM/yyyy HH:mm') : '---',
        cliente: p.CLIENTE_NOME,
        vendedor: p.VENDEDOR_NOME,
        tipo: p.TIPO_ENTREGA,
        status: p.CANCELADO === 'S' ? 'CANCELADO' : (p.PEDIDO_FECHADO === 'S' ? 'FECHADO' : 'ABERTO'),
        valor: Number(p.VALOR_PEDIDO || p.VALOR_TOTAL || 0)
      });
    });

    // Formatar coluna de valor como moeda
    sheetPedidos.getColumn('valor').numFmt = '"R$" #,##0.00';

    // Aba 2 - Estatísticas
    const sheetEstatisticas = workbook.addWorksheet('Estatísticas por Mês');

    sheetEstatisticas.columns = [
      { header: 'Mês/Ano', key: 'mes', width: 20 },
      { header: 'Qtd Pedidos', key: 'qtd', width: 15 },
      { header: 'Valor Total', key: 'valor', width: 20 }
    ];

    sheetEstatisticas.getRow(1).font = { bold: true };
    sheetEstatisticas.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Ordenar estatísticas por data
    const mesesOrdenados = Object.keys(estatisticas).sort().reverse();

    mesesOrdenados.forEach((mes) => {
      sheetEstatisticas.addRow({
        mes,
        qtd: estatisticas[mes].qtd,
        valor: estatisticas[mes].total
      });
    });

    sheetEstatisticas.getColumn('valor').numFmt = '"R$" #,##0.00';

    // Configurar resposta para download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=pedidos_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('[Exportar Pedidos] Erro:', error);
    res.status(500).json({ message: 'Erro ao exportar pedidos' });
  }
}
