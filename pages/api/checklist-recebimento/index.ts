import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getTokenFromCookies, verifyToken } from '../../../lib/auth';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { optimizeImage } from '../../../lib/imageUtils';

const prisma = new PrismaClient();

// Configuração para upload de arquivos
export const config = {
  api: {
    bodyParser: false,
  },
};

// Função para salvar arquivo
const saveFile = async (file: formidable.File, folder: string): Promise<string> => {
  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder);
    
    // Criar diretório se não existir
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${Date.now()}-${file.originalFilename?.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(uploadDir, fileName);
    
    // Ler arquivo e otimizar imagem
    const data = fs.readFileSync(file.filepath);
    const optimizedBuffer = await optimizeImage(data);
    
    // Salvar arquivo otimizado
    fs.writeFileSync(filePath, optimizedBuffer);
    
    // Remover arquivo temporário
    fs.unlinkSync(file.filepath);
    
    return `/uploads/${folder}/${fileName}`;
  } catch (error) {
    console.error('Erro ao salvar arquivo:', error);
    throw new Error('Falha ao processar upload de arquivo');
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('📋 [Checklist] Iniciando handler de checklist');
  console.log('📋 [Checklist] Método:', req.method);

  // Verificar autenticação
  const token = getTokenFromCookies(req);
  if (!token) {
    console.log('❌ [Checklist] Token não fornecido');
    return res.status(401).json({ 
      error: 'Não autenticado',
      code: 'NO_TOKEN'
    });
  }

  const secret = process.env.JWT_SECRET || 'seu_segredo_secreto';
  const decoded = await verifyToken(token, secret);
  
  if (!decoded || !decoded.id) {
    console.log('❌ [Checklist] Token inválido');
    return res.status(401).json({ 
      error: 'Token inválido',
      code: 'INVALID_TOKEN'
    });
  }

  console.log('✅ [Checklist] Usuário autenticado:', decoded.id);

  switch (req.method) {
    case 'POST':
      return await createChecklist(req, res, decoded.id);
    case 'GET':
      return await getChecklists(req, res, decoded.id);
    default:
      return res.status(405).json({ error: 'Método não permitido' });
  }
}

