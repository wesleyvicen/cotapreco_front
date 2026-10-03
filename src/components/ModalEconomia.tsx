import { ArrowRight, ChevronDown, Clock, History, Info, PiggyBank, ShieldCheck, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api, money, ErroApi } from '../api'
import { usarCamadaNoHistorico } from '../hooks/usarCamadaNoHistorico'
import { LinkInterno } from '../roteamento'
import type { BeneficiosEconomia, EconomiaCotacao, GarantiaSatisfacao, LinhaEconomia, MesEconomia, PeriodoTeste, VisaoEconomia } from '../types'
import { AvisoErro, Carregando } from './ComponentesUI'

const dia=(valor:string)=>new Intl.DateTimeFormat('pt-BR',{dateStyle:'short'}).format(new Date(valor))
/* Datas do ciclo chegam como 'yyyy-MM-dd'. new Date() leria como meia-noite UTC e, no horário
   de Brasília, mostraria o dia anterior; por isso a data é montada à mão. */
const diaCiclo=(valor:string)=>{const [a,m,d]=valor.split('-');return `${d}/${m}/${a}`}
const diaCurto=(valor:string)=>{const [,m,d]=valor.split('-');return `${d}/${m}`}
/* Uma casa decimal só onde ela muda a leitura (1,6×); de 10× em diante, número inteiro.
   Sempre truncado, como no backend: 6,75× vira 6,7×, nunca promete mais do que aconteceu. */
const vezes=(valor:number)=>{
  const truncado=valor>=10?Math.floor(valor+1e-9):Math.floor(valor*10+1e-9)/10
  return `${truncado.toLocaleString('pt-BR',valor>=10?{maximumFractionDigits:0}:{minimumFractionDigits:1,maximumFractionDigits:1})}×`
}
/* Horas e minutos, nunca hora decimal: "1,9 h" se lê como 1 h 90 min. */
function horas(minutos:number){
  const h=Math.floor(minutos/60),m=minutos%60
  if(h===0)return `${m} min`
  return m===0?`${h} h`:`${h} h ${m} min`
}

type NomeReferencia={curto:string;frase:string}
function nomeReferencia(posicao:number):NomeReferencia{
  return posicao===0?{curto:'Último colocado',frase:'o último colocado'}:{curto:`${posicao}º colocado`,frase:`o ${posicao}º colocado`}
}
const rotuloColocacao=(posicao:number,ultimo:boolean)=>ultimo?`${posicao}º (último colocado)`:`${posicao}º colocado`

/* Com quem o plano é comparado. O padrão é o último colocado de cada produto: quando os
   distribuidores combinam preço, o 2º colocado fica colado no 1º e a economia parece menor
   do que a cotação de fato evitou. As outras colocações ficam a um clique. */
function SeletorReferencia({valor,maxPropostas,aoMudar}:{valor:number;maxPropostas:number;aoMudar:(v:number)=>void}){
  const intermediarias=Array.from({length:Math.max(0,maxPropostas-2)},(_,i)=>i+2)
  return <label className="economia-referencia">
    <span>Comparar seu plano com</span>
    <select value={valor} onChange={e=>aoMudar(Number(e.target.value))} disabled={intermediarias.length===0}>
      <option value={0}>o último colocado (padrão)</option>
      {intermediarias.map(p=><option key={p} value={p}>o {p}º colocado</option>)}
    </select>
  </label>
}

/* Abre ao clicar no cartão "Economia estimada". É o argumento de que vale continuar: a
   manchete diz quantas vezes a economia pagou a mensalidade, os números mostram o que o
   sistema fez, e a conta de cada real fica logo abaixo, cotação por cotação. */
