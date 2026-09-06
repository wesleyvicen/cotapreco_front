import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ProvedorAutenticacao } from './autenticacao'
import App from './App'
import { ProvedorRoteamento } from './roteamento'
import './styles.css'
import './landing.css'
/* Registrar cedo (antes do primeiro login) para o navegador já ter o service worker
   pronto quando o usuário decidir ativar as notificações. */
if ('serviceWorker' in navigator) window.addEventListener('load', () => { navigator.serviceWorker.register('/service-worker.js').catch(() => {/* Sem SW o app funciona normalmente, só sem push. */}) })
createRoot(document.getElementById('root')!).render(<StrictMode><ProvedorRoteamento><ProvedorAutenticacao><App/></ProvedorAutenticacao></ProvedorRoteamento></StrictMode>)
