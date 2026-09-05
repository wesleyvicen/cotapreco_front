export type StatusCotacao = 'DRAFT' | 'OPEN' | 'CLOSED' | 'COMPLETED' | 'CANCELLED'
export type StatusResposta = 'IN_PROGRESS' | 'SUBMITTED'
export interface EmpresaAcesso { id:number; name:string; role:'ADMIN'|'BUYER'|'VIEWER' }
export interface Usuario { id:number; name:string; email:string; groupId:number; groupName:string; companies:EmpresaAcesso[]; subscriptionUntil:string|null; onTrial:boolean; accessAllowed:boolean; daysLeft:number|null; emailConfirmed:boolean; staff:boolean; doisFatoresAtivo:boolean }
export interface PendenciaDoisFatores { token:string; configurando:boolean; otpauthUri:string|null; segredoManual:string|null }
export interface ContaStaff {
  grupoId:number; nomeFarmacia:string; cnpj:string|null; responsavelNome:string|null; responsavelEmail:string|null
  statusAssinatura:StatusAssinatura; emTeste:boolean; assinaturaAte:string|null
  farmaciasContratadas:number; farmaciasAtivas:number; contaAtiva:boolean; criadoEm:string
  precoMensalAtual:number; precoMensalPersonalizado:number|null; cortesia:boolean
}
export interface SolicitacaoNegociacao { farmaciasContratadas:number; precoMensalPersonalizado:number|null }
export interface SolicitacaoBrinde { farmaciasContratadas:number }
export interface SolicitacaoTrial { dias:number }
export interface PaginaContasStaff {
  itens:ContaStaff[]; pagina:number; tamanho:number; totalItens:number; totalPaginas:number
  totalContas:number; totalPagando:number; totalEmTeste:number; totalVencidas:number
}
export interface RegistroAuditoriaStaff { id:number; grupoId:number; nomeFarmacia:string; acao:string; descricao:string; staffNome:string; staffEmail:string; criadoEm:string }
export interface PaginaAuditoriaStaff { itens:RegistroAuditoriaStaff[]; pagina:number; tamanho:number; totalItens:number; totalPaginas:number }
export interface AcessoEmpresaUsuario { companyId:number; companyName:string; role:'ADMIN'|'BUYER'|'VIEWER' }
export interface UsuarioAdministracao { id:number; name:string; email:string; active:boolean; createdAt:string; access:AcessoEmpresaUsuario[] }
export interface ResumoCotacao { id:number; name:string; status:StatusCotacao; expiresAt:string|null; createdAt:string; productCount:number; submittedResponses:number; purchaseComparisonEligible:boolean; purchasedItemCount:number; lastPurchaseAt:string|null }
export interface ItemCotacao { id:number; productId:number; ean:string|null; productName:string; laboratory:string|null; requestedQuantity:number; active:boolean }
export interface Cotacao extends Omit<ResumoCotacao,'productCount'|'submittedResponses'|'purchaseComparisonEligible'|'purchasedItemCount'|'lastPurchaseAt'> { updatedAt:string; publicToken:string|null; publicUrl:string|null; items:ItemCotacao[] }
export interface RespostaCotacao { id:number; supplierName:string; representativeName:string; phone:string; email:string|null; status:StatusResposta; submittedAt:string|null; createdAt:string; quotedItems:number; total:number; minimumOrderValue:number|null; includedInSuggestedPurchase:boolean; active:boolean }
export interface ItemPreviaResposta { quotationItemId:number; ean:string|null; productName:string; laboratory:string|null; requestedQuantity:number; available:boolean; unitPrice:number|null; availableQuantity:number|null; note:string|null }
export interface PreviaResposta { id:number; supplierName:string; representativeName:string; phone:string; email:string|null; status:StatusResposta; quotedItems:number; total:number; minimumOrderValue:number|null; items:ItemPreviaResposta[] }
export interface LinhaImportacao { row:number; ean:string|null; productName:string; quantity:number|null; laboratory:string|null; valid:boolean; productExists:boolean; productId:number|null; errors:string[] }
export interface PreviaImportacao { totalRows:number; validRows:number; invalidRows:number; lines:LinhaImportacao[] }
export type StatusAssinatura='NONE'|'TRIAL'|'PENDING'|'ACTIVE'|'OVERDUE'|'CANCELED'
export interface PlanoAssinatura { value:number; cycle:'MONTHLY'; description:string }
export interface Assinatura { status:StatusAssinatura; activeUntil:string|null; nextDueDate:string|null; plan:PlanoAssinatura|null; billingType:string|null; cardLast4:string|null; canceledAt:string|null }
export interface CheckoutAssinatura { checkoutUrl:string; checkoutId:string; expiresAt:string|null }
export interface AjusteQuantidade { checkout:CheckoutAssinatura|null; assinatura:Assinatura|null }
export interface EmpresaPendente { nome:string; cnpj:string|null; abertoEm:string }
export interface ColunaArquivo { index:number; name:string }
export interface MapeamentoColunas { ean:number|null; productName:number|null; quantity:number|null; laboratory:number|null }
export interface AnaliseArquivoImportacao { sheetName:string; totalRows:number; columns:ColunaArquivo[]; suggestedMapping:MapeamentoColunas; sampleRows:string[][] }
export interface OfertaDistribuidor { responseId:number; supplierName:string; unitPrice:number; availableQuantity:number; offeredTotal:number; bestPrice:boolean; position:number; manuallySelected:boolean }
export interface AlocacaoProduto { responseId:number; quantity:number }
export interface ComparacaoProduto { quotationItemId:number; ean:string|null; productName:string; requestedQuantity:number; desiredQuantity:number; offers:OfertaDistribuidor[]; winningSupplier:string|null; bestUnitPrice:number|null; coveredQuantity:number; missingQuantity:number; selectedResponseId?:number|null; manualSelection?:boolean; invalidManualSelection?:boolean; championQuantity:number|null; championAvailableQuantity:number|null; stockOverrideNote:string|null; receivedQuantity:number; closedQuantity:number; pendingQuantity:number; allocations:AlocacaoProduto[] }
export interface TotalDistribuidor { responseId:number; supplierName:string; quotedItems:number; total:number; minimumOrderValue:number|null; includedInSuggestedPurchase:boolean }
export interface LinhaCompraSugerida { quotationItemId:number; ean:string|null; productName:string; allocatedQuantity:number; unitPrice:number; subtotal:number; offerPosition:number; champion:boolean; complement:boolean; manualSelection:boolean; stockOverrideNote:string|null }
export type StatusPedidoMinimo='SEM_MINIMO'|'ATENDIDO'|'ABAIXO_DO_MINIMO'
export interface CompraSugerida { responseId?:number; supplierName:string; productCount:number; totalQuantity:number; total:number; minimumOrderValue:number|null; minimumOrderShortfall:number; minimumOrderStatus:StatusPedidoMinimo; items?:LinhaCompraSugerida[] }
export interface ComparacaoCotacao { products:ComparacaoProduto[]; supplierTotals:TotalDistribuidor[]; suggestedPurchase:CompraSugerida[]; productsWithoutOffer:number; partiallyCoveredProducts:number; bestCompositionTotal:number; estimatedSavings:number }
export interface Painel { openQuotations:number; finishedQuotations:number; responsesThisMonth:number; responsesTotal:number; quotedValue:number; estimatedSavings:number; latestQuotations:ResumoCotacao[] }
export interface Produto { id:number; ean:string|null; name:string; laboratory:string|null; presentation:string|null; category:string|null; active:boolean; createdAt:string; updatedAt:string }
export interface Representante { id:number; nome:string; telefone:string; email:string }
export interface RespostaAutenticacaoRepresentante { token:string; tipoToken:string; expiraEmSegundos:number; representante:Representante }
export interface ItemCotacaoPublica { ean:string|null; nomeProduto:string; laboratorio:string|null; quantidadeSolicitada:number }
export interface CotacaoPublica { nomeEmpresa:string; nomeCotacao:string; expiraEm:string|null; totalProdutos:number; aceitaRespostas:boolean; itens:ItemCotacaoPublica[] }
export interface ResumoRespostaPublica { id:number; nomeDistribuidora:string; documentoDistribuidora:string|null; valorMinimoPedido:number|null; status:StatusResposta; enviadoEm:string|null; atualizadoEm:string; totalItensCotados:number; valorTotal:number }
export interface ItemRespostaPublica { id:number; ean:string|null; nomeProduto:string; laboratorio:string|null; quantidadeSolicitada:number; precoUnitario:number|null; quantidadeDisponivel:number|null; disponivel:boolean; observacao:string|null }
export interface RespostaPublica { id:number; nomeEmpresa:string; nomeCotacao:string; nomeRepresentante:string; nomeDistribuidora:string; documentoDistribuidora:string|null; valorMinimoPedido:number|null; status:StatusResposta; expiraEm:string|null; podeCorrigir:boolean; itens:ItemRespostaPublica[] }
export interface EnderecoEmpresa { cep:string; logradouro:string; numero:string; complemento:string|null; bairro:string; cidade:string; uf:string }
export interface Empresa { id:number; nome:string; cnpj:string|null; ativo:boolean }
/* Dados de cobrança da conta (grupo): nome/CNPJ/telefone/endereço usados no checkout do
   Asaas. Distintos da Empresa — aqui é a conta toda, não uma farmácia. */
