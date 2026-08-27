# Material para a landing page

Insumos para a página de venda da assinatura do CotaPreço. Aqui ficam as capturas de
tela e a leitura dos diferenciais do produto. A página em si ainda não foi escrita.

## Como as capturas foram feitas

Ambiente local (`localhost:5173`) com a base de testes, em duas larguras:

- **desktop** — janela de 1480px
- **mobile** — janela de 480px (o Chrome renderiza a 500px, que é o mínimo dele)

Antes de cada captura, os nomes das distribuidoras reais e o link de `localhost` foram
substituídos no DOM por equivalentes fictícios. Isso não é maquiagem de vitrine: usar
"Germed", "EMS" e "ranbaxy" em material de venda sugere parceria ou endosso que não
existe, o que é risco jurídico. O mapa usado:

| na base | nas capturas |
|---|---|
| Germed | Distribuidora Alfa |
| EMS | Beta Farma |
| ranbaxy | Gama Distribuição |
| Teste | Delta Farma |
| Wesley Vicente | Ana Ribeiro |
| Welson / teste2 / Teste.. / Teste3 | Reposição quinzenal / Compra de março / Compra de fevereiro / Reposição semanal |
| `http://localhost:8080/api/publico/...` | `https://cotapreco.com/c/9f4ad2e1` |

**Os valores não foram tocados.** Trocar nome de empresa por fictício remove um risco;
mexer em preço e economia seria fabricar a promessa que a página está vendendo.

## Ressalva importante sobre os números

A base de testes tem valores incoerentes, e isso aparece nas capturas:

- `02-achados` — R$ 1.140,00 de economia num pacote de gaze com 30 unidades
- `04-compra-sugerida` — economia estimada (R$ 2.220,39) maior que a própria compra (R$ 631,60)
- `03-comparativo-precos` — R$ 45,00 e R$ 0,97 para o mesmo item

Um comprador de farmácia percebe isso em dois segundos, e é exatamente ele que a página
precisa convencer. **Estas capturas servem para decidir enquadramento e leiaute, não para
publicar.** Antes de ir ao ar, vale montar uma cotação de vitrine com 15–20 medicamentos
reais e preços de mercado coerentes, e refazer os prints — aí todas as telas contam a
mesma história.

Um detalhe menor no mesmo espírito: os avatares das distribuidoras usam a inicial do nome
real ("E", "G", "r"), então continuam inconsistentes com os nomes fictícios.

## Diferenciais, na ordem em que eu venderia

### 1. Ele te avisa do que vale olhar, você não precisa caçar
`02-achados-desktop.jpg` · `02-achados-mobile.jpg`

O sistema lê as respostas e destaca sozinho duas coisas: onde uma oferta está muito abaixo
das outras (com o valor em reais, não só o percentual) e onde há **risco de ruptura** —
produto que nenhuma ou só uma distribuidora ofertou. O corte de percentual é configurável.

É o diferencial mais forte porque ataca o que ninguém tem tempo de fazer: varrer 100 itens
× 5 distribuidoras procurando o que fugiu do padrão.

Repare que o alerta não promete só economia — quando a diferença é grande demais ele manda
conferir embalagem e EAN, porque nessa faixa erro de digitação é mais provável que
oportunidade. Isso é argumento de venda, não ressalva: mostra que a ferramenta protege de
decidir errado.

### 2. Comparativo que cabe na tela, inclusive no celular
`03-comparativo-precos-desktop.jpg` · `03-comparativo-precos-mobile.jpg`

No desktop, uma coluna por distribuidora com o melhor preço destacado, colunas
arrastáveis, ordenação por fornecedor e possibilidade de ocultar quem não interessa.
No celular a mesma informação vira cartão por produto — não é a tabela espremida, é outro
leiaute.

O par de capturas desktop/mobile conta essa história sozinho.

### 3. O plano de compra sai pronto, dividido por distribuidora
`04-compra-sugerida-desktop.jpg` · `04-compra-sugerida-mobile.jpg`

O sistema monta a divisão partindo da melhor oferta, avisa quando um pedido não atinge o
mínimo da distribuidora e exige confirmação explícita para comprar abaixo dele. Tem
histórico com desfazer.

O card verde com o total e a economia estimada é o melhor elemento visual do produto
inteiro para um hero de landing page.

### 4. Memória de preço entre cotações
`05-historico-entre-cotacoes-desktop.jpg` · `05-historico-entre-cotacoes-mobile.jpg`

Compara compras já feitas: variação ponderada pelo volume, onde o gasto mudou por produto,
trajetória de preço item a item e exportação em Excel.

Este é o diferencial que **prende a assinatura**: quanto mais tempo usando, mais histórico,
e o histórico não vai embora com o cliente. Vale posicionar como "quanto mais você usa,
melhor ele fica".

### 5. Painel de acompanhamento
`01-painel-desktop.jpg` · `01-painel-mobile.jpg`

Cotações abertas, finalizadas, respostas no mês e economia estimada. Serve de abertura,
mas é o mais genérico do conjunto — qualquer concorrente tem algo parecido. Usaria como
apoio, não como argumento principal.

## Capturas que ainda faltam

- **Importação de planilha** (Nova cotação, etapa 2) — "importe a lista que você já usa"
- **Revisão editável** (Nova cotação, etapa 3) — corrigir produto errado sem reimportar
- **Tela pública do representante** — o distribuidor responde pelo link, sem instalar nada.
  Provavelmente o segundo argumento mais forte e não está capturado. Exige um acesso de
  representante, que precisa ser criado por você.
- **Cotação para OL** — exige importar planilhas na tela antes
- **Modal "Tudo que vale olhar"** — a lista completa com busca e filtro por tipo

## Estrutura sugerida da página

1. **Hero** — a dor ("você compra no escuro") + `04-compra-sugerida-desktop`
2. **Como funciona** — três passos: importa a lista, compartilha o link, recebe o comparativo
3. **Diferencial 1** — os achados automáticos (`02`)
4. **Diferencial 2** — o comparativo desktop + mobile lado a lado (`03`)
5. **Diferencial 3** — histórico entre cotações, ancorando a recorrência (`05`)
6. **Planos e preços**
7. **FAQ** — "minha distribuidora precisa se cadastrar?", "e se eu já uso planilha?"
