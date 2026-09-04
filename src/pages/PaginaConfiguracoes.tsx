import { Building2, ChevronDown, MapPin, MessageCircle, Plus, Save } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { api, date, ErroApi, money } from '../api'
import { usarAutenticacao } from '../autenticacao'
import CamposEndereco from '../components/CamposEndereco'
import { AvisoErro, Carregando } from '../components/ComponentesUI'
import { enderecoDoServidor, enderecoVazio, formatarTelefone, paraEnvio, type FormularioEndereco } from '../lib/endereco'
import { linkWhatsappNegociarFarmacias } from '../lib/assinatura'
import { cnpjValido } from '../lib/cnpj'
import { isAdminDoGrupo } from '../lib/permissoes'
import type { Conta, Empresa, EmpresaPendente } from '../types'

function formatarCnpj(valor:string) {
  const digitos = valor.replace(/\D/g, '').slice(0, 14)
  return digitos.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2')
}

/* Farmácias do grupo, o preço que elas somam na assinatura, e edição de nome/CNPJ de cada uma
   (clicando na linha). Criar farmácia abre um checkout pelo valor novo — a farmácia só passa a
   existir de fato quando o pagamento é confirmado, pra ninguém aumentar a rede sem pagar a
   mensalidade maior. */
function CardFarmacias() {
  const { user, recarregarUsuario } = usarAutenticacao()
  const admin = isAdminDoGrupo(user)
  const [empresas, setEmpresas] = useState<Empresa[]|null>(null)
  const [conta, setConta] = useState<Conta|null>(null)
  const [pendencias, setPendencias] = useState<EmpresaPendente[]>([])
  const [mensagem, setMensagem] = useState('')

  const [selecionada, setSelecionada] = useState<number|null>(null)
  const [nomeEdicao, setNomeEdicao] = useState('')
  const [cnpjEdicao, setCnpjEdicao] = useState('')
  const [erroEdicao, setErroEdicao] = useState('')
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [nome, setNome] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [retorno] = useState(() => new URLSearchParams(window.location.search).get('checkout') ?? '')

  const carregar = () => {
    api<Empresa[]>('/companies').then(setEmpresas).catch(() => {})
    api<Conta>('/account').then(setConta).catch(() => {})
    api<EmpresaPendente[]>('/subscription/pending-companies').then(setPendencias).catch(() => {})
  }
  useEffect(() => { if (admin) carregar() }, [admin])

  /* Limpa o parâmetro da URL pra o aviso não voltar a cada refresh, e enquanto o retorno é de
     sucesso, tenta de novo por um tempo — o webhook do Asaas geralmente chega em segundos,
     mas a farmácia volta do checkout antes dele. */
  useEffect(() => {
    if (!retorno) return
    window.history.replaceState({}, '', '/dados-farmacia')
    if (retorno !== 'sucesso') return
    let tentativas = 0
    const intervalo = setInterval(() => {
      tentativas += 1
      carregar()
      void recarregarUsuario()
      if (tentativas >= 8) clearInterval(intervalo)
    }, 3000)
    return () => clearInterval(intervalo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retorno])

  if (!admin) return <div className="alert alert-warning">Somente administradores da conta podem gerenciar as farmácias do grupo.</div>

  const selecionar = (empresa:Empresa) => {
    setSelecionada(atual => atual === empresa.id ? null : empresa.id)
    setNomeEdicao(empresa.nome); setCnpjEdicao(formatarCnpj(empresa.cnpj ?? '')); setErroEdicao(''); setMensagem('')
  }

  const salvarEdicao = async (evento:FormEvent, id:number) => {
    evento.preventDefault(); setErroEdicao('')
    if (!cnpjValido(cnpjEdicao)) { setErroEdicao('Este CNPJ não é válido. Confira os números.'); return }
    setSalvandoEdicao(true)
    try {
      await api<Empresa>(`/companies/${id}`, { method:'PUT', body:JSON.stringify({ nome:nomeEdicao, cnpj:cnpjEdicao.replace(/\D/g, '') }) })
      setMensagem('Dados da farmácia atualizados.')
      setSelecionada(null)
      carregar()
      void recarregarUsuario()
    } catch (e) { setErroEdicao(e instanceof ErroApi ? e.message : 'Não foi possível salvar.') }
    finally { setSalvandoEdicao(false) }
  }

  const desativarEmpresa = async (id:number) => {
    setErroEdicao('')
    setSalvandoEdicao(true)
    try {
      await api<Empresa>(`/companies/${id}/desativar`, { method:'POST' })
      setMensagem('Farmácia desativada.')
      setSelecionada(null)
      carregar()
      void recarregarUsuario()
    } catch (e) { setErroEdicao(e instanceof ErroApi ? e.message : 'Não foi possível desativar.') }
    finally { setSalvandoEdicao(false) }
  }

  const reativarEmpresa = async (id:number) => {
    setErroEdicao('')
    setSalvandoEdicao(true)
    try {
      await api<Empresa>(`/companies/${id}/reativar`, { method:'POST' })
      setMensagem('Farmácia reativada.')
      setSelecionada(null)
      carregar()
      void recarregarUsuario()
    } catch (e) { setErroEdicao(e instanceof ErroApi ? e.message : 'Não foi possível reativar.') }
    finally { setSalvandoEdicao(false) }
  }

  const dentroDaCota = conta != null && conta.empresasAtivas < conta.farmaciasContratadas
  const semCotaLivre = conta != null && conta.empresasAtivas >= conta.farmaciasContratadas

  const abrirCheckout = async (evento:FormEvent) => {
    evento.preventDefault(); setErro('')
    if (!cnpjValido(cnpj)) { setErro('Este CNPJ não é válido. Confira os números.'); return }
    setEnviando(true)
    try {
      const checkout = await api<{ checkoutUrl:string|null }>('/subscription/checkout/nova-farmacia', {
        method:'POST', body:JSON.stringify({ nome, cnpj:cnpj.replace(/\D/g, '') }),
      })
      if (checkout.checkoutUrl) {
        /* Sai do app pro checkout do Asaas — o cartão é digitado lá, nada dele passa por aqui. */
        window.location.href = checkout.checkoutUrl
        return
      }
      /* Dentro da cota já paga: a farmácia nasceu na hora, sem pagamento nenhum. */
      setNome(''); setCnpj(''); setMostrarForm(false)
      setMensagem('Farmácia criada — já estava dentro do que você contratou, sem cobrança extra.')
      carregar()
      void recarregarUsuario()
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível concluir. Tente de novo em instantes.')
    } finally {
      setEnviando(false)
    }
  }

  return <>
    {retorno === 'cancelado' && <div className="alert alert-warning">Você saiu do pagamento antes de terminar. Nada foi cobrado e a farmácia não foi criada — tente de novo quando quiser.</div>}
    {retorno === 'expirado' && <div className="alert alert-warning">A página de pagamento expirou. Clique em "Nova farmácia" para tentar de novo.</div>}
    {retorno === 'sucesso' && <div className="alert alert-success">Pagamento confirmado! A farmácia nova aparece na lista abaixo em poucos segundos.</div>}

    {conta && <section className="card settings-card plano-resumo">
      <div className="plano-resumo-valor"><strong>{money(conta.precoMensalAtual)}</strong><span>por mês</span></div>
      <p>{money(conta.precoBase)} pela primeira farmácia + {money(conta.precoAdicionalPorFarmacia)} por farmácia
        adicional · contratado para {conta.farmaciasContratadas} farmácia{conta.farmaciasContratadas !== 1 ? 's' : ''}
        {conta.empresasAtivas < conta.farmaciasContratadas
          ? ` · ${conta.empresasAtivas} criada${conta.empresasAtivas !== 1 ? 's' : ''}, pode criar mais ${conta.farmaciasContratadas - conta.empresasAtivas} sem custo extra.`
          : '.'}</p>
      {conta.sugerirContato && <div className="alert alert-warning plano-resumo-contato">
        <MessageCircle/><span>Rede grande? Fale com a gente para negociar condições especiais para o seu caso.</span>
        <a className="button button-ghost" href={linkWhatsappNegociarFarmacias(conta.farmaciasContratadas)} target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a>
      </div>}
    </section>}

    {mensagem && <div className="alert alert-success">{mensagem}</div>}

    {pendencias.length > 0 && <div className="alert alert-warning farmacias-pendentes">
      <strong>Aguardando confirmação do pagamento:</strong>
      <ul>{pendencias.map(p => <li key={p.cnpj ?? p.nome}>{p.nome} — aberto em {date(p.abertoEm)}</li>)}</ul>
      <p>Se o pagamento já foi feito, isso normalmente resolve sozinho em poucos minutos. Demorando muito mais que isso, fale com a gente.</p>
    </div>}

    <section className="card settings-card">
      <div className="card-header">
        <div><h2><Building2/> Farmácias do grupo</h2><p>Clique em uma farmácia para editar o nome ou o CNPJ dela.</p></div>
        <button type="button" className="button button-secondary" onClick={() => { setErro(''); setMostrarForm(true) }}><Plus/>Nova farmácia</button>
      </div>
      {!empresas
        ? <Carregando/>
        : <div className="table-wrap"><table><thead><tr><th>Farmácia</th><th>CNPJ</th><th>Status</th></tr></thead><tbody>
            {empresas.map(e => <>
              <tr key={e.id} className="farmacia-linha-clicavel" onClick={() => selecionar(e)}>
                <td><strong>{e.nome}</strong></td><td>{e.cnpj ? formatarCnpj(e.cnpj) : '—'}</td>
                <td className="farmacia-linha-status">
                  <span className={e.ativo ? 'status-active' : 'status-inactive'}>{e.ativo ? 'Ativa' : 'Inativa'}</span>
                  <ChevronDown className={selecionada === e.id ? 'farmacia-chevron aberto' : 'farmacia-chevron'}/>
                </td>
              </tr>
              {selecionada === e.id && <tr className="farmacia-linha-edicao"><td colSpan={3}>
                <form className="stack-form settings-form" onSubmit={ev => salvarEdicao(ev, e.id)}>
                  {erroEdicao && <AvisoErro message={erroEdicao}/>}
                  {!e.ativo && conta && (semCotaLivre
                    ? <p className="modal-nota">Você já está usando toda a cota contratada ({conta.farmaciasContratadas} farmácia{conta.farmaciasContratadas !== 1 ? 's' : ''}) —
                        aumente a quantidade em Assinatura antes de reativar esta.</p>
                    : <p className="modal-nota">Reativar não cobra nada extra — ainda está dentro do que você já contratou.</p>)}
                  <label>Nome da farmácia<input required maxLength={160} value={nomeEdicao} onChange={ev => setNomeEdicao(ev.target.value)}/></label>
                  <label>CNPJ<input required inputMode="numeric" maxLength={18} value={cnpjEdicao} onChange={ev => setCnpjEdicao(formatarCnpj(ev.target.value))}/></label>
                  <div className="line-actions">
                    <button className="button button-primary" disabled={salvandoEdicao}><Save/>{salvandoEdicao ? 'Salvando...' : 'Salvar dados'}</button>
                    {e.ativo
                      ? <button type="button" className="button button-ghost" disabled={salvandoEdicao} onClick={() => void desativarEmpresa(e.id)}>Desativar farmácia</button>
                      : <button type="button" className="button button-secondary" disabled={salvandoEdicao || semCotaLivre} onClick={() => void reativarEmpresa(e.id)}>
                          {salvandoEdicao ? 'Reativando...' : 'Reativar farmácia'}
                        </button>}
                  </div>
                </form>
              </td></tr>}
            </>)}
          </tbody></table></div>}
    </section>

    {mostrarForm && <div className="modal-backdrop" role="presentation"><form className="modal user-modal" onSubmit={abrirCheckout}>
      <div className="modal-header"><div className="modal-icon"><Building2/></div><div><h2>Nova farmácia</h2><p>Você entra como administrador dela.</p></div>
        <button type="button" className="icon-button" onClick={() => setMostrarForm(false)}>×</button></div>
      {erro && <AvisoErro message={erro}/>}
      <div className="user-form">
        <label>Nome da farmácia<input required maxLength={160} value={nome} onChange={e => setNome(e.target.value)}/></label>
        <label>CNPJ<input required inputMode="numeric" maxLength={18} value={cnpj} onChange={e => setCnpj(formatarCnpj(e.target.value))}/><small>Informe os 14 dígitos do CNPJ.</small></label>
      </div>
      {conta && (dentroDaCota
        ? <p className="modal-nota">Você já contratou {conta.farmaciasContratadas} farmácias e usou {conta.empresasAtivas} — esta entra dentro
            do que já foi pago, sem cobrança extra e sem precisar de pagamento agora.</p>
        : <p className="modal-nota">Isso soma {money(conta.precoAdicionalPorFarmacia)}/mês na assinatura. Você vai pro pagamento agora, e a
            farmácia só é criada depois que ele for confirmado.</p>)}
      <div className="modal-actions"><button type="button" className="button button-ghost" onClick={() => setMostrarForm(false)}>Cancelar</button>
        <button className="button button-primary" disabled={enviando}>
          {enviando ? (dentroDaCota ? 'Criando...' : 'Abrindo pagamento...') : dentroDaCota ? 'Criar farmácia' : 'Ir para o pagamento'}
        </button></div>
    </form></div>}
  </>
}

/* Quem representa a cobrança da assinatura: uma das farmácias do grupo. Nome e CNPJ dela
   aparecem na fatura e não são digitados aqui — só escolhidos no seletor. Telefone e endereço
   são da conta (grupo) inteira, exigidos pelo Asaas. Quem administra qualquer farmácia do grupo
   pode alterar, mesmo sem ser admin da farmácia ativa agora. */
function CardPagamento() {
  const { user } = usarAutenticacao()
  const somenteLeitura = !isAdminDoGrupo(user)
  const [conta, setConta] = useState<Conta|null>(null)
  const [empresas, setEmpresas] = useState<Empresa[]|null>(null)
  const [empresaPagadoraId, setEmpresaPagadoraId] = useState<number|null>(null)
  const [telefone, setTelefone] = useState('')
  const [endereco, setEndereco] = useState<FormularioEndereco>(enderecoVazio)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    api<Conta>('/account').then(dados => {
      setConta(dados); setEmpresaPagadoraId(dados.empresaPagadoraId)
      setTelefone(formatarTelefone(dados.telefone ?? '')); setEndereco(enderecoDoServidor(dados.endereco))
    }).catch(e => setErro(e instanceof ErroApi ? e.message : 'Falha ao carregar os dados.'))
    api<Empresa[]>('/companies').then(setEmpresas).catch(() => {})
  }, [])

  const salvar = async (evento:FormEvent) => {
    evento.preventDefault(); setErro(''); setMensagem('')
    if (empresaPagadoraId == null) { setErro('Escolha qual farmácia representa a cobrança.'); return }
    setOcupado(true)
    try {
      const atualizada = await api<Conta>('/account', { method:'PUT', body:JSON.stringify({
        empresaPagadoraId, telefone:telefone.replace(/\D/g, ''), endereco:paraEnvio(endereco),
      }) })
      setConta(atualizada); setEmpresaPagadoraId(atualizada.empresaPagadoraId); setEndereco(enderecoDoServidor(atualizada.endereco))
      setMensagem('Dados de cobrança atualizados.')
    } catch (e) { setErro(e instanceof ErroApi ? e.message : 'Não foi possível salvar.') }
    finally { setOcupado(false) }
  }

  if (!conta || !empresas) return <section className="card settings-card"><Carregando/>{erro && <AvisoErro message={erro}/>}</section>

  const ativas = empresas.filter(e => e.ativo)
  const pagadoraSelecionada = ativas.find(e => e.id === empresaPagadoraId)

  return <form className="settings-form-wrap" onSubmit={salvar}>
    {erro && <AvisoErro message={erro}/>}
    {mensagem && <div className="alert alert-success">{mensagem}</div>}
    <section className="card settings-card">
      <div className="card-header"><div><h2><Building2/> Quem paga a assinatura</h2><p>Escolha qual farmácia representa a cobrança — o nome e o CNPJ dela aparecem na fatura.</p></div></div>
      <div className="stack-form settings-form">
        <label>Farmácia pagadora
          <select disabled={somenteLeitura} value={empresaPagadoraId ?? ''} onChange={e => setEmpresaPagadoraId(Number(e.target.value))}>
            {ativas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </label>
        <label>Razão social<input disabled value={pagadoraSelecionada?.nome ?? ''}/></label>
        <label>CNPJ<input disabled value={formatarCnpj(pagadoraSelecionada?.cnpj ?? '')}/><small>Preenchidos automaticamente pela farmácia escolhida acima.</small></label>
      </div>
    </section>
    <section className="card settings-card">
      <div className="card-header"><div><h2><MapPin/> Endereço e contato</h2><p>A operadora de pagamento exige estes dados para emitir a cobrança da assinatura.</p></div></div>
      <div className="settings-form">
        <CamposEndereco telefone={telefone} setTelefone={setTelefone} endereco={endereco} setEndereco={setEndereco} desabilitado={somenteLeitura}/>
      </div>
    </section>
    {somenteLeitura
      ? <div className="alert alert-warning">Somente administradores da conta podem alterar estes dados.</div>
      : <button className="button button-primary" disabled={ocupado}><Save/>{ocupado ? 'Salvando...' : 'Salvar dados'}</button>}
  </form>
}

type Aba = 'farmacias' | 'pagamento'

export default function PaginaConfiguracoes() {
  const [aba, setAba] = useState<Aba>('farmacias')
  return <div className="page">
    <div className="page-header"><div><span className="eyebrow green">Administração</span><h1>Dados da farmácia</h1><p>Informações usadas nos pedidos de compra e na cobrança da assinatura.</p></div></div>
    <div className="tabs" role="tablist" aria-label="Seções de dados da farmácia">
      <button type="button" role="tab" aria-selected={aba==='farmacias'} className={aba==='farmacias'?'active':''} onClick={() => setAba('farmacias')}><Building2/>Farmácias</button>
      <button type="button" role="tab" aria-selected={aba==='pagamento'} className={aba==='pagamento'?'active':''} onClick={() => setAba('pagamento')}><MapPin/>Pagamento</button>
    </div>
    <div hidden={aba!=='farmacias'}><CardFarmacias/></div>
    <div hidden={aba!=='pagamento'}><CardPagamento/></div>
  </div>
}
