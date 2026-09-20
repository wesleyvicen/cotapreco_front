import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { AnaliseArquivoImportacao, MapeamentoColunas } from '../../types'

type CampoMapeamento = keyof MapeamentoColunas
const PERGUNTAS:Record<CampoMapeamento,string> = {
  ean:'Qual coluna corresponde ao código de barras?',
  productName:'Qual coluna tem o nome do produto?',
  quantity:'Qual coluna corresponde à quantidade?',
  laboratory:'Qual coluna tem o laboratório?',
}

/* Só aparece quando o CotaPreço não conseguiu reconhecer alguma coluna sozinho, e pergunta
   apenas o que ficou em dúvida - nunca o mapeamento inteiro. */
export default function OnboardingMapeamento({ analise, campos, mapeamento, aoAlterar, aoContinuar, aoVoltar, ocupado }:{
  analise:AnaliseArquivoImportacao; campos:CampoMapeamento[]; mapeamento:MapeamentoColunas
  aoAlterar:(campo:CampoMapeamento, indice:number|null)=>void; aoContinuar:()=>void; aoVoltar:()=>void; ocupado:boolean
}) {
  const obrigatorio = (campo:CampoMapeamento) => campo === 'productName' || campo === 'quantity'
  const faltaResponder = campos.some(campo => obrigatorio(campo) && mapeamento[campo] === null)
  const escolhidas = Object.values(mapeamento).filter((valor):valor is number => valor !== null)
  const repetidas = new Set(escolhidas).size !== escolhidas.length
  return <div>
    <div className="wizard-heading"><span>Passo 3 de 5</span><h2>Precisamos de uma pequena ajuda</h2><p>Sua planilha usa nomes diferentes dos que conhecemos. Diga o que é cada coluna e seguimos daqui.</p></div>
    <div className="onboarding-mapeamento">
      {campos.map(campo => <label key={campo}>{PERGUNTAS[campo]} {obrigatorio(campo) ? <small>Obrigatório</small> : <small>Opcional</small>}
        <select value={mapeamento[campo] ?? ''} onChange={evento => aoAlterar(campo, evento.target.value === '' ? null : Number(evento.target.value))}>
          <option value="">{obrigatorio(campo) ? 'Selecione uma coluna' : 'Minha planilha não tem'}</option>
          {analise.columns.map(coluna => <option key={coluna.index} value={coluna.index}>{coluna.name}</option>)}
        </select>
      </label>)}
    </div>
    <div className="source-preview"><strong>Primeiras linhas do seu arquivo</strong>
      <div className="table-wrap"><table><thead><tr>{analise.columns.map(coluna => <th key={coluna.index}>{coluna.name}</th>)}</tr></thead>
        <tbody>{analise.sampleRows.map((linha, indice) => <tr key={indice}>{analise.columns.map(coluna => <td key={coluna.index}>{linha[coluna.index] || <span className="muted">-</span>}</td>)}</tr>)}</tbody>
      </table></div>
    </div>
    {repetidas && <small className="mapping-error">A mesma coluna não pode responder a duas perguntas.</small>}
    <div className="onboarding-actions">
      <button type="button" className="button button-ghost" disabled={ocupado} onClick={aoVoltar}><ArrowLeft/>Trocar arquivo</button>
      <button type="button" className="button button-primary" disabled={ocupado || faltaResponder || repetidas} onClick={aoContinuar}>{ocupado ? 'Conferindo...' : 'Continuar'} <ArrowRight/></button>
    </div>
  </div>
}
