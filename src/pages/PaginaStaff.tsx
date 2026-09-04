import { ChevronLeft, ChevronRight, Gift, HandCoins, Search, Timer } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { api, ErroApi, money, date } from '../api'
import { AvisoErro, Carregando, EstadoVazio } from '../components/ComponentesUI'
import { usarCamadaNoHistorico } from '../hooks/usarCamadaNoHistorico'
import { ROTULO_STATUS } from '../lib/assinatura'
import type { ContaStaff, PaginaContasStaff } from '../types'

const TAMANHO_PAGINA = 20
/* Espera a pessoa parar de digitar antes de ir ao banco — sem isso cada tecla vira uma
   consulta nova. */
const ATRASO_BUSCA_MS = 350

function formatarCnpj(valor:string|null) {
  if (!valor) return '—'
  const digitos = valor.replace(/\D/g, '').slice(0, 14)
  return digitos.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2')
}

/* Mesma lógica de PaginaRespostaPublica/PaginaDetalheCotacao: os dígitos digitados são
   centavos, então backspace nunca deixa o cursor "no meio" de um valor formatado. */
function interpretarPreco(digitos:string) {
  if (!digitos) return null
  const centavos = digitos.length === 1 ? Number(digitos) * 100
    : digitos.length === 2 ? Number(digitos[0]) * 100 + Number(digitos[1]) * 10
    : Number(digitos)
  return centavos / 100
}
function formatarPrecoDigitado(digitos:string) {
  const valor = interpretarPreco(digitos)
  return valor == null ? '' : new Intl.NumberFormat('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 }).format(valor)
}
function CampoPreco({ valor, aoAlterar }:{ valor:string; aoAlterar:(digitos:string)=>void }) {
  const atualizar = (proximo:string) => aoAlterar(proximo.replace(/\D/g, '').slice(0, 9))
  return <input
    aria-label="Preço mensal negociado"
    type="text" inputMode="numeric" placeholder="Em branco = conta padrão"
    value={formatarPrecoDigitado(valor)}
    onKeyDown={evento => {
      if (/^\d$/.test(evento.key)) { evento.preventDefault(); atualizar(valor + evento.key) }
      else if (evento.key === 'Backspace' || evento.key === 'Delete') { evento.preventDefault(); atualizar(valor.slice(0, -1)) }
    }}
    onPaste={evento => { evento.preventDefault(); atualizar(valor + evento.clipboardData.getData('text')) }}
    onChange={() => undefined}/>
}

export default function PaginaStaff() {
  const [busca, setBusca] = useState('')
  const [buscaAplicada, setBuscaAplicada] = useState('')
  const [pagina, setPagina] = useState(0)
  const [resultado, setResultado] = useState<PaginaContasStaff|null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const [negociando, setNegociando] = useState<ContaStaff|null>(null)
  const [quantidadeForm, setQuantidadeForm] = useState('')
  const [precoForm, setPrecoForm] = useState('')
  const [erroNegociacao, setErroNegociacao] = useState('')
  const [salvandoNegociacao, setSalvandoNegociacao] = useState(false)

  const [brindando, setBrindando] = useState<ContaStaff|null>(null)
  const [quantidadeBrinde, setQuantidadeBrinde] = useState('')
  const [erroBrinde, setErroBrinde] = useState('')
  const [salvandoBrinde, setSalvandoBrinde] = useState(false)

  const [emTrial, setEmTrial] = useState<ContaStaff|null>(null)
  const [diasForm, setDiasForm] = useState('7')
  const [erroTrial, setErroTrial] = useState('')
  const [salvandoTrial, setSalvandoTrial] = useState(false)

  /* Debounce: só aplica a busca (e some com a página atual) depois que a digitação parar. */
  useEffect(() => {
    const relogio = setTimeout(() => { setBuscaAplicada(busca); setPagina(0) }, ATRASO_BUSCA_MS)
    return () => clearTimeout(relogio)
  }, [busca])

  useEffect(() => {
    setCarregando(true); setErro('')
    const parametros = new URLSearchParams({ pagina: String(pagina), tamanho: String(TAMANHO_PAGINA) })
    if (buscaAplicada) parametros.set('busca', buscaAplicada)
    api<PaginaContasStaff>(`/staff/accounts?${parametros}`)
      .then(setResultado)
      .catch(() => setErro('Não foi possível carregar as contas.'))
      .finally(() => setCarregando(false))
  }, [buscaAplicada, pagina])

  /* O voltar do navegador fecha o formulário aberto em vez de sair da tela. */
  usarCamadaNoHistorico(negociando !== null || brindando !== null || emTrial !== null,
    () => { setNegociando(null); setBrindando(null); setEmTrial(null) })

  const abrirNegociacao = (conta:ContaStaff) => {
    setErroNegociacao('')
    setNegociando(conta)
    setQuantidadeForm(String(conta.farmaciasContratadas))
    setPrecoForm(conta.precoMensalPersonalizado != null ? String(Math.round(conta.precoMensalPersonalizado * 100)) : '')
  }

  const salvarNegociacao = async (evento:FormEvent) => {
    evento.preventDefault()
    if (!negociando) return
    setErroNegociacao('')
    const farmaciasContratadas = Number(quantidadeForm)
    if (!Number.isInteger(farmaciasContratadas) || farmaciasContratadas < 1) {
      setErroNegociacao('Informe uma quantidade válida de farmácias.'); return
    }
    const precoMensalPersonalizado = interpretarPreco(precoForm)
    if (precoMensalPersonalizado !== null && !(precoMensalPersonalizado > 0)) {
      setErroNegociacao('O preço negociado precisa ser maior que zero, ou em branco para voltar à conta padrão.'); return
    }
    setSalvandoNegociacao(true)
    try {
      const atualizada = await api<ContaStaff>(`/staff/accounts/${negociando.grupoId}/negociar`, {
        method: 'PUT', body: JSON.stringify({ farmaciasContratadas, precoMensalPersonalizado }),
      })
      setResultado(atual => atual && { ...atual, itens: atual.itens.map(c => c.grupoId === atualizada.grupoId ? atualizada : c) })
      setNegociando(null)
    } catch (e) { setErroNegociacao(e instanceof ErroApi ? e.message : 'Não foi possível salvar a negociação.') }
    finally { setSalvandoNegociacao(false) }
  }

  const abrirBrinde = (conta:ContaStaff) => {
    setErroBrinde('')
    setBrindando(conta)
    setQuantidadeBrinde(String(conta.farmaciasContratadas))
  }

  const salvarBrinde = async (evento:FormEvent) => {
    evento.preventDefault()
    if (!brindando) return
    setErroBrinde('')
    const farmaciasContratadas = Number(quantidadeBrinde)
    if (!Number.isInteger(farmaciasContratadas) || farmaciasContratadas < 1) {
      setErroBrinde('Informe uma quantidade válida de farmácias.'); return
    }
    setSalvandoBrinde(true)
    try {
      const atualizada = await api<ContaStaff>(`/staff/accounts/${brindando.grupoId}/brinde`, {
        method: 'PUT', body: JSON.stringify({ farmaciasContratadas }),
      })
      setResultado(atual => atual && { ...atual, itens: atual.itens.map(c => c.grupoId === atualizada.grupoId ? atualizada : c) })
      setBrindando(null)
    } catch (e) { setErroBrinde(e instanceof ErroApi ? e.message : 'Não foi possível dar o brinde.') }
    finally { setSalvandoBrinde(false) }
  }

  const abrirTrial = (conta:ContaStaff) => {
    setErroTrial('')
    setEmTrial(conta)
    setDiasForm('7')
  }

  const salvarTrial = async (evento:FormEvent) => {
    evento.preventDefault()
    if (!emTrial) return
    setErroTrial('')
    const dias = Number(diasForm)
    if (!Number.isInteger(dias) || dias < 1) { setErroTrial('Informe uma quantidade de dias válida.'); return }
    setSalvandoTrial(true)
    try {
      const atualizada = await api<ContaStaff>(`/staff/accounts/${emTrial.grupoId}/trial`, {
        method: 'PUT', body: JSON.stringify({ dias }),
      })
      setResultado(atual => atual && { ...atual, itens: atual.itens.map(c => c.grupoId === atualizada.grupoId ? atualizada : c) })
      setEmTrial(null)
    } catch (e) { setErroTrial(e instanceof ErroApi ? e.message : 'Não foi possível colocar em trial.') }
    finally { setSalvandoTrial(false) }
  }

  return <div className="page">
    <div className="page-header"><div><span className="eyebrow green">Contas</span><h1>Clientes do CotaPreço</h1><p>Quem está pagando, em teste ou com pagamento atrasado.</p></div></div>

    {resultado && <div className="staff-resumo">
      <div><strong>{resultado.totalContas}</strong><span>contas no total</span></div>
      <div><strong>{resultado.totalPagando}</strong><span>pagando</span></div>
      <div><strong>{resultado.totalEmTeste}</strong><span>em teste</span></div>
      <div><strong>{resultado.totalVencidas}</strong><span>com pagamento atrasado</span></div>
    </div>}

    {erro && <div className="alert alert-error">{erro}</div>}

    <div className="toolbar">
      <label className="search"><Search/><input placeholder="Buscar por farmácia, CNPJ, responsável ou e-mail..." value={busca} onChange={e => setBusca(e.target.value)}/></label>
    </div>

    <section className="card">
      {carregando && !resultado
        ? <Carregando/>
        : !resultado || resultado.itens.length === 0
          ? <EstadoVazio title={buscaAplicada ? 'Nenhuma conta encontrada' : 'Nenhuma conta ainda'}
              description={buscaAplicada ? 'Tente buscar por outro nome, CNPJ ou e-mail.' : 'As contas de clientes aparecem aqui assim que alguém se cadastrar.'}/>
          : <>
              <div className="table-wrap"><table>
                <thead><tr><th>Farmácia</th><th>Responsável</th><th>Status</th><th>Farmácias</th><th>Mensalidade</th><th>Válido até</th><th>Desde</th><th/></tr></thead>
                <tbody>{resultado.itens.map(c => <tr key={c.grupoId}>
                  <td><strong>{c.nomeFarmacia}</strong><br/><small>{formatarCnpj(c.cnpj)}</small></td>
                  <td>{c.responsavelNome ?? '—'}{c.responsavelEmail && <><br/><small>{c.responsavelEmail}</small></>}</td>
                  <td>
                    {/* emTeste nunca convive com um pagamento de verdade (ver AssinaturaService.ativar,
                        que zera emTeste ao confirmar) — então aqui é sempre "ainda não pagou, mas tem
                        prazo rodando", diferente de "sem assinatura" genérico (nunca assinou, ou cortesia). */}
                    <span className={`status-badge status-${c.emTeste ? 'trial' : c.statusAssinatura.toLowerCase()}`}>
                      {c.emTeste ? ROTULO_STATUS.TRIAL : ROTULO_STATUS[c.statusAssinatura]}
                    </span>
                    {!c.contaAtiva && <><br/><small>Conta desativada</small></>}
                  </td>
                  <td>{c.farmaciasAtivas} de {c.farmaciasContratadas}</td>
                  <td>{c.cortesia
                    ? <><strong>Cortesia</strong><br/><small>sem cobrança</small></>
                    : <>{money(c.precoMensalAtual)}{c.precoMensalPersonalizado != null && <><br/><small>Negociado</small></>}</>}</td>
                  <td>{c.assinaturaAte ? date(c.assinaturaAte) : '—'}</td>
                  <td>{date(c.criadoEm)}</td>
                  <td className="staff-acoes">
                    {!c.cortesia && <button type="button" className="icon-button" title={c.precoMensalPersonalizado != null ? 'Editar negociação' : 'Negociar'} onClick={() => abrirNegociacao(c)}><HandCoins size={16}/></button>}
                    <button type="button" className="icon-button" title={c.cortesia ? 'Editar brinde' : 'Dar de brinde'} onClick={() => abrirBrinde(c)}><Gift size={16}/></button>
                    <button type="button" className="icon-button" title="Colocar em trial" onClick={() => abrirTrial(c)}><Timer size={16}/></button>
                  </td>
                </tr>)}</tbody>
              </table></div>
              {resultado.totalPaginas > 1 && <div className="staff-paginacao">
                <span>Página {resultado.pagina + 1} de {resultado.totalPaginas} · {resultado.totalItens} conta{resultado.totalItens !== 1 ? 's' : ''} encontrada{resultado.totalItens !== 1 ? 's' : ''}</span>
                <div>
                  <button type="button" className="button button-ghost" disabled={pagina === 0} onClick={() => setPagina(p => p - 1)}><ChevronLeft size={16}/>Anterior</button>
                  <button type="button" className="button button-ghost" disabled={pagina + 1 >= resultado.totalPaginas} onClick={() => setPagina(p => p + 1)}>Próxima<ChevronRight size={16}/></button>
                </div>
              </div>}
            </>}
    </section>

    {negociando && <div className="modal-backdrop" role="presentation"><form className="modal user-modal" onSubmit={salvarNegociacao}>
      <div className="modal-header"><div className="modal-icon"><HandCoins/></div><div><h2>Negociar condições</h2><p>{negociando.nomeFarmacia}</p></div>
        <button type="button" className="icon-button" onClick={() => setNegociando(null)}>×</button></div>
      {erroNegociacao && <AvisoErro message={erroNegociacao}/>}
      <div className="user-form">
        <label>Farmácias contratadas<input type="number" min={1} step={1} value={quantidadeForm} onChange={e => setQuantidadeForm(e.target.value)} required/>
          <small>Aplica na hora — diferente do autoatendimento do cliente, aqui não entra na fila do próximo ciclo.</small></label>
        <label>Preço mensal negociado<CampoPreco valor={precoForm} aoAlterar={setPrecoForm}/>
          <small>Em branco remove a negociação e volta para o cálculo padrão (base + adicional por farmácia).</small></label>
      </div>
      <p className="modal-nota">Enquanto a conta tiver um preço negociado, o cliente não consegue mudar a quantidade sozinho — a tela dele vai pedir para falar com a equipe de novo.</p>
      <div className="modal-actions"><button type="button" className="button button-ghost" onClick={() => setNegociando(null)}>Cancelar</button>
        <button className="button button-primary" disabled={salvandoNegociacao}>{salvandoNegociacao ? 'Salvando...' : 'Salvar negociação'}</button></div>
    </form></div>}

    {brindando && <div className="modal-backdrop" role="presentation"><form className="modal user-modal" onSubmit={salvarBrinde}>
      <div className="modal-header"><div className="modal-icon"><Gift/></div><div><h2>{brindando.cortesia ? 'Editar brinde' : 'Dar de brinde'}</h2><p>{brindando.nomeFarmacia}</p></div>
        <button type="button" className="icon-button" onClick={() => setBrindando(null)}>×</button></div>
      {erroBrinde && <AvisoErro message={erroBrinde}/>}
      <div className="user-form">
        <label>Farmácias liberadas<input type="number" min={1} step={1} value={quantidadeBrinde} onChange={e => setQuantidadeBrinde(e.target.value)} required/></label>
      </div>
      <p className="modal-nota">Acesso liberado sem prazo e sem cobrança nenhuma — não é um preço negociado, é grátis mesmo.
        {!brindando.cortesia && brindando.statusAssinatura !== 'NONE' && brindando.statusAssinatura !== 'CANCELED' &&
          ' Se a conta tiver uma assinatura paga ativa no Asaas, ela é cancelada antes de liberar o brinde.'}</p>
      <div className="modal-actions"><button type="button" className="button button-ghost" onClick={() => setBrindando(null)}>Cancelar</button>
        <button className="button button-primary" disabled={salvandoBrinde}>{salvandoBrinde ? 'Salvando...' : brindando.cortesia ? 'Salvar' : 'Dar de brinde'}</button></div>
    </form></div>}

    {emTrial && <div className="modal-backdrop" role="presentation"><form className="modal user-modal" onSubmit={salvarTrial}>
      <div className="modal-header"><div className="modal-icon"><Timer/></div><div><h2>Colocar em trial</h2><p>{emTrial.nomeFarmacia}</p></div>
        <button type="button" className="icon-button" onClick={() => setEmTrial(null)}>×</button></div>
      {erroTrial && <AvisoErro message={erroTrial}/>}
      <div className="user-form">
        <label>Dias de trial<input type="number" min={1} step={1} value={diasForm} onChange={e => setDiasForm(e.target.value)} required autoFocus/></label>
      </div>
      <p className="modal-nota">Revoga cortesia, negociação ou qualquer outro estado atual e libera o acesso até {diasForm && Number.isFinite(Number(diasForm)) ? date(new Date(Date.now() + Number(diasForm) * 86400000).toISOString()) : 'a data escolhida'}.
        {emTrial.statusAssinatura !== 'NONE' && emTrial.statusAssinatura !== 'CANCELED' &&
          ' Se a conta tiver uma assinatura paga ativa no Asaas, ela é cancelada antes.'}</p>
      <div className="modal-actions"><button type="button" className="button button-ghost" onClick={() => setEmTrial(null)}>Cancelar</button>
        <button className="button button-primary" disabled={salvandoTrial}>{salvandoTrial ? 'Salvando...' : 'Colocar em trial'}</button></div>
    </form></div>}
  </div>
}
