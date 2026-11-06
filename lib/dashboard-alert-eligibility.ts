const SAO_PAULO_TIME_ZONE = 'America/Sao_Paulo';
const ALERT_CUTOFF_MINUTES = 16 * 60;

const getDateTimeParts = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: SAO_PAULO_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date).reduce<Record<string, string>>((result, part) => {
    result[part.type] = part.value;
    return result;
  }, {});

export const isPedidoElegivelPorDataDoAlerta = (
  dataHoraRecebimento: Date | null,
  agora: Date = new Date()
): boolean => {
  if (!dataHoraRecebimento) return true;

  const agoraPartes = getDateTimeParts(agora);
  const recebimentoPartes = getDateTimeParts(dataHoraRecebimento);
  const hoje = `${agoraPartes.year}-${agoraPartes.month}-${agoraPartes.day}`;
  const dataRecebimento = `${recebimentoPartes.year}-${recebimentoPartes.month}-${recebimentoPartes.day}`;

  if (dataRecebimento < hoje) return true;
  if (dataRecebimento > hoje) return false;

  const minutosAgora = Number(agoraPartes.hour) * 60 + Number(agoraPartes.minute);
  return minutosAgora >= ALERT_CUTOFF_MINUTES;
};
