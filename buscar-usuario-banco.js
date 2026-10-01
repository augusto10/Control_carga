// Função para buscar usuário no banco de dados
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

/**
 * Busca usuário por email
 * @param {string} email - Email do usuário a buscar
 * @returns {Promise<Object|null>} - Dados do usuário ou null
 */
async function buscarUsuarioPorEmail(email) {
  try {
    console.log(`🔍 Buscando usuário com email: ${email}`);
    
    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
        ativo: true,
        dataCriacao: true,
        ultimoAcesso: true,
        foto: true
        // Não inclui a senha por segurança
      }
    });
    
    if (usuario) {
      console.log('✅ Usuário encontrado:', {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipo,
        ativo: usuario.ativo,
        dataCriacao: usuario.dataCriacao,
        ultimoAcesso: usuario.ultimoAcesso,
        possuiFoto: !!usuario.foto
      });
      return usuario;
    } else {
      console.log('❌ Usuário não encontrado');
      return null;
    }
    
  } catch (error) {
    console.error('❌ Erro ao buscar usuário:', error);
    throw error;
  }
}

/**
 * Busca usuário por ID
 * @param {string} id - ID do usuário a buscar
 * @returns {Promise<Object|null>} - Dados do usuário ou null
 */
async function buscarUsuarioPorId(id) {
  try {
    console.log(`🔍 Buscando usuário com ID: ${id}`);
    
    const usuario = await prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
        ativo: true,
        dataCriacao: true,
        ultimoAcesso: true,
        foto: true
      }
    });
    
    if (usuario) {
      console.log('✅ Usuário encontrado:', {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipo,
        ativo: usuario.ativo
      });
      return usuario;
    } else {
      console.log('❌ Usuário não encontrado');
      return null;
    }
    
  } catch (error) {
    console.error('❌ Erro ao buscar usuário:', error);
    throw error;
  }
}

/**
 * Busca usuário por nome (busca parcial)
 * @param {string} nome - Nome ou parte do nome do usuário
 * @returns {Promise<Array>} - Array com usuários encontrados
 */
async function buscarUsuarioPorNome(nome) {
  try {
    console.log(`🔍 Buscando usuários com nome contendo: "${nome}"`);
    
    const usuarios = await prisma.usuario.findMany({
      where: {
        nome: {
          contains: nome,
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
        ativo: true,
        dataCriacao: true,
        ultimoAcesso: true,
        foto: true
      },
      orderBy: {
        nome: 'asc'
      }
    });
    
    console.log(`✅ Encontrados ${usuarios.length} usuários`);
    return usuarios;
    
  } catch (error) {
    console.error('❌ Erro ao buscar usuários:', error);
    throw error;
  }
}

/**
 * Lista todos os usuários (com paginação)
 * @param {number} page - Página atual (default: 1)
 * @param {number} limit - Limite de resultados por página (default: 10)
 * @returns {Promise<Object>} - Objeto com usuários e informações de paginação
 */
async function listarTodosUsuarios(page = 1, limit = 10) {
  try {
    console.log(`📋 Listando usuários - Página ${page}, Limite ${limit}`);
    
    const skip = (page - 1) * limit;
    
    const [usuarios, total] = await Promise.all([
      prisma.usuario.findMany({
        select: {
          id: true,
          nome: true,
          email: true,
          tipo: true,
          ativo: true,
          dataCriacao: true,
          ultimoAcesso: true,
          foto: true
        },
        orderBy: {
          nome: 'asc'
        },
        skip,
        take: limit
      }),
      prisma.usuario.count()
    ]);
    
    const resultado = {
      usuarios,
      paginacao: {
        pagina: page,
        limite: limit,
        total: total,
        totalPaginas: Math.ceil(total / limit)
      }
    };
    
    console.log(`✅ Listados ${usuarios.length} de ${total} usuários`);
    return resultado;
    
  } catch (error) {
    console.error('❌ Erro ao listar usuários:', error);
    throw error;
  }
}

/**
 * Busca usuários por tipo
 * @param {string} tipo - Tipo do usuário (ADMIN, GERENTE, USUARIO, etc)
 * @returns {Promise<Array>} - Array com usuários do tipo especificado
 */
async function buscarUsuariosPorTipo(tipo) {
  try {
    console.log(`🔍 Buscando usuários do tipo: ${tipo}`);
    
    const usuarios = await prisma.usuario.findMany({
      where: { tipo },
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
        ativo: true,
        dataCriacao: true,
        ultimoAcesso: true,
        foto: true
      },
      orderBy: {
        nome: 'asc'
      }
    });
    
    console.log(`✅ Encontrados ${usuarios.length} usuários do tipo ${tipo}`);
    return usuarios;
    
  } catch (error) {
    console.error('❌ Erro ao buscar usuários por tipo:', error);
    throw error;
  }
}

/**
 * Busca usuários ativos ou inativos
 * @param {boolean} ativo - true para usuários ativos, false para inativos
 * @returns {Promise<Array>} - Array com usuários ativos/inativos
 */
async function buscarUsuariosPorStatus(ativo) {
  try {
    const status = ativo ? 'ativos' : 'inativos';
    console.log(`🔍 Buscando usuários ${status}`);
    
    const usuarios = await prisma.usuario.findMany({
      where: { ativo },
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
        ativo: true,
        dataCriacao: true,
        ultimoAcesso: true,
        foto: true
      },
      orderBy: {
        nome: 'asc'
      }
    });
    
    console.log(`✅ Encontrados ${usuarios.length} usuários ${status}`);
    return usuarios;
    
  } catch (error) {
    console.error('❌ Erro ao buscar usuários por status:', error);
    throw error;
  }
}

// Função principal para testes
async function main() {
  try {
    console.log('🚀 Iniciando testes de busca de usuários...\n');
    
    // Teste 1: Buscar por email
    console.log('=== Teste 1: Buscar por email ===');
    await buscarUsuarioPorEmail('admin@controlecarga.com');
    console.log('');
    
    // Teste 2: Buscar por nome
    console.log('=== Teste 2: Buscar por nome ===');
    await buscarUsuarioPorNome('admin');
    console.log('');
    
    // Teste 3: Listar todos (primeira página)
    console.log('=== Teste 3: Listar usuários ===');
    await listarTodosUsuarios(1, 5);
    console.log('');
    
    // Teste 4: Buscar por tipo
    console.log('=== Teste 4: Buscar por tipo ===');
    await buscarUsuariosPorTipo('ADMIN');
    console.log('');
    
    // Teste 5: Buscar usuários ativos
    console.log('=== Teste 5: Buscar usuários ativos ===');
    await buscarUsuariosPorStatus(true);
    console.log('');
    
  } catch (error) {
    console.error('❌ Erro nos testes:', error);
  } finally {
    await prisma.$disconnect();
    console.log('🔚 Conexão com banco encerrada');
  }
}

// Exportar funções para uso em outros módulos
module.exports = {
  buscarUsuarioPorEmail,
  buscarUsuarioPorId,
  buscarUsuarioPorNome,
  listarTodosUsuarios,
  buscarUsuariosPorTipo,
  buscarUsuariosPorStatus,
  prisma
};

// Executar testes se rodado diretamente
if (require.main === module) {
  main();
}