export interface Conta { id:number; empresaPagadoraId:number; nome:string; cnpj:string|null; telefone:string|null; endereco:EnderecoEmpresa|null; enderecoCompleto:boolean; empresasAtivas:number; farmaciasContratadas:number; farmaciasContratadasAgendadas:number|null; precoBase:number; precoAdicionalPorFarmacia:number; precoMensalAtual:number; sugerirContato:boolean; precoNegociado:boolean; cortesia:boolean }
export type StatusPedido='GERADO'|'COMPARTILHADO'|'DESATUALIZADO'|'CANCELADO'
export interface ItemPedido { quotationItemId:number; ean:string|null; productName:string; quantity:number; unitPrice:number; subtotal:number; stockOverrideNote:string|null; receivedQuantity:number|null; receivedUnitPrice:number|null; receivedSubtotal:number|null; receiptNote:string|null; reorderShortfall:boolean }
export interface PedidoCompra { id:number; responseId:number; number:string; status:StatusPedido; supplierName:string; supplierDocument:string|null; total:number; minimumOrderValue:number|null; belowMinimum:boolean; belowMinimumConfirmed:boolean; generatedAt:string; sharedAt:string|null; checkedAt:string|null; receivedTotal:number|null; pdfAvailable:boolean; items:ItemPedido[] }
export type EstrategiaPedidoMinimo='ATINGIR_MINIMO'|'REPASSAR_PEDIDO'
export type TipoAjustePedidoMinimo='REALOCACAO'|'UNIDADES_EXTRAS'|'REPASSE'
export interface AjustePedidoMinimo { quotationItemId:number; productName:string; type:TipoAjustePedidoMinimo; currentQuantity:number; projectedQuantity:number; extraQuantity:number; unitPrice:number; destinationSupplier:string|null }
export interface OpcaoPedidoMinimo { feasible:boolean; projectedSupplierTotal:number; projectedPurchaseTotal:number; purchaseIncrease:number; extraUnits:number; uncoveredUnits:number; adjustments:AjustePedidoMinimo[] }
export interface OpcoesPedidoMinimo { responseId:number; supplierName:string; currentTotal:number; minimumOrderValue:number; shortfall:number; reachMinimum:OpcaoPedidoMinimo; reallocateOrder:OpcaoPedidoMinimo }
export type AcaoHistoricoPlano='ESTADO_INICIAL'|'ATINGIR_MINIMO'|'REPASSAR_PEDIDO'|'REINCLUIR_DISTRIBUIDORA'|'TROCAR_DISTRIBUIDORA'|'VOLTAR_AO_AUTOMATICO'|'AJUSTAR_PLANO'|'RESTAURAR_VERSAO'
export interface VersaoPlano { id:number; number:number; action:AcaoHistoricoPlano; description:string; createdBy:string; createdAt:string; total:number; current:boolean; restorable:boolean; blockedReason:string|null }
export interface HistoricoPlano { currentVersionId:number; canUndo:boolean; versions:VersaoPlano[] }
export interface ResultadoRestauracaoPlano { message:string; comparison:ComparacaoCotacao; history:HistoricoPlano }
export interface PreviaManualPedidoMinimo { comparison:ComparacaoCotacao; responseId:number; supplierTotal:number; minimumOrderValue:number; shortfall:number; minimumOrderStatus:StatusPedidoMinimo; purchaseIncrease:number; extraUnits:number; uncoveredUnits:number; baseVersionId:number }
export type SituacaoPrecoCompra='MELHOR_PRECO'|'ACIMA_DO_MELHOR_PRECO'|'REFERENCIA_INCOMPLETA'
export interface PontoHistoricoCompra { quotationId:number; quotationName:string; purchasedAt:string; quantity:number; actualUnitPrice:number; actualTotal:number; bestAvailableUnitPrice:number|null; bestAvailableTotal:number|null; supplierName:string; priceSituation:SituacaoPrecoCompra }
export interface ProdutoHistoricoCompra { key:string; ean:string|null; productName:string; laboratory:string|null; points:PontoHistoricoCompra[]; firstUnitPrice:number; lastUnitPrice:number; priceVariation:number; priceVariationPercent:number|null; financialDifference:number; latestPriceSituation:SituacaoPrecoCompra }
export interface ResumoComparativoCompra { commonProducts:number; evaluatedPurchases:number; bestPricePurchases:number; actualTotal:number; amountAboveBestScenario:number; averagePriceVariationPercent:number }
export interface ComparativoCompra { products:ProdutoHistoricoCompra[]; summary:ResumoComparativoCompra }
