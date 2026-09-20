import { api, ErroApi } from '../api'

/*
 * Reenvio do link de confirmação. Confirmar o e-mail não trava mais nada no sistema: quem
 * acabou de se cadastrar cria a primeira cotação na hora. O convite aparece em dois lugares
 * (a faixa do topo e o fim da primeira cotação), e os dois pedem o mesmo reenvio - daí a
 * chamada morar aqui, e não repetida em cada tela.
 */
export async function reenviarConfirmacaoEmail():Promise<string> {
  try { return (await api<{ message:string }>('/auth/reenviar-confirmacao', { method:'POST' })).message }
  catch (erro) { return erro instanceof ErroApi ? erro.message : 'Não foi possível reenviar agora.' }
}

/* Por que vale confirmar, em uma linha. É o que a pessoa ganha, não o que ela deve: sem o
   e-mail certo não há como recuperar a senha nem receber os avisos da conta. */
export const MOTIVO_CONFIRMAR_EMAIL = 'Com o e-mail confirmado você recupera sua senha se esquecer e recebe os avisos da sua conta.'
