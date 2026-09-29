import { AlertTriangle, ChevronDown, ChevronUp, FileSpreadsheet, LoaderCircle, Search, Upload } from 'lucide-react'
import { Fragment, useRef, useState } from 'react'
import { api, ErroApi, money } from '../api'
import { LinkInterno } from '../roteamento'
import type { ItemListaPortais, ResultadoListaPortais, SituacaoItemLista } from '../types'
import { AvisoErro, EstadoVazio } from './ComponentesUI'

type Filtro = 'todos' | SituacaoItemLista
const ROTULOS:Record<Filtro,string> = { todos:'Todos', EAN:'Pelo EAN', NOME:'Pelo nome', NAO_ENCONTRADO:'Não encontrados' }
const semAcento = (texto:string) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

function LinhaItem({ item }:{ item:ItemListaPortais }) {
  const [aberto, setAberto] = useState(false)
  const melhor = item.ofertas[0]
  return <Fragment>
    <tr className={`lista-item lista-${item.situacao.toLowerCase()}`}>
      <td className="lista-produto">
        <strong title={item.descricao}>{item.descricao || '(sem descrição)'}</strong>
        <small>{[item.ean && `EAN ${item.ean}`, item.laboratorio].filter(Boolean).join(' · ') || 'sem EAN'}</small>
      </td>
      <td className="numero">{item.quantidade}</td>
      <td className="lista-encontrado">
        {item.situacao === 'NAO_ENCONTRADO'
          ? <span className="lista-nao">Não encontrado nos portais</span>
          : <>
            <span title={item.produtoNome ?? ''}>{item.produtoNome}</span>
            <small>{item.situacao === 'NOME' && <span className="lista-selo-nome">pelo nome, confira</span>}{item.produtoMarca}</small>
          </>}
      </td>
      <td>{melhor && <><span>{melhor.distribuidora}</span><small>{melhor.portal}{melhor.pedidoMinimo ? ` · mín ${money(melhor.pedidoMinimo)}` : ''}</small></>}</td>
      <td className="numero">{melhor && <><strong>{money(melhor.preco)}</strong>{melhor.semImposto && <small> + imp.</small>}{melhor.estoque < item.quantidade && <small className="lista-estoque-curto">só {melhor.estoque} un.</small>}</>}</td>
      <td className="numero">{melhor && money(melhor.preco * Math.min(item.quantidade, melhor.estoque))}</td>
      <td>{item.ofertas.length > 1 && <button type="button" className="icon-button" aria-expanded={aberto}
        aria-label={aberto ? 'Esconder outras ofertas' : `Ver ${item.ofertas.length - 1} outras ofertas`} title={`${item.ofertas.length} ofertas`}
        onClick={() => setAberto(a => !a)}>{aberto ? <ChevronUp/> : <ChevronDown/>}</button>}</td>
    </tr>
    {aberto && item.ofertas.slice(1).map((oferta, indice) => <tr key={indice} className="lista-oferta-extra">
      <td colSpan={3}/>
      <td><span>{oferta.distribuidora}</span><small>{oferta.portal}{oferta.pedidoMinimo ? ` · mín ${money(oferta.pedidoMinimo)}` : ''}</small></td>
      <td className="numero">{money(oferta.preco)}{oferta.semImposto && <small> + imp.</small>}</td>
      <td className="numero">{money(oferta.preco * Math.min(item.quantidade, oferta.estoque))}</td>
      <td/>
    </tr>)}
  </Fragment>
}

/* Sobe uma lista (exportação de pedido do ERP, planilha de compra) e confere todos os itens nos
   portais de uma vez: melhor oferta por item e quanto sairia por distribuidora. Só consulta. */
