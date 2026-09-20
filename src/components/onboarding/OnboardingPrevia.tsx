import { AlertTriangle, ArrowLeft, ArrowRight, PartyPopper } from 'lucide-react'
import type { PreviaImportacao } from '../../types'

const LINHAS_NA_PREVIA = 8

/* A prévia mostra o suficiente para a pessoa reconhecer o próprio pedido: as primeiras linhas
   e, quando há, o que precisa de atenção. Trezentos produtos na tela não ajudariam a conferir. */
export default function OnboardingPrevia({ previa, aoContinuar, aoCorrigir, aoVoltar, ocupado }:{
  previa:PreviaImportacao; aoContinuar:()=>void; aoCorrigir:()=>void; aoVoltar:()=>void; ocupado:boolean
}) {
  const validas = previa.lines.filter(linha => linha.valid)
  const comProblema = previa.lines.filter(linha => !linha.valid)
  const amostra = (comProblema.length ? comProblema : validas).slice(0, LINHAS_NA_PREVIA)
  return <div>
    <div className="wizard-heading"><span>Passo 4 de 5</span>
      <h2>Encontramos {previa.validRows} {previa.validRows === 1 ? 'produto' : 'produtos'} no seu pedido <PartyPopper/></h2>
      <p>Dê uma olhada rápida e siga em frente.</p>
    </div>
    <div className="onboarding-resumo">
      <div><strong>{previa.validRows}</strong><span>{previa.validRows === 1 ? 'produto identificado' : 'produtos identificados'}</span></div>
      {previa.invalidRows > 0 && <div className="danger"><strong>{previa.invalidRows}</strong><span>{previa.invalidRows === 1 ? 'produto precisa de atenção' : 'produtos precisam de atenção'}</span></div>}
    </div>
    <div className="table-wrap onboarding-previa-tabela"><table>
      <thead><tr><th>Produto</th><th>EAN</th><th>Quantidade</th></tr></thead>
      <tbody>{amostra.map(linha => <tr key={linha.row} className={linha.valid ? '' : 'invalid-row'}>
        <td><strong>{linha.productName || 'Sem nome'}</strong>{linha.errors.map(erro => <small className="field-error" key={erro}>{erro}</small>)}</td>
        <td>{linha.ean ? <code>{linha.ean}</code> : <span className="muted">Sem EAN</span>}</td>
        <td>{linha.quantity ?? '-'}</td>
      </tr>)}</tbody>
    </table></div>
    {previa.lines.length > amostra.length && <small className="muted">E mais {previa.lines.length - amostra.length} {previa.lines.length - amostra.length === 1 ? 'produto' : 'produtos'} no seu pedido.</small>}
    {previa.invalidRows > 0 && <div className="alert alert-warning"><AlertTriangle/>Dá para seguir com os {previa.validRows} produtos que ficaram prontos. Se preferir ajustar tudo agora, abrimos a tela completa de cotação.</div>}
    <div className="onboarding-actions">
      <button type="button" className="button button-ghost" disabled={ocupado} onClick={aoVoltar}><ArrowLeft/>Trocar planilha</button>
      {/* Um pedido com poucas linhas problemáticas não pode travar a primeira cotação: quem
          quiser corrigir tudo tem o caminho ao lado, quem quiser seguir segue. */}
      {previa.invalidRows > 0 && <button type="button" className="button button-secondary" disabled={ocupado} onClick={aoCorrigir}>Quero corrigir agora</button>}
      <button type="button" className="button button-primary" disabled={ocupado || previa.validRows === 0} onClick={aoContinuar}>
        {previa.invalidRows > 0 ? `Seguir com ${previa.validRows} ${previa.validRows === 1 ? 'produto' : 'produtos'}` : 'Está tudo certo'} <ArrowRight/>
      </button>
    </div>
  </div>
}
