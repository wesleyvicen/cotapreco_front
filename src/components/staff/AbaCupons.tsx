import { Banknote, CalendarPlus, ChevronLeft, ChevronRight, Copy, Pencil, Percent, Plus, Power, Store, Ticket, Users, type LucideIcon } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { api, date, ErroApi } from '../../api'
import { usarCamadaNoHistorico } from '../../hooks/usarCamadaNoHistorico'
import { ROTULO_TIPO_CUPOM } from '../../lib/cupom'
import type { Cupom, PaginaCupons, PaginaResgatesCupom, ResgateCupom, SituacaoCupom, SolicitacaoCupom, TipoCupom } from '../../types'
import { AvisoErro, Carregando, EstadoVazio } from '../ComponentesUI'

const TAMANHO_PAGINA = 20

const SITUACAO:Record<SituacaoCupom,{ texto:string, tom:string }> = {
  ATIVO:{ texto:'Ativo', tom:'active' }, AGENDADO:{ texto:'Agendado', tom:'pending' },
  EXPIRADO:{ texto:'Expirado', tom:'overdue' }, ESGOTADO:{ texto:'Esgotado', tom:'canceled' },
  INATIVO:{ texto:'Desativado', tom:'none' },
}

interface Formulario {
  codigo:string; tipo:TipoCupom; beneficio:string; meses:string; validoDe:string; validoAte:string
  limiteUsos:string; origem:string; descricao:string
}
const FORMULARIO_VAZIO:Formulario = {
  codigo:'', tipo:'DESCONTO_PERCENTUAL', beneficio:'', meses:'', validoDe:'', validoAte:'', limiteUsos:'', origem:'', descricao:'',
}

/* Um campo de benefício por tipo; o backend lê só o do tipo escolhido. */
const CAMPO_BENEFICIO:Record<TipoCupom,{ rotulo:string, chave:'percentual'|'valor'|'dias'|'quantidadeFarmacias', passo:string }> = {
  DESCONTO_PERCENTUAL:{ rotulo:'Desconto (%)', chave:'percentual', passo:'0.01' },
  DESCONTO_FIXO:{ rotulo:'Desconto por mês (R$)', chave:'valor', passo:'0.01' },
  TRIAL_ESTENDIDO:{ rotulo:'Dias a mais de teste', chave:'dias', passo:'1' },
  FARMACIA_GRATIS:{ rotulo:'Farmácias adicionais grátis', chave:'quantidadeFarmacias', passo:'1' },
}

/* Cartões de escolha do tipo: o que cada um faz, dito em uma linha, em vez de só o nome. */
const OPCOES_TIPO:{ tipo:TipoCupom, titulo:string, texto:string, Icone:LucideIcon }[] = [
  { tipo:'DESCONTO_PERCENTUAL', titulo:'Desconto em %', texto:'Tira uma porcentagem da mensalidade.', Icone:Percent },
  { tipo:'DESCONTO_FIXO', titulo:'Desconto em R$', texto:'Tira um valor fixo da mensalidade.', Icone:Banknote },
  { tipo:'TRIAL_ESTENDIDO', titulo:'Mais dias de teste', texto:'Estende o teste grátis antes de assinar.', Icone:CalendarPlus },
  { tipo:'FARMACIA_GRATIS', titulo:'Farmácia grátis', texto:'Farmácias adicionais sem custo na rede.', Icone:Store },
]

/* As datas são escolhidas como dia no fuso de quem usa a tela. "Válido até 30/09" vale o dia
   30 inteiro: o fim guardado é a meia-noite do dia seguinte, porque o backend aceita o
   cupom enquanto agora < validoAte. */
