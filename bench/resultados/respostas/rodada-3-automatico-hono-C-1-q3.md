# hono C rep 1 pergunta 3

> Quero um middleware que meça o tempo de cada rota e devolva num header. Onde e como encaixar, considerando a composição de middlewares e o router? Cite arquivos e funções. Até 10 linhas.

Já existe `timing` em `src/middleware/timing/timing.ts` (Server-Timing). Padrão de encaixe:

- Registre **antes** das rotas, via `app.use('*', timing())` (ou `timing({ total: true })`) — em Hono o `use` adiciona ao `router` (`src/hono-base.ts`, `Hono.use`) e entra na cadeia de composição executada por `compose()` em `src/compose.ts`.
- Por ser um middleware "around" (marca `start` antes de `await next()` e seta o header depois), precisa estar nas camadas mais externas da composição — registrado antes de outros middlewares/handlers da rota — senão não mede o tempo deles.
- Setar o header com `c.header('Server-Timing', ...)` funciona mesmo após `next()`, pois o Response só é finalizado ao final da pilha composta.

Se quiser, posso mostrar o trecho de `timing.ts` que faz a marcação (`setMetric`/`startTime`/`endTime`).
