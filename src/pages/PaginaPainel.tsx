import { ArrowRight, ClipboardCheck, ClipboardList, CircleDollarSign, PiggyBank } from 'lucide-react'
import { useState } from 'react'
import { date, money } from '../api'
import { usarAutenticacao } from '../autenticacao'
import { EstadoVazio, AvisoErro, EtiquetaStatus } from '../components/ComponentesUI'
import { usarPainel } from '../hooks/usarPainel'
import { usarOnboarding } from '../hooks/usarOnboarding'
import BotaoNovaCotacao from '../components/BotaoNovaCotacao'
import BotaoCotacaoUnificada from '../components/BotaoCotacaoUnificada'
import ChecklistPrimeirosPassos from '../components/ChecklistPrimeirosPassos'
import { LinkInterno, Redirecionar } from '../roteamento'
import { empresaAtiva } from '../lib/permissoes'

export default function PaginaPainel(){
  const {user}=usarAutenticacao(); const [geral,setGeral]=useState(false)
  const {data,carregando,revalidando,erro,recarregar}=usarPainel(user,geral)
  const {data:onboarding}=usarOnboarding(user)
  const variasFarmacias=(user?.companies.length??0)>1
  const nomeFarmaciaAtiva=empresaAtiva(user)?.name
  /* Conta que acabou de nascer e ainda não escolheu nada entra direto na primeira cotação
     assistida. Depois de começar ou de pular, o painel abre normalmente e o caminho de volta
     fica no cartão de primeiros passos. */
  if(onboarding?.status==='NOT_STARTED')return <Redirecionar to="/primeira-cotacao" replace/>
  /* Farmácia que ainda não cotou nada vê quatro zeros, e zero não explica nada. Enquanto não
     houver número de verdade, cada cartão diz o que vai mostrar. A cotação de demonstração
     não conta aqui, então quem só testou continua vendo a explicação - que é o certo, porque
     ela ainda não tem dado nenhum. */
  const semDados=Boolean(data)&&data!.openQuotations===0&&data!.finishedQuotations===0&&data!.responsesTotal===0
  return <div className="page" aria-busy={carregando||revalidando}><div className="page-header"><div><span className="eyebrow green">Visão geral</span><h1>Olá, {user?.name.split(' ')[0]}!</h1><p>Acompanhe suas cotações e oportunidades de economia.</p></div><div className="header-actions"><BotaoCotacaoUnificada/><BotaoNovaCotacao/></div></div>{variasFarmacias&&<div className="tabs" role="tablist" aria-label="Escopo do painel"><button type="button" role="tab" aria-selected={!geral} className={geral?'':'active'} onClick={()=>setGeral(false)}>{nomeFarmaciaAtiva}</button><button type="button" role="tab" aria-selected={geral} className={geral?'active':''} onClick={()=>setGeral(true)}>Todas as farmácias</button></div>}{onboarding&&<ChecklistPrimeirosPassos onboarding={onboarding}/>}{revalidando&&data&&<div className="dashboard-update-status" role="status">Atualizando dados do painel…</div>}{erro&&data&&<div className="dashboard-update-status dashboard-update-error" role="status">Não foi possível atualizar agora. Os últimos dados continuam visíveis. <button type="button" onClick={()=>void recarregar()}>Tentar novamente</button></div>}{erro&&!data&&<div className="dashboard-load-error"><AvisoErro message={erro}/><button className="button button-secondary" type="button" onClick={()=>void recarregar()}>Tentar novamente</button></div>}{!data&&carregando?<PainelSkeleton/>:data&&<><div className="stats-grid"><Stat icon={<ClipboardList/>} label="Cotações abertas" value={String(data.openQuotations)} vazio={semDados?'Sua primeira cotação aparece aqui.':undefined} tone="green"/><Stat icon={<ClipboardCheck/>} label="Cotações finalizadas" value={String(data.finishedQuotations)} vazio={semDados?'Cotações já encerradas entram nesta conta.':undefined} tone="blue"/><Stat icon={<CircleDollarSign/>} label="Respostas recebidas" value={String(data.responsesTotal)} vazio={semDados?'Cada proposta de representante conta aqui.':undefined} tone="amber" hint={`${data.responsesThisMonth} ${data.responsesThisMonth===1?'recebida':'recebidas'} neste mês.`}/><Stat icon={<PiggyBank/>} label="Economia estimada" value={money(data.estimatedSavings)} vazio={semDados?'A diferença para a segunda melhor oferta aparece aqui.':undefined} tone="purple" hint="Diferença para a segunda melhor oferta, considerando somente quantidades comparáveis."/></div>{geral?<p className="dashboard-nota-geral">Para ver as últimas cotações, entre na farmácia específica.</p>:<section className="card"><div className="card-header"><div><h2>Últimas cotações</h2><p>Atividade recente da sua farmácia</p></div><LinkInterno className="text-link" to="/cotacoes">Ver todas <ArrowRight/></LinkInterno></div>{data.latestQuotations.length===0?<EstadoVazio title="Sua primeira cotação começa aqui" description="Importe uma lista e compartilhe o link com seus distribuidores." action={<BotaoNovaCotacao rotulo="Criar cotação" comIcone={false}/>}/>:<div className="table-wrap"><table><thead><tr><th>Cotação</th><th>Data</th><th>Produtos</th><th>Respostas</th><th>Status</th><th/></tr></thead><tbody>{data.latestQuotations.map(q=><tr key={q.id}><td><strong>{q.name}</strong>{q.demo&&<span className="badge badge-demo">Demonstração</span>}</td><td>{date(q.createdAt)}</td><td>{q.productCount}</td><td><strong className="green-text">{q.submittedResponses} recebida{q.submittedResponses!==1?'s':''}</strong></td><td><EtiquetaStatus status={q.status}/></td><td><LinkInterno className="row-link" to={`/cotacoes/${q.id}`}><ArrowRight/></LinkInterno></td></tr>)}</tbody></table></div>}</section>}</>}</div>
}
function Stat({icon,label,value,tone,hint,vazio}:{icon:React.ReactNode;label:string;value:string;tone:string;hint?:string;vazio?:string}){return <div className={`stat-card ${vazio?'stat-card-vazio':''}`} title={vazio??hint}><div className={`stat-icon ${tone}`}>{icon}</div><div><span>{label}</span>{vazio?<small className="stat-vazio">{vazio}</small>:<strong>{value}</strong>}</div></div>}