export default function ModalEconomia({ geral, aoFechar }:{ geral:boolean; aoFechar:()=>void }) {
  const [dados,setDados]=useState<VisaoEconomia|null>(null)
  const [erro,setErro]=useState('')
  /* 0 = último colocado (padrão). Trocar refaz toda a conta: manchete, números e cotações. */
  const [referencia,setReferencia]=useState(0)
  const [recalculando,setRecalculando]=useState(false)
  usarCamadaNoHistorico(true,aoFechar)

  useEffect(()=>{
    let ativo=true
    setRecalculando(true)
    api<VisaoEconomia>(`/dashboard/economia?geral=${geral}&referencia=${referencia}`)
      .then(v=>{if(ativo){setDados(v);setErro('')}})
      .catch(e=>{if(ativo)setErro(e instanceof ErroApi?e.message:'Não foi possível carregar o detalhe da economia.')})
      .finally(()=>{if(ativo)setRecalculando(false)})
    return ()=>{ativo=false}
  },[geral,referencia])
  const ref=nomeReferencia(referencia)

  return <div className="modal-backdrop" role="presentation" onClick={e=>{if(e.target===e.currentTarget)aoFechar()}}>
    <div className="modal economia-modal" role="dialog" aria-modal="true" aria-labelledby="economia-titulo">
      <div className="modal-header"><div className="modal-icon"><PiggyBank/></div>
        <div><h2 id="economia-titulo">Quanto o CotaPreço já rendeu para você</h2><p>{dados?`${money(dados.totalSavings)} economizados em ${dados.benefits.quotations} ${dados.benefits.quotations===1?'cotação':'cotações'}`:'Carregando…'}</p></div>
        <button type="button" className="icon-button" aria-label="Fechar" onClick={aoFechar}>×</button></div>
      <div className="economia-corpo">
        {erro&&<AvisoErro message={erro}/>}
        {!dados?!erro&&<Carregando/>:<div className={`economia-conteudo ${recalculando?'economia-recalculando':''}`} aria-busy={recalculando}>
          <SeletorReferencia valor={referencia} maxPropostas={dados.maxOffers} aoMudar={setReferencia}/>
          {dados.currentMonth?<Manchete mes={dados.currentMonth}/>:dados.trial&&<MancheteTeste teste={dados.trial}/>}
          {dados.guarantee&&<FaixaGarantia garantia={dados.guarantee} primeiraCobranca={dados.trial?.firstChargeOn??null}/>}
          {dados.benefits.quotations>0&&<Beneficios beneficios={dados.benefits} referencia={ref}/>}
          {/* O que explica o número fica recolhido: sempre a um clique, sem empurrar as cotações para baixo. */}
          <div className="economia-expansores">
            <details className="economia-expansor">
              <summary><Info aria-hidden="true"/>Como calculamos<ChevronDown aria-hidden="true"/></summary>
              <ComoCalculamos minutosPorItem={dados.benefits.minutesPerItem}/>
            </details>
            {dados.previousMonths.length>0&&<details className="economia-expansor">
              <summary><History aria-hidden="true"/>Meses anteriores <span className="economia-contagem">{dados.previousMonths.length}</span><ChevronDown aria-hidden="true"/></summary>
              <MesesAnteriores meses={dados.previousMonths}/>
            </details>}
          </div>
          <section><h3 className="economia-titulo-lista">Cotações <small>clique para ver a conta de cada produto</small></h3>
            {dados.quotations.length===0
              ?<p className="economia-vazio">Assim que uma cotação tiver propostas de pelo menos dois distribuidores para o mesmo produto, a economia aparece aqui.</p>
              :dados.quotations.map(c=><CartaoCotacao key={`${c.quotationId}-${referencia}`} cotacao={c} mostrarFarmacia={geral} referencia={ref}/>)}
          </section>
        </div>}
      </div>
      <div className="modal-actions"><button type="button" className="button button-ghost" onClick={aoFechar} autoFocus>Fechar</button></div>
    </div></div>
}

/* Manchete do mês pago: quando a economia já cobriu a mensalidade, o número grande é o
   retorno ("se pagou 2,4×"); antes disso, quanto falta, com a barra. */
function Manchete({mes}:{mes:MesEconomia}){
  const progresso=Math.min(100,mes.subscriptionValue>0?(mes.savings/mes.subscriptionValue)*100:0)
  const falta=Math.max(0,mes.subscriptionValue-mes.savings)
  return <section className={`economia-manchete ${mes.paidOff?'economia-manchete-ok':''}`} aria-label="Retorno deste mês">
    <div className="economia-manchete-numero">{mes.paidOff&&mes.returnMultiple!==null?<><strong>{vezes(mes.returnMultiple)}</strong><span>o valor da assinatura</span></>:<><strong>{Math.round(progresso)}%</strong><span>da mensalidade</span></>}</div>
    <div className="economia-manchete-texto">
      <h3>{mes.paidOff?'Seu CotaPreço já se pagou neste mês':`Faltam ${money(falta)} para a economia pagar a mensalidade`}</h3>
      <div className="economia-barra" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progresso)} aria-label="Economia do mês contra a mensalidade"><span style={{width:`${progresso}%`}}/></div>
      <small><strong>{money(mes.savings)}</strong> economizados · mensalidade {money(mes.subscriptionValue)} · {mes.number}º mês, {diaCurto(mes.startsAt)} a {diaCurto(mes.lastDay)}</small>
    </div>
  </section>
}

