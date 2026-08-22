/*
 * Motor de comparação de fornecedores e montagem da melhor compra da funcionalidade
 * "Cotação para OL". Portado da ferramenta interna "Cotação de medicamentos" da Drogaria
 * Center, mantendo a mesma lógica de correspondência por EAN, DCB e nome equivalente.
 */

export const ARMAZENAMENTO_COTACAO_OL = 'cotapreco:cotacao-ol:v1'

export interface Oferta { fornecedor:string; precoUnitario:number }
export interface ProdutoCotado { ean:string; nome:string; ofertas:Oferta[] }
export type MapaCotacoes = Record<string, ProdutoCotado>

export interface ItemPedido {
  id:string
  ean:string
  nome:string
  quantidadePedida:number
  laboratorio:string|null
  fornecedorPreferido:string|null
  preferenciaFornecedorAtiva:boolean
}

export interface AjusteManual { fornecedor:string; eanOferta:string|null; quantidade:number; motivo:string }
export type MapaAjustes = Record<string, AjusteManual>

export type EstadoVinculo = 'approved'|'rejected'
export type MapaVinculos = Record<string, EstadoVinculo>

export interface ConfiguracaoCorrespondencia { autoAcceptSafe:boolean }

export interface EntradaDcb { key:string; label:string }
export type CatalogoDcb = Record<string, EntradaDcb>

export interface ReferenciaHistorico { ean:string; nome:string; laboratorio:string; precoCusto:number }
export type MapaHistoricoPrecos = Record<string, ReferenciaHistorico>

export type MetodoCorrespondencia = 'ean'|'dcb'|'automatic-name'|'auto-reviewed-name'|'confirmed-name'|'suggestion'|'search'

export interface AssinaturaProduto {
  normalized:string
  ingredientTokens:string[]
  associations:string[]
  doseTokens:string[]
  sizeTokens:string[]
  form:string|null
  release:'immediate'|'extended'
  pack:number|null
  presentation:string
  key:string
}

export interface ComparacaoNomes {
  status:'conflict'|'automatic'|'suggestion'|'possible'
  score:number
  conflicts:string[]
  reviewReasons:string[]
  safeToAutoAccept:boolean
  order:AssinaturaProduto
  candidate:AssinaturaProduto
}

export interface OfertaEnriquecida extends Oferta {
  offerKey:string
  eanOferta:string
  nomeOferta:string
  dcbOferta:string
  matchMethod:MetodoCorrespondencia
  matchScore:number
}

export interface ProdutoCorrespondente extends ProdutoCotado {
  method:MetodoCorrespondencia
  score:number
  comparison:ComparacaoNomes|null
  dcb:string
}

export interface ReferenciaHistoricoResolvida extends ReferenciaHistorico {
  referenceMethod:'order-ean'|'offer-ean'|'dcb'|'equivalent-name'|'converted-pack'
  precoCustoOriginal?:number
  referencePack?:number|null
  targetPack?:number|null
  packRatio?:number
}

export interface ItemResultadoCompra extends ItemPedido {
  dcb:string
  quantidadeOriginal:number
  quantidadeFinal:number
  ajusteManual:boolean
  motivoAjuste:string
  ofertasDisponiveis:OfertaEnriquecida[]
  produtosCorrespondentes:ProdutoCorrespondente[]
  sugestoesCorrespondencia:ProdutoCorrespondente[]
  melhorOfertaEanExato:OfertaEnriquecida|null
  melhorOfertaNome:OfertaEnriquecida|null
  ofertasNomeMaisBaratas:OfertaEnriquecida[]
  temOfertaNomeMaisBarata:boolean
  economiaNomeUnitario:number
  economiaNomeTotal:number
  fornecedorSelecionado:string|null
  fornecedorAutomatico:string|null
  eanOferta:string|null
  eanOfertaAutomatico?:string|null
  nomeOferta:string|null
  dcbOferta?:string
  matchMethod:MetodoCorrespondencia|null
  matchScore:number|null
  offerKey?:string
  precoUnitario:number|null
  precoAutomatico:number|null
  menorPreco?:number
  precoTotal:number|null
  precoTotalAutomatico:number|null
  impactoAjuste:number
  status:'naoEncontrado'|'revisarCorrespondencia'|'ajusteInvalido'|'removidoManual'|'ajusteManual'|'alternativaPreferida'|'selecionado'
}

export function normalizeHeader(value:unknown):string {
  return String(value || '').trim().toUpperCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, ' ')
}

function wordDistance(first:string, second:string):number {
  const previous = Array.from({ length: second.length + 1 }, (_, index) => index)
  for (let firstIndex = 1; firstIndex <= first.length; firstIndex += 1) {
    const current:number[] = [firstIndex]
    for (let secondIndex = 1; secondIndex <= second.length; secondIndex += 1) {
      current[secondIndex] = Math.min(
        current[secondIndex - 1] + 1,
        previous[secondIndex] + 1,
        previous[secondIndex - 1] + (first[firstIndex - 1] === second[secondIndex - 1] ? 0 : 1),
      )
    }
    previous.splice(0, previous.length, ...current)
  }
  return previous[second.length]
}

function similarSearchWord(term:string, word:string):boolean {
  if (term.length < 4 || word.length < 4) return false
  if (word.startsWith(term) || term.startsWith(word)) return true
  const smallestLength = Math.min(term.length, word.length)
  const tolerance = smallestLength >= 8 ? 2 : smallestLength >= 5 ? 1 : 0
  return tolerance > 0 && Math.abs(term.length - word.length) <= tolerance && wordDistance(term, word) <= tolerance
}

