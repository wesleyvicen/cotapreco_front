export type StatusCotacao = 'DRAFT' | 'OPEN' | 'CLOSED' | 'COMPLETED' | 'CANCELLED'
export type StatusResposta = 'IN_PROGRESS' | 'SUBMITTED'
export interface Usuario { id:number; name:string; email:string; role:string; companyId:number; companyName:string }
export interface UsuarioAdministracao { id:number; name:string; email:string; role:'ADMIN'|'BUYER'|'VIEWER'; active:boolean; createdAt:string }
export interface ResumoCotacao { id:number; name:string; status:StatusCotacao; expiresAt:string|null; createdAt:string; productCount:number; submittedResponses:number }
export interface ItemCotacao { id:number; productId:number; ean:string|null; productName:string; laboratory:string|null; requestedQuantity:number; active:boolean }
export interface Cotacao extends Omit<ResumoCotacao,'productCount'|'submittedResponses'> { updatedAt:string; publicToken:string|null; publicUrl:string|null; items:ItemCotacao[] }
export interface RespostaCotacao { id:number; supplierName:string; representativeName:string; phone:string; email:string|null; status:StatusResposta; submittedAt:string|null; createdAt:string; quotedItems:number; total:number; active:boolean }
export interface LinhaImportacao { row:number; ean:string|null; productName:string; quantity:number|null; laboratory:string|null; valid:boolean; productExists:boolean; productId:number|null; errors:string[] }
export interface PreviaImportacao { totalRows:number; validRows:number; invalidRows:number; lines:LinhaImportacao[] }
export interface ColunaArquivo { index:number; name:string }
export interface MapeamentoColunas { ean:number|null; productName:number|null; quantity:number|null; laboratory:number|null }
export interface AnaliseArquivoImportacao { sheetName:string; totalRows:number; columns:ColunaArquivo[]; suggestedMapping:MapeamentoColunas; sampleRows:string[][] }
export interface OfertaDistribuidor { responseId:number; supplierName:string; unitPrice:number; availableQuantity:number; offeredTotal:number; bestPrice:boolean; position:number; manuallySelected:boolean }
export interface ComparacaoProduto { quotationItemId:number; ean:string|null; productName:string; requestedQuantity:number; desiredQuantity:number; offers:OfertaDistribuidor[]; winningSupplier:string|null; bestUnitPrice:number|null; coveredQuantity:number; missingQuantity:number; selectedResponseId?:number|null; manualSelection?:boolean; invalidManualSelection?:boolean; championQuantity:number|null; championAvailableQuantity:number|null; stockOverrideNote:string|null }
export interface TotalDistribuidor { responseId:number; supplierName:string; quotedItems:number; total:number }
export interface LinhaCompraSugerida { quotationItemId:number; ean:string|null; productName:string; allocatedQuantity:number; unitPrice:number; subtotal:number; offerPosition:number; champion:boolean; complement:boolean; manualSelection:boolean; stockOverrideNote:string|null }
export interface CompraSugerida { responseId?:number; supplierName:string; productCount:number; totalQuantity:number; total:number; items?:LinhaCompraSugerida[] }
export interface ComparacaoCotacao { products:ComparacaoProduto[]; supplierTotals:TotalDistribuidor[]; suggestedPurchase:CompraSugerida[]; productsWithoutOffer:number; partiallyCoveredProducts:number; bestCompositionTotal:number; estimatedSavings:number }
export interface Painel { openQuotations:number; finishedQuotations:number; responsesThisMonth:number; quotedValue:number; estimatedSavings:number; latestQuotations:ResumoCotacao[] }
export interface Produto { id:number; ean:string|null; name:string; laboratory:string|null; presentation:string|null; category:string|null; active:boolean; createdAt:string; updatedAt:string }
export interface Representante { id:number; nome:string; telefone:string; email:string }
export interface RespostaAutenticacaoRepresentante { token:string; tipoToken:string; expiraEmSegundos:number; representante:Representante }
export interface ItemCotacaoPublica { ean:string|null; nomeProduto:string; laboratorio:string|null; quantidadeSolicitada:number }
export interface CotacaoPublica { nomeEmpresa:string; nomeCotacao:string; expiraEm:string|null; totalProdutos:number; aceitaRespostas:boolean; itens:ItemCotacaoPublica[] }
export interface ResumoRespostaPublica { id:number; nomeDistribuidora:string; documentoDistribuidora:string|null; status:StatusResposta; enviadoEm:string|null; atualizadoEm:string; totalItensCotados:number; valorTotal:number }
export interface ItemRespostaPublica { id:number; ean:string|null; nomeProduto:string; laboratorio:string|null; quantidadeSolicitada:number; precoUnitario:number|null; quantidadeDisponivel:number|null; disponivel:boolean; observacao:string|null }
export interface RespostaPublica { id:number; nomeEmpresa:string; nomeCotacao:string; nomeRepresentante:string; nomeDistribuidora:string; documentoDistribuidora:string|null; status:StatusResposta; expiraEm:string|null; podeCorrigir:boolean; itens:ItemRespostaPublica[] }
export interface Empresa { id:number; nome:string; cnpj:string|null }
export type StatusPedido='GERADO'|'COMPARTILHADO'|'DESATUALIZADO'|'CANCELADO'
export interface ItemPedido { quotationItemId:number; ean:string|null; productName:string; quantity:number; unitPrice:number; subtotal:number; stockOverrideNote:string|null }
export interface PedidoCompra { id:number; responseId:number; number:string; status:StatusPedido; supplierName:string; supplierDocument:string|null; total:number; generatedAt:string; sharedAt:string|null; pdfAvailable:boolean; items:ItemPedido[] }
