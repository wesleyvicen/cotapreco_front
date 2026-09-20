import { Check, Store } from 'lucide-react'
import { GUIAS_ERP } from '../../lib/guiasErp'
import type { SistemaErp } from '../../types'

export default function OnboardingEscolhaErp({ selecionado, aoEscolher, ocupado }:{
  selecionado:SistemaErp|null; aoEscolher:(erp:SistemaErp)=>void; ocupado:boolean
}) {
  return <div>
    <div className="wizard-heading"><span>Passo 1 de 5</span><h2>Qual sistema você utiliza na sua farmácia?</h2><p>Com isso a gente te mostra exatamente onde encontrar o seu pedido.</p></div>
    {/* Escolher já avança: um botão de "continuar" depois do clique só pede a mesma resposta duas vezes. */}
    <div className="onboarding-erp-grid">
      {GUIAS_ERP.map(guia => <button key={guia.id} type="button" disabled={ocupado}
        className={`source-card onboarding-erp-card ${selecionado === guia.id ? 'selected' : ''}`}
        aria-pressed={selecionado === guia.id} onClick={() => aoEscolher(guia.id)}>
        {selecionado === guia.id ? <Check/> : <Store/>}
        <span><strong>{guia.nome}</strong><small>{guia.descricao}</small></span>
      </button>)}
    </div>
  </div>
}
