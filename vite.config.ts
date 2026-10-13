import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/* Versão carimbada no bundle: muda o hash do index a cada deploy, então um nome de arquivo
   que algum navegador tenha guardado errado (ver functions/assets) nunca é reaproveitado, e
   dá pra ver qual build o aparelho está rodando em <html data-versao>. CF_PAGES_COMMIT_SHA
   vem do build do Cloudflare Pages. */
const versao = (process.env.CF_PAGES_COMMIT_SHA ?? '').slice(0, 7) || `local-${Date.now()}`

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  define: { 'import.meta.env.VITE_VERSAO_BUILD': JSON.stringify(versao) },
})
