import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, Clipboard, ClipboardPaste, Columns3, Download, Lock, MailWarning,
  FileSpreadsheet, Link2, PenLine, Plus, TableProperties, Trash2, UploadCloud, XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { api, apiArquivo, ErroApi } from '../api'
import { AvisoErro } from '../components/ComponentesUI'
import ModalColarColunas from '../components/ModalColarColunas'
import { colunasColadasVazias, type ColunasColadas, type LinhaColada } from '../lib/colunasColadas'
import { usarAutenticacao } from '../autenticacao'
import { acessoBloqueado, emailPendente, LINK_WHATSAPP_ASSINATURA } from '../lib/assinatura'
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
type OrigemItem = 'planilha' | 'manual' | 'colado'
interface ItemManual { id:string; ean:string; productName:string; quantity:string; laboratory:string }
interface ItemRevisao extends ItemManual { origem:OrigemItem }

const novoItemManual = ():ItemManual => ({ id:crypto.randomUUID(), ean:'', productName:'', quantity:'', laboratory:'' })
const normalizar = (valor:string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ')
const completarPeloCatalogo = (item:ItemManual, campo:keyof Omit<ItemManual, 'id'>, valor:string, produtos:Produto[]):ItemManual => {
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
}

export default function PaginaNovaCotacao() {
  const navegar = usarNavegacao()
  const { user } = usarAutenticacao()
  const [etapa, setEtapa] = useState(1)
  const [nome, setNome] = useState('')
  const [prazo, setPrazo] = useState('')
  const [modo, setModo] = useState<ModoProdutos>('planilha')
  const [arquivo, setArquivo] = useState<File|null>(null)
  const [analise, setAnalise] = useState<AnaliseArquivoImportacao|null>(null)
  const [mapeamento, setMapeamento] = useState<MapeamentoColunas>({ ean:null, productName:null, quantity:null, laboratory:null })
  const [itensManuais, setItensManuais] = useState<ItemManual[]>([novoItemManual()])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [colarAberto, setColarAberto] = useState(false)
  const [colunasColadas, setColunasColadas] = useState<ColunasColadas>(colunasColadasVazias)
  const [ignorarCabecalho, setIgnorarCabecalho] = useState(false)
  const [origemPrevia, setOrigemPrevia] = useState<OrigemItem>('planilha')
  const [previa, setPrevia] = useState<PreviaImportacao|null>(null)
  const [itensRevisao, setItensRevisao] = useState<ItemRevisao[]>([])
  const [adicionandoExtra, setAdicionandoExtra] = useState(false)
  const [itemExtra, setItemExtra] = useState<ItemManual>(novoItemManual())
  const [editandoId, setEditandoId] = useState('')
  const [rascunho, setRascunho] = useState<ItemManual|null>(null)
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
    setErro(''); setOcupado(true); setArquivo(selecionado); setAnalise(null); setPrevia(null); setItensRevisao([])
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
      const resultado = await api<PreviaImportacao>('/quotations/import/preview', { method:'POST', body:corpo })
      iniciarRevisao(resultado, 'planilha')
    } catch (e) { setErro(e instanceof ErroApi ? e.message : 'Falha ao conferir os produtos.') }
    finally { setOcupado(false) }
  }

  const gerarPreviaManual = async () => {
    setErro(''); setOcupado(true)
    try {
      const items = itensManuais.map((item, index) => ({
        row:index + 1, ean:item.ean, productName:item.productName, quantity:item.quantity, laboratory:item.laboratory,
      }))
      const resultado = await api<PreviaImportacao>('/quotations/items/preview', { method:'POST', body:JSON.stringify({ items }) })
      iniciarRevisao(resultado, 'manual')
    } catch (e) { setErro(e instanceof ErroApi ? e.message : 'Falha ao conferir os produtos.') }
    finally { setOcupado(false) }
  }

  const gerarPreviaColada = async (linhas:LinhaColada[]) => {
    setErro(''); setOcupado(true)
    try {
      const items = linhas.map((linha, index) => ({
        row:index + 1, ean:linha.ean, productName:linha.productName, quantity:linha.quantity, laboratory:linha.laboratory,
      }))
      const resultado = await api<PreviaImportacao>('/quotations/items/preview', { method:'POST', body:JSON.stringify({ items }) })
      setColarAberto(false); iniciarRevisao(resultado, 'colado')
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
      return completarPeloCatalogo(item, campo, valor, produtos)
    }))
  }

  const iniciarRevisao = (resultado:PreviaImportacao, origem:OrigemItem) => {
    setPrevia(resultado); setOrigemPrevia(origem)
    setItensRevisao(resultado.lines.map(linha => ({
      id:crypto.randomUUID(), origem, ean:linha.ean ?? '', productName:linha.productName,
      quantity:linha.quantity?.toString() ?? '', laboratory:linha.laboratory ?? '',
    })))
    setAdicionandoExtra(false); setEditandoId(''); setRascunho(null); setEtapa(3)
  }

  /* A revisão é sempre reconferida no servidor: a lista local é a fonte, e a prévia exibida é o retorno dela. */
  const validarItens = (itens:ItemRevisao[]) => api<PreviaImportacao>('/quotations/items/preview', {
    method:'POST',
    body:JSON.stringify({ items:itens.map((item, index) => ({
      row:index + 1, ean:item.ean, productName:item.productName, quantity:item.quantity, laboratory:item.laboratory,
    })) }),
  })

  const adicionarProdutoRevisao = async (event:FormEvent) => {
    event.preventDefault(); setErro(''); setOcupado(true)
    const proximos:ItemRevisao[] = [...itensRevisao, { ...itemExtra, origem:'manual' }]
    try {
      const resultado = await validarItens(proximos)
      const ultimaLinha = resultado.lines.at(-1)
      if (!ultimaLinha?.valid) { setErro(ultimaLinha?.errors.join(' ') || 'Confira o produto informado.'); return }
      setItensRevisao(proximos); setPrevia(resultado); setItemExtra(novoItemManual()); setAdicionandoExtra(false)
    } catch (e) { setErro(e instanceof ErroApi ? e.message : 'Não foi possível adicionar o produto.') }
    finally { setOcupado(false) }
  }

  const removerProdutoRevisao = async (id:string) => {
    const proximos = itensRevisao.filter(item => item.id !== id)
    if (!proximos.length) { setErro('A cotação precisa de pelo menos um produto.'); return }
    setErro(''); setOcupado(true)
    try {
      setPrevia(await validarItens(proximos)); setItensRevisao(proximos)
      if (editandoId === id) { setEditandoId(''); setRascunho(null) }
    } catch (e) { setErro(e instanceof ErroApi ? e.message : 'Não foi possível remover o produto.') }
    finally { setOcupado(false) }
  }

  const abrirEdicaoRevisao = (item:ItemRevisao) => {
    setErro(''); setAdicionandoExtra(false); setEditandoId(item.id)
    setRascunho({ id:item.id, ean:item.ean, productName:item.productName, quantity:item.quantity, laboratory:item.laboratory })
  }

  const cancelarEdicaoRevisao = () => { setEditandoId(''); setRascunho(null); setErro('') }

  const salvarEdicaoRevisao = async () => {
    if (!rascunho) return
    const indice = itensRevisao.findIndex(item => item.id === editandoId)
    if (indice < 0) return
    const proximos = itensRevisao.map(item => item.id === editandoId ? { ...item, ...rascunho, id:item.id } : item)
    setErro(''); setOcupado(true)
    try {
      const resultado = await validarItens(proximos)
      const linha = resultado.lines[indice]
      if (!linha?.valid) { setErro(linha?.errors.join(' ') || 'Confira os dados do produto.'); return }
      setItensRevisao(proximos); setPrevia(resultado); setEditandoId(''); setRascunho(null)
    } catch (e) { setErro(e instanceof ErroApi ? e.message : 'Não foi possível salvar o produto.') }
    finally { setOcupado(false) }
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
  /* Quem chegou à revisão colando colunas volta para a colagem, não para o painel de planilha
     que nunca chegou a usar. */
  const voltarProdutos = () => { setErro(''); setEtapa(2); if (origemPrevia === 'colado') setColarAberto(true) }

  if (emailPendente(user?.emailConfirmed)) return <div className="page narrow">
    <div className="back-row"><LinkInterno to="/cotacoes" className="text-link"><ArrowLeft/>Voltar para cotações</LinkInterno></div>
    <section className="card assinatura-bloqueio">
      <div className="assinatura-bloqueio-icone confirmacao-icone-neutro"><MailWarning/></div>
      <h1>Confirme seu e-mail primeiro</h1>
      <p>Enviamos um link de confirmação para <b>{user?.email}</b>. Clique nele e volte aqui — leva menos de um minuto.</p>
      <p className="assinatura-bloqueio-spam"><b>Não achou?</b> Procure por “CotaPreço” na caixa de spam ou lixo eletrônico e marque como <b>não é spam</b>. Use o botão “Reenviar e-mail” no aviso do topo se precisar de um link novo.</p>
      <div className="assinatura-bloqueio-acoes">
        <LinkInterno className="button button-ghost" to="/cotacoes">Ver minhas cotações</LinkInterno>
      </div>
    </section>
  </div>

  if (acessoBloqueado(user?.accessAllowed)) return <div className="page narrow">
    <div className="back-row"><LinkInterno to="/cotacoes" className="text-link"><ArrowLeft/>Voltar para cotações</LinkInterno></div>
    <section className="card assinatura-bloqueio">
      <div className="assinatura-bloqueio-icone"><Lock/></div>
      <h1>Seu período de teste terminou</h1>
      <p>Novas cotações ficam pausadas até a assinatura. Tudo o que você já criou continua aqui: comparativos, pedidos, histórico de preços e as exportações em Excel.</p>
      <div className="assinatura-bloqueio-acoes">
        <a className="button button-primary" href={LINK_WHATSAPP_ASSINATURA} target="_blank" rel="noopener noreferrer">Assinar pelo WhatsApp</a>
        <LinkInterno className="button button-ghost" to="/cotacoes">Ver minhas cotações</LinkInterno>
      </div>
    </section>
  </div>

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
          <button type="button" className="source-card" onClick={() => { setErro(''); setColarAberto(true) }}><ClipboardPaste/><span><strong>Colar de uma planilha</strong><small>Cole coluna por coluna, sem precisar de arquivo</small></span></button>
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
          {/* Legenda e linhas dividem o mesmo gabarito de colunas: repetir o rótulo em cada
              linha desalinhava os campos assim que um deles quebra em duas linhas. */}
          <div className="manual-items">
            <div className="manual-legenda" aria-hidden="true">
              <span/><span>EAN <small>Opcional</small></span><span>Produto</span><span>Quantidade</span><span>Laboratório <small>Opcional</small></span><span/>
            </div>
            {itensManuais.map((item, index) => <div className="manual-item" key={item.id}>
              <span className="manual-number">{index + 1}</span>
              <input list="produtos-eans" inputMode="numeric" maxLength={14} placeholder="EAN" aria-label={`EAN do produto ${index + 1}`} value={item.ean} onChange={event => alterarItemManual(item.id, 'ean', event.target.value.replace(/\D/g, ''))}/>
              <input list="produtos-nomes" required maxLength={240} placeholder="Nome ou descrição do produto" aria-label={`Produto ${index + 1}`} value={item.productName} onChange={event => alterarItemManual(item.id, 'productName', event.target.value)}/>
              <input required type="number" min="1" step="1" placeholder="Qtd." aria-label={`Quantidade do produto ${index + 1}`} value={item.quantity} onChange={event => alterarItemManual(item.id, 'quantity', event.target.value)}/>
              <input maxLength={160} placeholder="Laboratório" aria-label={`Laboratório do produto ${index + 1}`} value={item.laboratory} onChange={event => alterarItemManual(item.id, 'laboratory', event.target.value)}/>
              <button type="button" className="icon-button remove-manual" title="Remover produto" aria-label={`Remover produto ${index + 1}`} disabled={itensManuais.length === 1} onClick={() => setItensManuais(atuais => atuais.filter(atual => atual.id !== item.id))}><Trash2/></button>
            </div>)}
          </div>
          <button type="button" className="button button-ghost add-manual-bottom" onClick={() => setItensManuais(atuais => [...atuais, novoItemManual()])}><Plus/>Adicionar outra linha</button>
        </div>}

        <div className="wizard-actions"><button className="button button-ghost" onClick={() => setEtapa(1)}><ArrowLeft/>Voltar</button><button className="button button-primary" disabled={ocupado || (modo === 'planilha' && (!analise || colunasRepetidas || mapeamento.productName === null || mapeamento.quantity === null))} onClick={() => void (modo === 'planilha' ? gerarPreviaPlanilha() : gerarPreviaManual())}>{ocupado ? 'Conferindo...' : 'Conferir produtos'} <ArrowRight/></button></div>
      </div>}

      {etapa === 3 && previa && <div>
        <div className="wizard-heading"><span>Etapa 3 de 5</span><h2>Revise os produtos</h2><p>Edite, remova ou acrescente itens direto aqui. Nenhum produto ou cotação foi salvo até este ponto.</p></div>
        <div className="review-extra-panel">
          <datalist id="revisao-produtos-nomes">{produtos.map(produto => <option key={produto.id} value={produto.name}>{produto.ean ? `EAN ${produto.ean}` : 'Sem EAN'}</option>)}</datalist>
          <datalist id="revisao-produtos-eans">{produtos.filter(produto => produto.ean).map(produto => <option key={produto.id} value={produto.ean ?? ''}>{produto.name}</option>)}</datalist>
          <div className="review-extra-heading"><div><strong>Esqueceu algum produto?</strong><span>Adicione agora sem precisar alterar e importar a planilha novamente.</span></div>{!adicionandoExtra && <button type="button" className="button button-secondary" onClick={() => { setItemExtra(novoItemManual()); setAdicionandoExtra(true); setErro('') }}><Plus/>Adicionar produto</button>}</div>
          {adicionandoExtra && <form className="review-extra-form" onSubmit={adicionarProdutoRevisao}>
            <label>EAN <small>Opcional</small><input list="revisao-produtos-eans" inputMode="numeric" maxLength={14} placeholder="789..." value={itemExtra.ean} onChange={event => setItemExtra(atual => completarPeloCatalogo(atual, 'ean', event.target.value.replace(/\D/g, ''), produtos))}/></label>
            <label className="review-extra-description">Descrição <small>Obrigatório</small><input autoFocus required maxLength={240} list="revisao-produtos-nomes" placeholder="Nome ou descrição do produto" value={itemExtra.productName} onChange={event => setItemExtra(atual => completarPeloCatalogo(atual, 'productName', event.target.value, produtos))}/></label>
            <label>Quantidade <small>Obrigatório</small><input required type="number" min="1" step="1" placeholder="0" value={itemExtra.quantity} onChange={event => setItemExtra(atual => ({ ...atual, quantity:event.target.value }))}/></label>
            <label>Laboratório <small>Opcional</small><input maxLength={160} placeholder="Fabricante" value={itemExtra.laboratory} onChange={event => setItemExtra(atual => ({ ...atual, laboratory:event.target.value }))}/></label>
            <div className="review-extra-actions"><button type="button" className="button button-ghost" disabled={ocupado} onClick={() => { setAdicionandoExtra(false); setItemExtra(novoItemManual()); setErro('') }}>Cancelar</button><button className="button button-primary" disabled={ocupado}>{ocupado ? 'Adicionando...' : <><Plus/>Adicionar à cotação</>}</button></div>
          </form>}
        </div>
        <div className="import-summary"><div><CheckCircle2/><strong>{previa.validRows}</strong><span>linhas válidas</span></div><div className={previa.invalidRows ? 'danger' : ''}><XCircle/><strong>{previa.invalidRows}</strong><span>com problema</span></div><div><Clipboard/><strong>{previa.lines.filter(linha => !linha.productExists && linha.valid).length}</strong><span>novos produtos</span></div></div>
        <div className="table-wrap import-table"><table><thead><tr><th>Linha</th><th>EAN</th><th>Produto</th><th>Laboratório</th><th>Qtd.</th><th>Cadastro</th><th aria-label="Ações"/></tr></thead><tbody>{itensRevisao.map((item, indice) => {
          const linha = previa.lines[indice]
          if (!linha) return null
          if (editandoId === item.id && rascunho) return <tr key={item.id} className="editing-row"><td>{linha.row}</td>
            <td><input className="review-cell-input" list="revisao-produtos-eans" inputMode="numeric" maxLength={14} placeholder="Sem EAN" aria-label="EAN" value={rascunho.ean} onChange={event => setRascunho(atual => atual && completarPeloCatalogo(atual, 'ean', event.target.value.replace(/\D/g, ''), produtos))}/></td>
            <td><input className="review-cell-input" list="revisao-produtos-nomes" maxLength={240} placeholder="Nome ou descrição" aria-label="Descrição do produto" autoFocus value={rascunho.productName} onChange={event => setRascunho(atual => atual && completarPeloCatalogo(atual, 'productName', event.target.value, produtos))}/></td>
            <td><input className="review-cell-input" maxLength={160} placeholder="Fabricante" aria-label="Laboratório" value={rascunho.laboratory} onChange={event => setRascunho(atual => atual && ({ ...atual, laboratory:event.target.value }))}/></td>
            <td><input className="review-cell-input" type="number" min="1" step="1" placeholder="0" aria-label="Quantidade" value={rascunho.quantity} onChange={event => setRascunho(atual => atual && ({ ...atual, quantity:event.target.value }))} onKeyDown={event => { if (event.key === 'Enter') void salvarEdicaoRevisao() }}/></td>
            <td><span className="mini-tag">Editando</span></td>
            <td><div className="review-row-actions"><button type="button" className="icon-button" disabled={ocupado} title="Cancelar edição" aria-label="Cancelar edição" onClick={cancelarEdicaoRevisao}><XCircle/></button><button type="button" className="icon-button primary" disabled={ocupado} title="Salvar produto" aria-label="Salvar produto" onClick={() => void salvarEdicaoRevisao()}><Check/></button></div></td></tr>
          return <tr key={item.id} className={!linha.valid ? 'invalid-row' : ''}><td>{linha.row}</td><td>{linha.ean ? <code>{linha.ean}</code> : <span className="muted">Sem EAN</span>}</td><td><strong>{linha.productName || 'Sem nome'}</strong>{linha.errors.map(mensagemErro => <small className="field-error" key={mensagemErro}>{mensagemErro}</small>)}</td><td>{linha.laboratory || <span className="muted">—</span>}</td><td>{linha.quantity ?? '—'}</td><td>{linha.valid ? <span className={`mini-tag ${linha.productExists ? '' : 'new'}`}>{linha.productExists ? 'Encontrado' : 'Será cadastrado'}</span> : <span className="mini-tag error">Corrigir</span>}</td>
            <td><div className="review-row-actions"><button type="button" className="icon-button" disabled={ocupado || Boolean(editandoId)} title="Editar produto" aria-label={`Editar ${linha.productName || 'produto'}`} onClick={() => abrirEdicaoRevisao(item)}><PenLine/></button><button type="button" className="icon-button" disabled={ocupado || Boolean(editandoId) || itensRevisao.length === 1} title={itensRevisao.length === 1 ? 'A cotação precisa de pelo menos um produto' : 'Remover produto'} aria-label={`Remover ${linha.productName || 'produto'}`} onClick={() => void removerProdutoRevisao(item.id)}><Trash2/></button></div></td></tr>
        })}</tbody></table></div>
        {previa.invalidRows > 0 && <div className="alert alert-warning">Corrija os itens destacados usando o lápis na própria linha, ou remova o que não faz mais sentido.</div>}
        <div className="wizard-actions"><button className="button button-ghost" onClick={voltarProdutos}><ArrowLeft/>Corrigir produtos</button><button className="button button-primary" disabled={previa.invalidRows > 0 || ocupado || adicionandoExtra || Boolean(editandoId)} onClick={() => setEtapa(4)}>Revisar criação <ArrowRight/></button></div>
      </div>}

      {etapa === 4 && previa && <div><div className="wizard-heading"><span>Etapa 4 de 5</span><h2>Tudo pronto para abrir</h2><p>Ao confirmar, produtos novos serão cadastrados e o link público será gerado.</p></div><div className="review-box"><div><span>Nome</span><strong>{nome}</strong></div><div><span>Prazo</span><strong>{prazo ? new Date(prazo).toLocaleString('pt-BR') : 'Sem prazo definido'}</strong></div><div><span>Produtos</span><strong>{previa.validRows} itens</strong></div><div><span>Novos cadastros</span><strong>{previa.lines.filter(linha => !linha.productExists).length} produtos</strong></div></div><div className="wizard-actions"><button className="button button-ghost" onClick={() => setEtapa(3)}><ArrowLeft/>Voltar</button><button className="button button-primary" disabled={ocupado} onClick={() => void criar()}>{ocupado ? 'Criando...' : 'Criar e abrir cotação'} <Check/></button></div></div>}

      {etapa === 5 && cotacao?.publicUrl && <div className="share-success"><div className="success-icon"><CheckCircle2/></div><span className="eyebrow green">Cotação aberta</span><h2>Agora é só compartilhar!</h2><p>Envie este link para os representantes. Eles entram ou criam uma conta para responder.</p><div className="copy-box"><Link2/><span>{cotacao.publicUrl}</span><button className="button button-secondary" onClick={() => void copiar(cotacao.publicUrl!, 'link')}>{copiado === 'link' ? 'Copiado!' : 'Copiar link'}</button></div><div className="message-preview"><p>{mensagem}</p><button className="button button-ghost" onClick={() => void copiar(mensagem, 'mensagem')}><Clipboard/>{copiado === 'mensagem' ? 'Mensagem copiada!' : 'Copiar mensagem'}</button></div><div className="wizard-actions centered"><button className="button button-primary" onClick={() => navegar(`/cotacoes/${cotacao.id}`)}>Acompanhar cotação <ArrowRight/></button></div></div>}
    </section>
    {colarAberto && <ModalColarColunas colunas={colunasColadas} setColunas={setColunasColadas}
      ignorarCabecalho={ignorarCabecalho} setIgnorarCabecalho={setIgnorarCabecalho}
      erro={erro} ocupado={ocupado} aoFechar={() => { setColarAberto(false); setErro('') }}
      aoRevisar={linhas => void gerarPreviaColada(linhas)}/>}
  </div>
}

function SeletorColuna({ campo, rotulo, obrigatorio, analise, mapeamento, setMapeamento }:{
  campo:CampoMapeamento; rotulo:string; obrigatorio:boolean; analise:AnaliseArquivoImportacao;
  mapeamento:MapeamentoColunas; setMapeamento:Dispatch<SetStateAction<MapeamentoColunas>>;
}) {
  return <label>{rotulo} {obrigatorio ? <small>Obrigatório</small> : <small>Opcional</small>}<select value={mapeamento[campo] ?? ''} onChange={event => setMapeamento(atual => ({ ...atual, [campo]:event.target.value === '' ? null : Number(event.target.value) }))}><option value="">{obrigatorio ? 'Selecione uma coluna' : 'Não importar'}</option>{analise.columns.map(coluna => <option key={coluna.index} value={coluna.index}>{coluna.name}</option>)}</select></label>
}
