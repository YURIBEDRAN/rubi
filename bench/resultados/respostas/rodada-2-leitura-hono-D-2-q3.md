# hono D rep 2 pergunta 3

> Quero um middleware que meça o tempo de cada rota e devolva num header. Onde e como encaixar, considerando a composição de middlewares e o router? Cite arquivos e funções. Até 10 linhas.

Já existe uma base pronta: `timing()` em `src/middleware/timing/timing.ts:76` (exportado via `src/middleware/timing/index.ts`) mede por rota e seta `Server-Timing`. Se quiser um header próprio (ex: `X-Response-Time`), dá pra copiar esse padrão.

Encaixe: registre com `app.use('*', meuMiddleware)` **antes** das rotas/outros `app.use()` que quer medir — a ordem de registro define a posição na cadeia que `compose()` (`src/compose.ts:15`) monta, disparada por `#dispatch` em `src/hono-base.ts`, chamado em `src/hono-base.ts:469` (fluxo normal) e `:243` (fallback sem match).

Dentro do middleware: capture o tempo antes de `await next()`; só depois disso é que `c.res` existe para você setar `c.header(...)` ou `c.res.headers.set(...)` — setar antes do `next()` não funciona (`src/context.ts`).
