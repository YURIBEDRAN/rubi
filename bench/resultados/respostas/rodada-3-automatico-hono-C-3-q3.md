# hono C rep 3 pergunta 3

> Quero um middleware que meça o tempo de cada rota e devolva num header. Onde e como encaixar, considerando a composição de middlewares e o router? Cite arquivos e funções. Até 10 linhas.

Já existe pronto: `src/middleware/timing/timing.ts` exporta `timing()`, que mede via `Server-Timing` header (usa `c.set`/`setMetric` em `c.res.headers`).

Encaixe com `app.use('*', timing())` **antes** das rotas, em `src/hono-base.ts` — o middleware roda dentro de `compose()` (`src/compose.ts`), que empilha handlers como cebola: o `next()` do timing só retorna depois que a rota (registrada via `router.ts`) terminar, então ele mede o tempo real do handler. Coloque-o como o middleware mais externo (primeiro `use`) pra incluir outros middlewares na medição, ou mais interno se quiser medir só a rota.
