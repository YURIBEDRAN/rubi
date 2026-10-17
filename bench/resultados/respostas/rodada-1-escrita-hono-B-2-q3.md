# hono B rep 2 pergunta 3

> Quero um middleware que meça o tempo de cada rota e devolva num header. Onde e como encaixar, considerando a composição de middlewares e o router? Cite arquivos e funções. Até 10 linhas.

Já existe: `src/middleware/timing/timing.ts`, função `timing()` — porque é padrão koa-style (envolve `next()` e mede antes/depois), igual ao que você descreveria.

- **Onde**: registre o quanto antes com `app.use(timing())` (via `app.use` em `src/hono-base.ts`), antes de outros middlewares que você queira medir — na pilha compose/dispatch (`src/compose.ts:32`), middlewares entram na ordem registrada, então quem envolve mais externamente deve ser adicionado primeiro.
- **Como**: `timing()` é um `MiddlewareHandler(c, next)` que chama `startTime(c,'total')`, `await next()`, `endTime(c,'total')` e no fim escreve em `c.res.headers.append('Server-Timing', ...)` — exatamente o padrão "medir e setar header depois do `await next()`" do `dispatch(i)`.
- Pode ser global (`app.use(timing())`) ou por rota (`app.get('/x', timing(), handler)`); só chega no header se vier antes do handler na composição.
