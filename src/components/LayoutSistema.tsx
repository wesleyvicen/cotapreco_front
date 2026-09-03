import { BadgeCheck, BarChart3, Boxes, Building2, ChevronRight, ClipboardList, KeyRound, LogOut, Menu, PackageSearch, PanelLeftClose, PanelLeftOpen, Users, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import FaixaAssinatura from './FaixaAssinatura'
import FaixaConfirmacaoEmail from './FaixaConfirmacaoEmail'
import AvisoEmailConfirmado from './AvisoEmailConfirmado'
import { AssinaturaEmpresa } from './RodapeEmpresa'
import { LinkNavegacao } from '../roteamento'
import { usarAutenticacao } from '../autenticacao'
import { empresaAtiva, isAdminAtivo, isAdminDoGrupo, trocarEmpresaAtiva } from '../lib/permissoes'

const links=[{to:'/',label:'Painel',icon:BarChart3,end:true},{to:'/cotacoes',label:'Cotações',icon:ClipboardList},{to:'/cotacao-ol',label:'Cotação para OL',icon:PackageSearch},{to:'/produtos',label:'Produtos',icon:Boxes}]
const SIDEBAR_RECOLHIDA_KEY='cotapreco:sidebar-recolhida'
/* Mesmo ponto de corte do menu em styles.css — abaixo dele o menu vira gaveta e o
   recolhimento em rail de ícones do desktop deixa de fazer sentido. */
const CONSULTA_MOBILE='(max-width:760px)'

function lerPreferenciaMenu(){
  try{return window.localStorage.getItem(SIDEBAR_RECOLHIDA_KEY)==='true'}catch{return false}
}

/* No iOS, o Safari normal e o app adicionado à tela de início guardam localStorage em
   compartimentos separados. Quem tocou sem querer no botão de recolher o menu — que
   fica ao lado do X de fechar, no cabeçalho da gaveta mobile — carrega essa marca só
   naquele Safari; o app instalado nunca a vê e por isso "funciona sozinho". A marca em
   si nunca devia valer no celular: o CSS do rail de ícones do desktop não tem tradução
   para a gaveta mobile. Em vez de tentar migrar quem já tem a marca salva, ignoramos o
   valor sempre que a tela está no tamanho de celular — o que também corrige sozinho
   quem já ficou com o menu quebrado. */
function lerMobile(){
  return window.matchMedia(CONSULTA_MOBILE).matches
}

export default function LayoutSistema({children}:{children:ReactNode}){
  const {user,logout}=usarAutenticacao(); const [open,setOpen]=useState(false); const [recolhida,setRecolhida]=useState(lerPreferenciaMenu); const [mobile,setMobile]=useState(lerMobile)
  useEffect(()=>{try{window.localStorage.setItem(SIDEBAR_RECOLHIDA_KEY,String(recolhida))}catch{/* Preferência é opcional quando o navegador bloqueia armazenamento. */}},[recolhida])
  useEffect(()=>{const consulta=window.matchMedia(CONSULTA_MOBILE);const atualizar=()=>setMobile(consulta.matches);consulta.addEventListener('change',atualizar);return()=>consulta.removeEventListener('change',atualizar)},[])
  const recolhidaEfetiva=recolhida&&!mobile
  const fecharMenuMobile=()=>setOpen(false)
  const tituloNavegacao=(label:string)=>recolhidaEfetiva?label:undefined
  return <div className={`app-shell ${recolhidaEfetiva?'app-shell-sidebar-recolhida':''}`}>
    <aside className={`sidebar ${open?'sidebar-open':''} ${recolhidaEfetiva?'sidebar-recolhida':''}`}>
      <div className="brand"><div className="brand-mark"><img src="/cotapreco-icon.png" alt=""/></div><div className="brand-copy"><strong>CotaPreço</strong><span>Compras inteligentes</span></div><button aria-label={recolhida?'Expandir menu':'Minimizar menu'} className="icon-button sidebar-toggle" title={recolhida?'Expandir menu':'Minimizar menu'} onClick={()=>setRecolhida(valor=>!valor)}>{recolhida?<PanelLeftOpen size={20}/>:<PanelLeftClose size={20}/>}</button><button className="icon-button sidebar-close" onClick={()=>setOpen(false)}><X size={20}/></button></div>
      <nav>{links.map(({to,label,icon:Icon,end})=><LinkNavegacao key={to} to={to} end={end} aria-label={label} title={tituloNavegacao(label)} onClick={fecharMenuMobile}><Icon size={20}/><span>{label}</span><ChevronRight className="nav-chevron" size={16}/></LinkNavegacao>)}{(isAdminAtivo(user)||isAdminDoGrupo(user))&&<><div className="nav-divider"/><span className="nav-label">Administração</span>{isAdminAtivo(user)&&<LinkNavegacao to="/usuarios" aria-label="Usuários" title={tituloNavegacao('Usuários')} onClick={fecharMenuMobile}><Users size={20}/><span>Usuários</span><ChevronRight className="nav-chevron" size={16}/></LinkNavegacao>}<LinkNavegacao to="/dados-farmacia" aria-label="Dados da farmácia" title={tituloNavegacao('Dados da farmácia')} onClick={fecharMenuMobile}><Building2 size={20}/><span>Dados da farmácia</span><ChevronRight className="nav-chevron" size={16}/></LinkNavegacao></>}<div className="nav-divider"/><span className="nav-label">Minha conta</span><LinkNavegacao to="/assinatura" aria-label="Assinatura" title={tituloNavegacao('Assinatura')} onClick={fecharMenuMobile}><BadgeCheck size={20}/><span>Assinatura</span><ChevronRight className="nav-chevron" size={16}/></LinkNavegacao><LinkNavegacao to="/alterar-senha" aria-label="Alterar senha" title={tituloNavegacao('Alterar senha')} onClick={fecharMenuMobile}><KeyRound size={20}/><span>Alterar senha</span><ChevronRight className="nav-chevron" size={16}/></LinkNavegacao></nav>
      <div className="account"><div className="avatar">{user?.name.slice(0,2).toUpperCase()}</div><div><strong>{user?.name}</strong>{(user?.companies.length??0)>1?<select className="empresa-switch" aria-label="Trocar de farmácia" value={empresaAtiva(user)?.id} onChange={e=>trocarEmpresaAtiva(Number(e.target.value))}>{user!.companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>:<span>{empresaAtiva(user)?.name}</span>}</div><button className="icon-button" title="Sair" onClick={()=>void logout()}><LogOut size={19}/></button></div>
    </aside>
    {open&&<button aria-label="Fechar menu" className="sidebar-backdrop" onClick={()=>setOpen(false)}/>} 
    <div className="main-area"><header className="mobile-header"><button className="icon-button" onClick={()=>setOpen(true)}><Menu/></button><div className="brand compact"><div className="brand-mark"><img src="/cotapreco-icon.png" alt=""/></div><strong>CotaPreço</strong></div><div className="avatar small">{user?.name[0]}</div></header><main><AvisoEmailConfirmado/><FaixaAssinatura/><FaixaConfirmacaoEmail/>{children}</main><footer className="rodape-sistema"><AssinaturaEmpresa/></footer></div>
  </div>
}
