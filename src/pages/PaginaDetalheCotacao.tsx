import { AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, CheckCircle2, Sparkles, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clipboard, Clock3, Download, Edit3, ExternalLink, Eye, EyeOff, FileImage, FileSpreadsheet, FileText, FoldHorizontal, GripVertical, History, Link2, Lock, PackageCheck, Power, RefreshCw, RotateCcw, Save, Search, Send, Share2, ShoppingCart, SlidersHorizontal, Trophy, Users, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as EventoPonteiroReact } from 'react'
import { api, apiArquivo, date, ErroApi, money } from '../api'
import { usarAutenticacao } from '../autenticacao'
import { EstadoVazio, AvisoErro, Carregando, EtiquetaStatus } from '../components/ComponentesUI'
import type { ComparacaoCotacao, ComparacaoProduto, OfertaDistribuidor, Cotacao, EstrategiaPedidoMinimo, HistoricoPlano, OpcoesPedidoMinimo, PedidoCompra, PreviaManualPedidoMinimo, PreviaResposta, RespostaCotacao, ResultadoRestauracaoPlano, VersaoPlano } from '../types'
import { usarCamadaNoHistorico } from '../hooks/usarCamadaNoHistorico'
import { LinkInterno, usarParametros } from '../roteamento'

type Aba='products'|'responses'|'comparison'|'purchase'
type Alocacao={responseId:number;quantity:number}
type EdicaoPlano={quotationItemId:number;desiredQuantity:number;selectedResponseId:number|null;championQuantity:number|null;stockOverrideNote:string;manualSelection:boolean;allocations:Alocacao[]}

/* A divisão mais barata possível, respeitando o estoque de cada uma. É a mesma regra que o
   backend usa quando não há divisão salva, e é com ela que a matriz abre preenchida. */
function divisaoMaisBarata(produto:ComparacaoProduto,desejada:number):Alocacao[] {
  const alocacoes:Alocacao[]=[];let restante=Math.max(0,desejada)
  for(const oferta of produto.offers){if(restante<=0)break
    const quantidade=Math.min(restante,oferta.availableQuantity)
    if(quantidade>0){alocacoes.push({responseId:oferta.responseId,quantity:quantidade});restante-=quantidade}}
  return alocacoes
}
type FormatoPedido='pdf'|'image'
type TipoRelatorioPdf='general'|'divergences'
type ItemConferencia={quotationItemId:number;ean:string|null;productName:string;quantity:number;unitPrice:number;receivedQuantity:number|null;receivedUnitPrice:number|null;receiptNote:string;reorderShortfall:boolean}
type PedidoConferencia={orderId:number;supplierName:string;checkedAt:string|null;items:ItemConferencia[]}
const tituloAba:Record<Aba,string>={products:'Produtos',responses:'Respostas',comparison:'Inteligência de compra',purchase:'Compra sugerida'}
const prazoLocalMais24Horas=(expiraEm:string|null)=>{const agora=new Date(),atual=expiraEm?new Date(expiraEm):agora,base=atual>agora?atual:agora;base.setHours(base.getHours()+24);const pad=(valor:number)=>String(valor).padStart(2,'0');return `${base.getFullYear()}-${pad(base.getMonth()+1)}-${pad(base.getDate())}T${pad(base.getHours())}:${pad(base.getMinutes())}`}
const interpretarPrecoDigitado=(digitos:string)=>{if(!digitos)return null;const centavos=digitos.length===1?Number(digitos)*100:digitos.length===2?Number(digitos[0])*100+Number(digitos[1])*10:Number(digitos);return centavos/100}
const formatarPrecoDigitado=(digitos:string)=>{const valor=interpretarPrecoDigitado(digitos);return valor==null?'':new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(valor)}

interface AchadoPreco { produto:ComparacaoProduto; melhor:OfertaDistribuidor; segunda:OfertaDistribuidor; volume:number; economia:number; percentual:number }
interface AchadoRisco { produto:ComparacaoProduto; ofertas:number; distribuidoras:number }
const semAcento=(valor:string)=>valor.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
const CHAVE_CORTE='cotapreco:achados-corte'
const CHAVE_ACHADOS_ABERTO='cotapreco:achados-aberto'
/* A faixa nasce minimizada: a tela já chega cheia, e três cartões de achado empurram o
   comparativo para fora da primeira dobra antes de a pessoa ter escolhido olhar para eles.
   Minimizada ela continua dizendo quantos são, que é o que decide se vale abrir.
   Só 'true' expande: quem abriu de propósito alguma vez continua encontrando aberta. */
function lerAchadosAberto(){
  try{return window.localStorage.getItem(CHAVE_ACHADOS_ABERTO)==='true'}catch{return false}
}
const CORTE_PADRAO=15
/* Fora da faixa se ajusta ao limite, nunca cai para zero: um corte inválido virando "sem corte"
   alargaria o filtro justamente quando o usuário pediu para apertá-lo. */
const limitarCorte=(valor:number)=>Math.min(100,Math.max(0,Math.round(valor)))
const corteValido=(valor:number)=>Number.isFinite(valor)&&valor>=0&&valor<=100
function lerCorte(){
  try{const salvo=Number(window.localStorage.getItem(CHAVE_CORTE));return corteValido(salvo)?salvo:CORTE_PADRAO}catch{return CORTE_PADRAO}
}