export function matchesProductSearch(product:{ nome?:string; fornecedor?:string; ean?:string }, query:string):boolean {
  const normalizedQuery = normalizeHeader(query)
  if (!normalizedQuery) return true
  const normalizedName = normalizeHeader(product?.nome)
  const normalizedSupplier = normalizeHeader(product?.fornecedor)
  const normalizedEan = String(product?.ean || '').replace(/\D/g, '')
  const haystack = `${normalizedName} ${normalizedSupplier} ${normalizedEan}`
  const words = normalizedName.split(/[^A-Z0-9]+/).filter(Boolean)
  return normalizedQuery.split(/\s+/).every((term) => {
    if (haystack.includes(term)) return true
    if (/^\d+$/.test(term)) return normalizedEan.includes(term)
    return words.some((word) => similarSearchWord(term, word))
  })
}

export function toNumber(value:unknown):number|null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'number') return value
  let source = String(value).trim().toUpperCase()
  if (/^[\d\s.,-]*G[\d\s.,G-]*$/.test(source)) source = source.replace(/G/g, '9')
  let text = source.replace(/[^\d,.-]/g, '')
  if (!text) return null
  if (text.includes(',') && text.includes('.')) text = text.replace(/\./g, '').replace(',', '.')
  else if (text.includes(',')) text = text.replace(',', '.')
  const result = Number.parseFloat(text)
  return Number.isNaN(result) ? null : result
}

