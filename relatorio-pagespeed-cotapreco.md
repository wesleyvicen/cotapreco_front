# Relatório PageSpeed Insights — cotapreco.com

**URL analisada:** https://cotapreco.com/
**Data da análise:** 21/09/2026
**Fonte:** https://pagespeed.web.dev/analysis/https-cotapreco-com/gb7q98j01t

## Resumo das notas

| Categoria | Mobile | Desktop |
|---|---|---|
| Desempenho | 85/100 | 99/100 |
| Acessibilidade | 96/100 | 96/100 |
| Práticas recomendadas | 100/100 | 100/100 |
| SEO | 100/100 | 100/100 |
| Navegação agêntica | 100/100 | 100/100 |

O site está muito bem em desktop e nas categorias de práticas recomendadas/SEO em ambas as plataformas. O ponto de atenção é o desempenho no mobile (85) e dois itens de acessibilidade.

## Core Web Vitals — Mobile

| Métrica | Valor | Nota |
|---|---|---|
| First Contentful Paint (FCP) | 3,0 s | 0.48 (ruim) |
| Largest Contentful Paint (LCP) | 3,2 s | 0.73 (médio) |
| Speed Index | 4,6 s | 0.71 (médio) |
| Time to Interactive (TTI) | 3,2 s | 0.94 (bom) |
| Total Blocking Time (TBT) | 0 ms | 1.0 (ótimo) |
| Cumulative Layout Shift (CLS) | 0.001 | 1.0 (ótimo) |
| Max Potential FID | 20 ms | 1.0 (ótimo) |

FCP e LCP são os principais responsáveis pela nota de desempenho mobile mais baixa — o site demora para começar a pintar conteúdo, mesmo sem travamentos de interação (TBT/CLS ótimos).

## Core Web Vitals — Desktop

| Métrica | Valor | Nota |
|---|---|---|
| FCP | 0,8 s | 0.95 |
| LCP | 0,8 s | 0.98 |
| Speed Index | 0,8 s | 0.99 |
| TBT | 0 ms | 1.0 |
| CLS | 0.001 | 1.0 |

Em desktop o carregamento é praticamente instantâneo — o gargalo é específico de rede/CPU mobile (throttling do Lighthouse simula conexão 4G lenta + CPU mais fraca).

## Oportunidades de melhoria (mobile), por impacto estimado

1. **Solicitações que bloqueiam a renderização** — economia estimada de **1.470 ms**. Maior impacto isolado; provavelmente CSS/JS carregados de forma síncrona no `<head>` antes do primeiro paint.
2. **Reduza o JavaScript não usado** — economia estimada de **44 KiB**. Arquivo: `assets/index-BDg9jjUJ.js` (44.987 bytes não utilizados no carregamento inicial).
3. **Reduza o CSS não usado** — economia estimada de **39 KiB / ~310 ms**. Arquivo: `assets/index-CSReHftz.css` (39.906 bytes não utilizados).
4. **Melhore a entrega de imagens** — economia estimada de **53 KiB**. 2 imagens candidatas a otimização (provavelmente formato/dimensionamento/compressão).
5. **JavaScript legado** — economia estimada de **11 KiB**. Há polyfills/transpilação desnecessária para navegadores modernos sendo enviada.
6. **Cache de longo prazo** — economia estimada de **4 KiB**. Ajustar cabeçalhos `Cache-Control`/`Expires` para recursos estáticos.
7. **Descoberta de solicitações de LCP** (score 0, sem detalhamento numérico) — o recurso que define o LCP provavelmente não está sendo descoberto cedo o bastante (ex: imagem de fundo via CSS, ou falta de `<link rel="preload">`).
8. **Árvore de dependência da rede** (score 0) — cadeia de requisições encadeadas está atrasando recursos críticos.

## Acessibilidade (mobile e desktop)

- **Contraste de cores insuficiente** em 2 elementos:
  - `<span class="lp-etiqueta">` dentro de `section.lp-secao > div.lp-container > div.lp-antes-depois > article.lp-antes`
  - `<p class="lp-oferta-nota">`
  → Ajustar cor do texto ou do fundo para atingir a taxa de contraste mínima (WCAG AA, geralmente 4.5:1 para texto normal).

- **Imagens sem `width`/`height` explícitos** (2 ocorrências, ambas para `cotapreco-logo.png?v=20260905-1`). Isso pode causar layout shift em conexões lentas (mesmo com CLS atualmente ótimo). Adicionar os atributos `width` e `height` (ou `aspect-ratio` via CSS) no `<img>`.

## Recomendações priorizadas para o Claude Code

1. Eliminar/adiar recursos bloqueadores de render (CSS/JS crítico inline + `defer`/`async` para o resto) — maior ganho isolado (~1,5s).
2. Fazer code-splitting/tree-shaking do bundle `index-BDg9jjUJ.js` e do CSS `index-CSReHftz.css` para cortar código não usado na carga inicial.
3. Otimizar as 2 imagens identificadas (formato moderno como WebP/AVIF, dimensionamento correto, compressão).
4. Adicionar `width`/`height` no logo (`cotapreco-logo.png`).
5. Corrigir contraste de `.lp-etiqueta` e `.lp-oferta-nota`.
6. Revisar `browserslist`/target de build para reduzir JS legado desnecessário.
7. Configurar `Cache-Control` de longa duração para assets estáticos versionados.
8. Investigar preload do recurso de LCP e encurtar a cadeia de dependências de rede (ex: `<link rel="preload">` para a imagem/fonte que define o LCP).

Todos os outros itens (Práticas recomendadas, SEO, Navegação agêntica) estão com nota máxima em ambas as plataformas — nenhuma ação necessária ali.
