# hono C rep 2 pergunta 3

> Quero um middleware que meça o tempo de cada rota e devolva num header. Onde e como encaixar, considerando a composição de middlewares e o router? Cite arquivos e funções. Até 10 linhas.

Já existe exatamente isso: `src/middleware/timing/timing.ts` (exporta `timing()`), usável via `app.use(timing())`.

Padrão de encaixe: registre com `app.use('*', timing())` **antes** das rotas (middlewares "onion" rodam na ordem registrada). O `Hono#use` (`src/hono-base.ts:174`) empilha o handler no router; na request, `#dispatch` (linha 425) monta `compose(matchResult[0], ...)` (linha 469, `src/compose.ts`) numa cadeia de `next()`. Dentro do middleware, marque o início com `performance.now()`, chame `await next()`, calcule o delta e sete `c.res.headers.set('Server-Timing', ...)` depois do `next()` — assim ele cobre handler + middlewares subsequentes.
