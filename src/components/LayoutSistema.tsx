import { BarChart3, Boxes, ChevronRight, ClipboardList, LogOut, Menu, Settings, Users, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { LinkNavegacao } from '../roteamento'
import { usarAutenticacao } from '../autenticacao'

const links=[{to:'/',label:'Painel',icon:BarChart3,end:true},{to:'/cotacoes',label:'Cotações',icon:ClipboardList},{to:'/produtos',label:'Produtos',icon:Boxes}]
export default function LayoutSistema({children}:{children:ReactNode}){
  const {user,logout}=usarAutenticacao(); const [open,setOpen]=useState(false)
  return <div className="app-shell">
    <aside className={`sidebar ${open?'sidebar-open':''}`}>
      <div className="brand"><div className="brand-mark">C$</div><div><strong>CotaPreço</strong><span>Compras inteligentes</span></div><button className="icon-button sidebar-close" onClick={()=>setOpen(false)}><X size={20}/></button></div>
      <nav>{links.map(({to,label,icon:Icon,end})=><LinkNavegacao key={to} to={to} end={end} onClick={()=>setOpen(false)}><Icon size={20}/><span>{label}</span><ChevronRight className="nav-chevron" size={16}/></LinkNavegacao>)}<div className="nav-divider"/><span className="nav-label">Administração</span><button className="nav-disabled"><Users size={20}/>Usuários</button><button className="nav-disabled"><Settings size={20}/>Configurações</button></nav>
      <div className="account"><div className="avatar">{user?.name.slice(0,2).toUpperCase()}</div><div><strong>{user?.name}</strong><span>{user?.companyName}</span></div><button className="icon-button" title="Sair" onClick={logout}><LogOut size={19}/></button></div>
    </aside>
    {open&&<button aria-label="Fechar menu" className="sidebar-backdrop" onClick={()=>setOpen(false)}/>} 
    <div className="main-area"><header className="mobile-header"><button className="icon-button" onClick={()=>setOpen(true)}><Menu/></button><div className="brand compact"><div className="brand-mark">C$</div><strong>CotaPreço</strong></div><div className="avatar small">{user?.name[0]}</div></header><main>{children}</main></div>
  </div>
}
