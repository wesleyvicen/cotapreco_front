import { BarChart3, Boxes, Building2, ChevronRight, ClipboardList, KeyRound, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Users, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { LinkNavegacao } from '../roteamento'
import { usarAutenticacao } from '../autenticacao'

const links=[{to:'/',label:'Painel',icon:BarChart3,end:true},{to:'/cotacoes',label:'Cotações',icon:ClipboardList},{to:'/produtos',label:'Produtos',icon:Boxes}]
const SIDEBAR_RECOLHIDA_KEY='cotapreco:sidebar-recolhida'

function lerPreferenciaMenu(){
  try{return window.localStorage.getItem(SIDEBAR_RECOLHIDA_KEY)==='true'}catch{return false}
}

export default function LayoutSistema({children}:{children:ReactNode}){
  const {user,logout}=usarAutenticacao(); const [open,setOpen]=useState(false); const [recolhida,setRecolhida]=useState(lerPreferenciaMenu)
  useEffect(()=>{try{window.localStorage.setItem(SIDEBAR_RECOLHIDA_KEY,String(recolhida))}catch{/* Preferência é opcional quando o navegador bloqueia armazenamento. */}},[recolhida])
  const fecharMenuMobile=()=>setOpen(false)
  const tituloNavegacao=(label:string)=>recolhida?label:undefined
  return <div className={`app-shell ${recolhida?'app-shell-sidebar-recolhida':''}`}>
    <aside className={`sidebar ${open?'sidebar-open':''} ${recolhida?'sidebar-recolhida':''}`}>
      <div className="brand"><div className="brand-mark"><img src="/cotapreco-icon.png" alt=""/></div><div className="brand-copy"><strong>CotaPreço</strong><span>Compras inteligentes</span></div><button aria-label={recolhida?'Expandir menu':'Minimizar menu'} className="icon-button sidebar-toggle" title={recolhida?'Expandir menu':'Minimizar menu'} onClick={()=>setRecolhida(valor=>!valor)}>{recolhida?<PanelLeftOpen size={20}/>:<PanelLeftClose size={20}/>}</button><button className="icon-button sidebar-close" onClick={()=>setOpen(false)}><X size={20}/></button></div>
      <nav>{links.map(({to,label,icon:Icon,end})=><LinkNavegacao key={to} to={to} end={end} aria-label={label} title={tituloNavegacao(label)} onClick={fecharMenuMobile}><Icon size={20}/><span>{label}</span><ChevronRight className="nav-chevron" size={16}/></LinkNavegacao>)}{user?.role==='ADMIN'&&<><div className="nav-divider"/><span className="nav-label">Administração</span><LinkNavegacao to="/usuarios" aria-label="Usuários" title={tituloNavegacao('Usuários')} onClick={fecharMenuMobile}><Users size={20}/><span>Usuários</span><ChevronRight className="nav-chevron" size={16}/></LinkNavegacao><LinkNavegacao to="/dados-farmacia" aria-label="Dados da farmácia" title={tituloNavegacao('Dados da farmácia')} onClick={fecharMenuMobile}><Building2 size={20}/><span>Dados da farmácia</span><ChevronRight className="nav-chevron" size={16}/></LinkNavegacao></>}<div className="nav-divider"/><span className="nav-label">Minha conta</span><LinkNavegacao to="/alterar-senha" aria-label="Alterar senha" title={tituloNavegacao('Alterar senha')} onClick={fecharMenuMobile}><KeyRound size={20}/><span>Alterar senha</span><ChevronRight className="nav-chevron" size={16}/></LinkNavegacao></nav>
      <div className="account"><div className="avatar">{user?.name.slice(0,2).toUpperCase()}</div><div><strong>{user?.name}</strong><span>{user?.companyName}</span></div><button className="icon-button" title="Sair" onClick={()=>void logout()}><LogOut size={19}/></button></div>
    </aside>
    {open&&<button aria-label="Fechar menu" className="sidebar-backdrop" onClick={()=>setOpen(false)}/>} 
    <div className="main-area"><header className="mobile-header"><button className="icon-button" onClick={()=>setOpen(true)}><Menu/></button><div className="brand compact"><div className="brand-mark"><img src="/cotapreco-icon.png" alt=""/></div><strong>CotaPreço</strong></div><div className="avatar small">{user?.name[0]}</div></header><main>{children}</main></div>
  </div>
}
