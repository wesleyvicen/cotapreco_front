import type { Assinatura, PlanoAssinatura, StatusAssinatura } from '../types'

export const LINK_WHATSAPP_ASSINATURA =
  'https://wa.me/5581999441494?text=' + encodeURIComponent('Olá! Quero assinar o CotaPreço.')

export const linkWhatsappNegociarFarmacias = (quantidadeFarmacias:number) =>
  'https://wa.me/5581999441494?text=' + encodeURIComponent(`Olá! Tenho ${quantidadeFarmacias} farmácias no CotaPreço e quero negociar condições especiais.`)

/* Preço de exibição. A cobrança de verdade é montada pelo backend, que manda este mesmo
   valor ao Asaas: quando ele devolve o plano em GET /subscription, é o dele que vale — o
   preço na tela nunca pode divergir do que vai ser cobrado no cartão. */
export const PLANO_PADRAO:PlanoAssinatura = { value:119.9, cycle:'MONTHLY', description:'CotaPreço — plano mensal' }

/* Preço padrão de cada farmácia além da primeira, na mesma conta. É o valor de tabela: a
   conta pode ter um preço negociado (Conta.precoNegociado), que só o backend conhece
   depois do login — aqui é só a estimativa mostrada antes de entrar. */
export const PRECO_ADICIONAL_FARMACIA_PADRAO = 89.9

export const TOTAL_DIAS_TESTE = 7

/* Mesma lista usada na tela de assinatura (o que vem incluso e o resumo de cancelamento)
   e na landing (a vitrine de preço) — um único lugar para o que o plano entrega. */
export const INCLUSO = [
  'Cotações e comparativo de preços ilimitados',
  'Plano de compra por distribuidora, com pedido mínimo',
  'Conferência de recebimento e histórico de preços',
  'Exportação em Excel de tudo',
  'Usuários da equipe sem custo por acesso',
]

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
