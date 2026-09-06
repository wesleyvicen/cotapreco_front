const CHAVE = 'cotapreco:device-id'

function gerarUuid(): string {
  if ('randomUUID' in crypto) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const valor = (Math.random() * 16) | 0
    return (char === 'x' ? valor : (valor & 0x3) | 0x8).toString(16)
  })
}

/* Identifica a instalação do navegador (não a pessoa) — persiste em localStorage para
   sobreviver a fechar e reabrir o app, mas é local a este dispositivo/navegador. */
export function obterDeviceId(): string {
  try {
    const existente = localStorage.getItem(CHAVE)
    if (existente) return existente
    const novo = gerarUuid()
    localStorage.setItem(CHAVE, novo)
    return novo
  } catch { return gerarUuid() }
}