/* No teste ainda não há mensalidade paga: a conta é toda a economia contra o que vai pagar. */
function MancheteTeste({teste}:{teste:PeriodoTeste}){
  const progresso=Math.min(100,teste.monthlyValue>0?(teste.savings/teste.monthlyValue)*100:0)
  const cobre=teste.returnMultiple!==null&&teste.returnMultiple>=1
  return <section className={`economia-manchete ${cobre?'economia-manchete-ok':''}`} aria-label="Economia no período de teste">
    <div className="economia-manchete-numero">{cobre?<><strong>{vezes(teste.returnMultiple!)}</strong><span>o valor da assinatura</span></>:<><strong>{Math.round(progresso)}%</strong><span>da mensalidade</span></>}</div>
    <div className="economia-manchete-texto">
      <h3>{cobre?'No teste, sua economia já pagaria a assinatura':`Faltam ${money(Math.max(0,teste.monthlyValue-teste.savings))} para a economia pagar a assinatura`}</h3>
      <div className="economia-barra" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progresso)} aria-label="Economia no teste contra a mensalidade"><span style={{width:`${progresso}%`}}/></div>
      <small><strong>{money(teste.savings)}</strong> economizados no período de teste · mensalidade {money(teste.monthlyValue)}</small>
    </div>
  </section>
}

function FaixaGarantia({garantia,primeiraCobranca}:{garantia:GarantiaSatisfacao;primeiraCobranca:string|null}){
  return <p className="economia-garantia-faixa"><span className="economia-selo"><ShieldCheck aria-hidden="true"/>Garantia de {garantia.days} dias</span>
    <span>Se o CotaPreço não fizer sentido para você, pelo tempo ou pela economia, devolvemos a 1ª mensalidade. {garantia.until?`Vale até ${diaCiclo(garantia.until)}.`:primeiraCobranca?`Começa no 1º pagamento, em ${diaCiclo(primeiraCobranca)}.`:'Começa no 1º pagamento.'}</span></p>
}

/* Só números que o sistema mediu, mais o tempo, que é estimativa e diz isso. */
function Beneficios({beneficios,referencia}:{beneficios:BeneficiosEconomia;referencia:NomeReferencia}){
  const itens=[
    {icone:<PiggyBank/>,valor:money(beneficios.totalSavings),rotulo:'economizados'},
    {icone:<Clock/>,valor:`≈ ${horas(beneficios.estimatedMinutesSaved)}`,rotulo:'poupadas sem comparar na mão (estimativa)'},
    {icone:<TrendingUp/>,valor:String(beneficios.cheaperProducts),rotulo:`${beneficios.cheaperProducts===1?'produto mais barato':'produtos mais baratos'} que ${referencia.frase}`},
    {icone:<History/>,valor:String(beneficios.proposalsCompared),rotulo:`propostas comparadas em ${beneficios.productsQuoted} produtos`},
  ]
  return <ul className="economia-beneficios" aria-label="O que o CotaPreço já fez por você">
    {itens.map(i=><li key={i.rotulo}><span className="economia-beneficio-icone" aria-hidden="true">{i.icone}</span><div><strong>{i.valor}</strong><span>{i.rotulo}</span></div></li>)}
  </ul>
}

function ComoCalculamos({minutosPorItem}:{minutosPorItem:number}){
  return <div className="economia-expansor-corpo">
    <div>
      <p><strong>Economia.</strong> Para cada produto, comparamos o preço do seu plano de compra com a proposta de referência:</p>
      <div className="economia-formula"><span>(preço da referência − preço do seu plano)</span><span>×</span><span>quantidade comparável</span></div>
      <ul>
        <li>Por padrão, a referência é o último colocado: mostra toda a diferença de preço entre as propostas que você recebeu. Quando os distribuidores combinam preço, o 2º colocado fica muito perto do 1º e a diferença real some.</li>
        <li>No topo, dá para comparar com qualquer outra colocação.</li>
        <li>Só conta a quantidade que a referência tinha em estoque.</li>
        <li>Produto com uma proposta só fica de fora: não há com o que comparar.</li>
      </ul>
    </div>
    <div>
      <p><strong>Retorno.</strong> Economia das cotações feitas no mês ÷ mensalidade do mês. "2,0×" quer dizer que a economia pagou a assinatura duas vezes.</p>
      <p><strong>Tempo poupado (estimativa).</strong> Cada item de cada proposta que você compararia na mão conta {minutosPorItem.toLocaleString('pt-BR')} min. Uma cotação de 100 produtos com 3 propostas são 300 itens.</p>
    </div>
  </div>
}

function MesesAnteriores({meses}:{meses:MesEconomia[]}){
  return <ul className="economia-meses">{meses.map(m=><li key={m.startsAt} className={m.paidOff?'economia-mes-ok':''}>
    <span className="economia-mes-numero">{m.number}º mês</span>
    <span>{diaCiclo(m.startsAt)} a {diaCiclo(m.lastDay)}</span>
    <span>{money(m.savings)} / {money(m.subscriptionValue)} · {m.quotations} {m.quotations===1?'cotação':'cotações'}</span>
    <b>{m.paidOff&&m.returnMultiple!==null?`Se pagou ${vezes(m.returnMultiple)}`:`${m.subscriptionValue>0?Math.round(m.savings/m.subscriptionValue*100):0}% da mensalidade`}</b>
  </li>)}</ul>
}

