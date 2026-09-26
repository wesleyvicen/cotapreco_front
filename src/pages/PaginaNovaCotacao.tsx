import {
  ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, Clipboard, ClipboardPaste, Columns3, Download, HelpCircle, Lock,
  FileSpreadsheet, Layers, Link2, PenLine, Plus, TableProperties, Trash2, UploadCloud, XCircle,
} from 'lucide-react'
import { Fragment, useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { api, apiArquivo, ErroApi } from '../api'
import { AvisoErro } from '../components/ComponentesUI'
import ModalColarColunas from '../components/ModalColarColunas'
import { colunasColadasVazias, type ColunasColadas, type LinhaColada } from '../lib/colunasColadas'
import { usarAutenticacao } from '../autenticacao'
import { acessoBloqueado } from '../lib/assinatura'
import type {
  AnaliseArquivoImportacao, Cotacao, CotacaoUnificada, MapeamentoColunas, PreviaImportacao, Produto,
} from '../types'
import { empresaAtiva, farmaciasDeCompra } from '../lib/permissoes'
import { salvarEmpresaAtiva } from '../cache/persistenciaSessao'
import { LinkInterno, usarNavegacao } from '../roteamento'
import { usarCamadaNoHistorico } from '../hooks/usarCamadaNoHistorico'
import { dataHoraLocal, nomeSugerido, prazoSugerido } from '../lib/sugestoesCotacao'

type ModoProdutos = 'planilha' | 'manual'
type CampoMapeamento = keyof MapeamentoColunas
type OrigemItem = 'planilha' | 'manual' | 'colado'
interface ItemManual { id:string; ean:string; productName:string; quantity:string; laboratory:string }
interface ItemRevisao extends ItemManual { origem:OrigemItem; confirmedSameProduct:boolean }
/* Na cotação unificada, o pedido de cada farmácia passa pelas mesmas etapas de produtos e
   revisão da cotação normal, uma farmácia por vez; o que foi revisado fica guardado aqui. */
interface PedidoRevisado { previa:PreviaImportacao; itens:ItemRevisao[] }
const mapeamentoVazio:MapeamentoColunas = { ean:null, productName:null, quantity:null, laboratory:null }
const juntarNomes = (nomes:string[]) => nomes.length <= 1 ? nomes.join('') : `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`

const novoItemManual = ():ItemManual => ({ id:crypto.randomUUID(), ean:'', productName:'', quantity:'', laboratory:'' })
const normalizar = (valor:string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ')
/* Mesma prioridade EAN > nome normalizado usada no backend para identificar o produto de uma
   linha - permite achar, na pr\u00e9via consolidada, a linha correspondente a um item enviado, mesmo
   quando ela mudou de posi\u00e7\u00e3o por ter sido somada a outra. */
const identificadorLinha = (ean:string, nome:string) => { const digitos = ean.replace(/\D/g, ''); return digitos ? `ean:${digitos}` : `nome:${normalizar(nome)}` }
const completarPeloCatalogo = (item:ItemManual, campo:keyof Omit<ItemManual, 'id'>, valor:string, produtos:Produto[]):ItemManual => {
  const alterado = { ...item, [campo]:valor }
  if (campo === 'ean') {
    const encontrado = produtos.find(produto => produto.ean === valor.replace(/\D/g, ''))
    if (encontrado) return { ...alterado, ean:encontrado.ean ?? '', productName:encontrado.name, laboratory:encontrado.laboratory ?? '' }
  }
  /* Só autocompleta com espaço/pontuação sobrando no fim, o normalizar() do match ignora essa
     borda e o auto-preenchimento dispara no meio da digitação - por exemplo, ao tentar diferenciar
     duas linhas de mesmo nome digitando um espaço antes de completar o resto, o sistema "seleciona"
     o produto do catálogo que ainda bate e substitui nome e EAN pelos dele, no meio da edição. */
  if (campo === 'productName' && valor === valor.trim()) {
    const encontrados = produtos.filter(produto => normalizar(produto.name) === normalizar(valor))
    if (encontrados.length === 1) return { ...alterado, ean:encontrados[0].ean ?? '', productName:encontrados[0].name, laboratory:encontrados[0].laboratory ?? '' }
  }
  return alterado
}

export default function PaginaNovaCotacao({ unificada = false }:{ unificada?:boolean }) {
  const navegar = usarNavegacao()
  const { user } = usarAutenticacao()
  /* Etapas internas: 1 informações, 2 produtos, 3 revisão, 4 criação, 5 compartilhar e, só
     na unificada, 6 = escolha das farmácias (exibida como segunda etapa). */
  const [etapa, setEtapa] = useState(1)
  const opcoesFarmacias = useMemo(() => farmaciasDeCompra(user), [user])
  const [farmaciasEscolhidas, setFarmaciasEscolhidas] = useState<number[]>(() => farmaciasDeCompra(user).map(farmacia => farmacia.id))
  const [indiceFarmacia, setIndiceFarmacia] = useState(0)
  const [pedidos, setPedidos] = useState<Record<number, PedidoRevisado>>({})
  const [cotacaoUnificada, setCotacaoUnificada] = useState<CotacaoUnificada|null>(null)
  /* A sessão pode chegar depois do primeiro render: sem escolha ainda, entram todas. */
  useEffect(() => { if (unificada && !farmaciasEscolhidas.length && opcoesFarmacias.length) setFarmaciasEscolhidas(opcoesFarmacias.map(farmacia => farmacia.id)) }, [unificada, farmaciasEscolhidas.length, opcoesFarmacias])
  const farmaciaAtual = unificada ? opcoesFarmacias.find(farmacia => farmacia.id === farmaciasEscolhidas[indiceFarmacia]) : undefined
  /* Nome e prazo já vêm preenchidos: são sugestões que servem na maioria das vezes e
     continuam editáveis, então a etapa 1 vira um confirmar em vez de um formulário. */
  const [nome, setNome] = useState(nomeSugerido)
  const [prazo, setPrazo] = useState(prazoSugerido)
  const [modo, setModo] = useState<ModoProdutos>('planilha')
  const [arquivo, setArquivo] = useState<File|null>(null)
  const [analise, setAnalise] = useState<AnaliseArquivoImportacao|null>(null)
  const [mapeamento, setMapeamento] = useState<MapeamentoColunas>(mapeamentoVazio)
  const [itensManuais, setItensManuais] = useState<ItemManual[]>([novoItemManual()])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [colarAberto, setColarAberto] = useState(false)
  /* O voltar do navegador fecha o modal em vez de descartar a cotação em preparo. */
  usarCamadaNoHistorico(colarAberto, () => setColarAberto(false))
  const [colunasColadas, setColunasColadas] = useState<ColunasColadas>(colunasColadasVazias)
  const [ignorarCabecalho, setIgnorarCabecalho] = useState(false)
  const [previa, setPrevia] = useState<PreviaImportacao|null>(null)
  const [itensRevisao, setItensRevisao] = useState<ItemRevisao[]>([])
  const [adicionandoExtra, setAdicionandoExtra] = useState(false)
  const [itemExtra, setItemExtra] = useState<ItemManual>(novoItemManual())
  const [editandoId, setEditandoId] = useState('')
  const [rascunho, setRascunho] = useState<ItemManual|null>(null)
  const [avisoEdicao, setAvisoEdicao] = useState('')
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

  /* A prévia do servidor pode ter menos linhas do que os itens enviados quando produtos são
     consolidados (mesmo EAN/nome e mesmo laboratório somam quantidade em uma única linha). Por
     isso a lista local é sempre reconstruída a partir de resultado.lines - nunca por índice -
     senão a tabela desalinha com itensRevisao após uma consolidação. */
  const itensDePrevia = (resultado:PreviaImportacao, origem:OrigemItem):ItemRevisao[] => resultado.lines.map(linha => ({
    id:crypto.randomUUID(), origem, ean:linha.ean ?? '', productName:linha.productName,
    quantity:linha.quantity?.toString() ?? '', laboratory:linha.laboratory ?? '', confirmedSameProduct:false,
  }))

  const iniciarRevisao = (resultado:PreviaImportacao, origem:OrigemItem) => {
    setPrevia(resultado); setItensRevisao(itensDePrevia(resultado, origem))
    setAdicionandoExtra(false); setEditandoId(''); setRascunho(null); setEtapa(3)
  }

  /* A revisão é sempre reconferida no servidor: a lista local é a fonte, e a prévia exibida é o retorno dela. */
  const validarItens = (itens:ItemRevisao[]) => api<PreviaImportacao>('/quotations/items/preview', {
    method:'POST',
    body:JSON.stringify({ items:itens.map((item, index) => ({
      row:index + 1, ean:item.ean, productName:item.productName, quantity:item.quantity, laboratory:item.laboratory,
      confirmedSameProduct:item.confirmedSameProduct,
    })) }),
  })

  /* Quando o backend não consegue confirmar sozinho que duas linhas sem EAN são o mesmo produto
     (mesmo nome e laboratório, mas sem o código de barras das duas concordando), ele devolve
     pendingConfirmation pedindo pra quem está operando confirmar. "Sim" marca as linhas do grupo
     e reenvia; a soma só acontece depois dessa confirmação. */
  const confirmarMesmoProduto = async (linhas:number[]) => {
    setErro(''); setOcupado(true)
    try {
      const proximos = itensRevisao.map((item, indice) => linhas.includes(indice + 1) ? { ...item, confirmedSameProduct:true } : item)
      const resultado = await validarItens(proximos)
      setPrevia(resultado); setItensRevisao(itensDePrevia(resultado, 'manual')); setEditandoId(''); setRascunho(null)
    } catch (e) { setErro(e instanceof ErroApi ? e.message : 'Não foi possível confirmar o produto.') }
    finally { setOcupado(false) }
  }

  const adicionarProdutoRevisao = async (event:FormEvent) => {
    event.preventDefault(); setErro(''); setOcupado(true)
    const proximos:ItemRevisao[] = [...itensRevisao, { ...itemExtra, origem:'manual', confirmedSameProduct:false }]
    try {
      const resultado = await validarItens(proximos)
      const identificador = identificadorLinha(itemExtra.ean, itemExtra.productName)
      const linhaAdicionada = resultado.lines.find(linha => identificadorLinha(linha.ean ?? '', linha.productName) === identificador)
      if (!linhaAdicionada?.valid) { setErro(linhaAdicionada?.errors.join(' ') || 'Confira o produto informado.'); return }
      setItensRevisao(itensDePrevia(resultado, 'manual')); setPrevia(resultado); setItemExtra(novoItemManual()); setAdicionandoExtra(false)
    } catch (e) { setErro(e instanceof ErroApi ? e.message : 'Não foi possível adicionar o produto.') }
    finally { setOcupado(false) }
  }

  const removerProdutoRevisao = async (id:string) => {
    const proximos = itensRevisao.filter(item => item.id !== id)
    if (!proximos.length) { setErro('A cotação precisa de pelo menos um produto.'); return }
    setErro(''); setOcupado(true)
    try {
      const resultado = await validarItens(proximos)
      setPrevia(resultado); setItensRevisao(itensDePrevia(resultado, 'manual'))
      if (editandoId === id) { setEditandoId(''); setRascunho(null) }
    } catch (e) { setErro(e instanceof ErroApi ? e.message : 'Não foi possível remover o produto.') }
    finally { setOcupado(false) }
  }

  const abrirEdicaoRevisao = (item:ItemRevisao) => {
    setErro(''); setAdicionandoExtra(false); setEditandoId(item.id); setAvisoEdicao('')
    setRascunho({ id:item.id, ean:item.ean, productName:item.productName, quantity:item.quantity, laboratory:item.laboratory })
  }

  /* "Não, são diferentes" também abre a edição, mas sem dizer o que muda o motivo de
     não conseguir editar sem entender o porquê - deixa explícito o que precisa mudar
     pra deixar de bater com a outra linha do grupo. Salvar sem alterar nada volta a
     cair na mesma pergunta, então o aviso fica visível até o campo realmente mudar. */
  const naoSaoOMesmoProduto = (item:ItemRevisao, outrasLinhas:number[]) => {
    abrirEdicaoRevisao(item)
    const rotulo = outrasLinhas.length > 1 ? `linhas ${outrasLinhas.join(' e ')}` : `linha ${outrasLinhas[0]}`
    setAvisoEdicao(`Mude o nome deste produto pra não ficar igual ao da ${rotulo} - isso resolve na hora. Só o EAN não é suficiente sozinho aqui: a ${rotulo} também precisaria do dela. Trocar só o laboratório não resolve.`)
  }

  const cancelarEdicaoRevisao = () => { setEditandoId(''); setRascunho(null); setErro(''); setAvisoEdicao('') }

  const salvarEdicaoRevisao = async () => {
    if (!rascunho) return
    const indice = itensRevisao.findIndex(item => item.id === editandoId)
    if (indice < 0) return
    const proximos = itensRevisao.map(item => item.id === editandoId ? { ...item, ...rascunho, id:item.id } : item)
    setErro(''); setOcupado(true)
    try {
      const resultado = await validarItens(proximos)
      /* Busca por identificador (EAN/nome), não por posição: o item editado pode ter sido
         consolidado com outra linha e mudado de posição na prévia, ou até de índice. */
      const identificador = identificadorLinha(rascunho.ean, rascunho.productName)
      const linha = resultado.lines.find(candidata => identificadorLinha(candidata.ean ?? '', candidata.productName) === identificador)
      /* pendingConfirmation também deixa a linha com valid=false, mas sem errors - checa
         primeiro, senão cai no genérico "Confira os dados do produto." sem dizer o motivo real. */
      if (linha?.pendingConfirmation) { setAvisoEdicao('Ainda bate com a outra linha. Mude o nome pra resolver na hora - só o EAN aqui não basta, a outra linha também precisaria do dela.'); return }
      if (!linha?.valid) { setErro(linha?.errors.join(' ') || 'Confira os dados do produto.'); return }
      setItensRevisao(itensDePrevia(resultado, 'manual')); setPrevia(resultado); setEditandoId(''); setRascunho(null); setAvisoEdicao('')
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

  const limparProdutos = () => {
    setModo('planilha'); setArquivo(null); setAnalise(null); setMapeamento(mapeamentoVazio); setItensManuais([novoItemManual()])
    setColunasColadas(colunasColadasVazias); setPrevia(null); setItensRevisao([]); setAdicionandoExtra(false)
    setEditandoId(''); setRascunho(null); setAvisoEdicao(''); setErro('')
  }

  /* Abre o pedido de uma farmácia: direto na revisão se ele já foi importado, senão na etapa de produtos. */
  const abrirPedido = (indice:number, revisados:Record<number, PedidoRevisado> = pedidos) => {
    limparProdutos(); setIndiceFarmacia(indice)
    const pedido = revisados[farmaciasEscolhidas[indice]]
    if (pedido) { setPrevia(pedido.previa); setItensRevisao(pedido.itens); setEtapa(3) }
    else setEtapa(2)
  }

  const alternarFarmacia = (id:number) => setFarmaciasEscolhidas(atuais => atuais.includes(id)
    ? atuais.filter(atual => atual !== id)
    : opcoesFarmacias.map(farmacia => farmacia.id).filter(opcao => opcao === id || atuais.includes(opcao)))

  const concluirPedido = () => {
    if (!previa || !farmaciaAtual) return
    const revisados = { ...pedidos, [farmaciaAtual.id]:{ previa, itens:itensRevisao } }
    setPedidos(revisados)
    if (indiceFarmacia < farmaciasEscolhidas.length - 1) abrirPedido(indiceFarmacia + 1, revisados)
    else setEtapa(4)
  }

  const criarUnificada = async () => {
    setOcupado(true); setErro('')
    try {
      setCotacaoUnificada(await api<CotacaoUnificada>('/unified-quotations', { method:'POST', body:JSON.stringify({
        name:nome, expiresAt:prazo ? new Date(prazo).toISOString() : null,
        pharmacies:farmaciasEscolhidas.map(id => ({ companyId:id, items:pedidos[id].previa.lines.filter(linha => linha.valid).map(linha => ({
          ean:linha.ean, productName:linha.productName, quantity:linha.quantity, laboratory:linha.laboratory,
        })) })),
      }) }))
      setEtapa(5)
    } catch (e) { setErro(e instanceof ErroApi ? e.message : 'Não foi possível criar a cotação unificada.') }
    finally { setOcupado(false) }
  }

  /* Acompanha pela parte da farmácia ativa; se ela não participa, troca para a primeira da lista. */
  const acompanharUnificada = (criada:CotacaoUnificada) => {
    const ativa = empresaAtiva(user)?.id
    const parte = criada.pharmacies.find(farmacia => farmacia.companyId === ativa) ?? criada.pharmacies[0]
    if (parte.companyId === ativa) { navegar(`/cotacoes/${parte.quotationId}`); return }
    salvarEmpresaAtiva(parte.companyId); window.location.assign(`/cotacoes/${parte.quotationId}`)
  }

  const copiar = async (valor:string, tipo:string) => {
    await navigator.clipboard.writeText(valor); setCopiado(tipo); setTimeout(() => setCopiado(''), 1800)
  }
  const linkPublico = cotacao?.publicUrl ?? cotacaoUnificada?.publicUrl ?? null
  const nomesUnificada = juntarNomes(cotacaoUnificada?.pharmacies.map(farmacia => farmacia.companyName) ?? [])
  const mensagem = !linkPublico ? '' : cotacaoUnificada
    ? `Olá! Estamos realizando uma cotação conjunta das farmácias ${nomesUnificada}.\nAs quantidades já estão somadas: você responde uma vez só, pelo link abaixo:\n${linkPublico}\nObrigado!`
    : `Olá! Estamos realizando uma nova cotação.\nVocê pode enviar seus preços através do link abaixo:\n${linkPublico}\nObrigado!`
  const rotulosEtapas = unificada ? ['Informações', 'Farmácias', 'Pedidos', 'Criação', 'Compartilhar'] : ['Informações', 'Produtos', 'Revisão', 'Criação', 'Compartilhar']
  const passoVisivel = unificada ? ({ 1:1, 6:2, 2:3, 3:3, 4:4, 5:5 } as Record<number, number>)[etapa] : etapa
  const rotuloEtapa = (interna:number) => `Etapa ${unificada ? ({ 1:1, 6:2, 2:3, 3:3, 4:4, 5:5 } as Record<number, number>)[interna] : interna} de 5`
  const produtosDistintos = new Set(farmaciasEscolhidas.flatMap(id => pedidos[id]?.previa.lines.filter(linha => linha.valid).map(linha => identificadorLinha(linha.ean ?? '', linha.productName)) ?? [])).size
  const avisoFarmacia = farmaciaAtual && <div className="unified-current"><Building2/><span>Pedido da <strong>{farmaciaAtual.name}</strong></span><small>Farmácia {indiceFarmacia + 1} de {farmaciasEscolhidas.length}</small></div>
  /* "Corrigir produtos" reabre a etapa 2 já com a lista atual da revisão (com o que foi somado,
     editado ou excluído) em modo manual, em vez de reprocessar de novo o arquivo ou a colagem
     originais - senão avançar de novo jogava fora toda mesclagem e confirmação já resolvida
     na revisão e voltava pros dados brutos importados. */
  const voltarProdutos = () => {
    setErro('')
    if (itensRevisao.length) {
      setModo('manual')
      setItensManuais(itensRevisao.map(item => ({ id:item.id, ean:item.ean, productName:item.productName, quantity:item.quantity, laboratory:item.laboratory })))
    }
    setEtapa(2)
  }

  if (acessoBloqueado(user?.accessAllowed)) return <div className="page narrow">
    <div className="back-row"><LinkInterno to="/cotacoes" className="text-link"><ArrowLeft/>Voltar para cotações</LinkInterno></div>
    <section className="card assinatura-bloqueio">
      <div className="assinatura-bloqueio-icone"><Lock/></div>
      <h1>Seu período de teste terminou</h1>
      <p>Novas cotações ficam pausadas até a assinatura. Tudo o que você já criou continua aqui: comparativos, pedidos, histórico de preços e as exportações em Excel.</p>
      <div className="assinatura-bloqueio-acoes">
        <LinkInterno className="button button-primary" to="/assinatura">Ver planos e assinar</LinkInterno>
        <LinkInterno className="button button-ghost" to="/cotacoes">Ver minhas cotações</LinkInterno>
      </div>
    </section>
  </div>

  if (unificada && opcoesFarmacias.length < 2) return <div className="page narrow">
    <div className="back-row"><LinkInterno to="/" className="text-link"><ArrowLeft/>Voltar para o painel</LinkInterno></div>
    <section className="card assinatura-bloqueio">
      <div className="assinatura-bloqueio-icone"><Building2/></div>
      <h1>Cotação unificada precisa de duas farmácias</h1>
      <p>Ela junta os pedidos de várias farmácias da rede num link só. Você precisa de permissão de compra em pelo menos duas delas.</p>
      <div className="assinatura-bloqueio-acoes"><BotaoNovaCotacaoSimples/></div>
    </section>
  </div>

  return <div className="page narrow">
    <div className="back-row"><LinkInterno to="/cotacoes" className="text-link"><ArrowLeft/>Voltar para cotações</LinkInterno></div>
    <div className="page-header"><div><span className="eyebrow green">Novo processo</span><h1>{unificada ? 'Cotação unificada' : 'Nova cotação'}</h1><p>{unificada ? 'Os pedidos de várias farmácias num único link: o representante responde uma vez e cada farmácia gera o seu pedido.' : 'Em poucos passos, sua cotação estará pronta para compartilhar.'}</p></div></div>
    <div className="stepper">{rotulosEtapas.map((rotulo, indice) => {
      const numero = indice + 1
      return <div key={rotulo} className={`step ${passoVisivel === numero ? 'active' : ''} ${passoVisivel > numero ? 'done' : ''}`}><span>{passoVisivel > numero ? <Check size={16}/> : numero}</span><label>{rotulo}</label></div>
    })}</div>
    {erro && <AvisoErro message={erro}/>}<section className="card wizard-card">
      {etapa === 1 && <form onSubmit={(event:FormEvent) => { event.preventDefault(); setErro(''); setEtapa(unificada ? 6 : 2) }}>
        <div className="wizard-heading"><span>{rotuloEtapa(1)}</span><h2>Vamos identificar esta cotação</h2><p>Use um nome fácil de reconhecer no painel.</p></div>
        <div className="form-grid">
          <label className="full">Nome da cotação<input autoFocus required maxLength={180} placeholder="Ex.: Reposição primeira quinzena" value={nome} onChange={event => setNome(event.target.value)}/></label>
          <label className="full">Prazo para respostas <small>Opcional</small><input type="datetime-local" value={prazo} min={dataHoraLocal()} onChange={event => setPrazo(event.target.value)}/></label>
        </div>
        <div className="wizard-actions"><span/><button className="button button-primary">Continuar <ArrowRight/></button></div>
      </form>}

      {etapa === 6 && <div>
        <div className="wizard-heading"><span>{rotuloEtapa(6)}</span><h2>Quais farmácias entram nesta cotação?</h2><p>Você importa o pedido de cada uma na próxima etapa. O representante recebe um único link, com as quantidades somadas, e responde uma vez.</p></div>
        <div className="unified-pharmacies">{opcoesFarmacias.map(farmacia => {
          const escolhida = farmaciasEscolhidas.includes(farmacia.id)
          const pedido = pedidos[farmacia.id]
          return <label key={farmacia.id} className={`source-card ${escolhida ? 'selected' : ''}`}>
            <input type="checkbox" checked={escolhida} onChange={() => alternarFarmacia(farmacia.id)}/>
            <Building2/><span><strong>{farmacia.name}</strong><small>{pedido ? `${pedido.previa.validRows} produtos já revisados` : 'Pedido ainda não importado'}</small></span>
          </label>
        })}</div>
        {farmaciasEscolhidas.length < 2 && <small className="mapping-error">Selecione ao menos duas farmácias.</small>}
        <div className="wizard-actions"><button className="button button-ghost" onClick={() => setEtapa(1)}><ArrowLeft/>Voltar</button><button className="button button-primary" disabled={farmaciasEscolhidas.length < 2} onClick={() => abrirPedido(0)}>Importar pedidos <ArrowRight/></button></div>
      </div>}

      {etapa === 2 && <div>
        <div className="wizard-heading"><span>{rotuloEtapa(2)}</span><h2>{farmaciaAtual ? `Pedido da ${farmaciaAtual.name}` : 'Adicione os produtos'}</h2><p>Importe uma planilha pronta ou preencha os itens diretamente no sistema.</p></div>
        {avisoFarmacia}
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
            <div className="source-preview"><div className="section-caption"><TableProperties/><div><strong>Prévia original do arquivo</strong><span>As colunas não escolhidas serão ignoradas.</span></div></div><div className="table-wrap"><table><thead><tr>{analise.columns.map(coluna => <th key={coluna.index}>{coluna.name}</th>)}</tr></thead><tbody>{analise.sampleRows.map((linha, indice) => <tr key={indice}>{analise.columns.map(coluna => <td key={coluna.index}>{linha[coluna.index] || <span className="muted">-</span>}</td>)}</tr>)}</tbody></table></div></div>
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

        <div className="wizard-actions"><button className="button button-ghost" onClick={() => { if (!unificada) setEtapa(1); else if (indiceFarmacia === 0) setEtapa(6); else abrirPedido(indiceFarmacia - 1) }}><ArrowLeft/>Voltar</button><button className="button button-primary" disabled={ocupado || (modo === 'planilha' && (!analise || colunasRepetidas || mapeamento.productName === null || mapeamento.quantity === null))} onClick={() => void (modo === 'planilha' ? gerarPreviaPlanilha() : gerarPreviaManual())}>{ocupado ? 'Conferindo...' : 'Conferir produtos'} <ArrowRight/></button></div>
      </div>}

      {etapa === 3 && previa && <div>
        <div className="wizard-heading"><span>{rotuloEtapa(3)}</span><h2>{farmaciaAtual ? `Revise o pedido da ${farmaciaAtual.name}` : 'Revise os produtos'}</h2><p>Edite, remova ou acrescente itens direto aqui. Nenhum produto ou cotação foi salvo até este ponto.</p></div>
        {avisoFarmacia}
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
        <div className="import-summary"><div><CheckCircle2/><strong>{previa.validRows}</strong><span>linhas válidas</span></div><div className={previa.invalidRows ? 'danger' : ''}><XCircle/><strong>{previa.invalidRows}</strong><span>com problema</span></div><div><Clipboard/><strong>{previa.lines.filter(linha => !linha.productExists && linha.valid).length}</strong><span>novos produtos</span></div>{previa.lines.some(linha => linha.consolidation) && <div><Layers/><strong>{previa.lines.filter(linha => linha.consolidation).length}</strong><span>produtos consolidados</span></div>}</div>
        <div className="table-wrap import-table"><table><thead><tr><th>Linha</th><th>EAN</th><th>Produto</th><th>Laboratório</th><th>Qtd.</th><th>Cadastro</th><th aria-label="Ações"/></tr></thead><tbody>{itensRevisao.map((item, indice) => {
          const linha = previa.lines[indice]
          if (!linha) return null
          if (editandoId === item.id && rascunho) return <Fragment key={item.id}><tr className="editing-row"><td>{linha.row}</td>
            <td><input className="review-cell-input" list="revisao-produtos-eans" inputMode="numeric" maxLength={14} placeholder="Sem EAN" aria-label="EAN" value={rascunho.ean} onChange={event => setRascunho(atual => atual && completarPeloCatalogo(atual, 'ean', event.target.value.replace(/\D/g, ''), produtos))}/></td>
            <td><input className="review-cell-input" list="revisao-produtos-nomes" maxLength={240} placeholder="Nome ou descrição" aria-label="Descrição do produto" autoFocus value={rascunho.productName} onChange={event => setRascunho(atual => atual && completarPeloCatalogo(atual, 'productName', event.target.value, produtos))}/></td>
            <td><input className="review-cell-input" maxLength={160} placeholder="Fabricante" aria-label="Laboratório" value={rascunho.laboratory} onChange={event => setRascunho(atual => atual && ({ ...atual, laboratory:event.target.value }))}/></td>
            <td><input className="review-cell-input" type="number" min="1" step="1" placeholder="0" aria-label="Quantidade" value={rascunho.quantity} onChange={event => setRascunho(atual => atual && ({ ...atual, quantity:event.target.value }))} onKeyDown={event => { if (event.key === 'Enter') void salvarEdicaoRevisao() }}/></td>
            <td><span className="mini-tag">Editando</span></td>
            <td><div className="review-row-actions"><button type="button" className="icon-button" disabled={ocupado} title="Cancelar edição" aria-label="Cancelar edição" onClick={cancelarEdicaoRevisao}><XCircle/></button><button type="button" className="icon-button primary" disabled={ocupado} title="Salvar produto" aria-label="Salvar produto" onClick={() => void salvarEdicaoRevisao()}><Check/></button></div></td></tr>
            {avisoEdicao && <tr className="editing-hint-row"><td colSpan={7}><div className="confirmation-note confirmation-note-primary"><small><HelpCircle/>{avisoEdicao}</small></div></td></tr>}</Fragment>
          const pendente = linha.pendingConfirmation
          const linhasPendentes = pendente?.rows ?? []
          const outrasLinhas = linhasPendentes.filter(numero => numero !== linha.row)
          const rotuloOutras = outrasLinhas.length > 1 ? `linhas ${outrasLinhas.join(' e ')}` : `linha ${outrasLinhas[0]}`
          const éPrimeiraDoGrupo = pendente ? linhasPendentes[0] === linha.row : false
          const classeLinha = pendente ? `pending-row${éPrimeiraDoGrupo ? ' pending-row-first' : ' pending-row-last'}` : !linha.valid ? 'invalid-row' : ''
          /* Cada linha do grupo tem seus próprios botões - se uma delas for editada ou removida
             no meio do caminho, a outra ainda resolve o par sozinha. Clicar "sim" em qualquer uma
             confirma o grupo inteiro (mesma lista de linhas é enviada). Card de uma linha só - a
             versão anterior com texto completo em cada linha do par tomava quase a tabela toda. */
          return <tr key={item.id} className={classeLinha}><td>{linha.row}</td><td>{linha.ean ? <code>{linha.ean}</code> : <span className="muted">Sem EAN</span>}</td><td><strong>{linha.productName || 'Sem nome'}</strong>{linha.errors.map(mensagemErro => <small className="field-error" key={mensagemErro}>{mensagemErro}</small>)}{linha.consolidation && <small className="consolidation-note" title={`Linhas ${linha.consolidation.rows.join(', ')} da importação`}><Layers/>Consolidado: {linha.consolidation.quantities.join(' + ')} = {linha.consolidation.total} un.</small>}{pendente && <div className="confirmation-note-compact" title="Mesmo nome e laboratório, mas sem EAN pra provar que é o mesmo item."><HelpCircle/><span>Mesmo produto da {rotuloOutras}?</span><button type="button" className="button-mini" disabled={ocupado || Boolean(editandoId)} aria-label="Não, são produtos diferentes" title="Não, são diferentes" onClick={() => naoSaoOMesmoProduto(item, outrasLinhas)}><XCircle/></button><button type="button" className="button-mini primary" disabled={ocupado || Boolean(editandoId)} aria-label="Sim, é o mesmo produto" title="Sim, é o mesmo" onClick={() => void confirmarMesmoProduto(linhasPendentes)}><Check/></button></div>}</td><td>{linha.laboratory || <span className="muted">-</span>}</td><td>{linha.quantity ?? '-'}</td><td>{pendente ? <span className="mini-tag warning">Confirmar</span> : linha.valid ? <span className={`mini-tag ${linha.productExists ? '' : 'new'}`}>{linha.productExists ? 'Encontrado' : 'Será cadastrado'}</span> : <span className="mini-tag error">Corrigir</span>}</td>
            <td><div className="review-row-actions"><button type="button" className="icon-button" disabled={ocupado || Boolean(editandoId)} title="Editar produto" aria-label={`Editar ${linha.productName || 'produto'}`} onClick={() => abrirEdicaoRevisao(item)}><PenLine/></button><button type="button" className="icon-button" disabled={ocupado || Boolean(editandoId) || itensRevisao.length === 1} title={itensRevisao.length === 1 ? 'A cotação precisa de pelo menos um produto' : 'Remover produto'} aria-label={`Remover ${linha.productName || 'produto'}`} onClick={() => void removerProdutoRevisao(item.id)}><Trash2/></button></div></td></tr>
        })}</tbody></table></div>
        {previa.invalidRows > 0 && <div className="alert alert-warning">Responda as confirmações pendentes e corrija os itens destacados usando o lápis na própria linha, ou remova o que não faz mais sentido.</div>}
        <div className="wizard-actions"><button className="button button-ghost" onClick={voltarProdutos}><ArrowLeft/>Corrigir produtos</button><button className="button button-primary" disabled={previa.invalidRows > 0 || ocupado || adicionandoExtra || Boolean(editandoId)} onClick={() => unificada ? concluirPedido() : setEtapa(4)}>{unificada && indiceFarmacia < farmaciasEscolhidas.length - 1 ? 'Próxima farmácia' : 'Revisar criação'} <ArrowRight/></button></div>
      </div>}

      {etapa === 4 && unificada && <div><div className="wizard-heading"><span>{rotuloEtapa(4)}</span><h2>Tudo pronto para abrir</h2><p>Ao confirmar, cada farmácia ganha a sua cotação e um único link público é gerado para todas.</p></div>
        <div className="review-box"><div><span>Nome</span><strong>{nome}</strong></div><div><span>Prazo</span><strong>{prazo ? new Date(prazo).toLocaleString('pt-BR') : 'Sem prazo definido'}</strong></div><div><span>Farmácias</span><strong>{farmaciasEscolhidas.length}</strong></div><div><span>Produtos no link</span><strong>{produtosDistintos} itens</strong></div></div>
        <div className="unified-summary">{farmaciasEscolhidas.map((id, indice) => <div key={id}><Building2/><span><strong>{opcoesFarmacias.find(farmacia => farmacia.id === id)?.name}</strong><small>{pedidos[id]?.previa.validRows ?? 0} produtos</small></span><button type="button" className="text-link" onClick={() => abrirPedido(indice)}>Revisar</button></div>)}</div>
        <div className="wizard-actions"><button className="button button-ghost" onClick={() => abrirPedido(farmaciasEscolhidas.length - 1)}><ArrowLeft/>Voltar</button><button className="button button-primary" disabled={ocupado || farmaciasEscolhidas.some(id => !pedidos[id])} onClick={() => void criarUnificada()}>{ocupado ? 'Criando...' : 'Criar e abrir cotação unificada'} <Check/></button></div></div>}

      {etapa === 4 && !unificada && previa && <div><div className="wizard-heading"><span>{rotuloEtapa(4)}</span><h2>Tudo pronto para abrir</h2><p>Ao confirmar, produtos novos serão cadastrados e o link público será gerado.</p></div><div className="review-box"><div><span>Nome</span><strong>{nome}</strong></div><div><span>Prazo</span><strong>{prazo ? new Date(prazo).toLocaleString('pt-BR') : 'Sem prazo definido'}</strong></div><div><span>Produtos</span><strong>{previa.validRows} itens</strong></div><div><span>Novos cadastros</span><strong>{previa.lines.filter(linha => !linha.productExists).length} produtos</strong></div></div><div className="wizard-actions"><button className="button button-ghost" onClick={() => setEtapa(3)}><ArrowLeft/>Voltar</button><button className="button button-primary" disabled={ocupado} onClick={() => void criar()}>{ocupado ? 'Criando...' : 'Criar e abrir cotação'} <Check/></button></div></div>}

      {etapa === 5 && linkPublico && <div className="share-success"><div className="success-icon"><CheckCircle2/></div><span className="eyebrow green">{cotacaoUnificada ? 'Cotação unificada aberta' : 'Cotação aberta'}</span><h2>Agora é só compartilhar!</h2><p>{cotacaoUnificada ? `Um link só para ${nomesUnificada}. Os representantes respondem uma vez e cada farmácia recebe a sua parte.` : 'Envie este link para os representantes. Eles entram ou criam uma conta para responder.'}</p><div className="copy-box"><Link2/><span>{linkPublico}</span><button className="button button-secondary" onClick={() => void copiar(linkPublico, 'link')}>{copiado === 'link' ? 'Copiado!' : 'Copiar link'}</button></div><div className="message-preview"><p>{mensagem}</p><button className="button button-ghost" onClick={() => void copiar(mensagem, 'mensagem')}><Clipboard/>{copiado === 'mensagem' ? 'Mensagem copiada!' : 'Copiar mensagem'}</button></div><div className="wizard-actions centered"><button className="button button-primary" onClick={() => { if (cotacaoUnificada) acompanharUnificada(cotacaoUnificada); else if (cotacao) navegar(`/cotacoes/${cotacao.id}`) }}>Acompanhar cotação <ArrowRight/></button></div></div>}
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

function BotaoNovaCotacaoSimples() {
  return <LinkInterno className="button button-primary" to="/cotacoes/nova">Criar cotação normal</LinkInterno>
}
