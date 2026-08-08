import { ArrowRight, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { api, date } from '../api'
import { EstadoVazio, AvisoErro, Carregando, EtiquetaStatus } from '../components/ComponentesUI'
import type { ResumoCotacao, StatusCotacao } from '../types'
import { LinkInterno } from '../roteamento'

export default function PaginaCotacoes(){
  const [items,setItems]=useState<ResumoCotacao[]>([]);const[loading,setLoading]=useState(true);const[error,setError]=useState('');const[search,setSearch]=useState('');const[filter,setFilter]=useState<'ALL'|StatusCotacao>('ALL')
  useEffect(()=>{api<ResumoCotacao[]>('/quotations').then(setItems).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[])
  const filtered=useMemo(()=>items.filter(q=>(filter==='ALL'||q.status===filter)&&q.name.toLowerCase().includes(search.toLowerCase())),[items,filter,search])
  return <div className="page"><div className="page-header"><div><span className="eyebrow green">Central de compras</span><h1>Cotações</h1><p>Crie, compartilhe e compare propostas.</p></div><LinkInterno className="button button-primary" to="/cotacoes/nova"><Plus/>Nova cotação</LinkInterno></div><div className="toolbar"><label className="search"><Search/><input placeholder="Buscar cotação..." value={search} onChange={e=>setSearch(e.target.value)}/></label><select value={filter} onChange={e=>setFilter(e.target.value as typeof filter)}><option value="ALL">Todos os status</option><option value="DRAFT">Rascunho</option><option value="OPEN">Aberta</option><option value="CLOSED">Fechada</option><option value="COMPLETED">Finalizada</option></select></div>{error&&<AvisoErro message={error}/>} {loading?<Carregando/>:filtered.length===0?<EstadoVazio title="Nenhuma cotação encontrada" description="Crie uma nova cotação ou altere os filtros."/>:<div className="card table-card"><div className="table-wrap"><table><thead><tr><th>Cotação</th><th>Criada em</th><th>Produtos</th><th>Respostas</th><th>StatusCotacao</th><th>Prazo</th><th/></tr></thead><tbody>{filtered.map(q=><tr key={q.id}><td><strong>{q.name}</strong></td><td>{date(q.createdAt)}</td><td>{q.productCount}</td><td><span className="response-count">{q.submittedResponses}</span> recebida{q.submittedResponses!==1?'s':''}</td><td><EtiquetaStatus status={q.status}/></td><td>{date(q.expiresAt)}</td><td><LinkInterno className="row-link" to={`/cotacoes/${q.id}`}><ArrowRight/></LinkInterno></td></tr>)}</tbody></table></div></div>}</div>
}
