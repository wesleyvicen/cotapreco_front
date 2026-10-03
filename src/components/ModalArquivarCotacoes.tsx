import { Archive, ArchiveRestore } from 'lucide-react'
import { usarCamadaNoHistorico } from '../hooks/usarCamadaNoHistorico'
import type { ResumoCotacao } from '../types'
import { AvisoErro } from './ComponentesUI'

/* Confirmação de arquivar/desarquivar uma ou várias cotações. Diz antes o que muda de
   verdade: aberta fecha o link, cotação com pedido continua com os pedidos, e tudo sai dos
   números - para ninguém arquivar sem saber e depois estranhar a economia do painel. */
export default function ModalArquivarCotacoes({ cotacoes, arquivar, ocupado, erro, aoFechar, aoConfirmar }:{
  cotacoes:ResumoCotacao[]; arquivar:boolean; ocupado:boolean; erro:string; aoFechar:()=>void; aoConfirmar:()=>void
}) {
  usarCamadaNoHistorico(true, aoFechar)
  const total = cotacoes.length
  const uma = total === 1
  const abertas = cotacoes.filter(c => c.status === 'OPEN' && !c.unified).length
  const unificadasAbertas = cotacoes.filter(c => c.status === 'OPEN' && c.unified).length
  const comPedido = cotacoes.filter(c => c.purchasedItemCount > 0)
  const itensComprados = comPedido.reduce((t, c) => t + c.purchasedItemCount, 0)
  const nome = uma ? `"${cotacoes[0].name}"` : `${total} cotações`

  return <div className="modal-backdrop" role="presentation" onClick={e => { if (e.target === e.currentTarget && !ocupado) aoFechar() }}>
    <div className="modal arquivar-modal" role="dialog" aria-modal="true" aria-labelledby="arquivar-titulo">
      <div className="modal-header"><div className="modal-icon">{arquivar ? <Archive/> : <ArchiveRestore/>}</div>
        <div><h2 id="arquivar-titulo">{arquivar ? `Arquivar ${nome}?` : `Desarquivar ${nome}?`}</h2>
          <p>{arquivar ? 'Nada é apagado. Dá para desarquivar quando quiser.' : `${uma ? 'Ela volta' : 'Elas voltam'} para a lista e para os números do painel.`}</p></div>
        <button type="button" className="icon-button" aria-label="Fechar" disabled={ocupado} onClick={aoFechar}>×</button></div>

      {erro && <AvisoErro message={erro}/>}

      {arquivar ? <ul className="arquivar-efeitos">
        <li>{uma ? 'Sai' : 'Saem'} da lista de cotações. Para ver de novo, use o filtro <strong>Arquivadas</strong>.</li>
        <li>{uma ? 'Deixa' : 'Deixam'} de contar no painel, na economia estimada e no comparativo de compras.</li>
        {abertas > 0 && <li className="arquivar-atencao"><strong>{abertas === 1 ? (uma ? 'Ela está aberta' : '1 está aberta') : `${abertas} estão abertas`}:</strong> o link é fechado e os representantes não conseguem mais enviar propostas.</li>}
        {comPedido.length > 0 && <li className="arquivar-atencao"><strong>{comPedido.length === 1 ? (uma ? 'Ela tem pedido gerado' : '1 tem pedido gerado') : `${comPedido.length} têm pedidos gerados`}</strong> ({itensComprados} {itensComprados === 1 ? 'item' : 'itens'}). Os pedidos continuam acessíveis dentro da cotação.</li>}
        {unificadasAbertas > 0 && <li className="arquivar-atencao"><strong>{unificadasAbertas === 1 ? '1 faz parte' : `${unificadasAbertas} fazem parte`} de uma cotação unificada aberta</strong> e não {unificadasAbertas === 1 ? 'será arquivada' : 'serão arquivadas'}: feche a unificada antes, para não fechar o link das outras farmácias.</li>}
      </ul> : <ul className="arquivar-efeitos">
        <li>Quem estava aberta antes de arquivar continua fechada. Para receber propostas de novo, abra a cotação pela tela dela.</li>
      </ul>}

      <div className="modal-actions">
        <button type="button" className="button button-ghost" disabled={ocupado} onClick={aoFechar}>Cancelar</button>
        <button type="button" className="button button-primary" disabled={ocupado} onClick={aoConfirmar} autoFocus>
          {ocupado ? (arquivar ? 'Arquivando...' : 'Desarquivando...') : arquivar ? `Arquivar${uma ? '' : ` ${total}`}` : `Desarquivar${uma ? '' : ` ${total}`}`}
        </button>
      </div>
    </div>
  </div>
}
