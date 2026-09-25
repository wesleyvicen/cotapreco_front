import type { CupomAplicado, TipoCupom } from '../types'

export const ROTULO_TIPO_CUPOM:Record<TipoCupom,string> = {
  DESCONTO_PERCENTUAL:'Desconto %', DESCONTO_FIXO:'Desconto em R$',
  TRIAL_ESTENDIDO:'Teste estendido', FARMACIA_GRATIS:'Farmácia grátis',
}

/* Menor cobrança de cartão que o Asaas aceita (mesmo piso de PrecoAssinaturaService). */
const VALOR_MINIMO = 5

/* Só estimativa de exibição, para quando a pessoa simula outra quantidade de farmácias: a
   cobrança de verdade é calculada pelo backend (PrecoAssinaturaService.aplicar), com a
   mesma conta. */
export function precoComCupom(preco:number, cupom:CupomAplicado|null, quantidade:number, adicionalPorFarmacia:number) {
  if (!cupom) return preco
  const desconto = cupom.tipo === 'DESCONTO_PERCENTUAL' ? Math.round(preco * (cupom.percentual ?? 0)) / 100
    : cupom.tipo === 'DESCONTO_FIXO' ? cupom.valor ?? 0
    : cupom.tipo === 'FARMACIA_GRATIS' ? adicionalPorFarmacia * Math.min(cupom.quantidadeFarmacias ?? 0, Math.max(0, quantidade - 1))
    : 0
  return desconto > 0 ? Math.max(VALOR_MINIMO, Math.round((preco - desconto) * 100) / 100) : preco
}

/* Até quando vai o desconto, para nunca mostrar o preço com cupom seguido só de "por mês"
   quando ele acaba depois de algumas mensalidades. jaAssina troca "primeiras" por "próximas":
   quem já paga pode estar no meio do período do cupom. */
export function periodoDoDesconto(mesesRestantes:number, jaAssina:boolean) {
  if (mesesRestantes === 1) return jaAssina ? 'na próxima mensalidade' : 'na 1ª mensalidade'
  return jaAssina ? `nas próximas ${mesesRestantes} mensalidades` : `nas ${mesesRestantes} primeiras mensalidades`
}
