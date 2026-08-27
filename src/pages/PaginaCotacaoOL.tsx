import {
  ArrowDownToLine, Check, CircleAlert, CircleCheck, Columns3, Info, ListChecks, Lock, LoaderCircle, PenLine,
  RotateCcw, ScanSearch, Search, ShieldCheck, TableProperties, Trash2, Upload, X,
} from 'lucide-react'
import {
  useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react'
import { EstadoVazio } from '../components/ComponentesUI'
import { usarAutenticacao } from '../autenticacao'
import { acessoBloqueado, LINK_WHATSAPP_ASSINATURA } from '../lib/assinatura'
import { salvarBlob } from '../lib/arquivos'
import {
  ARMAZENAMENTO_COTACAO_OL, autoMapColumns, buildProductSignature, calculateOrder, compareProductNames,
  createOrderLineId, detectHeaderRow, ensureOrderLineIds, evaluatePriceOpportunity, findPriceHistoryReference,
  formatBRL, getOfferComparisonStatus, matchesProductSearch, normalizeEan, normalizeHeader, parseDcbCatalog,
  parsePriceHistory, productLinkId, readSpreadsheet, supplierFromFilename, toNumber,
  type AssinaturaProduto, type CatalogoDcb, type ItemPedido, type ItemResultadoCompra, type LinhaPlanilha,
  type MapaAjustes, type MapaCotacoes, type MapaHistoricoPrecos, type MapaVinculos, type MetodoCorrespondencia,
  type OfertaEnriquecida, type ProdutoCorrespondente, type ProdutoCotado,
} from '../lib/melhorCompra'

interface DcbInfo { fileName:string; importedAt:string; total:number; orderMatched:number; quotationMatched:number; origem?:'padrao'|'manual' }
interface HistoricoInfo { fileName:string; importedAt:string; total:number; matched:number }
type TipoImportacao = 'cotacao'|'dcb'|'historico'|'pedido'
interface CampoMapeamento { key:string; label:string; type?:'text'; required?:boolean }
interface EstadoMapeamento { kind:TipoImportacao; headers:string[]; rows:LinhaPlanilha[]; fields:CampoMapeamento[]; values:Record<string, string>; fileName:string }
interface RascunhoCompra { offerKey:string; fornecedor:string; quantidade:number|string; motivo:string }
type TipoStatus = 'success'|'danger'|'warning'|'neutral'

interface EstadoPersistido {
  cotacoes?:MapaCotacoes
  fornecedores?:string[]
  pedido?:Partial<ItemPedido>[]
  ajustesManuais?:MapaAjustes
  productLinks?:MapaVinculos
  matchingSettings?:{ autoAcceptSafe:boolean }
  dcbCatalog?:CatalogoDcb
  dcbInfo?:DcbInfo|null
  historicoPrecos?:MapaHistoricoPrecos
  historicoInfo?:HistoricoInfo|null
  dcbPadraoDispensada?:boolean
}

/*
 * Nome ofuscado de propósito: o arquivo público em /public é sempre baixável por quem
 * souber a URL exata, mas um nome não-óbvio impede o acesso casual (digitar a URL,
 * encontrar por buscador). Não protege contra alguém inspecionando a rede do app.
 */
const ARQUIVO_DCB_PADRAO = 'ref-77e0f812a09e70c9cccb.dat'
const NOME_EXIBICAO_DCB_PADRAO = 'Base padrão DCB'

function estadoSalvo():EstadoPersistido {
  try {
    const saved = JSON.parse(window.localStorage.getItem(ARMAZENAMENTO_COTACAO_OL) || '{}') as EstadoPersistido
    return saved && typeof saved === 'object' ? saved : {}
  } catch { return {} }
}

function baixarCsv(data:Record<string, unknown>[], name:string) {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const rows = [headers.join(';'), ...data.map((row) => headers.map((header) => `"${String(row[header] ?? '').replace(/"/g, '""')}"`).join(';'))]
  const url = URL.createObjectURL(new Blob(['﻿', rows.join('\n')], { type: 'text/csv;charset=utf-8' }))
  Object.assign(document.createElement('a'), { href: url, download: name }).click()
  URL.revokeObjectURL(url)
}

function canvasParaBlob(canvas:HTMLCanvasElement, type = 'image/png', quality?:number):Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível gerar o arquivo.'))), type, quality))
}

function mesclarBytes(chunks:Uint8Array[]):Uint8Array {
  const bytes = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0))
  let offset = 0
  chunks.forEach((chunk) => { bytes.set(chunk, offset); offset += chunk.length })
  return bytes
}

function quebrarTexto(context:CanvasRenderingContext2D, text:string, width:number):string[] {
  return String(text).split(/\s+/).reduce<string[]>((lines, word) => {
    const current = lines.at(-1) || ''
    const candidate = current ? `${current} ${word}` : word
    if (context.measureText(candidate).width <= width || !current) lines[lines.length - 1] = candidate
    else lines.push(word)
    return lines
  }, [''])
}

interface LinhaCompraExportavel { ean:string; nome:string; quantidadeFinal:number; fornecedorSelecionado:string; precoUnitario:number; precoTotal:number; ajusteManual:boolean; matchMethod:MetodoCorrespondencia|null }

function paginaCompra(rows:LinhaCompraExportavel[], fornecedor:string, pageNumber:number, totalPages:number):HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 1600; canvas.height = 1080
  const context = canvas.getContext('2d')
  if (!context) return canvas
  context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#12634a'; context.fillRect(0, 0, canvas.width, 160)
  context.fillStyle = '#fff'; context.font = '900 54px Manrope, Arial, sans-serif'; context.fillText('COTAÇÃO PARA OL', 70, 78)
  context.font = '700 26px Arial, sans-serif'; context.fillText('PEDIDO - MELHOR COMPRA', 70, 122)
  context.font = '700 22px Arial, sans-serif'; context.textAlign = 'right'; context.fillText(`Página ${pageNumber} de ${totalPages}`, 1530, 80)
  context.fillStyle = '#18332b'; context.textAlign = 'left'; context.font = '700 24px Arial, sans-serif'; context.fillText(`Filtro de fornecedor: ${fornecedor}`, 70, 205)
  const columns = [70, 245, 735, 855, 1120, 1345]
  const widths = [160, 470, 100, 250, 205, 185]
  const headers = ['CÓDIGO', 'PRODUTO', 'QTD.', 'FORNECEDOR', 'UNITÁRIO', 'TOTAL']
  context.fillStyle = '#e7f4ef'; context.fillRect(55, 235, 1490, 54)
  context.fillStyle = '#476159'; context.font = '800 18px Arial, sans-serif'
  headers.forEach((header, index) => context.fillText(header, columns[index], 269))
  let y = 323
  rows.forEach((item, index) => {
    const lines = quebrarTexto(context, item.nome, widths[1] - 15).slice(0, 2)
    const height = Math.max(44, lines.length * 25 + 20)
    if (index % 2 === 0) { context.fillStyle = '#f8faf9'; context.fillRect(55, y - 27, 1490, height) }
    context.fillStyle = '#18332b'; context.font = '600 18px Arial, sans-serif'; context.fillText(item.ean, columns[0], y)
    context.font = '700 18px Arial, sans-serif'; lines.forEach((line, lineIndex) => context.fillText(`${lineIndex === 0 && item.ajusteManual ? '* ' : ''}${lineIndex === 0 && item.matchMethod !== 'ean' ? '≈ ' : ''}${line}`, columns[1], y - 12 + lineIndex * 25))
    context.textAlign = 'right'; context.font = '700 18px Arial, sans-serif'; context.fillText(String(item.quantidadeFinal), columns[2] + widths[2] - 10, y)
    context.textAlign = 'left'; context.font = '600 17px Arial, sans-serif'; context.fillText(`${item.fornecedorSelecionado}${item.ajusteManual ? ' *' : ''}`, columns[3], y)
    context.textAlign = 'right'; context.font = '700 18px Arial, sans-serif'; context.fillText(formatBRL(item.precoUnitario), columns[4] + widths[4] - 8, y); context.fillText(formatBRL(item.precoTotal), columns[5] + widths[5] - 8, y)
    context.textAlign = 'left'; y += height
  })
  const total = rows.reduce((sum, item) => sum + item.precoTotal, 0)
  context.fillStyle = '#e7f4ef'; context.fillRect(55, 980, 1490, 54)
  context.fillStyle = '#12634a'; context.font = '900 23px Arial, sans-serif'; context.fillText(`TOTAL DESTA PÁGINA: ${formatBRL(total)}`, 75, 1015)
  const notes:string[] = []
  if (rows.some((item) => item.ajusteManual)) notes.push('* Escolha ou quantidade ajustada manualmente.')
  if (rows.some((item) => item.matchMethod !== 'ean')) notes.push('≈ Produto localizado por nome equivalente; confira o EAN da oferta.')
  if (notes.length) { context.fillStyle = '#6f817b'; context.font = '600 14px Arial, sans-serif'; context.fillText(notes.join('   '), 75, 1060) }
  return canvas
}

async function canvasesParaPdfBlob(canvases:HTMLCanvasElement[]):Promise<Blob> {
  const encode = (text:string) => new TextEncoder().encode(text)
  const images = await Promise.all(canvases.map(async (canvas) => ({ canvas, jpeg: new Uint8Array(await (await canvasParaBlob(canvas, 'image/jpeg', .95)).arrayBuffer()) })))
  let nextId = 3
  const pages = images.map((image) => ({ ...image, pageId: nextId++, contentId: nextId++, imageId: nextId++ }))
  const objects:{ id:number; value:Uint8Array }[] = [
    { id: 1, value: encode('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n') },
    { id: 2, value: encode(`2 0 obj\n<< /Type /Pages /Kids [${pages.map((page) => `${page.pageId} 0 R`).join(' ')}] /Count ${pages.length} >>\nendobj\n`) },
  ]
  pages.forEach((page) => {
    const width = 720; const height = Math.round(width * page.canvas.height / page.canvas.width)
    const content = encode(`q\n${width} 0 0 ${height} 0 0 cm\n/Im${page.imageId} Do\nQ\n`)
    objects.push(
      { id: page.pageId, value: encode(`${page.pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im${page.imageId} ${page.imageId} 0 R >> >> /Contents ${page.contentId} 0 R >>\nendobj\n`) },
      { id: page.contentId, value: mesclarBytes([encode(`${page.contentId} 0 obj\n<< /Length ${content.length} >>\nstream\n`), content, encode('endstream\nendobj\n')]) },
      { id: page.imageId, value: mesclarBytes([encode(`${page.imageId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${page.canvas.width} /Height ${page.canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>\nstream\n`), page.jpeg, encode('\nendstream\nendobj\n')]) },
    )
  })
  objects.sort((first, second) => first.id - second.id)
  const header = encode('%PDF-1.4\n'); let position = header.length; const offsets:number[] = []
  objects.forEach((object) => { offsets.push(position); position += object.value.length })
  const xref = encode(`xref\n0 ${nextId}\n0000000000 65535 f \n${offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${nextId} /Root 1 0 R >>\nstartxref\n${position}\n%%EOF`)
  return new Blob([header, ...objects.map((object) => object.value), xref] as BlobPart[], { type: 'application/pdf' })
}

function Status({ type, title, children }:{ type:TipoStatus; title?:string; children:ReactNode }) { return <span className={`ol-status ${type}`} title={title}>{children}</span> }

