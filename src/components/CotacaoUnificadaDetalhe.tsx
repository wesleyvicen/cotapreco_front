import { Boxes, ChevronDown, Layers, Lock, SlidersHorizontal, X } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { api, ErroApi } from '../api'
import { salvarEmpresaAtiva } from '../cache/persistenciaSessao'
import { usarCamadaNoHistorico } from '../hooks/usarCamadaNoHistorico'
import type { DivisaoEstoque, StatusCotacao, VinculoUnificada } from '../types'
import { AvisoErro } from './ComponentesUI'

/* Atalho entre as partes de uma cotação unificada. Cada parte pertence a uma farmácia, e a
   farmácia ativa decide o que a API enxerga; trocar de parte é trocar de farmácia, com o
   mesmo recarregamento do seletor da barra lateral (ver trocarEmpresaAtiva). */
const CHIPS_MAXIMOS = 4

export function BarraFarmaciasUnificada({ vinculo, cotacaoId, aba }:{ vinculo:VinculoUnificada; cotacaoId:number; aba:string }) {
  const trocar = (quotationId:number) => {
    const farmacia = vinculo.pharmacies.find(item => item.quotationId === quotationId)
    if (!farmacia || quotationId === cotacaoId) return
    salvarEmpresaAtiva(farmacia.companyId)
    window.location.assign(`/cotacoes/${quotationId}?aba=${aba}`)
  }
  /* Poucas farmácias: um botão por farmácia, numa linha. Rede grande: um seletor, para a
     barra continuar com uma linha só em vez de empilhar dezenas de botões sobre a cotação. */
  if (vinculo.pharmacies.length > CHIPS_MAXIMOS) return <nav className="unified-switcher" aria-label="Farmácias desta cotação unificada">
    <span><Layers/>Cotação unificada · {vinculo.pharmacies.length} farmácias</span>
    <label className="unified-switcher-select"><span className="sr-only">Ver a compra da farmácia</span>
      <select value={cotacaoId} onChange={event => trocar(Number(event.target.value))}>
        {vinculo.pharmacies.map(farmacia => <option key={farmacia.quotationId} value={farmacia.quotationId}>{farmacia.companyName}</option>)}
      </select>
    </label>
  </nav>
  return <nav className="unified-switcher" aria-label="Farmácias desta cotação unificada">
    <span><Layers/>Cotação unificada:</span>
    {vinculo.pharmacies.map(farmacia => {
      const atual = farmacia.quotationId === cotacaoId
      return <button key={farmacia.quotationId} type="button" aria-current={atual} disabled={atual}
        title={atual ? 'Farmácia que você está vendo' : `Ver a compra da ${farmacia.companyName}`}
        onClick={() => trocar(farmacia.quotationId)}>{farmacia.companyName}</button>
    })}
  </nav>
}

const CHAVE_PAINEL_ABERTO = 'cotapreco:estoque-dividido-aberto'
/* Nasce recolhido: é informação de apoio, e quem quer ver abre. Só 'true' expande, então
   quem abriu de propósito continua encontrando aberto (mesma regra da faixa de achados). */
function lerPainelAberto() {
  try { return window.localStorage.getItem(CHAVE_PAINEL_ABERTO) === 'true' } catch { return false }
}

/* Produtos em que uma distribuidora tem menos estoque do que a soma pedida pelas farmácias,
   em formato de planilha: uma linha por produto, uma coluna por farmácia. A divisão automática
   é proporcional ao pedido de cada uma; com a cotação fechada dá para redistribuir. Recolhível
   e com rolagem própria, para não empurrar o plano de compra para longe. */
