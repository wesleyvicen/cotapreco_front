const BACKEND_PADRAO = 'https://cotaapi.drogariacenter.com.br'

export async function onRequestGet(context) {
  const segmentos = Array.isArray(context.params.path)
    ? context.params.path
    : [context.params.path]
  const caminho = segmentos.filter(Boolean).map(encodeURIComponent).join('/')
  const requisicaoPublica = new URL(context.request.url)
  const backend = (context.env.BACKEND_ORIGIN || BACKEND_PADRAO).replace(/\/$/, '')
  const destino = `${backend}/api/publico/cotacoes/${caminho}${requisicaoPublica.search}`

  return fetch(new Request(destino, context.request))
}
