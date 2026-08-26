import { AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BarChart3, CheckCircle2, CircleDollarSign, Download, Plus, Search, ShoppingCart, SlidersHorizontal, Trophy } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api, date, money } from '../api'
import { EstadoVazio, AvisoErro, Carregando, EtiquetaStatus } from '../components/ComponentesUI'
import type { ComparativoCompra, ProdutoHistoricoCompra, ResumoCotacao, SituacaoPrecoCompra, StatusCotacao } from '../types'
import { nomeDeArquivo, salvarBlob } from '../lib/arquivos'
import { LinkInterno, usarParametrosBusca } from '../roteamento'

const MAX_COTACOES=8
type Periodo='ALL'|'90'|'365'
type Tendencia='ALL'|'UP'|'DOWN'|'STABLE'
type FiltroSituacao='ALL'|'MELHOR_PRECO'|'ACIMA_DO_MELHOR_PRECO'|'REFERENCIA_INCOMPLETA'
type CampoOrdem='produto'|'oscilacao'|'impacto'|'resultado'|`cotacao:${number}`

const idsDaBusca=(valor:string|null)=>valor?.split(',').map(Number).filter(Number.isFinite).slice(0,MAX_COTACOES)??[]
const porcentagem=(valor:number|null|undefined)=>valor==null?'—':`${valor>0?'+':''}${valor.toLocaleString('pt-BR',{maximumFractionDigits:1})}%`
const eixoBRL=(valor:number)=>`R$ ${Number(valor).toLocaleString('pt-BR',{maximumFractionDigits:2})}`
/* Ordena primeiro o que exige atenção: acima do melhor preço, depois referência incompleta. */
const PESO_SITUACAO:Record<SituacaoPrecoCompra,number>={ACIMA_DO_MELHOR_PRECO:2,REFERENCIA_INCOMPLETA:1,MELHOR_PRECO:0}
const TEXTO_SITUACAO:Record<SituacaoPrecoCompra,string>={MELHOR_PRECO:'Melhor preço',ACIMA_DO_MELHOR_PRECO:'Acima do melhor',REFERENCIA_INCOMPLETA:'Referência incompleta'}
const valorDaOrdem=(produto:ProdutoHistoricoCompra,campo:CampoOrdem):number|string|null=>{
  if(campo==='produto')return produto.productName
  if(campo==='oscilacao')return produto.priceVariationPercent
  if(campo==='impacto')return produto.financialDifference
  if(campo==='resultado')return PESO_SITUACAO[produto.latestPriceSituation]
  return produto.points.find(ponto=>ponto.quotationId===Number(campo.slice('cotacao:'.length)))?.actualUnitPrice??null
}
const compararPor=(campo:CampoOrdem,direcao:'asc'|'desc')=>(a:ProdutoHistoricoCompra,b:ProdutoHistoricoCompra)=>{
  const valorA=valorDaOrdem(a,campo),valorB=valorDaOrdem(b,campo)
  if(valorA==null||valorB==null)return valorA==null&&valorB==null?0:valorA==null?1:-1
  const base=typeof valorA==='string'&&typeof valorB==='string'?valorA.localeCompare(valorB,'pt-BR'):Number(valorA)-Number(valorB)
  return direcao==='asc'?base:-base
}
const instante=(valor:string)=>new Date(valor).getTime()
const passoBonito=(intervalo:number)=>{
  const bruto=intervalo/4||1,magnitude=10**Math.floor(Math.log10(bruto)),normalizado=bruto/magnitude
  return (normalizado>=5?10:normalizado>=2?5:normalizado>=1?2:1)*magnitude
}
const escalaDeValores=(valores:number[]):{dominio:[number,number];ticks:number[]}=>{
  const minimo=Math.min(0,...valores),maximo=Math.max(0,...valores)
  const passo=passoBonito(maximo-minimo)
  const inicio=Math.floor(minimo/passo)*passo,fim=Math.ceil(maximo/passo)*passo
  const ticks:number[]=[]
  for(let valor=inicio;valor<=fim+passo/1000;valor+=passo)ticks.push(Number(valor.toFixed(6)))
  return {dominio:[inicio,fim],ticks}
}
const rotuloCurto=(nome:string,limite=26)=>nome.length<=limite?nome:`${nome.slice(0,Math.ceil((limite-1)/2))}…${nome.slice(nome.length-Math.floor((limite-1)/2))}`
const extremos=(produto:ProdutoHistoricoCompra)=>produto.points.length<2?null:{primeiro:produto.points[0],ultimo:produto.points[produto.points.length-1]}
/* Repete o volume da última compra nos dois preços: assim o percentual reflete o dinheiro gasto,
   e não a média simples, que um item barato variando muito distorce sozinho. */