export function formatBRL(value:number|null|undefined):string {
  return value === null || value === undefined || Number.isNaN(value) ? '—' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export type LinhaPlanilha = unknown[]

export function detectHeaderRow(matrix:LinhaPlanilha[]):number {
  const maxCheck = Math.min(20, matrix.length)
  let best = { index: 0, score: -Infinity }
  for (let index = 0; index < maxCheck; index += 1) {
    const row = matrix[index] || []
    const values = row.filter((cell) => String(cell || '').trim())
    if (values.length < 2) continue
    const textCells = values.filter((cell) => !/^-?\d+([.,]\d+)?$/.test(String(cell).trim()) && String(cell).trim().length < 60).length
    let dataRows = 0
    for (let next = index + 1; next < Math.min(index + 4, matrix.length); next += 1) {
      if ((matrix[next] || []).filter((cell) => String(cell || '').trim()).length >= Math.max(2, Math.floor(values.length / 2))) dataRows += 1
    }
    const score = textCells * 2 + dataRows * 3 + values.length
    if (score > best.score) best = { index, score }
  }
  return best.index
}

const columnPatterns:Record<string, string[]> = {
  ean: ['EAN', 'GTIN', 'CODIGO BARRAS', 'COD BARRAS', 'COD. BARRAS', 'CODIGO DE BARRAS', 'EAN PRINCIPAL'],
  codigo: ['CODIGO', 'COD', 'COD REDUZIDO', 'REFERENCIA', 'REF', 'ITEM', 'COD FAT'],
  nome: ['NOME', 'DESCRICAO', 'PRODUTO', 'MEDICAMENTO', 'NOME DO PRODUTO', 'DESC'],
  quantidade: ['QUANTIDADE', 'QTD', 'QTDE', 'QTD PEDIDA', 'QUANT'],
  precoUnit: ['PRECO UNITARIO', 'PRECO UNIT', 'VALOR UNITARIO', 'LIQ S ST', 'LIQ SEM ST', 'LIQUIDO S ST', 'LIQUIDO SEM ST', 'PRECO C DESCONTO SEM ST', 'PRECO COM DESCONTO', 'PRECO', 'VALOR', 'PU'],
  precoCusto: ['P. CUSTO', 'P CUSTO', 'PRECO DE CUSTO', 'PRECO CUSTO', 'CUSTO UNITARIO', 'VALOR ULT ENTRADA', 'ULTIMO CUSTO'],
  dcb: ['DCB', 'DENOMINACAO COMUM BRASILEIRA', 'PRINCIPIO ATIVO DCB'],
  laboratorio: ['LABORATORIO', 'LAB', 'FABRICANTE', 'MARCA'],
  fornecedor: ['FORNECEDOR PREFERIDO', 'FORNECEDOR ESCOLHIDO', 'DISTRIBUIDOR PREFERIDO'],
}

function matchColumn(headers:string[], patterns:string[]):number {
  const normalizeColumnLabel = (value:string) => normalizeHeader(value).replace(/[^A-Z0-9]+/g, ' ').trim()
  const normalized = headers.map(normalizeColumnLabel)
  const normalizedPatterns = patterns.map(normalizeColumnLabel)
  for (const pattern of normalizedPatterns) { const index = normalized.findIndex((header) => header === pattern); if (index >= 0) return index }
  for (const pattern of normalizedPatterns) { const index = normalized.findIndex((header) => header && header.includes(pattern)); if (index >= 0) return index }
  return -1
}

interface EstatisticasColuna { empty:boolean; numericRatio?:number; longTextRatio?:number; eanRatio?:number }

function columnStats(rows:LinhaPlanilha[], index:number):EstatisticasColuna {
  const values = rows.map((row) => row[index]).filter((value) => value !== undefined && value !== null && String(value).trim())
  if (!values.length) return { empty: true }
  const numbers = values.filter((value) => toNumber(value) !== null)
  const longText = values.filter((value) => toNumber(value) === null && String(value).trim().length > 15)
  const eans = values.filter((value) => { const digits = String(value).replace(/\D/g, ''); return digits.length >= 8 && digits.length <= 14 })
  return { empty: false, numericRatio: numbers.length / values.length, longTextRatio: longText.length / values.length, eanRatio: eans.length / values.length }
}

export type MapeamentoAutomatico = Record<string, number>

export function autoMapColumns(headers:string[], rows:LinhaPlanilha[]):MapeamentoAutomatico {
  const mapping:MapeamentoAutomatico = {}; const used = new Set<number>()
  Object.entries(columnPatterns).forEach(([key, patterns]) => { const index = matchColumn(headers, patterns); if (index >= 0 && !used.has(index)) { mapping[key] = index; used.add(index) } })
  if (mapping.ean === undefined) for (let index = 0; index < headers.length; index += 1) { if (!used.has(index) && (columnStats(rows, index).eanRatio ?? 0) > .7) { mapping.ean = index; used.add(index); break } }
  if (mapping.nome === undefined) {
    let best = -1; let score = 0
    for (let index = 0; index < headers.length; index += 1) { const ratio = columnStats(rows, index).longTextRatio ?? 0; if (!used.has(index) && ratio > score) { score = ratio; best = index } }
    if (best >= 0 && score > .5) { mapping.nome = best; used.add(best) }
  }
  if (mapping.quantidade === undefined) for (let index = 0; index < headers.length; index += 1) { if (!used.has(index) && (columnStats(rows, index).numericRatio ?? 0) > .8) { mapping.quantidade = index; used.add(index); break } }
  return mapping
}

export function supplierFromFilename(filename:string):string {
  const known = ['EMS', 'MEDLEY', 'GERMED', 'EUROFARMA', 'ACHE', 'ACHÉ', 'NEOQUIMICA', 'NEO QUIMICA', 'PRATI', 'DONADUZZI', 'TEUTO', 'CIMED', 'CIFARMA', 'LEGRAND', 'MULTILAB', 'SANDOZ', 'MEDQUIMICA', 'SANOFI', 'MARTINS']
  const stem = filename.replace(/\.[^.]+$/, '').toUpperCase()
  const found = known.find((name) => stem.includes(name))
  if (found) return found.charAt(0) + found.slice(1).toLowerCase()
  const word = stem.replace(/[_-]+|\d+/g, ' ').trim().split(/\s+/).find((value) => value.length >= 3)
  return word ? word.charAt(0) + word.slice(1).toLowerCase() : 'Fornecedor'
}

export function createOrderLineId():string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `pedido-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function ensureOrderLineIds(pedido:Partial<ItemPedido>[]):ItemPedido[] {
  return pedido.map((item) => (item.id ? item : { ...item, id: createOrderLineId() })) as ItemPedido[]
}

export function normalizeEan(value:unknown):string {
  let source = String(value ?? '').trim().toUpperCase()
  const compact = source.replace(/[^A-Z0-9]/g, '')
  if (compact.includes('G') && /^[0-9G]+$/.test(compact)) source = compact.replace(/G/g, '9')
  return source.replace(/\D/g, '')
}

export function parsePriceHistory(rows:LinhaPlanilha[], { eanIndex, nameIndex = null, costIndex, laboratoryIndex = null }:{ eanIndex:number; nameIndex?:number|null; costIndex:number; laboratoryIndex?:number|null }):{ history:MapaHistoricoPrecos; invalid:number; duplicates:number } {
  const history:MapaHistoricoPrecos = {}
  let invalid = 0
  let duplicates = 0

  rows.forEach((row) => {
    const ean = normalizeEan(row[eanIndex])
    const lastCost = toNumber(row[costIndex])
    if (!ean || lastCost === null || lastCost < 0) { invalid += 1; return }
    if (history[ean]) duplicates += 1
    history[ean] = {
      ean,
      nome: nameIndex === null ? '' : String(row[nameIndex] || '').trim(),
      laboratorio: laboratoryIndex === null ? '' : String(row[laboratoryIndex] || '').trim(),
      precoCusto: lastCost,
    }
  })

  return { history, invalid, duplicates }
}

interface RegistroHistorico extends ReferenciaHistorico { signature:AssinaturaProduto }

const historyIndexCache = new WeakMap<MapaHistoricoPrecos, RegistroHistorico[]>()

function historyRecords(history:MapaHistoricoPrecos):RegistroHistorico[] {
  if (!history || typeof history !== 'object') return []
  const cached = historyIndexCache.get(history)
  if (cached) return cached
  const records = Object.values(history).map((reference) => ({ ...reference, signature: buildProductSignature(reference.nome || '') }))
  historyIndexCache.set(history, records)
  return records
}

function historyNameMatch(item:{ nomeOferta?:string|null; fornecedorSelecionado?:string|null; nome?:string; laboratorio?:string|null }, history:MapaHistoricoPrecos):ReferenciaHistoricoResolvida|null {
  const sources = [
    { name: item?.nomeOferta, laboratory: item?.fornecedorSelecionado, priority: 2 },
    { name: item?.nome, laboratory: item?.laboratorio, priority: 1 },
  ].filter((source):source is { name:string; laboratory:string|null|undefined; priority:number } => Boolean(source.name))
  interface MelhorReferencia { ean:string; nome:string; laboratorio:string; precoCusto:number; referenceMethod:'equivalent-name'|'converted-pack'; precoCustoOriginal:number; referencePack:number|null; targetPack:number|null; packRatio:number; score:number }
  let best:MelhorReferencia|null = null

  for (const reference of historyRecords(history)) {
    if (!reference.nome) continue
    for (const source of sources) {
      const target = buildProductSignature(source.name)
      const candidate = reference.signature
      const ingredientSimilarity = diceScore(target.ingredientTokens, candidate.ingredientTokens)
      const doseMatch = target.doseTokens.length > 0 && candidate.doseTokens.length > 0 && sameValues(target.doseTokens, candidate.doseTokens)
      const associationsMatch = sameValues(target.associations, candidate.associations)
      const sizeMatch = !target.sizeTokens.length || !candidate.sizeTokens.length || sameValues(target.sizeTokens, candidate.sizeTokens)
      const solidForms = new Set(['tablet', 'capsule'])
      const formCompatible = target.form === candidate.form || (Boolean(target.form) && Boolean(candidate.form) && solidForms.has(target.form as string) && solidForms.has(candidate.form as string))
      if (ingredientSimilarity < .85 || !doseMatch || !associationsMatch || !sizeMatch || !formCompatible || target.release !== candidate.release) continue

      let method:'equivalent-name'|'converted-pack' = 'equivalent-name'
      let adjustedCost = reference.precoCusto
      let packRatio = 1
      if (target.pack !== null && candidate.pack !== null && target.pack !== candidate.pack) {
        packRatio = target.pack / candidate.pack
        adjustedCost = reference.precoCusto * packRatio
        method = 'converted-pack'
      }

      const exactName = normalizeProductName(source.name) === normalizeProductName(reference.nome)
      const sameLaboratory = Boolean(normalizeHeader(source.laboratory) && normalizeHeader(source.laboratory) === normalizeHeader(reference.laboratorio))
      const score = ingredientSimilarity * 100 + (exactName ? 30 : 0) + (target.form === candidate.form ? 10 : 0) + (target.pack === candidate.pack ? 10 : 0) + (sameLaboratory ? 8 : 0) + source.priority
      const atual:MelhorReferencia = {
        ean: reference.ean,
        nome: reference.nome,
        laboratorio: reference.laboratorio,
        precoCusto: adjustedCost,
        referenceMethod: method,
        precoCustoOriginal: reference.precoCusto,
        referencePack: candidate.pack,
        targetPack: target.pack,
        packRatio,
        score,
      }
      if (!best || score > best.score) best = atual
    }
  }
  if (!best) return null
  return {
    ean: best.ean, nome: best.nome, laboratorio: best.laboratorio, precoCusto: best.precoCusto,
    referenceMethod: best.referenceMethod, precoCustoOriginal: best.precoCustoOriginal,
    referencePack: best.referencePack, targetPack: best.targetPack, packRatio: best.packRatio,
  }
}

export function findPriceHistoryReference(item:{ ean?:string; eanOferta?:string|null; nomeOferta?:string|null; nome?:string; fornecedorSelecionado?:string|null; laboratorio?:string|null }, history:MapaHistoricoPrecos = {}, dcbCatalog:CatalogoDcb = {}):ReferenciaHistoricoResolvida|null {
  const orderEan = normalizeEan(item?.ean)
  const offerEan = normalizeEan(item?.eanOferta)
  if (orderEan && history[orderEan]) return { ...history[orderEan], referenceMethod: 'order-ean' }
  if (offerEan && history[offerEan]) return { ...history[offerEan], referenceMethod: 'offer-ean' }
  const dcbKeys = new Set([dcbCatalog[orderEan]?.key, dcbCatalog[offerEan]?.key].filter(Boolean))
  if (dcbKeys.size) {
    const dcbMatches = historyRecords(history).filter((reference) => dcbKeys.has(dcbCatalog[normalizeEan(reference.ean)]?.key))
    if (dcbMatches.length) {
      const preferredNames = [normalizeProductName(item?.nomeOferta), normalizeProductName(item?.nome)].filter(Boolean)
      const preferredLaboratories = [item?.fornecedorSelecionado, item?.laboratorio]
        .map((value) => normalizeHeader(value).replace(/[^A-Z0-9]+/g, ' ').trim())
        .filter(Boolean)
      const referenceScore = (reference:RegistroHistorico) => {
        const normalizedName = normalizeProductName(reference.nome)
        const exactName = preferredNames.includes(normalizedName) ? 1 : 0
        const nameTokens = normalizedName.split(/\s+/).filter(Boolean)
        const nameSimilarity = Math.max(0, ...preferredNames.map((name) => diceScore(name.split(/\s+/).filter(Boolean), nameTokens)))
        const laboratory = normalizeHeader(reference.laboratorio).replace(/[^A-Z0-9]+/g, ' ').trim()
        const sameLaboratory = laboratory && preferredLaboratories.some((preferred) => laboratory === preferred || laboratory.includes(preferred) || preferred.includes(laboratory)) ? 1 : 0
        return exactName * 100 + sameLaboratory * 50 + nameSimilarity * 20
      }
      dcbMatches.sort((first, second) => referenceScore(second) - referenceScore(first))
      const reference = dcbMatches[0]
      return { ean: reference.ean, nome: reference.nome, laboratorio: reference.laboratorio, precoCusto: reference.precoCusto, referenceMethod: 'dcb' }
    }
  }
  return historyNameMatch(item, history)
}

export function normalizeDcbKey(value:unknown):string {
  return normalizeHeader(value)
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/[^A-Z0-9.+/%]+/g, '')
}

export function parseDcbCatalog(rows:LinhaPlanilha[], { eanIndex, dcbIndex }:{ eanIndex:number; dcbIndex:number }):{ catalog:CatalogoDcb; invalid:number; duplicates:number; conflicts:number } {
  const catalog:CatalogoDcb = {}
  const conflictingEans = new Set<string>()
  let invalid = 0
  let duplicates = 0

  rows.forEach((row) => {
    const ean = normalizeEan(row[eanIndex])
    const label = String(row[dcbIndex] || '').trim()
    const key = normalizeDcbKey(label)
    if (!ean || !key) { invalid += 1; return }
    if (conflictingEans.has(ean)) return
    if (catalog[ean]) {
      duplicates += 1
      if (catalog[ean].key !== key) {
        delete catalog[ean]
        conflictingEans.add(ean)
      }
      return
    }
    catalog[ean] = { key, label }
  })

  return { catalog, invalid, duplicates, conflicts: conflictingEans.size }
}

export interface OportunidadePreco { type:'stable'|'good'|'high'; label:string; difference:number; percent:number|null }

export function evaluatePriceOpportunity(currentPrice:number|null|undefined, lastCost:number|null|undefined):OportunidadePreco|null {
  if (!Number.isFinite(currentPrice) || !Number.isFinite(lastCost)) return null
  const price = currentPrice as number
  const cost = lastCost as number
  const difference = cost - price
  const percent = cost > 0 ? Math.abs(difference) / cost * 100 : null
  if (Math.abs(difference) < .005) return { type: 'stable', label: 'Mesmo preço', difference: 0, percent: 0 }
  if (difference > 0) return { type: 'good', label: 'Boa oportunidade', difference, percent }
  return { type: 'high', label: 'Acima do último custo', difference: Math.abs(difference), percent }
}

const PRODUCT_STOPWORDS = new Set([
  'POT', 'POTASSICA', 'REV', 'REVESTIDO', 'REVESTIDOS', 'GENERICO', 'GEN', 'C', 'CX', 'BL', 'BLX', 'FR', 'FRASCO',
  'BR', 'RGD', 'GD', 'CRG', 'EMS', 'GERMED', 'BIOLAB', 'RANBAXY', 'MEDLEY', 'PRATI', 'NEO', 'NEOQUIMICA',
  'TEUTO', 'CIMED', 'ACHE', 'BIOSINTETICA', 'EUROFARMA', 'LEGRAND', 'MULTILAB', 'SANDOZ', 'SANOFI', 'COM',
  'CP', 'CPR', 'COMP', 'COMPR', 'COMPRIMIDO', 'COMPRIMIDOS', 'CAP', 'CAPS', 'CAPSULA', 'CAPSULAS', 'UN', 'AMP', 'SACH',
  'MG', 'MCG', 'G', 'ML', 'UI', 'MUI', 'DOSE', 'DOSES', 'SUC', 'SUCC', 'SUCCINATO', 'BISSUL', 'BISSULF',
  'BISSULFATO', 'MALEATO', 'CLORIDRATO', 'DICLORIDRATO', 'FOSFATO', 'BESILATO', 'MESILATO', 'FUMARATO',
  'HEMIFUMARATO', 'CITRATO', 'TARTARATO', 'OXALATO', 'SODICO', 'SODICA', 'CALCICO', 'CALCICA', 'DURA', 'DURAS',
  'L', 'R', 'LIB', 'PROL', 'LP',
])

const FORM_ALIASES:[string, RegExp][] = [
  ['tablet', /\b(CP|CPR|COM|COMP|COMPR|COMPRIMIDOS?|DRAGEAS?|DRG)\b/],
  ['capsule', /\b(CAP|CAPS|CAPSULAS?)\b/],
  ['drops', /\b(GTS|GOTAS?|COL|COLIRIO)\b/],
  ['syrup', /\b(XPE|XAROPE)\b/],
  ['suspension', /\b(SUS|SUSP|SUSPENSAO)\b/],
  ['solution', /\b(SOL|SOLUCAO)\b/],
  ['cream', /\b(CR|CREME)\b/],
  ['ointment', /\b(POM|POMADA)\b/],
  ['gel', /\bGEL\b/],
  ['spray', /\b(SPR|SPRAY)\b/],
  ['injectable', /\b(INJ|INJETAVEL|AMP|AMPOLA)\b/],
  ['sachet', /\b(SACH|SACHE)\b/],
]

function uniqueSorted(values:string[]):string[] {
  return [...new Set(values.filter(Boolean))].sort()
}

function sameValues(first:string[], second:string[]):boolean {
  return first.length === second.length && first.every((value, index) => value === second[index])
}

function diceScore(first:string[], second:string[]):number {
  if (!first.length || !second.length) return 0
  const secondSet = new Set(second)
  const intersection = first.filter((token) => secondSet.has(token)).length
  return (2 * intersection) / (first.length + second.length)
}

export function normalizeProductName(value:unknown):string {
  return normalizeHeader(value)
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/\bL\s*\.\s*P\b/g, ' LP ')
    .replace(/\b(HIDROCLOROTIAZIDA|HCTZ|HCT)\b/g, ' HCTZ ')
    .replace(/\b(PARAC|PARACET)\b/g, ' PARACETAMOL ')
    .replace(/\bCOD\b/g, ' CODEINA ')
    .replace(/\bOLMESART\b/g, ' OLMESARTANA ')
    .replace(/\bUNIPRAZOL\b/g, ' OMEPRAZOL ')
    .replace(/\bPOTASSICA\b|\bPOT\b/g, ' ')
    .replace(/\bREVESTIDOS?\b|\bREV\b/g, ' ')
    .replace(/([A-Z])(\d)/g, '$1 $2')
    .replace(/(\d)([A-Z])/g, '$1 $2')
    .replace(/[^A-Z0-9.%/+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildProductSignature(name:unknown, supplier:unknown = ''):AssinaturaProduto {
  let text = normalizeProductName(name)
  text = text.replace(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*(MCG|MG|G|UI)\b/g, '$1$3 + $2$3')
  const metoprololSuccinate = /\bMETOPROLOL\b/.test(text) && /\b(SUC|SUCC|SUCCINATO)\b/.test(text)
  const multipliedPackMatch = text.match(/\b(\d+)\s*(?:BL|BLT|BLISTER|BX)\s*X?\s*(\d+)\s*(?:CP|CPR|COM|COMP|COMPR|COMPRIMIDOS?|CAP|CAPS|CAPSULAS?)?\b/)
    || text.match(/\b(\d+)\s*X\s*(\d+)\s*(?:CP|CPR|COM|COMP|COMPR|COMPRIMIDOS?|CAP|CAPS|CAPSULAS?)\b/)
  const packPatterns = [
    /\bC\s*\/\s*(\d+)\b/,
    /\bBL(?:ISTER)?\s*X?\s*(\d+)\b/,
    /\b(\d+)\s*(?:CP|CPR|COM|COMP|COMPR|COMPRIMIDOS?|CAP|CAPS|CAPSULAS?|DRG|SACH|AMP|UN)\b/,
  ]
  const packMatch = packPatterns.map((pattern) => text.match(pattern)).find(Boolean)
  const pack = multipliedPackMatch ? Number(multipliedPackMatch[1]) * Number(multipliedPackMatch[2]) : packMatch ? Number(packMatch[1]) : null
  const form = FORM_ALIASES.find(([, pattern]) => pattern.test(text))?.[0] || null
  const release = metoprololSuccinate || /\b(L\s*\.?\s*P|XR|ER|RETARD|PROL|PROLONGAD[AO]S?)\b|\bLIB(?:ERACAO)?\s+PROL(?:ONGADA)?\b/.test(text) ? 'extended' : 'immediate'
  const doseTokens = uniqueSorted([...text.matchAll(/(\d+(?:\.\d+)?)\s*(MCG|MG|G|UI|MUI|%)(?:\s*\/\s*(ML|G|DOSE))?/g)].map((match) => `${Number(match[1])}${match[2]}${match[3] ? `/${match[3]}` : ''}`))
  const sizeTokens = uniqueSorted([...text.matchAll(/(\d+(?:\.\d+)?)\s*(ML|G)\b/g)].map((match) => `${Number(match[1])}${match[2]}`).filter((token) => !doseTokens.includes(token)))
  const supplierTokens = new Set(normalizeProductName(supplier).split(' ').filter(Boolean))
  const ingredientText = text
    .replace(/\b\d+\s*(?:BL|BLT|BLISTER|BX)\s*X?\s*\d+\s*(?:CP|CPR|COM|COMP|COMPR|COMPRIMIDOS?|CAP|CAPS|CAPSULAS?)?\b/g, ' ')
    .replace(/\b\d+\s*X\s*\d+\s*(?:CP|CPR|COM|COMP|COMPR|COMPRIMIDOS?|CAP|CAPS|CAPSULAS?)\b/g, ' ')
    .replace(/\bC\s*\/\s*\d+\b/g, ' ')
    .replace(/\bBL(?:ISTER)?\s*X?\s*\d+\b/g, ' ')
    .replace(/\b\d+\s*(?:CP|CPR|COM|COMP|COMPR|COMPRIMIDOS?|CAP|CAPS|CAPSULAS?|DRG|SACH|AMP|UN)\b/g, ' ')
    .replace(/\d+(?:\.\d+)?\s*(?:MCG|MG|G|UI|MUI|%)(?:\s*\/\s*(?:ML|G|DOSE))?/g, ' ')
    .replace(/\d+(?:\.\d+)?\s*(?:ML|G)\b/g, ' ')
    .replace(/[^A-Z0-9]+/g, ' ')
  const ingredientTokens = uniqueSorted(ingredientText.split(/\s+/).filter((token) => token && !/^\d/.test(token) && !PRODUCT_STOPWORDS.has(token) && !supplierTokens.has(token)))
  const associations = uniqueSorted(ingredientTokens.filter((token) => token === 'HCTZ'))
  const presentation = pack !== null ? `PACK:${pack}` : sizeTokens.length ? `SIZE:${sizeTokens.join('+')}` : ''
  const key = [ingredientTokens.join('+'), doseTokens.join('+'), form || '', presentation].join('|')
  return { normalized: text, ingredientTokens, associations, doseTokens, sizeTokens, form, release, pack, presentation, key }
}

export function compareProductNames(orderName:unknown, candidateName:unknown, candidateSupplier:unknown = ''):ComparacaoNomes {
  const order = buildProductSignature(orderName)
  const candidate = buildProductSignature(candidateName, candidateSupplier)
  const conflicts:string[] = []
  const solidOralForms = new Set(['tablet', 'capsule'])
  const reviewableSolidOralDifference = Boolean(order.form && candidate.form && order.form !== candidate.form && solidOralForms.has(order.form) && solidOralForms.has(candidate.form))
  const reviewableMissingSolidForm = Boolean(
    order.pack !== null && candidate.pack !== null
    && ((order.form === 'tablet' && !candidate.form) || (candidate.form === 'tablet' && !order.form)),
  )
  const reviewableMonthlyPackDifference = Boolean(
    order.pack !== null && candidate.pack !== null && order.pack !== candidate.pack
    && [order.pack, candidate.pack].every((pack) => pack === 28 || pack === 30),
  )
  if (order.doseTokens.length && candidate.doseTokens.length && !sameValues(order.doseTokens, candidate.doseTokens)) conflicts.push('dosagem')
  if (order.form && candidate.form && order.form !== candidate.form && !reviewableSolidOralDifference) conflicts.push('forma')
  if (order.pack !== null && candidate.pack !== null && order.pack !== candidate.pack && !reviewableMonthlyPackDifference) conflicts.push('embalagem')
  if (order.sizeTokens.length && candidate.sizeTokens.length && !sameValues(order.sizeTokens, candidate.sizeTokens)) conflicts.push('volume')
  if (!sameValues(order.associations, candidate.associations)) conflicts.push('associação')
  if (order.release !== candidate.release) conflicts.push('liberação')
  const ingredientSimilarity = diceScore(order.ingredientTokens, candidate.ingredientTokens)
  const doseMatch = order.doseTokens.length > 0 && candidate.doseTokens.length > 0 && sameValues(order.doseTokens, candidate.doseTokens)
  const formMatch = Boolean(order.form && candidate.form && order.form === candidate.form)
  const presentationMatch = Boolean(order.presentation && candidate.presentation && order.presentation === candidate.presentation)
  const formCompatible = formMatch || reviewableSolidOralDifference || reviewableMissingSolidForm
  const presentationCompatible = presentationMatch || reviewableMonthlyPackDifference
  const score = Math.round((ingredientSimilarity * .6 + (doseMatch ? .2 : 0) + (formMatch ? .1 : 0) + (presentationMatch ? .1 : 0)) * 100)
  const automatic = !conflicts.length && ingredientSimilarity >= .85 && doseMatch && formMatch && presentationMatch
  const suggestion = !conflicts.length && !automatic && ingredientSimilarity >= .55 && (doseMatch || formMatch || presentationMatch)
  const safeToAutoAccept = !conflicts.length && ingredientSimilarity >= .85 && doseMatch && presentationCompatible && formCompatible
  const reviewReasons = [
    ...(reviewableSolidOralDifference ? ['cápsula versus comprimido'] : []),
    ...(reviewableMissingSolidForm ? ['forma não informada na oferta'] : []),
    ...(reviewableMonthlyPackDifference ? [`embalagem ${order.pack} versus ${candidate.pack}`] : []),
  ]
  return {
    status: conflicts.length ? 'conflict' : automatic ? 'automatic' : suggestion ? 'suggestion' : 'possible',
    score,
    conflicts,
    reviewReasons,
    safeToAutoAccept,
    order,
    candidate,
  }
}

export function productLinkId(item:{ ean:string; nome:string }, candidateEan:string):string {
  const orderIdentity = normalizeEan(item.ean) || `NAME:${buildProductSignature(item.nome).key}`
  return `${orderIdentity}=>${normalizeEan(candidateEan)}`
}

export function createOfferKey(supplier:string, sourceEan:string):string {
  return `${normalizeHeader(supplier)}|${normalizeEan(sourceEan)}`
}

export type StatusComparacaoOferta = 'winner'|'compared'|'unused'

export function getOfferComparisonStatus(orderResults:ItemResultadoCompra[], supplier:string, sourceEan:string):StatusComparacaoOferta {
  const offerKey = createOfferKey(supplier, sourceEan)
  let compared = false
  for (const order of orderResults) {
    if (order.offerKey === offerKey) return 'winner'
    if (order.ofertasDisponiveis?.some((offer) => offer.offerKey === offerKey)) compared = true
  }
  return compared ? 'compared' : 'unused'
}

export function findProductMatches(cotacoes:MapaCotacoes, item:ItemPedido, productLinks:MapaVinculos = {}, matchingOptions:ConfiguracaoCorrespondencia = { autoAcceptSafe: false }, dcbCatalog:CatalogoDcb = {}):{ offers:OfertaEnriquecida[]; matchedProducts:ProdutoCorrespondente[]; suggestions:ProdutoCorrespondente[]; orderDcb:EntradaDcb|null } {
  const matchedProducts:ProdutoCorrespondente[] = []
  const suggestions:ProdutoCorrespondente[] = []
  const orderDcb = dcbCatalog[normalizeEan(item.ean)] || null
  Object.values(cotacoes).forEach((candidate) => {
    const exact = Boolean(item.ean && candidate.ean === item.ean)
    const linkState = productLinks[productLinkId(item, candidate.ean)]
    const candidateDcb = dcbCatalog[normalizeEan(candidate.ean)] || null
    const sameDcb = Boolean(orderDcb?.key && candidateDcb?.key && orderDcb.key === candidateDcb.key)
    const comparison = exact ? null : compareProductNames(item.nome, candidate.nome, candidate.ofertas[0]?.fornecedor || '')
    let method:MetodoCorrespondencia|null = null
    if (exact) method = 'ean'
    else if (linkState !== 'rejected' && sameDcb) method = 'dcb'
    else if (linkState === 'approved') method = 'confirmed-name'
    else if (linkState !== 'rejected' && comparison?.status === 'automatic') method = 'automatic-name'
    else if (linkState !== 'rejected' && matchingOptions.autoAcceptSafe && comparison?.status === 'suggestion' && comparison.safeToAutoAccept) method = 'auto-reviewed-name'
    if (method) {
      matchedProducts.push({ ...candidate, method, score: exact || sameDcb ? 100 : comparison?.score || 100, comparison, dcb: candidateDcb?.label || '' })
    } else if (linkState !== 'rejected' && comparison?.status === 'suggestion') {
      suggestions.push({ ...candidate, method: 'suggestion', score: comparison.score, comparison, dcb: candidateDcb?.label || '' })
    }
  })

  const offersByKey = new Map<string, OfertaEnriquecida>()
  matchedProducts.forEach((product) => product.ofertas.forEach((offer) => {
    if (!Number.isFinite(offer.precoUnitario) || offer.precoUnitario <= 0) return
    const enriched:OfertaEnriquecida = { ...offer, offerKey: createOfferKey(offer.fornecedor, product.ean), eanOferta: product.ean, nomeOferta: product.nome, dcbOferta: product.dcb || '', matchMethod: product.method, matchScore: product.score }
    const existing = offersByKey.get(enriched.offerKey)
    if (!existing || enriched.precoUnitario < existing.precoUnitario) offersByKey.set(enriched.offerKey, enriched)
  }))
  const offers = [...offersByKey.values()].sort((first, second) => first.precoUnitario - second.precoUnitario)
  suggestions.sort((first, second) => second.score - first.score)
  return { offers, matchedProducts, suggestions, orderDcb }
}

export function calculateOrder(cotacoes:MapaCotacoes, pedido:ItemPedido[], ajustesManuais:MapaAjustes = {}, productLinks:MapaVinculos = {}, matchingOptions:ConfiguracaoCorrespondencia = { autoAcceptSafe: false }, dcbCatalog:CatalogoDcb = {}):ItemResultadoCompra[] {
  return pedido.map((item) => {
    const { offers, matchedProducts, suggestions, orderDcb } = findProductMatches(cotacoes, item, productLinks, matchingOptions, dcbCatalog)
    const ajuste = ajustesManuais[item.id]
    const quantidadeOriginal = item.quantidadePedida
    const adjustedQuantity = Number(ajuste?.quantidade)
    const quantidadeFinal = ajuste && Number.isInteger(adjustedQuantity) && adjustedQuantity >= 0 ? adjustedQuantity : quantidadeOriginal
    const melhorOfertaEanExato = offers.find((offer) => offer.matchMethod === 'ean') || null
    const ofertasNomeMaisBaratas = melhorOfertaEanExato
      ? offers.filter((offer) => offer.matchMethod !== 'ean' && offer.eanOferta !== item.ean && offer.precoUnitario < melhorOfertaEanExato.precoUnitario - 0.005)
      : []
    const melhorOfertaNome = ofertasNomeMaisBaratas[0] || null
    const economiaNomeUnitario = melhorOfertaNome && melhorOfertaEanExato ? melhorOfertaEanExato.precoUnitario - melhorOfertaNome.precoUnitario : 0
    const base = { ...item, dcb: orderDcb?.label || '', quantidadeOriginal, quantidadeFinal, ajusteManual: Boolean(ajuste), motivoAjuste: ajuste?.motivo || '', ofertasDisponiveis: offers, produtosCorrespondentes: matchedProducts, sugestoesCorrespondencia: suggestions, melhorOfertaEanExato, melhorOfertaNome, ofertasNomeMaisBaratas, temOfertaNomeMaisBarata: ofertasNomeMaisBaratas.length > 0, economiaNomeUnitario, economiaNomeTotal: economiaNomeUnitario * quantidadeFinal }
    if (!offers.length) return { ...base, fornecedorSelecionado: null, fornecedorAutomatico: null, eanOferta: null, nomeOferta: null, matchMethod: null, matchScore: null, precoUnitario: null, precoAutomatico: null, precoTotal: null, precoTotalAutomatico: null, impactoAjuste: 0, status: suggestions.length ? 'revisarCorrespondencia' : 'naoEncontrado' }
    const best = offers[0]
    const hasActivePreference = Boolean(item.preferenciaFornecedorAtiva && item.fornecedorPreferido)
    const preferredOffers = hasActivePreference ? offers.filter((offer) => normalizeHeader(offer.fornecedor) === normalizeHeader(item.fornecedorPreferido)) : []
    const preferred = preferredOffers[0]
    const automatic = preferred || best
    const supplierMatches = ajuste?.fornecedor ? offers.filter((offer) => normalizeHeader(offer.fornecedor) === normalizeHeader(ajuste.fornecedor)) : []
    const manual = ajuste?.eanOferta ? supplierMatches.find((offer) => offer.eanOferta === ajuste.eanOferta) : supplierMatches[0]
    if (ajuste && !manual) return { ...base, fornecedorSelecionado: ajuste.fornecedor, fornecedorAutomatico: automatic?.fornecedor || null, eanOferta: ajuste.eanOferta || null, nomeOferta: null, matchMethod: null, matchScore: null, precoUnitario: null, precoAutomatico: automatic?.precoUnitario ?? null, precoTotal: null, precoTotalAutomatico: automatic ? automatic.precoUnitario * quantidadeOriginal : null, impactoAjuste: 0, status: 'ajusteInvalido' }
    if (!automatic && !manual) return { ...base, fornecedorSelecionado: null, fornecedorAutomatico: null, eanOferta: null, nomeOferta: null, matchMethod: null, matchScore: null, precoUnitario: null, precoAutomatico: null, precoTotal: null, precoTotalAutomatico: null, impactoAjuste: 0, status: suggestions.length ? 'revisarCorrespondencia' : 'naoEncontrado' }
    const selected = (manual || automatic) as OfertaEnriquecida
    const precoTotal = selected.precoUnitario * quantidadeFinal
    const precoTotalAutomatico = automatic ? automatic.precoUnitario * quantidadeOriginal : null
    const status = ajuste ? (quantidadeFinal === 0 ? 'removidoManual' : 'ajusteManual') : selected.offerKey === best.offerKey ? 'selecionado' : 'alternativaPreferida'
    return { ...base, fornecedorSelecionado: selected.fornecedor, fornecedorAutomatico: automatic?.fornecedor || null, eanOferta: selected.eanOferta, nomeOferta: selected.nomeOferta, dcbOferta: selected.dcbOferta || '', eanOfertaAutomatico: automatic?.eanOferta || null, matchMethod: selected.matchMethod, matchScore: selected.matchScore, offerKey: selected.offerKey, precoUnitario: selected.precoUnitario, precoAutomatico: automatic?.precoUnitario ?? null, menorPreco: best.precoUnitario, precoTotal, precoTotalAutomatico, impactoAjuste: ajuste && precoTotalAutomatico !== null ? precoTotal - precoTotalAutomatico : 0, status }
  })
}

const REQUIREMENTS:Record<string, string[][]> = {
  cotacao: [['ean'], ['nome'], ['precoUnit']],
  pedido: [['ean', 'codigo'], ['nome'], ['quantidade']],
  historico: [['ean'], ['precoCusto']],
  dcb: [['ean'], ['dcb']],
}

export function selectSpreadsheetMatrix(matrices:LinhaPlanilha[][], kind = ''):LinhaPlanilha[] {
  const ranked = matrices.map((matrix, index) => {
    if (!matrix.length) return { matrix, index, score: -Infinity }
    const headerIndex = detectHeaderRow(matrix)
    const headers = (matrix[headerIndex] || []).map((header) => String(header || '').trim())
    const rows = matrix.slice(headerIndex + 1).filter((row) => row.some((cell) => String(cell || '').trim()))
    const mapping = autoMapColumns(headers, rows)
    const groups = REQUIREMENTS[kind] || Object.keys(mapping).map((key) => [key])
    const matchedGroups = groups.filter((group) => group.some((key) => mapping[key] !== undefined)).length
    const complete = groups.length > 0 && matchedGroups === groups.length
    const score = (complete ? 10000 : 0) + matchedGroups * 1000 - headerIndex / 10000
    return { matrix, index, score }
  })
  ranked.sort((first, second) => second.score - first.score || first.index - second.index)
  return ranked[0]?.matrix || []
}

export async function readSpreadsheet(file:File, kind = ''):Promise<LinhaPlanilha[]> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const matrices = workbook.SheetNames.map((name:string) => XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '', blankrows: false }) as LinhaPlanilha[])
  return selectSpreadsheetMatrix(matrices, kind)
}
