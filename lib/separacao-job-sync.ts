import prisma from '@/lib/prisma';

/**
 * Sincroniza o `Pedidos` vinculado a um job de automação
 * `IMPRIMIR_LISTA_SEPARACAO` quando o job termina.
 *
 * Chamada pelos dois caminhos que podem encerrar o job:
 * - `pages/api/automacao/jobs/[id]/complete.ts` (reporte do agente)
 * - `pages/api/automacao/jobs/claim.ts` (timeout de heartbeat ≥ 3 tentativas)
 *
 * - Sucesso → FINALIZADO (o separador confirma físicamente depois).
 * - Falha   → FALHA_AUTOMACAO: como `calcularFilaSeparacao` só exclui
 *   registros EM_SEPARACAO, o pedido volta a aparecer na fila do totem.
 */
export async function sincronizarPedidoDoJob(
  jobId: string,
  sucesso: boolean
): Promise<void> {
  try {
    const ativa = await prisma.pedidos.findFirst({
      where: { jobId, status: 'EM_SEPARACAO' },
      select: { id: true },
    });
    if (!ativa) return;

    await prisma.pedidos.update({
      where: { id: ativa.id },
      data: {
        status: sucesso ? 'FINALIZADO' : 'FALHA_AUTOMACAO',
        dataFim: new Date(),
      },
    });
  } catch (error) {
    // Nunca deixar a sincronização derrubar o fluxo do agente:
    // o job já está correto; um Pedidos dessincronizado só atrasa a fila.
    console.error(`Erro ao sincronizar Pedidos do job ${jobId}:`, error);
  }
}
