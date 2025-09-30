const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function recriarUsuarios() {
  try {
    console.log('👥 Recriando usuários do sistema...\n');

    // 1. Verificar se já existem usuários
    const usuariosExistentes = await prisma.usuario.count();
    console.log(`📊 Usuários existentes: ${usuariosExistentes}`);

    if (usuariosExistentes > 0) {
      console.log('✅ Já existem usuários no sistema!');
      const usuarios = await prisma.usuario.findMany({
        select: {
          nome: true,
          email: true,
          tipo: true,
          ativo: true
        }
      });
      
      console.log('\n👤 Usuários encontrados:');
      usuarios.forEach((user, index) => {
        const status = user.ativo ? '✅ Ativo' : '❌ Inativo';
        console.log(`${index + 1}. ${user.nome} (${user.email}) - ${user.tipo} - ${status}`);
      });
      return;
    }

    // 2. Criar usuários padrão
    console.log('\n🔧 Criando usuários padrão...');

    const usuarios = [
      {
        nome: 'Administrador',
        email: 'admin@esplendor.com',
        senha: 'admin123',
        tipo: 'ADMIN',
        ativo: true
      },
      {
        nome: 'Augusto',
        email: 'augusto@esplendor.com',
        senha: 'augusto123',
        tipo: 'ADMIN',
        ativo: true
      },
      {
        nome: 'Gerente',
        email: 'gerente@esplendor.com',
        senha: 'gerente123',
        tipo: 'GERENTE',
        ativo: true
      },
      {
        nome: 'Usuario Teste',
        email: 'usuario@esplendor.com',
        senha: 'usuario123',
        tipo: 'USUARIO',
        ativo: true
      },
      {
        nome: 'Funcionario Teste',
        email: 'funcionario@esplendor.com',
        senha: 'funcionario123',
        tipo: 'FUNCIONARIO',
        ativo: true
      },
      {
        nome: 'Separador Teste',
        email: 'separador@esplendor.com',
        senha: 'separador123',
        tipo: 'SEPARADOR',
        ativo: true
      },
      {
        nome: 'Conferente Teste',
        email: 'conferente@esplendor.com',
        senha: 'conferente123',
        tipo: 'CONFERENTE',
        ativo: true
      },
      {
        nome: 'Auditor Teste',
        email: 'auditor@esplendor.com',
        senha: 'auditor123',
        tipo: 'AUDITOR',
        ativo: true
      }
    ];

    for (const userData of usuarios) {
      // Hash da senha
      const senhaHash = await bcrypt.hash(userData.senha, 10);
      
      const usuario = await prisma.usuario.create({
        data: {
          nome: userData.nome,
          email: userData.email,
          senha: senhaHash,
          tipo: userData.tipo,
          ativo: userData.ativo
        }
      });

      console.log(`   ✅ ${userData.nome} (${userData.email}) - ${userData.tipo}`);
      console.log(`      Senha: ${userData.senha}`);
    }

    // 3. Criar configurações do sistema
    console.log('\n⚙️ Criando configurações do sistema...');
    
    const configuracoes = [
      {
        chave: 'SISTEMA_NOME',
        valor: 'Sistema de Controle de Carga',
        descricao: 'Nome do sistema',
        tipo: 'string'
      },
      {
        chave: 'EMPRESA_NOME',
        valor: 'Esplendor Distribuidora',
        descricao: 'Nome da empresa',
        tipo: 'string'
      },
      {
        chave: 'PONTUACAO_PEDIDO_CORRETO',
        valor: '10',
        descricao: 'Pontos por pedido correto',
        tipo: 'number'
      },
      {
        chave: 'PONTUACAO_PEDIDO_INCORRETO',
        valor: '-5',
        descricao: 'Pontos por pedido incorreto',
        tipo: 'number'
      }
    ];

    for (const config of configuracoes) {
      try {
        await prisma.configuracaoSistema.create({
          data: config
        });
        console.log(`   ✅ ${config.chave}: ${config.valor}`);
      } catch (error) {
        // Ignorar se já existe
        console.log(`   ⚠️ ${config.chave}: já existe`);
      }
    }

    // 4. Verificar resultado
    console.log('\n📊 Resultado final:');
    const totalUsuarios = await prisma.usuario.count();
    const totalConfigs = await prisma.configuracaoSistema.count();
    
    console.log(`   Usuários criados: ${totalUsuarios}`);
    console.log(`   Configurações: ${totalConfigs}`);

    console.log('\n🎉 Usuários recriados com sucesso!');
    console.log('\n🔑 Credenciais para login:');
    console.log('   Admin: admin@esplendor.com / admin123');
    console.log('   Augusto: augusto@esplendor.com / augusto123');
    console.log('   Gerente: gerente@esplendor.com / gerente123');
    console.log('   Usuario: usuario@esplendor.com / usuario123');

  } catch (error) {
    console.error('❌ Erro ao recriar usuários:', error);
  } finally {
    await prisma.$disconnect();
  }
}

recriarUsuarios();
