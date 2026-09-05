import { Pencil, Plus, ShieldCheck, UserRound, Users } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { api, ErroApi } from '../api'
import { usarCamadaNoHistorico } from '../hooks/usarCamadaNoHistorico'
import { usarAutenticacao } from '../autenticacao'
import { AvisoErro, Carregando } from '../components/ComponentesUI'
import SeletorFarmacias from '../components/SeletorFarmacias'
import { isAdminDoGrupo } from '../lib/permissoes'
import type { AcessoEmpresaUsuario, Empresa, UsuarioAdministracao } from '../types'

const perfis={ADMIN:'Administrador',BUYER:'Comprador',VIEWER:'Visualizador'} as const

/* Resumo do acesso de um usuário para a listagem: agrupa por perfil (normalmente só um, mas
   o modelo permite perfis diferentes por farmácia) e troca a lista de nomes por "todas as
   farmácias" quando o grupo inteiro está coberto. */
function resumoAcesso(acessos:AcessoEmpresaUsuario[], totalFarmacias:number) {
  const porPerfil=new Map<AcessoEmpresaUsuario['role'],string[]>()
  acessos.forEach(a=>{ const lista=porPerfil.get(a.role)??[]; lista.push(a.companyName); porPerfil.set(a.role,lista) })
  return [...porPerfil.entries()].map(([perfil,nomes])=>({
    perfil, texto: nomes.length>=totalFarmacias&&totalFarmacias>1 ? 'todas as farmácias' : `em: ${nomes.join(', ')}`,
  }))
}

