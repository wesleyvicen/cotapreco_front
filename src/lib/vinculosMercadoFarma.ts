import type { SugestaoCorrespondenciaMercadoFarma } from '../types'

const CHAVE_RECUSADOS = 'cotapreco:mercado-farma:sem-correspondencia'
export const NENHUM = 'nenhum'

/* "Nenhum destes" vale para as próximas importações: sem isso a farmácia teria de recusar o
   mesmo produto toda vez. Fica no navegador; limpar os dados do site faz a pergunta voltar. */
export function lerRecusados():Set<number> {
  try { return new Set(JSON.parse(localStorage.getItem(CHAVE_RECUSADOS) ?? '[]') as number[]) } catch { return new Set() }
}
export function gravarRecusados(ids:Set<number>) {
  try { localStorage.setItem(CHAVE_RECUSADOS, JSON.stringify([...ids])) } catch { /* Preferência opcional: sem armazenamento, só pergunta de novo. */ }
}

/** Tira das sugestões os produtos que a farmácia já marcou como "Nenhum destes". */
export function sugestoesPendentes(sugestoes:SugestaoCorrespondenciaMercadoFarma[]) {
  const recusados = lerRecusados()
  return sugestoes.filter(sugestao => !recusados.has(sugestao.produtoId))
}
