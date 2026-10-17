# hono C rep 1 pergunta 3

> Quero um middleware que meça o tempo de cada rota e devolva num header. Onde e como encaixar, considerando a composição de middlewares e o router? Cite arquivos e funções. Até 10 linhas.

Esse projeto já tem isso pronto em `src/middleware/timing/timing.ts` (função `timing()`). O padrão em Hono é `MiddlewareHandler` com `await next()` em volta de `Date.now()`, setando `c.res.headers.set('X-Response-Time', ...)` só depois do `next()` (igual o `timing` faz com `Server-Timing`).

Encaixe: registre com `app.use('*', timing())` **antes** das rotas (ou da sua instância em `src/hono-base.ts`), pois `compose` (`src/compose.ts:15`) executa os middlewares em pilha — quem registra primeiro "envolve" os demais, então medir o tempo exige ser o mais externo para capturar handler + outros middlewares. O router (`src/router.ts`) só decide qual handler casa a rota; a ordem/tempo é controlado pelo `dispatch` em `compose.ts:32`.