function PainelSkeleton(){
  const cards=[{icon:<ClipboardList/>,label:'Cotações abertas',tone:'green'},{icon:<ClipboardCheck/>,label:'Cotações finalizadas',tone:'blue'},{icon:<CircleDollarSign/>,label:'Respostas recebidas',tone:'amber'},{icon:<PiggyBank/>,label:'Economia estimada',tone:'purple'}]
  return <><span className="sr-only" role="status">Carregando dados do painel.</span><div className="stats-grid" aria-hidden="true">{cards.map(card=><div className="stat-card" key={card.label}><div className={`stat-icon ${card.tone}`}>{card.icon}</div><div><span>{card.label}</span><span className="skeleton-block dashboard-skeleton-value"/></div></div>)}</div><section className="card dashboard-skeleton-table"><div className="card-header"><div><h2>Últimas cotações</h2><p>Atividade recente da sua farmácia</p></div><LinkInterno className="text-link" to="/cotacoes">Ver todas <ArrowRight/></LinkInterno></div><div className="table-wrap"><table><thead><tr><th>Cotação</th><th>Data</th><th>Produtos</th><th>Respostas</th><th>Status</th><th/></tr></thead><tbody aria-hidden="true">{[0,1,2].map(linha=><tr key={linha}>{[42,30,18,28,22,8].map((largura,coluna)=><td key={coluna}><span className="skeleton-block dashboard-skeleton-cell" style={{width:`${largura}%`}}/></td>)}</tr>)}</tbody></table></div></section></>
}
