# Guia para agentes — frontend

## Escopo

Estas instruções valem para todo o projeto `frontend/`. O projeto é a interface web do CotaPreço, construída com React 19, TypeScript, Vite, ESLint, Lucide React e Recharts.

## Estrutura do projeto

- `src/pages`: telas e fluxos da aplicação.
- `src/components`: componentes compartilhados e layout autenticado.
- `src/api.ts`: cliente HTTP, renovação de sessão, tratamento de erros e formatação compartilhada.
- `src/autenticacao.tsx`: contexto e proteção da sessão da farmácia.
- `src/roteamento.tsx`: roteamento próprio baseado na History API; o projeto não usa React Router.
- `src/types.ts`: contratos TypeScript compartilhados com as respostas da API.
- `src/styles.css`: estilos globais e dos componentes.
- `functions`: funções JavaScript executadas no ambiente Cloudflare Pages.
- `public`: manifest, ícones, imagens sociais e configuração de rotas estáticas.

## Convenções de implementação

- Mantenha a interface, mensagens e nomes de domínio em português do Brasil.
- Use componentes funcionais e hooks. Tipos explícitos são preferíveis a `any`; não desative regras do TypeScript ou ESLint sem justificativa concreta.
- Preserve o roteamento próprio existente. Ao adicionar uma rota, atualize `App.tsx` e, quando necessário, o título da página e os links de navegação.
- Centralize chamadas HTTP em `api.ts` ou em funções que reutilizem `api`, `apiPublica`, `apiRepresentante` e `apiArquivo`. Não duplique a montagem da URL, os cabeçalhos JWT ou a lógica de renovação.
- Preserve a separação entre as sessões `farmacia` e `representante`; elas usam tokens, endpoints de refresh e fluxos de logout distintos.
- Considere que o backend pode responder erros com `message` e `fields`. Exiba erros de campo próximos aos controles e uma mensagem geral compreensível.
- Mantenha os tipos de `src/types.ts` sincronizados com os DTOs do backend, inclusive nulabilidade e nomes de propriedades compatíveis.
- Reutilize `LayoutSistema` e os componentes de `ComponentesUI.tsx` antes de criar variantes equivalentes.
- Ao alterar a interface, preserve responsividade, navegação por teclado, foco visível, labels acessíveis e contraste adequado.
- Use `Intl` e os helpers compartilhados para moeda e datas. Valores monetários são em BRL e datas são apresentadas no padrão `pt-BR`.
- Não inclua segredos no bundle. Somente variáveis prefixadas com `VITE_` podem ser públicas; `VITE_API_URL` define a base da API.
- Não edite artefatos gerados em `dist/` nem dependências em `node_modules/`.

## Integração com o backend

- A URL padrão da API é `http://localhost:8080/api` e pode ser sobrescrita por `VITE_API_URL`.
- Preserve os contratos existentes, mesmo quando alguns endpoints ou campos estejam em inglês por compatibilidade histórica.
- Requisições autenticadas enviam o JWT no cabeçalho `Authorization` e usam cookie de refresh com `credentials: 'include'`.
- Alterações que afetem autenticação devem ser verificadas nos fluxos de farmácia e representante, inclusive expiração, refresh, logout e redirecionamento após `401`.
- Se uma mudança alterar o contrato da API, coordene a atualização dos DTOs do backend e dos tipos e consumidores do frontend.

## Testes e verificação

Execute a partir de `frontend/`:

```bash
npm install
npm run lint
npm run build
```

- Use `npm install` quando o lockfile ou as dependências precisarem ser materializados; não troque o gerenciador de pacotes nem remova `package-lock.json`.
- O projeto ainda não possui script automatizado de testes. Para toda mudança, faça ao menos `npm run lint` e `npm run build`.
- Para mudanças visuais ou de navegação, execute também `npm run dev` e valide manualmente o fluxo afetado em larguras desktop e móvel.
- Se adicionar uma infraestrutura de testes, inclua o script correspondente em `package.json`, mantenha os testes perto do código relacionado e documente o comando aqui.

## Execução local

```bash
npm run dev
```

O Vite usa, por padrão, a porta `5173`. Use o `.env.example` como referência e não presuma que valores particulares do `.env` local estarão disponíveis em outros ambientes.
