import { Building2, Save } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { api, ErroApi } from '../api'
import { usarAutenticacao } from '../autenticacao'
import { AvisoErro, Carregando } from '../components/ComponentesUI'
import type { Empresa } from '../types'

export default function PaginaConfiguracoes(){
  const{user}=usarAutenticacao();const[empresa,setEmpresa]=useState<Empresa|null>(null);const[nome,setNome]=useState('');const[cnpj,setCnpj]=useState('');const[erro,setErro]=useState('');const[mensagem,setMensagem]=useState('');const[ocupado,setOcupado]=useState(false)
  useEffect(()=>{api<Empresa>('/company').then(e=>{setEmpresa(e);setNome(e.nome);setCnpj(formatarCnpj(e.cnpj??''))}).catch(e=>setErro(e instanceof ErroApi?e.message:'Falha ao carregar os dados.'))},[])
  const salvar=async(event:FormEvent)=>{event.preventDefault();setErro('');setMensagem('');setOcupado(true);try{const atualizada=await api<Empresa>('/company',{method:'PUT',body:JSON.stringify({nome,cnpj:cnpj.replace(/\D/g,'')})});setEmpresa(atualizada);setCnpj(formatarCnpj(atualizada.cnpj??''));setMensagem('Dados da farmácia atualizados. Agora você já pode gerar os pedidos.')}catch(e){setErro(e instanceof ErroApi?e.message:'Não foi possível salvar.')}finally{setOcupado(false)}}
  if(!empresa)return <div className="page"><Carregando/>{erro&&<AvisoErro message={erro}/>}</div>
  return <div className="page"><div className="page-header"><div><span className="eyebrow green">Administração</span><h1>Dados da farmácia</h1><p>Informações usadas nos pedidos de compra.</p></div></div><section className="card settings-card"><div className="card-header"><div><h2><Building2/> Identificação fiscal</h2><p>O CNPJ é obrigatório para gerar pedidos em PDF e imagem.</p></div></div><form className="stack-form settings-form" onSubmit={salvar}>{erro&&<AvisoErro message={erro}/>} {mensagem&&<div className="alert alert-success">{mensagem}</div>}<label>Nome da farmácia<input required maxLength={160} disabled={user?.role!=='ADMIN'} value={nome} onChange={e=>setNome(e.target.value)}/></label><label>CNPJ<input required inputMode="numeric" maxLength={18} disabled={user?.role!=='ADMIN'} value={cnpj} onChange={e=>setCnpj(formatarCnpj(e.target.value))}/><small>Informe os 14 dígitos do CNPJ.</small></label>{user?.role==='ADMIN'?<button className="button button-primary" disabled={ocupado}><Save/>{ocupado?'Salvando...':'Salvar dados'}</button>:<div className="alert alert-warning">Somente administradores podem alterar estes dados.</div>}</form></section></div>
}

function formatarCnpj(valor:string){const digitos=valor.replace(/\D/g,'').slice(0,14);return digitos.replace(/^(\d{2})(\d)/,'$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3').replace(/\.(\d{3})(\d)/,'.$1/$2').replace(/(\d{4})(\d)/,'$1-$2')}
