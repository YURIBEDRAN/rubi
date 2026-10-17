# hono A rep 2 pergunta 3

> Quero um middleware que meça o tempo de cada rota e devolva num header. Onde e como encaixar, considerando a composição de middlewares e o router? Cite arquivos e funções. Até 10 linhas.

**Como:** crie um `MiddlewareHandler` (ver padrão em `src/middleware/logger/index.ts`) no estilo "onion": marque `Date.now()` antes de `await next()` e, depois, `c.res.headers.set('X-Response-Time', ...)`.

**Onde encaixar:** registre via `app.use('*', timing())` **antes** das rotas, igual o Hono faz com `logger()`. A composição é feita por `compose()` em `src/compose.ts`, chamado em `hono-base.ts:469` (`#dispatch`) — como seu middleware roda primeiro, ele "envolve" todos os demais e a rota, então o `next()` já retorna com `c.res` definido pelo handler, permitindo setar o header antes da resposta final sair.