export default function PaginaDetalheCotacao(){
  const finalizando=useRef(false)
  const{id}=usarParametros();const{user}=usarAutenticacao();const[cotacao,setCotacao]=useState<Cotacao|null>(null);const[respostas,setRespostas]=useState<RespostaCotacao[]>([]);const[comparacao,setComparacao]=useState<ComparacaoCotacao|null>(null);const[pedidos,setPedidos]=useState<PedidoCompra[]>([])
  const[aba,setAba]=useState<Aba>('responses');const[carregando,setCarregando]=useState(true);const[respostasCarregadas,setRespostasCarregadas]=useState(false);const[pedidosCarregados,setPedidosCarregados]=useState(false);const[historicoCarregado,setHistoricoCarregado]=useState(false);const[ocupado,setOcupado]=useState(false);const[erro,setErro]=useState('');const[mensagem,setMensagem]=useState('');const[copiado,setCopiado]=useState('');const[expandidas,setExpandidas]=useState<Set<string>>(new Set());const[produtoDestacado,setProdutoDestacado]=useState<number|null>(null);const[corteTexto,setCorteTexto]=useState(()=>String(lerCorte()));const[achadosAberto,setAchadosAberto]=useState(lerAchadosAberto);const[todosAbertos,setTodosAbertos]=useState(false);const[produtoTroca,setProdutoTroca]=useState<ComparacaoProduto|null>(null);const[produtoPlano,setProdutoPlano]=useState<number|null>(null);const[edicoes,setEdicoes]=useState<EdicaoPlano[]|null>(null);const[versaoBaseEdicao,setVersaoBaseEdicao]=useState(0);const[errosPlano,setErrosPlano]=useState<Record<string,string>>({});const[erroPlano,setErroPlano]=useState('');const[erroAjuste,setErroAjuste]=useState('');const[prorrogando,setProrrogando]=useState(false);const[novoPrazo,setNovoPrazo]=useState('');const[linkProrrogado,setLinkProrrogado]=useState(false);const[opcoesMinimo,setOpcoesMinimo]=useState<OpcoesPedidoMinimo|null>(null);const[ajusteManual,setAjusteManual]=useState<OpcoesPedidoMinimo|null>(null);const[historico,setHistorico]=useState<HistoricoPlano>({currentVersionId:0,canUndo:false,versions:[]});const[historicoAberto,setHistoricoAberto]=useState(false);const[conferencia,setConferencia]=useState<PedidoConferencia[]|null>(null);const[confirmarCoberturaParcial,setConfirmarCoberturaParcial]=useState(false);const[confirmacaoCoberturaAberta,setConfirmacaoCoberturaAberta]=useState(false);const[previaResposta,setPreviaResposta]=useState<PreviaResposta|null>(null);const[carregandoPreviaResposta,setCarregandoPreviaResposta]=useState(false)
  /* Os modais desta tela participam do histórico: o voltar do navegador fecha o que está na
     frente, em vez de abandonar a cotação inteira e perder o que estava aberto. */
  usarCamadaNoHistorico(previaResposta!=null,()=>setPreviaResposta(null))
  usarCamadaNoHistorico(conferencia!=null,()=>setConferencia(null))
  usarCamadaNoHistorico(produtoTroca!=null,()=>setProdutoTroca(null))
  usarCamadaNoHistorico(edicoes!=null,()=>{setEdicoes(null);setProdutoPlano(null);setErroPlano('');setErrosPlano({})})
  usarCamadaNoHistorico(prorrogando,()=>setProrrogando(false))
  usarCamadaNoHistorico(opcoesMinimo!=null,()=>setOpcoesMinimo(null))
  usarCamadaNoHistorico(ajusteManual!=null,()=>{setAjusteManual(null);setErroAjuste('')})
  usarCamadaNoHistorico(historicoAberto,()=>setHistoricoAberto(false))
  usarCamadaNoHistorico(confirmacaoCoberturaAberta,()=>setConfirmacaoCoberturaAberta(false))
  usarCamadaNoHistorico(todosAbertos,()=>setTodosAbertos(false))
  useEffect(()=>{document.title=`${cotacao?`${cotacao.name} — ${tituloAba[aba]}`:'Cotação'} | CotaPreço`},[cotacao,aba])
  const invalidarCompra=useCallback(()=>{setComparacao(null);setPedidos([]);setPedidosCarregados(false);setHistorico({currentVersionId:0,canUndo:false,versions:[]});setHistoricoCarregado(false)},[])
  const carregar=useCallback(async()=>{if(!id)return;setCarregando(true);setErro('');try{const[q,r]=await Promise.all([api<Cotacao>(`/quotations/${id}`),api<RespostaCotacao[]>(`/quotations/${id}/responses`)]);setCotacao(q);setRespostas(r);setRespostasCarregadas(true)}catch(e){setErro(e instanceof ErroApi?e.message:'Falha ao carregar a cotação.')}finally{setCarregando(false)}},[id]);useEffect(()=>{setRespostas([]);setRespostasCarregadas(false);invalidarCompra();void carregar()},[carregar,invalidarCompra])
  const carregarRespostas=useCallback(async()=>{if(!id||respostasCarregadas)return;try{setRespostas(await api<RespostaCotacao[]>(`/quotations/${id}/responses`));setRespostasCarregadas(true)}catch(e){setErro(mensagemErro(e,'Não foi possível carregar as respostas.'))}},[id,respostasCarregadas])
  const carregarComparacao=useCallback(async()=>{if(!id)return null;if(comparacao)return comparacao;try{const dados=await api<ComparacaoCotacao>(`/quotations/${id}/comparison`);setComparacao(dados);return dados}catch(e){setErro(mensagemErro(e,'Não foi possível carregar o comparativo.'));return null}},[id,comparacao])
  const carregarPedidos=useCallback(async()=>{if(!id||pedidosCarregados)return;try{setPedidos(await api<PedidoCompra[]>(`/quotations/${id}/orders`));setPedidosCarregados(true)}catch(e){setErro(mensagemErro(e,'Não foi possível carregar os pedidos.'))}},[id,pedidosCarregados])
  const carregarHistorico=useCallback(async()=>{if(!id||historicoCarregado)return;try{setHistorico(await api<HistoricoPlano>(`/quotations/${id}/purchase-plan/history`));setHistoricoCarregado(true)}catch(e){setErro(mensagemErro(e,'Não foi possível carregar o histórico.'))}},[id,historicoCarregado])
  useEffect(()=>{if(cotacao?.status==='OPEN'||cotacao?.status==='CLOSED')void carregarComparacao();if(aba==='responses')void carregarRespostas();if(aba==='comparison')void carregarComparacao();if(aba==='purchase'){void carregarComparacao();void carregarPedidos();if(cotacao?.status==='CLOSED'&&['ADMIN','BUYER'].includes(user?.role??''))void carregarHistorico()}},[aba,carregarComparacao,carregarHistorico,carregarPedidos,carregarRespostas,cotacao?.status,user?.role])
  const atualizarCompra=async()=>{if(!id)return;const[c,o,h]=await Promise.all([api<ComparacaoCotacao>(`/quotations/${id}/comparison`),api<PedidoCompra[]>(`/quotations/${id}/orders`),api<HistoricoPlano>(`/quotations/${id}/purchase-plan/history`)]);setComparacao(c);setPedidos(o);setPedidosCarregados(true);setHistorico(h);setHistoricoCarregado(true)}
  const acao=async(tipo:'open'|'close')=>{setOcupado(true);try{await api(`/quotations/${id}/${tipo}`,{method:'POST'});invalidarCompra();await carregar()}catch(e){setErro(mensagemErro(e,'Operação não concluída.'))}finally{setOcupado(false)}}
  const atualizarItem=async(itemId:number,quantity:number,active:boolean)=>{if(!active&&!window.confirm('Desativar este produto? Ele será removido do comparativo, da compra sugerida e dos próximos pedidos.'))return;setOcupado(true);setErro('');try{await api(`/quotations/${id}/items/${itemId}`,{method:'PUT',body:JSON.stringify({quantity,active})});invalidarCompra();await carregar();setMensagem(active?'Produto atualizado.':'Produto desativado e removido dos cálculos da cotação.')}catch(e){setErro(mensagemErro(e,'Não foi possível atualizar o produto.'))}finally{setOcupado(false)}}
  const atualizarRespostaAtiva=async(resposta:RespostaCotacao,active:boolean)=>{if(!active&&!window.confirm(`Desativar a resposta de ${resposta.supplierName}? Ela deixará de influenciar a compra sugerida.`))return;setOcupado(true);setErro('');try{await api(`/quotations/${id}/responses/${resposta.id}/active`,{method:'PUT',body:JSON.stringify({active})});invalidarCompra();setRespostas(atual=>atual.map(item=>item.id===resposta.id?{...item,active}:item));setMensagem(active?'Resposta reativada e incluída novamente nos cálculos.':'Resposta desativada e removida da compra sugerida.')}catch(e){setErro(mensagemErro(e,'Não foi possível atualizar a resposta.'))}finally{setOcupado(false)}}
  const espiarResposta=async(resposta:RespostaCotacao)=>{if(!id||resposta.status!=='IN_PROGRESS')return;setCarregandoPreviaResposta(true);setErro('');try{setPreviaResposta(await api<PreviaResposta>(`/quotations/${id}/responses/${resposta.id}/preview`))}catch(e){setErro(mensagemErro(e,'Não foi possível carregar a prévia desta proposta.'))}finally{setCarregandoPreviaResposta(false)}}
  const copiar=async(valor:string,tipo:string)=>{await navigator.clipboard.writeText(valor);setCopiado(tipo);setTimeout(()=>setCopiado(''),1800)}
  const escolherCampeao=async(itemId:number,responseId:number)=>{setOcupado(true);setErro('');try{await api(`/quotations/${id}/purchase-selections/${itemId}`,{method:'PUT',body:JSON.stringify({responseId})});await atualizarCompra();setProdutoTroca(null)}catch(e){setErro(mensagemErro(e,'Não foi possível trocar o campeão.'))}finally{setOcupado(false)}}
  const voltarAutomatico=async(itemId:number)=>{setOcupado(true);setErro('');try{await api(`/quotations/${id}/purchase-selections/${itemId}`,{method:'DELETE'});await atualizarCompra();setProdutoTroca(null)}catch(e){setErro(mensagemErro(e,'Não foi possível restaurar o cálculo automático.'))}finally{setOcupado(false)}}
  const edicoesAtuais=()=>comparacao?.products.map(p=>({quotationItemId:p.quotationItemId,desiredQuantity:p.desiredQuantity??p.requestedQuantity,selectedResponseId:p.selectedResponseId??null,championQuantity:p.championQuantity??null,stockOverrideNote:p.stockOverrideNote??'',manualSelection:!!p.manualSelection,allocations:p.allocations??[]}))??[]
  const abrirPlano=()=>{if(!comparacao)return;setErrosPlano({});setProdutoPlano(null);setVersaoBaseEdicao(historico.currentVersionId);setEdicoes(edicoesAtuais())}
  const abrirProdutoPlano=(produto:ComparacaoProduto)=>{setErrosPlano({});setProdutoPlano(produto.quotationItemId);setVersaoBaseEdicao(historico.currentVersionId);setEdicoes(edicoesAtuais())}
  const salvarPlano=async()=>{if(!edicoes)return;setOcupado(true);setErro('');setErroPlano('');setErrosPlano({});try{const atualizada=await api<ComparacaoCotacao>(`/quotations/${id}/purchase-plan`,{method:'PUT',body:JSON.stringify({items:edicoes,baseVersionId:versaoBaseEdicao})});setComparacao(atualizada);const[o,h]=await Promise.all([api<PedidoCompra[]>(`/quotations/${id}/orders`),api<HistoricoPlano>(`/quotations/${id}/purchase-plan/history`)]);setPedidos(o);setHistorico(h);setEdicoes(null);setProdutoPlano(null);setMensagem('Quantidades finais atualizadas. Você pode desfazer ou consultar o histórico.')}catch(e){if(e instanceof ErroApi)setErrosPlano(e.fields);setErroPlano(mensagemErro(e,'Não foi possível atualizar as quantidades.'))}finally{setOcupado(false)}}
  const gerarPedido=async(responseId:number)=>{const grupo=comparacao?.suggestedPurchase.find(item=>item.responseId===responseId);const abaixo=grupo?.minimumOrderStatus==='ABAIXO_DO_MINIMO';if(abaixo&&!window.confirm(`A distribuidora informou mínimo de ${money(grupo.minimumOrderValue!)}. Este pedido está em ${money(grupo.total)} e pode ser rejeitado. Deseja gerar mesmo assim?`))return;setOcupado(true);setErro('');try{await api(`/quotations/${id}/orders/${responseId}`,{method:'PUT',body:JSON.stringify({observation:null,confirmBelowMinimum:abaixo})});await atualizarCompra();setMensagem('Pedido gerado com sucesso em PDF e imagem.')}catch(e){setErro(mensagemErro(e,'Não foi possível gerar o pedido.'))}finally{setOcupado(false)}}
  const nomeArquivoPedido=(pedido:PedidoCompra,extensao:string)=>{const limparNome=(valor:string)=>valor.replace(/[\\/:*?"<>|\p{Cc}]/gu,'-').replace(/\s+/g,' ').trim().replace(/[. ]+$/,'');const partes=[limparNome(pedido.supplierName),limparNome(cotacao?.name??'')].filter(Boolean);const nome=partes.join(' - ')||pedido.number;return `${nome.slice(0,180)}.${extensao}`}
  const obterArquivo=async(pedido:PedidoCompra,formato:FormatoPedido)=>{const extensao=formato==='pdf'?'pdf':'png';const blob=await apiArquivo(`/quotations/${id}/orders/${pedido.id}/${formato}`);return new File([blob],nomeArquivoPedido(pedido,extensao),{type:formato==='pdf'?'application/pdf':'image/png'})}
  const confirmarRiscoPedido=(pedido:PedidoCompra,acao:string)=>!pedido.belowMinimum||window.confirm(`Este pedido está abaixo do mínimo de ${money(pedido.minimumOrderValue!)} e pode ser rejeitado. Deseja ${acao} mesmo assim?`)
  const baixar=async(pedido:PedidoCompra,formato:FormatoPedido)=>{if(!confirmarRiscoPedido(pedido,'baixar o arquivo'))return;setOcupado(true);setErro('');try{const arquivo=await obterArquivo(pedido,formato);const url=URL.createObjectURL(arquivo);const a=document.createElement('a');a.href=url;a.download=arquivo.name;a.click();URL.revokeObjectURL(url)}catch(e){setErro(mensagemErro(e,`Não foi possível baixar ${formato==='pdf'?'o PDF':'a imagem'}.`))}finally{setOcupado(false)}}
  const baixarRelatorioConferencia=async(formato:'pdf'|'excel',tipoPdf:TipoRelatorioPdf='divergences')=>{setOcupado(true);setErro('');try{const extensao=formato==='pdf'?'pdf':'xlsx',consulta=`?type=${tipoPdf}`,arquivo=await apiArquivo(`/quotations/${id}/receipt-report/${formato}${consulta}`),url=URL.createObjectURL(arquivo),a=document.createElement('a'),nome=(cotacao?.name??`cotacao-${id}`).replace(/[\\/:*?"<>|\p{Cc}]/gu,'-').replace(/\s+/g,' ').trim(),prefixo=tipoPdf==='general'?'relatorio-geral-cotacao':'relatorio-divergencias',descricao=tipoPdf==='general'?'Relatório geral da cotação':'Relatório de divergências';a.href=url;a.download=`${prefixo}-${nome}.${extensao}`;a.click();URL.revokeObjectURL(url);setMensagem(`${descricao} baixado com sucesso.`)}catch(e){setErro(mensagemErro(e,`Não foi possível baixar o relatório em ${formato==='pdf'?'PDF':'Excel'}.`))}finally{setOcupado(false)}}
  const compartilhar=async(pedido:PedidoCompra,formato:FormatoPedido)=>{if(!confirmarRiscoPedido(pedido,'compartilhar'))return;setOcupado(true);setErro('');try{const arquivo=await obterArquivo(pedido,formato);if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[arquivo]}))){await navigator.share({title:`Pedido ${pedido.number}`,text:`Pedido de compra para ${pedido.supplierName}`,files:[arquivo]});await api(`/quotations/${id}/orders/${pedido.id}/shared`,{method:'POST'});await atualizarCompra();setMensagem('Compartilhamento do pedido registrado.')}else{const url=URL.createObjectURL(arquivo);const a=document.createElement('a');a.href=url;a.download=arquivo.name;a.click();URL.revokeObjectURL(url);setMensagem(`O navegador não compartilha arquivos. ${formato==='pdf'?'O PDF foi baixado':'A imagem foi baixada'} para você enviar manualmente.`)}}catch(e){if((e as DOMException)?.name!=='AbortError')setErro(mensagemErro(e,'Não foi possível compartilhar o pedido.'))}finally{setOcupado(false)}}
  const abrirOpcoesPedidoMinimo=async(responseId:number)=>{setOcupado(true);setErro('');try{setOpcoesMinimo(await api<OpcoesPedidoMinimo>(`/quotations/${id}/minimum-order-options/${responseId}`))}catch(e){setErro(mensagemErro(e,'Não foi possível calcular as alternativas para o pedido mínimo.'))}finally{setOcupado(false)}}
  const aplicarOpcaoPedidoMinimo=async(strategy:EstrategiaPedidoMinimo)=>{if(!opcoesMinimo)return;const texto=strategy==='ATINGIR_MINIMO'?'aplicar os ajustes sugeridos para atingir o mínimo':'repassar o pedido inteiro para as próximas ofertas';if(!window.confirm(`Deseja ${texto}? Pedidos já gerados serão atualizados.`))return;setOcupado(true);setErro('');try{const resultado=await api<{message:string;comparison:ComparacaoCotacao}>(`/quotations/${id}/minimum-order-options/${opcoesMinimo.responseId}/apply`,{method:'POST',body:JSON.stringify({strategy})});setComparacao(resultado.comparison);const[o,h]=await Promise.all([api<PedidoCompra[]>(`/quotations/${id}/orders`),api<HistoricoPlano>(`/quotations/${id}/purchase-plan/history`)]);setPedidos(o);setHistorico(h);setMensagem(`${resultado.message} Você pode desfazer esta alteração.`);setOpcoesMinimo(null)}catch(e){setErro(mensagemErro(e,'Não foi possível aplicar a alternativa.'))}finally{setOcupado(false)}}
  const reincluirDistribuidora=async(responseId:number)=>{if(!window.confirm('Reincluir esta distribuidora na compra sugerida e recalcular o plano?'))return;setOcupado(true);setErro('');try{setComparacao(await api<ComparacaoCotacao>(`/quotations/${id}/responses/${responseId}/purchase-inclusion`,{method:'PUT',body:JSON.stringify({included:true})}));const[o,h]=await Promise.all([api<PedidoCompra[]>(`/quotations/${id}/orders`),api<HistoricoPlano>(`/quotations/${id}/purchase-plan/history`)]);setPedidos(o);setHistorico(h);setMensagem('Distribuidora reincluída. Você pode desfazer ou consultar o histórico.')}catch(e){setErro(mensagemErro(e,'Não foi possível reincluir a distribuidora.'))}finally{setOcupado(false)}}
  const desfazerPlano=async()=>{if(!window.confirm('Desfazer a última alteração e restaurar exatamente o plano anterior?'))return;setOcupado(true);setErro('');try{const resultado=await api<ResultadoRestauracaoPlano>(`/quotations/${id}/purchase-plan/undo`,{method:'POST'});setComparacao(resultado.comparison);setHistorico(resultado.history);setPedidos(await api<PedidoCompra[]>(`/quotations/${id}/orders`));setMensagem(resultado.message)}catch(e){setErro(mensagemErro(e,'Não foi possível desfazer a alteração.'))}finally{setOcupado(false)}}
  const abrirHistorico=async()=>{await carregarHistorico();setHistoricoAberto(true)}
  const restaurarVersao=async(versao:VersaoPlano)=>{if(!window.confirm(`Restaurar a versão ${versao.number}? O estado atual continuará disponível no histórico.`))return;setOcupado(true);setErro('');try{const resultado=await api<ResultadoRestauracaoPlano>(`/quotations/${id}/purchase-plan/versions/${versao.id}/restore`,{method:'POST'});setComparacao(resultado.comparison);setHistorico(resultado.history);setPedidos(await api<PedidoCompra[]>(`/quotations/${id}/orders`));setMensagem(resultado.message);setHistoricoAberto(false)}catch(e){setErro(mensagemErro(e,'Não foi possível restaurar esta versão.'))}finally{setOcupado(false)}}
  const abrirAjusteManual=()=>{if(!opcoesMinimo)return;setAjusteManual(opcoesMinimo);setOpcoesMinimo(null)}
  const salvarAjusteManual=async(itens:EdicaoPlano[],baseVersionId:number)=>{setOcupado(true);setErro('');setErroAjuste('');try{setComparacao(await api<ComparacaoCotacao>(`/quotations/${id}/purchase-plan`,{method:'PUT',body:JSON.stringify({items:itens,baseVersionId})}));const[o,h]=await Promise.all([api<PedidoCompra[]>(`/quotations/${id}/orders`),api<HistoricoPlano>(`/quotations/${id}/purchase-plan/history`)]);setPedidos(o);setHistorico(h);setAjusteManual(null);setMensagem('Ajustes aplicados produto por produto. Você pode desfazer ou consultar o histórico.')}catch(e){setErroAjuste(mensagemErro(e,'Não foi possível salvar os ajustes manuais.'))}finally{setOcupado(false)}}
  const sincronizarPedidoConferido=(pedidoAtualizado:PedidoCompra)=>setPedidos(atuais=>atuais.map(pedido=>pedido.id===pedidoAtualizado.id?pedidoAtualizado:pedido))
  const sincronizarConclusaoConferencia=async()=>{if(!id)return;const atualizada=await api<Cotacao>(`/quotations/${id}`);setCotacao(atualizada);setMensagem('Compra conferida e finalizada.')}
  const abrirConferencia=async(confirmarParcial=false)=>{if(finalizando.current||!id)return;const comparacaoAtual=await carregarComparacao();if(!comparacaoAtual)return;const parcial=comparacaoAtual.productsWithoutOffer>0||comparacaoAtual.partiallyCoveredProducts>0;if(parcial&&!confirmarParcial){setConfirmacaoCoberturaAberta(true);return}setOcupado(true);setErro('');try{const lista=await api<PedidoCompra[]>(`/quotations/${id}/orders`);const ids=new Set(comparacaoAtual.suggestedPurchase.map(grupo=>grupo.responseId));const pedidosAtuais=lista.filter(pedido=>ids.has(pedido.responseId)&&['GERADO','COMPARTILHADO'].includes(pedido.status));if(pedidosAtuais.length===0)throw new ErroApi('Gere ao menos um pedido antes de iniciar a conferência.');if(pedidosAtuais.length!==ids.size){const porResposta=new Map(lista.map(pedido=>[pedido.responseId,pedido]));const gruposProblema=comparacaoAtual.suggestedPurchase.filter(grupo=>{const pedido=porResposta.get(grupo.responseId!);return !pedido||!['GERADO','COMPARTILHADO'].includes(pedido.status)});const problema=gruposProblema.map(grupo=>{const pedido=porResposta.get(grupo.responseId!);const situacao=!pedido?'não gerado':pedido.status==='DESATUALIZADO'?'desatualizado':'cancelado';return `${grupo.supplierName} (${situacao})`}).join(', ');setMensagem(`Conferindo apenas os pedidos já gerados. Ainda faltam: ${problema}.`)}setPedidos(lista);setPedidosCarregados(true);setConfirmarCoberturaParcial(parcial);setConferencia(pedidosAtuais.map(pedido=>({orderId:pedido.id,supplierName:pedido.supplierName,checkedAt:pedido.checkedAt,items:pedido.items.map(item=>({quotationItemId:item.quotationItemId,ean:item.ean,productName:item.productName,quantity:item.quantity,unitPrice:item.unitPrice,receivedQuantity:pedido.checkedAt?item.receivedQuantity:null,receivedUnitPrice:pedido.checkedAt?item.receivedUnitPrice:null,receiptNote:pedido.checkedAt?item.receiptNote??'':'',reorderShortfall:pedido.checkedAt?item.reorderShortfall:false}))})));}catch(e){setErro(mensagemErro(e,'Não foi possível preparar a conferência da compra.'))}finally{setOcupado(false)}}
  const finalizar=async()=>{if(finalizando.current||!conferencia)return;finalizando.current=true;setOcupado(true);setErro('');try{await api(`/quotations/${id}/complete`,{method:'POST',body:JSON.stringify({confirmPartialCoverage:confirmarCoberturaParcial,orders:conferencia.map(pedido=>({orderId:pedido.orderId,items:pedido.items.map(item=>({quotationItemId:item.quotationItemId,receivedQuantity:item.receivedQuantity??0,receivedUnitPrice:item.receivedQuantity===0?null:item.receivedUnitPrice,receiptNote:item.receiptNote||null}))}))})});setConferencia(null);invalidarCompra();await carregar();setMensagem('Compra conferida e finalizada.')}catch(e){setErro(mensagemErro(e,'Não foi possível finalizar a compra.'))}finally{finalizando.current=false;setOcupado(false)}}
  const abrirProrrogacao=()=>{if(!cotacao)return;setNovoPrazo(prazoLocalMais24Horas(cotacao.expiresAt));setProrrogando(true)}
  const prorrogar=async()=>{const data=new Date(novoPrazo);if(!novoPrazo||Number.isNaN(data.getTime())){setErro('Informe uma nova data e hora para o prazo.');return}setOcupado(true);setErro('');try{const atualizada=await api<Cotacao>(`/quotations/${id}/expiration`,{method:'PUT',body:JSON.stringify({expiresAt:data.toISOString()})});setProrrogando(false);setLinkProrrogado(true);await carregar();setMensagem(`Cotação prorrogada até ${date(atualizada.expiresAt)}. Reenvie o link para atualizar a prévia no WhatsApp.`)}catch(e){setErro(mensagemErro(e,'Não foi possível prorrogar a cotação.'))}finally{setOcupado(false)}}
  const alternarDistribuidora=(chave:string)=>setExpandidas(a=>{const n=new Set(a);if(n.has(chave))n.delete(chave);else n.add(chave);return n})
  const cotacaoEmAnalise=cotacao?.status==='OPEN'||cotacao?.status==='CLOSED'
  const corte=useMemo(()=>{
    if(corteTexto.trim()==='')return 0
    const valor=Number(corteTexto)
    return Number.isFinite(valor)?limitarCorte(valor):0
  },[corteTexto])
  /* Enquanto a cotação está aberta, o único referencial disponível é a própria concorrência:
     o que a melhor oferta economiza contra a segunda melhor, no volume que ela consegue cobrir.
     Ordena por dinheiro, não por percentual — 40% num item de R$ 1,00 não move nada. */
  const todosAchados=useMemo(()=>{
    if(!cotacaoEmAnalise||!comparacao)return []
    return comparacao.products.flatMap(produto=>{
      const ofertas=[...produto.offers].sort((a,b)=>a.unitPrice-b.unitPrice)
      const[melhor,segunda]=ofertas
      if(!melhor||!segunda||segunda.unitPrice<=melhor.unitPrice)return []
      const volume=Math.min(produto.desiredQuantity||produto.requestedQuantity,melhor.availableQuantity)
      if(volume<=0)return []
      const percentual=((segunda.unitPrice-melhor.unitPrice)/segunda.unitPrice)*100
      if(percentual<corte)return []
      return [{produto,melhor,segunda,volume,economia:(segunda.unitPrice-melhor.unitPrice)*volume,percentual}]
    }).sort((a,b)=>b.economia-a.economia)
  },[cotacaoEmAnalise,comparacao,corte])
  /* Com a cotação aberta, oferta única só significa escassez se várias distribuidoras já responderam:
     senão o silêncio é falta de resposta, não falta de mercado. Fechada, a lista de respostas é final
     e a ausência vale por si, com quantas respostas houver. */
  const todaEscassez=useMemo(()=>{
    if(!cotacaoEmAnalise||!comparacao)return []
    const distribuidoras=comparacao.supplierTotals.length
    if(cotacao?.status==='OPEN'&&distribuidoras<3)return []
    return comparacao.products.filter(produto=>produto.offers.length<=1)
      .map(produto=>({produto,ofertas:produto.offers.length,distribuidoras}))
      .sort((a,b)=>a.ofertas-b.ofertas||b.produto.requestedQuantity-a.produto.requestedQuantity)
  },[cotacaoEmAnalise,cotacao?.status,comparacao])
  const achados=todosAchados.slice(0,3),escassez=todaEscassez.slice(0,3)
  const excedentes=(todosAchados.length-achados.length)+(todaEscassez.length-escassez.length)
  const alterarCorte=(texto:string)=>{
    setCorteTexto(texto)
    const valor=Number(texto)
    if(texto.trim()===''||!Number.isFinite(valor))return
    try{window.localStorage.setItem(CHAVE_CORTE,String(limitarCorte(valor)))}catch{/* Preferência é opcional quando o navegador bloqueia armazenamento. */}
  }
  const alternarAchados=()=>setAchadosAberto(atual=>{
    const proximo=!atual
    try{window.localStorage.setItem(CHAVE_ACHADOS_ABERTO,String(proximo))}catch{/* Preferência é opcional quando o navegador bloqueia armazenamento. */}
    return proximo
  })
  /* A faixa aparece sempre que a cotação aberta já tem resposta, mesmo sem achados: senão o corte
     alto esconderia o próprio controle e não daria para voltar atrás. */
  const mostrarAchados=cotacaoEmAnalise&&(comparacao?.supplierTotals.length??0)>0
  const resumoAchados=[todosAchados.length&&`${todosAchados.length} de oportunidade`,todaEscassez.length&&`${todaEscassez.length} de ruptura`]
    .filter(Boolean).join(' · ')||`Nada fora da curva com o corte de ${corte}%`
  const abrirNoComparativo=(quotationItemId:number)=>{setAba('comparison');setProdutoDestacado(quotationItemId)}
  useEffect(()=>{
    if(aba!=='comparison'||produtoDestacado==null||!comparacao)return
    const timer=window.setTimeout(()=>document.querySelector<HTMLElement>(`[data-destaque="${produtoDestacado}"]`)?.scrollIntoView({behavior:'smooth',block:'center'}),140)
    const limpar=window.setTimeout(()=>setProdutoDestacado(null),4000)
    return()=>{window.clearTimeout(timer);window.clearTimeout(limpar)}
  },[aba,produtoDestacado,comparacao])
  if(carregando)return <div className="page"><Carregando/></div>;if(!cotacao)return <div className="page"><AvisoErro message={erro||'Cotação não encontrada.'}/></div>
  const mensagemLink=cotacao.publicUrl?`Olá! Estamos realizando uma nova cotação.\n${cotacao.publicUrl}`:'';const podeEditar=!!user&&['ADMIN','BUYER'].includes(user.role)&&cotacao.status==='CLOSED';const podeGerenciar=!!user&&['ADMIN','BUYER'].includes(user.role)&&['DRAFT','OPEN','CLOSED'].includes(cotacao.status);const itensAtivos=cotacao.items.filter(item=>item.active)
  return <div className="page"><div className="back-row"><LinkInterno to="/cotacoes" className="text-link"><ArrowLeft/>Voltar para cotações</LinkInterno></div><div className="detail-header"><div><div className="title-line"><h1>{cotacao.name}</h1><EtiquetaStatus status={cotacao.status}/></div><p>Criada em {date(cotacao.createdAt)} · {itensAtivos.length} produtos ativos{itensAtivos.length!==cotacao.items.length?` de ${cotacao.items.length}`:''} · Prazo: {date(cotacao.expiresAt)}</p></div><div className="header-actions"><button className="button button-ghost" onClick={()=>void carregar()}><RefreshCw/>Atualizar</button>{cotacao.status==='DRAFT'&&<button className="button button-primary" disabled={ocupado} onClick={()=>void acao('open')}><Send/>Abrir cotação</button>}{(cotacao.status==='OPEN'||cotacao.status==='CLOSED')&&<button className="button button-secondary" disabled={ocupado} onClick={abrirProrrogacao}><Clock3/>Prorrogar</button>}{cotacao.status==='OPEN'&&<button className="button button-danger-soft" disabled={ocupado} onClick={()=>void acao('close')}><Lock/>Fechar cotação</button>}{cotacao.status==='CLOSED'&&<button className="button button-primary" disabled={ocupado} onClick={()=>void abrirConferencia()}><CheckCircle2/>Finalizar compra</button>}</div></div>{erro&&<AvisoErro message={erro}/>} {mensagem&&<div className="alert alert-success">{mensagem}</div>}{cotacao.publicUrl&&<section className="share-strip"><div><div className="share-strip-icon"><Link2/></div><div><strong>Link para representantes</strong><span>{cotacao.publicUrl}</span></div></div><div>{linkProrrogado&&<button className="button button-primary" onClick={()=>window.open(`https://wa.me/?text=${encodeURIComponent(mensagemLink)}`,'_blank','noopener,noreferrer')}><Share2/>Reenviar no WhatsApp</button>}<button className="button button-secondary" onClick={()=>void copiar(cotacao.publicUrl!,'link')}><Clipboard/>{copiado==='link'?'Copiado!':'Copiar link'}</button><button className="button button-ghost" onClick={()=>void copiar(mensagemLink,'message')}>{copiado==='message'?'Copiada!':'Copiar mensagem'}</button><a className="icon-button" title="Abrir link" href={cotacao.publicUrl} target="_blank"><ExternalLink/></a></div></section>}
    {mostrarAchados&&<section className="achados-strip">
      <div className="achados-heading"><Sparkles/>
        <div className="achados-titulo"><strong>Vale olhar agora</strong><span title={achadosAberto?(cotacao.status==='OPEN'?'Com as respostas recebidas até agora. Enquanto a cotação está aberta, uma resposta nova pode mudar qualquer um destes.':'Respostas encerradas: esta é a base final para montar a compra.'):resumoAchados}>{achadosAberto?(cotacao.status==='OPEN'?'Com as respostas recebidas até agora. Enquanto a cotação está aberta, uma resposta nova pode mudar qualquer um destes.':'Respostas encerradas: esta é a base final para montar a compra.'):resumoAchados}</span></div>
        {achadosAberto&&<label className="achados-corte">Diferença mínima<span className="achados-corte-campo"><input type="number" min={0} max={100} step={1} inputMode="numeric" value={corteTexto} onChange={event=>alterarCorte(event.target.value)} onBlur={()=>setCorteTexto(String(corte))}/><em>%</em></span></label>}
        <button type="button" className="icon-button achados-toggle" aria-expanded={achadosAberto} title={achadosAberto?'Minimizar':'Expandir'} aria-label={achadosAberto?'Minimizar achados':'Expandir achados'} onClick={alternarAchados}>{achadosAberto?<ChevronUp/>:<ChevronDown/>}</button>
      </div>
      {achadosAberto&&achados.length>0&&<div className="achados-grupo"><span className="achados-rotulo">Oportunidade de preço</span>
        <div className="achados-lista">{achados.map(achado=><CartaoAchado key={achado.produto.quotationItemId} achado={achado} aoAbrir={abrirNoComparativo}/>)}</div></div>}
      {achadosAberto&&achados.length===0&&<p className="achados-vazio">Nenhuma oferta está {corte}% ou mais abaixo da segunda melhor. Baixe a diferença mínima para ver achados menores.</p>}
      {achadosAberto&&escassez.length>0&&<div className="achados-grupo"><span className="achados-rotulo">Risco de ruptura</span>
        <div className="achados-lista">{escassez.map(item=><CartaoRisco key={item.produto.quotationItemId} item={item} aoAbrir={abrirNoComparativo}/>)}</div></div>}
      {achadosAberto&&excedentes>0&&<button type="button" className="button button-secondary achados-ver-todos" onClick={()=>setTodosAbertos(true)}><Search/>Ver todas ({todosAchados.length+todaEscassez.length})</button>}
    </section>}
    <div className="tabs"><button className={aba==='products'?'active':''} onClick={()=>setAba('products')}><PackageCheck/>Produtos <span>{itensAtivos.length}</span></button><button className={aba==='responses'?'active':''} onClick={()=>setAba('responses')}><Users/>Respostas {respostasCarregadas&&<span>{respostas.filter(r=>r.status==='SUBMITTED'&&r.active).length}</span>}</button><button className={aba==='comparison'?'active':''} onClick={()=>setAba('comparison')}><CheckCircle2/>Comparativo</button><button className={aba==='purchase'?'active':''} onClick={()=>setAba('purchase')}><ShoppingCart/>Compra sugerida</button></div>
    {aba==='products'&&<Produtos cotacao={cotacao} podeEditar={podeGerenciar} ocupado={ocupado} aoSalvar={atualizarItem}/>} {aba==='responses'&&(respostasCarregadas?<Respostas respostas={respostas} total={itensAtivos.length} podeEditar={podeGerenciar} ocupado={ocupado} carregandoPrevia={carregandoPreviaResposta} aoEspiar={resposta=>void espiarResposta(resposta)} aoAlternar={(resposta,active)=>void atualizarRespostaAtiva(resposta,active)}/>:<Carregando/>)} {aba==='comparison'&&(comparacao?<Comparativo comparacao={comparacao} cotacaoId={id!} destacado={produtoDestacado}/>:<Carregando/>)} {aba==='purchase'&&(comparacao&&pedidosCarregados?<CompraSugerida comparacao={comparacao} pedidos={pedidos} expandidas={expandidas} podeEditar={podeEditar} podeExportar={!!user&&['ADMIN','BUYER'].includes(user.role)} ocupado={ocupado} podeDesfazer={historicoCarregado&&historico.canUndo} descricaoUltimaAlteracao={historico.versions[0]?.description} aoAlternar={alternarDistribuidora} aoTrocar={setProdutoTroca} aoEditarPlano={abrirPlano} aoEditarProduto={abrirProdutoPlano} aoGerar={id=>void gerarPedido(id)} aoBaixar={(p,f)=>void baixar(p,f)} aoBaixarRelatorio={(formato,tipo)=>void baixarRelatorioConferencia(formato,tipo)} aoCompartilhar={(p,f)=>void compartilhar(p,f)} aoVerMinimo={id=>void abrirOpcoesPedidoMinimo(id)} aoReincluir={id=>void reincluirDistribuidora(id)} aoHistorico={()=>void abrirHistorico()} aoDesfazer={()=>void desfazerPlano()}/>:<Carregando/>)} {previaResposta&&<ModalPreviaResposta previa={previaResposta} aoFechar={()=>setPreviaResposta(null)}/>} {conferencia&&<ModalConferencia pedidos={conferencia} ocupado={ocupado} aoAlterar={setConferencia} aoPedidoConferido={sincronizarPedidoConferido} aoConcluir={sincronizarConclusaoConferencia} aoFechar={()=>setConferencia(null)} aoFinalizar={()=>void finalizar()}/>} {produtoTroca&&<ModalTroca produto={produtoTroca} ocupado={ocupado} aoFechar={()=>setProdutoTroca(null)} aoEscolher={r=>void escolherCampeao(produtoTroca.quotationItemId,r)} aoAutomatico={()=>void voltarAutomatico(produtoTroca.quotationItemId)}/>} {edicoes&&comparacao&&<ModalPlano produtos={produtoPlano==null?comparacao.products:comparacao.products.filter(p=>p.quotationItemId===produtoPlano)} edicoes={edicoes} setEdicoes={setEdicoes} erros={errosPlano} erroGeral={erroPlano} ocupado={ocupado} focado={produtoPlano!=null} aoFechar={()=>{setEdicoes(null);setProdutoPlano(null);setErroPlano('');setErrosPlano({})}} aoSalvar={()=>void salvarPlano()}/>} {prorrogando&&<ModalProrrogar prazo={novoPrazo} ocupado={ocupado} aoAlterar={setNovoPrazo} aoFechar={()=>setProrrogando(false)} aoSalvar={()=>void prorrogar()}/>} {opcoesMinimo&&<ModalPedidoMinimo opcoes={opcoesMinimo} ocupado={ocupado} aoFechar={()=>setOpcoesMinimo(null)} aoAplicar={strategy=>void aplicarOpcaoPedidoMinimo(strategy)} aoManual={abrirAjusteManual}/>} {ajusteManual&&comparacao&&<ModalAjusteMinimoManual cotacaoId={id!} opcoes={ajusteManual} comparacao={comparacao} baseVersionId={historico.currentVersionId} ocupado={ocupado} erroGeral={erroAjuste} aoFechar={()=>{setAjusteManual(null);setErroAjuste('')}} aoSalvar={(itens,base)=>void salvarAjusteManual(itens,base)}/>} {historicoAberto&&historicoCarregado&&<ModalHistorico historico={historico} ocupado={ocupado} aoFechar={()=>setHistoricoAberto(false)} aoRestaurar={v=>void restaurarVersao(v)}/>} {/* fim dos modais */}
    {confirmacaoCoberturaAberta&&<ModalCoberturaParcial ocupado={ocupado} aoFechar={()=>setConfirmacaoCoberturaAberta(false)} aoContinuar={()=>{setConfirmacaoCoberturaAberta(false);void abrirConferencia(true)}}/>}
    {todosAbertos&&<ModalAchados aberta={cotacao.status==='OPEN'} achados={todosAchados} escassez={todaEscassez} aoAbrirProduto={quotationItemId=>{setTodosAbertos(false);abrirNoComparativo(quotationItemId)}} aoFechar={()=>setTodosAbertos(false)}/>}
  </div>
}

function ModalProrrogar({prazo,ocupado,aoAlterar,aoFechar,aoSalvar}:{prazo:string;ocupado:boolean;aoAlterar:(prazo:string)=>void;aoFechar:()=>void;aoSalvar:()=>void}){
  return <div className="modal-backdrop"><section className="modal extension-modal"><div className="modal-header modal-header-simple"><div><h2>Prorrogar cotação</h2><p>A cotação ficará aberta para novas propostas até o prazo escolhido.</p></div><button className="icon-button" aria-label="Fechar" onClick={aoFechar}><X/></button></div><label className="extension-date-field">Novo prazo<input type="datetime-local" value={prazo} onChange={event=>aoAlterar(event.target.value)} required/></label><p className="extension-note">O link será atualizado para o WhatsApp mostrar a nova data na prévia.</p><div className="modal-actions"><button className="button button-ghost" disabled={ocupado} onClick={aoFechar}>Cancelar</button><button className="button button-primary" disabled={ocupado||!prazo} onClick={aoSalvar}>{ocupado?'Prorrogando...':'Prorrogar e reabrir'}</button></div></section></div>
}

function ModalCoberturaParcial({ocupado,aoFechar,aoContinuar}:{ocupado:boolean;aoFechar:()=>void;aoContinuar:()=>void}){
  return <div className="modal-backdrop"><section className="modal partial-coverage-modal"><div className="modal-header modal-header-simple"><div><span className="eyebrow warning">Cobertura parcial</span><h2>Alguns produtos não estão totalmente cobertos</h2><p>Há produtos sem oferta ou com quantidade menor que a solicitada. Você pode voltar para ajustar o plano ou seguir para conferir somente os pedidos gerados.</p></div><button className="icon-button" aria-label="Fechar" disabled={ocupado} onClick={aoFechar}><X/></button></div><div className="partial-coverage-note"><AlertTriangle/><span>A finalização registrará somente o que for efetivamente recebido nos pedidos disponíveis.</span></div><div className="modal-actions"><button className="button button-ghost" disabled={ocupado} onClick={aoFechar}>Revisar compra</button><button className="button button-primary" disabled={ocupado} onClick={aoContinuar}><CheckCircle2/>Continuar para conferência</button></div></section></div>
}

function ModalConferenciaLegada({pedidos,ocupado,aoAlterar,aoFechar,aoFinalizar}:{pedidos:PedidoConferencia[];ocupado:boolean;aoAlterar:(pedidos:PedidoConferencia[])=>void;aoFechar:()=>void;aoFinalizar:()=>void}){
  const totalPlanejado=pedidos.flatMap(pedido=>pedido.items).reduce((total,item)=>total+item.quantity*item.unitPrice,0)
  const totalRecebido=pedidos.flatMap(pedido=>pedido.items).reduce((total,item)=>total+(item.receivedQuantity??0)*(item.receivedUnitPrice??0),0)
  const[abertos,setAbertos]=useState<Set<number>>(new Set())
  const[buscaGlobal,setBuscaGlobal]=useState('');const[buscasPedido,setBuscasPedido]=useState<Record<number,string>>({})
  const tudoCorreto=pedidos.every(pedido=>pedido.items.every(item=>item.receivedQuantity===item.quantity&&item.receivedUnitPrice===item.unitPrice&&!item.receiptNote))
  const marcarTudoCorreto=()=>aoAlterar(pedidos.map(pedido=>({...pedido,items:pedido.items.map(item=>tudoCorreto?{...item,receivedQuantity:null,receivedUnitPrice:null,receiptNote:''}:{...item,receivedQuantity:item.quantity,receivedUnitPrice:item.unitPrice,receiptNote:''})})))
  const alterar=(orderId:number,quotationItemId:number,parcial:Partial<ItemConferencia>)=>aoAlterar(pedidos.map(pedido=>pedido.orderId!==orderId?pedido:{...pedido,items:pedido.items.map(item=>item.quotationItemId!==quotationItemId?item:{...item,...parcial})}))
  const alternarPedido=(orderId:number)=>setAbertos(atuais=>{const proximo=new Set(atuais);if(proximo.has(orderId))proximo.delete(orderId);else proximo.add(orderId);return proximo})
  const pendentes=pedidos.some(pedido=>pedido.items.some(item=>item.receivedQuantity===null||(item.receivedQuantity>0&&item.receivedUnitPrice===null)))
  const normalizar=(valor:string)=>valor.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  useEffect(()=>{const termo=normalizar(buscaGlobal.trim());if(!termo)return;setAbertos(new Set(pedidos.filter(pedido=>normalizar(`${pedido.supplierName} ${pedido.items.map(item=>`${item.productName} ${item.ean??''}`).join(' ')}`).includes(termo)).map(pedido=>pedido.orderId)))},[buscaGlobal,pedidos])
  const termoGlobal=normalizar(buscaGlobal.trim());const pedidosVisiveis=pedidos.filter(pedido=>!termoGlobal||normalizar(`${pedido.supplierName} ${pedido.items.map(item=>`${item.productName} ${item.ean??''}`).join(' ')}`).includes(termoGlobal))
  const precosDigitados=useRef(new Map<string,{digitos:string;ultimoValor:number|null}>())
  const itensComCampoPreco=pedidosVisiveis.filter(pedido=>abertos.has(pedido.orderId)).flatMap(pedido=>{const termo=normalizar((buscasPedido[pedido.orderId]??'').trim());return pedido.items.filter(item=>!termo||normalizar(`${item.productName} ${item.ean??''}`).includes(termo)).map(item=>({pedido,item}))})
  // Mantém a mesma máscara de centavos da página pública, inclusive quando o preço é zerado ao apagar o campo.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{const campos=[...document.querySelectorAll<HTMLInputElement>('.receipt-check-item label:nth-of-type(2) input')];const limpar=campos.map((campo,indice)=>{const contexto=itensComCampoPreco[indice];if(!contexto)return()=>{};const chave=`${contexto.pedido.orderId}:${contexto.item.quotationItemId}`,estado=precosDigitados.current.get(chave);let digitos:string=estado?.digitos??'',ultimoValor:number|null=estado?.ultimoValor??null;if(!estado||ultimoValor!==contexto.item.receivedUnitPrice){digitos=contexto.item.receivedUnitPrice==null?'':String(Math.round(contexto.item.receivedUnitPrice*100));ultimoValor=contexto.item.receivedUnitPrice;precosDigitados.current.set(chave,{digitos,ultimoValor})}campo.type='text';campo.inputMode='numeric';campo.value=formatarPrecoDigitado(digitos);const atualizar=(valor:string)=>{digitos=valor.replace(/\D/g,'').slice(0,9);ultimoValor=interpretarPrecoDigitado(digitos)??0;precosDigitados.current.set(chave,{digitos,ultimoValor});campo.value=formatarPrecoDigitado(digitos);alterar(contexto.pedido.orderId,contexto.item.quotationItemId,{receivedUnitPrice:ultimoValor})};const tecla=(evento:KeyboardEvent)=>{if(/^\d$/.test(evento.key)){evento.preventDefault();atualizar(digitos+evento.key)}else if(evento.key==='Backspace'||evento.key==='Delete'){evento.preventDefault();atualizar(digitos.slice(0,-1))}};const colar=(evento:ClipboardEvent)=>{evento.preventDefault();atualizar(digitos+(evento.clipboardData?.getData('text')??''))};campo.addEventListener('keydown',tecla);campo.addEventListener('paste',colar);return()=>{campo.removeEventListener('keydown',tecla);campo.removeEventListener('paste',colar)}});return()=>limpar.forEach(funcao=>funcao())},[itensComCampoPreco])
  return <div className="modal-backdrop"><section className="modal receipt-check-modal"><div className="modal-header modal-header-simple"><div><span className="eyebrow green">Conferência de compra</span><h2>O que chegou?</h2><p>Abra uma distribuidora por vez e confira a entrega com a nota.</p></div><button className="icon-button" aria-label="Fechar" disabled={ocupado} onClick={aoFechar}><X/></button></div><div className="receipt-check-summary"><div><span>Total do pedido</span><strong>{money(totalPlanejado)}</strong></div><div><span>Total recebido</span><strong>{money(totalRecebido)}</strong></div><div className={totalRecebido===totalPlanejado?'complete':'warning'}><span>Diferença</span><strong>{money(totalRecebido-totalPlanejado)}</strong></div><button className={`button button-secondary receipt-mark-all ${tudoCorreto?'checked':''}`} aria-pressed={tudoCorreto} disabled={ocupado} onClick={marcarTudoCorreto}><CheckCircle2/>{tudoCorreto?'Desmarcar tudo':'Marcar tudo como correto'}</button></div><label className="receipt-global-search"><Search/><input autoFocus placeholder="Buscar em todos os pedidos por produto, EAN ou distribuidora" value={buscaGlobal} onChange={event=>setBuscaGlobal(event.target.value)}/>{buscaGlobal&&<button type="button" onClick={()=>setBuscaGlobal('')} aria-label="Limpar busca">×</button>}<span>{pedidosVisiveis.length} de {pedidos.length}</span></label><div className="receipt-check-orders">{pedidosVisiveis.length===0?<EstadoVazio title="Nenhum item encontrado" description="Tente o nome do produto, o EAN ou o nome da distribuidora."/>:pedidosVisiveis.map(pedido=>{const totalPedido=pedido.items.reduce((total,item)=>total+item.quantity*item.unitPrice,0),totalRecebidoPedido=pedido.items.reduce((total,item)=>total+(item.receivedQuantity??0)*(item.receivedUnitPrice??0),0),pendente=pedido.items.some(item=>item.receivedQuantity===null),aberto=abertos.has(pedido.orderId),buscaPedido=buscasPedido[pedido.orderId]??'',termoPedido=normalizar(buscaPedido.trim()),itensVisiveis=pedido.items.filter(item=>!termoPedido||normalizar(`${item.productName} ${item.ean??''}`).includes(termoPedido));return <article className={aberto?'expanded':''} key={pedido.orderId}><button type="button" className="receipt-order-toggle" aria-expanded={aberto} onClick={()=>alternarPedido(pedido.orderId)}><div><strong>{pedido.supplierName}</strong><span>Pedido {money(totalPedido)} · recebido {money(totalRecebidoPedido)}</span></div><div><strong className={pendente?'receipt-pending':totalPedido===totalRecebidoPedido?'receipt-ok':'receipt-different'}>{pendente?'Pendente':totalPedido===totalRecebidoPedido?'Conferido':'Com divergência'}</strong><ChevronDown/></div></button>{aberto&&<div className="receipt-order-items"><label className="receipt-supplier-search"><Search/><input placeholder="Buscar neste pedido por produto ou EAN" value={buscaPedido} onChange={event=>setBuscasPedido(atual=>({...atual,[pedido.orderId]:event.target.value}))}/>{buscaPedido&&<button type="button" onClick={()=>setBuscasPedido(atual=>({...atual,[pedido.orderId]:''}))} aria-label="Limpar busca">×</button>}</label>{itensVisiveis.length===0?<p className="receipt-empty-search">Nenhum item encontrado neste pedido.</p>:itensVisiveis.map(item=>{const diferente=item.quantity!==item.receivedQuantity||item.unitPrice!==item.receivedUnitPrice;return <div className={`receipt-check-item ${diferente?'different':''}`} key={item.quotationItemId}><div className="receipt-product"><strong>{item.productName}</strong><span>{item.ean?`EAN ${item.ean} · `:''}Pedido: {item.quantity} un. × {money(item.unitPrice)} = {money(item.quantity*item.unitPrice)}</span></div><label>Qtd. recebida<input type="number" min="0" step="1" inputMode="numeric" value={item.receivedQuantity??''} onChange={event=>{const quantidade=event.target.value===''?null:Math.max(0,Number(event.target.value)||0);alterar(pedido.orderId,item.quotationItemId,{receivedQuantity:quantidade,receivedUnitPrice:quantidade==null||quantidade===0?null:item.receivedUnitPrice})}}/></label><label>Preço unitário<input type="number" min="0" step="0.0001" inputMode="decimal" disabled={item.receivedQuantity==null||item.receivedQuantity===0} value={item.receivedUnitPrice??''} onChange={event=>alterar(pedido.orderId,item.quotationItemId,{receivedUnitPrice:event.target.value===''?null:Math.max(0,Number(event.target.value))})}/></label><strong className="receipt-subtotal">{money((item.receivedQuantity??0)*(item.receivedUnitPrice??0))}</strong><label className="receipt-note">Observação (opcional)<input maxLength={500} placeholder={item.receivedQuantity===0?'Produto não enviado':'Ex.: valor diferente na nota'} value={item.receiptNote} onChange={event=>alterar(pedido.orderId,item.quotationItemId,{receiptNote:event.target.value})}/></label></div>})}</div>}</article>})}</div><div className="modal-actions"><button className="button button-ghost" disabled={ocupado} onClick={aoFechar}>Voltar</button><button className="button button-primary" disabled={ocupado||pendentes} onClick={aoFinalizar}><CheckCircle2/>{ocupado?'Finalizando...':'Conferir e finalizar compra'}</button></div></section></div>
}

void ModalConferenciaLegada

function CampoPrecoRecebido({valor,disabled,aoAlterar}:{valor:number|null;disabled:boolean;aoAlterar:(valor:number)=>void}){
  const[digitos,setDigitos]=useState(()=>valor==null?'':String(Math.round(valor*100)))
  const ultimoValor=useRef(valor)
  useEffect(()=>{if(valor!==ultimoValor.current){ultimoValor.current=valor;setDigitos(valor==null?'':String(Math.round(valor*100)))}},[valor])
  const atualizar=(proximo:string)=>{const numeros=proximo.replace(/\D/g,'').slice(0,9),novoValor=interpretarPrecoDigitado(numeros)??0;ultimoValor.current=novoValor;setDigitos(numeros);aoAlterar(novoValor)}
  return <input type="text" inputMode="numeric" disabled={disabled} placeholder="0,00" value={formatarPrecoDigitado(digitos)} onKeyDown={evento=>{if(/^\d$/.test(evento.key)){evento.preventDefault();atualizar(digitos+evento.key)}else if(evento.key==='Backspace'||evento.key==='Delete'){evento.preventDefault();atualizar(digitos.slice(0,-1))}}} onPaste={evento=>{evento.preventDefault();atualizar(digitos+evento.clipboardData.getData('text'))}} onChange={evento=>atualizar(evento.target.value)}/>
}

function ModalConferencia({pedidos,ocupado,aoAlterar,aoPedidoConferido,aoConcluir,aoFechar}:{pedidos:PedidoConferencia[];ocupado:boolean;aoAlterar:(pedidos:PedidoConferencia[])=>void;aoPedidoConferido:(pedido:PedidoCompra)=>void;aoConcluir:()=>Promise<void>;aoFechar:()=>void;aoFinalizar:()=>void}){
  const{id}=usarParametros();const[salvando,setSalvando]=useState<number|null>(null);const[erro,setErro]=useState('');const[concluida,setConcluida]=useState(false);const[busca,setBusca]=useState('');const[buscasPedidos,setBuscasPedidos]=useState<Record<number,string>>({});const[abertos,setAbertos]=useState<Set<number>>(new Set())
  const totalPedido=pedidos.flatMap(p=>p.items).reduce((s,i)=>s+i.quantity*i.unitPrice,0),totalRecebido=pedidos.flatMap(p=>p.items).reduce((s,i)=>s+(i.receivedQuantity??0)*(i.receivedUnitPrice??0),0),pendentes=pedidos.filter(p=>!p.checkedAt),todosCorretos=pendentes.length>0&&pendentes.every(p=>p.items.every(i=>i.receivedQuantity===i.quantity&&i.receivedUnitPrice===i.unitPrice&&!i.receiptNote&&!i.reorderShortfall))
  const alterar=(orderId:number,itemId:number,parcial:Partial<ItemConferencia>)=>aoAlterar(pedidos.map(p=>p.orderId!==orderId?p:{...p,items:p.items.map(i=>i.quotationItemId!==itemId?i:{...i,...parcial})}))
  const marcarTudo=()=>aoAlterar(pedidos.map(p=>p.checkedAt?p:{...p,items:p.items.map(i=>todosCorretos?{...i,receivedQuantity:null,receivedUnitPrice:null,receiptNote:'',reorderShortfall:false}:{...i,receivedQuantity:i.quantity,receivedUnitPrice:i.unitPrice,receiptNote:'',reorderShortfall:false})}))
  const salvar=async(pedido:PedidoConferencia)=>{if(!id||pedido.checkedAt||concluida)return;const incompleto=pedido.items.some(i=>i.receivedQuantity===null||(i.receivedQuantity>0&&i.receivedUnitPrice===null));if(incompleto){setErro(`Confira todos os itens de ${pedido.supplierName} antes de salvar.`);return}setSalvando(pedido.orderId);setErro('');try{const resultado=await api<{order:PedidoCompra;pendingOrders:number;quotationCompleted:boolean}>(`/quotations/${id}/orders/${pedido.orderId}/receipt-check`,{method:'POST',body:JSON.stringify({confirmPartialCoverage:true,items:pedido.items.map(i=>({quotationItemId:i.quotationItemId,receivedQuantity:i.receivedQuantity??0,receivedUnitPrice:i.receivedQuantity===0?null:i.receivedUnitPrice,receiptNote:i.receiptNote||null,reorderShortfall:i.reorderShortfall}))})});aoAlterar(pedidos.map(atual=>atual.orderId!==pedido.orderId?atual:{...atual,checkedAt:resultado.order.checkedAt,items:resultado.order.items.map(i=>({quotationItemId:i.quotationItemId,ean:i.ean,productName:i.productName,quantity:i.quantity,unitPrice:i.unitPrice,receivedQuantity:i.receivedQuantity,receivedUnitPrice:i.receivedUnitPrice,receiptNote:i.receiptNote??'',reorderShortfall:i.reorderShortfall}))}));aoPedidoConferido(resultado.order);if(resultado.quotationCompleted){setConcluida(true);try{await aoConcluir()}catch{setErro('A compra foi concluída, mas não foi possível atualizar a tela automaticamente.')}}}catch(e){setErro(mensagemErro(e,'Não foi possível salvar a conferência desta distribuidora.'))}finally{setSalvando(null)}}
  const normalizar=(valor:string)=>valor.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();const termo=normalizar(busca);const visiveis=pedidos.filter(p=>!termo||normalizar(`${p.supplierName} ${p.items.map(i=>`${i.productName} ${i.ean??''}`).join(' ')}`).includes(termo));const itensVisiveis=(pedido:PedidoConferencia)=>{const buscaPedido=normalizar(buscasPedidos[pedido.orderId]??'');return pedido.items.filter(item=>!buscaPedido||normalizar(`${item.productName} ${item.ean??''}`).includes(buscaPedido))}
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  return <div className="modal-backdrop"><section className="modal receipt-check-modal receipt-by-supplier"><div className="modal-header modal-header-simple"><div><span className="eyebrow green">Conferência por distribuidora</span><h2>O que chegou?</h2><p>Salve cada entrega quando ela chegar. A compra conclui ao conferir a última pendência.</p></div><button className="icon-button" aria-label="Fechar" disabled={ocupado||salvando!==null} onClick={aoFechar}><X/></button></div>{erro&&<AvisoErro message={erro}/>}<div className="receipt-check-summary"><div><span>Pedido</span><strong>{money(totalPedido)}</strong></div><div><span>Recebido</span><strong>{money(totalRecebido)}</strong></div><div className={totalRecebido===totalPedido?'complete':'warning'}><span>{pendentes.length} pendente{pendentes.length===1?'':'s'}</span><strong>{money(totalRecebido-totalPedido)}</strong></div><button className={`button button-secondary receipt-mark-all ${todosCorretos?'checked':''}`} disabled={ocupado||salvando!==null||pendentes.length===0} onClick={marcarTudo}><CheckCircle2/>{todosCorretos?'Desmarcar pendentes':'Marcar pendentes como corretos'}</button></div><label className="receipt-global-search"><Search/><input autoFocus placeholder="Buscar produto, EAN ou distribuidora" value={busca} onChange={e=>setBusca(e.target.value)}/>{busca&&<button type="button" onClick={()=>setBusca('')} aria-label="Limpar busca">×</button>}<span>{visiveis.length} de {pedidos.length}</span></label><div className="receipt-check-orders">{visiveis.map(pedido=>{const aberto=abertos.has(pedido.orderId),recebido=pedido.items.reduce((s,i)=>s+(i.receivedQuantity??0)*(i.receivedUnitPrice??0),0),pronto=pedido.items.every(i=>i.receivedQuantity!==null&&(i.receivedQuantity===0||i.receivedUnitPrice!==null)),itensDoPedido=itensVisiveis(pedido);return <article className={`${aberto?'expanded':''} ${pedido.checkedAt?'receipt-saved':''}`} key={pedido.orderId}><button type="button" className="receipt-order-toggle" aria-expanded={aberto} onClick={()=>setAbertos(atual=>{const proximo=new Set(atual);proximo.has(pedido.orderId)?proximo.delete(pedido.orderId):proximo.add(pedido.orderId);return proximo})}><div><strong>{pedido.supplierName}</strong><span>Pedido {money(pedido.items.reduce((s,i)=>s+i.quantity*i.unitPrice,0))} · recebido {money(recebido)}</span></div><div><strong className={pedido.checkedAt?'receipt-ok':'receipt-pending'}>{pedido.checkedAt?'Conferido':'Pendente'}</strong><ChevronDown/></div></button>{aberto&&<div className="receipt-order-items">{pedido.checkedAt&&<div className="receipt-saved-note"><CheckCircle2/>Conferido em {date(pedido.checkedAt)}. Estes valores não podem mais ser alterados.</div>}<label className="receipt-supplier-search"><Search/><input placeholder="Buscar neste pedido por produto ou EAN" value={buscasPedidos[pedido.orderId]??''} onChange={e=>setBuscasPedidos(atual=>({...atual,[pedido.orderId]:e.target.value}))}/></label>{itensDoPedido.length===0?<p className="receipt-empty-search">Nenhum item encontrado neste pedido.</p>:itensDoPedido.map(item=>{const saldo=Math.max(0,item.quantity-(item.receivedQuantity??0));return <div className={`receipt-check-item ${item.quantity!==item.receivedQuantity||item.unitPrice!==item.receivedUnitPrice?'different':''}`} key={item.quotationItemId}><div className="receipt-product"><strong>{item.productName}</strong><span>{item.ean?`EAN ${item.ean} · `:''}Pedido: {item.quantity} un. × {money(item.unitPrice)}</span></div><label>Qtd. recebida<input type="number" min="0" disabled={!!pedido.checkedAt} value={item.receivedQuantity??''} onChange={e=>{const quantidade=e.target.value===''?null:Math.max(0,Number(e.target.value)||0);alterar(pedido.orderId,item.quotationItemId,{receivedQuantity:quantidade,receivedUnitPrice:quantidade===0?null:item.receivedUnitPrice,reorderShortfall:quantidade===item.quantity?false:item.reorderShortfall})}}/></label><label>Preço unitário<CampoPrecoRecebido valor={item.receivedUnitPrice} disabled={!!pedido.checkedAt||item.receivedQuantity==null||item.receivedQuantity===0} aoAlterar={valor=>alterar(pedido.orderId,item.quotationItemId,{receivedUnitPrice:valor})}/></label><strong className="receipt-subtotal">{money((item.receivedQuantity??0)*(item.receivedUnitPrice??0))}</strong>{!pedido.checkedAt&&item.receivedQuantity!==null&&saldo>0&&<label className="receipt-reorder"><input type="checkbox" checked={item.reorderShortfall} onChange={e=>alterar(pedido.orderId,item.quotationItemId,{reorderShortfall:e.target.checked})}/>Recomprar saldo de {saldo} un.</label>}<label className="receipt-note">Observação (opcional)<input maxLength={500} disabled={!!pedido.checkedAt} value={item.receiptNote} onChange={e=>alterar(pedido.orderId,item.quotationItemId,{receiptNote:e.target.value})}/></label></div>})}{!pedido.checkedAt&&<div className="receipt-order-save"><span>{pronto?'Pronto para salvar esta entrega.':'Preencha quantidade e preço de todos os itens.'}</span><button className="button button-primary" disabled={!pronto||ocupado||salvando!==null} onClick={()=>void salvar(pedido)}><CheckCircle2/>{salvando===pedido.orderId?'Salvando...':'Salvar conferência desta distribuidora'}</button></div>}</div>}</article>})}</div><div className="modal-actions"><button className="button button-ghost" disabled={ocupado||salvando!==null} onClick={aoFechar}>Fechar</button></div></section></div>
}

function ModalPedidoMinimo({opcoes,ocupado,aoFechar,aoAplicar,aoManual}:{opcoes:OpcoesPedidoMinimo;ocupado:boolean;aoFechar:()=>void;aoAplicar:(strategy:EstrategiaPedidoMinimo)=>void;aoManual:()=>void}){
  const atingir=opcoes.reachMinimum,repassar=opcoes.reallocateOrder
  return <div className="modal-backdrop"><section className="modal minimum-order-modal"><div className="modal-header modal-header-simple"><div><span className="eyebrow green">Pedido mínimo</span><h2>{opcoes.supplierName}</h2><p>O pedido atual soma {money(opcoes.currentTotal)} e precisa chegar a {money(opcoes.minimumOrderValue)}. Confira o impacto antes de alterar o plano.</p></div><button className="icon-button" aria-label="Fechar" onClick={aoFechar}><X/></button></div><div className="minimum-options">
    <article className={atingir.feasible?'':'option-unavailable'}><div className="minimum-option-title"><div><strong>Atingir o mínimo</strong><span>Realoca produtos primeiro e só depois adiciona unidades extras.</span></div><span className={atingir.feasible?'status-active':'status-inactive'}>{atingir.feasible?'Disponível':'Não foi possível'}</span></div>{atingir.adjustments.length>0&&<div className="minimum-adjustments">{atingir.adjustments.map(item=><div key={`${item.quotationItemId}-${item.type}`}><div><strong>{item.productName}</strong><span>{item.type==='UNIDADES_EXTRAS'?`${item.extraQuantity} unidades extras`:`de ${item.currentQuantity} para ${item.projectedQuantity} un. nesta distribuidora`}</span></div><small>{money(item.unitPrice)} por un.</small></div>)}</div>}<div className="minimum-option-summary"><span>Novo pedido<strong>{money(atingir.projectedSupplierTotal)}</strong></span><span>Impacto no total<strong>{atingir.purchaseIncrease>=0?'+':''}{money(atingir.purchaseIncrease)}</strong></span><span>Unidades extras<strong>{atingir.extraUnits}</strong></span></div>{!atingir.feasible&&<p className="option-reason">O estoque informado não é suficiente para chegar ao mínimo sem prejudicar outro pedido.</p>}<button className="button button-primary full-button" disabled={ocupado||!atingir.feasible} onClick={()=>aoAplicar('ATINGIR_MINIMO')}>Aplicar ajuste para atingir o mínimo</button></article>
    <article className={repassar.feasible?'':'option-unavailable'}><div className="minimum-option-title"><div><strong>Repassar pedido inteiro</strong><span>Retira esta distribuidora do plano e usa as próximas melhores ofertas.</span></div><span className={repassar.feasible?'status-active':'status-inactive'}>{repassar.feasible?'Disponível':'Sem cobertura total'}</span></div>{repassar.adjustments.length>0&&<div className="minimum-adjustments">{repassar.adjustments.map(item=><div key={item.quotationItemId}><div><strong>{item.productName}</strong><span>{item.currentQuantity} un. → {item.destinationSupplier??'sem outra oferta'}</span></div></div>)}</div>}<div className="minimum-option-summary"><span>Novo total geral<strong>{money(repassar.projectedPurchaseTotal)}</strong></span><span>Impacto no total<strong>{repassar.purchaseIncrease>=0?'+':''}{money(repassar.purchaseIncrease)}</strong></span><span>Novas sem cobertura<strong>{repassar.uncoveredUnits} un.</strong></span></div>{!repassar.feasible&&<p className="option-reason">Não há estoque suficiente nas outras propostas para repassar tudo.</p>}<button className="button button-danger-soft full-button" disabled={ocupado||!repassar.feasible} onClick={()=>aoAplicar('REPASSAR_PEDIDO')}>Repassar para outras distribuidoras</button></article>
  </div><div className="minimum-manual-entry"><div><SlidersHorizontal/><span><strong>Prefere decidir com calma?</strong>Ajuste fornecedor e quantidade de cada produto e veja quanto falta em tempo real.</span></div><button className="button button-secondary" disabled={ocupado} onClick={aoManual}>Ajustar produto por produto</button></div><div className="modal-actions"><button className="button button-ghost" disabled={ocupado} onClick={aoFechar}>Cancelar</button></div></section></div>
}

function ModalHistorico({historico,ocupado,aoFechar,aoRestaurar}:{historico:HistoricoPlano;ocupado:boolean;aoFechar:()=>void;aoRestaurar:(versao:VersaoPlano)=>void}){
  return <div className="modal-backdrop"><section className="modal plan-history-modal"><div className="modal-header modal-header-simple"><div><span className="eyebrow green">Plano de compra</span><h2>Histórico de alterações</h2><p>Restaure fornecedores, quantidades e distribuidoras exatamente como estavam em qualquer versão compatível.</p></div><button className="icon-button" aria-label="Fechar" onClick={aoFechar}><X/></button></div>
    {historico.versions.length===0?<EstadoVazio title="Nenhuma alteração registrada" description="A primeira versão será criada quando o plano for alterado."/>:<div className="plan-history-list">{historico.versions.map(versao=><article key={versao.id} className={versao.current?'current':''}><div className="history-version-number"><span>v{versao.number}</span>{versao.current&&<small>Atual</small>}</div><div className="history-version-content"><strong>{versao.description}</strong><span>{date(versao.createdAt)} · {versao.createdBy}</span>{!versao.restorable&&versao.blockedReason&&<small className="history-blocked"><AlertTriangle/>{versao.blockedReason}</small>}</div><strong>{money(versao.total)}</strong>{!versao.current&&<button className="button button-secondary" disabled={ocupado||!versao.restorable} onClick={()=>aoRestaurar(versao)}>{versao.restorable?'Restaurar':'Indisponível'}</button>}</article>)}</div>}
    <div className="modal-actions"><button className="button button-ghost" onClick={aoFechar}>Fechar</button></div>
  </section></div>
}

function ModalAjusteMinimoManual({cotacaoId,opcoes,comparacao,baseVersionId,ocupado,erroGeral,aoFechar,aoSalvar}:{cotacaoId:string;opcoes:OpcoesPedidoMinimo;comparacao:ComparacaoCotacao;baseVersionId:number;ocupado:boolean;erroGeral:string;aoFechar:()=>void;aoSalvar:(itens:EdicaoPlano[],baseVersionId:number)=>void}){
  const criarEdicoes=()=>comparacao.products.map(p=>({quotationItemId:p.quotationItemId,desiredQuantity:p.desiredQuantity,selectedResponseId:p.selectedResponseId??null,championQuantity:p.championQuantity??null,stockOverrideNote:p.stockOverrideNote??'',manualSelection:!!p.manualSelection,allocations:p.allocations??[]}))
  const[iniciais]=useState<EdicaoPlano[]>(criarEdicoes);const[edicoes,setEdicoes]=useState<EdicaoPlano[]>(criarEdicoes);const[previa,setPrevia]=useState<PreviaManualPedidoMinimo|null>(null);const[carregandoPrevia,setCarregandoPrevia]=useState(true);const[erroPrevia,setErroPrevia]=useState('');const[busca,setBusca]=useState('');const[expandido,setExpandido]=useState<number|null>(null)
  useEffect(()=>{let cancelado=false;setCarregandoPrevia(true);const timer=window.setTimeout(async()=>{try{const resultado=await api<PreviaManualPedidoMinimo>(`/quotations/${cotacaoId}/minimum-order-options/${opcoes.responseId}/manual-preview`,{method:'POST',body:JSON.stringify({items:edicoes,baseVersionId})});if(!cancelado){setPrevia(resultado);setErroPrevia('')}}catch(e){if(!cancelado){setErroPrevia(mensagemErro(e,'Não foi possível calcular esta combinação.'));setPrevia(null)}}finally{if(!cancelado)setCarregandoPrevia(false)}},250);return()=>{cancelado=true;window.clearTimeout(timer)}},[cotacaoId,opcoes.responseId,edicoes,baseVersionId])
  const alterar=(itemId:number,parcial:Partial<EdicaoPlano>)=>setEdicoes(atuais=>atuais.map(item=>item.quotationItemId===itemId?{...item,...parcial}:item))
  const restaurarItem=(itemId:number)=>{const original=iniciais.find(item=>item.quotationItemId===itemId);if(original)alterar(itemId,{...original})}
  const grupoBase=comparacao.suggestedPurchase.find(g=>g.responseId===opcoes.responseId);const grupoProjetado=previa?.comparison.suggestedPurchase.find(g=>g.responseId===opcoes.responseId)
  const quantidade=(grupo:typeof grupoBase,itemId:number)=>grupo?.items?.find(item=>item.quotationItemId===itemId)?.allocatedQuantity??0
  const termo=busca.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();const incluidos=new Set(comparacao.supplierTotals.filter(s=>s.includedInSuggestedPurchase).map(s=>s.responseId))
  const candidatos=comparacao.products.filter(p=>p.offers.some(o=>o.responseId===opcoes.responseId)&&(!termo||`${p.productName} ${p.ean??''}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(termo))).sort((a,b)=>{const qa=quantidade(grupoBase,a.quotationItemId),qb=quantidade(grupoBase,b.quotationItemId);return qb-qa||a.productName.localeCompare(b.productName,'pt-BR')})
  const mudou=JSON.stringify(edicoes)!==JSON.stringify(iniciais);const total=previa?.supplierTotal??opcoes.currentTotal;const falta=previa?.shortfall??opcoes.shortfall
  return <div className="modal-backdrop"><section className="modal manual-minimum-modal"><div className="modal-header modal-header-simple"><div><span className="eyebrow green">Ajuste produto por produto</span><h2>{opcoes.supplierName}</h2><p>Altere apenas o que fizer sentido. Nada será salvo até sua confirmação final.</p></div><button className="icon-button" aria-label="Fechar" onClick={aoFechar}><X/></button></div>
    <div className={`manual-minimum-summary ${falta>0?'warning':'complete'}`}><div><span>Total nesta distribuidora</span><strong>{money(total)}</strong></div><div><span>Pedido mínimo</span><strong>{money(opcoes.minimumOrderValue)}</strong></div><div><span>{falta>0?'Ainda falta':'Situação'}</span><strong>{falta>0?money(falta):'Mínimo atingido'}</strong></div><div><span>Impacto geral</span><strong>{previa?`${previa.purchaseIncrease>=0?'+':''}${money(previa.purchaseIncrease)}`:'Calculando...'}</strong></div><div><span>Unidades extras</span><strong>{previa?.extraUnits??0}</strong></div><div><span>Novas sem cobertura</span><strong>{previa?.uncoveredUnits??0}</strong></div></div>
    <div className="manual-minimum-search"><Search/><input type="search" placeholder="Buscar produto ou EAN" value={busca} onChange={e=>setBusca(e.target.value)}/><span>{candidatos.length} produtos</span></div>
    {erroPrevia&&<div className="alert alert-error">{erroPrevia}</div>}{erroGeral&&<div className="alert alert-error" role="alert">{erroGeral}</div>}<div className="manual-minimum-products">{candidatos.map(produto=>{const edicao=edicoes.find(item=>item.quotationItemId===produto.quotationItemId)!;const original=iniciais.find(item=>item.quotationItemId===produto.quotationItemId)!;const aberto=expandido===produto.quotationItemId;const alterado=JSON.stringify(edicao)!==JSON.stringify(original);const ofertas=produto.offers.filter(o=>incluidos.has(o.responseId));const selecionada=ofertas.find(o=>o.responseId===edicao.selectedResponseId);const atual=quantidade(grupoBase,produto.quotationItemId),projetada=quantidade(grupoProjetado,produto.quotationItemId);const excesso=selecionada&&edicao.championQuantity!=null&&edicao.championQuantity>selecionada.availableQuantity;return <article key={produto.quotationItemId} className={alterado?'changed':''}><button type="button" className="manual-product-toggle" onClick={()=>setExpandido(aberto?null:produto.quotationItemId)}><div><strong>{produto.productName}</strong><span>{atual} un. antes → <b>{projetada} un. na prévia</b></span></div><span>{money(produto.offers.find(o=>o.responseId===opcoes.responseId)?.unitPrice)}</span><ChevronDown/></button>{aberto&&<div className="manual-product-fields"><label>Quantidade total que deseja comprar<input type="number" min="0" inputMode="numeric" value={edicao.desiredQuantity===0?'':edicao.desiredQuantity} placeholder="0" onChange={e=>{const valor=Math.max(0,Number(e.target.value));alterar(produto.quotationItemId,{desiredQuantity:valor,championQuantity:edicao.championQuantity==null?null:Math.min(edicao.championQuantity,valor),selectedResponseId:valor===0?null:edicao.selectedResponseId,manualSelection:valor===0?false:edicao.manualSelection})}}/></label><label>Comprar primeiro de<select value={edicao.manualSelection?edicao.selectedResponseId??'':''} disabled={edicao.desiredQuantity===0} onChange={e=>{if(!e.target.value){alterar(produto.quotationItemId,{selectedResponseId:produto.offers[0]?.responseId??null,championQuantity:null,manualSelection:false,stockOverrideNote:''});return}const responseId=Number(e.target.value),oferta=ofertas.find(o=>o.responseId===responseId);alterar(produto.quotationItemId,{selectedResponseId:responseId,manualSelection:true,championQuantity:Math.min(edicao.desiredQuantity,oferta?.availableQuantity??edicao.desiredQuantity),stockOverrideNote:''})}}><option value="">Automático — menor preço</option>{ofertas.map(oferta=><option key={oferta.responseId} value={oferta.responseId}>{oferta.supplierName} — {money(oferta.unitPrice)} · {oferta.availableQuantity} un.</option>)}</select></label><label>Quantidade nesta distribuidora<input type="number" min="1" max={edicao.desiredQuantity} disabled={!edicao.manualSelection||!edicao.selectedResponseId||edicao.desiredQuantity===0} value={edicao.manualSelection?edicao.championQuantity??'':''} placeholder="Automática" onChange={e=>alterar(produto.quotationItemId,{championQuantity:e.target.value?Number(e.target.value):null})}/></label>{excesso&&<label className="manual-stock-note">Justificativa do estoque adicional<input placeholder="Ex.: confirmado pelo representante" value={edicao.stockOverrideNote} onChange={e=>alterar(produto.quotationItemId,{stockOverrideNote:e.target.value})}/></label>}<div className="manual-product-actions"><button type="button" className="button button-secondary" onClick={()=>{const oferta=ofertas.find(o=>o.responseId===opcoes.responseId);if(oferta)alterar(produto.quotationItemId,{selectedResponseId:opcoes.responseId,manualSelection:true,championQuantity:Math.min(edicao.desiredQuantity,oferta.availableQuantity),stockOverrideNote:''})}}>Comprar de {opcoes.supplierName}</button>{alterado&&<button type="button" className="button button-ghost" onClick={()=>restaurarItem(produto.quotationItemId)}><RotateCcw/>Desfazer neste item</button>}</div></div>}</article>})}</div>
    <div className="manual-minimum-footer-note">{falta>0?<><AlertTriangle/><span>O plano continuará {money(falta)} abaixo do mínimo. Você ainda pode salvar e assumir o risco depois.</span></>:<><CheckCircle2/><span>O mínimo foi atingido nesta prévia.</span></>}</div><div className="modal-actions"><button className="button button-ghost" disabled={ocupado} onClick={aoFechar}>Cancelar sem salvar</button><button className="button button-primary" disabled={ocupado||carregandoPrevia||!!erroPrevia||!mudou} onClick={()=>{if(window.confirm(`Aplicar todos os ajustes? O pedido ficará em ${money(total)}${falta>0?`, ainda ${money(falta)} abaixo do mínimo`:''}.`))aoSalvar(edicoes,baseVersionId)}}>{ocupado?'Salvando...':falta>0?'Salvar mesmo abaixo do mínimo':'Aplicar ajustes'}</button></div>
  </section></div>
}

function Produtos({cotacao,podeEditar,ocupado,aoSalvar}:{cotacao:Cotacao;podeEditar:boolean;ocupado:boolean;aoSalvar:(itemId:number,quantity:number,active:boolean)=>Promise<void>}){return <section className="card"><div className="card-header"><div><h2>Produtos solicitados</h2><p>Altere a quantidade ou desative produtos sem apagar o histórico da cotação.</p></div></div><div className="table-wrap"><table><thead><tr><th>#</th><th>Produto</th><th>EAN</th><th>Quantidade</th><th>Status</th>{podeEditar&&<th/>}</tr></thead><tbody>{cotacao.items.map((item,n)=><LinhaProduto key={item.id} item={item} numero={n+1} podeEditar={podeEditar} ocupado={ocupado} aoSalvar={aoSalvar}/>)}</tbody></table></div></section>}
function LinhaProduto({item,numero,podeEditar,ocupado,aoSalvar}:{item:Cotacao['items'][number];numero:number;podeEditar:boolean;ocupado:boolean;aoSalvar:(itemId:number,quantity:number,active:boolean)=>Promise<void>}){const[quantityInput,setQuantityInput]=useState(String(item.requestedQuantity));const[active,setActive]=useState(item.active);useEffect(()=>{setQuantityInput(String(item.requestedQuantity));setActive(item.active)},[item]);const quantity=quantityInput.trim()===''?null:Number(quantityInput);const quantidadeValida=quantity!==null&&Number.isInteger(quantity)&&quantity>=1;const mudou=(quantidadeValida&&quantity!==item.requestedQuantity)||active!==item.active;return <tr className={active?'':'inactive-row'}><td>{numero}</td><td><strong>{item.productName}</strong>{!active&&<small className="inactive-note">Fora da cotação</small>}</td><td>{item.ean??'—'}</td><td>{podeEditar?<input className="quotation-quantity-input" type="number" min="1" step="1" value={quantityInput} onChange={event=>setQuantityInput(event.target.value)}/>:<>{item.requestedQuantity} un.</>}</td><td><span className={active?'status-active':'status-inactive'}>{active?'Ativo':'Desativado'}</span></td>{podeEditar&&<td><div className="quotation-item-actions"><label className="active-toggle"><input type="checkbox" checked={active} onChange={event=>setActive(event.target.checked)}/><span>{active?'Ativo na cotação':'Inativo'}</span></label><button className="button button-secondary" disabled={ocupado||!mudou||!quantidadeValida} onClick={()=>{if(quantidadeValida)void aoSalvar(item.id,quantity,active)}}><Save/>Salvar</button></div></td>}</tr>}
function ModalPreviaResposta({previa,aoFechar}:{previa:PreviaResposta;aoFechar:()=>void}){const[busca,setBusca]=useState('');const preenchido=(item:PreviaResposta['items'][number])=>item.available&&item.unitPrice!=null&&item.availableQuantity!=null&&item.availableQuantity>0;const cotados=previa.items.filter(preenchido);const termo=busca.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();const itens=previa.items.filter(item=>!termo||`${item.productName} ${item.ean??''} ${item.laboratory??''}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(termo)).sort((a,b)=>(preenchido(a)?0:1)-(preenchido(b)?0:1));return <div className="modal-backdrop"><section className="modal response-preview-modal" role="dialog" aria-modal="true" aria-labelledby="titulo-previa-resposta"><div className="modal-header modal-header-simple"><div><span className="eyebrow green">Prévia em preenchimento</span><h2 id="titulo-previa-resposta">{previa.supplierName}</h2><p>{previa.representativeName} · {cotados.length} de {previa.items.length} produtos respondidos</p></div><button className="icon-button" aria-label="Fechar" onClick={aoFechar}><X/></button></div><div className="response-preview-summary"><div><span>Produtos cotados</span><strong>{previa.quotedItems} de {previa.items.length}</strong></div><div><span>Total parcial</span><strong>{money(previa.total)}</strong></div><div><span>Pedido mínimo</span><strong>{previa.minimumOrderValue==null?'Sem mínimo':money(previa.minimumOrderValue)}</strong></div></div><div className="response-preview-search"><Search/><input type="search" autoFocus placeholder="Buscar produto, EAN ou laboratório" value={busca} onChange={event=>setBusca(event.target.value)}/>{busca&&<button type="button" onClick={()=>setBusca('')} aria-label="Limpar busca">×</button>}<span>{itens.length} de {previa.items.length}</span></div><div className="response-preview-items">{itens.length===0?<EstadoVazio title="Nenhum produto encontrado" description="Tente buscar por outro produto, EAN ou laboratório."/>:itens.map(item=>{const itemPreenchido=preenchido(item);return <article className={itemPreenchido?'quoted':'pending'} key={item.quotationItemId}><div><strong>{item.productName}</strong><span>{item.ean?`EAN ${item.ean} · `:''}Solicitado: {item.requestedQuantity} un.</span>{item.laboratory&&<small>{item.laboratory}</small>}</div>{itemPreenchido?<div className="response-preview-values"><span>{item.availableQuantity} un.</span><strong>{money(item.unitPrice!)}</strong>{item.note&&<small>{item.note}</small>}</div>:<span className="response-preview-pending">Ainda não respondido</span>}</article>})}</div><div className="modal-actions"><button className="button button-primary" onClick={aoFechar}>Fechar prévia</button></div></section></div>}
function Respostas({respostas,total,podeEditar,ocupado,carregandoPrevia,aoEspiar,aoAlternar}:{respostas:RespostaCotacao[];total:number;podeEditar:boolean;ocupado:boolean;carregandoPrevia:boolean;aoEspiar:(resposta:RespostaCotacao)=>void;aoAlternar:(resposta:RespostaCotacao,active:boolean)=>void}){return <section className="card"><div className="card-header"><div><h2>Respostas dos representantes</h2><p>Abra as propostas em preenchimento para acompanhar o que cada distribuidora já informou.</p></div></div>{respostas.length===0?<EstadoVazio title="Nenhuma resposta ainda" description="Compartilhe o link com seus representantes."/>:<div className="table-wrap"><table><thead><tr><th>Distribuidora</th><th>Representante</th><th>Status</th><th>Envio</th><th>Itens</th><th>Total</th><th>Pedido mínimo</th>{podeEditar&&<th/>}</tr></thead><tbody>{respostas.map(r=><tr key={r.id} className={r.active?'':'inactive-row'}><td>{r.status==='IN_PROGRESS'?<button className="response-preview-trigger" disabled={carregandoPrevia} onClick={()=>aoEspiar(r)}><strong>{r.supplierName}</strong><small><Eye/>{carregandoPrevia?'Carregando prévia...':'Espiar preenchimento'}</small></button>:<><strong>{r.supplierName}</strong></>}{!r.active&&<small className="inactive-note">Ignorada nos cálculos</small>}{r.active&&!r.includedInSuggestedPurchase&&r.status==='SUBMITTED'&&<small className="inactive-note">Repassada para outras ofertas</small>}</td><td>{r.representativeName}</td><td><EtiquetaStatus status={r.status}/></td><td>{r.submittedAt?date(r.submittedAt):<Clock3/>}</td><td>{r.quotedItems} de {total}</td><td>{money(r.total)}</td><td>{r.minimumOrderValue==null?'Sem mínimo':money(r.minimumOrderValue)}</td>{podeEditar&&<td><button className={`button ${r.active?'button-danger-soft':'button-secondary'}`} disabled={ocupado} onClick={()=>aoAlternar(r,!r.active)}><Power/>{r.active?'Desativar':'Reativar'}</button></td>}</tr>)}</tbody></table></div>}</section>}
type OrdenacaoOfertasCartao='preco'|'fornecedor'
interface PreferenciasColunasComparativo { ordem:number[]; ocultos:number[]; larguras:Record<number,number>; escalaProdutoQtd:number; escalaResumo:number; ordenacaoOfertas:OrdenacaoOfertasCartao }
const chaveColunasComparativo=(cotacaoId:string)=>`cotapreco:comparativo-colunas:${cotacaoId}`
const LARGURA_COLUNA_FORNECEDOR_PADRAO=130
const LARGURA_COLUNA_FORNECEDOR_MINIMA=70
const LARGURA_COLUNA_FORNECEDOR_MAXIMA=320
const LARGURA_BASE_PRODUTO=220
const LARGURA_BASE_QTD=70
const LARGURA_BASE_FAIXA=118
const LARGURA_BASE_ECONOMIA=118
const LARGURA_BASE_MELHOR=92
/*
 * Abaixo desta largura a tabela deixa de caber: só as colunas fixas (Produto, Qtd. e o resumo
 * à direita) já ocupam ~620px, e o que sobra não dá nem para três fornecedores — em celulares,
 * tablets e notebooks pequenos o comparativo passa a ser a lista de cartões.
 */
const LARGURA_MAXIMA_CARTOES=1080
const ESCALA_GRUPO_MINIMA=0.6
const ESCALA_GRUPO_MAXIMA=1.8
function normalizarEscalaGrupo(valor:unknown):number{
  const numero=Number(valor)
  return Number.isFinite(numero)?Math.min(ESCALA_GRUPO_MAXIMA,Math.max(ESCALA_GRUPO_MINIMA,numero)):1
}
function lerPreferenciasColunasComparativo(cotacaoId:string):PreferenciasColunasComparativo{
  try{
    const bruto=JSON.parse(window.localStorage.getItem(chaveColunasComparativo(cotacaoId))||'{}')
    const larguras:Record<number,number>={}
    if(bruto.larguras&&typeof bruto.larguras==='object')Object.entries(bruto.larguras).forEach(([chave,valor])=>{const id=Number(chave);const largura=Number(valor);if(Number.isFinite(id)&&Number.isFinite(largura))larguras[id]=largura})
    return{ordem:Array.isArray(bruto.ordem)?bruto.ordem:[],ocultos:Array.isArray(bruto.ocultos)?bruto.ocultos:[],larguras,escalaProdutoQtd:normalizarEscalaGrupo(bruto.escalaProdutoQtd),escalaResumo:normalizarEscalaGrupo(bruto.escalaResumo),ordenacaoOfertas:bruto.ordenacaoOfertas==='fornecedor'?'fornecedor':'preco'}
  }catch{return{ordem:[],ocultos:[],larguras:{},escalaProdutoQtd:1,escalaResumo:1,ordenacaoOfertas:'preco'}}
}

function CartaoAchado({achado,aoAbrir}:{achado:AchadoPreco;aoAbrir:(quotationItemId:number)=>void}){
  return <button type="button" className={`achado ${achado.percentual>=60?'achado-suspeito':''}`} onClick={()=>aoAbrir(achado.produto.quotationItemId)}>
    <strong>{achado.produto.productName}</strong>
    <span>{money(achado.melhor.unitPrice)} em {achado.melhor.supplierName} · {achado.percentual.toFixed(0)}% abaixo de {achado.segunda.supplierName}</span>
    <b>{money(achado.economia)} em {achado.volume} un.</b>
    {achado.percentual>=60&&<small><AlertTriangle/>Diferença grande — confira embalagem e EAN antes de contar com ela.</small>}
  </button>
}

function CartaoRisco({item,aoAbrir}:{item:AchadoRisco;aoAbrir:(quotationItemId:number)=>void}){
  return <button type="button" className="achado achado-risco" onClick={()=>aoAbrir(item.produto.quotationItemId)}>
    <strong>{item.produto.productName}</strong>
    <span>{item.ofertas===0?`Nenhuma das ${item.distribuidoras} distribuidoras ofertou`:`Só ${item.produto.offers[0].supplierName} ofertou, de ${item.distribuidoras} que responderam`}</span>
    <b>{item.produto.requestedQuantity} un. pedidas</b>
    <small><AlertTriangle/>{item.ofertas===0?'Sem fonte na cotação — procure outra distribuidora antes de fechar.':'Fonte única: sem alternativa se faltar ou se o preço não fechar.'}</small>
  </button>
}

function ModalAchados({aberta,achados,escassez,aoAbrirProduto,aoFechar}:{aberta:boolean;achados:AchadoPreco[];escassez:AchadoRisco[];aoAbrirProduto:(quotationItemId:number)=>void;aoFechar:()=>void}){
  const[busca,setBusca]=useState('');const[tipo,setTipo]=useState<'todos'|'oportunidade'|'ruptura'>('todos')
  const termo=semAcento(busca.trim())
  const combina=(produto:ComparacaoProduto,extra:string)=>!termo||semAcento(`${produto.productName} ${produto.ean??''} ${extra}`).includes(termo)
  const precos=achados.filter(achado=>combina(achado.produto,`${achado.melhor.supplierName} ${achado.segunda.supplierName}`))
  const riscos=escassez.filter(item=>combina(item.produto,item.produto.offers[0]?.supplierName??''))
  return <div className="modal-backdrop"><section className="modal achados-modal" role="dialog" aria-modal="true" aria-labelledby="titulo-achados">
    <div className="modal-header modal-header-simple"><div><span className="eyebrow green">{aberta?'Cotação aberta':'Cotação fechada'}</span><h2 id="titulo-achados">Tudo que vale olhar</h2><p>{achados.length} oportunidade{achados.length===1?'':'s'} de preço e {escassez.length} com risco de ruptura, {aberta?'com as respostas recebidas até agora':'nas respostas recebidas'}.</p></div><button type="button" className="icon-button" aria-label="Fechar" onClick={aoFechar}><X/></button></div>
    <label className="search achados-modal-busca"><Search/><input autoFocus type="search" placeholder="Buscar produto, EAN ou distribuidora" value={busca} onChange={event=>setBusca(event.target.value)}/>{busca&&<button type="button" onClick={()=>setBusca('')} aria-label="Limpar busca">×</button>}</label>
    <div className="achados-modal-filtros" role="group" aria-label="Tipo de achado">
      <button type="button" className={tipo==='todos'?'ativo':''} onClick={()=>setTipo('todos')}>Tudo · {precos.length+riscos.length}</button>
      <button type="button" className={tipo==='oportunidade'?'ativo':''} onClick={()=>setTipo('oportunidade')}>Oportunidade · {precos.length}</button>
      <button type="button" className={tipo==='ruptura'?'ativo':''} onClick={()=>setTipo('ruptura')}>Ruptura · {riscos.length}</button>
    </div>
    <div className="achados-modal-corpo">
      {(tipo==='ruptura'?riscos.length:tipo==='oportunidade'?precos.length:precos.length+riscos.length)===0
        ?<EstadoVazio title="Nada aqui" description={termo?'Tente outro produto, EAN ou distribuidora.':'Nenhum item deste tipo com o corte atual.'}/>
        :<>
        {tipo!=='ruptura'&&precos.length>0&&<div className="achados-grupo"><span className="achados-rotulo">Oportunidade de preço · {precos.length}</span>
          <div className="achados-lista">{precos.map(achado=><CartaoAchado key={achado.produto.quotationItemId} achado={achado} aoAbrir={aoAbrirProduto}/>)}</div></div>}
        {tipo!=='oportunidade'&&riscos.length>0&&<div className="achados-grupo"><span className="achados-rotulo">Risco de ruptura · {riscos.length}</span>
          <div className="achados-lista">{riscos.map(item=><CartaoRisco key={item.produto.quotationItemId} item={item} aoAbrir={aoAbrirProduto}/>)}</div></div>}
      </>}
    </div>
    <div className="modal-actions"><button type="button" className="button button-ghost" onClick={aoFechar}>Fechar</button></div>
  </section></div>
}

function Comparativo({comparacao,cotacaoId,destacado}:{comparacao:ComparacaoCotacao;cotacaoId:string;destacado:number|null}){
  const[busca,setBusca]=useState('')
  const[ordem,setOrdem]=useState<'menor'|'maior'|'economia'>('menor')
  const[ordemColuna,setOrdemColuna]=useState<{responseId:number;direcao:'asc'|'desc'}|null>(null)
  const[filtroFornecedorId,setFiltroFornecedorId]=useState<number|'todos'>('todos')
  const[filtroFornecedorModo,setFiltroFornecedorModo]=useState<'com'|'sem'>('com')
  const[somenteSemOferta,setSomenteSemOferta]=useState(false)
  const[somenteComEconomia,setSomenteComEconomia]=useState(false)
  const[precoMinimo,setPrecoMinimo]=useState('')
  const[precoMaximo,setPrecoMaximo]=useState('')
  const[preferenciasColunas,setPreferenciasColunas]=useState<PreferenciasColunasComparativo>(()=>lerPreferenciasColunasComparativo(cotacaoId))
  const[colunaArrastada,setColunaArrastada]=useState<number|null>(null)
  const[colunaSobreposta,setColunaSobreposta]=useState<number|null>(null)
  const[deslocamentoColuna,setDeslocamentoColuna]=useState(0)
  const geometriaColunas=useRef<{responseId:number;centro:number;largura:number}[]>([])
  const temporizadorColuna=useRef<number|null>(null)
  const arrastouColuna=useRef(false)
  const[filtrosAbertos,setFiltrosAbertos]=useState(false)
  usarCamadaNoHistorico(filtrosAbertos,()=>setFiltrosAbertos(false))
  const[cartoesAbertos,setCartoesAbertos]=useState<Set<number>>(()=>new Set())
  const[larguraJanela,setLarguraJanela]=useState(()=>typeof window==='undefined'?1024:window.innerWidth)

  useEffect(()=>{try{window.localStorage.setItem(chaveColunasComparativo(cotacaoId),JSON.stringify(preferenciasColunas))}catch{/* Preferência de colunas é opcional quando o navegador bloqueia armazenamento. */}},[cotacaoId,preferenciasColunas])
  useEffect(()=>()=>{if(temporizadorColuna.current!==null)window.clearTimeout(temporizadorColuna.current)},[])
  useEffect(()=>{
    const aoRedimensionarJanela=()=>setLarguraJanela(window.innerWidth)
    window.addEventListener('resize',aoRedimensionarJanela)
    return()=>window.removeEventListener('resize',aoRedimensionarJanela)
  },[])
  const layoutCartoes=larguraJanela<=LARGURA_MAXIMA_CARTOES
  const larguraProduto=Math.round(LARGURA_BASE_PRODUTO*preferenciasColunas.escalaProdutoQtd)
  const larguraQtd=Math.round(LARGURA_BASE_QTD*preferenciasColunas.escalaProdutoQtd)
  const larguraFaixa=Math.round(LARGURA_BASE_FAIXA*preferenciasColunas.escalaResumo)
  const larguraEconomia=Math.round(LARGURA_BASE_ECONOMIA*preferenciasColunas.escalaResumo)
  const larguraMelhor=Math.round(LARGURA_BASE_MELHOR*preferenciasColunas.escalaResumo)

  const normalizar=(valor:string)=>valor.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase()
  const termo=normalizar(busca.trim())

  const idsFornecedores=comparacao.supplierTotals.map(s=>s.responseId)
  const ordemCompleta=[...preferenciasColunas.ordem.filter(id=>idsFornecedores.includes(id)),...idsFornecedores.filter(id=>!preferenciasColunas.ordem.includes(id))]
  const fornecedoresOrdenados=ordemCompleta.map(id=>comparacao.supplierTotals.find(s=>s.responseId===id)).filter((s):s is typeof comparacao.supplierTotals[number]=>Boolean(s))
  const fornecedoresVisiveis=fornecedoresOrdenados.filter(s=>!preferenciasColunas.ocultos.includes(s.responseId))

  function moverColuna(responseId:number,direcao:-1|1){
    setPreferenciasColunas(atual=>{
      const indiceAtual=ordemCompleta.indexOf(responseId);const indiceAlvo=indiceAtual+direcao
      if(indiceAtual<0||indiceAlvo<0||indiceAlvo>=ordemCompleta.length)return atual
      const copia=[...ordemCompleta];[copia[indiceAtual],copia[indiceAlvo]]=[copia[indiceAlvo],copia[indiceAtual]]
      return{...atual,ordem:copia}
    })
  }
  function moverColunaPara(origemId:number,destinoId:number){
    if(origemId===destinoId)return
    setPreferenciasColunas(atual=>{
      const indiceOrigem=ordemCompleta.indexOf(origemId);const indiceDestino=ordemCompleta.indexOf(destinoId)
      if(indiceOrigem<0||indiceDestino<0)return atual
      const copia=[...ordemCompleta];const[movido]=copia.splice(indiceOrigem,1);copia.splice(indiceDestino,0,movido)
      return{...atual,ordem:copia}
    })
  }
  function alternarVisibilidadeColuna(responseId:number){
    setPreferenciasColunas(atual=>({...atual,ocultos:atual.ocultos.includes(responseId)?atual.ocultos.filter(id=>id!==responseId):[...atual.ocultos,responseId]}))
  }
  function alternarOrdemColuna(responseId:number){
    setOrdemColuna(atual=>{
      if(!atual||atual.responseId!==responseId)return{responseId,direcao:'asc'}
      if(atual.direcao==='asc')return{responseId,direcao:'desc'}
      return null
    })
  }
  /*
   * O destino sai da posição medida das colunas no início do arraste, e não de elementFromPoint:
   * como as vizinhas deslizam para abrir espaço, o ponto sob o cursor fica vazio no meio do
   * gesto e a coluna seria solta no nada.
   */
  function medirColunas(elemento:HTMLElement){
    const cabecalho=elemento.closest('tr')
    geometriaColunas.current=cabecalho?[...cabecalho.querySelectorAll<HTMLElement>('[data-coluna-fornecedor]')].map(coluna=>{
      const caixa=coluna.getBoundingClientRect()
      return{responseId:Number(coluna.dataset.colunaFornecedor),centro:caixa.left+caixa.width/2,largura:caixa.width}
    }):[]
  }
  function colunaMaisProxima(x:number):number|null{
    let alvo:number|null=null
    let menorDistancia=Number.POSITIVE_INFINITY
    for(const coluna of geometriaColunas.current){
      const distancia=Math.abs(coluna.centro-x)
      if(distancia<menorDistancia){menorDistancia=distancia;alvo=coluna.responseId}
    }
    return alvo
  }
  function iniciarArrasteColuna(responseId:number,xInicial:number,cabecalho:HTMLElement){
    medirColunas(cabecalho)
    setColunaArrastada(responseId);setColunaSobreposta(responseId);setDeslocamentoColuna(0)
    let saiuDoLugar=false
    const mover=(moveEvent:PointerEvent)=>{
      if(Math.abs(moveEvent.clientX-xInicial)>6)saiuDoLugar=true
      setDeslocamentoColuna(moveEvent.clientX-xInicial)
      setColunaSobreposta(colunaMaisProxima(moveEvent.clientX))
    }
    const soltar=(upEvent:PointerEvent)=>{
      /* Segurar e soltar sem sair do lugar continua sendo um clique — ordena por esta coluna. */
      if(saiuDoLugar){
        const destino=colunaMaisProxima(upEvent.clientX)
        if(destino!==null)moverColunaPara(responseId,destino)
        arrastouColuna.current=true
        window.setTimeout(()=>{arrastouColuna.current=false},250)
      }
      setColunaArrastada(null);setColunaSobreposta(null);setDeslocamentoColuna(0)
      window.removeEventListener('pointermove',mover);window.removeEventListener('pointerup',soltar)
    }
    window.addEventListener('pointermove',mover);window.addEventListener('pointerup',soltar)
  }
  function agarrarColuna(evento:EventoPonteiroReact<HTMLElement>,responseId:number){
    if(evento.button!==0)return
    evento.preventDefault();evento.stopPropagation()
    const cabecalho=evento.currentTarget.closest('th')
    if(cabecalho)iniciarArrasteColuna(responseId,evento.clientX,cabecalho)
  }
  /*
   * Dá para pegar a coluna em qualquer ponto do cabeçalho, não só na alça: com o mouse basta
   * apertar e arrastar; parado, o arraste começa depois de segurar. Os botões de ordenar,
   * ocultar e mover continuam funcionando porque um clique curto nunca vira arraste.
   */
  function pressionarColuna(evento:EventoPonteiroReact<HTMLTableCellElement>,responseId:number){
    if(evento.button!==0)return
    if(evento.target instanceof Element&&evento.target.closest('.comparison-resize-handle,.comparison-drag-handle'))return
    const tipoPonteiro=evento.pointerType
    const xInicial=evento.clientX,yInicial=evento.clientY
    const cabecalho=evento.currentTarget
    function encerrarEspera(){
      if(temporizadorColuna.current!==null){window.clearTimeout(temporizadorColuna.current);temporizadorColuna.current=null}
      window.removeEventListener('pointermove',vigiar);window.removeEventListener('pointerup',encerrarEspera);window.removeEventListener('pointercancel',encerrarEspera)
    }
    function vigiar(movimento:PointerEvent){
      if(Math.abs(movimento.clientX-xInicial)<=6&&Math.abs(movimento.clientY-yInicial)<=6)return
      encerrarEspera()
      /* Com o mouse, sair do lugar já é arrastar; no toque, é rolagem da tabela. */
      if(tipoPonteiro!=='touch')iniciarArrasteColuna(responseId,xInicial,cabecalho)
    }
    window.addEventListener('pointermove',vigiar);window.addEventListener('pointerup',encerrarEspera);window.addEventListener('pointercancel',encerrarEspera)
    temporizadorColuna.current=window.setTimeout(()=>{encerrarEspera();iniciarArrasteColuna(responseId,xInicial,cabecalho)},350)
  }
  /* Mesma ideia dos cartões: a coluna arrastada acompanha o cursor e as vizinhas
     entre a origem e o destino andam uma posição para abrir o espaço. */
  function deslocamentoDaColuna(responseId:number,indice:number):number{
    if(colunaArrastada===null)return 0
    if(colunaArrastada===responseId)return deslocamentoColuna
    if(colunaSobreposta===null)return 0
    const origem=fornecedoresVisiveis.findIndex(s=>s.responseId===colunaArrastada)
    const destino=fornecedoresVisiveis.findIndex(s=>s.responseId===colunaSobreposta)
    if(origem<0||destino<0||origem===destino)return 0
    const largura=geometriaColunas.current.find(coluna=>coluna.responseId===colunaArrastada)?.largura??larguraColuna(colunaArrastada)
    if(origem<destino&&indice>origem&&indice<=destino)return -largura
    if(origem>destino&&indice>=destino&&indice<origem)return largura
    return 0
  }
  function larguraColuna(responseId:number):number{
    return preferenciasColunas.larguras[responseId]??LARGURA_COLUNA_FORNECEDOR_PADRAO
  }
  function iniciarRedimensionamento(event:EventoPonteiroReact,responseId:number){
    if(event.button!==0)return
    event.preventDefault();event.stopPropagation()
    const larguraInicial=larguraColuna(responseId);const xInicial=event.clientX
    const mover=(moveEvent:PointerEvent)=>{
      const novaLargura=Math.min(LARGURA_COLUNA_FORNECEDOR_MAXIMA,Math.max(LARGURA_COLUNA_FORNECEDOR_MINIMA,Math.round(larguraInicial+(moveEvent.clientX-xInicial))))
      setPreferenciasColunas(atual=>({...atual,larguras:{...atual.larguras,[responseId]:novaLargura}}))
    }
    const soltar=()=>{window.removeEventListener('pointermove',mover);window.removeEventListener('pointerup',soltar)}
    window.addEventListener('pointermove',mover);window.addEventListener('pointerup',soltar)
  }
  function iniciarRedimensionamentoGrupo(event:EventoPonteiroReact,grupo:'produtoQtd'|'resumo'){
    if(event.button!==0)return
    event.preventDefault();event.stopPropagation()
    const escalaInicial=grupo==='produtoQtd'?preferenciasColunas.escalaProdutoQtd:preferenciasColunas.escalaResumo
    const larguraBase=grupo==='produtoQtd'?(LARGURA_BASE_PRODUTO+LARGURA_BASE_QTD):(LARGURA_BASE_FAIXA+LARGURA_BASE_ECONOMIA+LARGURA_BASE_MELHOR)
    const xInicial=event.clientX
    const mover=(moveEvent:PointerEvent)=>{
      const deltaX=grupo==='produtoQtd'?(moveEvent.clientX-xInicial):(xInicial-moveEvent.clientX)
      const novaEscala=Math.min(ESCALA_GRUPO_MAXIMA,Math.max(ESCALA_GRUPO_MINIMA,escalaInicial+deltaX/larguraBase))
      setPreferenciasColunas(atual=>grupo==='produtoQtd'?{...atual,escalaProdutoQtd:novaEscala}:{...atual,escalaResumo:novaEscala})
    }
    const soltar=()=>{window.removeEventListener('pointermove',mover);window.removeEventListener('pointerup',soltar)}
    window.addEventListener('pointermove',mover);window.addEventListener('pointerup',soltar)
  }
  function compactarColunas(){
    setPreferenciasColunas(atual=>{
      const larguras={...atual.larguras}
      fornecedoresVisiveis.forEach(s=>{larguras[s.responseId]=LARGURA_COLUNA_FORNECEDOR_MINIMA})
      return{...atual,larguras}
    })
  }
  function redefinirLargurasColunas(){
    setPreferenciasColunas(atual=>({...atual,larguras:{},escalaProdutoQtd:1,escalaResumo:1}))
  }
  const larguraPersonalizada=Object.keys(preferenciasColunas.larguras).length>0||preferenciasColunas.escalaProdutoQtd!==1||preferenciasColunas.escalaResumo!==1

  const min=precoMinimo.trim()===''?null:Number(precoMinimo.replace(',','.'))
  const max=precoMaximo.trim()===''?null:Number(precoMaximo.replace(',','.'))
  const fornecedorFiltro=filtroFornecedorId==='todos'?null:comparacao.supplierTotals.find(s=>s.responseId===filtroFornecedorId)??null

  const detalhes=comparacao.products
    .map(produto=>{const ofertas=[...produto.offers].sort((a,b)=>a.unitPrice-b.unitPrice);const menor=ofertas[0]?.unitPrice??null;const maior=ofertas.length?ofertas[ofertas.length-1].unitPrice:null;const segunda=ofertas[1];const quantidadeComparavel=segunda?Math.min(produto.coveredQuantity,segunda.availableQuantity):0;const economia=menor!==null&&segunda?Math.max(0,(segunda.unitPrice-menor)*quantidadeComparavel):0;return{produto,menor,maior,economia}})
    .filter(({produto})=>!termo||normalizar(`${produto.productName} ${produto.ean??''}`).includes(termo))
    .filter(({produto})=>filtroFornecedorId==='todos'||(filtroFornecedorModo==='com'?produto.offers.some(o=>o.responseId===filtroFornecedorId):!produto.offers.some(o=>o.responseId===filtroFornecedorId)))
    .filter(({produto})=>!somenteSemOferta||produto.offers.length===0)
    .filter(({economia})=>!somenteComEconomia||economia>0)
    .filter(({menor})=>min===null||Number.isNaN(min)||(menor!==null&&menor>=min))
    .filter(({menor})=>max===null||Number.isNaN(max)||(menor!==null&&menor<=max))
    .sort((a,b)=>{
      if(ordemColuna){
        const precoA=a.produto.offers.find(o=>o.responseId===ordemColuna.responseId)?.unitPrice
        const precoB=b.produto.offers.find(o=>o.responseId===ordemColuna.responseId)?.unitPrice
        if(precoA===undefined&&precoB===undefined)return 0
        if(precoA===undefined)return 1
        if(precoB===undefined)return -1
        return ordemColuna.direcao==='asc'?precoA-precoB:precoB-precoA
      }
      return ordem==='maior'?(b.maior??-1)-(a.maior??-1):ordem==='economia'?b.economia-a.economia:(a.menor??Number.MAX_SAFE_INTEGER)-(b.menor??Number.MAX_SAFE_INTEGER)
    })

  const contagemFiltrosAtivos=[filtroFornecedorId!=='todos',somenteSemOferta,somenteComEconomia,min!==null,max!==null].filter(Boolean).length
  const filtrosAtivos=contagemFiltrosAtivos>0
  function limparFiltros(){setFiltroFornecedorId('todos');setSomenteSemOferta(false);setSomenteComEconomia(false);setPrecoMinimo('');setPrecoMaximo('')}
  function alternarCartao(quotationItemId:number){
    setCartoesAbertos(atual=>{const copia=new Set(atual);if(copia.has(quotationItemId))copia.delete(quotationItemId);else copia.add(quotationItemId);return copia})
  }
  const todosCartoesAbertos=detalhes.length>0&&detalhes.every(({produto})=>cartoesAbertos.has(produto.quotationItemId))
  function alternarTodosCartoes(){setCartoesAbertos(todosCartoesAbertos?new Set():new Set(detalhes.map(({produto})=>produto.quotationItemId)))}
  function definirOrdenacaoOfertas(valor:OrdenacaoOfertasCartao){setPreferenciasColunas(atual=>({...atual,ordenacaoOfertas:valor}))}
  /* Arrastar um fornecedor dentro de um cartão muda a ordem de todos eles (a mesma das colunas
     no desktop) — e só dá para ver o efeito com os cartões na ordem escolhida, não por preço. */
  function reordenarFornecedorNoCartao(origemId:number,destinoId:number){
    moverColunaPara(origemId,destinoId)
    setPreferenciasColunas(atual=>atual.ordenacaoOfertas==='fornecedor'?atual:{...atual,ordenacaoOfertas:'fornecedor'})
  }
  function moverFornecedorNoCartao(responseId:number,direcao:-1|1){
    moverColuna(responseId,direcao)
    setPreferenciasColunas(atual=>atual.ordenacaoOfertas==='fornecedor'?atual:{...atual,ordenacaoOfertas:'fornecedor'})
  }

  return <section className="card comparison-card"><div className="card-header"><div><h2>Comparativo de preços</h2><p>{layoutCartoes?'Cada produto vira um cartão com o melhor preço em destaque. Abra "ver ofertas" para o ranking completo de fornecedores, do mais barato ao mais caro, e arraste um fornecedor para mudar a ordem.':'Veja a faixa de preço e a economia potencial de cada produto. Segure e arraste o cabeçalho de um fornecedor para reordenar as colunas, clique no nome para ordenar por ele, e use os olhinhos para ocultar quem não interessa agora.'}</p></div></div>{comparacao.supplierTotals.length===0?<EstadoVazio title="Aguardando propostas" description="O comparativo será preenchido após o primeiro envio."/>:<>
    <div className="comparison-controls">
      <div className="comparison-search"><Search/><input type="search" placeholder="Buscar produto ou EAN" value={busca} onChange={event=>setBusca(event.target.value)}/>{busca&&<button type="button" onClick={()=>setBusca('')} aria-label="Limpar busca">×</button>}</div>
      <label>Ordenar por<select value={ordemColuna?'coluna':ordem} onChange={event=>{setOrdemColuna(null);setOrdem(event.target.value as typeof ordem)}}><option value="menor">Menor preço</option><option value="maior">Maior preço</option><option value="economia">Maior economia</option>{ordemColuna&&<option value="coluna">Coluna: {comparacao.supplierTotals.find(s=>s.responseId===ordemColuna.responseId)?.supplierName}</option>}</select></label>
      <button type="button" className={`comparison-filters-trigger ${filtrosAtivos?'active':''}`} onClick={()=>setFiltrosAbertos(true)}><SlidersHorizontal size={15}/>Filtros{contagemFiltrosAtivos>0&&<span className="comparison-filters-badge">{contagemFiltrosAtivos}</span>}</button>
      <span>{detalhes.length} de {comparacao.products.length} produtos</span>
    </div>
    <div className="comparison-column-toggles"><SlidersHorizontal/><span>Fornecedores no comparativo:</span>{fornecedoresOrdenados.map(s=>{const oculto=preferenciasColunas.ocultos.includes(s.responseId);return <button type="button" key={s.responseId} className={oculto?'hidden':''} title={oculto?`Mostrar ${s.supplierName} no comparativo`:`Ocultar ${s.supplierName} do comparativo`} onClick={()=>alternarVisibilidadeColuna(s.responseId)}>{oculto?<EyeOff/>:<Eye/>}{s.supplierName}</button>})}<span className="comparison-column-toggles-divider"/>{layoutCartoes?<><span>Ofertas por:</span><div className="comparison-offer-order" role="group" aria-label="Ordem das ofertas dentro dos cartões"><button type="button" className={preferenciasColunas.ordenacaoOfertas==='preco'?'active':''} onClick={()=>definirOrdenacaoOfertas('preco')}>Menor preço</button><button type="button" className={preferenciasColunas.ordenacaoOfertas==='fornecedor'?'active':''} onClick={()=>definirOrdenacaoOfertas('fornecedor')}>Minha ordem</button></div><button type="button" title="Abre ou fecha o ranking de ofertas de todos os produtos de uma vez." onClick={alternarTodosCartoes}>{todosCartoesAbertos?<ChevronUp size={14}/>:<ChevronDown size={14}/>}{todosCartoesAbertos?'Recolher ofertas':'Abrir todas as ofertas'}</button></>:<><button type="button" title="Deixa as colunas dos fornecedores bem finas, pra caber mais na tela sem precisar rolar." onClick={compactarColunas}><FoldHorizontal size={14}/>Compactar colunas</button>{larguraPersonalizada&&<button type="button" title="Volta todas as colunas de fornecedor para a largura padrão." onClick={redefinirLargurasColunas}><RotateCcw size={14}/>Largura padrão</button>}</>}</div>
    {detalhes.length===0?<EstadoVazio title="Nenhum produto encontrado" description="Tente buscar por outro nome ou EAN, ou ajuste os filtros ativos."/>:layoutCartoes?<div className="comparison-cards">{detalhes.map(({produto:p},indice)=><CartaoComparativo key={p.quotationItemId} produto={p} fornecedoresVisiveis={fornecedoresVisiveis} ordenacaoOfertas={preferenciasColunas.ordenacaoOfertas} aberto={cartoesAbertos.has(p.quotationItemId)} comDica={indice===0} aoAlternar={()=>alternarCartao(p.quotationItemId)} aoReordenar={reordenarFornecedorNoCartao} aoMover={moverFornecedorNoCartao}/>)}</div>:<div className="table-wrap"><table className="comparison-table"><thead><tr>
      <th className="comparison-col-produto" style={{width:larguraProduto,minWidth:larguraProduto,maxWidth:larguraProduto}}>Produto</th>
      <th className="comparison-col-qtd" style={{width:larguraQtd,minWidth:larguraQtd,maxWidth:larguraQtd,left:larguraProduto}}>Qtd.
        <span className="comparison-resize-handle" role="separator" aria-orientation="vertical" aria-label="Redimensionar colunas de Produto e Qtd." title="Arraste para afinar ou alargar as colunas de Produto e Qtd. juntas" onPointerDown={event=>iniciarRedimensionamentoGrupo(event,'produtoQtd')}/>
      </th>
      {fornecedoresVisiveis.map((s,indice)=>{const ordenandoPorEsta=ordemColuna?.responseId===s.responseId;const arrastando=colunaArrastada===s.responseId;const largura=larguraColuna(s.responseId);const deslocamento=deslocamentoDaColuna(s.responseId,indice);return <th key={s.responseId} data-coluna-fornecedor={s.responseId} className={`comparison-th-fornecedor ${arrastando?'dragging':''}`} style={{width:largura,minWidth:largura,maxWidth:largura,transform:deslocamento?`translateX(${deslocamento}px)`:undefined}} onPointerDown={evento=>pressionarColuna(evento,s.responseId)} onClickCapture={evento=>{if(arrastouColuna.current){arrastouColuna.current=false;evento.preventDefault();evento.stopPropagation()}}}>
        <div className="comparison-th-controls">
          <span className="comparison-drag-handle" aria-hidden="true" onPointerDown={event=>agarrarColuna(event,s.responseId)}><GripVertical size={14}/></span>
          <button type="button" className="comparison-move-button" disabled={indice===0} aria-label={`Mover ${s.supplierName} para a esquerda`} onClick={()=>moverColuna(s.responseId,-1)}><ChevronLeft size={13}/></button>
          <button type="button" className="comparison-move-button" disabled={indice===fornecedoresVisiveis.length-1} aria-label={`Mover ${s.supplierName} para a direita`} onClick={()=>moverColuna(s.responseId,1)}><ChevronRight size={13}/></button>
          <button type="button" className="comparison-sort-button" title={`Ordenar a tabela pelo preço de ${s.supplierName}`} onClick={()=>alternarOrdemColuna(s.responseId)}><span className="comparison-sort-label">{s.supplierName}</span>{ordenandoPorEsta&&(ordemColuna?.direcao==='asc'?<ArrowUp size={12}/>:<ArrowDown size={12}/>)}</button>
          <button type="button" className="comparison-hide-button" title={`Ocultar ${s.supplierName} do comparativo`} onClick={()=>alternarVisibilidadeColuna(s.responseId)}><EyeOff size={13}/></button>
        </div>
        <span className="comparison-resize-handle" role="separator" aria-orientation="vertical" aria-label={`Redimensionar coluna de ${s.supplierName}`} title="Arraste para afinar ou alargar esta coluna" onPointerDown={event=>iniciarRedimensionamento(event,s.responseId)}/>
      </th>})}
      <th className={`comparison-col-faixa`} style={{width:larguraFaixa,minWidth:larguraFaixa,maxWidth:larguraFaixa,right:larguraEconomia+larguraMelhor}}>
        <span className="comparison-resize-handle comparison-resize-handle-esquerda" role="separator" aria-orientation="vertical" aria-label="Redimensionar colunas de Faixa de preço, Economia e Melhor" title="Arraste para afinar ou alargar as colunas de resumo juntas" onPointerDown={event=>iniciarRedimensionamentoGrupo(event,'resumo')}/>
        Faixa de preço
      </th>
      <th className={`comparison-col-economia`} style={{width:larguraEconomia,minWidth:larguraEconomia,maxWidth:larguraEconomia,right:larguraMelhor}}>Economia</th>
      <th className={`comparison-col-melhor`} style={{width:larguraMelhor,minWidth:larguraMelhor,maxWidth:larguraMelhor,right:0}}>Melhor</th>
    </tr></thead><tbody>{detalhes.map(({produto:p,menor,maior,economia})=><tr key={p.quotationItemId} data-destaque={p.quotationItemId} className={destacado===p.quotationItemId?'linha-destacada':''}><td className="comparison-col-produto" style={{width:larguraProduto,minWidth:larguraProduto,maxWidth:larguraProduto}}><strong>{p.productName}</strong><small>{p.ean?`EAN ${p.ean}`:'Sem EAN'}</small></td><td className="comparison-col-qtd" style={{width:larguraQtd,minWidth:larguraQtd,maxWidth:larguraQtd,left:larguraProduto}}>{p.requestedQuantity}</td>{fornecedoresVisiveis.map((s,indice)=>{const o=p.offers.find(x=>x.responseId===s.responseId);const largura=larguraColuna(s.responseId);const deslocamento=deslocamentoDaColuna(s.responseId,indice);return <td key={s.responseId} className={`comparison-cell-fornecedor ${o?.bestPrice?'best-cell':''} ${colunaArrastada===s.responseId?'dragging':''}`} style={{width:largura,minWidth:largura,maxWidth:largura,transform:deslocamento?`translateX(${deslocamento}px)`:undefined}}>{o?<><strong>{money(o.unitPrice)}</strong><small>{o.availableQuantity} un.</small></>:<>—</>}</td>})}<td className={`comparison-col-faixa`} style={{width:larguraFaixa,minWidth:larguraFaixa,maxWidth:larguraFaixa,right:larguraEconomia+larguraMelhor}}>{menor===null?'—':<div className="comparison-metric"><strong>{money(menor)}</strong><small>até {money(maior!)}</small></div>}</td><td className={`comparison-col-economia`} style={{width:larguraEconomia,minWidth:larguraEconomia,maxWidth:larguraEconomia,right:larguraMelhor}}>{economia>0?<div className="comparison-metric savings"><strong>{money(economia)}</strong><small>vs. 2ª oferta</small></div>:'—'}</td><td className={`comparison-col-melhor`} style={{width:larguraMelhor,minWidth:larguraMelhor,maxWidth:larguraMelhor,right:0}}>{p.winningSupplier??'Sem oferta'}</td></tr>)}</tbody></table></div>}
  </>}{filtrosAbertos&&<ModalFiltrosComparativo fornecedores={comparacao.supplierTotals} filtroFornecedorId={filtroFornecedorId} setFiltroFornecedorId={setFiltroFornecedorId} filtroFornecedorModo={filtroFornecedorModo} setFiltroFornecedorModo={setFiltroFornecedorModo} fornecedorFiltro={fornecedorFiltro} somenteSemOferta={somenteSemOferta} setSomenteSemOferta={setSomenteSemOferta} somenteComEconomia={somenteComEconomia} setSomenteComEconomia={setSomenteComEconomia} precoMinimo={precoMinimo} setPrecoMinimo={setPrecoMinimo} precoMaximo={precoMaximo} setPrecoMaximo={setPrecoMaximo} contagemFiltrosAtivos={contagemFiltrosAtivos} aoLimpar={limparFiltros} aoFechar={()=>setFiltrosAbertos(false)}/>}</section>
}

/*
 * Em tela estreita a tabela do comparativo não cabe: os dois grupos de colunas fixas
 * (Produto/Qtd. à esquerda e o resumo à direita) comem quase toda a largura e sobra uma fresta
 * para rolar os fornecedores. Até LARGURA_MAXIMA_CARTOES cada produto vira um cartão com o
 * melhor preço em destaque e o ranking completo de ofertas sob demanda, sem rolagem horizontal.
 */
const percentualComparativo=(valor:number)=>`${valor.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})}%`
function CartaoComparativo({produto,fornecedoresVisiveis,ordenacaoOfertas,aberto,comDica,aoAlternar,aoReordenar,aoMover}:{produto:ComparacaoProduto;fornecedoresVisiveis:ComparacaoCotacao['supplierTotals'];ordenacaoOfertas:OrdenacaoOfertasCartao;aberto:boolean;comDica:boolean;aoAlternar:()=>void;aoReordenar:(origemId:number,destinoId:number)=>void;aoMover:(responseId:number,direcao:-1|1)=>void}){
  const[arrastando,setArrastando]=useState<number|null>(null)
  const[sobreposto,setSobreposto]=useState<number|null>(null)
  const[deslocamentoArraste,setDeslocamentoArraste]=useState(0)
  const[alturaArraste,setAlturaArraste]=useState(0)
  const temporizadorPressao=useRef<number|null>(null)
  const geometriaLinhas=useRef<{responseId:number;centro:number}[]>([])
  useEffect(()=>()=>{if(temporizadorPressao.current!==null)window.clearTimeout(temporizadorPressao.current)},[])

  const visiveis=new Set(fornecedoresVisiveis.map(s=>s.responseId))
  const porPreco=produto.offers.filter(o=>visiveis.has(o.responseId)).sort((a,b)=>a.unitPrice-b.unitPrice)
  const posicaoPorPreco=new Map(porPreco.map((oferta,indice)=>[oferta.responseId,indice+1]))
  const ofertas=ordenacaoOfertas==='fornecedor'
    ?fornecedoresVisiveis.map(s=>porPreco.find(o=>o.responseId===s.responseId)).filter((o):o is typeof porPreco[number]=>Boolean(o))
    :porPreco
  const melhor=porPreco.length?porPreco[0]:null
  const segunda=porPreco.length>1?porPreco[1]:null
  const maior=porPreco.length?porPreco[porPreco.length-1].unitPrice:null
  const quantidadeComparavel=segunda?Math.min(produto.coveredQuantity,segunda.availableQuantity):0
  const economia=melhor&&segunda?Math.max(0,(segunda.unitPrice-melhor.unitPrice)*quantidadeComparavel):0
  const semOferta=fornecedoresVisiveis.filter(s=>!produto.offers.some(o=>o.responseId===s.responseId))
  const faltando=melhor?Math.max(0,produto.requestedQuantity-melhor.availableQuantity):0
  const idOfertas=`ofertas-produto-${produto.quotationItemId}`

  /*
   * O alvo sai da geometria das linhas medida no início do arraste, não de elementFromPoint:
   * como as vizinhas deslizam para abrir espaço, o ponto sob o dedo fica vazio no meio do
   * gesto e o fornecedor seria solto no nada.
   */
  function medirLinhas(elemento:HTMLElement){
    const lista=elemento.closest('.comparison-product-card-offers')
    geometriaLinhas.current=lista?[...lista.querySelectorAll<HTMLElement>('[data-oferta-fornecedor]')].map(linha=>{
      const caixa=linha.getBoundingClientRect()
      return{responseId:Number(linha.dataset.ofertaFornecedor),centro:caixa.top+caixa.height/2}
    }):[]
  }
  function ofertaMaisProxima(y:number):number|null{
    let alvo:number|null=null
    let menorDistancia=Number.POSITIVE_INFINITY
    for(const linha of geometriaLinhas.current){
      const distancia=Math.abs(linha.centro-y)
      if(distancia<menorDistancia){menorDistancia=distancia;alvo=linha.responseId}
    }
    return alvo
  }
  /*
   * O arraste começa depois de segurar o dedo parado (ou direto pela alça): enquanto ele está
   * ativo, o touchmove é bloqueado em listener não passivo, senão o navegador rola a página em
   * vez de mover o fornecedor.
   */
  function iniciarArrasteOferta(responseId:number,yInicial:number,elemento:HTMLElement){
    medirLinhas(elemento)
    setArrastando(responseId);setSobreposto(responseId);setDeslocamentoArraste(0);setAlturaArraste(elemento.offsetHeight)
    if(typeof navigator.vibrate==='function')navigator.vibrate(12)
    /* A linha arrastada segue o dedo na vertical; ela fica sem pointer-events pelo CSS, senão
       o elementFromPoint devolveria sempre ela mesma em vez da linha que está por baixo. */
    function mover(evento:PointerEvent){
      setDeslocamentoArraste(evento.clientY-yInicial)
      setSobreposto(ofertaMaisProxima(evento.clientY))
    }
    function bloquearRolagem(evento:TouchEvent){evento.preventDefault()}
    function soltar(evento:PointerEvent){
      const destino=ofertaMaisProxima(evento.clientY)
      if(destino!==null&&destino!==responseId)aoReordenar(responseId,destino)
      setArrastando(null);setSobreposto(null);setDeslocamentoArraste(0)
      window.removeEventListener('pointermove',mover);window.removeEventListener('pointerup',soltar);window.removeEventListener('pointercancel',soltar)
      window.removeEventListener('touchmove',bloquearRolagem)
    }
    window.addEventListener('pointermove',mover);window.addEventListener('pointerup',soltar);window.addEventListener('pointercancel',soltar)
    window.addEventListener('touchmove',bloquearRolagem,{passive:false})
  }
  function pressionarOferta(evento:EventoPonteiroReact<HTMLLIElement>,responseId:number){
    if(evento.pointerType==='mouse'&&evento.button!==0)return
    const xInicial=evento.clientX,yInicial=evento.clientY
    const elemento=evento.currentTarget
    function desistir(){
      if(temporizadorPressao.current!==null){window.clearTimeout(temporizadorPressao.current);temporizadorPressao.current=null}
      window.removeEventListener('pointermove',vigiar);window.removeEventListener('pointerup',desistir);window.removeEventListener('pointercancel',desistir)
    }
    /* Se o dedo saiu do lugar antes de completar a pressão, é rolagem da lista — não arraste. */
    function vigiar(movimento:PointerEvent){if(Math.abs(movimento.clientX-xInicial)>8||Math.abs(movimento.clientY-yInicial)>8)desistir()}
    window.addEventListener('pointermove',vigiar);window.addEventListener('pointerup',desistir);window.addEventListener('pointercancel',desistir)
    temporizadorPressao.current=window.setTimeout(()=>{desistir();iniciarArrasteOferta(responseId,yInicial,elemento)},400)
  }
  function agarrarOferta(evento:EventoPonteiroReact<HTMLButtonElement>,responseId:number){
    if(evento.pointerType==='mouse'&&evento.button!==0)return
    evento.preventDefault();evento.stopPropagation()
    const linha=evento.currentTarget.closest('li')
    if(linha)iniciarArrasteOferta(responseId,evento.clientY,linha)
  }
  /* Enquanto uma linha é arrastada, as que ficam entre a origem e o destino andam uma posição
     para abrir o espaço — é isso que dá a sensação de encaixe ao soltar. */
  function espacoAberto(indice:number):number{
    if(arrastando===null||sobreposto===null||alturaArraste===0)return 0
    const origem=ofertas.findIndex(o=>o.responseId===arrastando)
    const destino=ofertas.findIndex(o=>o.responseId===sobreposto)
    if(origem<0||destino<0||origem===destino)return 0
    if(origem<destino&&indice>origem&&indice<=destino)return -alturaArraste
    if(origem>destino&&indice>=destino&&indice<origem)return alturaArraste
    return 0
  }
  function teclarNaAlca(evento:{key:string;preventDefault:()=>void},responseId:number){
    if(evento.key!=='ArrowUp'&&evento.key!=='ArrowDown')return
    evento.preventDefault()
    aoMover(responseId,evento.key==='ArrowUp'?-1:1)
  }

  return <article className={`comparison-product-card ${aberto?'expanded':''}`}>
    <header className="comparison-product-card-head">
      <div><strong>{produto.productName}</strong><small>{produto.ean?`EAN ${produto.ean}`:'Sem EAN'}</small></div>
      <span className="comparison-product-card-qty">{produto.requestedQuantity} un.</span>
    </header>
    {melhor?<>
      <div className="comparison-product-card-best">
        <span className="comparison-product-card-best-label"><Trophy size={13}/>Melhor preço</span>
        <strong>{money(melhor.unitPrice)}</strong>
        <span className="comparison-product-card-best-supplier">{melhor.supplierName}</span>
        <small>{melhor.availableQuantity} un. disponíveis{faltando>0?` · faltam ${faltando} un.`:''}</small>
      </div>
      <dl className="comparison-product-card-metrics">
        <div><dt>Faixa de preço</dt><dd>{maior!==null&&maior>melhor.unitPrice?`${money(melhor.unitPrice)} – ${money(maior)}`:money(melhor.unitPrice)}</dd></div>
        <div><dt>Economia</dt><dd className={economia>0?'savings':''}>{economia>0?money(economia):'—'}</dd></div>
        <div><dt>Ofertas</dt><dd>{ofertas.length} de {fornecedoresVisiveis.length}</dd></div>
      </dl>
      <button type="button" className="comparison-product-card-toggle" aria-expanded={aberto} aria-controls={idOfertas} onClick={aoAlternar}>{aberto?'Ocultar ofertas':`Ver ${ofertas.length===1?'a oferta':`as ${ofertas.length} ofertas`}`}{aberto?<ChevronUp size={15}/>:<ChevronDown size={15}/>}</button>
      {aberto&&<>
        <ol className="comparison-product-card-offers" id={idOfertas}>
          {ofertas.map((oferta,indice)=>{
            const diferenca=oferta.unitPrice-melhor.unitPrice
            const posicao=posicaoPorPreco.get(oferta.responseId)??1
            const sendoArrastada=arrastando===oferta.responseId
            const deslocamento=sendoArrastada?deslocamentoArraste:espacoAberto(indice)
            return <li key={oferta.responseId} data-oferta-fornecedor={oferta.responseId} className={`${posicao===1?'best':''} ${sendoArrastada?'dragging':''}`} style={deslocamento?{transform:`translateY(${deslocamento}px)`}:undefined} onPointerDown={evento=>pressionarOferta(evento,oferta.responseId)}>
              <button type="button" className="comparison-offer-grip" aria-label={`Mover ${oferta.supplierName} na ordem dos fornecedores`} onPointerDown={evento=>agarrarOferta(evento,oferta.responseId)} onKeyDown={evento=>teclarNaAlca(evento,oferta.responseId)}><GripVertical size={14}/></button>
              <span className="comparison-offer-rank" title="Posição por preço">{posicao}º</span>
              <div className="comparison-offer-supplier"><strong>{oferta.supplierName}</strong><small>{oferta.availableQuantity} un. disponíveis</small></div>
              <div className="comparison-offer-price"><strong>{money(oferta.unitPrice)}</strong>{posicao===1?<small>menor preço</small>:<small>+{money(diferenca)} · +{percentualComparativo(diferenca/melhor.unitPrice*100)}</small>}</div>
            </li>
          })}
          {semOferta.length>0&&<li className="comparison-offer-missing"><AlertTriangle size={13}/>Sem oferta: {semOferta.map(s=>s.supplierName).join(', ')}</li>}
        </ol>
        {comDica&&ofertas.length>1&&<p className="comparison-offer-hint"><GripVertical size={12}/>Segure um fornecedor e arraste para cima ou para baixo para mudar a ordem.</p>}
      </>}
    </>:<p className="comparison-product-card-empty"><AlertTriangle size={14}/>Nenhum fornecedor ofertou este produto.</p>}
  </article>
}

function ModalFiltrosComparativo({fornecedores,filtroFornecedorId,setFiltroFornecedorId,filtroFornecedorModo,setFiltroFornecedorModo,fornecedorFiltro,somenteSemOferta,setSomenteSemOferta,somenteComEconomia,setSomenteComEconomia,precoMinimo,setPrecoMinimo,precoMaximo,setPrecoMaximo,contagemFiltrosAtivos,aoLimpar,aoFechar}:{
  fornecedores:ComparacaoCotacao['supplierTotals'];filtroFornecedorId:number|'todos';setFiltroFornecedorId:(v:number|'todos')=>void
  filtroFornecedorModo:'com'|'sem';setFiltroFornecedorModo:(v:'com'|'sem')=>void;fornecedorFiltro:ComparacaoCotacao['supplierTotals'][number]|null
  somenteSemOferta:boolean;setSomenteSemOferta:(v:boolean)=>void;somenteComEconomia:boolean;setSomenteComEconomia:(v:boolean)=>void
  precoMinimo:string;setPrecoMinimo:(v:string)=>void;precoMaximo:string;setPrecoMaximo:(v:string)=>void
  contagemFiltrosAtivos:number;aoLimpar:()=>void;aoFechar:()=>void
}){
  return <div className="modal-backdrop"><section className="modal comparison-filters-modal" role="dialog" aria-modal="true" aria-labelledby="titulo-filtros-comparativo">
    <div className="modal-header modal-header-simple"><div><h2 id="titulo-filtros-comparativo">Filtros do comparativo</h2><p>Combine os filtros abaixo com a busca para refinar os produtos exibidos na tabela.</p></div><button type="button" className="icon-button" aria-label="Fechar" onClick={aoFechar}><X/></button></div>
    <div className="comparison-filters-modal-body">
      <label>Fornecedor<select value={filtroFornecedorId} onChange={event=>setFiltroFornecedorId(event.target.value==='todos'?'todos':Number(event.target.value))}><option value="todos">Todos</option>{fornecedores.map(s=><option key={s.responseId} value={s.responseId}>{s.supplierName}</option>)}</select></label>
      {fornecedorFiltro&&<div className="comparison-toggle-pair" role="group" aria-label={`Filtrar oferta de ${fornecedorFiltro.supplierName}`}><button type="button" className={filtroFornecedorModo==='com'?'active':''} onClick={()=>setFiltroFornecedorModo('com')}>Com oferta de {fornecedorFiltro.supplierName}</button><button type="button" className={filtroFornecedorModo==='sem'?'active':''} onClick={()=>setFiltroFornecedorModo('sem')}>Sem oferta de {fornecedorFiltro.supplierName}</button></div>}
      <label className="comparison-checkbox-filter" title="Mostra só os produtos sem nenhuma oferta de nenhum fornecedor."><input type="checkbox" checked={somenteSemOferta} onChange={event=>setSomenteSemOferta(event.target.checked)}/> Sem nenhuma oferta</label>
      <label className="comparison-checkbox-filter" title="Mostra só os produtos em que dá pra economizar escolhendo a melhor oferta em vez da segunda melhor."><input type="checkbox" checked={somenteComEconomia} onChange={event=>setSomenteComEconomia(event.target.checked)}/> Só com economia</label>
      <div className="comparison-filters-price"><span>Faixa de preço (menor oferta encontrada)</span><div className="comparison-price-range"><input type="text" inputMode="decimal" placeholder="Preço mín." value={precoMinimo} onChange={event=>setPrecoMinimo(event.target.value)}/><span>–</span><input type="text" inputMode="decimal" placeholder="Preço máx." value={precoMaximo} onChange={event=>setPrecoMaximo(event.target.value)}/></div></div>
    </div>
    <div className="modal-actions"><button type="button" className="button button-ghost" disabled={contagemFiltrosAtivos===0} onClick={aoLimpar}>Limpar filtros</button><button type="button" className="button button-primary" onClick={aoFechar}>Aplicar filtros</button></div>
  </section></div>
}

type FiltroCompra='distribuidoras'|'abaixo-minimo'|'sem-cobertura'
type CampoOrdenacaoCompra='supplierName'|'productCount'|'totalQuantity'|'total'|'minimumOrderValue'|'minimumOrderStatus'
type OrdenacaoCompra={campo:CampoOrdenacaoCompra;direcao:'asc'|'desc'}

function CompraSugerida({comparacao,pedidos,expandidas,podeEditar,podeExportar,ocupado,podeDesfazer,descricaoUltimaAlteracao,aoAlternar,aoTrocar,aoEditarPlano,aoEditarProduto,aoGerar,aoBaixar,aoBaixarRelatorio,aoCompartilhar,aoVerMinimo,aoReincluir,aoHistorico,aoDesfazer}:{comparacao:ComparacaoCotacao;pedidos:PedidoCompra[];expandidas:Set<string>;podeEditar:boolean;podeExportar:boolean;ocupado:boolean;podeDesfazer:boolean;descricaoUltimaAlteracao?:string;aoAlternar:(c:string)=>void;aoTrocar:(p:ComparacaoProduto)=>void;aoEditarPlano:()=>void;aoEditarProduto:(p:ComparacaoProduto)=>void;aoGerar:(id:number)=>void;aoBaixar:(p:PedidoCompra,f:FormatoPedido)=>void;aoBaixarRelatorio:(f:'pdf'|'excel',tipo?:TipoRelatorioPdf)=>void;aoCompartilhar:(p:PedidoCompra,f:FormatoPedido)=>void;aoVerMinimo:(id:number)=>void;aoReincluir:(id:number)=>void;aoHistorico:()=>void;aoDesfazer:()=>void}){
  const excluidas=comparacao.supplierTotals.filter(item=>!item.includedInSuggestedPurchase)
  const abaixo=comparacao.suggestedPurchase.filter(item=>item.minimumOrderStatus==='ABAIXO_DO_MINIMO').length
  const semCobertura=useMemo(()=>comparacao.products.filter(produto=>produto.offers.length===0||produto.missingQuantity>0),[comparacao.products])
  const semOferta=semCobertura.filter(produto=>produto.offers.length===0).length
  const coberturaParcial=semCobertura.length-semOferta
  const totalPendencias=abaixo+semCobertura.length
  const[filtro,setFiltro]=useState<FiltroCompra>('distribuidoras')
  const[ordenacao,setOrdenacao]=useState<OrdenacaoCompra>({campo:'minimumOrderStatus',direcao:'asc'})
  const[menuRelatorioAberto,setMenuRelatorioAberto]=useState(false)
  const[formatoRelatorioSelecionado,setFormatoRelatorioSelecionado]=useState<'pdf'|'excel'|null>(null)
  const menuRelatorioRef=useRef<HTMLDivElement>(null)
  const distribuidores=useMemo(()=>{
    const lista=filtro==='abaixo-minimo'?comparacao.suggestedPurchase.filter(item=>item.minimumOrderStatus==='ABAIXO_DO_MINIMO'):comparacao.suggestedPurchase
    const valor=(item:ComparacaoCotacao['suggestedPurchase'][number])=>{
      if(ordenacao.campo==='minimumOrderStatus')return item.minimumOrderStatus==='ABAIXO_DO_MINIMO'?0:item.minimumOrderStatus==='ATENDIDO'?1:2
      if(ordenacao.campo==='minimumOrderValue')return item.minimumOrderValue??Number.POSITIVE_INFINITY
      return item[ordenacao.campo]
    }
    return [...lista].sort((a,b)=>{
      const campoPodeSerVazio=ordenacao.campo==='minimumOrderValue'
      const vazioA=campoPodeSerVazio&&a.minimumOrderValue==null,vazioB=campoPodeSerVazio&&b.minimumOrderValue==null
      if(vazioA!==vazioB)return vazioA?1:-1
      const valorA=valor(a),valorB=valor(b)
      const comparado=typeof valorA==='string'&&typeof valorB==='string'?valorA.localeCompare(valorB,'pt-BR',{sensitivity:'base'}):Number(valorA)-Number(valorB)
      if(comparado!==0)return ordenacao.direcao==='asc'?comparado:-comparado
      return a.supplierName.localeCompare(b.supplierName,'pt-BR',{sensitivity:'base'})
    })
  },[comparacao.suggestedPurchase,filtro,ordenacao])
  const ordenar=(campo:CampoOrdenacaoCompra)=>setOrdenacao(atual=>atual.campo===campo?{campo,direcao:atual.direcao==='asc'?'desc':'asc'}:{campo,direcao:campo==='supplierName'||campo==='minimumOrderStatus'?'asc':'desc'})
  const cabecalhoOrdenavel=(campo:CampoOrdenacaoCompra,rotulo:string,alinhadoDireita=false)=><th className={alinhadoDireita?'numeric':''} aria-sort={ordenacao.campo===campo?(ordenacao.direcao==='asc'?'ascending':'descending'):'none'}><button type="button" className="purchase-sort-button" onClick={()=>ordenar(campo)}>{rotulo}{ordenacao.campo===campo?(ordenacao.direcao==='asc'?<ArrowUp/>:<ArrowDown/>):<ArrowDown className="sort-idle"/>}</button></th>
  const recolherFornecedor=(chave:string,botao:HTMLButtonElement)=>{
    const cabecalho=botao.closest<HTMLElement>('.supplier-purchase-card')?.querySelector<HTMLButtonElement>('.supplier-row-toggle')
    aoAlternar(chave)
    window.requestAnimationFrame(()=>{
      cabecalho?.focus({preventScroll:true})
      cabecalho?.scrollIntoView({behavior:'smooth',block:'start'})
    })
  }
  useEffect(()=>{
    if((filtro==='abaixo-minimo'&&abaixo===0)||(filtro==='sem-cobertura'&&semCobertura.length===0))setFiltro('distribuidoras')
  },[abaixo,filtro,semCobertura.length])
  useEffect(()=>{if(!menuRelatorioAberto)return;const fechar=()=>{setMenuRelatorioAberto(false);setFormatoRelatorioSelecionado(null)};const fecharAoClicarFora=(evento:MouseEvent)=>{if(!menuRelatorioRef.current?.contains(evento.target as Node))fechar()};const fecharComEscape=(evento:KeyboardEvent)=>{if(evento.key==='Escape')fechar()};document.addEventListener('mousedown',fecharAoClicarFora);document.addEventListener('keydown',fecharComEscape);return()=>{document.removeEventListener('mousedown',fecharAoClicarFora);document.removeEventListener('keydown',fecharComEscape)}},[menuRelatorioAberto])
  return <div className="purchase-layout"><section className="card"><div className="card-header purchase-card-header"><div><h2>Plano final de compra</h2><p>Confira a divisão e gere os pedidos.</p></div><div className="purchase-header-actions">{podeExportar&&pedidos.some(pedido=>pedido.checkedAt)&&<div className="receipt-report-download" ref={menuRelatorioRef}><button type="button" className="button button-ghost compact-action download-report-trigger" disabled={ocupado} aria-label="Baixar relatório de conferência" aria-expanded={menuRelatorioAberto} aria-haspopup="menu" title="Baixar relatório de conferência" onClick={()=>{setFormatoRelatorioSelecionado(null);setMenuRelatorioAberto(aberto=>!aberto)}}><Download/><span>Baixar relatório</span><ChevronDown/></button>{menuRelatorioAberto&&<div className="receipt-report-menu" role="menu">{formatoRelatorioSelecionado?<><strong className="receipt-report-menu-title">Qual relatório em {formatoRelatorioSelecionado==='pdf'?'PDF':'Excel'}?</strong><button type="button" role="menuitem" onClick={()=>{setMenuRelatorioAberto(false);setFormatoRelatorioSelecionado(null);aoBaixarRelatorio(formatoRelatorioSelecionado,'general')}}>{formatoRelatorioSelecionado==='pdf'?<FileText/>:<FileSpreadsheet/>}Relatório geral da cotação</button><button type="button" role="menuitem" onClick={()=>{setMenuRelatorioAberto(false);setFormatoRelatorioSelecionado(null);aoBaixarRelatorio(formatoRelatorioSelecionado,'divergences')}}><AlertTriangle/>Somente divergências</button></>:<><button type="button" role="menuitem" onClick={()=>setFormatoRelatorioSelecionado('pdf')}><FileText/>PDF</button><button type="button" role="menuitem" onClick={()=>setFormatoRelatorioSelecionado('excel')}><FileSpreadsheet/>Excel</button></>}</div>}</div>}{podeEditar&&podeDesfazer&&<button className="button button-ghost compact-action undo-plan-trigger" disabled={ocupado} aria-label="Desfazer última alteração do plano" title={descricaoUltimaAlteracao?`Desfazer: ${descricaoUltimaAlteracao}`:'Desfazer última alteração'} onClick={aoDesfazer}><RotateCcw/><span>Desfazer</span></button>}{podeEditar&&<><button className="button button-ghost compact-action history-plan-trigger" aria-label="Histórico do plano" title="Histórico do plano" onClick={aoHistorico}><History/><span>Histórico do plano</span></button><button className="button button-secondary compact-action review-plan-trigger" aria-label="Revisar todos os produtos" title="Revisar todos os produtos" onClick={aoEditarPlano}><Edit3/><span>Revisar todos os produtos</span></button></>}</div></div>
    <div className="purchase-filter-bar"><div className="purchase-filter-chips" role="group" aria-label="Filtrar plano de compra"><button type="button" className={filtro==='distribuidoras'?'active':''} aria-pressed={filtro==='distribuidoras'} onClick={()=>setFiltro('distribuidoras')}><ShoppingCart/>Distribuidoras <strong>{comparacao.suggestedPurchase.length}</strong></button>{abaixo>0&&<button type="button" className={`warning ${filtro==='abaixo-minimo'?'active':''}`} aria-pressed={filtro==='abaixo-minimo'} onClick={()=>setFiltro('abaixo-minimo')}><AlertTriangle/>Abaixo do mínimo <strong>{abaixo}</strong></button>}{semCobertura.length>0&&<button type="button" className={`danger ${filtro==='sem-cobertura'?'active':''}`} aria-pressed={filtro==='sem-cobertura'} onClick={()=>setFiltro('sem-cobertura')}><PackageCheck/>Sem cobertura <strong>{semCobertura.length}</strong></button>}</div>{totalPendencias>0?<details className="purchase-issues-summary"><summary><AlertTriangle/>{totalPendencias} {totalPendencias===1?'pendência':'pendências'} para revisar<ChevronDown/></summary><div className="purchase-issues-popover" aria-label="Resumo das pendências"><strong>Pendências do plano</strong>{abaixo>0&&<button type="button" className="warning" onClick={evento=>{setFiltro('abaixo-minimo');evento.currentTarget.closest('details')?.removeAttribute('open');window.requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>('.purchase-filter-chips button.warning')?.focus())}}><AlertTriangle/><span><b>{abaixo} {abaixo===1?'distribuidora abaixo':'distribuidoras abaixo'} do mínimo</b><small>Ver distribuidores</small></span><ChevronRight/></button>}{semOferta>0&&<button type="button" className="danger" onClick={evento=>{setFiltro('sem-cobertura');evento.currentTarget.closest('details')?.removeAttribute('open');window.requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>('.purchase-filter-chips button.danger')?.focus())}}><PackageCheck/><span><b>{semOferta} {semOferta===1?'produto sem oferta':'produtos sem oferta'}</b><small>Ver produtos</small></span><ChevronRight/></button>}{coberturaParcial>0&&<button type="button" className="partial" onClick={evento=>{setFiltro('sem-cobertura');evento.currentTarget.closest('details')?.removeAttribute('open');window.requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>('.purchase-filter-chips button.danger')?.focus())}}><PackageCheck/><span><b>{coberturaParcial} {coberturaParcial===1?'produto com cobertura parcial':'produtos com cobertura parcial'}</b><small>Ver produtos</small></span><ChevronRight/></button>}</div></details>:<span className="clear" role="status" aria-live="polite"><CheckCircle2/>Plano sem pendências</span>}</div>
    {comparacao.suggestedPurchase.length===0?<EstadoVazio title="Ainda não há uma compra sugerida" description="Receba ao menos uma proposta ou aumente uma quantidade final."/>:filtro==='sem-cobertura'?(semCobertura.length===0?<EstadoVazio title="Todos os produtos estão cobertos" description="Não há produto sem oferta ou com quantidade pendente."/>:<div className="table-wrap purchase-coverage-wrap"><table className="purchase-coverage-table"><caption className="sr-only">Produtos sem cobertura completa</caption><thead><tr><th>Produto</th><th className="numeric">Solicitado</th><th className="numeric">Coberto</th><th className="numeric">Falta</th><th>Status</th><th><span className="sr-only">Ações</span></th></tr></thead><tbody>{semCobertura.map(produto=><tr key={produto.quotationItemId}><td><strong>{produto.productName}</strong>{produto.ean&&<small>EAN {produto.ean}</small>}</td><td className="numeric">{produto.desiredQuantity??produto.requestedQuantity}</td><td className="numeric">{produto.coveredQuantity}</td><td className="numeric coverage-missing">{produto.missingQuantity}</td><td><span className={`purchase-status-badge ${produto.offers.length===0?'status-uncovered':'status-partial'}`}>{produto.offers.length===0?'Sem oferta':'Cobertura parcial'}</span></td><td className="coverage-action">{podeEditar&&<button type="button" className="button button-secondary" onClick={()=>aoEditarProduto(produto)}><Edit3/>Ajustar</button>}</td></tr>)}</tbody></table></div>):distribuidores.length===0?<EstadoVazio title="Nenhum pedido abaixo do mínimo" description="Todas as distribuidoras atendem ao mínimo informado."/>:<><div className="table-wrap purchase-supplier-wrap"><table className="purchase-supplier-table"><caption className="sr-only">Distribuidoras do plano final de compra</caption><thead><tr>{cabecalhoOrdenavel('supplierName','Distribuidora')}{cabecalhoOrdenavel('productCount','Produtos',true)}{cabecalhoOrdenavel('totalQuantity','Unidades',true)}{cabecalhoOrdenavel('total','Subtotal',true)}{cabecalhoOrdenavel('minimumOrderValue','Mínimo',true)}{cabecalhoOrdenavel('minimumOrderStatus','Status')}<th><span className="sr-only">Expandir</span></th></tr></thead>{distribuidores.map(d=>{const chave=String(d.responseId??d.supplierName),aberta=expandidas.has(chave),itens=d.items??[],pedido=pedidos.find(p=>p.responseId===d.responseId),abaixoMinimo=d.minimumOrderStatus==='ABAIXO_DO_MINIMO',diferenca=d.minimumOrderValue==null?null:d.total-d.minimumOrderValue,statusMinimo=abaixoMinimo?`Faltam ${money(d.minimumOrderShortfall)}`:d.minimumOrderStatus==='ATENDIDO'?(diferenca===0?'No mínimo':`+ ${money(diferenca!)}`):'Sem mínimo';return <tbody className={`supplier-purchase-card ${aberta?'expanded':''} ${abaixoMinimo?'below-minimum':''}`} key={chave}><tr className="purchase-supplier-row"><td><button type="button" className="supplier-row-toggle" aria-expanded={aberta} onClick={()=>aoAlternar(chave)}><span className="supplier-initial">{d.supplierName[0]}</span><span><strong>{d.supplierName}</strong>{pedido?.checkedAt?<small className="conferido" title={`Conferido em ${date(pedido.checkedAt)}`}><CheckCircle2/>Conferido</small>:pedido?.status==='DESATUALIZADO'?<small className="desatualizado" title="O plano mudou depois que este pedido foi gerado — gere novamente antes de conferir"><AlertTriangle/>Gerar novamente</small>:pedido&&['GERADO','COMPARTILHADO'].includes(pedido.status)?<small className="gerado" title={`Pedido ${pedido.number} gerado em ${date(pedido.generatedAt)}`}><FileText/>Pedido gerado</small>:null}</span></button></td><td className="numeric">{d.productCount}</td><td className="numeric">{d.totalQuantity}</td><td className="numeric purchase-cell-total">{money(d.total)}</td><td className="numeric">{d.minimumOrderValue==null?'—':money(d.minimumOrderValue)}</td><td><span className={`purchase-status-badge ${abaixoMinimo?'status-below':d.minimumOrderStatus==='ATENDIDO'?'status-met':'status-none'}`} title={abaixoMinimo?'Pedido abaixo do mínimo':d.minimumOrderStatus==='ATENDIDO'?'Saldo acima do mínimo informado':'A distribuidora não informou pedido mínimo'}>{statusMinimo}</span></td><td className="purchase-expand-cell"><button type="button" className="icon-button supplier-expand-button" aria-label={`${aberta?'Recolher':'Expandir'} ${d.supplierName}`} aria-expanded={aberta} onClick={()=>aoAlternar(chave)}>{aberta?<ChevronUp/>:<ChevronDown/>}</button></td></tr>
      {aberta&&<tr className="supplier-detail-row"><td colSpan={7}><div className="supplier-detail-content">{abaixoMinimo&&<div className="minimum-order-alert"><AlertTriangle/><div><strong>Pedido abaixo do mínimo</strong><span>Esta distribuidora pode rejeitar o pedido. Faltam {money(d.minimumOrderShortfall)}.</span></div>{podeEditar&&d.responseId&&<button className="button button-secondary" disabled={ocupado} onClick={()=>aoVerMinimo(d.responseId!)}>Ver alternativas</button>}</div>}<div className="table-wrap supplier-products-wrap"><table className="supplier-products-table"><caption className="sr-only">Produtos alocados para {d.supplierName}</caption><thead><tr><th>Produto</th><th className="numeric">Unidades</th><th className="numeric">Preço un.</th><th className="numeric">Posição</th><th className="numeric">Subtotal</th><th className="allocated-product-actions"><span className="sr-only">Ações</span></th></tr></thead><tbody>{itens.map(item=>{const produto=comparacao.products.find(p=>p.quotationItemId===item.quotationItemId),recebido=pedido?.items.find(linha=>linha.quotationItemId===item.quotationItemId);return <tr className="allocated-product-row" key={`${chave}-${item.quotationItemId}`}><td className="allocated-product-name"><div className="allocation-title"><strong>{item.productName}</strong>{item.champion?<span className={`allocation-badge ${item.manualSelection?'manual':''}`}><Trophy/>{item.manualSelection?'Escolhida por você':'Melhor oferta'}</span>:<span className="allocation-badge complement">Complemento automático</span>}</div>{pedido?.checkedAt&&recebido&&<small className={recebido.quantity!==recebido.receivedQuantity||recebido.unitPrice!==recebido.receivedUnitPrice?'receipt-line-different':'receipt-line-ok'}>Recebido: {recebido.receivedQuantity} un. × {recebido.receivedUnitPrice==null?'—':money(recebido.receivedUnitPrice)}{recebido.receiptNote?` · ${recebido.receiptNote}`:''}</small>}{item.stockOverrideNote&&<small className="stock-note">Estoque adicional confirmado internamente.</small>}</td><td className="numeric">{item.allocatedQuantity}</td><td className="numeric">{money(item.unitPrice)}</td><td className="numeric">{item.offerPosition}ª</td><td className="numeric purchase-cell-total">{pedido?.checkedAt&&recebido?money(recebido.receivedSubtotal):money(item.subtotal)}</td><td className="allocated-product-actions">{item.champion&&produto&&podeEditar&&<div className="line-actions"><button className="button button-secondary button-icon" disabled={ocupado} title="Trocar distribuidora" aria-label={`Trocar distribuidora de ${item.productName}`} onClick={()=>aoTrocar(produto)}><Trophy/></button><button className="button button-ghost button-icon" title="Ajustar compra" aria-label={`Ajustar compra de ${item.productName}`} onClick={()=>aoEditarProduto(produto)}><Edit3/></button></div>}</td></tr>})}</tbody></table></div><div className="supplier-detail-footer">{pedido?.checkedAt&&<div className="received-order-total"><CheckCircle2/>Conferido em {date(pedido.checkedAt)} · total recebido {money(pedido.receivedTotal)}</div>}{pedido?.belowMinimum&&<div className="generated-below-minimum"><AlertTriangle/>Pedido gerado abaixo do mínimo com confirmação do comprador.</div>}<div className="order-actions"><span className={`order-status status-${pedido?.status?.toLowerCase()??'novo'}`}>{pedido?.status??'PEDIDO NÃO GERADO'}</span>{podeEditar&&<button className="button button-secondary" disabled={ocupado} onClick={()=>d.responseId&&aoGerar(d.responseId)}><FileText/>{pedido?'Gerar novamente':'Gerar pedido'}</button>}{pedido?.pdfAvailable&&<><button className="button button-ghost" onClick={()=>aoBaixar(pedido,'pdf')}><Download/>PDF</button><button className="button button-ghost" onClick={()=>aoBaixar(pedido,'image')}><FileImage/>Imagem</button>{podeEditar&&<><button className="button button-primary" onClick={()=>aoCompartilhar(pedido,'pdf')}><Share2/>Compartilhar PDF</button><button className="button button-primary" onClick={()=>aoCompartilhar(pedido,'image')}><Share2/>Compartilhar imagem</button></>}</>}</div><div className="supplier-collapse-action"><button type="button" className="button button-ghost" onClick={evento=>recolherFornecedor(chave,evento.currentTarget)}><ChevronUp/>Recolher fornecedor</button></div></div></div></td></tr>}</tbody>})}</table></div><div className="composition-total"><span>Total do plano de compra</span><strong>{money(comparacao.bestCompositionTotal)}</strong></div></>}
    {excluidas.length>0&&<div className="excluded-suppliers"><strong>Distribuidoras repassadas</strong><p>Reincluir recalcula pelas ofertas atuais. Para recuperar exatamente o plano anterior, use Desfazer ou o Histórico.</p>{excluidas.map(item=><div key={item.responseId}><span>{item.supplierName}{item.minimumOrderValue!=null?` · mínimo ${money(item.minimumOrderValue)}`:''}</span>{podeEditar&&<button className="button button-ghost" disabled={ocupado} onClick={()=>aoReincluir(item.responseId)}>Reincluir</button>}</div>)}</div>}
    </section><aside className="purchase-summary"><div className="summary-highlight"><ShoppingCart/><span>Compra sugerida</span><strong>{money(comparacao.bestCompositionTotal)}</strong></div><div title="Diferença para a segunda melhor oferta, considerando somente quantidades comparáveis."><span>Economia estimada</span><strong>{money(comparacao.estimatedSavings)}</strong></div><div className={abaixo>0?'summary-warning':''}><span>Pedidos abaixo do mínimo</span><strong>{abaixo}</strong></div><div><span>Produtos sem cobertura</span><strong>{comparacao.productsWithoutOffer+comparacao.partiallyCoveredProducts}</strong></div></aside></div>
}

type ParcelaPrevista={supplierName:string;quantity:number;position:number;principal:boolean}
/* Recebido e encerrado chegam prontos do servidor. Antes eram deduzidos de
   desejada − pendente, o que dava o mesmo número mas amarrava a tela a uma fórmula interna:
   mudar o cálculo do pendente faria o selo mentir sem nenhum aviso. */
function jaComprometido(produto:ComparacaoProduto){
  const recebida=produto.receivedQuantity??0
  const encerrada=produto.closedQuantity??0
  const travado=recebida+encerrada
  if(travado<=0)return null
  const partes=[recebida>0&&`${recebida} un. já recebidas`,encerrada>0&&`${encerrada} un. encerradas sem recompra`].filter(Boolean)
  return {travado,recebida,encerrada,
    explicacao:`${partes.join(' e ')} em pedidos conferidos. A quantidade total não pode ficar abaixo de ${travado} un.`}
}

/* Marca discreta ao lado do nome: quem olha a lista precisa saber de cara quais produtos já
   têm entrega registrada, antes de tentar reduzir a quantidade e levar recusa. */
function SeloRecebido({produto}:{produto:ComparacaoProduto}){
  const info=jaComprometido(produto)
  if(!info)return null
  return <span className="selo-recebido" title={info.explicacao} aria-label={info.explicacao}>
    <PackageCheck/><b>{info.travado}</b>
  </span>
}

function preverDivisao(produto:ComparacaoProduto,edicao:EdicaoPlano){
  const desejada=Math.max(0,edicao.desiredQuantity||0);const automatico=!edicao.manualSelection&&edicao.championQuantity==null
  const idPrincipal=automatico?produto.offers[0]?.responseId:edicao.selectedResponseId
  const principal=produto.offers.find(oferta=>oferta.responseId===idPrincipal);const parcelas:ParcelaPrevista[]=[]
  if(!principal||desejada===0)return{parcelas,restante:principal?0:desejada,automatico}
  const quantidadePrincipal=automatico?Math.min(desejada,principal.availableQuantity):Math.min(desejada,Math.max(0,edicao.championQuantity??Math.min(desejada,principal.availableQuantity)))
  if(quantidadePrincipal>0)parcelas.push({supplierName:principal.supplierName,quantity:quantidadePrincipal,position:principal.position,principal:true})
  let restante=desejada-quantidadePrincipal
  for(const oferta of produto.offers.filter(oferta=>oferta.responseId!==principal.responseId)){if(restante<=0)break;const quantidade=Math.min(restante,oferta.availableQuantity);if(quantidade>0)parcelas.push({supplierName:oferta.supplierName,quantity:quantidade,position:oferta.position,principal:false});restante-=quantidade}
  return{parcelas,restante,automatico}
}

/* Matriz produto × distribuidora. Quem usa isto vem de planilha: comparar preço na
   horizontal e digitar quanto vem de cada uma é o gesto que essa pessoa já tem no dedo. */
function MatrizDistribuidoras({produtos,edicoes,erros,alterar}:{produtos:ComparacaoProduto[];edicoes:EdicaoPlano[];erros:Record<string,string>;alterar:(itemId:number,parcial:Partial<EdicaoPlano>)=>void}){
  const colunas=useMemo(()=>{
    const mapa=new Map<number,string>()
    for(const produto of produtos)for(const oferta of produto.offers)if(!mapa.has(oferta.responseId))mapa.set(oferta.responseId,oferta.supplierName)
    return [...mapa].map(([responseId,supplierName])=>({responseId,supplierName}))
  },[produtos])

  const definir=(itemId:number,responseId:number,valor:string)=>{
    const edicao=edicoes.find(e=>e.quotationItemId===itemId)!
    const quantidade=Math.max(0,Number(valor)||0)
    const outras=edicao.allocations.filter(a=>a.responseId!==responseId)
    const alocacoes=quantidade>0?[...outras,{responseId,quantity:quantidade}]:outras
    /* O total acompanha a soma: numa planilha ninguém digita a linha e depois o total de
       novo, e deixar os dois desencontrados só produziria saldo descoberto por engano. */
    alterar(itemId,{allocations:alocacoes,desiredQuantity:alocacoes.reduce((t,a)=>t+a.quantity,0)})
  }

  /* Leva a primeira linha recusada para a vista: com vinte produtos, o destaque costuma
     estar fora da área rolável e a mensagem manda corrigir algo que não dá para ver. */
  const area=useRef<HTMLDivElement|null>(null)
  const barra=useRef<HTMLDivElement|null>(null)
  const [larguraTabela,setLarguraTabela]=useState(0)
  const [larguraVisivel,setLarguraVisivel]=useState(0)
  useEffect(()=>{
    const alvo=area.current
    if(!alvo)return
    const medir=()=>{setLarguraTabela(alvo.scrollWidth);setLarguraVisivel(alvo.clientWidth)}
    medir()
    const observador=new ResizeObserver(medir)
    observador.observe(alvo)
    return ()=>observador.disconnect()
  },[produtos])
  const transborda=larguraTabela>larguraVisivel+1
  const espelhar=(de:HTMLDivElement|null,para:HTMLDivElement|null)=>{if(de&&para&&para.scrollLeft!==de.scrollLeft)para.scrollLeft=de.scrollLeft}

  const primeiraComErro=useRef<HTMLTableRowElement|null>(null)
  const primeiroRecusado=produtos.find(produto=>Object.keys(erros).some(chave=>chave.startsWith(`itens.${produto.quotationItemId}.`)))?.quotationItemId
  useEffect(()=>{
    if(Object.keys(erros).length===0)return
    primeiraComErro.current?.scrollIntoView({block:'center',behavior:'smooth'})
  },[erros])

  if(colunas.length===0)return <div className="plan-search-empty"><strong>Nenhuma distribuidora respondeu</strong><span>Sem oferta não há o que dividir.</span></div>
  return <>
  {transborda&&<div className="matriz-barra" ref={barra} onScroll={()=>espelhar(barra.current,area.current)}
    role="scrollbar" aria-label="Rolar as distribuidoras para o lado" aria-controls="matriz-plano" aria-orientation="horizontal">
    <div style={{width:larguraTabela}}/>
  </div>}
  <div className="table-wrap matriz-wrap" ref={area} onScroll={()=>espelhar(area.current,barra.current)}><table className="matriz-plano" id="matriz-plano">
    <thead><tr><th scope="col">Produto</th>
      {colunas.map(coluna=><th key={coluna.responseId} scope="col">{coluna.supplierName}</th>)}
      <th scope="col" className="matriz-total">Total</th></tr></thead>
    <tbody>{produtos.map(produto=>{
      const edicao=edicoes.find(e=>e.quotationItemId===produto.quotationItemId)!
      const somado=edicao.allocations.reduce((total,a)=>total+a.quantity,0)
      const maisBarata=produto.offers[0]?.responseId
      const prefixo=`itens.${produto.quotationItemId}.`
      const erroLinha=Object.entries(erros).find(([chave])=>chave.startsWith(prefixo))?.[1]
      return <tr key={produto.quotationItemId} ref={produto.quotationItemId===primeiroRecusado?primeiraComErro:undefined} className={erroLinha?'matriz-linha-erro':''}>
        <th scope="row"><strong>{produto.productName}<SeloRecebido produto={produto}/></strong><span>pedido {produto.requestedQuantity} un.</span></th>
        {colunas.map(coluna=>{
          const oferta=produto.offers.find(o=>o.responseId===coluna.responseId)
          if(!oferta)return <td key={coluna.responseId} className="matriz-vazia"><span aria-label="sem oferta">—</span></td>
          const valor=edicao.allocations.find(a=>a.responseId===coluna.responseId)?.quantity??''
          const excede=typeof valor==='number'&&valor>oferta.availableQuantity
          return <td key={coluna.responseId} className={excede?'matriz-excede':''}>
            <input type="number" min="0" inputMode="numeric" value={valor}
              aria-label={`${produto.productName} — ${coluna.supplierName}`}
              onChange={evento=>definir(produto.quotationItemId,coluna.responseId,evento.target.value)}/>
            <small>{oferta.responseId===maisBarata&&<b title="menor preço">☆</b>}{money(oferta.unitPrice)} · {oferta.availableQuantity}un</small>
          </td>
        })}
        <td className={`matriz-total ${somado===produto.requestedQuantity?'ok':'alerta'}`}>
          <strong>{somado}</strong><small>de {produto.requestedQuantity}</small>
          {erroLinha&&<em title={erroLinha}>!</em>}
        </td>
      </tr>
    })}</tbody>
  </table></div>
  </>
}

function ModalPlano({produtos,edicoes,setEdicoes,erros,erroGeral,ocupado,focado,aoFechar,aoSalvar}:{produtos:ComparacaoProduto[];edicoes:EdicaoPlano[];setEdicoes:(e:EdicaoPlano[])=>void;erros:Record<string,string>;erroGeral:string;ocupado:boolean;focado:boolean;aoFechar:()=>void;aoSalvar:()=>void}){
  const[busca,setBusca]=useState('')
  const[modoEdicao,setModoEdicao]=useState<'rapido'|'avancado'>('rapido')
  /* Justificativa já preenchida abre recolhida: ela é obrigatória uma vez, não toda vez.
     Só expande quando está vazia — aí realmente falta preencher — ou quando pedem para editar. */
  const [editandoJustificativa,setEditandoJustificativa]=useState<Set<number>>(new Set())
  const alternarJustificativa=(itemId:number)=>setEditandoJustificativa(atuais=>{
    const proximo=new Set(atuais)
    if(proximo.has(itemId))proximo.delete(itemId);else proximo.add(itemId)
    return proximo
  })
  const preenchido=useRef(false)
  /* Mesma razão da matriz: com quinze produtos a linha recusada quase nunca está na área
     visível, e mandar corrigir o destacado sem mostrar o destaque não ajuda ninguém. */
  const primeiraRecusada=useRef<HTMLElement|null>(null)
  useEffect(()=>{
    if(Object.keys(erros).length===0)return
    primeiraRecusada.current?.scrollIntoView({block:'center',behavior:'smooth'})
  },[erros])
  const itemRecusado=produtos.find(produto=>Object.keys(erros).some(chave=>chave.startsWith(`itens.${produto.quotationItemId}.`)))?.quotationItemId
  useEffect(()=>{
    if(modoEdicao!=='avancado'||preenchido.current)return
    preenchido.current=true
    /* Sem divisão salva a matriz abriria vazia e a farmácia teria que digitar tudo do zero.
       Preencher pelo mais barato dá o ponto de partida que ela ajusta, em vez do trabalho. */
    const proximas=edicoes.map(edicao=>{
      if(edicao.allocations.length>0)return edicao
      const produto=produtos.find(p=>p.quotationItemId===edicao.quotationItemId)
      if(!produto)return edicao
      const alocacoes=divisaoMaisBarata(produto,edicao.desiredQuantity||produto.requestedQuantity)
      return {...edicao,allocations:alocacoes,desiredQuantity:alocacoes.reduce((t,a)=>t+a.quantity,0)}
    })
    if(proximas.some((e,i)=>e!==edicoes[i]))setEdicoes(proximas)
  },[modoEdicao,edicoes,produtos,setEdicoes])
  const[edicoesIniciais]=useState(()=>edicoes.map(edicao=>({...edicao})))
  const alterar=(itemId:number,parcial:Partial<EdicaoPlano>)=>setEdicoes(edicoes.map(e=>e.quotationItemId===itemId?{...e,...parcial}:e))
  const termo=busca.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()
  const produtosVisiveis=!termo?produtos:produtos.filter(produto=>`${produto.productName} ${produto.ean??''}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(termo))
  const temAlteracoes=JSON.stringify(edicoes)!==JSON.stringify(edicoesIniciais)
  const erroLocal=produtos.some(p=>{const e=edicoes.find(x=>x.quotationItemId===p.quotationItemId)!;const oferta=p.offers.find(o=>o.responseId===e.selectedResponseId);return e.desiredQuantity<0||(e.championQuantity!=null&&e.championQuantity>e.desiredQuantity)||(e.championQuantity!=null&&oferta&&e.championQuantity>oferta.availableQuantity&&!e.stockOverrideNote.trim())})
  return <div className="modal-backdrop"><section className={`modal purchase-plan-modal ${focado?'focused-plan-modal':''}`}>
    <div className="plan-corpo">
    <div className="modal-header modal-header-simple"><div><h2>{focado?'Planejar compra deste produto':'Revisar plano final de compra'}</h2><p>{modoEdicao==='rapido'?'Escolha uma distribuidora e uma quantidade. O sistema aplicará o mesmo número ao total da compra e ao fornecedor escolhido.':focado?'Defina separadamente o total e como ele será dividido entre as distribuidoras.':'Revise cada produto e defina separadamente o total e a divisão entre distribuidoras.'}</p></div><button className="icon-button" aria-label="Fechar" onClick={aoFechar}><X/></button></div>
    <div className="plan-mode-switch" role="tablist" aria-label="Modo de ajuste"><button type="button" role="tab" aria-selected={modoEdicao==='rapido'} className={modoEdicao==='rapido'?'active':''} onClick={()=>setModoEdicao('rapido')}><strong>Ajuste rápido</strong><span>Uma distribuidora e uma quantidade</span><small>Recomendado</small></button><button type="button" role="tab" aria-selected={modoEdicao==='avancado'} className={modoEdicao==='avancado'?'active':''} onClick={()=>setModoEdicao('avancado')}><strong>Avançado</strong><span>Divida a quantidade entre fornecedores</span></button></div>
    {modoEdicao==='rapido'?<div className="plan-intro quick-plan-intro"><strong>É bem simples</strong><span><b>1.</b> Escolha de quem vai comprar.</span><span><b>2.</b> Digite a quantidade. Ex.: 100 no total = 100 dessa distribuidora.</span></div>:null}
    {!focado&&<div className="plan-product-search"><Search/><input type="search" aria-label="Buscar produtos" placeholder="Buscar produto por nome ou EAN" value={busca} onChange={event=>setBusca(event.target.value)}/>{busca&&<button type="button" aria-label="Limpar busca" title="Limpar busca" onClick={()=>setBusca('')}><X/></button>}<span>{produtosVisiveis.length} de {produtos.length} produtos</span></div>}
    {modoEdicao==='avancado'
      ?<MatrizDistribuidoras produtos={produtosVisiveis} edicoes={edicoes} erros={erros} alterar={alterar}/>
      :<div className="plan-items">{produtosVisiveis.length>0&&(modoEdicao==='rapido'
      ?<div className="plan-legenda" aria-hidden="true"><span>Produto</span><span>Comprar de</span><span>Qtd.</span><span>Resultado</span></div>
      :<div className="plan-legenda plan-legenda-avancada" aria-hidden="true"><span>Produto</span><span>Total</span><span>Comprar 1º de</span><span>Qtd. dela</span></div>)}{produtosVisiveis.length===0?<div className="plan-search-empty"><Search/><strong>Nenhum produto encontrado</strong><span>Tente buscar por outro nome ou EAN.</span><button type="button" className="button button-ghost" onClick={()=>setBusca('')}>Limpar busca</button></div>:produtosVisiveis.map(p=>{const e=edicoes.find(x=>x.quotationItemId===p.quotationItemId)!;const inicial=edicoesIniciais.find(x=>x.quotationItemId===p.quotationItemId)!;const produtoAlterado=JSON.stringify(e)!==JSON.stringify(inicial);const idRapido=e.selectedResponseId??p.offers[0]?.responseId??null;const oferta=p.offers.find(o=>o.responseId===e.selectedResponseId)??p.offers[0];const quantidadeRapida=e.championQuantity??e.desiredQuantity;const excesso=e.championQuantity!=null&&oferta&&e.championQuantity>oferta.availableQuantity;const prefixo=`itens.${p.quotationItemId}.`;const previsao=preverDivisao(p,e);
      const erroQuantidade=erros[`${prefixo}desiredQuantity`]??erros[`${prefixo}championQuantity`]??erros[`${prefixo}allocations`];
      const linhaRecusada=!!erroQuantidade||!!erros[`${prefixo}selectedResponseId`]||!!erros[`${prefixo}stockOverrideNote`];
      /* Vazia ou recusada, precisa aparecer; preenchida e aceita, só o resumo. */
      const justificativaAberta=!e.stockOverrideNote.trim()||editandoJustificativa.has(p.quotationItemId)||!!erros[`${prefixo}stockOverrideNote`];
      return <article key={p.quotationItemId} ref={p.quotationItemId===itemRecusado?primeiraRecusada:undefined} className={`plan-item guided-plan-item ${linhaRecusada?'plan-item-recusado':''}`}>
      <div className="plan-product"><strong>{p.productName}<SeloRecebido produto={p}/></strong><span>Pedido original: {p.requestedQuantity} {p.requestedQuantity===1?'unidade':'unidades'}</span></div>
      <><div className="guided-fields quick-guided-fields">
        <div className="guided-field"><label className="sr-only" htmlFor={`distribuidora-rapida-${p.quotationItemId}`}>Comprar {p.productName} de</label><select id={`distribuidora-rapida-${p.quotationItemId}`} value={idRapido??''} disabled={p.offers.length===0} onChange={x=>{const id=x.target.value?Number(x.target.value):null;alterar(p.quotationItemId,{selectedResponseId:id,manualSelection:!!id,championQuantity:id&&e.desiredQuantity>0?e.desiredQuantity:null,allocations:id&&e.desiredQuantity>0?[{responseId:id,quantity:e.desiredQuantity}]:[],stockOverrideNote:''})}}><option value="">Selecione uma distribuidora</option>{p.offers.map(o=><option key={o.responseId} value={o.responseId}>{o.supplierName} — {money(o.unitPrice)} · estoque informado {o.availableQuantity} un.</option>)}</select>{p.offers.length===0&&<span className="guided-hint warning">Nenhuma distribuidora ofereceu este produto.</span>}</div>
        <div className="guided-field guided-field-quantidade"><label className="sr-only" htmlFor={`quantidade-rapida-${p.quotationItemId}`}>Quantidade de {p.productName}</label><input id={`quantidade-rapida-${p.quotationItemId}`} type="number" min="0" disabled={!idRapido} value={quantidadeRapida} onChange={x=>{const quantidade=Math.max(0,Number(x.target.value));const selecionada=p.offers.find(o=>o.responseId===idRapido);alterar(p.quotationItemId,{desiredQuantity:quantidade,selectedResponseId:quantidade>0?idRapido:null,manualSelection:quantidade>0&&!!idRapido,championQuantity:quantidade>0&&idRapido?quantidade:null,allocations:quantidade>0&&idRapido?[{responseId:idRapido,quantity:quantidade}]:[],stockOverrideNote:selecionada&&quantidade<=selecionada.availableQuantity?'':e.stockOverrideNote})}}/></div>
      </div>{produtoAlterado&&e.manualSelection&&e.championQuantity===e.desiredQuantity
        ?<p className="plan-resultado">{e.desiredQuantity} un. de {oferta?.supplierName??'a distribuidora'}</p>
        :<p className="plan-resultado neutro">{previsao.parcelas.length>1?`Dividido hoje entre ${previsao.parcelas.length} distribuidoras`:'Sem alteração'}</p>}</>
      {linhaRecusada&&<p className="plan-item-motivo" role="alert">
        <AlertTriangle/><span>{erroQuantidade??erros[`${prefixo}selectedResponseId`]??erros[`${prefixo}stockOverrideNote`]}</span>
      </p>}
      {excesso&&(justificativaAberta
      ?<div className="plan-note guided-stock-note"><div><strong>Confirmação de estoque necessária</strong><span>A distribuidora informou {oferta.availableQuantity} un., mas você quer comprar {e.championQuantity} un. dela. Explique o que foi combinado com o representante.</span></div>{e.stockOverrideNote.trim()&&!erros[`${prefixo}stockOverrideNote`]&&<button type="button" className="icon-button justificativa-minimizar" title="Minimizar a justificativa" aria-label="Minimizar a justificativa" onClick={()=>alternarJustificativa(p.quotationItemId)}><ChevronUp/></button>}<label>Justificativa interna<input placeholder="Ex.: representante confirmou mais 5 unidades por telefone" value={e.stockOverrideNote} onChange={x=>alterar(p.quotationItemId,{stockOverrideNote:x.target.value})}/><small>Esta informação não aparecerá no pedido enviado.</small>{!e.stockOverrideNote.trim()&&<small className="field-error">Preencha a justificativa para salvar.</small>}{erros[`${prefixo}stockOverrideNote`]&&<small className="field-error">{erros[`${prefixo}stockOverrideNote`]}</small>}</label></div>
      :<button type="button" className="justificativa-resumo" onClick={()=>alternarJustificativa(p.quotationItemId)}
        title="Editar a justificativa do estoque adicional">
        <PackageCheck/><span><b>Estoque adicional justificado:</b> {e.stockOverrideNote.trim()}</span><Edit3/>
      </button>)}
    </article>})}</div>}
    {modoEdicao==='avancado'&&<p className="matriz-dica">Digite quanto vem de cada distribuidora. O total de cada produto acompanha a soma da linha, e ☆ marca o menor preço.</p>}
    </div>
    {erroGeral&&<div className="alert alert-error plan-erro" role="alert">{erroGeral}</div>}
    <div className="plan-save-note"><strong>Ao salvar:</strong> a composição e os totais serão recalculados. Pedidos já gerados e afetados precisarão ser gerados novamente.</div>
    <div className="modal-actions"><button className="button button-ghost" onClick={aoFechar}>Cancelar</button><button className="button button-primary" disabled={ocupado||erroLocal||!temAlteracoes} title={!temAlteracoes?'Faça alguma alteração no plano para salvar.':undefined} onClick={aoSalvar}>{ocupado?'Salvando...':focado?'Salvar e recalcular compra':'Salvar plano e recalcular'}</button></div>
  </section></div>
}
function ModalTroca({produto,ocupado,aoFechar,aoEscolher,aoAutomatico}:{produto:ComparacaoProduto;ocupado:boolean;aoFechar:()=>void;aoEscolher:(id:number)=>void;aoAutomatico:()=>void}){
  return <div className="modal-backdrop"><section className="modal winner-modal">
    <div className="modal-header modal-header-simple"><div><h2>Trocar campeão</h2><div className="winner-product-title"><PackageCheck/><span>{produto.productName}</span></div></div><button className="icon-button" aria-label="Fechar" onClick={aoFechar}><X/></button></div>
    <div className="winner-options">{produto.offers.map(o=><button key={o.responseId} className="winner-option" disabled={ocupado} onClick={()=>aoEscolher(o.responseId)}><span className="offer-position">{o.position}º</span><div><strong>{o.supplierName}</strong><small>{o.availableQuantity} unidades disponíveis</small></div><strong>{money(o.unitPrice)}</strong></button>)}</div>
    <div className="modal-actions"><button className="button button-ghost" onClick={aoFechar}>Cancelar</button>{produto.manualSelection&&<button className="button button-secondary" onClick={aoAutomatico}><RotateCcw/>Voltar ao automático</button>}</div>
  </section></div>
}
function mensagemErro(e:unknown,padrao:string){return e instanceof ErroApi?e.message:padrao}
