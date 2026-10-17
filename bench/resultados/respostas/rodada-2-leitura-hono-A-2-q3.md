# hono A rep 2 pergunta 3

> Quero um middleware que meça o tempo de cada rota e devolva num header. Onde e como encaixar, considerando a composição de middlewares e o router? Cite arquivos e funções. Até 10 linhas.

Esse repo (Hono) já tem um middleware pronto: `src/middleware/timing/timing.ts`, função `timing()` — use-o como referência/ou direto.

Encaixe: registre-o cedo com `app.use('*', timing())` (ou seu próprio `MiddlewareHandler`) antes das rotas, em `hono-base.ts` via `Hono.use`/`app.get(...)`. Funciona porque `compose()` (`src/compose.ts:32`, `dispatch`) executa middlewares em cascata estilo onion: seu handler roda `start = performance.now()`, chama `await next()`, e só depois de `next()` retornar (ou seja, depois que todos os middlewares/rota internos já rodaram) você faz `c.res.headers.set('Server-Timing', ...)`. Por isso ele precisa estar registrado antes (fora) dos middlewares que quer medir — a ordem de `use()` define a posição na pilha de `dispatch`.