const inicioDoDia = (dia:string) => dia ? new Date(`${dia}T00:00:00`).toISOString() : null
const fimDoDia = (dia:string) => {
  if (!dia) return null
  const data = new Date(`${dia}T00:00:00`); data.setDate(data.getDate() + 1); return data.toISOString()
}
const diaLocal = (iso:string|null, fim = false) => {
  if (!iso) return ''
  const data = new Date(iso); if (fim) data.setMilliseconds(data.getMilliseconds() - 1)
  const mes = String(data.getMonth() + 1).padStart(2, '0'), dia = String(data.getDate()).padStart(2, '0')
  return `${data.getFullYear()}-${mes}-${dia}`
}
const diaCurto = (iso:string, fim = false) => new Intl.DateTimeFormat('pt-BR').format(new Date(diaLocal(iso, fim) + 'T00:00:00'))

const numeroOuNulo = (valor:string) => valor.trim() === '' ? null : Number(valor.replace(',', '.'))

const linkDeCadastro = (codigo:string) => `${window.location.origin}/cadastro?cupom=${encodeURIComponent(codigo)}`

export default function AbaCupons() {
  const [pagina, setPagina] = useState(0)
  const [resultado, setResultado] = useState<PaginaCupons|null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const [editando, setEditando] = useState<Cupom|'novo'|null>(null)
  const [formulario, setFormulario] = useState<Formulario>(FORMULARIO_VAZIO)
  const [errosCampos, setErrosCampos] = useState<Record<string,string>>({})
  const [erroFormulario, setErroFormulario] = useState('')
  const [salvando, setSalvando] = useState(false)

  const [vendoResgates, setVendoResgates] = useState<Cupom|null>(null)
  const [copiado, setCopiado] = useState<number|null>(null)

  useEffect(() => {
    setCarregando(true); setErro('')
    api<PaginaCupons>(`/staff/cupons?pagina=${pagina}&tamanho=${TAMANHO_PAGINA}`)
      .then(setResultado)
      .catch(() => setErro('Não foi possível carregar os cupons.'))
      .finally(() => setCarregando(false))
  }, [pagina])

  usarCamadaNoHistorico(editando !== null, () => setEditando(null))

  const atualizarNaLista = (cupom:Cupom) =>
    setResultado(atual => atual && { ...atual, itens: atual.itens.map(c => c.id === cupom.id ? cupom : c) })

  const abrir = (cupom:Cupom|'novo') => {
    setErroFormulario(''); setErrosCampos({}); setEditando(cupom)
    if (cupom === 'novo') { setFormulario(FORMULARIO_VAZIO); return }
    const beneficio = cupom[CAMPO_BENEFICIO[cupom.tipo].chave]
    setFormulario({
      codigo:cupom.codigo, tipo:cupom.tipo, beneficio:beneficio == null ? '' : String(beneficio),
      meses:cupom.meses == null ? '' : String(cupom.meses),
      validoDe:diaLocal(cupom.validoDe), validoAte:diaLocal(cupom.validoAte, true),
      limiteUsos:cupom.limiteUsos == null ? '' : String(cupom.limiteUsos),
      origem:cupom.origem ?? '', descricao:cupom.descricao ?? '',
    })
  }

  const mudar = (campo:keyof Formulario, valor:string) => {
    setFormulario(atual => ({ ...atual, [campo]:valor }))
    setErrosCampos(atuais => { const proximos = { ...atuais }; delete proximos[campo]; return proximos })
  }

  const salvar = async (evento:FormEvent) => {
    evento.preventDefault()
    if (!editando) return
    setErroFormulario(''); setErrosCampos({})
    const campoBeneficio = CAMPO_BENEFICIO[formulario.tipo].chave
    const valorBeneficio = numeroOuNulo(formulario.beneficio)
    if (valorBeneficio == null || !(valorBeneficio > 0)) {
      setErrosCampos({ beneficio:'Informe um valor maior que zero.' }); return
    }
    const corpo:SolicitacaoCupom = {
      codigo:formulario.codigo.trim(), tipo:formulario.tipo,
      percentual:null, valor:null, dias:null, quantidadeFarmacias:null,
      meses:formulario.tipo === 'TRIAL_ESTENDIDO' ? null : numeroOuNulo(formulario.meses),
      validoDe:inicioDoDia(formulario.validoDe), validoAte:fimDoDia(formulario.validoAte),
      limiteUsos:numeroOuNulo(formulario.limiteUsos),
      origem:formulario.origem.trim() || null, descricao:formulario.descricao.trim() || null,
      [campoBeneficio]:valorBeneficio,
    }
    setSalvando(true)
    try {
      if (editando === 'novo') {
        await api<Cupom>('/staff/cupons', { method:'POST', body:JSON.stringify(corpo) })
        /* Cupom novo é o mais recente: volta para a primeira página para ele aparecer no topo. */
        if (pagina === 0) setResultado(await api<PaginaCupons>(`/staff/cupons?pagina=0&tamanho=${TAMANHO_PAGINA}`))
        else setPagina(0)
      } else {
        atualizarNaLista(await api<Cupom>(`/staff/cupons/${editando.id}`, { method:'PUT', body:JSON.stringify(corpo) }))
      }
      setEditando(null)
    } catch (e) {
      if (e instanceof ErroApi) {
        /* O campo do benefício tem nome diferente em cada tipo no backend; aqui é um só. */
        const campos = { ...e.fields }
        if (campos[campoBeneficio]) { campos.beneficio = campos[campoBeneficio]; delete campos[campoBeneficio] }
        setErrosCampos(campos)
      }
      setErroFormulario(e instanceof ErroApi ? e.message : 'Não foi possível salvar o cupom.')
    } finally { setSalvando(false) }
  }

  const alternarAtivo = async (cupom:Cupom) => {
    setErro('')
    try { atualizarNaLista(await api<Cupom>(`/staff/cupons/${cupom.id}/status`, { method:'PUT', body:JSON.stringify({ ativo:!cupom.ativo }) })) }
    catch (e) { setErro(e instanceof ErroApi ? e.message : 'Não foi possível mudar o cupom.') }
  }

  const copiarLink = async (cupom:Cupom) => {
    try { await navigator.clipboard.writeText(linkDeCadastro(cupom.codigo)); setCopiado(cupom.id); setTimeout(() => setCopiado(null), 2000) }
    catch { setErro('Não foi possível copiar. Link: ' + linkDeCadastro(cupom.codigo)) }
  }

  const erroCampo = (campo:string) => errosCampos[campo] ? <small className="cupom-erro-campo">{errosCampos[campo]}</small> : null
  const usado = editando !== null && editando !== 'novo' && editando.usos > 0
  const beneficio = CAMPO_BENEFICIO[formulario.tipo]

  return <>
    <div className="toolbar staff-toolbar">
      <p className="cupom-intro">Desconto na mensalidade, dias a mais de teste ou farmácia extra grátis. A farmácia usa o cupom no cadastro ou na tela de assinatura.</p>
      <button type="button" className="button button-primary" onClick={() => abrir('novo')}><Plus size={17}/>Novo cupom</button>
    </div>

    {erro && <div className="alert alert-error">{erro}</div>}

    <section className="card">
      {carregando && !resultado
        ? <Carregando/>
        : !resultado || resultado.itens.length === 0
          ? <EstadoVazio title="Nenhum cupom ainda" description="Crie o primeiro cupom e mande o link de cadastro para o parceiro divulgar."/>
          : <>
              <div className="table-wrap"><table>
                <thead><tr><th>Cupom</th><th>Benefício</th><th>Validade</th><th>Usos</th><th>Origem</th><th>Situação</th><th/></tr></thead>
                <tbody>{resultado.itens.map(c => <tr key={c.id}>
                  <td><strong className="cupom-codigo">{c.codigo}</strong><br/><small>{ROTULO_TIPO_CUPOM[c.tipo]}</small></td>
                  <td>{c.beneficio}{c.descricao && <><br/><small>{c.descricao}</small></>}</td>
                  <td>{c.validoDe || c.validoAte
                    ? <>{c.validoDe ? diaCurto(c.validoDe) : 'Já vale'}<br/><small>{c.validoAte ? `até ${diaCurto(c.validoAte, true)}` : 'sem fim'}</small></>
                    : 'Sem prazo'}</td>
                  <td>{c.usos}{c.limiteUsos != null ? ` de ${c.limiteUsos}` : ''}</td>
                  <td>{c.origem ?? '-'}</td>
                  <td><span className={`status-badge status-${SITUACAO[c.situacao].tom}`}>{SITUACAO[c.situacao].texto}</span></td>
                  <td className="staff-acoes">
                    <button type="button" className="icon-button" title="Copiar link de cadastro com o cupom" aria-label={`Copiar link de cadastro do cupom ${c.codigo}`} onClick={() => void copiarLink(c)}>
                      {copiado === c.id ? <small>Copiado</small> : <Copy size={16}/>}</button>
                    <button type="button" className="icon-button" title="Contas que usaram" aria-label={`Contas que usaram o cupom ${c.codigo}`} onClick={() => setVendoResgates(c)}><Users size={16}/></button>
                    <button type="button" className="icon-button" title="Editar" aria-label={`Editar o cupom ${c.codigo}`} onClick={() => abrir(c)}><Pencil size={16}/></button>
                    <button type="button" className="icon-button" title={c.ativo ? 'Desativar' : 'Reativar'} aria-label={`${c.ativo ? 'Desativar' : 'Reativar'} o cupom ${c.codigo}`} onClick={() => void alternarAtivo(c)}><Power size={16}/></button>
                  </td>
                </tr>)}</tbody>
              </table></div>
              {resultado.totalPaginas > 1 && <div className="staff-paginacao">
                <span>Página {resultado.pagina + 1} de {resultado.totalPaginas} · {resultado.totalItens} cupo{resultado.totalItens !== 1 ? 'ns' : 'm'}</span>
                <div>
                  <button type="button" className="button button-ghost" disabled={pagina === 0} onClick={() => setPagina(p => p - 1)}><ChevronLeft size={16}/>Anterior</button>
                  <button type="button" className="button button-ghost" disabled={pagina + 1 >= resultado.totalPaginas} onClick={() => setPagina(p => p + 1)}>Próxima<ChevronRight size={16}/></button>
                </div>
              </div>}
            </>}
    </section>

    {editando && <div className="modal-backdrop" role="presentation"><form className="modal user-modal cupom-modal" onSubmit={salvar}>
      <div className="modal-header"><div className="modal-icon"><Ticket/></div><div><h2>{editando === 'novo' ? 'Novo cupom' : `Editar ${editando.codigo}`}</h2>
        <p>{editando === 'novo' ? 'O código é o que a farmácia digita.' : `${editando.usos} uso${editando.usos !== 1 ? 's' : ''} até agora`}</p></div>
        <button type="button" className="icon-button" aria-label="Fechar" onClick={() => setEditando(null)}>×</button></div>
      {/* Só o miolo rola: título e botões ficam sempre à vista, mesmo em tela baixa. */}
      <div className="cupom-modal-corpo">
      {erroFormulario && <AvisoErro message={erroFormulario}/>}
      <div className="user-form cupom-form">
        <fieldset className="cupom-tipos cupom-form-largo" disabled={usado}>
          <legend>Tipo de cupom</legend>
          <div role="radiogroup" aria-label="Tipo de cupom">
            {OPCOES_TIPO.map(({ tipo, titulo, texto, Icone }) => <label key={tipo} className={`cupom-tipo${formulario.tipo === tipo ? ' ativo' : ''}`}>
              <input type="radio" name="tipo-cupom" value={tipo} checked={formulario.tipo === tipo} onChange={() => mudar('tipo', tipo)}/>
              <span className="cupom-tipo-icone" aria-hidden="true"><Icone size={18}/></span>
              <span className="cupom-tipo-texto"><strong>{titulo}</strong><small>{texto}</small></span>
            </label>)}
          </div>
          {erroCampo('tipo')}
        </fieldset>
        <label>Código<input value={formulario.codigo} required minLength={3} maxLength={40} pattern="\s*[A-Za-z0-9_\-]+\s*" disabled={usado}
          placeholder="BEMVINDO20" autoFocus onChange={e => mudar('codigo', e.target.value.toUpperCase())}/>
          <small>Letras, números, - ou _.</small>{erroCampo('codigo')}</label>
        <label>{beneficio.rotulo}<input type="number" min={beneficio.passo === '1' ? 1 : 0.01} max={formulario.tipo === 'DESCONTO_PERCENTUAL' ? 100 : undefined}
          step={beneficio.passo} value={formulario.beneficio} required disabled={usado} onChange={e => mudar('beneficio', e.target.value)}/>
          {formulario.tipo === 'FARMACIA_GRATIS' && <small>Só desconta farmácias além da primeira que a conta contratar.</small>}
          {erroCampo('beneficio')}</label>
        {formulario.tipo !== 'TRIAL_ESTENDIDO' && <label>Por quantos meses<input type="number" min={1} max={120} step={1} value={formulario.meses} disabled={usado}
          placeholder="Em branco = para sempre" onChange={e => mudar('meses', e.target.value)}/>
          <small>Conta só mensalidades pagas.</small>{erroCampo('meses')}</label>}
        {/* Sem o campo de meses (cupom de teste), o limite ocupa a linha: as datas continuam lado a lado. */}
        <label className={formulario.tipo === 'TRIAL_ESTENDIDO' ? 'cupom-form-largo' : undefined}>Limite de usos<input type="number" min={1} step={1} value={formulario.limiteUsos} placeholder="Em branco = ilimitado" onChange={e => mudar('limiteUsos', e.target.value)}/>
          {erroCampo('limiteUsos')}</label>
        <label>Vale a partir de<input type="date" value={formulario.validoDe} onChange={e => mudar('validoDe', e.target.value)}/>
          <small>Em branco = já vale.</small>{erroCampo('validoDe')}</label>
        <label>Vale até (inclusive)<input type="date" value={formulario.validoAte} min={formulario.validoDe || undefined} onChange={e => mudar('validoAte', e.target.value)}/>
          <small>Em branco = não expira.</small>{erroCampo('validoAte')}</label>
        <label>Origem / parceiro<input value={formulario.origem} maxLength={120} placeholder="Ex.: Representante João, Feira Abrafarma" onChange={e => mudar('origem', e.target.value)}/>
          {erroCampo('origem')}</label>
        <label>Descrição interna<input value={formulario.descricao} maxLength={255} placeholder="Só a equipe vê" onChange={e => mudar('descricao', e.target.value)}/>
          {erroCampo('descricao')}</label>
      </div>
      {usado && <p className="modal-nota">Este cupom já foi usado: código e benefício ficaram travados para não mudar o acordo de quem já resgatou. Para outro benefício, crie um cupom novo.</p>}
      </div>
      <div className="modal-actions"><button type="button" className="button button-ghost" onClick={() => setEditando(null)}>Cancelar</button>
        <button className="button button-primary" disabled={salvando}>{salvando ? 'Salvando...' : editando === 'novo' ? 'Criar cupom' : 'Salvar'}</button></div>
    </form></div>}

    {vendoResgates && <ModalResgates cupom={vendoResgates} aoFechar={() => setVendoResgates(null)}/>}
  </>
}

