import { RotaProtegida } from './autenticacao'
import type { ReactNode } from 'react'
import LayoutSistema from './components/LayoutSistema'
import PaginaPainel from './pages/PaginaPainel'
import PaginaLogin from './pages/PaginaLogin'
import PaginaEsqueciSenha from './pages/PaginaEsqueciSenha'
import PaginaCadastroFarmacia from './pages/PaginaCadastroFarmacia'
import PaginaNovaCotacao from './pages/PaginaNovaCotacao'
import PaginaProdutos from './pages/PaginaProdutos'
import PaginaRespostaPublica from './pages/PaginaRespostaPublica'
import PaginaRedefinirSenhaRepresentante from './pages/PaginaRedefinirSenhaRepresentante'
import PaginaRedefinirSenha from './pages/PaginaRedefinirSenha'
import PaginaAlterarSenhaRepresentante from './pages/PaginaAlterarSenhaRepresentante'
import PaginaDetalheCotacao from './pages/PaginaDetalheCotacao'
import PaginaCotacoes from './pages/PaginaCotacoes'
import PaginaConfiguracoes from './pages/PaginaConfiguracoes'
import PaginaAlterarSenha from './pages/PaginaAlterarSenha'
import PaginaUsuarios from './pages/PaginaUsuarios'
import { Redirecionar, ProvedorParametros, usarLocalizacao } from './roteamento'

export default function App(){
  const{pathname}=usarLocalizacao()
  if(pathname==='/login')return <PaginaLogin/>
  if(pathname==='/esqueci-senha')return <PaginaEsqueciSenha/>
  if(pathname==='/redefinir-senha')return <PaginaRedefinirSenha/>
  if(pathname==='/representante/alterar-senha')return <PaginaAlterarSenhaRepresentante/>
  if(pathname==='/cadastro')return <PaginaCadastroFarmacia/>
  if(pathname==='/representante/redefinir-senha')return <PaginaRedefinirSenhaRepresentante/>
  const publicMatch=pathname.match(/^\/cotacao\/responder\/([^/]+)$/)
  if(publicMatch)return <ProvedorParametros params={{token:decodeURIComponent(publicMatch[1])}}><PaginaRespostaPublica/></ProvedorParametros>
  let page:ReactNode
  if(pathname==='/')page=<PaginaPainel/>
  else if(pathname==='/cotacoes')page=<PaginaCotacoes/>
  else if(pathname==='/cotacoes/nova')page=<PaginaNovaCotacao/>
  else if(pathname==='/produtos')page=<PaginaProdutos/>
  else if(pathname==='/dados-farmacia')page=<PaginaConfiguracoes/>
  else if(pathname==='/usuarios')page=<PaginaUsuarios/>
  else if(pathname==='/alterar-senha')page=<PaginaAlterarSenha/>
  else if(pathname==='/configuracoes')page=<Redirecionar to="/dados-farmacia" replace/>
  else {const match=pathname.match(/^\/cotacoes\/(\d+)$/);page=match?<ProvedorParametros params={{id:match[1]}}><PaginaDetalheCotacao/></ProvedorParametros>:<Redirecionar to="/" replace/>}
  return <RotaProtegida><LayoutSistema>{page}</LayoutSistema></RotaProtegida>
}
