import { ArrowRight, BarChart3, CheckCircle2, Search } from 'lucide-react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { api, date } from '../api'
import { usarAutenticacao } from '../autenticacao'
import { criarChave } from '../cache/cacheConsulta'
import { usarConsulta } from '../hooks/usarConsulta'
import { empresaAtiva } from '../lib/permissoes'
import { EstadoVazio, AvisoErro, Carregando, EtiquetaStatus } from '../components/ComponentesUI'
import type { ResumoCotacao, StatusCotacao } from '../types'
import BotaoNovaCotacao from '../components/BotaoNovaCotacao'
import { LinkInterno, usarParametrosBusca } from '../roteamento'

/* Só o comparativo desenha gráficos, e chegar nele exige selecionar duas cotações com pedido
   gerado. Mantê-lo aqui fazia a lista baixar recharts junto, para quem talvez nunca compare. */
const ComparativoCotacoes=lazy(()=>import('./ComparativoCotacoes'))

const MAX_COTACOES=8
type Periodo='ALL'|'90'|'365'

const idsDaBusca=(valor:string|null)=>valor?.split(',').map(Number).filter(Number.isFinite).slice(0,MAX_COTACOES)??[]
/* A lista é da farmácia ativa, o mesmo recorte que o backend usa no cache COTACOES_EMPRESA. */
function cotacoesValidas(valor:unknown):valor is ResumoCotacao[] {
  return Array.isArray(valor)&&valor.every(item=>item!=null&&typeof item==='object'&&typeof (item as ResumoCotacao).id==='number'&&typeof (item as ResumoCotacao).name==='string')
}

