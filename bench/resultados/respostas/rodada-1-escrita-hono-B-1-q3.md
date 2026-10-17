# hono B rep 1 pergunta 3

> Quero um middleware que meça o tempo de cada rota e devolva num header. Onde e como encaixar, considerando a composição de middlewares e o router? Cite arquivos e funções. Até 10 linhas.

Já existe esse middleware pronto em `src/middleware/timing/timing.ts` (Server-Timing), mas se for um custom simples:

1. Crie `src/middleware/my-timing/index.ts` com `createMiddleware((c, next) => {...})` do padrão (ver `src/middleware/etag/index.ts:87-134`): mede `Date.now()` antes de `await next()`, calcula o delta depois, e seta `c.res.headers.set('X-Response-Time', ...)`.
2. Encaixe via `app.use('*', timing())` em `src/hono-base.ts` (mesmo ponto onde outros middlewares globais são registrados) — ele entra no array que `compose()` recebe.
3. Posição importa: registre-o **primeiro** na cadeia (antes das rotas) para que o `next()` englobe toda a execução downstream — `compose()` em `src/compose.ts` roda os middlewares em ordem via `dispatch(i)` recursivo, então o primeiro registrado é o que "envolve" todos os demais.
4. Depois do `await next()`, os demais middlewares já rodaram e `c.res` está finalizado (ou quase), então aí é seguro setar o header.

Quer que eu implemente esse middleware (custom) ou que eu mostre como habilitar o `timing()` já existente do Hono?
