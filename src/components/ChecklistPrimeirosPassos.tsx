import { ArrowRight, CheckCircle2, Circle, X } from 'lucide-react'
import { useState } from 'react'
import type { ChecklistOnboarding, Onboarding } from '../types'
import { LinkInterno } from '../roteamento'

const CHAVE_DISPENSADO = 'cotapreco_primeiros_passos_dispensado'

const ITENS:{ campo:keyof ChecklistOnboarding; rotulo:string }[] = [
  { campo:'accountCreated', rotulo:'Criar sua conta' },
  { campo:'orderImported', rotulo:'Importar um pedido' },
  { campo:'quotationCreated', rotulo:'Criar primeira cotação' },
  { campo:'quotationShared', rotulo:'Enviar para um representante' },
  { campo:'supplierResponseReceived', rotulo:'Receber primeira resposta' },
  { campo:'resultViewed', rotulo:'Conferir resultado da cotação' },
]

const foiDispensado = () => { try { return localStorage.getItem(CHAVE_DISPENSADO) === '1' } catch { return false } }

/*
 * Nada aqui é marcado à mão: cada item vem do backend, que olha o que a farmácia realmente
 * já fez. O cartão some sozinho quando o onboarding termina, e antes disso pode ser fechado
 * por quem não quer o lembrete - a preferência é de quem está no navegador, então fica nele.
 */
export default function ChecklistPrimeirosPassos({ onboarding }:{ onboarding:Onboarding }) {
  const [dispensado, setDispensado] = useState(foiDispensado)
  const concluidos = ITENS.filter(item => onboarding.checklist[item.campo]).length
  const tudoPronto = concluidos === ITENS.length
  if (tudoPronto || dispensado) return null
  /* Enquanto não existe cotação, o caminho é o fluxo guiado. Depois que ela existe, o que
     falta (enviar, receber, conferir) acontece na própria cotação, então o cartão manda para
     lá em vez de reabrir um assistente que já cumpriu o papel dele. */
  const guiado = !onboarding.checklist.quotationCreated

  const dispensar = () => {
    setDispensado(true)
    try { localStorage.setItem(CHAVE_DISPENSADO, '1') } catch { /* Sem armazenamento o cartão volta na próxima visita. */ }
  }

  return <section className="card primeiros-passos">
    <div className="card-header">
      <div><h2>Primeiros passos</h2><p>{concluidos} de {ITENS.length} concluídos</p></div>
      <button type="button" className="icon-button" title="Fechar" aria-label="Fechar primeiros passos" onClick={dispensar}><X/></button>
    </div>
    {/* O corpo tem padding próprio: .card não traz nenhum, e sem isto a barra de progresso
        encostava nas bordas e o botão ficava colado no rodapé do cartão. */}
    <div className="primeiros-passos-corpo">
      <div className="primeiros-passos-progresso" role="progressbar" aria-valuemin={0} aria-valuemax={ITENS.length} aria-valuenow={concluidos}>
        <span style={{ width:`${(concluidos / ITENS.length) * 100}%` }}/>
      </div>
      <ul className="primeiros-passos-lista">
        {ITENS.map(item => {
          const pronto = onboarding.checklist[item.campo]
          return <li key={item.campo} className={pronto ? 'done' : ''}>
            {pronto ? <CheckCircle2/> : <Circle/>}<span>{item.rotulo}</span>
          </li>
        })}
      </ul>
      <LinkInterno className="button button-primary primeiros-passos-acao" to={guiado ? '/primeira-cotacao' : '/cotacoes'}>
        {guiado ? 'Criar primeira cotação' : 'Ver minhas cotações'} <ArrowRight/>
      </LinkInterno>
    </div>
  </section>
}
