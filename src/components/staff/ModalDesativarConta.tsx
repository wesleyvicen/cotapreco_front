import { AlertTriangle, UserX } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { api, ErroApi, money } from '../../api'
import { usarCamadaNoHistorico } from '../../hooks/usarCamadaNoHistorico'
import type { ContaStaff, ImpactoDesativacao, ModalidadeDesativacao, SolicitacaoDesativacao } from '../../types'
import { AvisoErro, Carregando } from '../ComponentesUI'
import { formatarCnpj, MOTIVO_MINIMO } from '../../lib/confirmacaoConta'
import CampoCodigoAutenticador from './CampoCodigoAutenticador'

/* A ação mais destrutiva do painel, então é de propósito que dê trabalho: dois passos, nenhuma
   modalidade marcada de início, CNPJ digitado à mão (colar é bloqueado), motivo e o código do
   autenticador. Nada disso substitui as conferências do backend (ver StaffService.desativar),
   que refaz todas: aqui é só para ninguém chegar ao fim sem ter lido o que vai acontecer. */
const MODALIDADES:{ valor:ModalidadeDesativacao, titulo:string, descricao:string }[] = [
  { valor:'SO_DESATIVAR', titulo:'Só desativar',
    descricao:'O acesso cai e nada muda nos dados. Dá para reativar exatamente como estava, mas o cliente não consegue se recadastrar com o mesmo e-mail nem com o mesmo CNPJ.' },
  { valor:'LIBERAR_EMAIL_CNPJ', titulo:'Desativar e liberar e-mail e CNPJ',
    descricao:'Para quando o cliente vai criar uma conta nova. Os originais ficam guardados, mas se ele se recadastrar com eles esta conta não poderá mais ser reativada.' },
]

function confere(impacto:ImpactoDesativacao, digitado:string) {
  if (impacto.confirmacaoPorCnpj) return digitado.replace(/\D/g, '') === impacto.cnpj
  return digitado.trim().toLowerCase() === impacto.nomeFarmacia.trim().toLowerCase()
}

