import { api } from '../api'
import { obterDeviceId } from '../utils/deviceId'

export function isPushSuportado(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}
function isIosDevice(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}
function isStandalonePwa(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
}
/* Web Push no iOS só funciona dentro do PWA instalado na Tela de Início — pedir
   permissão de dentro do Safari normal simplesmente não faz nada. */
export function precisaInstalarNoIos(): boolean {
  return isIosDevice() && !isStandalonePwa()
}
export function permissaoAtual(): NotificationPermission | 'indisponivel' {
  return isPushSuportado() ? Notification.permission : 'indisponivel'
}

function base64UrlParaUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const bruto = atob(base64)
  const bytes = new Uint8Array(bruto.length)
  for (let i = 0; i < bruto.length; i++) bytes[i] = bruto.charCodeAt(i)
  return bytes
}

async function sincronizarComBackend(subscription: PushSubscription): Promise<void> {
  const json = subscription.toJSON()
  await api<void>('/push/subscribe', {
    method: 'POST',
    headers: { 'X-Device-Id': obterDeviceId() },
    body: JSON.stringify({ endpoint: json.endpoint, keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth } }),
  })
}

let operacaoEmAndamento: Promise<PushSubscription | null> | null = null
/* Chamadas concorrentes (ex.: várias abas abrindo ao mesmo tempo) reaproveitam a mesma
   assinatura em vez de disputar o subscribe do navegador. */
async function assinarEsincronizar(): Promise<PushSubscription | null> {
  if (operacaoEmAndamento) return operacaoEmAndamento
  operacaoEmAndamento = (async () => {
    const registration = await navigator.serviceWorker.ready
    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      const { publicKey } = await api<{ publicKey: string }>('/push/vapid-public-key')
      if (!publicKey) return null
      subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlParaUint8Array(publicKey) })
    }
    await sincronizarComBackend(subscription)
    return subscription
  })()
  try { return await operacaoEmAndamento } finally { operacaoEmAndamento = null }
}

/* Silencioso: só reforça a assinatura quando a permissão já foi concedida antes (ex.:
   voltou a abrir o app depois de vários dias, ou trocou de rede). Nunca pede permissão. */
export async function garantirInscricaoAtiva(): Promise<void> {
  if (!isPushSuportado() || Notification.permission !== 'granted') return
  try { await assinarEsincronizar() } catch { /* Tenta de novo na próxima navegação. */ }
}

export type ResultadoAtivacao = 'ativado' | 'negado' | 'indisponivel' | 'erro'
export async function ativarNotificacoes(): Promise<ResultadoAtivacao> {
  if (!isPushSuportado()) return 'indisponivel'
  try {
    const permissao = await Notification.requestPermission()
    if (permissao !== 'granted') return 'negado'
    const subscription = await assinarEsincronizar()
    return subscription ? 'ativado' : 'erro'
  } catch { return 'erro' }
}

export async function desativarNotificacoes(): Promise<void> {
  if (!isPushSuportado()) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  try { await api<void>('/push/unsubscribe', { method: 'POST', headers: { 'X-Device-Id': obterDeviceId() } }) } catch { /* Mesmo sem confirmar no backend, cancela local. */ }
  await subscription?.unsubscribe()
}
