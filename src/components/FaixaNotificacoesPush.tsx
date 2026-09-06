import { BellRing, Laptop, ShieldCheck, Smartphone, Timer, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ativarNotificacoes, garantirInscricaoAtiva, isPushSuportado, permissaoAtual, precisaInstalarNoIos } from '../api/notificacaoPush'

const CHAVE_DISPENSADA = 'cotapreco:push-faixa-dispensada'
const VANTAGENS = [
  { Icone: Timer, texto: 'Saiba na hora quando um representante responder — sem ficar atualizando a tela.' },
  { Icone: Laptop, texto: 'Chega no computador e no celular, mesmo com o CotaPreço fechado.' },
  { Icone: ShieldCheck, texto: 'Só avisos de resposta de cotação. Sem spam, sem marketing.' },
]

/*
 * Fica acima das páginas do sistema (como FaixaAssinatura) só enquanto a farmácia ainda
 * não decidiu nada sobre notificações. Depois de ativar, desativar ou dispensar, some —
 * quem já tem a permissão concedida continua sendo sincronizado em silêncio, sem faixa.
 */
export default function FaixaNotificacoesPush() {
  const [estado, setEstado] = useState<'oculto' | 'convite' | 'instalar-ios'>('oculto')
  const [modalAberto, setModalAberto] = useState(false)
  const [ativando, setAtivando] = useState(false)

  useEffect(() => {
    let dispensada = false
    try { dispensada = sessionStorage.getItem(CHAVE_DISPENSADA) === 'true' } catch { /* segue sem lembrar a dispensa */ }
    if (dispensada) return
    if (precisaInstalarNoIos()) { setEstado('instalar-ios'); return }
    if (!isPushSuportado()) return
    const permissao = permissaoAtual()
    if (permissao === 'granted') { void garantirInscricaoAtiva(); return }
    if (permissao === 'default') setEstado('convite')
  }, [])

  useEffect(() => {
    if (!modalAberto) return
    const fecharComEscape = (evento: KeyboardEvent) => { if (evento.key === 'Escape') setModalAberto(false) }
    document.addEventListener('keydown', fecharComEscape)
    return () => document.removeEventListener('keydown', fecharComEscape)
  }, [modalAberto])

  const dispensar = () => {
    try { sessionStorage.setItem(CHAVE_DISPENSADA, 'true') } catch { /* preferência é só uma conveniência */ }
    setEstado('oculto')
  }
  const ativar = async () => {
    setAtivando(true)
    const resultado = await ativarNotificacoes()
    setAtivando(false)
    setModalAberto(false)
    if (resultado === 'ativado') setEstado('oculto')
  }

  if (estado === 'oculto') return null

  if (estado === 'instalar-ios') return <div className="faixa-push" role="status">
    <Smartphone/>
    <div>
      <strong>Receba avisos de novas respostas no iPhone</strong>
      <span>Toque em Compartilhar e depois em "Adicionar à Tela de Início". Abrindo pelo ícone criado, você pode ativar as notificações.</span>
    </div>
    <button className="button button-secondary" onClick={dispensar}>Agora não</button>
  </div>

  return <>
    <div className="faixa-push" role="status">
      <BellRing/>
      <div>
        <strong>Ative as notificações de resposta</strong>
        <span>Saiba na hora, no seu celular ou computador, quando um representante responder uma cotação.</span>
      </div>
      <button className="button button-primary" onClick={() => setModalAberto(true)}>Ativar</button>
      <button className="button button-secondary" onClick={dispensar}>Agora não</button>
    </div>

    {modalAberto && <div className="modal-backdrop" onClick={() => !ativando && setModalAberto(false)}>
      <div className="modal push-vantagens-modal" role="dialog" aria-modal="true" aria-labelledby="push-vantagens-titulo" onClick={evento => evento.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-icon"><BellRing/></div>
          <div><h2 id="push-vantagens-titulo">Ative as notificações de resposta</h2><p>Assim que uma distribuidora responder sua cotação, você fica sabendo na hora.</p></div>
          <button type="button" className="icon-button" title="Fechar" aria-label="Fechar" disabled={ativando} onClick={() => setModalAberto(false)}><X/></button>
        </div>

        <ul className="push-vantagens-lista">
          {VANTAGENS.map(({ Icone, texto }) => <li key={texto}><Icone/><span>{texto}</span></li>)}
        </ul>
        <p className="push-vantagens-nota">O navegador vai pedir sua confirmação a seguir — você pode desativar quando quiser.</p>

        <div className="modal-actions">
          <button type="button" className="button button-secondary" disabled={ativando} onClick={() => setModalAberto(false)}>Agora não</button>
          <button type="button" className="button button-primary" disabled={ativando} onClick={() => void ativar()}>{ativando ? 'Ativando…' : 'Ativar notificações'}</button>
        </div>
      </div>
    </div>}
  </>
}