export function PainelDivisaoEstoque({ vinculo, status, podeEditar, aoAlterar }:{ vinculo:VinculoUnificada; status:StatusCotacao; podeEditar:boolean; aoAlterar:() => Promise<void> }) {
  const [divisoes, setDivisoes] = useState<DivisaoEstoque[]|null>(null)
  const [editando, setEditando] = useState<DivisaoEstoque|null>(null)
  const [erro, setErro] = useState('')
  const [aberto, setAberto] = useState(lerPainelAberto)
  usarCamadaNoHistorico(editando != null, () => setEditando(null))
  const carregar = useCallback(async () => {
    try { setDivisoes(await api<DivisaoEstoque[]>(`/unified-quotations/${vinculo.id}/stock-allocation`)) }
    catch (e) { setErro(e instanceof ErroApi ? e.message : 'Não foi possível carregar a divisão de estoque.') }
  }, [vinculo.id])
  useEffect(() => { void carregar() }, [carregar])
  const alternar = () => setAberto(atual => {
    try { window.localStorage.setItem(CHAVE_PAINEL_ABERTO, String(!atual)) } catch { /* preferência opcional */ }
    return !atual
  })
  if (!divisoes?.length && !erro) return null
  const farmacias = vinculo.pharmacies
  return <section className="card stock-split">
    <button type="button" className="stock-split-cabecalho" aria-expanded={aberto} onClick={alternar}>
      <Boxes/>
      <span><strong>Estoque dividido entre as farmácias</strong><small>{divisoes?.length ?? 0} {divisoes?.length === 1 ? 'produto em que a distribuidora' : 'produtos em que a distribuidora'} não tem o total pedido</small></span>
      <ChevronDown className="stock-split-seta"/>
    </button>
    {aberto && <>
      {status === 'OPEN'
        ? <p className="stock-split-aviso-status"><Lock/>Enquanto a cotação está aberta, a divisão é automática, proporcional ao pedido de cada farmácia. Ao fechar a cotação, você pode ajustar.</p>
        : <p className="stock-split-aviso-status"><SlidersHorizontal/>Divisão proporcional ao pedido de cada farmácia. Clique em ajustar para priorizar outra loja.</p>}
      {erro && <AvisoErro message={erro}/>}
      <div className="stock-split-planilha" role="region" aria-label="Divisão do estoque por farmácia" tabIndex={0}>
        <table>
          <thead><tr>
            <th scope="col">Produto</th>
            <th scope="col" className="numero">Estoque</th>
            <th scope="col" className="numero">Pedido</th>
            {farmacias.map(farmacia => <th scope="col" className="numero" key={farmacia.companyId} title={farmacia.companyName}>{farmacia.companyName}</th>)}
            {podeEditar && <th scope="col"><span className="sr-only">Ações</span></th>}
          </tr></thead>
          <tbody>{divisoes?.map(divisao => <tr key={`${divisao.responseId}-${divisao.productId}`}>
            <th scope="row"><strong title={divisao.productName}>{divisao.productName}</strong><small>{divisao.supplierName}</small></th>
            <td className="numero">{divisao.availableQuantity}</td>
            <td className="numero">{divisao.requestedQuantity}</td>
            {farmacias.map(farmacia => {
              const parte = divisao.pharmacies.find(item => item.companyId === farmacia.companyId)
              if (!parte) return <td className="numero vazio" key={farmacia.companyId}>-</td>
              return <td className={`numero ${parte.allocatedQuantity < parte.requestedQuantity ? 'parcial' : ''}`} key={farmacia.companyId}
                title={`${farmacia.companyName}: recebe ${parte.allocatedQuantity} de ${parte.requestedQuantity} pedidas`}>
                <strong>{parte.allocatedQuantity}</strong><small>/{parte.requestedQuantity}</small>
              </td>
            })}
            {podeEditar && <td className="acao"><button type="button" className="button button-secondary" onClick={() => { setErro(''); setEditando(divisao) }}
              aria-label={`Ajustar divisão de ${divisao.productName} (${divisao.supplierName})`}><SlidersHorizontal/>Ajustar</button></td>}
          </tr>)}</tbody>
        </table>
      </div>
    </>}
    {editando && <ModalDivisao divisao={editando} unificadaId={vinculo.id} aoFechar={() => setEditando(null)}
      aoSalvar={async atualizadas => { setDivisoes(atualizadas); setEditando(null); await aoAlterar() }}/>}
  </section>
}

/* Mesma regra do backend (CotacaoUnificadaPublicaService.dividirProporcional): parte inteira
   primeiro, sobra do arredondamento para as maiores frações. Serve para o botão de voltar ao
   proporcional e para mostrar a referência ao lado de cada loja. */
function dividirProporcional(total:number, pedidos:number[]):number[] {
  const soma = pedidos.reduce((a, b) => a + b, 0)
  if (soma <= 0 || total <= 0) return pedidos.map(() => 0)
  const base = pedidos.map(p => Math.floor(total * p / soma))
  const restos = pedidos.map((p, i) => ({ i, resto:(total * p) % soma }))
  restos.sort((a, b) => b.resto - a.resto || a.i - b.i)
  let sobra = total - base.reduce((a, b) => a + b, 0)
  for (let k = 0; sobra > 0; k++, sobra--) base[restos[k % restos.length].i]++
  return base
}

