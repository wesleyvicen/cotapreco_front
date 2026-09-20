/*
 * Nome e prazo sugeridos na criação de uma cotação. Vive fora das telas porque o assistente da
 * primeira cotação precisa sugerir exatamente o mesmo prazo que o formulário normal: duas
 * cópias da regra dariam prazos diferentes para o mesmo sistema.
 */
const HORA_SUGERIDA = 18
const DIAS_UTEIS_SUGERIDOS = 1

export function dataHoraLocal(data = new Date()) {
  const doisDigitos = (valor:number) => String(valor).padStart(2, '0')
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}T${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}`
}

/* Fim de semana não conta: um prazo que cai no sábado só dá ao representante o tempo de
   responder na segunda, e o que a farmácia quer é um dia de trabalho para as respostas. */
const somarDiasUteis = (data:Date, dias:number) => {
  const resultado = new Date(data)
  for (let restantes = dias; restantes > 0;) {
    resultado.setDate(resultado.getDate() + 1)
    const diaDaSemana = resultado.getDay()
    if (diaDaSemana !== 0 && diaDaSemana !== 6) restantes--
  }
  return resultado
}

export const prazoSugerido = (agora = new Date()) => {
  const data = somarDiasUteis(agora, DIAS_UTEIS_SUGERIDOS)
  data.setHours(HORA_SUGERIDA, 0, 0, 0)
  return dataHoraLocal(data)
}

const dataCurta = (hoje:Date) => new Intl.DateTimeFormat('pt-BR', { dateStyle:'short' }).format(hoje)
export const nomeSugerido = (hoje = new Date()) => `COTAÇÃO ${dataCurta(hoje)}`
/* Na primeira cotação o nome fala a língua de quem está chegando: é o pedido da semana, não
   um código de processo. */
export const nomeSugeridoPrimeiraCotacao = (hoje = new Date()) => `Pedido semanal - ${dataCurta(hoje)}`
