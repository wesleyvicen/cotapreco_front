import { AlertTriangle, ChevronDown, ChevronUp, FileSpreadsheet, LoaderCircle, PlugZap, Search } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { api, ErroApi, money } from '../api'
import { AvisoErro, EstadoVazio } from '../components/ComponentesUI'
import ConferenciaListaPortais from '../components/ConferenciaListaPortais'
import { LinkInterno, usarParametrosBusca } from '../roteamento'
import type { ProdutoPortalEncontrado, ResultadoBuscaPortais } from '../types'

const OFERTAS_VISIVEIS = 4

/* Uma linha por produto, com as ofertas de todos os portais da mais barata para a mais cara.
   Mostra as primeiras e abre o resto sob demanda para a lista não ficar comprida. */
function CartaoProduto({ produto }:{ produto:ProdutoPortalEncontrado }) {
  const [aberto, setAberto] = useState(false)
  const ofertas = aberto ? produto.ofertas : produto.ofertas.slice(0, OFERTAS_VISIVEIS)
  const escondidas = produto.ofertas.length - OFERTAS_VISIVEIS
  return <article className="portal-produto">
    <header>
      <div>
        <strong>{produto.nome}</strong>
        <small>{[produto.marca, produto.ean && `EAN ${produto.ean}`].filter(Boolean).join(' · ')}</small>
      </div>
      <div className="portal-produto-resumo">
        <strong>a partir de {money(produto.menorPreco)}</strong>
        <small>{produto.ofertas.length} oferta{produto.ofertas.length === 1 ? '' : 's'} · {produto.estoqueTotal} un. em estoque</small>
      </div>
    </header>
    <div className="table-wrap"><table className="portal-ofertas">
      <thead><tr><th>Distribuidora</th><th>Portal</th><th className="numero">Preço</th><th className="numero">Estoque</th><th className="numero">Pedido mínimo</th></tr></thead>
      <tbody>{ofertas.map((oferta, indice) => <tr key={`${oferta.portal}-${oferta.distribuidora}-${indice}`} className={indice === 0 ? 'melhor' : undefined}>
        <td>{oferta.distribuidora}</td>
        <td><span className="portal-selo">{oferta.portal}</span></td>
        <td className="numero"><strong>{money(oferta.preco)}</strong>{oferta.semImposto && <small title="O distribuidor não calculou o imposto neste preço; ele é somado no faturamento."> + imposto</small>}</td>
        <td className="numero">{oferta.estoque > 0 ? `${oferta.estoque} un.` : <span className="portal-sem-estoque">sem estoque</span>}</td>
        <td className={oferta.pedidoMinimo ? 'numero' : 'numero sem-minimo'}>{oferta.pedidoMinimo ? money(oferta.pedidoMinimo) : '-'}</td>
      </tr>)}</tbody>
    </table></div>
    {escondidas > 0 && <button type="button" className="text-link portal-ver-mais" aria-expanded={aberto} onClick={() => setAberto(a => !a)}>
      {aberto ? <><ChevronUp/>Mostrar menos</> : <><ChevronDown/>Ver mais {escondidas} oferta{escondidas === 1 ? '' : 's'}</>}
    </button>}
  </article>
}

/* Consulta preço e estoque em todos os portais de pedido eletrônico que a farmácia conectou:
   um produto por vez ou uma lista inteira (planilha). Só leitura. Aba e termo ficam na URL
   para recarregar ou compartilhar a busca. */