function ModalDivisao({ divisao, unificadaId, aoFechar, aoSalvar }:{ divisao:DivisaoEstoque; unificadaId:number; aoFechar:() => void; aoSalvar:(divisoes:DivisaoEstoque[]) => Promise<void> }) {
  const proporcional = dividirProporcional(divisao.availableQuantity, divisao.pharmacies.map(parte => parte.requestedQuantity))
  const [quantidades, setQuantidades] = useState<Record<number, string>>(() => Object.fromEntries(divisao.pharmacies.map(parte => [parte.companyId, String(parte.allocatedQuantity)])))
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const soma = divisao.pharmacies.reduce((total, parte) => total + (Number(quantidades[parte.companyId]) || 0), 0)
  const excede = soma > divisao.availableQuantity
  const restante = divisao.availableQuantity - soma
  const voltarAoProporcional = () => setQuantidades(Object.fromEntries(divisao.pharmacies.map((parte, i) => [parte.companyId, String(proporcional[i])])))
  const salvar = async (event:FormEvent) => {
    event.preventDefault(); if (excede) return
    setOcupado(true); setErro('')
    try {
      const atualizadas = await api<DivisaoEstoque[]>(`/unified-quotations/${unificadaId}/stock-allocation/${divisao.responseId}/items/${divisao.productId}`, { method:'PUT', body:JSON.stringify({
        pharmacies:divisao.pharmacies.map(parte => ({ companyId:parte.companyId, quantity:Number(quantidades[parte.companyId]) || 0 })),
      }) })
      await aoSalvar(atualizadas)
    } catch (e) { setErro(e instanceof ErroApi ? e.message : 'Não foi possível salvar a divisão.') }
    finally { setOcupado(false) }
  }
  return <div className="modal-backdrop"><section className="modal stock-split-modal" role="dialog" aria-modal="true" aria-labelledby="divisao-titulo">
    <div className="modal-header modal-header-simple"><div><h2 id="divisao-titulo">Ajustar divisão do estoque</h2><p>{divisao.productName} · {divisao.supplierName}</p></div><button className="icon-button" aria-label="Fechar" onClick={aoFechar}><X/></button></div>
    <form className="stock-split-form" onSubmit={event => void salvar(event)}>
      <div className="stock-split-resumo">
        <div><span>Estoque da distribuidora</span><strong>{divisao.availableQuantity} un.</strong></div>
        <div><span>Pedido somado das lojas</span><strong>{divisao.requestedQuantity} un.</strong></div>
      </div>
      <div className="stock-split-planilha stock-split-planilha-modal">
        <table>
          <thead><tr><th scope="col">Farmácia</th><th scope="col" className="numero">Pedido</th><th scope="col" className="numero referencia">Proporcional</th><th scope="col" className="numero">Recebe</th></tr></thead>
          <tbody>{divisao.pharmacies.map((parte, i) => {
            const valor = Number(quantidades[parte.companyId]) || 0
            const acima = valor > parte.requestedQuantity
            return <tr key={parte.companyId} className={acima ? 'acima' : ''}>
              <th scope="row"><strong title={parte.companyName}>{parte.companyName}</strong>{acima && <small className="stock-split-aviso">Acima do pedido</small>}</th>
              <td className="numero">{parte.requestedQuantity}</td>
              <td className="numero referencia">{proporcional[i]}</td>
              <td className="numero celula-input"><input type="number" min={0} step={1} inputMode="numeric" value={quantidades[parte.companyId] ?? ''}
                aria-label={`Quantidade para ${parte.companyName}`}
                onChange={event => setQuantidades(atuais => ({ ...atuais, [parte.companyId]:event.target.value }))}/></td>
            </tr>
          })}</tbody>
        </table>
      </div>
      <div className={`stock-split-total ${excede ? 'excede' : restante > 0 ? 'sobra' : 'ok'}`} role="status">
        <span>Distribuído <strong>{soma}</strong> de {divisao.availableQuantity} un.</span>
        <span>{excede ? `${-restante} un. acima do estoque` : restante > 0 ? `${restante} un. sem destino` : 'Estoque todo distribuído'}</span>
      </div>
      <button type="button" className="text-link stock-split-reset" onClick={voltarAoProporcional}>Voltar à divisão proporcional</button>
      {erro && <div className="stock-split-erro"><AvisoErro message={erro}/></div>}
      <p className="stock-split-nota">Pedidos já gerados que mudarem ficam desatualizados. Se o representante corrigir a proposta, a divisão volta a ser proporcional.</p>
      <div className="modal-actions"><button type="button" className="button button-ghost" onClick={aoFechar}>Cancelar</button><button className="button button-primary" disabled={ocupado || excede}>{ocupado ? 'Salvando...' : 'Salvar divisão'}</button></div>
    </form>
  </section></div>
}
