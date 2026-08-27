export const LINK_WHATSAPP_ASSINATURA =
  'https://wa.me/5581999441494?text=' + encodeURIComponent('Olá! Quero assinar o CotaPreço.')

/* accessAllowed vem indefinido de um backend antigo: só bloqueia quando o servidor
   afirmou que o acesso acabou, nunca por ausência da informação. */
export const acessoBloqueado = (acessoLiberado:boolean|undefined) => acessoLiberado === false

/* Mesma lógica de guarda: só bloqueia quando o servidor afirmou que falta confirmar. */
export const emailPendente = (emailConfirmado:boolean|undefined) => emailConfirmado === false
