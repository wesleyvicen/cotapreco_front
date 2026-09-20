import { ArrowRight, Clipboard, Link2, PartyPopper, Share2 } from 'lucide-react'
import { useState } from 'react'
import type { Cotacao } from '../../types'
import ConviteConfirmarEmail from '../ConviteConfirmarEmail'

const mensagemDeConvite = (link:string) =>
  `Olá! Estou realizando uma cotação pelo CotaPreço. Você pode enviar seus preços através deste link: ${link}`

export default function OnboardingSucesso({ cotacao, aoCompartilhar, aoAbrirCotacao }:{
  cotacao:Cotacao; aoCompartilhar:()=>void; aoAbrirCotacao:()=>void
}) {
  const [copiado, setCopiado] = useState('')
  const link = cotacao.publicUrl ?? ''
  const mensagem = mensagemDeConvite(link)
  const copiar = async (valor:string, tipo:string) => {
    await navigator.clipboard.writeText(valor)
    setCopiado(tipo); setTimeout(() => setCopiado(''), 1800)
    aoCompartilhar()
  }
  const enviarNoWhatsapp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(mensagem)}`, '_blank', 'noopener,noreferrer')
    aoCompartilhar()
  }
  return <div className="share-success onboarding-sucesso">
    <div className="success-icon"><PartyPopper/></div>
    <h2>Sua primeira cotação está pronta!</h2>
    <p>Agora é só enviar o link para seus representantes.</p>
    {cotacao.demo && <span className="badge badge-demo">Demonstração</span>}
    <div className="copy-box"><Link2/><span>{link}</span>
      <button type="button" className="button button-secondary" onClick={() => void copiar(link, 'link')}>{copiado === 'link' ? 'Copiado!' : 'Copiar link'}</button>
    </div>
    <div className="onboarding-actions centered">
      <button type="button" className="button button-primary" onClick={enviarNoWhatsapp}><Share2/>Enviar pelo WhatsApp</button>
      <button type="button" className="button button-ghost" onClick={() => void copiar(mensagem, 'mensagem')}><Clipboard/>{copiado === 'mensagem' ? 'Mensagem copiada!' : 'Copiar mensagem'}</button>
    </div>
    <div className="message-preview"><p>{mensagem}</p></div>
    <div className="onboarding-actions centered">
      <button type="button" className="button button-secondary" onClick={aoAbrirCotacao}>Ir para minha cotação <ArrowRight/></button>
    </div>
    {/* Melhor momento para convidar a confirmar o e-mail: a cotação já está pronta, então o
        pedido soa como cuidado com o que ela acabou de criar, não como burocracia de cadastro. */}
    <ConviteConfirmarEmail/>
  </div>
}
