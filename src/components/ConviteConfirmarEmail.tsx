import { MailCheck } from 'lucide-react'
import { useState } from 'react'
import { usarAutenticacao } from '../autenticacao'
import { emailPendente } from '../lib/assinatura'
import { MOTIVO_CONFIRMAR_EMAIL, reenviarConfirmacaoEmail } from '../lib/confirmacaoEmail'

/*
 * Convite compacto, para aparecer logo depois de uma conquista - hoje, o fim da primeira
 * cotação. É o melhor momento para pedir: a pessoa acabou de ver o sistema funcionar, então
 * confirmar deixa de ser burocracia de cadastro e vira cuidado com o que ela já tem. Some
 * sozinho assim que o e-mail é confirmado, e nunca impede nada.
 */
export default function ConviteConfirmarEmail() {
  const { user } = usarAutenticacao()
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState('')
  if (!emailPendente(user?.emailConfirmed)) return null

  const reenviar = async () => {
    setEnviando(true); setAviso('')
    setAviso(await reenviarConfirmacaoEmail())
    setEnviando(false)
  }

  return <div className="convite-confirmar" role="status">
    <MailCheck/>
    <div>
      <strong>Falta um clique para sua conta ficar completa</strong>
      <span>{MOTIVO_CONFIRMAR_EMAIL} O link está no e-mail que enviamos para <b>{user?.email}</b>.</span>
      {aviso && <small>{aviso}</small>}
    </div>
    <button type="button" className="button button-ghost" disabled={enviando} onClick={() => void reenviar()}>
      {enviando ? 'Enviando...' : 'Reenviar'}
    </button>
  </div>
}
