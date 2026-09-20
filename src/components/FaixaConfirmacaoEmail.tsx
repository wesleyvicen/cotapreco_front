import { MailCheck } from 'lucide-react'
import { useState } from 'react'
import { usarAutenticacao } from '../autenticacao'
import { MOTIVO_CONFIRMAR_EMAIL, reenviarConfirmacaoEmail } from '../lib/confirmacaoEmail'

/*
 * Fica no layout, acima de qualquer tela. Não é um bloqueio: quem não confirmou usa o sistema
 * inteiro, cria cotação e compartilha o link normalmente. A faixa está aqui para lembrar do
 * que a pessoa ganha ao confirmar, e continua visível até ela confirmar.
 */
export default function FaixaConfirmacaoEmail() {
  const { user } = usarAutenticacao()
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState('')

  /* Indefinido em backend antigo: só convida quando o servidor disse que falta confirmar. */
  if (!user || user.emailConfirmed !== false) return null

  const reenviar = async () => {
    setEnviando(true); setAviso('')
    setAviso(await reenviarConfirmacaoEmail())
    setEnviando(false)
  }

  return <div className="faixa-confirmacao" role="status">
    <div className="faixa-confirmacao-topo">
      <MailCheck/>
      <div>
        <strong>Confirme seu e-mail e garanta o acesso à sua conta</strong>
        <span>Enviamos um link para <b>{user.email}</b>. {MOTIVO_CONFIRMAR_EMAIL} Leva um clique.</span>
      </div>
      <button type="button" className="button button-secondary" disabled={enviando} onClick={() => void reenviar()}>
        {enviando ? 'Enviando...' : 'Reenviar e-mail'}
      </button>
    </div>
    <p className="faixa-confirmacao-spam">
      <strong>Não achou?</strong> Procure na caixa de <b>spam</b> ou <b>lixo eletrônico</b> por “CotaPreço”. Se estiver lá,
      marque como <b>não é spam</b>. Assim os avisos das suas cotações passam a chegar na caixa de entrada.
    </p>
    {aviso && <p className="faixa-confirmacao-aviso">{aviso}</p>}
  </div>
}
