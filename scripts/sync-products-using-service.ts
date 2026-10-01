// Script para sincronizar produtos usando HTTP direto com autenticação
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const username = process.env.API_EXTERNA_USERNAME || '';
const password = process.env.API_EXTERNA_PASSWORD || '';
const baseUrl = process.env.API_EXTERNA_BASE_URL || 'http://ec2-15-229-152-29.sa-east-1.compute.amazonaws.com';

if (!username || !password) {
  console.error('❌ Configure API_EXTERNA_USERNAME e API_EXTERNA_PASSWORD');
  process.exit(1);
}

async function getAccessToken() {
  try {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    params.append('grant_type', 'password');

    const response = await axios.post(`${baseUrl}/token`, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return response.data.access_token || response.data.token;
  } catch (error: any) {
    console.error('❌ Erro ao obter token:', error.response?.data || error.message);
    throw error;
  }
}

async function syncProducts() {
  try {
    console.log('🔄 Iniciando sincronização de produtos...');
    console.log(`📡 Usando credenciais: ${username}`);
    console.log(`🌐 URL base: ${baseUrl}`);

    // Obter token de acesso
    const token = await getAccessToken();
    console.log('✅ Token obtido com sucesso');

    // Buscar produtos da API
    const response = await axios.get(`${baseUrl}/api/v1/produtos/completos`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        limit: 5000,
        offset: 0
      },
      timeout: 60000
    });

    const produtos = response.data;
    if (!Array.isArray(produtos)) {
      console.error('❌ Resposta da API não é um array');
      process.exit(1);
    }

    console.log(`✅ ${produtos.length} produtos obtidos da API`);

    // Atualizar o arquivo products-maxima.json
    const dataFile = path.join(process.cwd(), 'src', 'data', 'products-maxima.json');
    const now = new Date().toISOString();

    // Converter para o formato esperado pelo catálogo
    const catalogProducts = produtos.map((produto: any) => ({
      id: String(produto.PRODUTO_ID || produto.id),
      slug: String(produto.PRODUTO_ID || produto.id),
      codigoAdm: String(produto.CODIGO_ADM || produto.codigoAdm || produto.PRODUTO_ID),
      nomeVenda: produto.NOME_VENDA || produto.nome || produto.NOME,
      unidadeVenda: produto.UNIDADE_VENDA || produto.unidade || 'UN',
      multiploVenda: produto.MULTIPLO_VENDA || produto.multiplo || 1,
      quantidadeCaixa: produto.QUANTIDADE_CAIXA || produto.quantidadeCaixa || null,
      codigoBarrasCaixaFechada: produto.CODIGO_BARRAS_CAIXA_FECHADA || produto.codigoBarrasCaixaFechada || null,
      marca: produto.MARCA || produto.marca || '',
      codigoOriginal: produto.CODIGO_ORIGINAL || produto.codigoOriginal || '',
      codigoBarras: produto.CODIGO_BARRAS || produto.codigoBarras || '',
      grupo: produto.GRUPO || produto.grupo || '',
      subgrupo: produto.SUBGRUPO || produto.subgrupo || null,
      caracteristicas: produto.CARACTERISTICAS || produto.caracteristicas || '',
      imagens: produto.IMAGENS || produto.imagens || [],
      imagemPrincipal: produto.IMAGEM_PRINCIPAL || produto.imagemPrincipal || '',
      ativo: produto.ATIVO !== 'N' && produto.ATIVO !== false,
      updatedAt: produto.DATA_HORA_ALTERACAO || produto.DATA_ATUALIZACAO || now,
    }));

    fs.writeFileSync(dataFile, JSON.stringify(catalogProducts, null, 2));
    console.log(`✅ Arquivo atualizado: ${dataFile}`);
    console.log(`📦 Total de produtos salvos: ${catalogProducts.length}`);
    console.log(`🕐 Data de atualização: ${new Date(now).toLocaleString('pt-BR')}`);

  } catch (error: any) {
    console.error('❌ Erro na sincronização:', error.response?.data || error.message);
    process.exit(1);
  }
}

syncProducts();