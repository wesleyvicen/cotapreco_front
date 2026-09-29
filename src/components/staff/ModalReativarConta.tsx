import { AlertTriangle, RotateCcw } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { api, date, ErroApi } from '../../api'
import { usarCamadaNoHistorico } from '../../hooks/usarCamadaNoHistorico'
import type { ContaStaff, ImpactoDesativacao, SolicitacaoReativacao } from '../../types'
import { AvisoErro, Carregando } from '../ComponentesUI'
import { formatarCnpj, MOTIVO_MINIMO } from '../../lib/confirmacaoConta'
import CampoCodigoAutenticador from './CampoCodigoAutenticador'

/* Reativar é menos arriscado que desativar, então dispensa digitar o CNPJ, mas continua pedindo
   motivo e o código do autenticador: também é uma ação sobre a conta de um cliente e vai para a
   auditoria. Conflitos (e-mail ou CNPJ original já usados num recadastro) aparecem antes, e o
   botão nem habilita. */
export default function ModalReativarConta({ conta, aoFechar, aoConcluir }:{
  conta:ContaStaff; aoFechar:()=>void; aoConcluir:(atualizada:ContaStaff)=>void
}) {
  const [impacto, setImpacto] = useState<ImpactoDesativacao|null>(null)
  const [motivo, setMotivo] = useState('')
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [errosCampo, setErrosCampo] = useState<Record<string,string>>({})
  const [salvando, setSalvando] = useState(false)

  usarCamadaNoHistorico(true, aoFechar)

  useEffect(() => {
    api<ImpactoDesativacao>(`/staff/accounts/${conta.grupoId}/impacto-desativacao`)
      .then(setImpacto)
      .catch(e => setErro(e instanceof ErroApi ? e.message : 'Não foi possível carregar a conta.'))
  }, [conta.grupoId])

  const bloqueada = (impacto?.conflitosReativacao.length ?? 0) > 0
  const pronto = !!impacto && !bloqueada && motivo.trim().length >= MOTIVO_MINIMO && /^\d{6}$/.test(codigo)

  const reativar = async (evento:FormEvent) => {
    evento.preventDefault()
    if (!pronto) return
    setErro(''); setErrosCampo({}); setSalvando(true)
    try {
      const corpo:SolicitacaoReativacao = { motivo:motivo.trim(), codigoDoisFatores:codigo }
      aoConcluir(await api<ContaStaff>(`/staff/accounts/${conta.grupoId}/reativar`, { method:'PUT', body:JSON.stringify(corpo) }))
    } catch (e) {
      if (e instanceof ErroApi) { setErro(e.message); setErrosCampo(e.fields) }
      else setErro('Não foi possível reativar a conta.')
      setCodigo('')
    } finally { setSalvando(false) }
  }

  return <div className="modal-backdrop" role="presentation"><form className="modal user-modal desativar-modal" onSubmit={reativar}>
    <div className="modal-header"><div className="modal-icon"><RotateCcw/></div>
      <div><h2>Reativar conta</h2><p>{conta.nomeFarmacia}{conta.cnpj && ` · ${formatarCnpj(conta.cnpj)}`}</p></div>
      <button type="button" className="icon-button" aria-label="Fechar" onClick={aoFechar}>×</button></div>

    <div className="desativar-corpo">
      {erro && <AvisoErro message={erro}/>}
      {!impacto ? !erro && <Carregando/> : <>
        {bloqueada && <div className="alert alert-error desativar-alerta" role="alert">
          <AlertTriangle size={18} aria-hidden="true"/>
          <div><strong>Esta conta não pode ser reativada agora:</strong>
            <ul>{impacto.conflitosReativacao.map(c => <li key={c}>{c}</li>)}</ul>
            Provavelmente é o recadastro deste cliente. Resolva a outra conta antes.</div>
        </div>}
        <p className="modal-nota">
          {conta.desativadaEm && <>Desativada em {date(conta.desativadaEm)}. </>}
          {impacto.usuarios.length} usuário{impacto.usuarios.length !== 1 ? 's' : ''} volta{impacto.usuarios.length !== 1 ? 'm' : ''} a ter acesso, e e-mails e CNPJs liberados voltam aos originais.
          A assinatura cancelada na desativação <strong>não volta sozinha</strong>: o acesso segue o prazo que a conta já tinha. Se precisar, use trial ou cortesia depois.</p>
        {!bloqueada && <div className="user-form desativar-form">
          <label>Motivo
            <textarea value={motivo} maxLength={300} rows={3} onChange={e => setMotivo(e.target.value)}
              placeholder="Ex.: cliente pediu para voltar a usar a conta antiga"/>
            <small>{errosCampo.motivo ?? `Fica registrado na auditoria. Mínimo de ${MOTIVO_MINIMO} caracteres.`}</small></label>
          <CampoCodigoAutenticador valor={codigo} aoAlterar={setCodigo} erro={errosCampo.codigoDoisFatores}/>
        </div>}
      </>}
    </div>

    <div className="modal-actions">
      <button type="button" className="button button-ghost" onClick={aoFechar} autoFocus>Cancelar</button>
      <button className="button button-primary" disabled={!pronto || salvando}>{salvando ? 'Reativando...' : 'Reativar conta'}</button>
    </div>
  </form></div>
}
