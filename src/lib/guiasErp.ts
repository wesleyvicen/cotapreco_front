import type { SistemaErp } from '../types'

/*
 * Tutoriais de exportação do pedido, um por sistema de gestão. Ficam aqui, e não dentro do
 * componente, porque acrescentar um ERP novo precisa ser só acrescentar um item nesta lista:
 * nenhuma tela muda. Os campos de mídia já existem vazios para receber print, GIF ou vídeo
 * quando o material estiver pronto, sem mexer no fluxo.
 */
export interface ImagemGuiaErp { src:string; alt:string }
export interface PassoGuiaErp { titulo:string; detalhe?:string }
export interface GuiaErp {
  id:SistemaErp
  nome:string
  /* Frase curta do cartão de escolha. */
  descricao:string
  /* Título do tutorial. */
  titulo:string
  passos:PassoGuiaErp[]
  imagens:ImagemGuiaErp[]
  videoUrl:string|null
  helpUrl:string|null
}

export const GUIAS_ERP:GuiaErp[] = [
  {
    id:'TRIER',
    nome:'Trier',
    descricao:'Sistema muito usado por farmácias independentes',
    titulo:'Como exportar seu pedido do Trier',
    passos:[
      { titulo:'Abra o módulo de compras.' },
      { titulo:'Localize ou gere seu pedido.', detalhe:'Pode ser a sugestão de compra ou um pedido que você já preparou.' },
      { titulo:'Use a opção de exportação para Excel.' },
      { titulo:'Salve o arquivo no computador.' },
    ],
    imagens:[],
    videoUrl:null,
    helpUrl:null,
  },
  {
    id:'LINX',
    nome:'Linx',
    descricao:'Linx Farma, Big Farma e sistemas da mesma família',
    titulo:'Como exportar seu pedido do Linx',
    passos:[
      { titulo:'Entre na rotina de compras ou sugestão de pedido.' },
      { titulo:'Selecione o pedido que você quer cotar.' },
      { titulo:'Use exportar ou gerar planilha.', detalhe:'Escolha Excel quando o sistema perguntar o formato.' },
      { titulo:'Salve o arquivo no computador.' },
    ],
    imagens:[],
    videoUrl:null,
    helpUrl:null,
  },
  {
    id:'SOFTPHARMA',
    nome:'Softpharma',
    descricao:'Gestão para farmácias e drogarias',
    titulo:'Como exportar seu pedido do Softpharma',
    passos:[
      { titulo:'Abra a tela de compras.' },
      { titulo:'Gere a sugestão de compra ou abra o pedido salvo.' },
      { titulo:'Exporte para Excel.' },
      { titulo:'Salve o arquivo no computador.' },
    ],
    imagens:[],
    videoUrl:null,
    helpUrl:null,
  },
  {
    id:'OTHER',
    nome:'Outro sistema',
    descricao:'Uso um sistema diferente dos listados',
    titulo:'Como exportar seu pedido',
    passos:[
      { titulo:'Abra a tela de compras do seu sistema.' },
      { titulo:'Localize ou gere o pedido que você quer cotar.' },
      { titulo:'Procure a opção exportar, gerar planilha ou Excel.' },
      { titulo:'Salve o arquivo no computador.', detalhe:'Serve qualquer planilha com o produto e a quantidade. O CotaPreço organiza o resto.' },
    ],
    imagens:[],
    videoUrl:null,
    helpUrl:null,
  },
  {
    id:'UNKNOWN',
    nome:'Não sei',
    descricao:'Ainda não sei qual sistema a farmácia usa',
    titulo:'Sem problema, dá para começar assim mesmo',
    passos:[
      { titulo:'Procure na sua tela de compras um botão de exportar, Excel ou planilha.' },
      { titulo:'Salve o arquivo no computador.' },
      { titulo:'Não achou? Use nosso pedido de exemplo.', detalhe:'Você vê o CotaPreço funcionando agora e importa um pedido real depois.' },
    ],
    imagens:[],
    videoUrl:null,
    helpUrl:null,
  },
]

export const guiaDoErp = (erp:SistemaErp|null):GuiaErp => GUIAS_ERP.find(guia => guia.id === erp) ?? GUIAS_ERP[GUIAS_ERP.length - 1]
export const nomeDoErp = (erp:SistemaErp|null):string => GUIAS_ERP.find(guia => guia.id === erp)?.nome ?? 'seu sistema'