function ModalResgates({ cupom, aoFechar }:{ cupom:Cupom; aoFechar:()=>void }) {
  const [pagina, setPagina] = useState(0)
  const [resultado, setResultado] = useState<PaginaResgatesCupom|null>(null)
  const [erro, setErro] = useState('')
  const [encerrando, setEncerrando] = useState<number|null>(null)
  const [confirmando, setConfirmando] = useState<number|null>(null)

  usarCamadaNoHistorico(true, aoFechar)

  useEffect(() => {
    api<PaginaResgatesCupom>(`/staff/cupons/${cupom.id}/resgates?pagina=${pagina}&tamanho=${TAMANHO_PAGINA}`)
      .then(setResultado).catch(() => setErro('Não foi possível carregar quem usou o cupom.'))
  }, [cupom.id, pagina])

  const encerrar = async (resgate:ResgateCupom) => {
    setEncerrando(resgate.id); setErro('')
    try {
      const atualizado = await api<ResgateCupom>(`/staff/cupons/resgates/${resgate.id}/encerrar`, { method:'PUT' })
      setResultado(atual => atual && { ...atual, itens: atual.itens.map(r => r.id === atualizado.id ? atualizado : r) })
      setConfirmando(null)
    } catch (e) { setErro(e instanceof ErroApi ? e.message : 'Não foi possível encerrar.') }
    finally { setEncerrando(null) }
  }

  return <div className="modal-backdrop" role="presentation"><section className="modal cupom-resgates-modal" role="dialog" aria-modal="true" aria-labelledby="titulo-resgates">
    <div className="modal-header"><div className="modal-icon"><Users/></div><div><h2 id="titulo-resgates">Quem usou {cupom.codigo}</h2><p>{cupom.beneficio}</p></div>
      <button type="button" className="icon-button" aria-label="Fechar" onClick={aoFechar}>×</button></div>
    {erro && <AvisoErro message={erro}/>}
    {!resultado
      ? <Carregando/>
      : resultado.itens.length === 0
        ? <EstadoVazio title="Ninguém usou ainda" description="As contas aparecem aqui assim que usarem o cupom."/>
        : <div className="table-wrap"><table>
            <thead><tr><th>Farmácia</th><th>Quem usou</th><th>Onde</th><th>Quando</th><th>Situação</th><th/></tr></thead>
            <tbody>{resultado.itens.map(r => <tr key={r.id}>
              <td><strong>{r.nomeFarmacia ?? `Conta ${r.grupoId}`}</strong></td>
              <td>{r.resgatadoPorNome}<br/><small>{r.resgatadoPorEmail}</small></td>
              <td>{{ CADASTRO:'Cadastro', ASSINATURA:'Assinatura', EQUIPE:'Equipe' }[r.canal]}</td>
              <td>{date(r.resgatadoEm)}</td>
              <td>{r.status === 'ATIVO'
                ? <><span className="status-badge status-active">Em uso</span><br/><small>{r.ciclosUsados} mês(es) pago(s){r.mesesRestantes != null ? ` · faltam ${r.mesesRestantes}` : ''}</small></>
                : <><span className="status-badge status-none">Encerrado</span>{r.encerradoEm && <><br/><small>{date(r.encerradoEm)}</small></>}</>}</td>
              <td>{r.status === 'ATIVO' && (confirmando === r.id
                ? <span className="cupom-confirmar-encerrar">
                    <button type="button" className="button button-ghost" disabled={encerrando === r.id} onClick={() => setConfirmando(null)}>Não</button>
                    <button type="button" className="button button-primary" disabled={encerrando === r.id} onClick={() => void encerrar(r)}>{encerrando === r.id ? 'Encerrando...' : 'Encerrar'}</button>
                  </span>
                : <button type="button" className="button button-ghost" onClick={() => setConfirmando(r.id)}>Encerrar</button>)}</td>
            </tr>)}</tbody>
          </table></div>}
    {confirmando !== null && <p className="modal-nota">Encerrar tira o desconto desta conta a partir da próxima cobrança: a assinatura volta ao preço cheio no Asaas.</p>}
    {resultado && resultado.totalPaginas > 1 && <div className="staff-paginacao">
      <span>Página {resultado.pagina + 1} de {resultado.totalPaginas}</span>
      <div>
        <button type="button" className="button button-ghost" disabled={pagina === 0} onClick={() => setPagina(p => p - 1)}><ChevronLeft size={16}/>Anterior</button>
        <button type="button" className="button button-ghost" disabled={pagina + 1 >= resultado.totalPaginas} onClick={() => setPagina(p => p + 1)}>Próxima<ChevronRight size={16}/></button>
      </div>
    </div>}
  </section></div>
}
