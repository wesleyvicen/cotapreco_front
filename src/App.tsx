import { RotaProtegida } from './autenticacao'
import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import LayoutSistema from './components/LayoutSistema'
import PaginaPainel from './pages/PaginaPainel'
import PaginaLogin from './pages/PaginaLogin'
import { Redirecionar, ProvedorParametros, usarLocalizacao } from './roteamento'

const PaginaEsqueciSenha=lazy(()=>import('./pages/PaginaEsqueciSenha'))
const PaginaCadastroFarmacia=lazy(()=>import('./pages/PaginaCadastroFarmacia'))
const PaginaNovaCotacao=lazy(()=>import('./pages/PaginaNovaCotacao'))
const PaginaProdutos=lazy(()=>import('./pages/PaginaProdutos'))
const PaginaRespostaPublica=lazy(()=>import('./pages/PaginaRespostaPublica'))
const PaginaRedefinirSenhaRepresentante=lazy(()=>import('./pages/PaginaRedefinirSenhaRepresentante'))
const PaginaRedefinirSenha=lazy(()=>import('./pages/PaginaRedefinirSenha'))
const PaginaAlterarSenhaRepresentante=lazy(()=>import('./pages/PaginaAlterarSenhaRepresentante'))
const PaginaDetalheCotacao=lazy(()=>import('./pages/PaginaDetalheCotacao'))
const PaginaCotacoes=lazy(()=>import('./pages/PaginaCotacoes'))
const PaginaConfiguracoes=lazy(()=>import('./pages/PaginaConfiguracoes'))
const PaginaAlterarSenha=lazy(()=>import('./pages/PaginaAlterarSenha'))
const PaginaUsuarios=lazy(()=>import('./pages/PaginaUsuarios'))
const PaginaCotacaoOL=lazy(()=>import('./pages/PaginaCotacaoOL'))

export default function App(){
  const{pathname}=usarLocalizacao()
  useEffect(()=>{
    const titulo={
      '/':'Painel',
      '/login':'Entrar',
      '/cadastro':'Cadastrar farmácia',
      '/esqueci-senha':'Recuperar senha',
      '/redefinir-senha':'Redefinir senha',
      '/representante/redefinir-senha':'Redefinir senha',
      '/representante/alterar-senha':'Minha conta',
      '/cotacoes':'Cotações',
      '/cotacoes/nova':'Nova cotação',
      '/cotacao-ol':'Cotação para OL',
      '/produtos':'Produtos',
      '/dados-farmacia':'Dados da farmácia',
      '/usuarios':'Usuários',
      '/alterar-senha':'Alterar senha',
    }[pathname] ?? (pathname.startsWith('/cotacao/responder/') ? 'Responder cotação' : pathname.startsWith('/cotacoes/') ? 'Cotação' : 'CotaPreço')
    document.title=`${titulo} | CotaPreço`
  },[pathname])
  if(pathname==='/login')return <PaginaLogin/>
  if(pathname==='/esqueci-senha')return <ConteudoAssincrono><PaginaEsqueciSenha/></ConteudoAssincrono>
  if(pathname==='/redefinir-senha')return <ConteudoAssincrono><PaginaRedefinirSenha/></ConteudoAssincrono>
  if(pathname==='/representante/alterar-senha')return <ConteudoAssincrono><PaginaAlterarSenhaRepresentante/></ConteudoAssincrono>
  if(pathname==='/cadastro')return <ConteudoAssincrono><PaginaCadastroFarmacia/></ConteudoAssincrono>
  if(pathname==='/representante/redefinir-senha')return <ConteudoAssincrono><PaginaRedefinirSenhaRepresentante/></ConteudoAssincrono>
  const publicMatch=pathname.match(/^\/cotacao\/responder\/([^/]+)$/)
  if(publicMatch)return <ConteudoAssincrono><ProvedorParametros params={{token:decodeURIComponent(publicMatch[1])}}><PaginaRespostaPublica/></ProvedorParametros></ConteudoAssincrono>
  let page:ReactNode
  if(pathname==='/')page=<PaginaPainel/>
  else if(pathname==='/cotacoes')page=<PaginaCotacoes/>
  else if(pathname==='/cotacoes/nova')page=<PaginaNovaCotacao/>
  else if(pathname==='/cotacao-ol')page=<PaginaCotacaoOL/>
  else if(pathname==='/produtos')page=<PaginaProdutos/>
  else if(pathname==='/dados-farmacia')page=<PaginaConfiguracoes/>
  else if(pathname==='/usuarios')page=<PaginaUsuarios/>
  else if(pathname==='/alterar-senha')page=<PaginaAlterarSenha/>
  else if(pathname==='/configuracoes')page=<Redirecionar to="/dados-farmacia" replace/>
  else {const match=pathname.match(/^\/cotacoes\/(\d+)$/);page=match?<ProvedorParametros params={{id:match[1]}}><PaginaDetalheCotacao/></ProvedorParametros>:<Redirecionar to="/" replace/>}
  return <RotaProtegida><LayoutSistema><ConteudoAssincrono>{page}</ConteudoAssincrono></LayoutSistema></RotaProtegida>
}

function ConteudoAssincrono({children}:{children:ReactNode}){
  return <Suspense fallback={<EsqueletoRota/>}>{children}</Suspense>
}

function EsqueletoRota(){
  return <div className="page route-skeleton" aria-busy="true"><span className="sr-only" role="status">Carregando página.</span><div className="route-skeleton-header" aria-hidden="true"><span className="skeleton-block route-skeleton-eyebrow"/><span className="skeleton-block route-skeleton-title"/><span className="skeleton-block route-skeleton-description"/></div><section className="card route-skeleton-card" aria-hidden="true"><span className="skeleton-block route-skeleton-card-title"/><span className="skeleton-block route-skeleton-line wide"/><span className="skeleton-block route-skeleton-line"/><span className="skeleton-block route-skeleton-line short"/></section></div>
}
