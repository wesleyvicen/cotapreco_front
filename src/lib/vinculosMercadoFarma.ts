import type { SugestaoCorrespondenciaMercadoFarma } from '../types'

/* Avisa o menu que uma integração foi conectada ou desconectada, para mostrar ou esconder a
   busca nos portais sem recarregar a página. */
export const EVENTO_INTEGRACOES_ALTERADAS = 'cotapreco:integracoes-alteradas'
export const avisarIntegracoesAlteradas = () => window.dispatchEvent(new Event(EVENTO_INTEGRACOES_ALTERADAS))

const CHAVE_RECUSADOS = 'cotapreco:mercado-farma:sem-correspondencia'
export const NENHUM = 'nenhum'

/* "Nenhum destes" / "manter o atual" vale para as próximas importações desta cotação: sem isso
   a farmácia teria de recusar a mesma coisa a cada reimportação. Só desta cotação, como as
   escolhas: nada do Mercado Farma muda como as próximas cotações funcionam. Fica no navegador;
   limpar os dados do site faz a pergunta voltar. */
export function chaveRecusa(sugestao:SugestaoCorrespondenciaMercadoFarma, cotacaoId:number) {
  return `c:${cotacaoId}:i:${sugestao.itemCotacaoId}:${sugestao.tipo}`
}

export function lerRecusados():Set<string> {
  try {
    /* Versões antigas guardavam só o id do produto (número): vale como recusa de produto sem EAN. */
    const valores = JSON.parse(localStorage.getItem(CHAVE_RECUSADOS) ?? '[]') as (number|string)[]
    return new Set(valores.map(valor => typeof valor === 'number' ? `p:${valor}` : valor))
  } catch { return new Set() }
}
export function gravarRecusados(chaves:Set<string>) {
  try { localStorage.setItem(CHAVE_RECUSADOS, JSON.stringify([...chaves])) } catch { /* Preferência opcional: sem armazenamento, só pergunta de novo. */ }
}

/** Tira das sugestões o que a farmácia já recusou. */
export function sugestoesPendentes(sugestoes:SugestaoCorrespondenciaMercadoFarma[], cotacaoId:number) {
  const recusados = lerRecusados()
  return sugestoes.filter(sugestao => !recusados.has(chaveRecusa(sugestao, cotacaoId)))
}

/* "3 produtos para conferir no Mercado Farma (1 sem EAN, 2 com opção mais barata)". */
const ROTULO_TIPO:Record<SugestaoCorrespondenciaMercadoFarma['tipo'],string> = {
  SEM_EAN:'sem EAN', EAN_NAO_ENCONTRADO:'com EAN que não está no portal', MAIS_BARATO:'com opção mais barata',
}
export function resumoSugestoes(sugestoes:SugestaoCorrespondenciaMercadoFarma[]) {
  const partes = (Object.keys(ROTULO_TIPO) as SugestaoCorrespondenciaMercadoFarma['tipo'][])
    .map(tipo => [sugestoes.filter(s => s.tipo === tipo).length, ROTULO_TIPO[tipo]] as const)
    .filter(([quantidade]) => quantidade > 0).map(([quantidade, rotulo]) => `${quantidade} ${rotulo}`)
  return `${sugestoes.length === 1 ? '1 produto' : `${sugestoes.length} produtos`} para conferir no Mercado Farma (${partes.join(', ')})`
}
