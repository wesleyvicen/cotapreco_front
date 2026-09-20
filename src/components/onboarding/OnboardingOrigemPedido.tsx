import { ArrowLeft, ArrowRight, FlaskConical } from 'lucide-react'

/* A cotação real é o caminho principal, e a demonstração fica visivelmente secundária: quem
   tem um pedido em mãos deve sair daqui com uma cotação que pode enviar de verdade. */
export default function OnboardingOrigemPedido({ aoImportar, aoUsarExemplo, aoVoltar, ocupado }:{
  aoImportar:()=>void; aoUsarExemplo:()=>void; aoVoltar:()=>void; ocupado:boolean
}) {
  return <div>
    <div className="wizard-heading"><span>Passo 3 de 5</span><h2>Vamos usar um pedido real da sua farmácia.</h2><p>Essa cotação será válida e poderá ser enviada normalmente aos seus representantes.</p></div>
    <div className="onboarding-actions centered">
      <button type="button" className="button button-primary" disabled={ocupado} onClick={aoImportar}>Importar meu pedido <ArrowRight/></button>
    </div>
    <div className="onboarding-alternativa">
      <span>Ainda não tem um pedido agora?</span>
      <button type="button" className="text-link" disabled={ocupado} onClick={aoUsarExemplo}><FlaskConical/>{ocupado ? 'Preparando exemplo...' : 'Testar com dados de exemplo'}</button>
      <small>A cotação de exemplo fica marcada como demonstração e não entra nos seus números.</small>
    </div>
    <div className="onboarding-actions">
      <button type="button" className="button button-ghost" disabled={ocupado} onClick={aoVoltar}><ArrowLeft/>Voltar</button>
      <span/>
    </div>
  </div>
}