function StatusCompra({ item }:{ item:ItemResultadoCompra }) {
  if (item.status === 'naoEncontrado') return <Status type="danger" title="Nenhum fornecedor importado tem um produto com o mesmo EAN, DCB ou nome equivalente a este item. Importe a tabela do fornecedor que vende este produto, ou use o botão Revisar para procurar manualmente.">Não encontrado</Status>
  if (item.status === 'revisarCorrespondencia') return <Status type="warning" title="Encontramos produtos parecidos, mas não parecidos o suficiente para vincular sozinhos. Clique em Revisar e confirme se é o mesmo produto.">Revisar correspondência</Status>
  if (item.status === 'ajusteInvalido') return <Status type="danger" title="Você escolheu manualmente um fornecedor ou uma oferta para este item que não existe mais nas tabelas importadas (provavelmente porque a tabela desse fornecedor foi removida ou atualizada). Clique em Editar para escolher outra opção.">Revisar ajuste</Status>
  if (item.status === 'removidoManual') return <Status type="neutral" title="Você ajustou a quantidade deste item para zero. Ele não entra no total nem na exportação da melhor compra.">Removido</Status>
  if (item.status === 'ajusteManual') return <Status type="warning" title="O fornecedor, a oferta ou a quantidade deste item foram escolhidos manualmente, em vez do cálculo automático de menor preço.">Ajuste manual</Status>
  if (item.status === 'alternativaPreferida') return <Status type="warning" title="Este item foi comprado do fornecedor preferido informado na importação do pedido, mesmo não sendo o de menor preço disponível.">Preferido</Status>
  return <Status type="success" title="Este é o fornecedor com o menor preço disponível para este item, escolhido automaticamente.">Melhor preço</Status>
}

function rotuloMetodo(method:MetodoCorrespondencia|null):string {
  if (method === 'ean') return 'EAN exato'
  if (method === 'dcb') return 'Mesmo DCB'
  if (method === 'automatic-name') return 'Nome equivalente'
  if (method === 'auto-reviewed-name') return 'Aceita automaticamente'
  if (method === 'confirmed-name') return 'Vínculo confirmado'
  return 'Sem correspondência'
}

function explicacaoMetodo(method:MetodoCorrespondencia|null):string {
  if (method === 'ean') return 'O código de barras (EAN) da oferta é idêntico ao do pedido — a correspondência mais confiável que existe.'
  if (method === 'dcb') return 'A oferta tem o mesmo princípio ativo (DCB) do item pedido, mesmo com EAN ou nome diferentes. Vem da base de equivalência DCB.'
  if (method === 'automatic-name') return 'O nome do produto da oferta bateu com o do pedido (mesmo princípio ativo, dose, forma e embalagem), mesmo com EANs diferentes.'
  if (method === 'auto-reviewed-name') return 'A correspondência por nome ficou próxima o suficiente que o sistema aceitou sozinho, porque a opção "Aceitar automaticamente equivalências seguras" está ativada.'
  if (method === 'confirmed-name') return 'Você revisou manualmente e confirmou que esta oferta é o mesmo produto do pedido.'
  return 'Nenhum fornecedor importado tem uma oferta parecida com este item.'
}

function metodoAceitoAutomaticamente(method:MetodoCorrespondencia|null):boolean {
  return method === 'auto-reviewed-name' || method === 'dcb'
}

function BadgeCorrespondencia({ item }:{ item:ItemResultadoCompra }) {
  if (item.status === 'revisarCorrespondencia') return <Status type="warning" title="Encontramos produtos parecidos, mas eles precisam da sua confirmação antes de entrar na comparação.">Revisar sugestões</Status>
  if (!item.matchMethod) return <Status type="danger" title={explicacaoMetodo(null)}>Não encontrado</Status>
  return <div className="ol-match-badge"><Status type={item.matchMethod === 'ean' || item.matchMethod === 'dcb' ? 'success' : 'warning'} title={explicacaoMetodo(item.matchMethod)}>{rotuloMetodo(item.matchMethod)}</Status>{item.dcb && <small title={`DCB identificado para este item: ${item.dcb}`}>{item.dcb}</small>}</div>
}

function categoriaHistorico(item:ItemResultadoCompra, history:MapaHistoricoPrecos, dcbCatalog:CatalogoDcb):string {
  const reference = findPriceHistoryReference(item, history, dcbCatalog)
  if (!reference) return 'missing'
  return evaluatePriceOpportunity(item.precoUnitario, reference.precoCusto)?.type || 'missing'
}

function pontuacaoOportunidadeHistorico(item:ItemResultadoCompra, history:MapaHistoricoPrecos, dcbCatalog:CatalogoDcb):number|null {
  const reference = findPriceHistoryReference(item, history, dcbCatalog)
  if (!reference || !Number.isFinite(item.precoUnitario) || !Number.isFinite(reference.precoCusto)) return null
  const preco = item.precoUnitario as number
  if (reference.precoCusto > 0) return (reference.precoCusto - preco) / reference.precoCusto * 100
  return reference.precoCusto - preco
}