export default function ConferenciaListaPortais() {
  const entrada = useRef<HTMLInputElement>(null)
  const [arquivo, setArquivo] = useState('')
  const [resultado, setResultado] = useState<ResultadoListaPortais|null>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busca, setBusca] = useState('')

  const enviar = async (selecionado:File|undefined) => {
    if (!selecionado) return
    setErro(''); setEnviando(true); setArquivo(selecionado.name); setFiltro('todos'); setBusca('')
    const corpo = new FormData(); corpo.append('file', selecionado)
    try { setResultado(await api<ResultadoListaPortais>('/integracoes/busca/lista', { method:'POST', body:corpo })) }
    catch (e) { setResultado(null); setErro(e instanceof ErroApi ? e.message : 'Não foi possível conferir a lista.') }
    finally { setEnviando(false); if (entrada.current) entrada.current.value = '' }
  }

  const contagem:Record<Filtro,number> = resultado
    ? { todos:resultado.totalItens, EAN:resultado.porEan, NOME:resultado.porNome, NAO_ENCONTRADO:resultado.naoEncontrados }
    : { todos:0, EAN:0, NOME:0, NAO_ENCONTRADO:0 }
  const termo = semAcento(busca.trim())
  const itens = (resultado?.itens ?? []).filter(item => (filtro === 'todos' || item.situacao === filtro)
    && (!termo || semAcento([item.descricao, item.ean, item.laboratorio ?? '', item.produtoNome ?? '', ...item.ofertas.map(o => o.distribuidora)].join(' ')).includes(termo)))
  const nenhumPortal = resultado != null && resultado.portaisConsultados.length === 0 && resultado.avisos.length === 0

  return <div className="lista-portais">
    <div className="toolbar lista-envio">
      <FileSpreadsheet aria-hidden="true"/>
      <div><strong>{arquivo || 'Envie uma planilha para conferir vários produtos de uma vez'}</strong>
        <small>Excel (.xlsx) ou CSV com descrição e/ou EAN. Quantidade e laboratório ajudam, mas são opcionais.</small></div>
      <input ref={entrada} type="file" accept=".xlsx,.csv" hidden onChange={e => void enviar(e.target.files?.[0])}/>
      <button type="button" className="button button-primary" disabled={enviando} onClick={() => entrada.current?.click()}>
        {enviando ? <><LoaderCircle className="spin"/>Conferindo...</> : <><Upload/>{resultado ? 'Enviar outra' : 'Escolher planilha'}</>}
      </button>
    </div>
    {enviando && <p className="portal-dica"><LoaderCircle className="spin"/>Conferindo nos portais. Se o catálogo ainda não estiver carregado, a primeira vez leva uns 20 segundos.</p>}
    {erro && <AvisoErro message={erro}/>}
    {resultado?.avisos.map(aviso => <div key={aviso.portal} className="alert alert-warning portal-aviso">
      <AlertTriangle/><span><strong>{aviso.portal}:</strong> {aviso.mensagem}</span>
      <LinkInterno to="/dados-farmacia?aba=integracoes" className="text-link">Ver conexão</LinkInterno>
    </div>)}
    {nenhumPortal && <EstadoVazio title="Nenhum portal conectado" description="Conecte um portal de pedido eletrônico para conferir a lista."/>}

    {resultado && !nenhumPortal && <>
      <div className="lista-resumo">
        <div><span>Itens na lista</span><strong>{resultado.totalItens}</strong></div>
        <div><span>Encontrados</span><strong>{resultado.porEan + resultado.porNome}</strong><small>{resultado.porNome > 0 ? `${resultado.porNome} pelo nome` : 'todos pelo EAN'}</small></div>
        <div><span>Não encontrados</span><strong>{resultado.naoEncontrados}</strong></div>
        <div><span>Total nos melhores preços</span><strong>{money(resultado.totalMelhoresPrecos)}</strong><small>limitado ao estoque de cada oferta</small></div>
      </div>

      {resultado.distribuidoras.length > 0 && <section className="card lista-distribuidoras">
        <div className="card-header"><div><h2>Por distribuidora</h2><p>Quanto sairia comprando dela tudo o que ela tem da lista.</p></div></div>
        <div className="table-wrap"><table>
          <thead><tr><th>Distribuidora</th><th>Portal</th><th className="numero">Itens</th><th className="numero">Total</th><th className="numero">Pedido mínimo</th></tr></thead>
          <tbody>{resultado.distribuidoras.map(d => <tr key={`${d.portal}-${d.distribuidora}`}>
            <td>{d.distribuidora}</td><td><span className="portal-selo">{d.portal}</span></td>
            <td className="numero">{d.itens} de {resultado.porEan + resultado.porNome}</td>
            <td className="numero"><strong>{money(d.total)}</strong></td>
            <td className={`numero${d.pedidoMinimo && d.total < d.pedidoMinimo ? ' lista-abaixo-minimo' : ''}`}
              title={d.pedidoMinimo && d.total < d.pedidoMinimo ? 'O total fica abaixo do pedido mínimo desta distribuidora' : undefined}>
              {d.pedidoMinimo ? money(d.pedidoMinimo) : '-'}</td>
          </tr>)}</tbody>
        </table></div>
      </section>}

      <div className="vinculos-ferramentas lista-ferramentas">
        <label className="vinculos-busca"><Search aria-hidden="true"/>
          <input type="search" placeholder="Filtrar por produto, EAN ou distribuidora" aria-label="Filtrar itens da lista" value={busca} onChange={e => setBusca(e.target.value)}/>
        </label>
        <div className="vinculos-filtros" role="group" aria-label="Filtrar por situação">
          {(Object.keys(ROTULOS) as Filtro[]).map(f => <button key={f} type="button" aria-pressed={filtro === f}
            className={`vinculos-filtro${filtro === f ? ' ativo' : ''}`} onClick={() => setFiltro(f)}>{ROTULOS[f]} <span>{contagem[f]}</span></button>)}
        </div>
      </div>
      <div className="table-wrap card"><table className="lista-tabela">
        <thead><tr><th>Produto da lista</th><th className="numero">Qtd</th><th>Encontrado</th><th>Melhor oferta</th><th className="numero">Preço</th><th className="numero">Total</th><th/></tr></thead>
        <tbody>{itens.map(item => <LinhaItem key={item.linha} item={item}/>)}</tbody>
      </table>
      {itens.length === 0 && <p className="vinculos-vazio">Nenhum item com esses filtros.</p>}</div>
    </>}
  </div>
}
