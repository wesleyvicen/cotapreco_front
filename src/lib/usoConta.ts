import type { EtapaOnboarding, SituacaoUso } from '../types'

/* Rótulos e tons do selo de uso da tela de staff. Os limites (7 e 30 dias) moram no backend,
   em UsoContaService, para o selo e os filtros nunca discordarem. */
export const SELO_USO:Record<SituacaoUso,{ texto:string, tom:string, dica:string }> = {
  ATIVO:{ texto:'Ativo', tom:'active', dica:'Alguém da conta entrou nos últimos 7 dias.' },
  ESFRIANDO:{ texto:'Esfriando', tom:'trial', dica:'Último acesso entre 8 e 30 dias atrás.' },
  PARADO:{ texto:'Parado', tom:'overdue', dica:'Ninguém da conta entra há mais de 30 dias.' },
  NUNCA_COTOU:{ texto:'Ainda não cotou', tom:'neutro', dica:'Só tem a cotação de demonstração do onboarding, ou nenhuma.' },
  SEM_REGISTRO:{ texto:'Sem registro de acesso', tom:'neutro', dica:'Já cotou, mas ninguém entrou desde que o último acesso passou a ser guardado.' },
}

export const ROTULO_ETAPA:Record<EtapaOnboarding,string> = {
  WELCOME:'Boas-vindas', ERP_SELECTION:'Escolha do ERP', EXPORT_GUIDE:'Guia de exportação do ERP',
  IMPORT:'Importação da lista', REVIEW:'Revisão dos produtos', QUOTATION_CREATED:'Cotação criada', SHARED:'Link compartilhado',
}

/* "hoje", "ontem", "há 5 dias", "há 3 meses": para a coluna de uso, a distância importa mais
   que a data exata (que fica no title). */
export function haQuantoTempo(valor:string|null):string {
  if (!valor) return 'nunca'
  const dias = Math.floor((Date.now() - new Date(valor).getTime()) / 86_400_000)
  if (dias <= 0) return 'hoje'
  if (dias === 1) return 'ontem'
  if (dias < 30) return `há ${dias} dias`
  const meses = Math.floor(dias / 30)
  return meses === 1 ? 'há 1 mês' : meses < 12 ? `há ${meses} meses` : 'há mais de 1 ano'
}

/* Só a data, sem hora: nas listas da tela de staff a hora não ajuda ninguém a decidir nada. */
export const dataCurta = (valor:string|null) => valor
  ? new Intl.DateTimeFormat('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit' }).format(new Date(valor)) : '-'
