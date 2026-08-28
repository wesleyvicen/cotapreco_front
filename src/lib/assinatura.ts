import type { Assinatura, PlanoAssinatura, StatusAssinatura } from '../types'

export const LINK_WHATSAPP_ASSINATURA =
  'https://wa.me/5581999441494?text=' + encodeURIComponent('Olá! Quero assinar o CotaPreço.')

/* Preço de exibição. A cobrança de verdade é montada pelo backend, que manda este mesmo
   valor ao Asaas: quando ele devolve o plano em GET /subscription, é o dele que vale — o
   preço na tela nunca pode divergir do que vai ser cobrado no cartão. */
export const PLANO_PADRAO:PlanoAssinatura = { value:119.9, cycle:'MONTHLY', description:'CotaPreço — plano mensal' }

export const TOTAL_DIAS_TESTE = 7

export const precoDoPlano = (assinatura:Assinatura|null) => assinatura?.plan ?? PLANO_PADRAO

/* accessAllowed vem indefinido de um backend antigo: só bloqueia quando o servidor
   afirmou que o acesso acabou, nunca por ausência da informação. */
export const acessoBloqueado = (acessoLiberado:boolean|undefined) => acessoLiberado === false

/* Mesma lógica de guarda: só bloqueia quando o servidor afirmou que falta confirmar. */
export const emailPendente = (emailConfirmado:boolean|undefined) => emailConfirmado === false

/* PENDING é o intervalo entre o pagamento no Asaas e o webhook chegar aqui. Ele existe
   porque a farmácia volta do checkout antes do aviso, e ver "vencida" nessa hora — logo
   depois de pagar — é o pior momento possível para duvidar da cobrança. */
export const assinaturaEmConfirmacao = (status:StatusAssinatura|undefined) => status === 'PENDING'

export const ROTULO_STATUS:Record<StatusAssinatura,string> = {
  NONE:'Sem assinatura', TRIAL:'Período de teste', PENDING:'Confirmando pagamento',
  ACTIVE:'Assinatura ativa', OVERDUE:'Pagamento em atraso', CANCELED:'Assinatura cancelada',
}
