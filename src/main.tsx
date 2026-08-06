import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ProvedorAutenticacao } from './autenticacao'
import App from './App'
import { ProvedorRoteamento } from './roteamento'
import './styles.css'
createRoot(document.getElementById('root')!).render(<StrictMode><ProvedorRoteamento><ProvedorAutenticacao><App/></ProvedorAutenticacao></ProvedorRoteamento></StrictMode>)
