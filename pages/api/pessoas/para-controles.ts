import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { getTokenFromCookies, verifyToken } from '@/lib/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_secreto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Verificar autenticação
  const token = getTokenFromCookies(req);
  if (!token) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const decoded = await verifyToken(token, JWT_SECRET);
  if (!decoded || !decoded.id) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  try {
    console.log('🔍 [PRODUÇÃO] Buscando pessoas (compatível sem campo tipo)...');
    
    // Buscar todas as pessoas (SEM campo tipo - compatível com produção)
    const pessoas = await prisma.motorista.findMany({
      orderBy: [
        { nome: 'asc' }
      ]
    });

    console.log(`✅ [PRODUÇÃO] Encontradas ${pessoas.length} pessoas`);

    // Formatar dados INFERINDO o tipo baseado na lógica de negócio
    const pessoasFormatadas = pessoas.map(pessoa => {
      // INFERIR TIPO baseado nos dados existentes (SEM campo tipo no banco):
      let tipoInferido = 'MOTORISTA';
      let tipoLabel = 'Motorista';
      
      // Regra 1: Se transportadora é RETIRA_VENDEDOR = Funcionário
      if (pessoa.transportadoraId === 'RETIRA_VENDEDOR') {
        tipoInferido = 'FUNCIONARIO';
        tipoLabel = 'Funcionário';
      }
      // Regra 2: Se transportadora é RETIRA_CLIENTE = Cliente  
      else if (pessoa.transportadoraId === 'RETIRA_CLIENTE') {
        tipoInferido = 'CLIENTE';
        tipoLabel = 'Cliente';
      }
      // Regra 3: Se não tem CNH válida = Funcionário (provavelmente)
      else if (!pessoa.cnh || pessoa.cnh.trim() === '' || pessoa.cnh === 'N/A') {
        tipoInferido = 'FUNCIONARIO';
        tipoLabel = 'Funcionário';
      }
      // Caso contrário = Motorista (padrão)

      return {
        id: pessoa.id,
        nome: pessoa.nome,
        cpf: pessoa.cpf,
        telefone: pessoa.telefone,
        cnh: pessoa.cnh,
        transportadoraId: pessoa.transportadoraId,
        tipo: tipoInferido, // Tipo inferido pela lógica
        tipoLabel: tipoLabel,
        // Formato para exibição no dropdown: "Nome (Tipo)"
        displayName: `${pessoa.nome} (${tipoLabel})`
      };
    });

    // Ordenar por tipo (Motorista, Funcionário, Cliente) e depois por nome
    const pessoasOrdenadas = pessoasFormatadas.sort((a, b) => {
      // Definir ordem de prioridade dos tipos
      const ordemTipos = { 'MOTORISTA': 1, 'FUNCIONARIO': 2, 'CLIENTE': 3 };
      
      // Primeiro critério: ordenar por tipo
      const tipoA = ordemTipos[a.tipo as keyof typeof ordemTipos] || 4;
      const tipoB = ordemTipos[b.tipo as keyof typeof ordemTipos] || 4;
      
      if (tipoA !== tipoB) {
        return tipoA - tipoB;
      }
      
      // Segundo critério: ordenar por nome dentro do mesmo tipo
      return a.nome.localeCompare(b.nome, 'pt-BR');
    });

    // Agrupar por tipo para melhor organização
    const agrupados = {
      motoristas: pessoasOrdenadas.filter(p => p.tipo === 'MOTORISTA'),
      funcionarios: pessoasOrdenadas.filter(p => p.tipo === 'FUNCIONARIO'),
      clientes: pessoasOrdenadas.filter(p => p.tipo === 'CLIENTE')
    };

    console.log(`📊 [ORDENAÇÃO] Motoristas: ${agrupados.motoristas.length}, Funcionários: ${agrupados.funcionarios.length}, Clientes: ${agrupados.clientes.length}`);

    return res.status(200).json({
      todas: pessoasOrdenadas,
      agrupadas: agrupados,
      total: pessoasOrdenadas.length
    });
  } catch (error) {
    console.error('Erro ao buscar pessoas para controles:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
