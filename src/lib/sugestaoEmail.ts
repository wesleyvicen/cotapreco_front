/* Provedores mais comuns entre farmácias no Brasil, na ordem em que a sugestão deve
   competir: quando o que foi digitado é prefixo de mais de um (ex.: "yahoo.com" é prefixo
   de "yahoo.com.br"), o primeiro da lista vence. */
const DOMINIOS_COMUNS = [
  'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com.br', 'yahoo.com',
  'icloud.com', 'live.com', 'uol.com.br', 'bol.com.br', 'terra.com.br',
]

/* Devolve o e-mail completo sugerido (endereço + domínio completado) quando o que já foi
   digitado depois do "@" é começo de um domínio comum e ainda não é o domínio inteiro.
   Null quando não há "@", nada depois dele, ou o texto já não bate com nenhum da lista. */
export function sugerirDominioEmail(email:string):string|null {
  const arroba = email.indexOf('@')
  if (arroba === -1) return null
  const digitado = email.slice(arroba + 1).toLowerCase()
  if (!digitado) return null
  const dominio = DOMINIOS_COMUNS.find(d => d.startsWith(digitado) && d !== digitado)
  return dominio ? email.slice(0, arroba + 1) + dominio : null
}
