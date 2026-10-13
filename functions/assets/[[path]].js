/* Arquivo de /assets que não existe cai no fallback de SPA do Pages: index.html com status 200
   e o Cache-Control imutável de um ano do _headers. Durante a propagação de um deploy, o
   index.html novo pede um bundle que o nó ainda servindo a versão antiga não tem, e o navegador
   guarda esse HTML como se fosse o JS - a tela fica branca até alguém limpar o cache. Aqui o
   arquivo inexistente vira 404 sem cache, e o que existe sai com o cache longo de sempre. */
export async function onRequest(context) {
  const resposta = await context.env.ASSETS.fetch(context.request)
  if ((resposta.headers.get('Content-Type') || '').includes('text/html'))
    return new Response('Arquivo não encontrado.', { status: 404, headers: { 'Cache-Control': 'no-store' } })
  const cabecalhos = new Headers(resposta.headers)
  cabecalhos.set('Cache-Control', 'public, max-age=31536000, immutable')
  return new Response(resposta.body, { status: resposta.status, headers: cabecalhos })
}
