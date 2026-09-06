/* Service worker mínimo: só existe para receber push e abrir o app no link certo.
   O texto do push é sempre genérico (sem preço, distribuidora, farmácia etc.) — o
   conteúdo real só aparece dentro do app autenticado. */
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))

self.addEventListener('push', event => {
  let dados = { titulo: 'CotaPreço', mensagem: 'Você tem uma novidade no CotaPreço.', link: '/' }
  try { if (event.data) dados = { ...dados, ...event.data.json() } } catch { /* payload inesperado: usa o texto padrão */ }
  event.waitUntil(self.registration.showNotification(dados.titulo, {
    body: dados.mensagem,
    icon: '/cotapreco-icon-192.png',
    badge: '/cotapreco-icon-192.png',
    tag: dados.link,
    data: { link: dados.link },
  }))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const link = event.notification.data?.link || '/'
  event.waitUntil((async () => {
    const clientes = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const url = new URL(link, self.location.origin).href
    const existente = clientes.find(cliente => cliente.url === url)
    if (existente) return existente.focus()
    const qualquerJanela = clientes[0]
    if (qualquerJanela) { await qualquerJanela.navigate(url); return qualquerJanela.focus() }
    return self.clients.openWindow(url)
  })())
})