const percentual=(parte:number,total:number)=>`${(total>0?(parte/total)*100:0).toLocaleString('pt-BR',{maximumFractionDigits:1})}%`

function CartaoCotacao({cotacao,mostrarFarmacia,referencia}:{cotacao:EconomiaCotacao;mostrarFarmacia:boolean;referencia:NomeReferencia}){
  const [aberto,setAberto]=useState(false)
  const restantes=cotacao.comparedProducts-cotacao.topLines.length
  const semComparacao=cotacao.productCount-cotacao.comparedProducts
  return <div className={`economia-cotacao ${aberto?'aberta':''}`}>
    <button type="button" className="economia-cotacao-cabecalho" aria-expanded={aberto} onClick={()=>setAberto(!aberto)}>
      <div className="economia-cotacao-titulo"><strong>{cotacao.name}</strong>
        <small>{dia(cotacao.createdAt)}{mostrarFarmacia&&` · ${cotacao.pharmacyName}`}</small></div>
      <dl className="economia-metricas">
        <div><dt>Distribuidores</dt><dd>{cotacao.offeringSuppliers}</dd></div>
        <div><dt>Produtos com economia</dt><dd>{cotacao.comparedProducts} <small>de {cotacao.productCount}</small></dd></div>
        <div><dt>Mais barato que o {referencia.curto.toLowerCase()}</dt><dd>{percentual(cotacao.savings,cotacao.referenceTotal)}</dd></div>
        <div><dt>Economia</dt><dd className="economia-valor">{money(cotacao.savings)}</dd></div>
      </dl>
      <ChevronDown aria-hidden="true"/>
    </button>
    {aberto&&<div className="economia-detalhe">
      {cotacao.topLines.length===0?<p className="economia-vazio">{cotacao.offeringSuppliers<2?'Só um distribuidor respondeu, então não há com o que comparar.':`Seu plano não ficou mais barato que ${referencia.frase} em nenhum produto.`}</p>:<>
        <div className="economia-resumo-conta">
          <div><span>Se comprasse tudo do {referencia.curto.toLowerCase()}</span><strong>{money(cotacao.referenceTotal)}</strong></div>
          <span className="economia-resumo-sinal">−</span>
          <div><span>No seu plano de compra</span><strong>{money(cotacao.paidTotal)}</strong></div>
          <span className="economia-resumo-sinal">=</span>
          <div className="economia-resumo-total"><span>Sua economia</span><strong>{money(cotacao.savings)}</strong></div>
        </div>
        <p className="economia-nota">Somando só os {cotacao.comparedProducts} produtos em que houve diferença.{semComparacao>0&&` Os outros ${semComparacao} ficaram fora: tiveram menos propostas que essa colocação ou o mesmo preço dela.`}</p>
        <div className="table-wrap economia-tabela-wrap"><table className="economia-tabela">
          <thead><tr><th>Produto</th><th className="num">Qtd.</th><th>Seu plano</th><th>{referencia.curto}</th><th className="num">Diferença/un.</th><th className="num">Economia</th></tr></thead>
          <tbody>{cotacao.topLines.map(l=><Parcela key={l.quotationItemId} linha={l}/>)}</tbody>
        </table></div>
        <LinkInterno className="text-link" to={`/cotacoes/${cotacao.quotationId}`}>{restantes>0?`Ver os outros ${restantes} produtos na cotação`:'Abrir a cotação'} <ArrowRight/></LinkInterno>
      </>}
    </div>}
  </div>
}

function Parcela({linha}:{linha:LinhaEconomia}){
  /* data-label: no celular a tabela vira um cartão por produto e cada célula mostra o próprio rótulo. */
  return <tr>
    <td className="economia-celula-produto"><strong>{linha.productName}</strong><small>{linha.offerCount} {linha.offerCount===1?'proposta':'propostas'} · {linha.comparedQuantity} un. comparadas</small></td>
    <td className="num economia-celula-qtd" data-label="Qtd.">{linha.comparedQuantity}</td>
    <td data-label="Seu plano"><span className="economia-fornecedor">{linha.chosenSupplier}</span><small>{money(linha.paidUnitPrice)} × {linha.comparedQuantity} = {money(linha.paidTotal)}</small></td>
    <td data-label="Referência"><span className="economia-fornecedor">{linha.referenceSupplier}</span><small>{rotuloColocacao(linha.referencePosition,linha.referencePosition===linha.offerCount)}</small><small>{money(linha.referenceUnitPrice)} × {linha.comparedQuantity} = {money(linha.referenceTotal)}</small></td>
    <td className="num" data-label="Diferença/un.">{money(linha.referenceUnitPrice-linha.paidUnitPrice)}</td>
    <td className="num economia-valor" data-label="Economia">+{money(linha.savings)}</td>
  </tr>
}
