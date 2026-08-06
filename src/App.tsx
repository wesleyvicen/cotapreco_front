import { RotaProtegida } from './autenticacao'
import type { ReactNode } from 'react'
import LayoutSistema from './components/LayoutSistema'
import PaginaPainel from './pages/PaginaPainel'
import PaginaLogin from './pages/PaginaLogin'
import PaginaNovaCotacao from './pages/PaginaNovaCotacao'
import PaginaProdutos from './pages/PaginaProdutos'
import PaginaRespostaPublica from './pages/PaginaRespostaPublica'
import PaginaDetalheCotacao from './pages/PaginaDetalheCotacao'
import PaginaCotacoes from './pages/PaginaCotacoes'
import { Redirecionar, ProvedorParametros, usarLocalizacao } from './roteamento'

export default function App(){
  const{pathname}=usarLocalizacao()
  if(pathname==='/login')return <PaginaLogin/>
  const publicMatch=pathname.match(/^\/cotacao\/responder\/([^/]+)$/)
  if(publicMatch)return <ProvedorParametros params={{token:decodeURIComponent(publicMatch[1])}}><PaginaRespostaPublica/></ProvedorParametros>
  let page:ReactNode
  if(pathname==='/')page=<PaginaPainel/>
  else if(pathname==='/cotacoes')page=<PaginaCotacoes/>
  else if(pathname==='/cotacoes/nova')page=<PaginaNovaCotacao/>
  else if(pathname==='/produtos')page=<PaginaProdutos/>
  else {const match=pathname.match(/^\/cotacoes\/(\d+)$/);page=match?<ProvedorParametros params={{id:match[1]}}><PaginaDetalheCotacao/></ProvedorParametros>:<Redirecionar to="/" replace/>}
  return <RotaProtegida><LayoutSistema>{page}</LayoutSistema></RotaProtegida>
}
