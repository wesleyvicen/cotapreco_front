export interface ColunasColadas { ean:string; productName:string; quantity:string; laboratory:string }
export interface LinhaColada { ean:string; productName:string; quantity:string; laboratory:string }
export type CampoColuna = keyof ColunasColadas

export const colunasColadasVazias:ColunasColadas = { ean:'', productName:'', quantity:'', laboratory:'' }

export const CAMPOS_COLADOS:{ campo:CampoColuna; rotulo:string; obrigatorio:boolean; exemplo:string }[] = [
  { campo:'ean', rotulo:'EAN', obrigatorio:false, exemplo:'7891234567890\n7899876543210' },
  { campo:'productName', rotulo:'Produto', obrigatorio:true, exemplo:'Dipirona 500mg\nAmoxicilina 500mg' },
  { campo:'quantity', rotulo:'Quantidade', obrigatorio:true, exemplo:'12\n30' },
  { campo:'laboratory', rotulo:'Laboratório', obrigatorio:false, exemplo:'EMS\nMedley' },
]

/* O Excel entrega a coluna como uma linha por célula. Só as linhas em branco do fim são
   descartadas: um branco no meio é uma célula vazia e precisa manter o alinhamento. */
export function linhasDaColuna(texto:string) {
  const linhas = texto.replace(/\r\n?/g, '\n').split('\n').map(linha => linha.trim())
  while (linhas.length && !linhas[linhas.length - 1]) linhas.pop()
  return linhas
}

/* O cabeçalho só é cortado de quem tem conteúdo: uma coluna vazia não tem cabeçalho para perder. */
export function contarLinhasColuna(texto:string, ignorarCabecalho:boolean) {
  const total = linhasDaColuna(texto).length
  return ignorarCabecalho && total ? total - 1 : total
}

/* Troca o conteúdo de dois campos vizinhos. Colar na caixa errada é o engano mais fácil de
   cometer aqui, e recortar e colar de novo custa mais do que empurrar a coluna para o lado. */
export function moverColuna(colunas:ColunasColadas, campo:CampoColuna, direcao:-1|1):ColunasColadas {
  const indice = CAMPOS_COLADOS.findIndex(atual => atual.campo === campo)
  const destino = indice + direcao
  if (indice < 0 || destino < 0 || destino >= CAMPOS_COLADOS.length) return colunas
  const vizinho = CAMPOS_COLADOS[destino].campo
  return { ...colunas, [campo]:colunas[vizinho], [vizinho]:colunas[campo] }
}

export function montarLinhasColadas(colunas:ColunasColadas, ignorarCabecalho:boolean):LinhaColada[] {
  const porCampo = {} as Record<CampoColuna, string[]>
  for (const { campo } of CAMPOS_COLADOS) {
    const linhas = linhasDaColuna(colunas[campo])
    porCampo[campo] = ignorarCabecalho && linhas.length ? linhas.slice(1) : linhas
  }
  const total = Math.max(...CAMPOS_COLADOS.map(({ campo }) => porCampo[campo].length))
  const linhas:LinhaColada[] = []
  for (let indice = 0; indice < total; indice++) {
    const linha:LinhaColada = {
      ean:porCampo.ean[indice] ?? '', productName:porCampo.productName[indice] ?? '',
      quantity:porCampo.quantity[indice] ?? '', laboratory:porCampo.laboratory[indice] ?? '',
    }
    /* Linha totalmente vazia nas quatro colunas não é produto nenhum — só sobra de seleção. */
    if (linha.ean || linha.productName || linha.quantity || linha.laboratory) linhas.push(linha)
  }
  return linhas
}
