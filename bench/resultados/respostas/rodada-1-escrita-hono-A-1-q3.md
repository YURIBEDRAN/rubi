# hono A rep 1 pergunta 3

> Quero um middleware que meça o tempo de cada rota e devolva num header. Onde e como encaixar, considerando a composição de middlewares e o router? Cite arquivos e funções. Até 10 linhas.

Já existe um middleware assim em `src/middleware/timing/timing.ts` (exporta `timing()`), mas a lógica vale para um custom também:

- Crie com `createMiddleware` (de `src/helpers/factory` ou `hono/factory`): marque `start = Date.now()`, `await next()`, depois `c.header('X-Response-Time', ...)`.
- Registre com `app.use('*', meuMiddleware())` **antes** das rotas em `src/hono-base.ts` — a ordem de `use()` define a posição no array `middleware` que `compose()` (`src/compose.ts:15`) percorre via `dispatch()`.
- Funciona porque `dispatch(i)` (`compose.ts:51`) chama `handler(context, () => dispatch(i+1))`: seu código roda antes de `next()`, o roteamento/handler real roda dentro de `next()`, e o header é setado depois de `next()` resolver — ainda antes de `context.res` ser finalizado (`compose.ts:67-68`).
- Como é global (`'*'`), ele envolve todos os handlers casados pelo router, então mede o tempo da rota inteira independente de qual `Router` (`src/router/*`) resolveu o match.
