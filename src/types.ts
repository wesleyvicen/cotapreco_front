export type StatusCotacao = 'DRAFT' | 'OPEN' | 'CLOSED' | 'COMPLETED' | 'CANCELLED'
export type StatusResposta = 'IN_PROGRESS' | 'SUBMITTED'
export interface Usuario { id:number; name:string; email:string; role:string; companyId:number; companyName:string }
export interface ResumoCotacao { id:number; name:string; status:StatusCotacao; expiresAt:string|null; createdAt:string; productCount:number; submittedResponses:number }
export interface ItemCotacao { id:number; productId:number; gtin:string; productName:string; laboratory:string|null; requestedQuantity:number }
export interface Cotacao extends Omit<ResumoCotacao,'productCount'|'submittedResponses'> { updatedAt:string; publicToken:string|null; publicUrl:string|null; items:ItemCotacao[] }
export interface RespostaCotacao { id:number; supplierName:string; representativeName:string; phone:string; email:string|null; status:StatusResposta; submittedAt:string|null; createdAt:string; quotedItems:number; total:number }
export interface LinhaImportacao { row:number; gtin:string; productName:string; quantity:number|null; valid:boolean; productExists:boolean; productId:number|null; errors:string[] }
export interface PreviaImportacao { totalRows:number; validRows:number; invalidRows:number; lines:LinhaImportacao[] }
export interface OfertaDistribuidor { responseId:number; supplierName:string; unitPrice:number; availableQuantity:number; offeredTotal:number; bestPrice:boolean }
export interface ComparacaoProduto { quotationItemId:number; gtin:string; productName:string; requestedQuantity:number; offers:OfertaDistribuidor[]; winningSupplier:string|null; bestUnitPrice:number|null; coveredQuantity:number; missingQuantity:number }
export interface TotalDistribuidor { responseId:number; supplierName:string; quotedItems:number; total:number }
export interface CompraSugerida { supplierName:string; productCount:number; totalQuantity:number; total:number }
export interface ComparacaoCotacao { products:ComparacaoProduto[]; supplierTotals:TotalDistribuidor[]; suggestedPurchase:CompraSugerida[]; productsWithoutOffer:number; partiallyCoveredProducts:number; bestCompositionTotal:number; estimatedSavings:number }
export interface Painel { openQuotations:number; finishedQuotations:number; responsesThisMonth:number; quotedValue:number; estimatedSavings:number; latestQuotations:ResumoCotacao[] }
export interface Produto { id:number; gtin:string; name:string; laboratory:string|null; presentation:string|null; category:string|null; active:boolean; createdAt:string; updatedAt:string }
export interface ItemCotacaoPublica { gtin:string; productName:string; requestedQuantity:number }
export interface CotacaoPublica { companyName:string; quotationName:string; expiresAt:string|null; productCount:number; acceptingResponses:boolean; items:ItemCotacaoPublica[] }
export interface ItemRespostaPublica { id:number; gtin:string; productName:string; requestedQuantity:number; unitPrice:number|null; availableQuantity:number|null; available:boolean; observation:string|null }
export interface RespostaPublica { responseToken:string; companyName:string; quotationName:string; representativeName:string; supplierName:string; status:StatusResposta; expiresAt:string|null; items:ItemRespostaPublica[] }