export default function PaginaPortais() {
  const [params, setParams] = usarParametrosBusca()
  const modo = params.get('modo') === 'lista' ? 'lista' : 'produto'
  const trocarModo = (proximo:'produto'|'lista') => {
    const proximos = new URLSearchParams(params)
    if (proximo === 'lista') proximos.set('modo', 'lista'); else proximos.delete('modo')
    setParams(proximos, { replace:true })
  }
  const termoUrl = params.get('q') ?? ''
  const somenteComEstoque = params.get('estoque') !== 'todos'
  const [termo, setTermo] = useState(termoUrl)
  const [resultado, setResultado] = useState<ResultadoBuscaPortais|null>(null)
  const [buscando, setBuscando] = useState(false)
  const [erro, setErro] = useState('')
  const [portal, setPortal] = useState('')
  const [marca, setMarca] = useState('')

  useEffect(() => {
    if (termoUrl.trim().length < 3) { setResultado(null); return }
    let ativo = true
    setBuscando(true); setErro('')
    api<ResultadoBuscaPortais>(`/integracoes/busca?${new URLSearchParams({ q:termoUrl, somenteComEstoque:String(somenteComEstoque) })}`)
      .then(dados => { if (ativo) { setResultado(dados); setPortal(''); setMarca('') } })
      .catch(e => { if (ativo) { setResultado(null); setErro(e instanceof ErroApi ? e.message : 'Não foi possível consultar os portais.') } })
      .finally(() => { if (ativo) setBuscando(false) })
    return () => { ativo = false }
  }, [termoUrl, somenteComEstoque])

  const buscar = (evento:FormEvent) => {
    evento.preventDefault()
    if (termo.trim().length < 3) { setErro('Digite ao menos 3 letras ou números para buscar.'); return }
    const proximos = new URLSearchParams(params); proximos.set('q', termo.trim()); setParams(proximos)
  }
  const alternarEstoque = (valor:boolean) => {
    const proximos = new URLSearchParams(params)
    if (valor) proximos.delete('estoque'); else proximos.set('estoque', 'todos')
    setParams(proximos, { replace:true })
  }

  const portais = [...new Set(resultado?.produtos.flatMap(p => p.ofertas.map(o => o.portal)) ?? [])].sort()
  const marcas = [...new Set(resultado?.produtos.map(p => p.marca).filter((m):m is string => !!m) ?? [])].sort()
  const produtos = (resultado?.produtos ?? [])
    .filter(p => !marca || p.marca === marca)
    .map(p => portal ? { ...p, ofertas:p.ofertas.filter(o => o.portal === portal) } : p)
    .filter(p => p.ofertas.length > 0)
  const nenhumPortal = resultado != null && resultado.portaisConsultados.length === 0 && resultado.avisos.length === 0

  return <div className="page">
    <div className="page-header"><div><span className="eyebrow green">Consulta</span><h1>Busca nos portais</h1>
      <p>Preço e estoque em todos os portais de pedido eletrônico conectados, lado a lado.</p></div></div>

    <div className="tabs" role="tablist" aria-label="Tipo de busca">
      <button type="button" role="tab" aria-selected={modo==='produto'} className={modo==='produto'?'active':''} onClick={() => trocarModo('produto')}><Search/>Um produto</button>
      <button type="button" role="tab" aria-selected={modo==='lista'} className={modo==='lista'?'active':''} onClick={() => trocarModo('lista')}><FileSpreadsheet/>Conferir lista</button>
    </div>

    {modo === 'lista' ? <ConferenciaListaPortais/> : <>
    <form className="toolbar portal-busca" onSubmit={buscar}>
      <label className="search"><Search/><input autoFocus placeholder="Nome, princípio ativo ou EAN (ex.: losartana 50)" aria-label="Buscar nos portais" value={termo} onChange={e => setTermo(e.target.value)}/></label>
      <button className="button button-primary" disabled={buscando}>{buscando ? <><LoaderCircle className="spin"/>Buscando...</> : <><Search/>Buscar</>}</button>
      <label className="portal-check"><input type="checkbox" checked={somenteComEstoque} onChange={e => alternarEstoque(e.target.checked)}/>Só com estoque</label>
    </form>

    {erro && <AvisoErro message={erro}/>}
    {resultado?.avisos.map(aviso => <div key={aviso.portal} className="alert alert-warning portal-aviso">
      <AlertTriangle/><span><strong>{aviso.portal}:</strong> {aviso.mensagem}</span>
      <LinkInterno to="/dados-farmacia?aba=integracoes" className="text-link">Ver conexão</LinkInterno>
    </div>)}

    {buscando && !resultado && <p className="portal-dica"><LoaderCircle className="spin"/>Consultando os portais. A primeira busca baixa o catálogo e pode levar uns 20 segundos; as seguintes são imediatas.</p>}

    {!buscando && !resultado && !erro && <EstadoVazio title="Busque um produto" description="Digite o nome, o princípio ativo com a dosagem ou o EAN. A busca consulta todos os portais conectados ao mesmo tempo."/>}

    {nenhumPortal && <EstadoVazio title="Nenhum portal conectado" description="Conecte um portal de pedido eletrônico, como o Mercado Farma, para buscar preços aqui."
      action={<LinkInterno to="/dados-farmacia?aba=integracoes" className="button button-primary"><PlugZap/>Conectar portal</LinkInterno>}/>}

    {resultado && !nenhumPortal && <>
      <div className="portal-filtros">
        <span>{produtos.length} produto{produtos.length === 1 ? '' : 's'}{resultado.portaisConsultados.length > 0 && ` · consultado${resultado.portaisConsultados.length === 1 ? '' : 's'}: ${resultado.portaisConsultados.join(', ')}`}</span>
        {portais.length > 1 && <select aria-label="Filtrar por portal" value={portal} onChange={e => setPortal(e.target.value)}>
          <option value="">Todos os portais</option>{portais.map(p => <option key={p} value={p}>{p}</option>)}
        </select>}
        {marcas.length > 1 && <select aria-label="Filtrar por marca" value={marca} onChange={e => setMarca(e.target.value)}>
          <option value="">Todas as marcas</option>{marcas.map(m => <option key={m} value={m}>{m}</option>)}
        </select>}
      </div>
      {resultado.limitado && <div className="alert alert-warning">Mostrando os primeiros 100 produtos. Refine a busca, por exemplo com a dosagem.</div>}
      {produtos.length === 0
        ? <EstadoVazio title="Nada encontrado" description={somenteComEstoque ? 'Nenhum produto com estoque para essa busca. Tente outro termo ou desmarque "Só com estoque".' : 'Nenhum produto encontrado para essa busca.'}/>
        : <div className="portal-lista">{produtos.map(p => <CartaoProduto key={p.ean ?? p.nome} produto={p}/>)}</div>}
    </>}
    </>}
  </div>
}
