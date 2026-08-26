export function salvarBlob(blob:Blob, filename:string) {
  const url = URL.createObjectURL(blob)
  const link = Object.assign(document.createElement('a'), { href: url, download: filename, rel: 'noopener' })
  document.body.appendChild(link)
  link.click()
  link.remove()
  /* O navegador lê o blob depois que o clique retorna: revogar na hora cancela o download. */
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export const nomeDeArquivo = (texto:string, alternativa:string) =>
  texto.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || alternativa