export default function PaginaCotacoes(){
  const{user}=usarAutenticacao();const empresa=empresaAtiva(user)
  const{data,carregando:loading,erro:error}=usarConsulta<ResumoCotacao[]>(
    empresa?criarChave('cotacoes',empresa.id):null,
    ()=>api<ResumoCotacao[]>('/quotations'),
    {valido:cotacoesValidas,revalidarComPush:true,mensagemErro:'Não foi possível carregar as cotações.'},
  )
  const items=useMemo(()=>data??[],[data])
  const[search,setSearch]=useState('');const[filter,setFilter]=useState<'ALL'|StatusCotacao>('ALL');const[periodo,setPeriodo]=useState<Periodo>('ALL');const[compradas,setCompradas]=useState<'ALL'|'ELIGIBLE'|'NOT_ELIGIBLE'>('ALL')
  const[params,setParams]=usarParametrosBusca();const[selection,setSelection]=useState<number[]>(()=>idsDaBusca(params.get('ids')));const comparando=params.get('comparison')==='1'
  const filtered=useMemo(()=>{const limite=periodo==='ALL'?null:Date.now()-Number(periodo)*86400000;return items.filter(q=>(filter==='ALL'||q.status===filter)&&q.name.toLowerCase().includes(search.toLowerCase())&&(limite===null||new Date(q.createdAt).getTime()>=limite)&&(compradas==='ALL'||(compradas==='ELIGIBLE'?q.purchaseComparisonEligible:!q.purchaseComparisonEligible)))},[items,filter,search,periodo,compradas])
  const selecionadas=useMemo(()=>items.filter(q=>selection.includes(q.id)),[items,selection])
  const alterarSelecao=(id:number)=>setSelection(atual=>atual.includes(id)?atual.filter(valor=>valor!==id):(atual.length>=MAX_COTACOES?atual:[...atual,id]))
  const selecionarVisiveis=()=>setSelection(atual=>{const elegiveis=filtered.filter(q=>q.purchaseComparisonEligible).map(q=>q.id);if(elegiveis.length>0&&elegiveis.every(id=>atual.includes(id)))return atual.filter(id=>!elegiveis.includes(id));const disponiveis=elegiveis.filter(id=>!atual.includes(id));return [...atual,...disponiveis].slice(0,MAX_COTACOES)})
  const comparar=()=>setParams({comparison:'1',ids:selection.join(',')})
  const voltar=()=>setParams(selection.length?{ids:selection.join(',')}:{})
  if(comparando)return <Suspense fallback={<Carregando/>}><ComparativoCotacoes cotacoes={selecionadas} listaCarregando={loading} aoVoltar={voltar}/></Suspense>
  return <div className="page quotations-page"><div className="page-header"><div><span className="eyebrow green">Central de compras</span><h1>Cotações</h1><p>Crie, compartilhe e acompanhe suas compras.</p></div><BotaoNovaCotacao/></div>
    <div className="toolbar quotations-toolbar"><label className="search"><Search/><input placeholder="Buscar cotação..." value={search} onChange={e=>setSearch(e.target.value)}/></label><select aria-label="Status" value={filter} onChange={e=>setFilter(e.target.value as typeof filter)}><option value="ALL">Todos os status</option><option value="DRAFT">Rascunho</option><option value="OPEN">Aberta</option><option value="CLOSED">Fechada</option><option value="COMPLETED">Finalizada</option></select><select aria-label="Período" value={periodo} onChange={e=>setPeriodo(e.target.value as Periodo)}><option value="ALL">Todo período</option><option value="90">Últimos 90 dias</option><option value="365">Último ano</option></select><select aria-label="Disponibilidade de comparação" value={compradas} onChange={e=>setCompradas(e.target.value as typeof compradas)}><option value="ALL">Todas as cotações</option><option value="ELIGIBLE">Com compras realizadas</option><option value="NOT_ELIGIBLE">Sem compras realizadas</option></select></div>
    {selection.length>0&&<div className="comparison-selection"><div><BarChart3/><span><strong>{selection.length} {selection.length===1?'cotação selecionada':'cotações selecionadas'}</strong><small>Escolha de 2 a {MAX_COTACOES} cotações com pedidos gerados.</small></span></div><div className="comparison-selection-actions"><button className="button button-ghost" onClick={()=>setSelection([])}>Limpar</button><button className="button button-primary" disabled={selection.length<2} onClick={comparar}><BarChart3/>Comparar cotações</button></div></div>}
    {error&&<AvisoErro message={error}/>} {loading?<Carregando/>:filtered.length===0?<EstadoVazio title="Nenhuma cotação encontrada" description="Crie uma nova cotação ou altere os filtros."/>:<div className="card table-card"><div className="table-wrap"><table className="quotations-table"><thead><tr><th><input type="checkbox" aria-label="Selecionar cotações visíveis" checked={filtered.filter(q=>q.purchaseComparisonEligible).length>0&&filtered.filter(q=>q.purchaseComparisonEligible).every(q=>selection.includes(q.id))} onChange={selecionarVisiveis}/></th><th>Cotação</th><th>Criada em</th><th>Produtos</th><th>Respostas</th><th>Status</th><th>Compra</th><th>Prazo</th><th/></tr></thead><tbody>{filtered.map(q=>{const selecionada=selection.includes(q.id);return <tr key={q.id} className={selecionada?'selected-row':''}><td><input type="checkbox" aria-label={`Selecionar ${q.name}`} checked={selecionada} disabled={!q.purchaseComparisonEligible||(!selecionada&&selection.length>=MAX_COTACOES)} title={!q.purchaseComparisonEligible?'Esta cotação ainda não possui pedido gerado ou compartilhado.':selection.length>=MAX_COTACOES&&!selecionada?`O comparativo aceita até ${MAX_COTACOES} cotações.`:undefined} onChange={()=>alterarSelecao(q.id)}/></td><td><strong>{q.name}</strong>{q.demo&&<span className="badge badge-demo">Demonstração</span>}</td><td>{date(q.createdAt)}</td><td>{q.productCount}</td><td><span className="response-count">{q.submittedResponses}</span> recebida{q.submittedResponses!==1?'s':''}</td><td><EtiquetaStatus status={q.status}/></td><td>{q.purchaseComparisonEligible?<span className="purchase-ready"><CheckCircle2/> {q.purchasedItemCount} item{q.purchasedItemCount!==1?'s':''}</span>:<span className="muted" title="Gere ou compartilhe um pedido para comparar esta cotação.">Sem pedido</span>}</td><td>{date(q.expiresAt)}</td><td><LinkInterno className="row-link" to={`/cotacoes/${q.id}`}><ArrowRight/></LinkInterno></td></tr>})}</tbody></table></div></div>}</div>
}