export default function PaginaUsuarios(){
  const {user}=usarAutenticacao()
  const [usuarios,setUsuarios]=useState<UsuarioAdministracao[]|null>(null)
  const [empresas,setEmpresas]=useState<Empresa[]|null>(null)
  const [erro,setErro]=useState('')
  const [mensagem,setMensagem]=useState('')
  const [mostrarForm,setMostrarForm]=useState(false)
  const [nome,setNome]=useState('')
  const [email,setEmail]=useState('')
  const [senha,setSenha]=useState('')
  const [perfil,setPerfil]=useState<UsuarioAdministracao['access'][number]['role']>('BUYER')
  const [empresaIds,setEmpresaIds]=useState<number[]>([])
  const [ocupado,setOcupado]=useState(false)
  const [editando,setEditando]=useState<UsuarioAdministracao|null>(null)
  const [perfilEdicao,setPerfilEdicao]=useState<'BUYER'|'VIEWER'>('BUYER')
  const [empresaIdsEdicao,setEmpresaIdsEdicao]=useState<number[]>([])
  const [erroEdicao,setErroEdicao]=useState('')
  const [salvandoEdicao,setSalvandoEdicao]=useState(false)
  const admin=isAdminDoGrupo(user)

  const carregar=()=>{
    api<UsuarioAdministracao[]>('/users').then(setUsuarios).catch(e=>setErro(e instanceof ErroApi?e.message:'Não foi possível carregar os usuários.'))
    api<Empresa[]>('/companies').then(setEmpresas).catch(()=>{})
  }
  useEffect(()=>{if(admin)carregar()},[admin])
  /* O voltar do navegador fecha o modal aberto em vez de sair da administração. */
  usarCamadaNoHistorico(mostrarForm||editando!==null,()=>{setMostrarForm(false);setEditando(null)})

  const farmaciasAtivas=(empresas??[]).filter(e=>e.ativo)

  const criar=async(evento:FormEvent)=>{
    evento.preventDefault(); setErro(''); setMensagem('')
    if(perfil!=='ADMIN'&&empresaIds.length===0){ setErro('Escolha pelo menos uma farmácia para este usuário.'); return }
    setOcupado(true)
    try{
      const criado=await api<UsuarioAdministracao>('/users',{method:'POST',body:JSON.stringify({
        nome,email,senha,perfil,empresaIds:perfil==='ADMIN'?undefined:empresaIds,
      })})
      setUsuarios(atual=>{
        const semEsse=(atual??[]).filter(u=>u.id!==criado.id)
        return [...semEsse,criado].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'))
      })
      setNome(''); setEmail(''); setSenha(''); setPerfil('BUYER'); setEmpresaIds([]); setMostrarForm(false)
      setMensagem(`${criado.name} já pode acessar o sistema.`)
    }catch(e){ setErro(e instanceof ErroApi?e.message:'Não foi possível criar o usuário.') }
    finally{ setOcupado(false) }
  }

  const abrirEdicao=(u:UsuarioAdministracao)=>{
    setErro(''); setMensagem(''); setErroEdicao('')
    setEditando(u)
    setPerfilEdicao((u.access[0]?.role as 'BUYER'|'VIEWER')??'BUYER')
    setEmpresaIdsEdicao(u.access.map(a=>a.companyId))
  }

  const salvarEdicao=async(evento:FormEvent)=>{
    evento.preventDefault(); setErroEdicao('')
    if(!editando)return
    if(empresaIdsEdicao.length===0){ setErroEdicao('Escolha pelo menos uma farmácia para este usuário.'); return }
    setSalvandoEdicao(true)
    try{
      const atualizado=await api<UsuarioAdministracao>(`/users/${editando.id}/access`,{method:'PUT',body:JSON.stringify({
        perfil:perfilEdicao,empresaIds:empresaIdsEdicao,
      })})
      setUsuarios(atual=>(atual??[]).map(u=>u.id===atualizado.id?atualizado:u))
      setEditando(null)
      setMensagem(`Acesso de ${atualizado.name} atualizado.`)
    }catch(e){ setErroEdicao(e instanceof ErroApi?e.message:'Não foi possível salvar o acesso.') }
    finally{ setSalvandoEdicao(false) }
  }

  if(!admin)return <div className="page"><AvisoErro message="Somente administradores podem gerenciar usuários."/></div>
  if(!usuarios)return <div className="page"><Carregando/>{erro&&<AvisoErro message={erro}/>}</div>

  return <div className="page">
    <div className="page-header"><div><span className="eyebrow green">Administração</span><h1>Usuários</h1><p>Controle quem pode acessar cada farmácia da sua conta.</p></div>
      <button className="button button-primary" onClick={()=>{setErro('');setMensagem('');setMostrarForm(true)}}><Plus/>Novo usuário</button></div>
    {mensagem&&<div className="alert alert-success">{mensagem}</div>}
    {erro&&!mostrarForm&&<AvisoErro message={erro}/>}
    <section className="card">
      <div className="card-header"><div><h2><Users/> Equipe do grupo</h2><p>{usuarios.length} usuário{usuarios.length!==1?'s':''} com acesso.</p></div></div>
      {usuarios.length===0
        ? <div className="empty-users"><UserRound/><strong>Nenhum usuário cadastrado</strong><span>Crie o primeiro acesso para sua equipe.</span></div>
        : <div className="table-wrap"><table><thead><tr><th>Usuário</th><th>Acesso</th><th>Status</th><th>Cadastro</th><th/></tr></thead><tbody>
            {usuarios.map(u=>{const ehAdmin=u.access.some(a=>a.role==='ADMIN');return <tr key={u.id}>
              <td><div className="user-cell"><div className="avatar small">{u.name.slice(0,2).toUpperCase()}</div><div><strong>{u.name}</strong><span>{u.email}</span></div></div></td>
              <td><div className="role-tag-stack">{resumoAcesso(u.access,farmaciasAtivas.length).map(({perfil:p,texto})=>
                <span key={p} className={`role-tag role-${p.toLowerCase()}`}>{p==='ADMIN'&&<ShieldCheck/>}{perfis[p]} · {texto}</span>)}</div></td>
              <td><span className={u.active?'status-active':'status-inactive'}>{u.active?'Ativo':'Inativo'}</span></td>
              <td>{new Intl.DateTimeFormat('pt-BR',{dateStyle:'short'}).format(new Date(u.createdAt))}</td>
              <td>{!ehAdmin&&<button type="button" className="icon-button" title="Editar acesso" onClick={()=>abrirEdicao(u)}><Pencil size={16}/></button>}</td>
            </tr>})}
          </tbody></table></div>}
    </section>
    {mostrarForm&&<div className="modal-backdrop" role="presentation"><form className="modal user-modal" onSubmit={criar}>
      <div className="modal-header"><div className="modal-icon"><UserRound/></div><div><h2>Novo usuário</h2><p>Escolha o perfil e onde ele vai ter acesso.</p></div>
        <button type="button" className="icon-button" onClick={()=>setMostrarForm(false)}>×</button></div>
      {erro&&<AvisoErro message={erro}/>}
      <div className="user-form">
        <label>Nome<input value={nome} onChange={e=>setNome(e.target.value)} autoComplete="name" maxLength={120} required/></label>
        <label>E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" maxLength={180} required/></label>
        <label>Perfil<select value={perfil} onChange={e=>setPerfil(e.target.value as typeof perfil)}>
          <option value="BUYER">Comprador — cria e edita cotações</option>
          <option value="VIEWER">Visualizador — somente consulta</option>
          <option value="ADMIN">Administrador — gerencia conta e equipe</option>
        </select></label>
        <label>Senha inicial<input type="password" value={senha} onChange={e=>setSenha(e.target.value)} autoComplete="new-password" minLength={8} required/><small>No mínimo 8 caracteres.</small></label>
      </div>
      {perfil==='ADMIN'
        ? <p className="modal-nota">Administrador tem acesso a todas as farmácias do grupo — as de agora e as que forem criadas depois.</p>
        : <div className="farmacia-checklist-campo">
            <span>Farmácias com acesso</span>
            {farmaciasAtivas.length===0
              ? <p className="modal-nota">Nenhuma farmácia ativa encontrada.</p>
              : <SeletorFarmacias empresas={farmaciasAtivas} selecionadas={empresaIds} aoAlterar={setEmpresaIds}/>}
          </div>}
      <div className="modal-actions"><button type="button" className="button button-ghost" onClick={()=>setMostrarForm(false)}>Cancelar</button>
        <button className="button button-primary" disabled={ocupado}>{ocupado?'Criando...':'Criar usuário'}</button></div>
    </form></div>}
    {editando&&<div className="modal-backdrop" role="presentation"><form className="modal user-modal" onSubmit={salvarEdicao}>
      <div className="modal-header"><div className="modal-icon"><Pencil/></div><div><h2>Editar acesso</h2><p>{editando.name}</p></div>
        <button type="button" className="icon-button" onClick={()=>setEditando(null)}>×</button></div>
      {erroEdicao&&<AvisoErro message={erroEdicao}/>}
      <div className="user-form">
        <label>Perfil<select value={perfilEdicao} onChange={e=>setPerfilEdicao(e.target.value as typeof perfilEdicao)}>
          <option value="BUYER">Comprador — cria e edita cotações</option>
          <option value="VIEWER">Visualizador — somente consulta</option>
        </select></label>
      </div>
      <div className="farmacia-checklist-campo">
        <span>Farmácias com acesso</span>
        {farmaciasAtivas.length===0
          ? <p className="modal-nota">Nenhuma farmácia ativa encontrada.</p>
          : <SeletorFarmacias empresas={farmaciasAtivas} selecionadas={empresaIdsEdicao} aoAlterar={setEmpresaIdsEdicao}/>}
      </div>
      <div className="modal-actions"><button type="button" className="button button-ghost" onClick={()=>setEditando(null)}>Cancelar</button>
        <button className="button button-primary" disabled={salvandoEdicao}>{salvandoEdicao?'Salvando...':'Salvar acesso'}</button></div>
    </form></div>}
  </div>
}
