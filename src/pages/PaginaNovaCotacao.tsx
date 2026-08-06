import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, Clipboard, Columns3, Download,
  FileSpreadsheet, Link2, PenLine, Plus, TableProperties, Trash2, UploadCloud, XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { api, apiArquivo, ErroApi } from '../api'
import { AvisoErro } from '../components/ComponentesUI'
import type {
  AnaliseArquivoImportacao, Cotacao, MapeamentoColunas, PreviaImportacao, Produto,
} from '../types'
import { LinkInterno, usarNavegacao } from '../roteamento'

function dataHoraLocal(data = new Date()) {
  const doisDigitos = (valor:number) => String(valor).padStart(2, '0')
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}T${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}`
}

type ModoProdutos = 'planilha' | 'manual'
type CampoMapeamento = keyof MapeamentoColunas
interface ItemManual { id:string; ean:string; productName:string; quantity:string; laboratory:string }

const novoItemManual = ():ItemManual => ({ id:crypto.randomUUID(), ean:'', productName:'', quantity:'', laboratory:'' })
const normalizar = (valor:string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ')

export default function PaginaNovaCotacao() {
  const navegar = usarNavegacao()
  const [etapa, setEtapa] = useState(1)
  const [nome, setNome] = useState('')
  const [prazo, setPrazo] = useState('')
  const [modo, setModo] = useState<ModoProdutos>('planilha')
  const [arquivo, setArquivo] = useState<File|null>(null)
  const [analise, setAnalise] = useState<AnaliseArquivoImportacao|null>(null)
  const [mapeamento, setMapeamento] = useState<MapeamentoColunas>({ ean:null, productName:null, quantity:null, laboratory:null })
  const [itensManuais, setItensManuais] = useState<ItemManual[]>([novoItemManual()])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [previa, setPrevia] = useState<PreviaImportacao|null>(null)
  const [cotacao, setCotacao] = useState<Cotacao|null>(null)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [copiado, setCopiado] = useState('')

  useEffect(() => {
    api<Produto[]>('/products').then(setProdutos).catch(() => undefined)
  }, [])

  const colunasRepetidas = useMemo(() => {
    const escolhidas = Object.values(mapeamento).filter((valor):valor is number => valor !== null)
    return new Set(escolhidas).size !== escolhidas.length
  }, [mapeamento])

  const analisarArquivo = async (selecionado:File) => {
    setErro(''); setOcupado(true); setArquivo(selecionado); setAnalise(null); setPrevia(null)
    const corpo = new FormData(); corpo.append('file', selecionado)
    try {
      const resultado = await api<AnaliseArquivoImportacao>('/quotations/import/analyze', { method:'POST', body:corpo })
      setAnalise(resultado); setMapeamento(resultado.suggestedMapping)
    } catch (e) {
      setArquivo(null); setErro(e instanceof ErroApi ? e.message : 'Falha ao analisar o arquivo.')
    } finally { setOcupado(false) }
  }

  const gerarPreviaPlanilha = async () => {
    if (!arquivo || mapeamento.productName === null || mapeamento.quantity === null) {
      setErro('Selecione as colunas de produto e quantidade.'); return
    }
    if (colunasRepetidas) { setErro('Cada campo deve usar uma coluna diferente.'); return }
    setErro(''); setOcupado(true)
    const corpo = new FormData(); corpo.append('file', arquivo)
    corpo.append('mapping', new Blob([JSON.stringify(mapeamento)], { type:'application/json' }), 'mapping.json')
    try {
      setPrevia(await api<PreviaImportacao>('/quotations/import/preview', { method:'POST', body:corpo })); setEtapa(3)
    } catch (e) { setErro(e instanceof ErroApi ? e.message : 'Falha ao conferir os produtos.') }
    finally { setOcupado(false) }
  }

  const gerarPreviaManual = async () => {
    setErro(''); setOcupado(true)
    try {
      const items = itensManuais.map((item, index) => ({
        row:index + 1, ean:item.ean, productName:item.productName, quantity:item.quantity, laboratory:item.laboratory,
      }))
      setPrevia(await api<PreviaImportacao>('/quotations/items/preview', { method:'POST', body:JSON.stringify({ items }) })); setEtapa(3)
    } catch (e) { setErro(e instanceof ErroApi ? e.message : 'Falha ao conferir os produtos.') }
    finally { setOcupado(false) }
  }

  const baixarModelo = async () => {
    setErro(''); setOcupado(true)
    try {
      const blob = await apiArquivo('/quotations/import/template')
      const url = URL.createObjectURL(blob); const link = document.createElement('a')
      link.href = url; link.download = 'modelo-cotacao-cotapreco.xlsx'; link.click(); URL.revokeObjectURL(url)
    } catch (e) { setErro(e instanceof ErroApi ? e.message : 'Não foi possível baixar o modelo Excel.') }
    finally { setOcupado(false) }
  }

  const alterarItemManual = (id:string, campo:keyof Omit<ItemManual, 'id'>, valor:string) => {
    setItensManuais(atuais => atuais.map(item => {
      if (item.id !== id) return item
      const alterado = { ...item, [campo]:valor }
      if (campo === 'ean') {
        const encontrado = produtos.find(produto => produto.ean === valor.replace(/\D/g, ''))
        if (encontrado) return { ...alterado, ean:encontrado.ean ?? '', productName:encontrado.name, laboratory:encontrado.laboratory ?? '' }
      }
      if (campo === 'productName') {
        const encontrados = produtos.filter(produto => normalizar(produto.name) === normalizar(valor))
        if (encontrados.length === 1) return { ...alterado, ean:encontrados[0].ean ?? '', productName:encontrados[0].name, laboratory:encontrados[0].laboratory ?? '' }
      }
      return alterado
    }))
  }

  const criar = async () => {
    if (!previa || previa.invalidRows > 0) return
    setOcupado(true); setErro('')
    try {
      const rascunho = await api<Cotacao>('/quotations', { method:'POST', body:JSON.stringify({
        name:nome, expiresAt:prazo ? new Date(prazo).toISOString() : null,
        items:previa.lines.filter(linha => linha.valid).map(linha => ({
          ean:linha.ean, productName:linha.productName, quantity:linha.quantity, laboratory:linha.laboratory,
        })),
      }) })
      setCotacao(await api<Cotacao>(`/quotations/${rascunho.id}/open`, { method:'POST' })); setEtapa(5)
    } catch (e) { setErro(e instanceof ErroApi ? e.message : 'Não foi possível criar a cotação.') }
    finally { setOcupado(false) }
  }

  const copiar = async (valor:string, tipo:string) => {
    await navigator.clipboard.writeText(valor); setCopiado(tipo); setTimeout(() => setCopiado(''), 1800)
  }
  const mensagem = cotacao?.publicUrl ? `Olá! Estamos realizando uma nova cotação.\nVocê pode enviar seus preços através do link abaixo:\n${cotacao.publicUrl}\nObrigado!` : ''
  const voltarProdutos = () => { setErro(''); setEtapa(2) }

  return <div className="page narrow">
    <div className="back-row"><LinkInterno to="/cotacoes" className="text-link"><ArrowLeft/>Voltar para cotações</LinkInterno></div>
    <div className="page-header"><div><span className="eyebrow green">Novo processo</span><h1>Nova cotação</h1><p>Em poucos passos, sua cotação estará pronta para compartilhar.</p></div></div>
    <div className="stepper">{['Informações', 'Produtos', 'Revisão', 'Criação', 'Compartilhar'].map((rotulo, indice) => {
      const numero = indice + 1
      return <div key={rotulo} className={`step ${etapa === numero ? 'active' : ''} ${etapa > numero ? 'done' : ''}`}><span>{etapa > numero ? <Check size={16}/> : numero}</span><label>{rotulo}</label></div>
    })}</div>
    {erro && <AvisoErro message={erro}/>}<section className="card wizard-card">
      {etapa === 1 && <form onSubmit={(event:FormEvent) => { event.preventDefault(); setErro(''); setEtapa(2) }}>
        <div className="wizard-heading"><span>Etapa 1 de 5</span><h2>Vamos identificar esta cotação</h2><p>Use um nome fácil de reconhecer no painel.</p></div>
        <div className="form-grid">
          <label className="full">Nome da cotação<input autoFocus required maxLength={180} placeholder="Ex.: Reposição primeira quinzena" value={nome} onChange={event => setNome(event.target.value)}/></label>
          <label className="full">Prazo para respostas <small>Opcional</small><input type="datetime-local" value={prazo} min={dataHoraLocal()} onChange={event => setPrazo(event.target.value)}/></label>
        </div>
        <div className="wizard-actions"><span/><button className="button button-primary">Continuar <ArrowRight/></button></div>
      </form>}

      {etapa === 2 && <div>
        <div className="wizard-heading"><span>Etapa 2 de 5</span><h2>Adicione os produtos</h2><p>Importe uma planilha pronta ou preencha os itens diretamente no sistema.</p></div>
        <div className="product-source-actions">
          <button type="button" className={`source-card ${modo === 'planilha' ? 'selected' : ''}`} onClick={() => { setModo('planilha'); setErro('') }}><FileSpreadsheet/><span><strong>Importar planilha</strong><small>CSV ou XLSX, com conferência das colunas</small></span></button>
          <button type="button" className={`source-card ${modo === 'manual' ? 'selected' : ''}`} onClick={() => { setModo('manual'); setErro('') }}><PenLine/><span><strong>Preencher manualmente</strong><small>Adicione e pesquise produtos linha por linha</small></span></button>
          <button type="button" className="source-card template" disabled={ocupado} onClick={() => void baixarModelo()}><Download/><span><strong>Baixar modelo Excel</strong><small>Arquivo vazio com os cabeçalhos corretos</small></span></button>
        </div>

        {modo === 'planilha' && <div className="product-source-panel">
          {!analise && <label className={`dropzone ${ocupado ? 'disabled' : ''}`}><UploadCloud/><strong>{ocupado ? 'Analisando planilha...' : 'Arraste ou selecione uma planilha'}</strong><span>Arquivos CSV ou XLSX de até 10 MB</span><input type="file" accept=".csv,.xlsx" disabled={ocupado} onChange={event => { const selecionado = event.target.files?.[0]; if (selecionado) void analisarArquivo(selecionado); event.currentTarget.value = '' }}/></label>}
          {analise && arquivo && <>
            <div className="file-loaded"><FileSpreadsheet/><div><strong>{arquivo.name}</strong><span>Aba {analise.sheetName} · {analise.totalRows} linhas encontradas</span></div><label className="button button-ghost">Trocar arquivo<input type="file" accept=".csv,.xlsx" onChange={event => { const selecionado = event.target.files?.[0]; if (selecionado) void analisarArquivo(selecionado); event.currentTarget.value = '' }}/></label></div>
            <div className="mapping-panel"><div className="section-caption"><Columns3/><div><strong>Confirme as colunas</strong><span>Você pode corrigir o mapeamento sugerido antes da validação.</span></div></div>
              <div className="mapping-grid">
                <SeletorColuna campo="ean" rotulo="EAN" obrigatorio={false} analise={analise} mapeamento={mapeamento} setMapeamento={setMapeamento}/>
                <SeletorColuna campo="productName" rotulo="Produto" obrigatorio analise={analise} mapeamento={mapeamento} setMapeamento={setMapeamento}/>
                <SeletorColuna campo="quantity" rotulo="Quantidade" obrigatorio analise={analise} mapeamento={mapeamento} setMapeamento={setMapeamento}/>
                <SeletorColuna campo="laboratory" rotulo="Laboratório" obrigatorio={false} analise={analise} mapeamento={mapeamento} setMapeamento={setMapeamento}/>
              </div>
              {colunasRepetidas && <small className="mapping-error">A mesma coluna não pode ser usada em dois campos.</small>}
            </div>
            <div className="source-preview"><div className="section-caption"><TableProperties/><div><strong>Prévia original do arquivo</strong><span>As colunas não escolhidas serão ignoradas.</span></div></div><div className="table-wrap"><table><thead><tr>{analise.columns.map(coluna => <th key={coluna.index}>{coluna.name}</th>)}</tr></thead><tbody>{analise.sampleRows.map((linha, indice) => <tr key={indice}>{analise.columns.map(coluna => <td key={coluna.index}>{linha[coluna.index] || <span className="muted">—</span>}</td>)}</tr>)}</tbody></table></div></div>
          </>}
        </div>}

        {modo === 'manual' && <div className="product-source-panel manual-panel">
          <datalist id="produtos-nomes">{produtos.map(produto => <option key={produto.id} value={produto.name}>{produto.ean ? `EAN ${produto.ean}` : 'Sem EAN'}</option>)}</datalist>
          <datalist id="produtos-eans">{produtos.filter(produto => produto.ean).map(produto => <option key={produto.id} value={produto.ean ?? ''}>{produto.name}</option>)}</datalist>
          <div className="manual-header"><div><strong>Produtos da cotação</strong><span>EAN e laboratório são opcionais. Produtos já cadastrados completam os dados automaticamente.</span></div><button type="button" className="button button-secondary" onClick={() => setItensManuais(atuais => [...atuais, novoItemManual()])}><Plus/>Adicionar produto</button></div>
          <div className="manual-items">{itensManuais.map((item, index) => <div className="manual-item" key={item.id}><span className="manual-number">{index + 1}</span><div className="manual-product-fields">
            <label>EAN <small>Opcional</small><input list="produtos-eans" inputMode="numeric" maxLength={14} placeholder="789..." value={item.ean} onChange={event => alterarItemManual(item.id, 'ean', event.target.value.replace(/\D/g, ''))}/></label>
            <label className="manual-name">Produto<input list="produtos-nomes" required maxLength={240} placeholder="Nome ou descrição do produto" value={item.productName} onChange={event => alterarItemManual(item.id, 'productName', event.target.value)}/></label>
            <label>Quantidade<input required type="number" min="1" step="1" placeholder="0" value={item.quantity} onChange={event => alterarItemManual(item.id, 'quantity', event.target.value)}/></label>
            <label>Laboratório <small>Opcional</small><input maxLength={160} placeholder="Fabricante" value={item.laboratory} onChange={event => alterarItemManual(item.id, 'laboratory', event.target.value)}/></label>
          </div><button type="button" className="icon-button remove-manual" title="Remover produto" aria-label={`Remover produto ${index + 1}`} disabled={itensManuais.length === 1} onClick={() => setItensManuais(atuais => atuais.filter(atual => atual.id !== item.id))}><Trash2/></button></div>)}</div>
          <button type="button" className="button button-ghost add-manual-bottom" onClick={() => setItensManuais(atuais => [...atuais, novoItemManual()])}><Plus/>Adicionar outra linha</button>
        </div>}

        <div className="wizard-actions"><button className="button button-ghost" onClick={() => setEtapa(1)}><ArrowLeft/>Voltar</button><button className="button button-primary" disabled={ocupado || (modo === 'planilha' && (!analise || colunasRepetidas || mapeamento.productName === null || mapeamento.quantity === null))} onClick={() => void (modo === 'planilha' ? gerarPreviaPlanilha() : gerarPreviaManual())}>{ocupado ? 'Conferindo...' : 'Conferir produtos'} <ArrowRight/></button></div>
      </div>}

      {etapa === 3 && previa && <div><div className="wizard-heading"><span>Etapa 3 de 5</span><h2>Revise os produtos</h2><p>Nenhum produto ou cotação foi salvo até aqui.</p></div><div className="import-summary"><div><CheckCircle2/><strong>{previa.validRows}</strong><span>linhas válidas</span></div><div className={previa.invalidRows ? 'danger' : ''}><XCircle/><strong>{previa.invalidRows}</strong><span>com problema</span></div><div><Clipboard/><strong>{previa.lines.filter(linha => !linha.productExists && linha.valid).length}</strong><span>novos produtos</span></div></div><div className="table-wrap import-table"><table><thead><tr><th>Linha</th><th>EAN</th><th>Produto</th><th>Laboratório</th><th>Qtd.</th><th>Cadastro</th></tr></thead><tbody>{previa.lines.map(linha => <tr key={linha.row} className={!linha.valid ? 'invalid-row' : ''}><td>{linha.row}</td><td>{linha.ean ? <code>{linha.ean}</code> : <span className="muted">Sem EAN</span>}</td><td><strong>{linha.productName || 'Sem nome'}</strong>{linha.errors.map(mensagemErro => <small className="field-error" key={mensagemErro}>{mensagemErro}</small>)}</td><td>{linha.laboratory || <span className="muted">—</span>}</td><td>{linha.quantity ?? '—'}</td><td>{linha.valid ? <span className={`mini-tag ${linha.productExists ? '' : 'new'}`}>{linha.productExists ? 'Encontrado' : 'Será cadastrado'}</span> : <span className="mini-tag error">Corrigir</span>}</td></tr>)}</tbody></table></div>{previa.invalidRows > 0 && <div className="alert alert-warning">Corrija os itens destacados e faça a conferência novamente.</div>}<div className="wizard-actions"><button className="button button-ghost" onClick={voltarProdutos}><ArrowLeft/>Corrigir produtos</button><button className="button button-primary" disabled={previa.invalidRows > 0} onClick={() => setEtapa(4)}>Revisar criação <ArrowRight/></button></div></div>}

      {etapa === 4 && previa && <div><div className="wizard-heading"><span>Etapa 4 de 5</span><h2>Tudo pronto para abrir</h2><p>Ao confirmar, produtos novos serão cadastrados e o link público será gerado.</p></div><div className="review-box"><div><span>Nome</span><strong>{nome}</strong></div><div><span>Prazo</span><strong>{prazo ? new Date(prazo).toLocaleString('pt-BR') : 'Sem prazo definido'}</strong></div><div><span>Produtos</span><strong>{previa.validRows} itens</strong></div><div><span>Novos cadastros</span><strong>{previa.lines.filter(linha => !linha.productExists).length} produtos</strong></div></div><div className="wizard-actions"><button className="button button-ghost" onClick={() => setEtapa(3)}><ArrowLeft/>Voltar</button><button className="button button-primary" disabled={ocupado} onClick={() => void criar()}>{ocupado ? 'Criando...' : 'Criar e abrir cotação'} <Check/></button></div></div>}

      {etapa === 5 && cotacao?.publicUrl && <div className="share-success"><div className="success-icon"><CheckCircle2/></div><span className="eyebrow green">Cotação aberta</span><h2>Agora é só compartilhar!</h2><p>Envie este link para os representantes. Eles entram ou criam uma conta para responder.</p><div className="copy-box"><Link2/><span>{cotacao.publicUrl}</span><button className="button button-secondary" onClick={() => void copiar(cotacao.publicUrl!, 'link')}>{copiado === 'link' ? 'Copiado!' : 'Copiar link'}</button></div><div className="message-preview"><p>{mensagem}</p><button className="button button-ghost" onClick={() => void copiar(mensagem, 'mensagem')}><Clipboard/>{copiado === 'mensagem' ? 'Mensagem copiada!' : 'Copiar mensagem'}</button></div><div className="wizard-actions centered"><button className="button button-primary" onClick={() => navegar(`/cotacoes/${cotacao.id}`)}>Acompanhar cotação <ArrowRight/></button></div></div>}
    </section>
  </div>
}

function SeletorColuna({ campo, rotulo, obrigatorio, analise, mapeamento, setMapeamento }:{
  campo:CampoMapeamento; rotulo:string; obrigatorio:boolean; analise:AnaliseArquivoImportacao;
  mapeamento:MapeamentoColunas; setMapeamento:Dispatch<SetStateAction<MapeamentoColunas>>;
}) {
  return <label>{rotulo} {obrigatorio ? <small>Obrigatório</small> : <small>Opcional</small>}<select value={mapeamento[campo] ?? ''} onChange={event => setMapeamento(atual => ({ ...atual, [campo]:event.target.value === '' ? null : Number(event.target.value) }))}><option value="">{obrigatorio ? 'Selecione uma coluna' : 'Não importar'}</option>{analise.columns.map(coluna => <option key={coluna.index} value={coluna.index}>{coluna.name}</option>)}</select></label>
}
