import { ArrowRight, ChevronLeft, ChevronRight, ClipboardPaste, TableProperties, X } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import {
  CAMPOS_COLADOS, contarLinhasColuna, montarLinhasColadas, moverColuna,
  type CampoColuna, type ColunasColadas, type LinhaColada,
} from '../lib/colunasColadas'
import { AvisoErro } from './ComponentesUI'

export default function ModalColarColunas({ colunas, setColunas, ignorarCabecalho, setIgnorarCabecalho, erro, ocupado, aoFechar, aoRevisar }:{
  colunas:ColunasColadas; setColunas:(colunas:ColunasColadas) => void
  ignorarCabecalho:boolean; setIgnorarCabecalho:(valor:boolean) => void
  erro:string; ocupado:boolean; aoFechar:() => void; aoRevisar:(linhas:LinhaColada[]) => void
}) {
  useEffect(() => {
    const fecharComEscape = (evento:KeyboardEvent) => { if (evento.key === 'Escape') aoFechar() }
    document.addEventListener('keydown', fecharComEscape)
    return () => document.removeEventListener('keydown', fecharComEscape)
  }, [aoFechar])

  const contagens = useMemo(() => {
    const mapa = {} as Record<CampoColuna, number>
    for (const { campo } of CAMPOS_COLADOS) mapa[campo] = contarLinhasColuna(colunas[campo], ignorarCabecalho)
    return mapa
  }, [colunas, ignorarCabecalho])

  const linhas = useMemo(() => montarLinhasColadas(colunas, ignorarCabecalho), [colunas, ignorarCabecalho])
  /* Colunas com tamanhos diferentes viram produto com a quantidade do vizinho: o alinhamento
     é o único erro que a revisão do servidor não consegue enxergar sozinha. */
  const preenchidas = CAMPOS_COLADOS.filter(({ campo }) => contagens[campo] > 0)
  const desalinhadas = new Set(preenchidas.map(({ campo }) => contagens[campo])).size > 1
  const comTabulacao = CAMPOS_COLADOS.filter(({ campo }) => colunas[campo].includes('\t')).map(({ rotulo }) => rotulo)
  const faltamObrigatorias = CAMPOS_COLADOS.filter(({ campo, obrigatorio }) => obrigatorio && contagens[campo] === 0).map(({ rotulo }) => rotulo)
  const podeRevisar = linhas.length > 0 && faltamObrigatorias.length === 0

  return <div className="modal-backdrop">
    <div className="modal colar-modal" role="dialog" aria-modal="true" aria-labelledby="colar-titulo">
      <div className="modal-header">
        <div className="modal-icon"><ClipboardPaste/></div>
        <div><h2 id="colar-titulo">Colar de uma planilha</h2><p>Copie uma coluna por vez na sua planilha e cole no campo correspondente. A ordem das linhas é o que liga um campo ao outro.</p></div>
        <button type="button" className="icon-button" title="Fechar" aria-label="Fechar" onClick={aoFechar}><X/></button>
      </div>

      <div className="colar-corpo">
        <div className="colar-grid">{CAMPOS_COLADOS.map(({ campo, rotulo, obrigatorio, exemplo }, indice) => {
          const anterior = CAMPOS_COLADOS[indice - 1]
          const proximo = CAMPOS_COLADOS[indice + 1]
          return <div key={campo} className="colar-campo">
            <div className="colar-campo-topo">
              <label htmlFor={`colar-${campo}`}>{rotulo} <small>{obrigatorio ? 'Obrigatório' : 'Opcional'}</small></label>
              <div className="colar-mover">
                <button type="button" disabled={!anterior} title={anterior && `Trocar o conteúdo de ${rotulo} com ${anterior.rotulo}`}
                  aria-label={`Mover o conteúdo de ${rotulo} para a esquerda`}
                  onClick={() => setColunas(moverColuna(colunas, campo, -1))}><ChevronLeft/></button>
                <button type="button" disabled={!proximo} title={proximo && `Trocar o conteúdo de ${rotulo} com ${proximo.rotulo}`}
                  aria-label={`Mover o conteúdo de ${rotulo} para a direita`}
                  onClick={() => setColunas(moverColuna(colunas, campo, 1))}><ChevronRight/></button>
              </div>
            </div>
            <textarea id={`colar-${campo}`} rows={8} spellCheck={false} placeholder={exemplo} value={colunas[campo]}
              onChange={evento => setColunas({ ...colunas, [campo]:evento.target.value })}/>
            <small className={`colar-campo-contagem ${contagens[campo] && desalinhadas ? 'alerta' : ''}`}>
              {contagens[campo] === 1 ? '1 linha' : `${contagens[campo]} linhas`}
            </small>
          </div>
        })}</div>

        <label className="colar-cabecalho">
          <input type="checkbox" checked={ignorarCabecalho} onChange={evento => setIgnorarCabecalho(evento.target.checked)}/>
          Ignorar a primeira linha de cada coluna (cabeçalho copiado junto)
        </label>

        {erro && <AvisoErro message={erro}/>}
        {comTabulacao.length > 0 && <div className="alert alert-warning">Parece que mais de uma coluna foi colada em {comTabulacao.join(' e ')}. Cole uma coluna de cada vez para os campos não se misturarem.</div>}
        {desalinhadas && <div className="alert alert-warning">As colunas coladas têm quantidades de linhas diferentes. Confira se alguma seleção pegou linhas a mais ou a menos antes de continuar.</div>}
        {faltamObrigatorias.length > 0 && linhas.length > 0 && <div className="alert alert-warning">Cole também {faltamObrigatorias.join(' e ').toLowerCase()} — sem esses campos a cotação não pode ser criada.</div>}

        {linhas.length > 0 && <div className="colar-previa">
          <div className="section-caption"><TableProperties/><div><strong>Como ficou o alinhamento</strong><span>{linhas.length === 1 ? '1 produto capturado' : `${linhas.length} produtos capturados`}. Veja se cada linha juntou os dados certos.</span></div></div>
          <div className="table-wrap"><table><thead><tr><th>#</th><th>EAN</th><th>Produto</th><th>Laboratório</th><th>Qtd.</th></tr></thead><tbody>
            {linhas.slice(0, 5).map((linha, indice) => <tr key={indice}>
              <td>{indice + 1}</td>
              <td>{linha.ean ? <code>{linha.ean}</code> : <span className="muted">—</span>}</td>
              <td>{linha.productName || <span className="muted">Sem nome</span>}</td>
              <td>{linha.laboratory || <span className="muted">—</span>}</td>
              <td>{linha.quantity || <span className="muted">—</span>}</td>
            </tr>)}
          </tbody></table></div>
          {linhas.length > 5 && <small className="colar-previa-resto">e mais {linhas.length - 5} {linhas.length - 5 === 1 ? 'produto' : 'produtos'} abaixo.</small>}
        </div>}
      </div>

      <div className="modal-actions">
        <button type="button" className="button button-ghost" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="button button-primary" disabled={!podeRevisar || ocupado} onClick={() => aoRevisar(linhas)}>
          {ocupado ? 'Conferindo...' : 'Revisar produtos'} <ArrowRight/>
        </button>
      </div>
    </div>
  </div>
}
