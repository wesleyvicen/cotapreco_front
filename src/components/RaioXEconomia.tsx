import { ArrowLeftRight, Check, Copy, PiggyBank, Store, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { money } from '../api'
import type { ComparacaoCotacao, OfertaDistribuidor } from '../types'

/* 'plano' é o que a farmácia vai comprar de fato; número é a colocação por preço (1º, 2º...);
   'pior' é o preço mais alto que alguém ofertou. */
type Referencia='plano'|'pior'|number

type LinhaProduto={
  quotationItemId:number
  productName:string
  quantidade:number
  custoPlano:number|null
  ofertas:OfertaDistribuidor[]
}

type Diferenca={linha:LinhaProduto;custoA:number;custoB:number;precoA:number;precoB:number;diferenca:number}

const ATALHOS:{rotulo:string;a:Referencia;b:Referencia}[]=[
  {rotulo:'Seu plano × 2º',a:'plano',b:2},
  {rotulo:'1º × 2º',a:1,b:2},
  {rotulo:'1º × 3º',a:1,b:3},
  {rotulo:'2º × 3º',a:2,b:3},
  {rotulo:'Seu plano × mais caro',a:'plano',b:'pior'},
]
const LIMITE_PRODUTOS=8

function nomeReferencia(ref:Referencia){
  if(ref==='plano')return 'Seu plano'
  if(ref==='pior')return 'Mais caro'
  return `${ref}º colocado`
}
function valorSelect(ref:Referencia){return String(ref)}
function lerSelect(valor:string):Referencia{return valor==='plano'||valor==='pior'?valor:Number(valor)}
function percentual(parte:number,total:number){return total>0?(parte/total)*100:0}
function formatarPercentual(valor:number){return `${valor.toLocaleString('pt-BR',{maximumFractionDigits:1})}%`}

/* Preço e custo de um produto numa referência. Sem oferta naquela colocação o produto
   fica fora da comparação: somar zero ali inventaria uma economia que não existe. */
function custoNa(linha:LinhaProduto,ref:Referencia):{custo:number;preco:number}|null{
  if(ref==='plano'){
    if(linha.custoPlano===null)return null
    return {custo:linha.custoPlano,preco:linha.custoPlano/linha.quantidade}
  }
  const oferta=ref==='pior'?linha.ofertas[linha.ofertas.length-1]:linha.ofertas[ref-1]
  if(!oferta)return null
  return {custo:oferta.unitPrice*linha.quantidade,preco:oferta.unitPrice}
}

function comparar(linhas:LinhaProduto[],a:Referencia,b:Referencia){
  const itens:Diferenca[]=[]
  for(const linha of linhas){
    const ca=custoNa(linha,a);const cb=custoNa(linha,b)
    if(!ca||!cb)continue
    itens.push({linha,custoA:ca.custo,custoB:cb.custo,precoA:ca.preco,precoB:cb.preco,diferenca:cb.custo-ca.custo})
  }
  const totalA=itens.reduce((t,i)=>t+i.custoA,0)
  const totalB=itens.reduce((t,i)=>t+i.custoB,0)
  return {itens,totalA,totalB,diferenca:totalB-totalA}
}

export function ModalRaioXEconomia({comparacao,aoFechar}:{comparacao:ComparacaoCotacao;aoFechar:()=>void}){
  const [refA,setRefA]=useState<Referencia>('plano')
  const [refB,setRefB]=useState<Referencia>(2)
  const [todosProdutos,setTodosProdutos]=useState(false)
  const [copiado,setCopiado]=useState(false)

  useEffect(()=>{
    const aoTeclar=(evento:KeyboardEvent)=>{if(evento.key==='Escape')aoFechar()}
    window.addEventListener('keydown',aoTeclar)
    return ()=>window.removeEventListener('keydown',aoTeclar)
  },[aoFechar])

  /* A quantidade é a do plano quando o produto está nele, para toda referência custar o
     mesmo volume. Fora do plano vale a quantidade desejada: dá para comparar colocações,
     só não entra no "seu plano". */
  const linhas=useMemo<LinhaProduto[]>(()=>{
    const doPlano=new Map<number,{quantidade:number;custo:number}>()
    for(const pedido of comparacao.suggestedPurchase)for(const item of pedido.items??[]){
      const atual=doPlano.get(item.quotationItemId)??{quantidade:0,custo:0}
      doPlano.set(item.quotationItemId,{quantidade:atual.quantidade+item.allocatedQuantity,custo:atual.custo+item.subtotal})
    }
    return comparacao.products.flatMap(produto=>{
      const plano=doPlano.get(produto.quotationItemId)
      const quantidade=plano&&plano.quantidade>0?plano.quantidade:(produto.desiredQuantity||produto.requestedQuantity)
      if(quantidade<=0||produto.offers.length===0)return []
      const ofertas=[...produto.offers].sort((x,y)=>x.unitPrice-y.unitPrice||x.position-y.position)
      return [{quotationItemId:produto.quotationItemId,productName:produto.productName,quantidade,custoPlano:plano&&plano.quantidade>0?plano.custo:null,ofertas}]
    })
  },[comparacao])

  const maiorColocacao=Math.max(1,...linhas.map(l=>l.ofertas.length))
  const opcoes:Referencia[]=['plano',...Array.from({length:maiorColocacao},(_,i)=>i+1),'pior']

  const contraSegundo=useMemo(()=>comparar(linhas,'plano',2),[linhas])
  const contraTerceiro=useMemo(()=>comparar(linhas,'plano',3),[linhas])
  const contraPior=useMemo(()=>comparar(linhas,'plano','pior'),[linhas])
  const atual=useMemo(()=>comparar(linhas,refA,refB),[linhas,refA,refB])

  /* "E se eu tivesse comprado tudo de uma distribuidora só?" - a pergunta que a cotação
     responde melhor. Mede só os produtos do plano que ela ofertou e conta os que faltariam. */
  const umaSo=useMemo(()=>{
    const doPlano=linhas.filter(l=>l.custoPlano!==null)
    const fornecedores=new Map<number,string>()
    for(const linha of doPlano)for(const oferta of linha.ofertas)fornecedores.set(oferta.responseId,oferta.supplierName)
    return [...fornecedores].map(([responseId,supplierName])=>{
      let custo=0,custoPlano=0,cobertos=0
      for(const linha of doPlano){
        const oferta=linha.ofertas.find(o=>o.responseId===responseId)
        if(!oferta)continue
        cobertos++
        custo+=oferta.unitPrice*linha.quantidade
        custoPlano+=linha.custoPlano!
      }
      return {responseId,supplierName,cobertos,faltando:doPlano.length-cobertos,extra:custo-custoPlano,custo}
    }).filter(f=>f.cobertos>0).sort((x,y)=>y.extra-x.extra)
  },[linhas])
  const maiorExtra=Math.max(1,...umaSo.map(f=>Math.abs(f.extra)))

  const itensOrdenados=[...atual.itens].sort((x,y)=>Math.abs(y.diferenca)-Math.abs(x.diferenca))
  const itensVisiveis=todosProdutos?itensOrdenados:itensOrdenados.slice(0,LIMITE_PRODUTOS)
  const maisBaratoEmA=atual.itens.filter(i=>i.diferenca>0.004).length
  const maisBaratoEmB=atual.itens.filter(i=>i.diferenca<-0.004).length
  const maiorTotal=Math.max(atual.totalA,atual.totalB,1)
  const mesmaReferencia=valorSelect(refA)===valorSelect(refB)
  const totalPlano=linhas.reduce((t,l)=>t+(l.custoPlano??0),0)

  function inverter(){setRefA(refB);setRefB(refA)}
  async function copiarResumo(){
    const partes=[
      `Raio-X da economia - ${linhas.filter(l=>l.custoPlano!==null).length} produtos no plano (${money(totalPlano)})`,
      contraSegundo.itens.length>0&&`• Contra o 2º colocado: ${money(contraSegundo.diferenca)} a menos (${formatarPercentual(percentual(contraSegundo.diferenca,contraSegundo.totalB))})`,
      contraTerceiro.itens.length>0&&`• Contra o 3º colocado: ${money(contraTerceiro.diferenca)} a menos (${formatarPercentual(percentual(contraTerceiro.diferenca,contraTerceiro.totalB))})`,
      contraPior.itens.length>0&&`• Contra o preço mais alto: ${money(contraPior.diferenca)} a menos (${formatarPercentual(percentual(contraPior.diferenca,contraPior.totalB))})`,
      ...umaSo.filter(f=>f.extra>0).slice(0,3).map(f=>`• Comprando tudo da ${f.supplierName}: ${money(f.extra)} a mais${f.faltando>0?` e ${f.faltando} produto${f.faltando===1?'':'s'} sem oferta`:''}`),
    ].filter(Boolean)
    try{await navigator.clipboard.writeText(partes.join('\n'));setCopiado(true);window.setTimeout(()=>setCopiado(false),2000)}catch{/* Sem permissão de área de transferência o botão só não confirma. */}
  }

  const vazio=contraSegundo.itens.length===0&&contraPior.diferenca<=0

  return <div className="modal-backdrop" onClick={evento=>{if(evento.target===evento.currentTarget)aoFechar()}}>
    <section className="modal raiox-modal" role="dialog" aria-modal="true" aria-labelledby="titulo-raiox">
      <div className="modal-header modal-header-simple">
        <div><span className="eyebrow green">Raio-X da economia</span><h2 id="titulo-raiox">Quanto a cotação colocou no seu bolso</h2>
          <p>O seu plano de compra contra o que você pagaria em cada colocação, com as mesmas quantidades.</p></div>
        <button type="button" className="icon-button" aria-label="Fechar" onClick={aoFechar}><X/></button>
      </div>

      <div className="raiox-corpo">
        <div className="raiox-destaque">
          <PiggyBank className="raiox-destaque-icone"/>
          <div>
            <span>{vazio?'Ainda sem concorrência para medir':'Economia do seu plano'}</span>
            {vazio
              ?<strong className="raiox-destaque-valor">-</strong>
              :<strong className="raiox-destaque-valor">{contraSegundo.diferenca>0&&contraPior.diferenca>contraSegundo.diferenca
                ?<>{money(contraSegundo.diferenca)} <small>a</small> {money(contraPior.diferenca)}</>
                :money(Math.max(contraSegundo.diferenca,contraPior.diferenca))}</strong>}
            <p>{vazio?'Quando duas ou mais distribuidoras ofertarem o mesmo produto, a economia aparece aqui.':'Do mínimo (contra quem ficou em 2º) ao máximo (contra o preço mais alto ofertado).'}</p>
          </div>
        </div>

        <div className="raiox-kpis">
          {[{rotulo:'Contra o 2º colocado',r:contraSegundo,a:'plano' as Referencia,b:2 as Referencia},{rotulo:'Contra o 3º colocado',r:contraTerceiro,a:'plano' as Referencia,b:3 as Referencia},{rotulo:'Contra o mais caro',r:contraPior,a:'plano' as Referencia,b:'pior' as Referencia}].map(k=>
            <button type="button" key={k.rotulo} className="raiox-kpi" disabled={k.r.itens.length===0} onClick={()=>{setRefA(k.a);setRefB(k.b)}}>
              <span>{k.rotulo}</span>
              <strong>{k.r.itens.length===0?'-':money(k.r.diferenca)}</strong>
              <small>{k.r.itens.length===0?'Sem ofertas nessa colocação':`${formatarPercentual(percentual(k.r.diferenca,k.r.totalB))} a menos · ${k.r.itens.length} produto${k.r.itens.length===1?'':'s'}`}</small>
            </button>)}
        </div>

        <section className="raiox-bloco" aria-labelledby="titulo-raiox-comparar">
          <div className="raiox-bloco-cabecalho"><h3 id="titulo-raiox-comparar">Compare quaisquer duas colocações</h3>
            <div className="raiox-atalhos" role="group" aria-label="Comparações prontas">
              {ATALHOS.filter(atalho=>opcoes.some(o=>valorSelect(o)===valorSelect(atalho.b))).map(atalho=>{
                const ativo=valorSelect(atalho.a)===valorSelect(refA)&&valorSelect(atalho.b)===valorSelect(refB)
                return <button type="button" key={atalho.rotulo} className={ativo?'ativo':''} onClick={()=>{setRefA(atalho.a);setRefB(atalho.b)}}>{atalho.rotulo}</button>
              })}
            </div>
          </div>
          <div className="raiox-seletores">
            <label><span>Comparar</span><select value={valorSelect(refA)} onChange={e=>setRefA(lerSelect(e.target.value))}>{opcoes.map(o=><option key={valorSelect(o)} value={valorSelect(o)}>{nomeReferencia(o)}</option>)}</select></label>
            <button type="button" className="icon-button raiox-inverter" title="Inverter a comparação" aria-label="Inverter a comparação" onClick={inverter}><ArrowLeftRight/></button>
            <label><span>com</span><select value={valorSelect(refB)} onChange={e=>setRefB(lerSelect(e.target.value))}>{opcoes.map(o=><option key={valorSelect(o)} value={valorSelect(o)}>{nomeReferencia(o)}</option>)}</select></label>
          </div>

          {mesmaReferencia?<p className="raiox-aviso">Escolha duas referências diferentes para comparar.</p>
          :atual.itens.length===0?<p className="raiox-aviso">Nenhum produto tem oferta nas duas referências escolhidas.</p>
          :<>
            <p className={`raiox-veredito ${atual.diferenca>0?'bom':atual.diferenca<0?'ruim':''}`}>
              {Math.abs(atual.diferenca)<0.005
                ?<>{nomeReferencia(refA)} e {nomeReferencia(refB)} custam o mesmo nesses {atual.itens.length} produtos.</>
                :<><b>{nomeReferencia(refA)}</b> sai <b>{money(Math.abs(atual.diferenca))}</b> ({formatarPercentual(percentual(Math.abs(atual.diferenca),atual.totalB))}) {atual.diferenca>0?'mais barato':'mais caro'} que <b>{nomeReferencia(refB).toLowerCase()}</b> em {atual.itens.length} produto{atual.itens.length===1?'':'s'}.</>}
            </p>
            <div className="raiox-barras" role="img" aria-label={`${nomeReferencia(refA)}: ${money(atual.totalA)}. ${nomeReferencia(refB)}: ${money(atual.totalB)}.`}>
              {/* A cor marca quem sai mais barato, não o lado: inverter a comparação não repinta a barra. */}
              {[{ref:refA,total:atual.totalA,lado:'a'},{ref:refB,total:atual.totalB,lado:'b'}].map(barra=>
                <div key={barra.lado} className="raiox-barra-linha" title={`${nomeReferencia(barra.ref)}: ${money(barra.total)}`}>
                  <span>{nomeReferencia(barra.ref)}</span>
                  <div className="raiox-barra-trilho"><div className={`raiox-barra ${barra.total<=Math.min(atual.totalA,atual.totalB)?'raiox-barra-a':'raiox-barra-b'}`} style={{width:`${percentual(barra.total,maiorTotal)}%`}}/></div>
                  <strong>{money(barra.total)}</strong>
                </div>)}
            </div>
            {(maisBaratoEmA>0||maisBaratoEmB>0)&&<p className="raiox-contagem">{maisBaratoEmA} produto{maisBaratoEmA===1?'':'s'} mais barato{maisBaratoEmA===1?'':'s'} em {nomeReferencia(refA).toLowerCase()} · {maisBaratoEmB} em {nomeReferencia(refB).toLowerCase()} · {atual.itens.length-maisBaratoEmA-maisBaratoEmB} empatado{atual.itens.length-maisBaratoEmA-maisBaratoEmB===1?'':'s'}</p>}

            <div className="table-wrap raiox-tabela-wrap"><table className="raiox-tabela">
              <thead><tr><th scope="col">Produto</th><th scope="col">Qtd.</th><th scope="col">{nomeReferencia(refA)}</th><th scope="col">{nomeReferencia(refB)}</th><th scope="col">Diferença</th></tr></thead>
              <tbody>{itensVisiveis.map(item=><tr key={item.linha.quotationItemId}>
                <th scope="row">{item.linha.productName}</th>
                <td>{item.linha.quantidade}</td>
                <td>{money(item.precoA)}</td>
                <td>{money(item.precoB)}</td>
                <td className={item.diferenca>0.004?'bom':item.diferenca<-0.004?'ruim':''}>{Math.abs(item.diferenca)<0.005?'-':`${item.diferenca>0?'-':'+'}${money(Math.abs(item.diferenca))}`}</td>
              </tr>)}</tbody>
            </table></div>
            {itensOrdenados.length>LIMITE_PRODUTOS&&<button type="button" className="button button-ghost compact-action raiox-ver-todos" onClick={()=>setTodosProdutos(v=>!v)}>{todosProdutos?'Mostrar só as maiores diferenças':`Ver os ${itensOrdenados.length} produtos`}</button>}
          </>}
        </section>

        {umaSo.length>1&&<section className="raiox-bloco" aria-labelledby="titulo-raiox-umaso">
          <div className="raiox-bloco-cabecalho"><h3 id="titulo-raiox-umaso">E se comprasse tudo de uma distribuidora só?</h3>
            <p>Quanto a mais você pagaria nos produtos do plano que cada uma ofertou.</p></div>
          <ul className="raiox-umaso">{umaSo.map(f=><li key={f.responseId} title={`${f.supplierName}: ${money(f.custo)} pelos ${f.cobertos} produtos que ofertou`}>
            <span className="raiox-umaso-nome"><Store/><b>{f.supplierName}</b><small>{f.faltando>0?`${f.cobertos} produtos · faltariam ${f.faltando}`:`todos os ${f.cobertos} produtos`}</small></span>
            <div className="raiox-barra-trilho"><div className={`raiox-barra ${f.extra>0?'raiox-barra-b':'raiox-barra-a'}`} style={{width:`${Math.max(2,percentual(Math.abs(f.extra),maiorExtra))}%`}}/></div>
            <strong className={f.extra>0.004?'ruim':''}>{f.extra>0.004?`+${money(f.extra)}`:'mesmo valor'}</strong>
          </li>)}</ul>
        </section>}

        <p className="raiox-nota">As colocações usam o preço unitário de cada oferta na mesma quantidade do seu plano. O estoque informado pelas distribuidoras não entra nessa conta.</p>
      </div>

      <div className="modal-actions">
        <button type="button" className="button button-ghost" onClick={()=>void copiarResumo()}>{copiado?<><Check/>Resumo copiado</>:<><Copy/>Copiar resumo</>}</button>
        <button type="button" className="button button-primary" onClick={aoFechar}>Fechar</button>
      </div>
    </section>
  </div>
}
