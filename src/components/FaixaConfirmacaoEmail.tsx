import { MailWarning } from 'lucide-react'
import { useState } from 'react'
import { api, ErroApi } from '../api'
import { usarAutenticacao } from '../autenticacao'

/*
 * Fica no layout, acima de qualquer tela: a pessoa acabou de criar a conta e precisa
 * saber já na primeira tela por que a cotação não abre — e onde procurar o e-mail.
 */
export default function FaixaConfirmacaoEmail() {
  const { user } = usarAutenticacao()
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState('')

  /* Indefinido em backend antigo: só avisa quando o servidor disse que falta confirmar. */
  if (!user || user.emailConfirmed !== false) return null

  const reenviar = async () => {
    setEnviando(true); setAviso('')
    try { setAviso((await api<{ message:string }>('/auth/reenviar-confirmacao', { method:'POST' })).message) }
    catch (erro) { setAviso(erro instanceof ErroApi ? erro.message : 'Não foi possível reenviar agora.') }
    finally { setEnviando(false) }
  }

  return <div className="faixa-confirmacao" role="status">
    <div className="faixa-confirmacao-topo">
      <MailWarning/>
      <div>
        <strong>Confirme seu e-mail para criar cotações</strong>
        <span>Enviamos um link para <b>{user.email}</b>. É só clicar nele e voltar — o resto do sistema continua liberado.</span>
      </div>
      <button type="button" className="button button-secondary" disabled={enviando} onClick={() => void reenviar()}>
        {enviando ? 'Enviando...' : 'Reenviar e-mail'}
      </button>
    </div>
    <p className="faixa-confirmacao-spam">
      <strong>Não achou?</strong> Procure na caixa de <b>spam</b> ou <b>lixo eletrônico</b> por “CotaPreço”. Se estiver lá,
      marque como <b>não é spam</b> — assim os avisos das suas cotações passam a chegar na caixa de entrada.
    </p>
    {aviso && <p className="faixa-confirmacao-aviso">{aviso}</p>}
  </div>
}
