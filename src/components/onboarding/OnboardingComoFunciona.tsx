import { ArrowRight, ClipboardList, FileSpreadsheet, MessagesSquare, PiggyBank } from 'lucide-react'

const ETAPAS = [
  { icone:<FileSpreadsheet/>, titulo:'Pedido' },
  { icone:<ClipboardList/>, titulo:'Cotação' },
  { icone:<MessagesSquare/>, titulo:'Representantes respondem' },
  { icone:<PiggyBank/>, titulo:'Você encontra as melhores condições' },
]

export default function OnboardingComoFunciona({ aoContinuar }:{ aoContinuar:()=>void }) {
  return <div>
    <div className="wizard-heading"><span>Passo 4 de 5</span><h2>Agora o CotaPreço faz o resto.</h2></div>
    <ol className="onboarding-fluxo">
      {ETAPAS.map(etapa => <li key={etapa.titulo}><span className="onboarding-fluxo-icone">{etapa.icone}</span><strong>{etapa.titulo}</strong></li>)}
    </ol>
    <p className="onboarding-destaque">Você envia um único link aos seus representantes. Eles informam os preços e o CotaPreço organiza as propostas para você.</p>
    <div className="onboarding-actions centered">
      <button type="button" className="button button-primary" onClick={aoContinuar}>Continuar <ArrowRight/></button>
    </div>
  </div>
}
