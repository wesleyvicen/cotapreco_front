import { AlertTriangle, Clock3 } from 'lucide-react'
import { usarAutenticacao } from '../autenticacao'

const WHATSAPP = 'https://wa.me/5581999441494?text=' + encodeURIComponent('Olá! Quero assinar o CotaPreço.')

/*
 * O aviso do teste vive no layout, não em cada tela: a farmácia precisa ver o prazo
 * onde quer que esteja, e no dia seguinte ao vencimento saber por que parou de criar.
 */
export default function FaixaAssinatura() {
  const { user } = usarAutenticacao()
  /* == null cobre o undefined de um backend antigo: durante a implantação a faixa
     simplesmente não aparece, em vez de anunciar vencimento para quem não tem prazo. */
  if (!user || user.daysLeft == null) return null

  if (user.accessAllowed === false) return <div className="faixa-assinatura faixa-assinatura-vencida" role="status">
    <AlertTriangle/>
    <div>
      <strong>Seu período de teste terminou</strong>
      <span>Você continua vendo e exportando tudo o que já é seu. Para criar novas cotações, fale com a gente.</span>
    </div>
    <a className="button button-primary" href={WHATSAPP} target="_blank" rel="noopener noreferrer">Assinar pelo WhatsApp</a>
  </div>

  if (user.daysLeft > 3) return null
  return <div className="faixa-assinatura" role="status">
    <Clock3/>
    <div>
      <strong>{user.daysLeft === 1 ? 'Seu teste termina hoje' : `Seu teste termina em ${user.daysLeft} dias`}</strong>
      <span>Depois disso você continua com acesso ao histórico e às exportações, mas não cria novas cotações.</span>
    </div>
    <a className="button button-secondary" href={WHATSAPP} target="_blank" rel="noopener noreferrer">Falar sobre assinatura</a>
  </div>
}
