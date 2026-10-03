import { Clock, PiggyBank, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api, money } from '../api'
import type { VisaoEconomia } from '../types'

/* Uma casa decimal só onde ela muda a leitura (1,6×); de 10× em diante, número inteiro.
   Sempre truncado, como no backend: 6,75× vira 6,7×, nunca promete mais do que aconteceu. */
const vezes=(valor:number)=>{
  const truncado=valor>=10?Math.floor(valor+1e-9):Math.floor(valor*10+1e-9)/10
  return `${truncado.toLocaleString('pt-BR',valor>=10?{maximumFractionDigits:0}:{minimumFractionDigits:1,maximumFractionDigits:1})}×`
}
/* Horas e minutos, nunca hora decimal: "1,9 h" se lê como 1 h 90 min. */
const horas=(minutos:number)=>{const h=Math.floor(minutos/60),m=minutos%60;return h===0?`${m} min`:m===0?`${h} h`:`${h} h ${m} min`}

/* O retorno do CotaPreço fora do painel: na tela de assinatura, para lembrar por que se
   paga; no cancelamento, para a decisão ser tomada vendo o número. Usa o mesmo endpoint do
   modal de economia, somando todas as farmácias do grupo, porque a mensalidade é do grupo.
   Sem cotação com economia ainda, não aparece: zero não convence ninguém. */
export default function ResumoRetorno({ variante }:{ variante:'assinatura'|'cancelamento' }) {
  const [dados,setDados]=useState<VisaoEconomia|null>(null)
  useEffect(()=>{ api<VisaoEconomia>('/dashboard/economia?geral=true').then(setDados).catch(()=>setDados(null)) },[])
  if(!dados||dados.totalSavings<=0)return null

  const mes=dados.currentMonth
  /* Economia e mensalidades do mesmo período: economia de antes dos meses gravados não entra. */
  const retornoTotal=dados.totalPaid>0?dados.savingsWhilePaying/dados.totalPaid:null
  const manchete=variante==='cancelamento'
    ?retornoTotal!==null&&retornoTotal>=1
      ?`Até aqui, o CotaPreço economizou ${vezes(retornoTotal)} o que você pagou`
      :`Até aqui, o CotaPreço já economizou ${money(dados.totalSavings)} para você`
    :mes?.paidOff&&mes.returnMultiple!==null
      ?`Neste mês, seu CotaPreço já se pagou ${vezes(mes.returnMultiple)}`
      :dados.trial?.returnMultiple!=null&&dados.trial.returnMultiple>=1
        ?`No teste, sua economia já pagaria a assinatura ${vezes(dados.trial.returnMultiple)}`
        :`Você já economizou ${money(dados.totalSavings)} com o CotaPreço`

  return <section className={`resumo-retorno resumo-retorno-${variante}`} aria-label="Retorno do CotaPreço">
    <strong className="resumo-retorno-manchete">{manchete}</strong>
    <ul>
      <li><PiggyBank aria-hidden="true"/><span><b>{money(dados.totalSavings)}</b> economizados</span></li>
      {dados.totalPaid>0&&<li><TrendingUp aria-hidden="true"/><span><b>{money(dados.totalPaid)}</b> em mensalidades</span></li>}
      {dados.benefits.estimatedMinutesSaved>0&&<li><Clock aria-hidden="true"/><span><b>≈ {horas(dados.benefits.estimatedMinutesSaved)}</b> poupadas (estimativa)</span></li>}
    </ul>
    {variante==='cancelamento'&&<p>Ao cancelar, as próximas cotações deixam de comparar preços por você.</p>}
  </section>
}
