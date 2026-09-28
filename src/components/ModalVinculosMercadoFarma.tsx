import { Ban, Check, Link2, Search, Undo2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { api, ErroApi, money } from '../api'
import type { ResultadoVinculosMercadoFarma, SugestaoCorrespondenciaMercadoFarma } from '../types'
import { AvisoErro } from './ComponentesUI'
import { lerRecusados, gravarRecusados, NENHUM } from '../lib/vinculosMercadoFarma'

type Filtro = 'todos' | 'pendentes' | 'vinculados' | 'ignorados'
const ROTULOS:Record<Filtro,string> = { todos:'Todos', pendentes:'Para escolher', vinculados:'Vinculados', ignorados:'Ignorados' }

const semAcento = (texto:string) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

/* Produtos sem EAN que parecem estar no Mercado Farma. Uma linha por produto, com os
   candidatos lado a lado. O mais parecido já vem marcado quando a semelhança é alta. Busca e
   filtros ajudam em listas grandes, e as ações em lote valem só para o que está filtrado.
   Confirma tudo de uma vez: o EAN vai para o cadastro do produto e a importação roda de novo. */
export default function ModalVinculosMercadoFarma({ cotacaoId, sugestoes, aoConcluir, aoFechar }:{
  cotacaoId:number; sugestoes:SugestaoCorrespondenciaMercadoFarma[]
  aoConcluir:(resultado:ResultadoVinculosMercadoFarma)=>void; aoFechar:()=>void
}) {
  const [escolhas, setEscolhas] = useState<Record<number,string>>(() =>
    Object.fromEntries(sugestoes.filter(s => s.eanSugerido).map(s => [s.itemCotacaoId, s.eanSugerido!])))
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [laboratorio, setLaboratorio] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    const aoTeclar = (evento:KeyboardEvent) => { if (evento.key === 'Escape' && !enviando) aoFechar() }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [aoFechar, enviando])

  const situacao = (s:SugestaoCorrespondenciaMercadoFarma):Exclude<Filtro,'todos'> =>
    escolhas[s.itemCotacaoId] == null ? 'pendentes' : escolhas[s.itemCotacaoId] === NENHUM ? 'ignorados' : 'vinculados'
  const contagem:Record<Filtro,number> = { todos:sugestoes.length, pendentes:0, vinculados:0, ignorados:0 }
  sugestoes.forEach(s => { contagem[situacao(s)] += 1 })
  const laboratorios = useMemo(() => [...new Set(sugestoes.map(s => s.laboratorio).filter((l):l is string => !!l))].sort(), [sugestoes])

  const termo = semAcento(busca.trim())
  const visiveis = sugestoes.filter(s => (filtro === 'todos' || situacao(s) === filtro)
    && (!laboratorio || s.laboratorio === laboratorio)
    && (!termo || semAcento([s.produto, s.laboratorio ?? '', ...s.candidatos.flatMap(c => [c.nome, c.marca ?? '', c.ean])].join(' ')).includes(termo)))

  const vinculos = Object.entries(escolhas).filter(([, ean]) => ean !== NENHUM).map(([itemCotacaoId, ean]) => ({ itemCotacaoId:Number(itemCotacaoId), ean }))
  const decididos = contagem.vinculados + contagem.ignorados
  const escolher = (itemCotacaoId:number, valor:string|null) => setEscolhas(atuais => {
    const proximas = { ...atuais }
    if (valor == null) delete proximas[itemCotacaoId]; else proximas[itemCotacaoId] = valor
    return proximas
  })
  const pendentesVisiveis = visiveis.filter(s => escolhas[s.itemCotacaoId] == null)
  const marcarMaisParecidos = () => setEscolhas(atuais => ({ ...atuais, ...Object.fromEntries(pendentesVisiveis.map(s => [s.itemCotacaoId, s.candidatos[0].ean])) }))
  const ignorarPendentes = () => setEscolhas(atuais => ({ ...atuais, ...Object.fromEntries(pendentesVisiveis.map(s => [s.itemCotacaoId, NENHUM])) }))

  const confirmar = async () => {
    setErro('')
    const recusados = lerRecusados()
    sugestoes.filter(s => escolhas[s.itemCotacaoId] === NENHUM).forEach(s => recusados.add(s.produtoId))
    gravarRecusados(recusados)
    if (vinculos.length === 0) { aoFechar(); return }
    setEnviando(true)
    try {
      aoConcluir(await api<ResultadoVinculosMercadoFarma>(`/quotations/${cotacaoId}/mercado-farma/vinculos`, { method:'POST', body:JSON.stringify({ itens:vinculos }) }))
    } catch (e) { setErro(e instanceof ErroApi ? e.message : 'Não foi possível salvar os vínculos.') }
    finally { setEnviando(false) }
  }

  return <div className="modal-backdrop" role="presentation">
    <section className="modal vinculos-modal" role="dialog" aria-modal="true" aria-labelledby="vinculos-titulo">
      <div className="modal-header modal-header-simple">
        <div>
          <h2 id="vinculos-titulo">{sugestoes.length === 1 ? '1 produto sem EAN' : `${sugestoes.length} produtos sem EAN`} no Mercado Farma</h2>
          <p>Marque qual é o mesmo produto. O EAN fica salvo no cadastro e, nas próximas importações, ele entra sozinho.</p>
        </div>
        <button type="button" className="icon-button" aria-label="Fechar" disabled={enviando} onClick={aoFechar}><X/></button>
      </div>
      {erro && <AvisoErro message={erro}/>}

      <div className="vinculos-ferramentas">
        <label className="vinculos-busca"><Search aria-hidden="true"/>
          <input type="search" placeholder="Buscar produto, marca ou EAN" aria-label="Buscar produto, marca ou EAN" value={busca} onChange={e => setBusca(e.target.value)}/>
        </label>
        {laboratorios.length > 1 && <select aria-label="Filtrar por laboratório" value={laboratorio} onChange={e => setLaboratorio(e.target.value)}>
          <option value="">Todos os laboratórios</option>
          {laboratorios.map(l => <option key={l} value={l}>{l}</option>)}
        </select>}
        <div className="vinculos-filtros" role="group" aria-label="Filtrar por situação">
          {(Object.keys(ROTULOS) as Filtro[]).map(f => <button key={f} type="button" aria-pressed={filtro === f}
            className={`vinculos-filtro${filtro === f ? ' ativo' : ''}`} onClick={() => setFiltro(f)}>{ROTULOS[f]} <span>{contagem[f]}</span></button>)}
        </div>
      </div>
      {pendentesVisiveis.length > 0 && <div className="vinculos-lote">
        <span>{pendentesVisiveis.length} para escolher {visiveis.length !== sugestoes.length ? 'nesta seleção' : ''}</span>
        <button type="button" className="button button-ghost" onClick={marcarMaisParecidos}><Check/>Marcar o mais parecido</button>
        <button type="button" className="button button-ghost" onClick={ignorarPendentes}><Ban/>Ignorar</button>
      </div>}

      <div className="vinculos-lista" role="list">
        {visiveis.length === 0 && <p className="vinculos-vazio">Nenhum produto com esses filtros.</p>}
        {visiveis.map(sugestao => {
          const escolha = escolhas[sugestao.itemCotacaoId]
          const ignorado = escolha === NENHUM
          return <div key={sugestao.itemCotacaoId} role="listitem" className={`vinculo-linha${ignorado ? ' ignorado' : ''}${escolha && !ignorado ? ' vinculado' : ''}`}>
            <div className="vinculo-produto">
              <strong title={sugestao.produto}>{sugestao.produto}</strong>
              <small>{[sugestao.laboratorio, `${sugestao.quantidade} un.`].filter(Boolean).join(' · ')}</small>
            </div>
            <div className="vinculo-candidatos" role="radiogroup" aria-label={`Produto do Mercado Farma para ${sugestao.produto}`}>
              {ignorado
                ? <span className="vinculo-ignorado-texto">Não é nenhum destes: não pergunta de novo.</span>
                : sugestao.candidatos.map((candidato, indice) => <label key={candidato.ean} className={`vinculo-opcao${escolha === candidato.ean ? ' selecionada' : ''}`}
                  title={`${candidato.nome} · ${candidato.marca ?? ''} · EAN ${candidato.ean}`}>
                  <input type="radio" name={`vinculo-${sugestao.itemCotacaoId}`} checked={escolha === candidato.ean} onChange={() => escolher(sugestao.itemCotacaoId, candidato.ean)}/>
                  <span className="vinculo-opcao-nome">{candidato.nome}</span>
                  <span className="vinculo-opcao-info">{candidato.marca}{indice === 0 && candidato.pontuacao >= 85 ? ' · mais parecido' : ''}</span>
                  <span className="vinculo-opcao-preco">{candidato.menorPreco != null ? money(candidato.menorPreco) : '-'}<small> · {candidato.distribuidoras} dist.</small></span>
                </label>)}
            </div>
            <button type="button" className="icon-button vinculo-acao" onClick={() => escolher(sugestao.itemCotacaoId, ignorado ? sugestao.eanSugerido : NENHUM)}
              title={ignorado ? 'Desfazer' : 'Não é nenhum destes'} aria-label={ignorado ? `Desfazer: ${sugestao.produto}` : `Nenhum destes: ${sugestao.produto}`}>
              {ignorado ? <Undo2/> : <Ban/>}
            </button>
          </div>
        })}
      </div>

      <div className="modal-actions vinculos-rodape">
        <span>{contagem.vinculados} vinculado{contagem.vinculados === 1 ? '' : 's'} · {contagem.ignorados} ignorado{contagem.ignorados === 1 ? '' : 's'} · {contagem.pendentes} para escolher</span>
        <button type="button" className="button button-ghost" disabled={enviando} onClick={aoFechar}>Agora não</button>
        <button type="button" className="button button-primary" disabled={enviando || decididos === 0} onClick={() => void confirmar()}>
          <Link2/>{enviando ? 'Salvando e importando...' : vinculos.length > 0 ? `Vincular ${vinculos.length} e importar` : 'Salvar'}
        </button>
      </div>
    </section>
  </div>
}