export default function PaginaCotacaoOL() {
  const { user } = usarAutenticacao()
  const saved = estadoSalvo()
  const [cotacoes, setCotacoes] = useState<MapaCotacoes>(saved.cotacoes || {})
  const [pedido, setPedido] = useState<ItemPedido[]>(() => ensureOrderLineIds(saved.pedido || []))
  const [ajustesManuais, setAjustesManuais] = useState<MapaAjustes>(saved.ajustesManuais || {})
  const [productLinks, setProductLinks] = useState<MapaVinculos>(saved.productLinks || {})
  const [matchingSettings, setMatchingSettings] = useState({ autoAcceptSafe: true, ...(saved.matchingSettings || {}) })
  const [dcbCatalog, setDcbCatalog] = useState<CatalogoDcb>(saved.dcbCatalog || {})
  const [dcbInfo, setDcbInfo] = useState<DcbInfo|null>(saved.dcbInfo || null)
  const [dcbPadraoDispensada, setDcbPadraoDispensada] = useState(Boolean(saved.dcbPadraoDispensada))
  const [carregandoDcbPadrao, setCarregandoDcbPadrao] = useState(false)
  const [dcbErro, setDcbErro] = useState(false)
  const [historicoPrecos, setHistoricoPrecos] = useState<MapaHistoricoPrecos>(saved.historicoPrecos || {})
  const [historicoInfo, setHistoricoInfo] = useState<HistoricoInfo|null>(saved.historicoInfo || null)
  const [activeTab, setActiveTab] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const [notice, setNotice] = useState('')
  const [mapping, setMapping] = useState<EstadoMapeamento|null>(null)
  const [loading, setLoading] = useState('')
  const [exporting, setExporting] = useState('')
  const [clearOpen, setClearOpen] = useState(false)
  const [supplierToRemove, setSupplierToRemove] = useState('')
  const [supplierToRename, setSupplierToRename] = useState('')
  const [supplierNameDraft, setSupplierNameDraft] = useState('')
  const [supplierRenameError, setSupplierRenameError] = useState('')
  const [editingLineId, setEditingLineId] = useState('')
  const [purchaseDraft, setPurchaseDraft] = useState<RascunhoCompra>({ offerKey: '', fornecedor: '', quantidade: 1, motivo: '' })
  const [purchaseEditError, setPurchaseEditError] = useState('')
  const [resetAdjustmentsOpen, setResetAdjustmentsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('todos')
  const [onlyMissing, setOnlyMissing] = useState(false)
  const [onlyAutoAccepted, setOnlyAutoAccepted] = useState(false)
  const [onlyAdjusted, setOnlyAdjusted] = useState(false)
  const [onlyCheaperName, setOnlyCheaperName] = useState(false)
  const [historyFilter, setHistoryFilter] = useState('all')
  const [historySort, setHistorySort] = useState('default')
  const [reviewingLineId, setReviewingLineId] = useState('')
  const [matchSearch, setMatchSearch] = useState('')
  const [clearLinksOpen, setClearLinksOpen] = useState(false)

  const resultado = useMemo(() => calculateOrder(cotacoes, pedido, ajustesManuais, productLinks, matchingSettings, dcbCatalog), [ajustesManuais, cotacoes, dcbCatalog, matchingSettings, pedido, productLinks])
  const supplierList = useMemo(() => [...new Set(Object.values(cotacoes).flatMap((item) => item.ofertas.map((offer) => offer.fornecedor)))].sort((first, second) => first.localeCompare(second, 'pt-BR')), [cotacoes])
  const purchaseTabs = useMemo(() => pedido.length ? [
    { id: 'pedido', label: 'Pedido', description: 'Itens solicitados', count: pedido.length },
    { id: 'resultado', label: 'Melhor compra', description: 'Resultado calculado', count: resultado.filter((item) => item.quantidadeFinal > 0 && item.precoTotal !== null && item.status !== 'ajusteInvalido').length },
  ] : [], [pedido.length, resultado])
  const supplierTabs = useMemo(() => supplierList.length ? [
    { id: 'forn:__all__', label: 'Todos juntos', count: Object.values(cotacoes).reduce((total, item) => total + item.ofertas.length, 0) },
    ...supplierList.map((supplier) => ({
      id: `forn:${supplier}`,
      label: supplier,
      count: Object.values(cotacoes).filter((item) => item.ofertas.some((offer) => normalizeHeader(offer.fornecedor) === normalizeHeader(supplier))).length,
    })),
  ] : [], [cotacoes, supplierList])
  const tabs = useMemo(() => [...purchaseTabs, ...supplierTabs], [purchaseTabs, supplierTabs])

  useEffect(() => { window.localStorage.setItem(ARMAZENAMENTO_COTACAO_OL, JSON.stringify({ cotacoes, fornecedores: supplierList, pedido, ajustesManuais, productLinks, matchingSettings, dcbCatalog, dcbInfo, historicoPrecos, historicoInfo, dcbPadraoDispensada })) }, [ajustesManuais, cotacoes, dcbCatalog, dcbInfo, dcbPadraoDispensada, historicoInfo, historicoPrecos, matchingSettings, pedido, productLinks, supplierList])
  useEffect(() => { if (!tabs.some((tab) => tab.id === activeTab)) setActiveTab(tabs[0]?.id || '') }, [activeTab, tabs])

  useEffect(() => {
    if (Object.keys(dcbCatalog).length || dcbInfo || dcbPadraoDispensada) return
    let cancelado = false
    setCarregandoDcbPadrao(true)
    setDcbErro(false)
    void (async () => {
      try {
        const resposta = await fetch(`${import.meta.env.BASE_URL}${ARQUIVO_DCB_PADRAO}`)
        if (!resposta.ok) throw new Error('resposta invalida')
        const arquivo = new File([await resposta.blob()], ARQUIVO_DCB_PADRAO)
        const matrix = await readSpreadsheet(arquivo, 'dcb')
        if (cancelado) return
        if (!matrix.length) throw new Error('planilha vazia')
        const headerIndex = detectHeaderRow(matrix)
        const headers = (matrix[headerIndex] || []).map((header) => String(header || '').trim())
        const rows = matrix.slice(headerIndex + 1).filter((row) => row.some((cell) => String(cell || '').trim()))
        const auto = autoMapColumns(headers, rows)
        if (auto.ean === undefined || auto.dcb === undefined) throw new Error('colunas nao identificadas')
        const { catalog } = parseDcbCatalog(rows, { eanIndex: auto.ean, dcbIndex: auto.dcb })
        const total = Object.keys(catalog).length
        if (!total) throw new Error('catalogo vazio')
        if (cancelado) return
        setDcbCatalog(catalog)
        setDcbInfo({ fileName: NOME_EXIBICAO_DCB_PADRAO, importedAt: new Date().toISOString(), total, orderMatched: 0, quotationMatched: 0, origem: 'padrao' })
      } catch { if (!cancelado) setDcbErro(true) /* Sem o arquivo padrão ou sem conexão: a tela segue funcionando normalmente sem DCB. */ }
      finally { if (!cancelado) setCarregandoDcbPadrao(false) }
    })()
    return () => { cancelado = true }
  }, [dcbCatalog, dcbInfo, dcbPadraoDispensada])

  async function iniciarImportacao(kind:TipoImportacao, file?:File|null) {
    if (!file) return
    setNotice(''); setWarnings([]); setLoading(kind)
    try {
      const matrix = await readSpreadsheet(file, kind)
      if (!matrix.length) throw new Error('A planilha está vazia.')
      const headerIndex = detectHeaderRow(matrix)
      const headers = (matrix[headerIndex] || []).map((header) => String(header || '').trim())
      const rows = matrix.slice(headerIndex + 1).filter((row) => row.some((cell) => String(cell || '').trim()))
      if (!rows.length) throw new Error('Não encontrei linhas de dados após o cabeçalho.')
      const auto = autoMapColumns(headers, rows)
      const fields:CampoMapeamento[] = kind === 'cotacao'
        ? [{ key: 'ean', label: 'EAN / código de barras', required: true }, { key: 'nome', label: 'Descrição do produto', required: true }, { key: 'precoUnit', label: 'Preço unitário', required: true }, { key: 'nomeFornecedor', label: 'Nome do fornecedor', type: 'text', required: true }]
        : kind === 'dcb'
          ? [{ key: 'ean', label: 'EAN / código de barras', required: true }, { key: 'dcb', label: 'DCB / princípio ativo e apresentação', required: true }]
          : kind === 'historico'
            ? [{ key: 'ean', label: 'EAN / código de barras', required: true }, { key: 'nome', label: 'Descrição do produto (opcional)' }, { key: 'precoCusto', label: 'Último preço de custo', required: true }, { key: 'laboratorio', label: 'Laboratório (opcional)' }]
            : [{ key: 'ean', label: 'EAN (opcional)' }, { key: 'codigo', label: 'Código interno (opcional)' }, { key: 'nome', label: 'Descrição do produto', required: true }, { key: 'quantidade', label: 'Quantidade', required: true }, { key: 'laboratorio', label: 'Laboratório do produto (informativo)' }, { key: 'fornecedor', label: 'Fornecedor preferido (opcional)' }]
      const values:Record<string, string> = {}
      Object.entries(auto).forEach(([key, index]) => { values[key] = String(index) })
      if (kind === 'cotacao') values.nomeFornecedor = supplierFromFilename(file.name)
      setMapping({ kind, headers, rows, fields, values, fileName: file.name })
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Não foi possível ler a planilha.') }
    finally { setLoading('') }
  }

  function indiceMapeado(value:string|undefined):number|null { return value === '' || value === undefined ? null : Number(value) }

  function confirmarMapeamento() {
    if (!mapping) return
    const get = (key:string) => indiceMapeado(mapping.values[key])
    if (mapping.kind === 'cotacao') {
      const eanIndex = get('ean'); const nameIndex = get('nome'); const priceIndex = get('precoUnit'); const supplier = String(mapping.values.nomeFornecedor || '').trim()
      if (eanIndex === null || nameIndex === null || priceIndex === null || !supplier) { setNotice('Selecione EAN, descrição, preço e informe o fornecedor.'); return }
      let added = 0; let duplicates = 0; let invalid = 0; let replaced = 0
      const supplierKey = normalizeHeader(supplier)
      const next:MapaCotacoes = Object.fromEntries(Object.entries(cotacoes).map(([key, value]) => [key, {
        ...value,
        ofertas: value.ofertas.filter((offer) => {
          const fromSameSupplier = normalizeHeader(offer.fornecedor) === supplierKey
          if (fromSameSupplier) replaced += 1
          return !fromSameSupplier
        }),
      }]))
      mapping.rows.forEach((row) => {
        const ean = normalizeEan(row[eanIndex])
        const nome = String(row[nameIndex] || '').trim(); const precoUnitario = toNumber(row[priceIndex])
        if (!ean || !nome || precoUnitario === null || precoUnitario <= 0) { invalid += 1; return }
        if (!next[ean]) next[ean] = { ean, nome, ofertas: [] }
        const duplicate = next[ean].ofertas.find((offer) => normalizeHeader(offer.fornecedor) === supplierKey)
        if (duplicate) { duplicates += 1; if (precoUnitario < duplicate.precoUnitario) duplicate.precoUnitario = precoUnitario; return }
        next[ean].ofertas.push({ fornecedor: supplier, precoUnitario }); added += 1
      })
      const cleaned = Object.fromEntries(Object.entries(next).filter(([, item]) => item.ofertas.length))
      setCotacoes(cleaned)
      setWarnings([...(duplicates ? [`${duplicates} duplicata(s) foram ignoradas.`] : []), ...(invalid ? [`${invalid} linha(s) sem dados completos foram ignoradas.`] : [])])
      setNotice(`${added} oferta(s) de ${supplier} importada(s).${replaced ? ` A tabela anterior foi substituída (${replaced} oferta(s)).` : ''}`)
    } else if (mapping.kind === 'dcb') {
      const eanIndex = get('ean'); const dcbIndex = get('dcb')
      if (eanIndex === null || dcbIndex === null) { setNotice('Selecione o EAN e o DCB do produto.'); return }
      const { catalog, invalid, duplicates, conflicts } = parseDcbCatalog(mapping.rows, { eanIndex, dcbIndex })
      const total = Object.keys(catalog).length
      if (!total) { setNotice('Não encontrei produtos com EAN e DCB válidos.'); return }
      const orderMatched = pedido.filter((item) => catalog[normalizeEan(item.ean)]).length
      const quotationMatched = Object.keys(cotacoes).filter((ean) => catalog[normalizeEan(ean)]).length
      setDcbCatalog(catalog)
      setDcbInfo({ fileName: mapping.fileName, importedAt: new Date().toISOString(), total, orderMatched, quotationMatched, origem: 'manual' })
      setDcbPadraoDispensada(true)
      setWarnings([...(duplicates ? [`${duplicates} EAN(s) repetido(s) na base DCB.`] : []), ...(conflicts ? [`${conflicts} EAN(s) com DCB conflitante foram descartados por segurança.`] : []), ...(invalid ? [`${invalid} linha(s) sem EAN ou DCB válido foram ignoradas.`] : [])])
      setNotice(`Base DCB importada com ${total} EAN(s). ${orderMatched} item(ns) do pedido e ${quotationMatched} produto(s) cotado(s) foram identificados.`)
    } else if (mapping.kind === 'pedido') {
      const eanIndex = get('ean'); const codeIndex = get('codigo'); const nameIndex = get('nome'); const quantityIndex = get('quantidade'); const laboratoryIndex = get('laboratorio'); const supplierIndex = get('fornecedor')
      if (nameIndex === null || quantityIndex === null || (eanIndex === null && codeIndex === null)) { setNotice('Selecione nome, quantidade e ao menos um identificador (EAN ou código).'); return }
      const seen = new Set<string>(); let duplicates = 0; let invalid = 0
      const next = mapping.rows.reduce<ItemPedido[]>((items, row) => {
        const ean = (eanIndex === null ? '' : normalizeEan(row[eanIndex])) || (codeIndex === null ? '' : String(row[codeIndex] || '').trim())
        const nome = String(row[nameIndex] || '').trim(); const quantidadePedida = toNumber(row[quantityIndex]); const laboratorio = laboratoryIndex === null ? null : String(row[laboratoryIndex] || '').trim() || null; const fornecedorPreferido = supplierIndex === null ? null : String(row[supplierIndex] || '').trim() || null
        const key = `${ean}|${laboratorio || ''}|${fornecedorPreferido || ''}`
        if (!ean || !nome || !quantidadePedida) { invalid += 1; return items }
        if (seen.has(key)) { duplicates += 1; return items }
        seen.add(key); items.push({ id: createOrderLineId(), ean, nome, quantidadePedida: Math.max(0, Math.round(quantidadePedida)), laboratorio, fornecedorPreferido, preferenciaFornecedorAtiva: Boolean(fornecedorPreferido) }); return items
      }, [])
      setPedido(next); setAjustesManuais({}); setOnlyAdjusted(false); setOnlyCheaperName(false)
      setWarnings([...(duplicates ? [`${duplicates} duplicata(s) no pedido foram ignoradas.`] : []), ...(invalid ? [`${invalid} linha(s) sem dados completos foram ignoradas.`] : [])])
      setNotice(`${next.length} item(ns) de pedido importado(s). Os ajustes manuais anteriores foram limpos.`)
    } else {
      const eanIndex = get('ean'); const nameIndex = get('nome'); const costIndex = get('precoCusto'); const laboratoryIndex = get('laboratorio')
      if (eanIndex === null || costIndex === null) { setNotice('Selecione o EAN e o último preço de custo.'); return }
      const { history, invalid, duplicates } = parsePriceHistory(mapping.rows, { eanIndex, nameIndex, costIndex, laboratoryIndex })
      const total = Object.keys(history).length
      if (!total) { setNotice('Não encontrei produtos com EAN e preço de custo válidos.'); return }
      const matched = resultado.filter((item) => findPriceHistoryReference(item, history, dcbCatalog)).length
      setHistoricoPrecos(history)
      setHistoricoInfo({ fileName: mapping.fileName, importedAt: new Date().toISOString(), total, matched })
      setWarnings([...(duplicates ? [`${duplicates} EAN(s) repetido(s); foi mantido o último custo encontrado.`] : []), ...(invalid ? [`${invalid} linha(s) sem EAN ou custo válido foram ignoradas.`] : [])])
      setNotice(`${total} custo(s) histórico(s) importado(s). ${matched} produto(s) foram encontrados por EAN, DCB ou descrição equivalente.`)
    }
    setMapping(null)
  }

  function removerFornecedor(supplier:string) {
    const supplierKey = normalizeHeader(supplier)
    let removedOffers = 0
    const nextCotacoes:MapaCotacoes = Object.fromEntries(Object.entries(cotacoes).flatMap(([ean, item]) => {
      const offers = item.ofertas.filter((offer) => {
        const shouldRemove = normalizeHeader(offer.fornecedor) === supplierKey
        if (shouldRemove) removedOffers += 1
        return !shouldRemove
      })
      return offers.length ? [[ean, { ...item, ofertas: offers }] as [string, ProdutoCotado]] : []
    }))
    if (!removedOffers) { setNotice(`Não encontrei ofertas cadastradas para ${supplier}.`); setSupplierToRemove(''); return }
    let revertedAdjustments = 0
    const nextAdjustments = Object.fromEntries(Object.entries(ajustesManuais).filter(([, adjustment]) => {
      const keep = normalizeHeader(adjustment.fornecedor) !== supplierKey
      if (!keep) revertedAdjustments += 1
      return keep
    }))
    setCotacoes(nextCotacoes)
    setAjustesManuais(nextAdjustments)
    setActiveTab(pedido.length ? 'resultado' : '')
    setSupplierFilter('todos')
    setSearch('')
    setWarnings([])
    setNotice(`Tabela de ${supplier} removida: ${removedOffers} oferta(s) excluída(s).${revertedAdjustments ? ` ${revertedAdjustments} ajuste(s) voltaram ao cálculo automático.` : ''}`)
    setSupplierToRemove('')
  }

  function abrirRenomeioFornecedor(supplier:string) {
    setSupplierToRename(supplier)
    setSupplierNameDraft(supplier)
    setSupplierRenameError('')
  }

  function renomearFornecedor() {
    const previousName = supplierToRename
    const nextName = supplierNameDraft.trim()
    const previousKey = normalizeHeader(previousName)
    const nextKey = normalizeHeader(nextName)
    if (!nextName) { setSupplierRenameError('Informe o novo nome do fornecedor.'); return }
    if (nextKey !== previousKey && supplierList.some((supplier) => normalizeHeader(supplier) === nextKey)) { setSupplierRenameError('Já existe um fornecedor com esse nome.'); return }
    if (nextName === previousName) { setSupplierToRename(''); return }

    let renamedOffers = 0
    const nextCotacoes:MapaCotacoes = Object.fromEntries(Object.entries(cotacoes).map(([ean, item]) => [ean, {
      ...item,
      ofertas: item.ofertas.map((offer) => {
        if (normalizeHeader(offer.fornecedor) !== previousKey) return offer
        renamedOffers += 1
        return { ...offer, fornecedor: nextName }
      }),
    }]))
    const nextOrder = pedido.map((item) => normalizeHeader(item.fornecedorPreferido || '') === previousKey ? { ...item, fornecedorPreferido: nextName } : item)
    const nextAdjustments = Object.fromEntries(Object.entries(ajustesManuais).map(([lineId, adjustment]) => [lineId, normalizeHeader(adjustment.fornecedor) === previousKey ? { ...adjustment, fornecedor: nextName } : adjustment]))

    setCotacoes(nextCotacoes)
    setPedido(nextOrder)
    setAjustesManuais(nextAdjustments)
    setActiveTab(`forn:${nextName}`)
    setSupplierFilter((current) => normalizeHeader(current) === previousKey ? nextName : current)
    setSupplierToRename('')
    setSupplierRenameError('')
    setNotice(`${previousName} agora se chama ${nextName}. ${renamedOffers} oferta(s) atualizada(s).`)
  }

  function abrirEdicaoCompra(item:ItemResultadoCompra) {
    setEditingLineId(item.id)
    setPurchaseDraft({ offerKey: item.offerKey || '', fornecedor: item.fornecedorSelecionado || item.fornecedorAutomatico || '', quantidade: item.quantidadeFinal, motivo: item.motivoAjuste || '' })
    setPurchaseEditError('')
  }

  function salvarEdicaoCompra() {
    const item = resultado.find((row) => row.id === editingLineId)
    if (!item) { setPurchaseEditError('Não encontrei este item no pedido.'); return }
    const quantidade = Number(purchaseDraft.quantidade)
    if (!Number.isInteger(quantidade) || quantidade < 0) { setPurchaseEditError('Informe uma quantidade inteira igual ou maior que zero.'); return }
    const offers = item.ofertasDisponiveis || []
    const selected = offers.find((offer) => offer.offerKey === purchaseDraft.offerKey) || offers.find((offer) => normalizeHeader(offer.fornecedor) === normalizeHeader(purchaseDraft.fornecedor))
    if (!selected) { setPurchaseEditError('Selecione um fornecedor disponível para este produto.'); return }
    const motivo = purchaseDraft.motivo.trim()
    const isAutomatic = normalizeHeader(selected.fornecedor) === normalizeHeader(item.fornecedorAutomatico) && selected.eanOferta === item.eanOfertaAutomatico && quantidade === item.quantidadeOriginal && !motivo
    setAjustesManuais((current) => {
      const next = { ...current }
      if (isAutomatic) delete next[item.id]
      else next[item.id] = { fornecedor: selected.fornecedor, eanOferta: selected.eanOferta, quantidade, motivo }
      return next
    })
    setEditingLineId('')
    setPurchaseEditError('')
    setNotice(isAutomatic ? `${item.nome} voltou ao cálculo automático.` : `${item.nome} foi ajustado manualmente.`)
  }

  function restaurarItemCompra(lineId:string) {
    const item = resultado.find((row) => row.id === lineId)
    setAjustesManuais((current) => { const next = { ...current }; delete next[lineId]; return next })
    setEditingLineId('')
    setPurchaseEditError('')
    if (item) setNotice(`${item.nome} voltou ao cálculo automático.`)
  }

  function restaurarTodosAjustes() {
    const count = Object.keys(ajustesManuais).length
    setAjustesManuais({})
    setOnlyAdjusted(false)
    setResetAdjustmentsOpen(false)
    setNotice(`${count} ajuste(s) manual(is) foram restaurados para o cálculo automático.`)
  }

  function atualizarVinculoProduto(lineId:string, candidateEan:string, state:'approved'|'rejected'|null) {
    const item = resultado.find((row) => row.id === lineId)
    if (!item) return
    const key = productLinkId(item, candidateEan)
    setProductLinks((current) => {
      const next = { ...current }
      if (!state) delete next[key]
      else next[key] = state
      return next
    })
    setNotice(state === 'approved' ? `${item.nome}: equivalência confirmada e incluída na comparação.` : state === 'rejected' ? `${item.nome}: sugestão rejeitada e removida da comparação.` : `${item.nome}: decisão removida; o sistema voltará a avaliar o nome.`)
  }

  function avancarRevisao() {
    const proximo = filaRevisaoIds.find((id) => id !== reviewingLineId)
    if (proximo) { setReviewingLineId(proximo); setMatchSearch('') }
    else { setReviewingLineId(''); setMatchSearch(''); setNotice('Revisão concluída — não há mais correspondências pendentes.') }
  }

  function limparVinculosProdutos() {
    const count = Object.keys(productLinks).length
    setProductLinks({})
    setClearLinksOpen(false)
    setNotice(`${count} decisão(ões) de correspondência foram removidas. Os nomes voltarão ao cálculo automático.`)
  }

  function limparHistoricoPrecos() {
    setHistoricoPrecos({})
    setHistoricoInfo(null)
    setHistoryFilter('all')
    setHistorySort('default')
    setNotice('A referência de custo histórico foi removida. As cotações e o pedido foram mantidos.')
  }

  function limparDados() {
    setCotacoes({}); setPedido([]); setAjustesManuais({}); setProductLinks({}); setDcbCatalog({}); setDcbInfo(null)
    setDcbPadraoDispensada(false)
    setHistoricoPrecos({}); setHistoricoInfo(null); setWarnings([]); setOnlyMissing(false); setOnlyAutoAccepted(false)
    setOnlyAdjusted(false); setOnlyCheaperName(false); setHistoryFilter('all'); setHistorySort('default')
    setReviewingLineId(''); setNotice('Dados removidos deste dispositivo. A base DCB padrão será recarregada.'); setClearOpen(false)
    window.localStorage.removeItem(ARMAZENAMENTO_COTACAO_OL)
  }

  function limparBaseDcb() {
    setDcbCatalog({})
    setDcbInfo(null)
    setDcbPadraoDispensada(true)
    setNotice('A base DCB foi removida. O sistema voltou a comparar por EAN e descrição.')
  }

  const pedidoRows = resultado.filter((item) => matchesProductSearch(item, search) && (!onlyMissing || item.status === 'naoEncontrado' || item.status === 'revisarCorrespondencia') && (!onlyAutoAccepted || metodoAceitoAutomaticamente(item.matchMethod)))
  const baseResultRows = resultado.filter((item) => item.status !== 'naoEncontrado' && item.status !== 'revisarCorrespondencia' && matchesProductSearch({ ...item, fornecedor: item.fornecedorSelecionado || undefined }, search) && (supplierFilter === 'todos' || item.fornecedorSelecionado === supplierFilter) && (!onlyAdjusted || item.ajusteManual) && (!onlyCheaperName || item.temOfertaNomeMaisBarata) && (!onlyAutoAccepted || metodoAceitoAutomaticamente(item.matchMethod)))
  const resultRows = baseResultRows
    .filter((item) => historyFilter === 'all' || categoriaHistorico(item, historicoPrecos, dcbCatalog) === historyFilter)
    .sort((first, second) => {
      if (historySort === 'default') return 0
      const firstScore = pontuacaoOportunidadeHistorico(first, historicoPrecos, dcbCatalog)
      const secondScore = pontuacaoOportunidadeHistorico(second, historicoPrecos, dcbCatalog)
      if (firstScore === null && secondScore === null) return 0
      if (firstScore === null) return 1
      if (secondScore === null) return -1
      return historySort === 'worst' ? firstScore - secondScore : secondScore - firstScore
    })
  const purchaseRows = baseResultRows.filter((item) => item.quantidadeFinal > 0 && item.status !== 'ajusteInvalido' && item.precoTotal !== null)
  const allSuppliersActive = activeTab === 'forn:__all__'
  const activeSupplier = activeTab.startsWith('forn:') && !allSuppliersActive ? activeTab.slice(5) : ''
  const supplierRows = activeTab.startsWith('forn:') ? Object.values(cotacoes)
    .flatMap((item) => item.ofertas
      .filter((offer) => allSuppliersActive || normalizeHeader(offer.fornecedor) === normalizeHeader(activeSupplier))
      .map((offer) => ({ ...item, offer })))
    .filter((item) => matchesProductSearch({ ...item, fornecedor: item.offer.fornecedor }, search))
    .sort((first, second) => normalizeHeader(first.nome).localeCompare(normalizeHeader(second.nome), 'pt-BR') || first.offer.precoUnitario - second.offer.precoUnitario || first.offer.fornecedor.localeCompare(second.offer.fornecedor, 'pt-BR')) : []
  const supplierRowStatus = (item:{ ean:string; offer:{ fornecedor:string } }) => getOfferComparisonStatus(resultado, item.offer.fornecedor, item.ean)
  const supplierRowIsCompared = (item:{ ean:string; offer:{ fornecedor:string } }) => supplierRowStatus(item) !== 'unused'
  const supplierProductCount = new Set(supplierRows.map((item) => item.ean)).size
  const supplierResultCount = new Set(supplierRows.map((item) => normalizeHeader(item.offer.fornecedor))).size
  const supplierComparedCount = supplierRows.filter(supplierRowIsCompared).length
  const exportRows:Record<string, unknown>[] = activeTab === 'pedido' ? pedidoRows.map((item) => ({ EAN_PEDIDO: item.ean, PRODUTO_PEDIDO: item.nome, LABORATORIO_PEDIDO: item.laboratorio || '', EAN_OFERTA: item.eanOferta || '', PRODUTO_OFERTA: item.nomeOferta || '', CORRESPONDENCIA: rotuloMetodo(item.matchMethod), QUANTIDADE_ORIGINAL: item.quantidadeOriginal, QUANTIDADE_FINAL: item.quantidadeFinal, PREFERIDO: item.preferenciaFornecedorAtiva ? item.fornecedorPreferido || '' : '', AJUSTE_MANUAL: item.ajusteManual ? 'Sim' : 'Não', MOTIVO: item.motivoAjuste, STATUS: item.status }))
    : activeTab === 'resultado' ? purchaseRows.map((item) => ({ EAN_PEDIDO: item.ean, PRODUTO_PEDIDO: item.nome, LABORATORIO_PEDIDO: item.laboratorio || '', EAN_OFERTA: item.eanOferta || '', PRODUTO_OFERTA: item.nomeOferta || '', CORRESPONDENCIA: rotuloMetodo(item.matchMethod), QUANTIDADE_ORIGINAL: item.quantidadeOriginal, QUANTIDADE_FINAL: item.quantidadeFinal, FORNECEDOR: item.fornecedorSelecionado, PRECO_UNITARIO: item.precoUnitario, PRECO_TOTAL: item.precoTotal, AJUSTE_MANUAL: item.ajusteManual ? 'Sim' : 'Não', MOTIVO: item.motivoAjuste }))
      : supplierRows.map((item) => { const status = supplierRowStatus(item); return { FORNECEDOR: item.offer.fornecedor, EAN: item.ean, DESCRICAO: item.nome, PRECO_UNITARIO: item.offer.precoUnitario, STATUS: status === 'winner' ? 'Melhor compra' : status === 'compared' ? 'Alternativa comparada' : 'Não usado' } })
  const total = purchaseRows.reduce((sum, item) => sum + (item.precoTotal || 0), 0)
  const automaticTotal = baseResultRows.reduce((sum, item) => sum + (item.precoTotalAutomatico || 0), 0)
  const adjustmentImpact = total - automaticTotal
  const adjustedCount = resultado.filter((item) => item.ajusteManual).length
  const breakdown = purchaseRows.reduce<Record<string, number>>((items, item) => ({ ...items, [item.fornecedorSelecionado || '']: (items[item.fornecedorSelecionado || ''] || 0) + (item.precoTotal || 0) }), {})
  const filterLabel = supplierFilter === 'todos' ? 'Todos os fornecedores' : supplierFilter
  const editingItem = resultado.find((item) => item.id === editingLineId)
  const reviewingItem = resultado.find((item) => item.id === reviewingLineId)
  const filaRevisaoIds = resultado.filter((item) => item.sugestoesCorrespondencia.length > 0).map((item) => item.id)
  const posicaoFilaRevisao = filaRevisaoIds.indexOf(reviewingLineId)
  const reviewPendingCount = filaRevisaoIds.length
  const autoAcceptedCount = resultado.filter((item) => metodoAceitoAutomaticamente(item.matchMethod)).length
  const cheaperNameOpportunityCount = resultado.filter((item) => item.temOfertaNomeMaisBarata).length
  const cheaperNameOpportunitySavings = resultado.reduce((sum, item) => sum + (item.temOfertaNomeMaisBarata ? item.economiaNomeTotal : 0), 0)
  const savedLinkCount = Object.keys(productLinks).length
  const historyCount = Object.keys(historicoPrecos).length
  const historyStats = baseResultRows.reduce((stats, item) => { const key = categoriaHistorico(item, historicoPrecos, dcbCatalog) as 'good'|'stable'|'high'|'missing'; return { ...stats, [key]: stats[key] + 1 } }, { good: 0, stable: 0, high: 0, missing: 0 })
  const historyMatchedCount = historyStats.good + historyStats.stable + historyStats.high

  function paginasDaCompra():HTMLCanvasElement[] {
    const pageSize = 14
    const totalPages = Math.ceil(purchaseRows.length / pageSize)
    return Array.from({ length: totalPages }, (_, index) => paginaCompra(purchaseRows.slice(index * pageSize, (index + 1) * pageSize) as LinhaCompraExportavel[], filterLabel, index + 1, totalPages))
  }

  async function exportarCompra(format:'excel'|'pdf'|'png') {
    if (!purchaseRows.length) return
    setExporting(format)
    const filename = `pedido-melhor-compra-${filterLabel.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'completo'}`
    try {
      if (format === 'excel') {
        const { default: ExcelJS } = await import('exceljs')
        const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet('Melhor compra')
        sheet.columns = [{ header: 'EAN do pedido', key: 'eanPedido', width: 18 }, { header: 'Produto do pedido', key: 'produtoPedido', width: 38 }, { header: 'EAN da oferta', key: 'eanOferta', width: 18 }, { header: 'Produto da oferta', key: 'produtoOferta', width: 38 }, { header: 'Correspondência', key: 'correspondencia', width: 20 }, { header: 'Qtd. original', key: 'quantidadeOriginal', width: 15 }, { header: 'Qtd. final', key: 'quantidadeFinal', width: 13 }, { header: 'Fornecedor', key: 'fornecedor', width: 22 }, { header: 'Preço unitário', key: 'unitario', width: 18 }, { header: 'Preço total', key: 'total', width: 18 }, { header: 'Ajuste manual', key: 'ajuste', width: 15 }, { header: 'Motivo', key: 'motivo', width: 28 }]
        purchaseRows.forEach((item) => sheet.addRow({ eanPedido: item.ean, produtoPedido: item.nome, eanOferta: item.eanOferta || '', produtoOferta: item.nomeOferta || '', correspondencia: rotuloMetodo(item.matchMethod), quantidadeOriginal: item.quantidadeOriginal, quantidadeFinal: item.quantidadeFinal, fornecedor: item.fornecedorSelecionado, unitario: item.precoUnitario, total: item.precoTotal, ajuste: item.ajusteManual ? 'Sim' : 'Não', motivo: item.motivoAjuste }))
        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }; sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF12634A' } }; sheet.views = [{ state: 'frozen', ySplit: 1 }]
        sheet.getColumn('unitario').numFmt = 'R$ #,##0.00'; sheet.getColumn('total').numFmt = 'R$ #,##0.00'
        const totalRow = sheet.addRow({ produtoPedido: `TOTAL - ${filterLabel}`, total }); totalRow.font = { bold: true }; totalRow.getCell('total').numFmt = 'R$ #,##0.00'
        salvarBlob(new Blob([await workbook.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${filename}.xlsx`)
      } else {
        const pages = paginasDaCompra()
        if (format === 'pdf') salvarBlob(await canvasesParaPdfBlob(pages), `${filename}.pdf`)
        else {
          const spacing = 28; const image = document.createElement('canvas'); image.width = pages[0].width; image.height = pages.reduce((height, page) => height + page.height, spacing * Math.max(0, pages.length - 1))
          const context = image.getContext('2d')
          if (context) {
            context.fillStyle = '#f5f7f6'; context.fillRect(0, 0, image.width, image.height)
            let y = 0; pages.forEach((page) => { context.drawImage(page, 0, y); y += page.height + spacing })
          }
          salvarBlob(await canvasParaBlob(image), `${filename}.png`)
        }
      }
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Não foi possível gerar a exportação.') }
    finally { setExporting('') }
  }

  if (acessoBloqueado(user?.accessAllowed)) return <div className="page">
    <section className="card assinatura-bloqueio">
      <div className="assinatura-bloqueio-icone"><Lock/></div>
      <h1>Seu período de teste terminou</h1>
      <p>A Cotação para OL fica pausada até a assinatura. As tabelas que você já importou continuam salvas neste navegador e voltam assim que o acesso for liberado.</p>
      <div className="assinatura-bloqueio-acoes">
        <a className="button button-primary" href={LINK_WHATSAPP_ASSINATURA} target="_blank" rel="noopener noreferrer">Assinar pelo WhatsApp</a>
      </div>
    </section>
  </div>

  return <div className="page">
    <div className="page-header">
      <div><span className="eyebrow green">Compras inteligentes</span><h1>Cotação para OL</h1><p>Compare fornecedores, encontre o menor preço por item e monte um pedido de compra mais econômico.</p></div>
    </div>
    {notice && <div className="alert alert-success" role="status">{notice}<button type="button" className="ol-alert-close" onClick={() => setNotice('')}><X size={15}/></button></div>}
    {warnings.map((warning) => <div className="alert alert-warning" key={warning}>{warning}</div>)}
    <div className="ol-actions">
      <label className="button button-primary" title="Envie a tabela de preços de UM fornecedor (com EAN, descrição e preço unitário). Pode importar quantos fornecedores quiser, um arquivo de cada vez — cada um aparece depois como uma aba separada."><Upload size={18}/>{loading === 'cotacao' ? 'Lendo planilha...' : 'Importar fornecedor'}<input type="file" accept=".xls,.xlsx" onChange={(event) => void iniciarImportacao('cotacao', event.target.files?.[0])}/></label>
      <label className="button button-secondary" title="Envie a lista de produtos que você quer comprar, com a quantidade de cada um. É contra essa lista que o sistema compara os preços de todos os fornecedores já importados."><Upload size={18}/>{loading === 'pedido' ? 'Lendo planilha...' : 'Importar pedido'}<input type="file" accept=".xls,.xlsx" onChange={(event) => void iniciarImportacao('pedido', event.target.files?.[0])}/></label>
      <button type="button" className="button button-ghost" disabled={!exportRows.length} title="Baixa em CSV os dados exibidos na aba e no filtro atuais." onClick={() => baixarCsv(exportRows, 'cotacao_para_ol.csv')}><ArrowDownToLine size={18}/>Exportar aba</button>
      <button type="button" className="button button-danger-soft" title="Apaga as tabelas de fornecedores, o pedido e os ajustes salvos neste dispositivo. Não afeta outros computadores." onClick={() => setClearOpen(true)}><Trash2 size={18}/>Limpar dados</button>
    </div>
    <div className="card ol-panel">
      <div>
        <span className="eyebrow green">Base de equivalência DCB</span>
        <b>{carregandoDcbPadrao
          ? <><LoaderCircle size={15} className="spin"/> Carregando a base padrão de DCB…</>
          : dcbInfo
            ? `${dcbInfo.total} EANs prontos para comparar por princípio ativo`
            : dcbErro
              ? 'Não foi possível carregar a base padrão'
              : 'Nenhuma base de DCB carregada'}</b>
        <small className="ol-dcb-explainer"><Info size={13}/> DCB é o nome padronizado do princípio ativo (ex.: dipirona, paracetamol). Com essa base, o sistema reconhece que produtos de fornecedores diferentes são o mesmo remédio — mesmo com nomes e marcas diferentes — e escolhe sozinho a oferta mais barata entre eles.</small>
        <small>{carregandoDcbPadrao
          ? 'Baixando e organizando os dados por princípio ativo. Isso só acontece uma vez, na primeira vez que você abre esta tela.'
          : dcbInfo
            ? `${dcbInfo.fileName}${dcbInfo.origem === 'padrao' ? ' · carregada automaticamente' : ''} · produtos com o mesmo DCB disputam o menor preço entre si automaticamente`
            : dcbErro
              ? 'Não consegui baixar a base padrão agora. Você pode tentar de novo mais tarde ou importar sua própria planilha EAN → DCB.'
              : 'A base é opcional. Sem ela, o sistema compara os produtos só por EAN e nome.'}</small>
      </div>
      <div><label className="button button-secondary">{loading === 'dcb' ? 'Lendo base...' : dcbInfo ? 'Atualizar DCB' : 'Importar DCB'}<input type="file" accept=".xls,.xlsx" onChange={(event) => { void iniciarImportacao('dcb', event.target.files?.[0]); event.target.value = '' }}/></label>{dcbInfo && <button type="button" className="button button-ghost" onClick={limparBaseDcb}>Remover base</button>}</div>
    </div>
    {cheaperNameOpportunityCount > 0 && <div className="ol-opportunity" role="alert">
      <div><span className="eyebrow warning">EAN diferente com preço menor</span><b>{cheaperNameOpportunityCount} item(ns) têm descrição equivalente e podem economizar até {formatBRL(cheaperNameOpportunitySavings)}.</b><small>Confira a apresentação e o EAN da oferta antes de fechar o pedido.</small></div>
      <button type="button" className="button button-primary" onClick={() => { setActiveTab('resultado'); setOnlyCheaperName(true); setOnlyAdjusted(false); setSupplierFilter('todos'); setSearch('') }}>Revisar oportunidades</button>
    </div>}
    {!tabs.length ? <EstadoVazio title="Comece por uma planilha" description="Importe uma tabela de fornecedor e depois o seu pedido. O sistema permitirá conferir o mapeamento das colunas antes de salvar."/> : <>
      {!!purchaseTabs.length && <div className="tabs">{purchaseTabs.map((tab) => <button type="button" key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => { setActiveTab(tab.id); setSearch(''); setOnlyMissing(false); setOnlyAutoAccepted(false); setOnlyAdjusted(false); setOnlyCheaperName(false); setSupplierFilter('todos') }}>{tab.id === 'pedido' ? <ListChecks size={16}/> : <Check size={16}/>}<span>{tab.label}</span><span className="mini-tag">{tab.count}</span></button>)}</div>}
      {!!supplierTabs.length && <div className="tabs">{supplierTabs.map((tab) => <button type="button" key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => { setActiveTab(tab.id); setSearch(''); setOnlyMissing(false); setOnlyAdjusted(false); setOnlyCheaperName(false); setSupplierFilter('todos') }}>{tab.label}<span className="mini-tag">{tab.count}</span></button>)}</div>}

      <div className="card ol-panel ol-panel-compact"><div><span className="eyebrow green">Correspondência inteligente</span><b>Aceitar automaticamente equivalências seguras</b><small>Somente quando princípio ativo, dosagem, embalagem e liberação coincidirem. Casos ambíguos continuam em revisão.</small></div>
        <label className="ol-switch"><input type="checkbox" checked={matchingSettings.autoAcceptSafe} onChange={(event) => { const enabled = event.target.checked; setMatchingSettings({ autoAcceptSafe: enabled }); setOnlyAutoAccepted(false); setNotice(enabled ? 'Aceitação automática segura ativada.' : 'Aceitação automática desativada; as equivalências voltarão para revisão.') }}/><span/>{matchingSettings.autoAcceptSafe ? 'Ativada' : 'Desativada'}</label>
      </div>

      <div className="toolbar ol-toolbar">
        <label className="search"><Search size={18}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome ou código..."/></label>
        {activeTab === 'pedido' && <>
          <label className="ol-check" title="Mostra só os itens do pedido em que nenhum fornecedor importado tem uma oferta parecida."><input type="checkbox" checked={onlyMissing} onChange={(event) => setOnlyMissing(event.target.checked)}/> Apenas não encontrados</label>
          {autoAcceptedCount > 0 && <label className="ol-check ol-check-accent" title="Mostra só os itens cuja correspondência por nome foi aceita sozinha pelo sistema (sem você revisar), porque 'Aceitar automaticamente equivalências seguras' está ativada."><input type="checkbox" checked={onlyAutoAccepted} onChange={(event) => { setOnlyAutoAccepted(event.target.checked); if (event.target.checked) setOnlyMissing(false) }}/> Aceitas automaticamente ({autoAcceptedCount})</label>}
          {reviewPendingCount > 0 && <button type="button" className="button button-secondary" onClick={() => { const first = resultado.find((item) => item.sugestoesCorrespondencia.length); setReviewingLineId(first?.id || ''); setMatchSearch('') }}><ScanSearch size={16}/>Revisar correspondências ({reviewPendingCount})</button>}
          {savedLinkCount > 0 && <button type="button" className="button button-ghost" onClick={() => setClearLinksOpen(true)}>Limpar vínculos ({savedLinkCount})</button>}
        </>}
        {activeTab === 'resultado' && <>
          <select value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)}><option value="todos">Todos os fornecedores</option>{supplierList.map((supplier) => <option key={supplier}>{supplier}</option>)}</select>
          {autoAcceptedCount > 0 && <label className="ol-check ol-check-accent" title="Mostra só os itens cuja correspondência por nome foi aceita sozinha pelo sistema, sem revisão manual."><input type="checkbox" checked={onlyAutoAccepted} onChange={(event) => setOnlyAutoAccepted(event.target.checked)}/> Aceitas automaticamente ({autoAcceptedCount})</label>}
          <label className="ol-check" title="Mostra só os itens em que você trocou manualmente o fornecedor, a oferta ou a quantidade escolhida pelo sistema."><input type="checkbox" checked={onlyAdjusted} onChange={(event) => setOnlyAdjusted(event.target.checked)}/> Apenas ajustados</label>
          {cheaperNameOpportunityCount > 0 && <label className="ol-check ol-check-warning" title="Mostra só os itens em que existe uma oferta mais barata com EAN diferente do pedido (mesmo produto, código diferente). Vale conferir antes de fechar a compra."><input type="checkbox" checked={onlyCheaperName} onChange={(event) => setOnlyCheaperName(event.target.checked)}/> EAN diferente mais barato ({cheaperNameOpportunityCount})</label>}
          {historyCount > 0 && <>
            <select value={historyFilter} onChange={(event) => setHistoryFilter(event.target.value)} aria-label="Filtrar oportunidade de preço" title="Compara o preço desta compra com o último custo pago (planilha de histórico importada). Não muda o total nem a exportação, só o que aparece na tela."><option value="all">Todos os itens ({baseResultRows.length})</option><option value="good">Comprando mais barato ({historyStats.good})</option><option value="stable">Mesmo preço ({historyStats.stable})</option><option value="high">Comprando mais caro ({historyStats.high})</option><option value="missing">Sem histórico ({historyStats.missing})</option></select>
            <select value={historySort} onChange={(event) => setHistorySort(event.target.value)} aria-label="Ordenar oportunidade de preço" title="Ordena a lista pela diferença entre o preço desta compra e o último custo pago."><option value="default">Ordem do pedido</option><option value="worst">Pior → melhor oportunidade</option><option value="best">Melhor → pior oportunidade</option></select>
          </>}
          {adjustedCount > 0 && <button type="button" className="button button-ghost" title="Desfaz todos os ajustes manuais de uma vez: fornecedor, oferta e quantidade voltam ao cálculo automático de menor preço em todos os itens." onClick={() => setResetAdjustmentsOpen(true)}><RotateCcw size={16}/>Restaurar cálculo</button>}
        </>}
        {activeSupplier && <div className="header-actions"><button type="button" className="button button-secondary" title="Muda o nome deste fornecedor em todas as ofertas e preferências já importadas." onClick={() => abrirRenomeioFornecedor(activeSupplier)}><PenLine size={16}/>Renomear</button><button type="button" className="button button-danger-soft" title="Remove a tabela deste fornecedor da comparação. O pedido continua salvo." onClick={() => setSupplierToRemove(activeSupplier)}><Trash2 size={16}/>Excluir</button></div>}
      </div>

      {activeTab === 'pedido' && <>
        <div className="stats-grid ol-kpis"><Stat label="Itens no pedido" value={String(pedido.length)}/><Stat label="Encontrados" value={String(resultado.filter((item) => item.precoUnitario !== null).length)} tone="green"/><Stat label="Para revisar" value={String(resultado.filter((item) => item.status === 'revisarCorrespondencia').length)}/><Stat label="Não encontrados" value={String(resultado.filter((item) => item.status === 'naoEncontrado').length)} tone="danger"/></div>
        <TabelaOL headers={['Código', 'Medicamento', 'Laboratório', 'Qtd. original', 'Qtd. final', 'Preferência', 'Compra', 'Correspondência', 'Ação']} rows={pedidoRows.map((item) => [item.ean, item.nome, item.laboratorio || '—', item.quantidadeOriginal, item.quantidadeFinal, item.preferenciaFornecedorAtiva ? item.fornecedorPreferido : 'Menor preço', <StatusCompra item={item}/>, <BadgeCorrespondencia item={item}/>, <button type="button" key="acao" className="row-link" title="Revisar" onClick={() => { setReviewingLineId(item.id); setMatchSearch('') }}><ScanSearch size={16}/></button>])}/>
      </>}

      {activeTab === 'resultado' && <>
        <div className="stats-grid ol-kpis"><Stat label="Total final" value={formatBRL(total)} tone="green" highlight/><Stat label="Impacto dos ajustes" value={`${adjustmentImpact > 0 ? '+' : ''}${formatBRL(adjustmentImpact)}`} tone={adjustmentImpact > 0 ? 'danger' : adjustmentImpact < 0 ? 'green' : undefined}/><Stat label="Ajustes manuais" value={String(adjustedCount)}/><Stat label="Itens para comprar" value={String(purchaseRows.length)}/></div>
        <div className="card ol-panel ol-panel-compact"><div><span className="eyebrow green">Histórico de preço · opcional</span><b>{historyCount ? `${historyMatchedCount} comparados · ${historyStats.good} mais baratos · ${historyStats.high} mais caros${historyFilter !== 'all' ? ` · ${resultRows.length} exibidos` : ''}` : 'Compare a cotação com o último custo pago'}</b><small>{historyCount ? `${historicoInfo?.fileName || 'Planilha de estoque'} · ${historyCount} referências importadas · busca por EAN, DCB e descrição equivalente · os filtros não alteram totais ou exportações` : 'Envie o relatório de estoque depois de calcular a Melhor compra. Esta informação não entra nas exportações.'}</small></div>
          <div><label className="button button-secondary">{loading === 'historico' ? 'Lendo custos...' : historyCount ? 'Atualizar histórico' : 'Importar custo anterior'}<input type="file" accept=".xls,.xlsx" onChange={(event) => { void iniciarImportacao('historico', event.target.files?.[0]); event.target.value = '' }}/></label>{historyCount > 0 && <button type="button" className="button button-ghost" onClick={limparHistoricoPrecos}>Remover referência</button>}</div>
        </div>
        <div className="card ol-panel ol-panel-compact"><div><span className="eyebrow green">Exportar melhor compra</span><b>Filtro atual: {filterLabel}{onlyAdjusted ? ' · apenas ajustados' : ''}{onlyCheaperName ? ' · EAN diferente mais barato' : ''}</b></div>
          <div className="ol-export-actions"><button type="button" className="button button-primary" disabled={!purchaseRows.length || Boolean(exporting)} onClick={() => void exportarCompra('png')}>{exporting === 'png' ? 'Gerando...' : 'Imagem PNG'}</button><button type="button" className="button button-secondary" disabled={!purchaseRows.length || Boolean(exporting)} onClick={() => void exportarCompra('pdf')}>{exporting === 'pdf' ? 'Gerando...' : 'PDF'}</button><button type="button" className="button button-secondary" disabled={!purchaseRows.length || Boolean(exporting)} onClick={() => void exportarCompra('excel')}>{exporting === 'excel' ? 'Gerando...' : 'Excel'}</button></div>
        </div>
        <TabelaOL headers={['EAN pedido', 'Medicamento', 'Quantidade', 'Fornecedor', 'Preço unit.', 'Histórico de preço', 'Preço total', 'Correspondência', 'Status', 'Ação']} rows={resultRows.map((item) => [
          item.ean,
          <div className="ol-product-cell" key="produto"><b>{item.nome}</b>{(item.eanOferta !== item.ean || normalizeHeader(item.nomeOferta) !== normalizeHeader(item.nome)) && <small className="ol-offer-source">Oferta: {item.nomeOferta} · EAN {item.eanOferta}</small>}{item.temOfertaNomeMaisBarata && item.melhorOfertaNome && <small className="ol-cheaper-hint">EAN diferente: {item.melhorOfertaNome.fornecedor} por {formatBRL(item.melhorOfertaNome.precoUnitario)} · economia de {formatBRL(item.economiaNomeTotal)}</small>}{item.motivoAjuste && <small>{item.motivoAjuste}</small>}</div>,
          item.ajusteManual && item.quantidadeOriginal !== item.quantidadeFinal ? <span className="ol-quantity-change" key="qtd"><s>{item.quantidadeOriginal}</s><b>{item.quantidadeFinal}</b></span> : item.quantidadeFinal,
          item.fornecedorSelecionado || '—',
          formatBRL(item.precoUnitario),
          <CelulaHistorico key="historico" item={item} reference={findPriceHistoryReference(item, historicoPrecos, dcbCatalog)}/>,
          formatBRL(item.precoTotal),
          <BadgeCorrespondencia key="badge" item={item}/>,
          <StatusCompra key="status" item={item}/>,
          <div className="ol-row-actions" key="acoes">{item.temOfertaNomeMaisBarata && <button type="button" className="row-link" title="Revisar EAN" onClick={() => { setReviewingLineId(item.id); setMatchSearch('') }}><ScanSearch size={16}/></button>}<button type="button" className="row-link" title="Editar" onClick={() => abrirEdicaoCompra(item)}><PenLine size={16}/></button></div>,
        ])}/>
        <div className="ol-total-bar"><b>Total: {formatBRL(total)}</b>{Object.entries(breakdown).map(([supplier, value]) => <span key={supplier}>{supplier}: {formatBRL(value)}</span>)}</div>
      </>}

      {(activeSupplier || allSuppliersActive) && <>
        {allSuppliersActive && <div className="card ol-panel ol-panel-compact"><div><span className="eyebrow green">Pesquisa unificada</span><b>{search ? `Resultados semelhantes a "${search}"` : 'Todos os produtos de todos os fornecedores'}</b><small>Pesquise por nome completo, parte do nome ou EAN. As ofertas são organizadas por descrição e menor preço.</small></div><span className="mini-tag">{supplierRows.length} oferta(s)</span></div>}
        <div className="stats-grid ol-kpis">
          <Stat label={allSuppliersActive ? 'Ofertas encontradas' : 'Produtos cotados'} value={String(supplierRows.length)}/>
          {allSuppliersActive && <Stat label="Produtos diferentes" value={String(supplierProductCount)}/>}
          <Stat label={allSuppliersActive ? 'Fornecedores' : 'No comparativo'} value={String(allSuppliersActive ? supplierResultCount : supplierComparedCount)} tone={!allSuppliersActive ? 'green' : undefined}/>
          {allSuppliersActive && <Stat label="Ofertas no comparativo" value={String(supplierComparedCount)} tone="green"/>}
        </div>
        <TabelaOL headers={allSuppliersActive ? ['Fornecedor', 'EAN', 'Descrição', 'Preço', 'Status'] : ['EAN', 'Descrição', 'Preço', 'Status']} rows={supplierRows.map((item) => {
          const status = supplierRowStatus(item)
          const badge = status === 'winner' ? <Status type="success">Melhor compra</Status> : status === 'compared' ? <Status type="warning">Alternativa comparada</Status> : <Status type="neutral">Não usado</Status>
          return allSuppliersActive ? [<b className="ol-supplier-name" key="fornecedor">{item.offer.fornecedor}</b>, item.ean, item.nome, formatBRL(item.offer.precoUnitario), badge] : [item.ean, item.nome, formatBRL(item.offer.precoUnitario), badge]
        })}/>
      </>}
    </>}

    {mapping && <DialogoMapeamento mapping={mapping} onChange={(key, value) => setMapping((current) => current && ({ ...current, values: { ...current.values, [key]: value } }))} onCancel={() => setMapping(null)} onConfirm={confirmarMapeamento}/>}
    {editingItem && <DialogoEdicaoCompra item={editingItem} offers={editingItem.ofertasDisponiveis || []} draft={purchaseDraft} error={purchaseEditError} onChange={(key, value) => { setPurchaseDraft((current) => ({ ...current, [key]: value })); setPurchaseEditError('') }} onCancel={() => { setEditingLineId(''); setPurchaseEditError('') }} onSave={salvarEdicaoCompra} onRestore={() => restaurarItemCompra(editingItem.id)}/>}
    {reviewingItem && <DialogoRevisaoCorrespondencia item={reviewingItem} products={Object.values(cotacoes)} productLinks={productLinks} search={matchSearch} onSearch={setMatchSearch} onDecision={(ean, state) => atualizarVinculoProduto(reviewingItem.id, ean, state)} onClose={() => { setReviewingLineId(''); setMatchSearch('') }} filaPosicao={posicaoFilaRevisao >= 0 ? posicaoFilaRevisao + 1 : null} filaTotal={filaRevisaoIds.length} onAvancar={avancarRevisao}/>}

    {resetAdjustmentsOpen && <div className="modal-backdrop"><section className="modal"><span className="eyebrow green">Restaurar cálculo</span><h2>Remover todos os ajustes manuais?</h2><p>Os fornecedores e as quantidades voltarão aos valores calculados automaticamente. O pedido e as tabelas importadas continuarão salvos.</p><div className="modal-actions"><button type="button" className="button button-ghost" onClick={() => setResetAdjustmentsOpen(false)}>Cancelar</button><button type="button" className="button button-danger-soft" onClick={restaurarTodosAjustes}>Restaurar todos</button></div></section></div>}
    {supplierToRename && <div className="modal-backdrop"><section className="modal"><span className="eyebrow green">Editar fornecedor</span><h2>Renomear {supplierToRename}</h2><p>O novo nome será aplicado às ofertas e às preferências existentes no pedido.</p><label className="ol-modal-field">Nome do fornecedor<input autoFocus value={supplierNameDraft} onChange={(event) => { setSupplierNameDraft(event.target.value); setSupplierRenameError('') }} onKeyDown={(event) => { if (event.key === 'Enter') renomearFornecedor() }}/></label>{supplierRenameError && <div className="field-error" role="alert">{supplierRenameError}</div>}<div className="modal-actions"><button type="button" className="button button-ghost" onClick={() => { setSupplierToRename(''); setSupplierRenameError('') }}>Cancelar</button><button type="button" className="button button-primary" onClick={renomearFornecedor}>Salvar novo nome</button></div></section></div>}
    {supplierToRemove && <div className="modal-backdrop"><section className="modal"><h2>Excluir tabela de {supplierToRemove}?</h2><p>As ofertas desse fornecedor serão removidas da comparação. Seu pedido continuará salvo.</p><div className="modal-actions"><button type="button" className="button button-ghost" onClick={() => setSupplierToRemove('')}>Cancelar</button><button type="button" className="button button-danger-soft" onClick={() => removerFornecedor(supplierToRemove)}>Excluir fornecedor</button></div></section></div>}
    {clearLinksOpen && <div className="modal-backdrop"><section className="modal"><span className="eyebrow green">Correspondências salvas</span><h2>Limpar todos os vínculos?</h2><p>Confirmações e rejeições feitas por nome serão apagadas. EANs exatos e correspondências automáticas continuarão funcionando.</p><div className="modal-actions"><button type="button" className="button button-ghost" onClick={() => setClearLinksOpen(false)}>Cancelar</button><button type="button" className="button button-danger-soft" onClick={limparVinculosProdutos}>Limpar vínculos</button></div></section></div>}
    {clearOpen && <div className="modal-backdrop"><section className="modal"><h2>Limpar dados?</h2><p>As cotações e o pedido salvos neste dispositivo serão apagados.</p><div className="modal-actions"><button type="button" className="button button-ghost" onClick={() => setClearOpen(false)}>Cancelar</button><button type="button" className="button button-danger-soft" onClick={limparDados}>Sim, limpar</button></div></section></div>}
  </div>
}

function Stat({ label, value, tone, highlight }:{ label:string; value:string; tone?:'green'|'danger'; highlight?:boolean }) {
  return <div className={`stat-card ${highlight ? 'ol-stat-highlight' : ''}`}><div><span>{label}</span><strong className={tone === 'green' ? 'green-text' : tone === 'danger' ? 'ol-danger-text' : ''}>{value}</strong></div></div>
}

function TabelaOL({ headers, rows }:{ headers:string[]; rows:ReactNode[][] }) {
  return <div className="card table-card"><div className="table-wrap"><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>
    {rows.length ? rows.map((row, index) => <tr key={index}>{row.map((cell, column) => <td key={column}>{cell}</td>)}</tr>) : <tr><td colSpan={headers.length} className="muted">Nenhum registro corresponde ao filtro.</td></tr>}
  </tbody></table></div></div>
}

function CelulaHistorico({ item, reference }:{ item:ItemResultadoCompra; reference:ReturnType<typeof findPriceHistoryReference> }) {
  if (!reference) return <span className="ol-history-missing">Sem histórico compatível</span>
  const comparison = evaluatePriceOpportunity(item.precoUnitario, reference.precoCusto)
  const percent = comparison?.percent === null || comparison?.percent === undefined ? '' : `${comparison.percent.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
  const detail = comparison?.type === 'good' ? `${formatBRL(comparison.difference)} abaixo · ${percent}` : comparison?.type === 'high' ? `${formatBRL(comparison.difference)} acima · ${percent}` : comparison ? 'Sem diferença' : 'Preço atual indisponível'
  const sourceLabel = reference.referenceMethod === 'offer-ean' ? 'Último custo · EAN da oferta'
    : reference.referenceMethod === 'order-ean' ? 'Último custo · EAN do pedido'
      : reference.referenceMethod === 'dcb' ? 'Último custo · mesmo DCB'
        : reference.referenceMethod === 'converted-pack' ? `Custo proporcional · ${reference.referencePack} para ${reference.targetPack} un.`
          : 'Último custo · descrição equivalente'
  const originalCost = reference.referenceMethod === 'converted-pack' && reference.precoCustoOriginal !== undefined ? `Custo original ${formatBRL(reference.precoCustoOriginal)}` : ''
  return <div className="ol-history-cell" title={[reference.nome, reference.laboratorio, `EAN ${reference.ean}`, originalCost].filter(Boolean).join(' · ')}><small>{sourceLabel}</small><b>{formatBRL(reference.precoCusto)}</b><span className={comparison?.type || 'missing'}><strong>{comparison?.label || 'Sem comparação'}</strong><em>{detail}</em></span></div>
}

function DialogoEdicaoCompra({ item, offers, draft, error, onChange, onCancel, onSave, onRestore }:{
  item:ItemResultadoCompra; offers:OfertaEnriquecida[]; draft:RascunhoCompra; error:string
  onChange:(key:keyof RascunhoCompra, value:string) => void; onCancel:() => void; onSave:() => void; onRestore:() => void
}) {
  const sortedOffers = [...offers].sort((first, second) => first.precoUnitario - second.precoUnitario)
  const bestPrice = sortedOffers[0]?.precoUnitario || 0
  const quantity = Number.isFinite(Number(draft.quantidade)) ? Math.max(0, Number(draft.quantidade)) : 0
  return <div className="modal-backdrop"><section className="modal ol-purchase-editor">
    <span className="eyebrow green">Ajustar melhor compra</span><h2>{item.nome}</h2><p>Código {item.ean} · quantidade original {item.quantidadeOriginal}</p>
    <label className="ol-modal-field">Quantidade final<input type="number" min="0" step="1" value={draft.quantidade} onChange={(event) => onChange('quantidade', event.target.value)}/></label>
    <div className="ol-offer-heading"><b>Escolha o fornecedor</b><small>Ordenados pelo menor preço unitário.</small></div>
    <div className="ol-offer-options">{sortedOffers.map((offer, index) => {
      const active = offer.offerKey === draft.offerKey; const unitDifference = offer.precoUnitario - bestPrice
      return <button type="button" key={offer.offerKey} className={active ? 'active' : ''} onClick={() => { onChange('offerKey', offer.offerKey); onChange('fornecedor', offer.fornecedor) }}>
        <span className="ol-offer-identity"><span><b>{offer.fornecedor}</b>{index === 0 && <em>Menor preço</em>}</span><small>{offer.nomeOferta} · EAN {offer.eanOferta} · {rotuloMetodo(offer.matchMethod)}</small></span>
        <span><strong>{formatBRL(offer.precoUnitario)}</strong><small>Total: {formatBRL(offer.precoUnitario * quantity)}</small></span>
        <small className={unitDifference > 0 ? 'ol-more-expensive' : ''}>{unitDifference > 0 ? `+${formatBRL(unitDifference)} por unidade · +${formatBRL(unitDifference * quantity)} no total` : 'Melhor valor disponível'}</small>
      </button>
    })}</div>
    <label className="ol-modal-field">Motivo do ajuste (opcional)<textarea value={draft.motivo} maxLength={160} placeholder="Ex.: fechar fatura deste fornecedor" onChange={(event) => onChange('motivo', event.target.value)}/></label>
    {error && <div className="field-error" role="alert">{error}</div>}
    <div className="modal-actions">{item.ajusteManual && <button type="button" className="button button-ghost" onClick={onRestore}><RotateCcw size={16}/>Restaurar automático</button>}<span style={{ marginLeft: 'auto' }}/><button type="button" className="button button-ghost" onClick={onCancel}>Cancelar</button><button type="button" className="button button-primary" onClick={onSave}>Salvar ajuste</button></div>
  </section></div>
}

const FORM_LABELS:Record<string, string> = { tablet: 'comprimido', capsule: 'cápsula', drops: 'gotas', syrup: 'xarope', suspension: 'suspensão', solution: 'solução', cream: 'creme', ointment: 'pomada', gel: 'gel', spray: 'spray', injectable: 'injetável', sachet: 'sachê' }

function resumoAssinatura(signature:AssinaturaProduto):string {
  return [
    signature.ingredientTokens.join(' + ') || 'princípio não identificado',
    signature.doseTokens.join(' + ') || 'dosagem não identificada',
    signature.form ? FORM_LABELS[signature.form] || signature.form : 'forma não identificada',
    signature.pack !== null ? `${signature.pack} unidade(s)` : signature.sizeTokens.join(' + ') || 'embalagem não identificada',
  ].join(' · ')
}

function DialogoRevisaoCorrespondencia({ item, products, productLinks, search, onSearch, onDecision, onClose, filaPosicao, filaTotal, onAvancar }:{
  item:ItemResultadoCompra; products:ProdutoCotado[]; productLinks:MapaVinculos; search:string
  onSearch:(value:string) => void; onDecision:(ean:string, state:'approved'|'rejected'|null) => void; onClose:() => void
  filaPosicao:number|null; filaTotal:number; onAvancar:() => void
}) {
  const estadoAnteriorRef = useRef({ id: item.id, contagem: item.sugestoesCorrespondencia.length })
  useEffect(() => {
    const anterior = estadoAnteriorRef.current
    const contagemAtual = item.sugestoesCorrespondencia.length
    const mesmoItem = anterior.id === item.id
    estadoAnteriorRef.current = { id: item.id, contagem: contagemAtual }
    // Só avança sozinho quando a decisão que acabou de ser tomada zerou as sugestões deste
    // item — nunca ao abrir o diálogo num item que já não tinha nada pendente.
    if (mesmoItem && anterior.contagem > 0 && contagemAtual === 0) onAvancar()
  }, [item.id, item.sugestoesCorrespondencia.length, onAvancar])

  const searchText = normalizeHeader(search)
  const searchEan = search.replace(/\D/g, '')
  const searched:ProdutoCorrespondente[] = searchText.length >= 2 ? products.filter((product) => normalizeHeader(product.nome).includes(searchText) || (searchEan.length >= 3 && product.ean.includes(searchEan))).slice(0, 30).map((product) => {
    const comparison = compareProductNames(item.nome, product.nome, product.ofertas[0]?.fornecedor || '')
    return { ...product, method: 'search', score: comparison.score, comparison, dcb: '' }
  }) : []
  const candidatesByEan = new Map<string, ProdutoCorrespondente>()
  ;[...item.produtosCorrespondentes, ...item.sugestoesCorrespondencia, ...searched].forEach((product) => { if (!candidatesByEan.has(product.ean)) candidatesByEan.set(product.ean, product) })
  const candidates = [...candidatesByEan.values()]
  const orderSignature = buildProductSignature(item.nome)
  return <div className="modal-backdrop"><section className="modal ol-match-dialog">
    <div className="ol-match-dialog-header">
      <div className="ol-match-dialog-top">
        <span className="eyebrow green">Revisar correspondência{filaPosicao ? ` · item ${filaPosicao} de ${filaTotal}` : ''}</span>
        <button type="button" className="icon-button" aria-label="Fechar" onClick={onClose}><X/></button>
      </div>
      <div className="ol-match-reference">
        <span className="ol-match-reference-label">Comparando com este item do pedido</span>
        <h2>{item.nome}</h2>
        <p>EAN do pedido: <b>{item.ean}</b>{item.laboratorio ? <> · Laboratório informado: <b>{item.laboratorio}</b></> : null}</p>
        {item.dcb && <div className="ol-signature ol-dcb-signature"><small>DCB identificado</small><b>{item.dcb}</b></div>}
        <div className="ol-signature"><small>Apresentação identificada</small><b>{resumoAssinatura(orderSignature)}</b></div>
      </div>
      <label className="ol-modal-field">Buscar manualmente nos fornecedores<input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Digite nome ou EAN para marca, genérico ou outra descrição..."/></label>
    </div>
    <div className="ol-match-list">{candidates.length ? candidates.map((candidate) => {
      const exact = candidate.ean === item.ean
      const dcbMatched = candidate.method === 'dcb'
      const linkState = productLinks[productLinkId(item, candidate.ean)]
      const comparison = candidate.comparison || compareProductNames(item.nome, candidate.nome, candidate.ofertas[0]?.fornecedor || '')
      const conflict = !dcbMatched && comparison.status === 'conflict'
      const suppliers = [...new Set(candidate.ofertas.map((offer) => offer.fornecedor))].join(', ')
      const validPrices = candidate.ofertas.map((offer) => offer.precoUnitario).filter((price) => Number.isFinite(price) && price > 0)
      const lowest = validPrices.length ? Math.min(...validPrices) : null
      const matched = item.produtosCorrespondentes.some((product) => product.ean === candidate.ean)
      const methodLabel = exact ? 'EAN exato' : linkState === 'approved' ? 'Vínculo confirmado' : linkState === 'rejected' ? 'Rejeitado' : dcbMatched ? 'Mesmo DCB' : candidate.method === 'automatic-name' ? 'Nome equivalente automático' : candidate.method === 'auto-reviewed-name' ? 'Aceita automaticamente' : candidate.method === 'suggestion' ? `Sugestão · ${comparison.score}%` : `Busca manual · ${comparison.score}%`
      return <article key={candidate.ean} className={`ol-match-card ${conflict ? 'conflict' : matched ? 'matched' : ''}`}>
        <div className="ol-match-card-heading"><div><b>{candidate.nome}</b><small>EAN {candidate.ean} · {suppliers}</small></div><strong>{formatBRL(lowest)}</strong></div>
        {dcbMatched && candidate.dcb && <div className="ol-signature compact ol-dcb-signature"><small>DCB da oferta</small><b>{candidate.dcb}</b></div>}
        <div className="ol-signature compact"><small>Apresentação da oferta</small><b>{resumoAssinatura(comparison.candidate)}</b></div>
        <div className="ol-match-meta"><span>{methodLabel}</span>{comparison.reviewReasons?.length > 0 && !dcbMatched && <em className="review">Revisar: {comparison.reviewReasons.join(', ')}</em>}{conflict && <em>Incompatível: {comparison.conflicts.join(', ')}</em>}</div>
        <div className="ol-match-actions">
          {exact ? <span className="ol-match-locked"><ShieldCheck size={14}/> Correspondência obrigatória pelo EAN</span>
            : linkState === 'rejected' ? <button type="button" className="button button-ghost" onClick={() => onDecision(candidate.ean, null)}>Reavaliar</button>
              : dcbMatched ? <><span className="ol-match-locked"><ShieldCheck size={14}/> Correspondência confirmada pela base DCB</span><button type="button" className="button button-danger-soft" onClick={() => onDecision(candidate.ean, 'rejected')}>Não usar este vínculo</button></>
                : conflict ? <span className="ol-match-locked danger"><CircleAlert size={14}/> Não pode ser vinculado</span>
                  : <><button type="button" className="button button-primary" onClick={() => onDecision(candidate.ean, 'approved')}>{linkState === 'approved' ? <><CircleCheck size={16}/> Confirmado</> : 'Confirmar equivalência'}</button><button type="button" className="button button-danger-soft" onClick={() => onDecision(candidate.ean, 'rejected')}>Não é o mesmo</button></>}
        </div>
      </article>
    }) : <div className="ol-match-empty">{searchText.length >= 2 ? 'Nenhum produto corresponde à busca.' : 'Nenhuma sugestão pendente. Use a busca para localizar uma marca ou genérico manualmente.'}</div>}</div>
    <div className="modal-actions">{filaPosicao && filaTotal > filaPosicao ? <small className="ol-match-remaining">{filaTotal - filaPosicao} item(ns) aguardando revisão depois deste</small> : <span/>}<button type="button" className="button button-ghost" onClick={onClose}>Concluir revisão</button></div>
  </section></div>
}

function DialogoMapeamento({ mapping, onChange, onCancel, onConfirm }:{
  mapping:EstadoMapeamento; onChange:(key:string, value:string) => void; onCancel:() => void; onConfirm:() => void
}) {
  const title = mapping.kind === 'cotacao' ? 'Tabela do fornecedor' : mapping.kind === 'historico' ? 'Histórico de preço de custo' : mapping.kind === 'dcb' ? 'Base de equivalência DCB' : 'Tabela de pedido'
  const description = mapping.kind === 'historico' ? 'Confirme as colunas que identificam o EAN e o último valor pago. Essa tabela só serve para comparar preços — não altera fornecedores nem quantidades.' : mapping.kind === 'dcb' ? 'Confirme as colunas que ligam cada código de barras ao seu princípio ativo (DCB). Essa base é opcional e substitui a que já estiver carregada.' : mapping.kind === 'cotacao' ? `Confirme quais colunas da planilha correspondem ao EAN, à descrição e ao preço. Se já existir uma tabela de "${mapping.values.nomeFornecedor || 'este fornecedor'}", ela será substituída por esta.` : 'Confirme quais colunas da planilha correspondem ao produto e à quantidade pedida. Esta lista substitui o pedido atual, se houver um.'
  const camposObrigatoriosFaltando = mapping.fields.filter((field) => field.required && field.type === 'text' ? !String(mapping.values[field.key] ?? '').trim() : field.required && (mapping.values[field.key] === undefined || mapping.values[field.key] === ''))
  const colunasEscolhidas = mapping.fields.filter((field) => field.type !== 'text').map((field) => mapping.values[field.key]).filter((value) => value !== undefined && value !== '')
  const colunasRepetidas = new Set(colunasEscolhidas).size !== colunasEscolhidas.length
  const podeImportar = !colunasRepetidas && !camposObrigatoriosFaltando.length
  return <div className="modal-backdrop"><section className="modal ol-mapping">
    <div className="modal-header"><div className="modal-icon"><Columns3/></div><div><h2>{title}</h2><p>Encontramos {mapping.rows.length} linhas em <b>{mapping.fileName}</b>. {description}</p></div><button type="button" className="icon-button" aria-label="Fechar" onClick={onCancel}><X/></button></div>
    <div className="source-preview"><div className="section-caption"><TableProperties/><div><strong>Prévia do arquivo</strong><span>As colunas não escolhidas serão ignoradas.</span></div></div><div className="table-wrap"><table><thead><tr>{mapping.headers.map((header, index) => <th key={index}>{header || `Col. ${index + 1}`}</th>)}</tr></thead><tbody>{mapping.rows.slice(0, 4).map((row, index) => <tr key={index}>{mapping.headers.map((_, column) => <td key={column}>{String(row[column] ?? '')}</td>)}</tr>)}</tbody></table></div></div>
    <div className="mapping-panel"><div className="section-caption"><Columns3/><div><strong>Confirme as colunas</strong><span>Ajuste o mapeamento sugerido antes de importar. Campos obrigatórios precisam de uma coluna cada um.</span></div></div>
      <div className="mapping-grid">{mapping.fields.map((field) => <label key={field.key}>{field.label} <small>{field.required ? 'Obrigatório' : 'Opcional'}</small>{field.type === 'text' ? <input value={mapping.values[field.key] ?? ''} onChange={(event) => onChange(field.key, event.target.value)} placeholder="Digite o nome"/> : <select value={mapping.values[field.key] ?? ''} onChange={(event) => onChange(field.key, event.target.value)}><option value="">Não usar</option>{mapping.headers.map((header, index) => <option value={index} key={index}>{header || `Coluna ${index + 1}`}</option>)}</select>}</label>)}</div>
      {colunasRepetidas && <small className="mapping-error">A mesma coluna da planilha não pode ser usada em dois campos diferentes. Escolha uma coluna distinta para cada um.</small>}
      {!colunasRepetidas && camposObrigatoriosFaltando.length > 0 && <small className="mapping-error">Preencha os campos obrigatórios: {camposObrigatoriosFaltando.map((field) => field.label).join(', ')}.</small>}
    </div>
    <div className="modal-actions"><button type="button" className="button button-ghost" onClick={onCancel}>Cancelar</button><button type="button" className="button button-primary" disabled={!podeImportar} title={!podeImportar ? 'Corrija o mapeamento das colunas antes de importar.' : undefined} onClick={onConfirm}>Importar</button></div>
  </section></div>
}