async function createChecklist(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    console.log('📋 [Checklist] Criando novo checklist');

    // Parse do form data
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);

    // Função helper para obter valor do campo
    const getFieldValue = (fieldName: string): string => {
      const value = fields[fieldName];
      return Array.isArray(value) ? value[0] || '' : value || '';
    };

    // Função helper para obter valor booleano
    const getBooleanValue = (fieldName: string): boolean => {
      const value = getFieldValue(fieldName);
      return value === 'true';
    };

    // Função helper para obter valor numérico
    const getNumberValue = (fieldName: string): number => {
      const value = getFieldValue(fieldName);
      const parsed = parseInt(value);
      return isNaN(parsed) ? 0 : parsed;
    };

    // Processar uploads de fotos
    let fotoRecebimentoUrl: string | null = null;
    let fotoDevolucaoUrl: string | null = null;
    const fotosProdutos: string[] = [];

    if (files.fotoRecebimento) {
      const file = Array.isArray(files.fotoRecebimento) ? files.fotoRecebimento[0] : files.fotoRecebimento;
      fotoRecebimentoUrl = await saveFile(file, 'checklist-recebimento');
      console.log('📸 [Checklist] Foto de recebimento salva:', fotoRecebimentoUrl);
    }

    if (files.fotoDevolucao) {
      const file = Array.isArray(files.fotoDevolucao) ? files.fotoDevolucao[0] : files.fotoDevolucao;
      fotoDevolucaoUrl = await saveFile(file, 'checklist-devolucao');
      console.log('📸 [Checklist] Foto de devolução salva:', fotoDevolucaoUrl);
    }

    // Processar fotos dos produtos
    for (const [key, file] of Object.entries(files)) {
      if (key.startsWith('fotoProduto_') && file) {
        const fileObj = Array.isArray(file) ? file[0] : file;
        if (fileObj) {
          const fotoUrl = await saveFile(fileObj, 'checklist-produtos');
          fotosProdutos.push(fotoUrl);
          console.log('📸 [Checklist] Foto de produto salva:', fotoUrl);
        }
      }
    }

    console.log('📸 [Checklist] Total de fotos de produtos:', fotosProdutos.length);

    // Debug: Log dos campos recebidos
    console.log('📋 [Checklist] Campos recebidos:');
    console.log('- dataRecebimento:', getFieldValue('dataRecebimento'));
    console.log('- horarioRecebimento:', getFieldValue('horarioRecebimento'));
    console.log('- nomeConferente:', getFieldValue('nomeConferente'));
    console.log('- produtos:', getFieldValue('produtos'));
    console.log('- condicaoEmbalagens:', getFieldValue('condicaoEmbalagens'));
    console.log('- alertaValidadeAutorizado:', getBooleanValue('alertaValidadeAutorizado'));
    console.log('- nomeAutorizadorLider:', getFieldValue('nomeAutorizadorLider'));
    console.log('- produtosComAlertaValidade:', getFieldValue('produtosComAlertaValidade'));

    // Validações básicas
    const requiredBasicFields = ['dataRecebimento', 'horarioRecebimento', 'nomeConferente'];
    const missingBasicFields = requiredBasicFields.filter(field => !getFieldValue(field));
    
    if (missingBasicFields.length > 0) {
      console.log('❌ [Checklist] Campos básicos faltando:', missingBasicFields);
      return res.status(400).json({
        error: 'Campos básicos obrigatórios faltando',
        missingFields: missingBasicFields
      });
    }

    // Validar data de recebimento
    const dataRecebimento = new Date(getFieldValue('dataRecebimento'));
    if (isNaN(dataRecebimento.getTime())) {
      return res.status(400).json({
        error: 'Data de recebimento inválida'
      });
    }

    // Validar condição das embalagens
    const condicaoEmbalagens = getFieldValue('condicaoEmbalagens');
    console.log('🔍 [Checklist] Condição das embalagens recebida:', condicaoEmbalagens);
    
    if (!condicaoEmbalagens || !['OTIMA', 'BOA', 'RUIM'].includes(condicaoEmbalagens)) {
      console.log('❌ [Checklist] Condição das embalagens inválida:', condicaoEmbalagens);
      return res.status(400).json({
        error: 'Condição das embalagens deve ser informada (OTIMA, BOA ou RUIM)',
        received: condicaoEmbalagens
      });
    }

    // Processar produtos (novo formato com múltiplos produtos)
    let produtos = [];
    try {
      const produtosJson = getFieldValue('produtos');
      if (produtosJson) {
        produtos = JSON.parse(produtosJson);
      }
    } catch (error) {
      console.error('Erro ao processar produtos:', error);
      // Fallback para formato antigo (um produto só)
      produtos = [{
        nomeFabricante: getFieldValue('nomeFabricante') || '',
        descricaoProduto: getFieldValue('descricaoProduto') || '',
        numeroLote: getFieldValue('numeroLote') || '',
        dataFabricacao: getFieldValue('dataFabricacao') || '',
        dataVencimento: getFieldValue('dataVencimento') || '',
        admProduto: getFieldValue('admProduto') || '',
        codigoBarrasCaixaMaster: getFieldValue('codigoBarrasCaixaMaster') || '',
        codigoBarrasCaixaInterna: getFieldValue('codigoBarrasCaixaInterna') || '',
        codigoBarrasItem: getFieldValue('codigoBarrasItem') || ''
      }];
    }

    // Validar se há pelo menos um produto
    if (!produtos || produtos.length === 0) {
      return res.status(400).json({
        error: 'Pelo menos um produto deve ser informado'
      });
    }

    // Validar campos obrigatórios dos produtos
    const produtoInvalido = produtos.find((produto: any) => 
      !produto.nomeFabricante || !produto.descricaoProduto || !produto.numeroLote
    );

    if (produtoInvalido) {
      return res.status(400).json({
        error: 'Todos os produtos devem ter fabricante, descrição e número do lote preenchidos'
      });
    }

    // Criar um checklist para cada produto (ou um checklist com dados do primeiro produto)
    const primeiroProduto = produtos[0] || {};
    const checklistId = `checklist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Converter datas dos produtos
    const dataFabricacaoProduto = primeiroProduto.dataFabricacao ? new Date(primeiroProduto.dataFabricacao) : new Date();
    const dataVencimentoProduto = primeiroProduto.dataVencimento ? new Date(primeiroProduto.dataVencimento) : new Date();
    
    // Processar dados de alerta de validade
    const alertaValidadeAutorizado = getBooleanValue('alertaValidadeAutorizado');
    const nomeAutorizadorLider = getFieldValue('nomeAutorizadorLider') || null;
    const produtosComAlertaValidade = getFieldValue('produtosComAlertaValidade') || null;
    
    console.log('⚠️ [Checklist] Alerta de validade:', {
      autorizado: alertaValidadeAutorizado,
      autorizador: nomeAutorizadorLider,
      produtos: produtosComAlertaValidade
    });

    await prisma.$executeRaw`
      INSERT INTO "ChecklistRecebimento" (
        id, "dataCriacao", "dataRecebimento", "horarioRecebimento", 
        "nomeConferente", "nomeFabricante", "descricaoProduto", 
        "numeroLote", "dataFabricacao", "dataVencimento",
        "fotoRecebimento", "fotoDevolucao",
        "admProduto", "codigoBarrasCaixaMaster", "codigoBarrasCaixaInterna", "codigoBarrasItem",
        "recebimentoPocket", "motivoNaoPocket", "possuiCodigoBarras", 
        "solicitouCadastroCodigoBarras", "paraQuemSolicitou", "dadosLoteCadastradosSantri",
        "condicaoEmbalagens", "houveRessalva", "descricaoRessalva", "paraQuemInformouRessalva",
        "houveDevolucao", "itensDevolvidos", "quantidadeDevolvida", "fotoTiradaDevolucao",
        "notaDevolucaoEmitida", "numeroNotaDevolucao", "criadoPor",
        "alertaValidadeAutorizado", "nomeAutorizadorLider", "produtosComAlertaValidade"
      ) VALUES (
        ${checklistId}, NOW(), ${dataRecebimento}, ${getFieldValue('horarioRecebimento')},
        ${getFieldValue('nomeConferente')}, ${primeiroProduto.nomeFabricante || ''}, ${primeiroProduto.descricaoProduto || ''},
        ${primeiroProduto.numeroLote || ''}, ${dataFabricacaoProduto}, ${dataVencimentoProduto},
        ${fotoRecebimentoUrl}, ${fotoDevolucaoUrl},
        ${primeiroProduto.admProduto || null}, ${primeiroProduto.codigoBarrasCaixaMaster || null}, 
        ${primeiroProduto.codigoBarrasCaixaInterna || null}, ${primeiroProduto.codigoBarrasItem || null},
        ${getBooleanValue('recebimentoPocket')}, ${getFieldValue('motivoNaoPocket') || null}, ${getBooleanValue('possuiCodigoBarras')},
        ${getBooleanValue('solicitouCadastroCodigoBarras')}, ${getFieldValue('paraQuemSolicitou') || null}, ${getBooleanValue('dadosLoteCadastradosSantri')},
        ${condicaoEmbalagens}::"CondicaoEmbalagem", ${getBooleanValue('houveRessalva')}, ${getFieldValue('descricaoRessalva') || null}, ${getFieldValue('paraQuemInformouRessalva') || null},
        ${getBooleanValue('houveDevolucao')}, ${getFieldValue('itensDevolvidos') || null}, ${getNumberValue('quantidadeDevolvida')}, ${getBooleanValue('fotoTiradaDevolucao')},
        ${getBooleanValue('notaDevolucaoEmitida')}, ${getFieldValue('numeroNotaDevolucao') || null}, ${userId},
        ${alertaValidadeAutorizado}, ${nomeAutorizadorLider}, ${produtosComAlertaValidade}
      )
    `;
    
    console.log('✅ [Checklist] Checklist criado com dados de validação registrados');
    if (alertaValidadeAutorizado && nomeAutorizadorLider) {
      console.log('📝 [Checklist] ALERTA DE VALIDADE SALVO NO BANCO:');
      console.log('📝 [Checklist] Checklist ID:', checklistId);
      console.log('📝 [Checklist] Autorizado por:', nomeAutorizadorLider);
      console.log('📝 [Checklist] Produtos com problema:', produtosComAlertaValidade);
    }

    // Se houver múltiplos produtos, salvar informações adicionais em campo JSON (futuro)
    if (produtos.length > 1) {
      console.log(`📦 [Checklist] ${produtos.length} produtos recebidos no checklist ${checklistId}`);
      // TODO: Implementar tabela separada para produtos ou campo JSON
    }

    const checklist = {
      id: checklistId,
      success: true
    };

    console.log(' [Checklist] Checklist criado com sucesso:', checklist.id);

    return res.status(201).json({
      success: true,
      checklist
    });

  } catch (error) {
    console.error('❌ [Checklist] Erro ao criar checklist:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function getChecklists(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    console.log('📋 [Checklist] Buscando checklists');

    const { page = '1', limit = '10', conferente, fabricante, dataInicio, dataFim, alertaValidade, autorizador, getFilters } = req.query;

    // Se solicitado apenas as listas para filtros
    if (getFilters === 'true') {
      const conferentes = await prisma.checklistRecebimento.findMany({
        select: { nomeConferente: true },
        distinct: ['nomeConferente'],
        orderBy: { nomeConferente: 'asc' }
      });

      const fabricantes = await prisma.checklistRecebimento.findMany({
        select: { nomeFabricante: true },
        distinct: ['nomeFabricante'],
        orderBy: { nomeFabricante: 'asc' }
      });

      return res.status(200).json({
        success: true,
        conferentes: conferentes.map(c => c.nomeConferente).filter(Boolean),
        fabricantes: fabricantes.map(f => f.nomeFabricante).filter(Boolean)
      });
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Construir filtros
    const where: any = {};

    if (conferente) {
      where.nomeConferente = {
        contains: conferente as string,
        mode: 'insensitive'
      };
    }

    if (fabricante) {
      where.nomeFabricante = {
        contains: fabricante as string,
        mode: 'insensitive'
      };
    }

    if (dataInicio || dataFim) {
      where.dataRecebimento = {};
      if (dataInicio) {
        where.dataRecebimento.gte = new Date(dataInicio as string);
      }
      if (dataFim) {
        where.dataRecebimento.lte = new Date(dataFim as string);
      }
    }

    // Filtros específicos para alertas de validade
    if (alertaValidade === 'true') {
      where.alertaValidadeAutorizado = true;
    }

    if (autorizador) {
      where.nomeAutorizadorLider = {
        contains: autorizador as string,
        mode: 'insensitive'
      };
    }

    // Construir WHERE clause dinamicamente
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (conferente) {
      whereClause += ` AND c."nomeConferente" ILIKE $${paramIndex}`;
      params.push(`%${conferente}%`);
      paramIndex++;
    }

    if (fabricante) {
      whereClause += ` AND c."nomeFabricante" ILIKE $${paramIndex}`;
      params.push(`%${fabricante}%`);
      paramIndex++;
    }

    if (dataInicio) {
      whereClause += ` AND c."dataRecebimento" >= $${paramIndex}`;
      params.push(new Date(dataInicio as string));
      paramIndex++;
    }

    if (dataFim) {
      whereClause += ` AND c."dataRecebimento" <= $${paramIndex}`;
      params.push(new Date(dataFim as string));
      paramIndex++;
    }

    if (alertaValidade === 'true') {
      whereClause += ` AND c."alertaValidadeAutorizado" = true`;
    }

    if (autorizador) {
      whereClause += ` AND c."nomeAutorizadorLider" ILIKE $${paramIndex}`;
      params.push(`%${autorizador}%`);
      paramIndex++;
    }

    // Buscar checklists usando query raw com filtros
    const checklists = await prisma.$queryRawUnsafe(`
      SELECT 
        c.*,
        u.nome as "criadoPorNome",
        u.email as "criadoPorEmail"
      FROM "ChecklistRecebimento" c
      LEFT JOIN "Usuario" u ON c."criadoPor" = u.id
      ${whereClause}
      ORDER BY c."dataCriacao" DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, ...params, limitNum, skip);
    
    const totalResult = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count 
      FROM "ChecklistRecebimento" c
      ${whereClause}
    `, ...params); // Usar todos os parâmetros de filtro
    
    const total = Number((totalResult as any)[0]?.count || 0);
    const checklistsArray = checklists as any[];

    console.log(`✅ [Checklist] ${checklistsArray.length} checklists encontrados`);

    return res.status(200).json({
      success: true,
      checklists,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('❌ [Checklist] Erro ao buscar checklists:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  } finally {
    await prisma.$disconnect();
  }
}
