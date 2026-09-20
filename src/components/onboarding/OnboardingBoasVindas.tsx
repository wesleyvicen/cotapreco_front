import { ArrowRight, Sparkles } from 'lucide-react'

export default function OnboardingBoasVindas({ aoComecar, aoPular, ocupado }:{
  aoComecar:()=>void; aoPular:()=>void; ocupado:boolean
}) {
  return <div className="onboarding-welcome">
    <div className="onboarding-welcome-icone"><Sparkles/></div>
    <h2>Sua primeira cotação começa aqui 👋</h2>
    <p>Em poucos passos você vai importar um pedido da sua farmácia e criar uma cotação pronta para enviar aos seus representantes.</p>
    <p className="onboarding-destaque">Você não precisa cadastrar os produtos manualmente.</p>
    <div className="onboarding-actions centered">
      <button type="button" className="button button-primary" disabled={ocupado} onClick={aoComecar}>Criar minha primeira cotação <ArrowRight/></button>
      <button type="button" className="button button-ghost" disabled={ocupado} onClick={aoPular}>Explorar sozinho</button>
    </div>
  </div>
}