export default function ModalDesativarConta({ conta, aoFechar, aoConcluir }:{
  conta:ContaStaff; aoFechar:()=>void; aoConcluir:(atualizada:ContaStaff)=>void
}) {
  const [impacto, setImpacto] = useState<ImpactoDesativacao|null>(null)
  const [passo, setPasso] = useState<'impacto'|'confirmar'>('impacto')
  const [modalidade, setModalidade] = useState<ModalidadeDesativacao|null>(null)
  const [motivo, setMotivo] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [errosCampo, setErrosCampo] = useState<Record<string,string>>({})
  const [salvando, setSalvando] = useState(false)

  usarCamadaNoHistorico(true, aoFechar)

  useEffect(() => {
    api<ImpactoDesativacao>(`/staff/accounts/${conta.grupoId}/impacto-desativacao`)
      .then(setImpacto)
      .catch(e => setErro(e instanceof ErroApi ? e.message : 'Não foi possível carregar o impacto da desativação.'))
  }, [conta.grupoId])

  const pronto = !!impacto && !!modalidade && motivo.trim().length >= MOTIVO_MINIMO && confere(impacto, confirmacao) && /^\d{6}$/.test(codigo)

  const desativar = async (evento:FormEvent) => {
    evento.preventDefault()
    if (!pronto || !modalidade) return
    setErro(''); setErrosCampo({}); setSalvando(true)
    try {
      const corpo:SolicitacaoDesativacao = { modalidade, motivo:motivo.trim(), confirmacao, codigoDoisFatores:codigo }
      aoConcluir(await api<ContaStaff>(`/staff/accounts/${conta.grupoId}/desativar`, { method:'PUT', body:JSON.stringify(corpo) }))
    } catch (e) {
      if (e instanceof ErroApi) { setErro(e.message); setErrosCampo(e.fields) }
      else setErro('Não foi possível desativar a conta.')
      /* Código do autenticador vale 30 segundos: depois de um erro, o próximo é outro. */
      setCodigo('')
    } finally { setSalvando(false) }
  }

  const escolhida = MODALIDADES.find(m => m.valor === modalidade)

  return <div className="modal-backdrop" role="presentation"><form className="modal user-modal desativar-modal" onSubmit={desativar}>
    <div className="modal-header"><div className="modal-icon modal-icon-perigo"><UserX/></div>
      <div><h2>Desativar conta</h2><p>{conta.nomeFarmacia}{conta.cnpj && ` · ${formatarCnpj(conta.cnpj)}`}</p></div>
      <button type="button" className="icon-button" aria-label="Fechar" onClick={aoFechar}>×</button></div>

    <div className="desativar-corpo">
      {erro && <AvisoErro message={erro}/>}
      {!impacto ? !erro && <Carregando/> : passo === 'impacto' ? <>
        <div className="alert alert-error desativar-alerta" role="alert">
          <AlertTriangle size={18} aria-hidden="true"/>
          <div><strong>Todos os usuários desta conta perdem o acesso na hora.</strong> Sessões abertas caem e ninguém consegue entrar até a conta ser reativada.</div>
        </div>

        <section className="desativar-impacto" aria-label="O que será afetado">
          <h3>O que será afetado</h3>
          <ul>
            <li><strong>{impacto.usuarios.length} usuário{impacto.usuarios.length !== 1 ? 's' : ''}</strong> perde{impacto.usuarios.length !== 1 ? 'm' : ''} o acesso:
              <ul className="desativar-usuarios">{impacto.usuarios.map(u => <li key={u.email}>{u.nome} · {u.email}{!u.ativo && ' (já estava inativo)'}</li>)}</ul></li>
            <li><strong>{impacto.farmaciasAtivas} farmácia{impacto.farmaciasAtivas !== 1 ? 's' : ''} ativa{impacto.farmaciasAtivas !== 1 ? 's' : ''}</strong> sai{impacto.farmaciasAtivas !== 1 ? 'em' : ''} do ar.</li>
            {impacto.cotacoesAbertas > 0 && <li><strong>{impacto.cotacoesAbertas} cotação{impacto.cotacoesAbertas !== 1 ? 'ões' : ''} aberta{impacto.cotacoesAbertas !== 1 ? 's' : ''}</strong>: os links públicos param de aceitar respostas dos representantes.</li>}
            {impacto.assinaturaAtivaNoAsaas
              ? <li className="desativar-destaque"><strong>A assinatura paga{impacto.pagando ? ` de ${money(impacto.precoMensalAtual)}/mês` : ''} será cancelada no Asaas.</strong> Ela não volta sozinha se a conta for reativada.</li>
              : <li>Não há assinatura paga ativa para cancelar.</li>}
            <li>Cotações, produtos e histórico <strong>não são apagados</strong>.</li>
          </ul>
        </section>

        <fieldset className="desativar-modalidades">
          <legend>Como desativar?</legend>
          {MODALIDADES.map(m => <label key={m.valor} className={`desativar-modalidade${modalidade === m.valor ? ' ativo' : ''}`}>
            <input type="radio" name="modalidade-desativacao" value={m.valor} checked={modalidade === m.valor} onChange={() => setModalidade(m.valor)}/>
            <span><strong>{m.titulo}</strong><small>{m.descricao}</small></span>
          </label>)}
        </fieldset>
      </> : <>
        <div className="alert alert-error desativar-alerta" role="alert">
          <AlertTriangle size={18} aria-hidden="true"/>
          <div><strong>{escolhida?.titulo}:</strong> {impacto.usuarios.length} usuário{impacto.usuarios.length !== 1 ? 's' : ''} perde{impacto.usuarios.length !== 1 ? 'm' : ''} o acesso agora
            {impacto.assinaturaAtivaNoAsaas && ' e a assinatura paga é cancelada no Asaas'}.</div>
        </div>
        <div className="user-form desativar-form">
          <label>Motivo
            <textarea value={motivo} maxLength={300} rows={3} onChange={e => setMotivo(e.target.value)}
              placeholder="Ex.: cliente criou conta duplicada e pediu para recomeçar"/>
            <small>{errosCampo.motivo ?? `Fica registrado na auditoria. Mínimo de ${MOTIVO_MINIMO} caracteres.`}</small></label>
          <label>{impacto.confirmacaoPorCnpj
              ? <>Digite o CNPJ <strong>{formatarCnpj(impacto.cnpj)}</strong> para confirmar</>
              : <>Digite o nome <strong>{impacto.nomeFarmacia}</strong> para confirmar</>}
            <input value={confirmacao} onChange={e => setConfirmacao(e.target.value)} autoComplete="off" spellCheck={false}
              inputMode={impacto.confirmacaoPorCnpj ? 'numeric' : 'text'}
              onPaste={e => e.preventDefault()} onDrop={e => e.preventDefault()}
              aria-invalid={confirmacao !== '' && !confere(impacto, confirmacao)}/>
            <small>{errosCampo.confirmacao ?? (confirmacao !== '' && !confere(impacto, confirmacao)
              ? (impacto.confirmacaoPorCnpj ? 'Ainda não confere com o CNPJ da farmácia.' : 'Ainda não confere com o nome da farmácia.')
              : 'Digite à mão: colar está desativado neste campo.')}</small></label>
          <CampoCodigoAutenticador valor={codigo} aoAlterar={setCodigo} erro={errosCampo.codigoDoisFatores}/>
        </div>
      </>}
    </div>

    {/* Cancelar vem primeiro e é o único botão com foco inicial: Enter nunca confirma sozinho. */}
    <div className="modal-actions">
      {passo === 'impacto'
        ? <><button type="button" className="button button-ghost" onClick={aoFechar} autoFocus>Cancelar</button>
            <button type="button" className="button button-danger-soft" disabled={!impacto || !modalidade} onClick={() => setPasso('confirmar')}>Continuar</button></>
        : <><button type="button" className="button button-ghost" onClick={() => { setPasso('impacto'); setErro('') }}>Voltar</button>
            <button className="button button-danger" disabled={!pronto || salvando}>{salvando ? 'Desativando...' : 'Desativar conta'}</button></>}
    </div>
  </form></div>
}