const variacaoPonderada=(produtos:ProdutoHistoricoCompra[]) => {
  let base=0,atual=0
  produtos.forEach(produto=>{
    const par=extremos(produto)
    if(!par)return
    base+=par.ultimo.quantity*par.primeiro.actualUnitPrice
    atual+=par.ultimo.quantity*par.ultimo.actualUnitPrice
  })
  return base>0?((atual-base)/base)*100:null
}
/* Quanto o gasto do produto mudou entre a primeira e a última compra, no volume da última:
   é a decomposição por produto do mesmo número que o card de variação ponderada resume. */
const variacaoEmReais=(produto:ProdutoHistoricoCompra)=>{
  const par=extremos(produto)
  return par?par.ultimo.quantity*(par.ultimo.actualUnitPrice-par.primeiro.actualUnitPrice):null
}
const tendenciaDe=(produto:ProdutoHistoricoCompra):Exclude<Tendencia,'ALL'>=>produto.priceVariation>0.005?'UP':produto.priceVariation<-0.005?'DOWN':'STABLE'

export default function PaginaCotacoes(){
  const [items,setItems]=useState<ResumoCotacao[]>([]);const[loading,setLoading]=useState(true);const[error,setError]=useState('');const[search,setSearch]=useState('');const[filter,setFilter]=useState<'ALL'|StatusCotacao>('ALL');const[periodo,setPeriodo]=useState<Periodo>('ALL');const[compradas,setCompradas]=useState<'ALL'|'ELIGIBLE'|'NOT_ELIGIBLE'>('ALL')
  const[params,setParams]=usarParametrosBusca();const[selection,setSelection]=useState<number[]>(()=>idsDaBusca(params.get('ids')));const comparando=params.get('comparison')==='1'
  useEffect(()=>{api<ResumoCotacao[]>('/quotations').then(setItems).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[])
  const filtered=useMemo(()=>{const limite=periodo==='ALL'?null:Date.now()-Number(periodo)*86400000;return items.filter(q=>(filter==='ALL'||q.status===filter)&&q.name.toLowerCase().includes(search.toLowerCase())&&(limite===null||new Date(q.createdAt).getTime()>=limite)&&(compradas==='ALL'||(compradas==='ELIGIBLE'?q.purchaseComparisonEligible:!q.purchaseComparisonEligible)))},[items,filter,search,periodo,compradas])
  const selecionadas=useMemo(()=>items.filter(q=>selection.includes(q.id)),[items,selection])
  const alterarSelecao=(id:number)=>setSelection(atual=>atual.includes(id)?atual.filter(valor=>valor!==id):(atual.length>=MAX_COTACOES?atual:[...atual,id]))
  const selecionarVisiveis=()=>setSelection(atual=>{const elegiveis=filtered.filter(q=>q.purchaseComparisonEligible).map(q=>q.id);if(elegiveis.length>0&&elegiveis.every(id=>atual.includes(id)))return atual.filter(id=>!elegiveis.includes(id));const disponiveis=elegiveis.filter(id=>!atual.includes(id));return [...atual,...disponiveis].slice(0,MAX_COTACOES)})
  const comparar=()=>setParams({comparison:'1',ids:selection.join(',')})
  const voltar=()=>setParams(selection.length?{ids:selection.join(',')}:{})
  if(comparando)return <ComparativoCotacoes cotacoes={selecionadas} listaCarregando={loading} aoVoltar={voltar}/>
  return <div className="page quotations-page"><div className="page-header"><div><span className="eyebrow green">Central de compras</span><h1>Cotações</h1><p>Crie, compartilhe e acompanhe suas compras.</p></div><LinkInterno className="button button-primary" to="/cotacoes/nova"><Plus/>Nova cotação</LinkInterno></div>
    <div className="toolbar quotations-toolbar"><label className="search"><Search/><input placeholder="Buscar cotação..." value={search} onChange={e=>setSearch(e.target.value)}/></label><select aria-label="Status" value={filter} onChange={e=>setFilter(e.target.value as typeof filter)}><option value="ALL">Todos os status</option><option value="DRAFT">Rascunho</option><option value="OPEN">Aberta</option><option value="CLOSED">Fechada</option><option value="COMPLETED">Finalizada</option></select><select aria-label="Período" value={periodo} onChange={e=>setPeriodo(e.target.value as Periodo)}><option value="ALL">Todo período</option><option value="90">Últimos 90 dias</option><option value="365">Último ano</option></select><select aria-label="Disponibilidade de comparação" value={compradas} onChange={e=>setCompradas(e.target.value as typeof compradas)}><option value="ALL">Todas as cotações</option><option value="ELIGIBLE">Com compras realizadas</option><option value="NOT_ELIGIBLE">Sem compras realizadas</option></select></div>
    {selection.length>0&&<div className="comparison-selection"><div><BarChart3/><span><strong>{selection.length} {selection.length===1?'cotação selecionada':'cotações selecionadas'}</strong><small>Escolha de 2 a {MAX_COTACOES} cotações com pedidos gerados.</small></span></div><div className="comparison-selection-actions"><button className="button button-ghost" onClick={()=>setSelection([])}>Limpar</button><button className="button button-primary" disabled={selection.length<2} onClick={comparar}><BarChart3/>Comparar cotações</button></div></div>}
    {error&&<AvisoErro message={error}/>} {loading?<Carregando/>:filtered.length===0?<EstadoVazio title="Nenhuma cotação encontrada" description="Crie uma nova cotação ou altere os filtros."/>:<div className="card table-card"><div className="table-wrap"><table className="quotations-table"><thead><tr><th><input type="checkbox" aria-label="Selecionar cotações visíveis" checked={filtered.filter(q=>q.purchaseComparisonEligible).length>0&&filtered.filter(q=>q.purchaseComparisonEligible).every(q=>selection.includes(q.id))} onChange={selecionarVisiveis}/></th><th>Cotação</th><th>Criada em</th><th>Produtos</th><th>Respostas</th><th>Status</th><th>Compra</th><th>Prazo</th><th/></tr></thead><tbody>{filtered.map(q=>{const selecionada=selection.includes(q.id);return <tr key={q.id} className={selecionada?'selected-row':''}><td><input type="checkbox" aria-label={`Selecionar ${q.name}`} checked={selecionada} disabled={!q.purchaseComparisonEligible||(!selecionada&&selection.length>=MAX_COTACOES)} title={!q.purchaseComparisonEligible?'Esta cotação ainda não possui pedido gerado ou compartilhado.':selection.length>=MAX_COTACOES&&!selecionada?`O comparativo aceita até ${MAX_COTACOES} cotações.`:undefined} onChange={()=>alterarSelecao(q.id)}/></td><td><strong>{q.name}</strong></td><td>{date(q.createdAt)}</td><td>{q.productCount}</td><td><span className="response-count">{q.submittedResponses}</span> recebida{q.submittedResponses!==1?'s':''}</td><td><EtiquetaStatus status={q.status}/></td><td>{q.purchaseComparisonEligible?<span className="purchase-ready"><CheckCircle2/> {q.purchasedItemCount} item{q.purchasedItemCount!==1?'s':''}</span>:<span className="muted" title="Gere ou compartilhe um pedido para comparar esta cotação.">Sem pedido</span>}</td><td>{date(q.expiresAt)}</td><td><LinkInterno className="row-link" to={`/cotacoes/${q.id}`}><ArrowRight/></LinkInterno></td></tr>})}</tbody></table></div></div>}</div>
}

function ComparativoCotacoes({cotacoes,listaCarregando,aoVoltar}:{cotacoes:ResumoCotacao[];listaCarregando:boolean;aoVoltar:()=>void}){
  const[comparativo,setComparativo]=useState<ComparativoCompra|null>(null);const[loading,setLoading]=useState(true);const[error,setError]=useState('');const[search,setSearch]=useState('');const[tendencia,setTendencia]=useState<Tendencia>('ALL');const[situacao,setSituacao]=useState<FiltroSituacao>('ALL');const[impacto,setImpacto]=useState<'ALL'|'ABOVE_ZERO'>('ALL');const[produtoAtivo,setProdutoAtivo]=useState('');const[ordem,setOrdem]=useState<{campo:CampoOrdem;direcao:'asc'|'desc'}|null>(null);const[topN,setTopN]=useState(8);const[exportando,setExportando]=useState(false)
  const ids=cotacoes.map(q=>q.id).join(',')
  useEffect(()=>{if(listaCarregando)return;if(cotacoes.length<2){setError('As cotações deste link não estão mais disponíveis ou não têm pedido gerado. Volte e selecione ao menos duas cotações com compra realizada.');setLoading(false);return}setLoading(true);setError('');api<ComparativoCompra>(`/quotations/purchase-comparison?ids=${encodeURIComponent(ids)}`).then(resultado=>{setComparativo(resultado);setProdutoAtivo(resultado.products[0]?.key??'')}).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[ids,cotacoes.length,listaCarregando])
  const produtos=useMemo(()=>{
    const filtrados=comparativo?.products.filter(p=>`${p.productName} ${p.ean??''}`.toLowerCase().includes(search.toLowerCase())&&(tendencia==='ALL'||tendenciaDe(p)===tendencia)&&(situacao==='ALL'||p.latestPriceSituation===situacao)&&(impacto==='ALL'||p.financialDifference>0))??[]
    return ordem?[...filtrados].sort(compararPor(ordem.campo,ordem.direcao)):filtrados
  },[comparativo,search,tendencia,situacao,impacto,ordem])
  /* Terceiro clique volta para a ordem original da API. */
  const alternarOrdem=(campo:CampoOrdem)=>setOrdem(atual=>{
    const inicial:'asc'|'desc'=campo==='produto'?'asc':'desc'
    if(atual?.campo!==campo)return {campo,direcao:inicial}
    return atual.direcao===inicial?{campo,direcao:inicial==='asc'?'desc':'asc'}:null
  })
  const ativo=produtos.find(p=>p.key===produtoAtivo)??produtos[0]??null
  const dadosLinha=ativo?.points.map(p=>({name:p.quotationName,comprado:p.actualUnitPrice,melhor:p.bestAvailableUnitPrice}))??[]
  /* As colunas seguem a mesma ordem cronológica dos pontos da API — é contra ela que a oscilação é calculada. */
  const colunas=useMemo(()=>{
    const primeiraCompra=new Map<number,number>()
    comparativo?.products.forEach(produto=>produto.points.forEach(ponto=>{
      const registrado=primeiraCompra.get(ponto.quotationId)
      const momento=instante(ponto.purchasedAt)
      if(registrado===undefined||momento<registrado)primeiraCompra.set(ponto.quotationId,momento)
    }))
    return [...cotacoes].sort((a,b)=>(primeiraCompra.get(a.id)??instante(a.createdAt))-(primeiraCompra.get(b.id)??instante(b.createdAt)))
  },[comparativo,cotacoes])
  const comVariacao=useMemo(()=>produtos.map(p=>({produto:p,valor:variacaoEmReais(p)}))
    .filter((item):item is {produto:ProdutoHistoricoCompra;valor:number}=>item.valor!=null&&item.valor!==0)
    .sort((a,b)=>Math.abs(b.valor)-Math.abs(a.valor)),[produtos])
  const dadosImpacto=useMemo(()=>comVariacao.slice(0,topN).map(({produto,valor})=>({chave:produto.key,name:produto.productName,valor})),[comVariacao,topN])
  const semVariacao=produtos.length-comVariacao.length
  const escala=useMemo(()=>escalaDeValores(dadosImpacto.map(item=>item.valor)),[dadosImpacto])
  /* Totais do que está exibido: seguem filtro e ordenação, e somam quantidade × preço (actualTotal). */
  const exportarComparativo=async()=>{
    if(!produtos.length)return
    setExportando(true); setError('')
    try{
      const {default:ExcelJS}=await import('exceljs')
      const workbook=new ExcelJS.Workbook(); const sheet=workbook.addWorksheet('Comparativo')
      sheet.columns=[
        {header:'Produto',key:'produto',width:42},{header:'EAN',key:'ean',width:16},{header:'Laboratório',key:'laboratorio',width:22},
        ...colunas.flatMap(cotacao=>[
          {header:`${cotacao.name} · preço`,key:`p${cotacao.id}`,width:14},
          {header:`${cotacao.name} · qtd.`,key:`q${cotacao.id}`,width:12},
          {header:`${cotacao.name} · total`,key:`t${cotacao.id}`,width:14},
        ]),
        {header:'Oscilação (R$)',key:'oscilacao',width:15},{header:'Oscilação (%)',key:'oscilacaoPercentual',width:14},
        {header:'Impacto (R$)',key:'impacto',width:14},{header:'Resultado',key:'resultado',width:22},
      ]
      produtos.forEach(produto=>{
        const pontos=new Map(produto.points.map(ponto=>[ponto.quotationId,ponto]))
        sheet.addRow({
          produto:produto.productName,ean:produto.ean??'',laboratorio:produto.laboratory??'',
          ...Object.fromEntries(colunas.flatMap(cotacao=>{const ponto=pontos.get(cotacao.id)
            return [[`p${cotacao.id}`,ponto?.actualUnitPrice??null],[`q${cotacao.id}`,ponto?.quantity??null],[`t${cotacao.id}`,ponto?.actualTotal??null]]})),
          oscilacao:produto.priceVariation,oscilacaoPercentual:produto.priceVariationPercent,
          impacto:produto.financialDifference,resultado:TEXTO_SITUACAO[produto.latestPriceSituation],
        })
      })
      const linhaTotal=sheet.addRow({produto:`TOTAL · ${produtos.length} produto${produtos.length===1?'':'s'} · oscilação calculada no mesmo volume`,
        ...Object.fromEntries(colunas.map(cotacao=>[`t${cotacao.id}`,totais.porCotacao.get(cotacao.id)??0])),
        oscilacao:totais.diferenca,oscilacaoPercentual:totais.percentual,impacto:totais.impacto})
      linhaTotal.font={bold:true}
      sheet.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}}
      sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF12634A'}}
      sheet.views=[{state:'frozen',ySplit:1,xSplit:1}]
      colunas.forEach(cotacao=>{sheet.getColumn(`p${cotacao.id}`).numFmt='R$ #,##0.00';sheet.getColumn(`t${cotacao.id}`).numFmt='R$ #,##0.00'})
      sheet.getColumn('oscilacao').numFmt='R$ #,##0.00'; sheet.getColumn('impacto').numFmt='R$ #,##0.00'
      sheet.getColumn('oscilacaoPercentual').numFmt='0.0"%"'
      /* O arquivo sai igual à tela, então precisa dizer que filtro estava valendo. */
      if(produtos.length<(comparativo?.products.length??0))sheet.addRow({produto:`Exportado com filtros ativos: ${produtos.length} de ${comparativo?.products.length} produtos.`}).font={italic:true}
      const nome=nomeDeArquivo(`comparativo ${colunas.map(cotacao=>cotacao.name).join(' ')}`,'comparativo-cotacoes')
      salvarBlob(new Blob([await workbook.xlsx.writeBuffer()],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`${nome}.xlsx`)
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível gerar a planilha.')}
    finally{setExportando(false)}
  }
  const totais=useMemo(()=>{
    const porCotacao=new Map<number,number>()
    produtos.forEach(produto=>produto.points.forEach(ponto=>porCotacao.set(ponto.quotationId,(porCotacao.get(ponto.quotationId)??0)+ponto.actualTotal)))
    /* Total contra total mediria volume, não preço: uma cotação pode ter comprado 200 un. e a outra 2.
       A diferença usa o volume da última compra nas duas pontas, igual ao card de variação ponderada. */
    let base=0,atual=0
    produtos.forEach(produto=>{
      const par=extremos(produto)
      if(!par)return
      base+=par.ultimo.quantity*par.primeiro.actualUnitPrice
      atual+=par.ultimo.quantity*par.ultimo.actualUnitPrice
    })
    return {
      porCotacao,
      impacto:produtos.reduce((soma,produto)=>soma+produto.financialDifference,0),
      diferenca:atual-base,
      percentual:base>0?((atual-base)/base)*100:null,
      parciais:produtos.filter(produto=>produto.points.length<colunas.length).length,
    }
  },[produtos,colunas])
  const ponderada=useMemo(()=>comparativo?variacaoPonderada(comparativo.products):null,[comparativo])
  return <div className="page purchase-comparison-page"><div className="comparison-header"><button className="text-link" onClick={aoVoltar}><ArrowLeft/>Voltar às cotações</button><div className="page-header"><div><span className="eyebrow green">Análise de compras</span><h1>Comparativo de cotações</h1><p>Preços efetivamente comprados comparados com a melhor composição viável e o histórico selecionado.</p></div><div className="comparison-chips">{colunas.map(q=><span key={q.id}>{q.name}</span>)}</div></div></div>
    {error&&<AvisoErro message={error}/>} {loading?<Carregando/>:comparativo&&<><section className="stats-grid comparison-stats"><ResumoCard icon={<ShoppingCart/>} label="Produtos em comum" value={String(comparativo.summary.commonProducts)} detail="Comprados em pelo menos duas cotações" tone="green"/><ResumoCard icon={<Trophy/>} label="No melhor preço" value={comparativo.summary.evaluatedPurchases?`${Math.round(comparativo.summary.bestPricePurchases/comparativo.summary.evaluatedPurchases*100)}%`:'—'} detail={`${comparativo.summary.bestPricePurchases} de ${comparativo.summary.evaluatedPurchases} compras com referência completa`} tone="blue"/><ResumoCard icon={<CircleDollarSign/>} label="Acima do melhor cenário" value={money(comparativo.summary.amountAboveBestScenario)} detail="Oportunidade identificada nas cotações" tone="amber"/><ResumoCard icon={ponderada!=null&&ponderada<0?<ArrowDown/>:<ArrowUp/>} label="Variação ponderada" value={porcentagem(ponderada)} detail="Mesmo volume da última compra, pelos preços da primeira e da última" tone={ponderada==null?'purple':ponderada>0.05?'amber':ponderada<-0.05?'green':'blue'}/></section>
      {comparativo.products.length===0?<EstadoVazio title="Ainda não há produtos em comum" description="As cotações escolhidas têm pedidos, mas nenhum produto comprado se repete entre elas."/>:<><div className="comparison-filters card"><div className="comparison-filter-title"><SlidersHorizontal/><div><strong>Refine a análise</strong><span>{produtos.length} produtos exibidos</span></div></div><label className="search"><Search/><input placeholder="Produto ou EAN" value={search} onChange={e=>setSearch(e.target.value)}/></label><select aria-label="Tendência de preço" value={tendencia} onChange={e=>setTendencia(e.target.value as Tendencia)}><option value="ALL">Toda tendência</option><option value="UP">Preço subiu</option><option value="DOWN">Preço caiu</option><option value="STABLE">Preço estável</option></select><select aria-label="Resultado da compra" value={situacao} onChange={e=>setSituacao(e.target.value as FiltroSituacao)}><option value="ALL">Todo resultado</option><option value="MELHOR_PRECO">No melhor preço</option><option value="ACIMA_DO_MELHOR_PRECO">Acima do melhor preço</option><option value="REFERENCIA_INCOMPLETA">Referência incompleta</option></select><select aria-label="Impacto financeiro" value={impacto} onChange={e=>setImpacto(e.target.value as typeof impacto)}><option value="ALL">Todo impacto</option><option value="ABOVE_ZERO">Com oportunidade</option></select></div>
        <section className="comparison-charts"><article className="card chart-card"><div className="card-header"><div><h2>Evolução do preço</h2><p>Preço pago e melhor referência na cotação.</p></div>{ativo&&<select aria-label="Produto exibido no gráfico" value={ativo.key} onChange={e=>setProdutoAtivo(e.target.value)}>{produtos.map(p=><option key={p.key} value={p.key}>{p.productName}{p.ean?` · ${p.ean}`:''}</option>)}</select>}</div>{ativo?<div className="chart-area"><ResponsiveContainer width="100%" height={290}><LineChart data={dadosLinha} margin={{top:8,right:15,left:0,bottom:16}}><CartesianGrid strokeDasharray="3 3" stroke="#e7eeea"/><XAxis dataKey="name" tick={{fontSize:11,fill:'#61756e'}} interval={0} angle={-18} textAnchor="end" height={54}/><YAxis tickFormatter={eixoBRL} tick={{fontSize:11,fill:'#61756e'}} width={68}/><Tooltip formatter={valor=>money(Number(valor??0))}/><Legend/><Line type="monotone" dataKey="melhor" name="Melhor cenário" stroke="#e2a640" strokeWidth={2} strokeDasharray="5 4" connectNulls/><Line type="monotone" dataKey="comprado" name="Preço pago" stroke="#12634a" strokeWidth={3} dot={{r:4}}/></LineChart></ResponsiveContainer></div>:<EstadoVazio title="Nenhum produto atende aos filtros" description="Ajuste os filtros para visualizar a evolução."/>}</article>
          <article className="card chart-card"><div className="card-header"><div><h2>Onde o gasto mudou</h2><p>Diferença entre a primeira e a última compra, no volume da última. Laranja pagou mais, verde pagou menos.</p></div>{comVariacao.length>8&&<select className="chart-top-select" aria-label="Quantidade de produtos no gráfico" value={topN} onChange={e=>setTopN(Number(e.target.value))}>{[8,15,30,60].filter(quantidade=>quantidade<=comVariacao.length||quantidade===8).map(quantidade=><option key={quantidade} value={quantidade}>Top {quantidade}</option>)}</select>}</div><div className="chart-area chart-area-scroll">{dadosImpacto.length?<ResponsiveContainer width="100%" height={Math.max(150,dadosImpacto.length*46)}><BarChart data={dadosImpacto} layout="vertical" margin={{top:5,right:25,left:5,bottom:0}}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e7eeea"/><XAxis type="number" domain={escala.dominio} ticks={escala.ticks} hide/><YAxis type="category" dataKey="name" tickFormatter={nome=>rotuloCurto(nome)} tick={{fontSize:11,fill:'#48625a'}} width={138}/><Tooltip formatter={valor=>money(Number(valor??0))}/><ReferenceLine x={0} stroke="#c2cfca"/><Bar dataKey="valor" name="Diferença no gasto" maxBarSize={34} radius={[0,6,6,0]}>{dadosImpacto.map(item=><Cell key={item.chave} fill={item.valor>0?'#d68a33':'#2f8f6d'}/>)}</Bar></BarChart></ResponsiveContainer>:<EstadoVazio title="Sem variação nos filtros" description="Os produtos exibidos foram comprados pelo mesmo preço nas duas pontas."/>}</div>
            {/* Eixo fora da área rolável: com muitas barras a escala continua à vista. Domínio e ticks são os mesmos das barras, senão desalinha. */}
            {dadosImpacto.length>0&&<div className="chart-axis-fixed"><div className="chart-axis-track">{escala.ticks.map(valor=><span key={valor} style={{left:`${((valor-escala.dominio[0])/(escala.dominio[1]-escala.dominio[0]||1))*100}%`}}>{eixoBRL(valor)}</span>)}</div></div>}
            {dadosImpacto.length>0&&(comVariacao.length>dadosImpacto.length||semVariacao>0)&&<p className="chart-note">{comVariacao.length>dadosImpacto.length?`Mostrando as ${dadosImpacto.length} maiores variações de ${comVariacao.length} produtos com diferença. `:''}{semVariacao>0?`${semVariacao} ${semVariacao===1?'produto manteve':'produtos mantiveram'} o mesmo preço.`:''}</p>}</article>
        </section>
        <section className="card table-card comparison-detail"><div className="card-header"><div><h2>Produtos comparados</h2><p>O histórico usa o pedido gerado, não o preço atual da proposta.{ordem?' Clique de novo no mesmo cabeçalho para inverter, e uma terceira vez para voltar à ordem original.':' Clique em um cabeçalho para ordenar.'}</p></div><button className="button button-secondary" disabled={!produtos.length||exportando} title="Baixa uma planilha com exatamente o que está na tela, no filtro e na ordem atuais." onClick={()=>void exportarComparativo()}><Download/>{exportando?'Gerando...':'Exportar Excel'}</button></div><div className="table-wrap"><table><thead><tr>
          <CabecalhoOrdenavel campo="produto" ordem={ordem} aoOrdenar={alternarOrdem} titulo="Ordenar por nome do produto">Produto</CabecalhoOrdenavel>
          {colunas.map(q=><CabecalhoOrdenavel key={q.id} campo={`cotacao:${q.id}`} ordem={ordem} aoOrdenar={alternarOrdem} titulo={`Ordenar pelo preço pago em ${q.name}`}>{q.name}</CabecalhoOrdenavel>)}
          <CabecalhoOrdenavel campo="oscilacao" ordem={ordem} aoOrdenar={alternarOrdem} titulo="Ordenar pela variação percentual entre a primeira e a última compra">Oscilação</CabecalhoOrdenavel>
          <CabecalhoOrdenavel campo="impacto" ordem={ordem} aoOrdenar={alternarOrdem} titulo="Ordenar pelo valor pago acima do melhor cenário">Impacto</CabecalhoOrdenavel>
          <CabecalhoOrdenavel campo="resultado" ordem={ordem} aoOrdenar={alternarOrdem} titulo="Ordenar pelo resultado da compra">Resultado</CabecalhoOrdenavel>
        </tr></thead><tbody>{produtos.map(produto=><LinhaProduto key={produto.key} produto={produto} cotacoes={colunas}/>)}</tbody>
          {produtos.length>0&&<tfoot><tr>
            <td><strong>Total exibido</strong><small className="product-meta">{produtos.length} produto{produtos.length===1?'':'s'}{totais.parciais>0?` · ${totais.parciais} sem compra em todas as cotações`:''}</small></td>
            {colunas.map(cotacao=><td key={cotacao.id}><strong>{money(totais.porCotacao.get(cotacao.id)??0)}</strong><small className="product-meta">gasto total</small></td>)}
            <td className={totais.diferenca>0?'variation-up':totais.diferenca<0?'variation-down':''}>{totais.diferenca>0?<ArrowUp/>:totais.diferenca<0?<ArrowDown/>:null}<strong>{money(totais.diferenca)}</strong><small>{porcentagem(totais.percentual)} · mesmo volume</small></td>
            <td><strong>{money(totais.impacto)}</strong><small className="product-meta">acima do melhor</small></td>
            <td/>
          </tr></tfoot>}</table></div>{produtos.length===0&&<EstadoVazio title="Nenhum produto encontrado" description="Tente remover algum filtro."/>}</section></>}
    </>}</div>
}

function CabecalhoOrdenavel({campo,ordem,aoOrdenar,titulo,children}:{campo:CampoOrdem;ordem:{campo:CampoOrdem;direcao:'asc'|'desc'}|null;aoOrdenar:(campo:CampoOrdem)=>void;titulo:string;children:ReactNode}){
  const ativa=ordem?.campo===campo
  return <th aria-sort={ativa?(ordem.direcao==='asc'?'ascending':'descending'):'none'}><button type="button" className="comparison-sort-button" title={titulo} onClick={()=>aoOrdenar(campo)}><span className="comparison-sort-label">{children}</span>{ativa&&(ordem.direcao==='asc'?<ArrowUp size={12}/>:<ArrowDown size={12}/>)}</button></th>
}
function ResumoCard({icon,label,value,detail,tone}:{icon:ReactNode;label:string;value:string;detail:string;tone:string}){return <article className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>}
function LinhaProduto({produto,cotacoes}:{produto:ProdutoHistoricoCompra;cotacoes:ResumoCotacao[]}){const pontos=new Map(produto.points.map(p=>[p.quotationId,p]));return <tr><td><strong>{produto.productName}</strong><small className="product-meta">{produto.ean?`EAN ${produto.ean}`:produto.laboratory??'Identificado por nome e laboratório'}</small></td>{cotacoes.map(c=>{const ponto=pontos.get(c.id);return <td key={c.id}>{ponto?<div className="price-cell"><strong>{money(ponto.actualUnitPrice)}</strong><small>{ponto.quantity} un. · {ponto.supplierName}</small>{ponto.bestAvailableUnitPrice!=null&&<span>Melhor: {money(ponto.bestAvailableUnitPrice)}</span>}</div>:<span className="muted">Não comprado</span>}</td>})}<td className={produto.priceVariation>0?'variation-up':produto.priceVariation<0?'variation-down':''}>{produto.priceVariation>0?<ArrowUp/>:produto.priceVariation<0?<ArrowDown/>:null}<strong>{money(produto.priceVariation)}</strong><small>{porcentagem(produto.priceVariationPercent)}</small></td><td><strong>{money(produto.financialDifference)}</strong></td><td><EtiquetaSituacao situacao={produto.latestPriceSituation}/></td></tr>}
function EtiquetaSituacao({situacao}:{situacao:SituacaoPrecoCompra}){const texto=TEXTO_SITUACAO;return <span className={`comparison-status comparison-status-${situacao.toLowerCase()}`}>{situacao==='MELHOR_PRECO'?<CheckCircle2/>:situacao==='REFERENCIA_INCOMPLETA'?<AlertTriangle/>:<CircleDollarSign/>}{texto[situacao]}</span>}
