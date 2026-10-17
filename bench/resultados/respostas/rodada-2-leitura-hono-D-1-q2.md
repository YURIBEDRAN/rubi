# hono D rep 1 pergunta 2

> Como um middleware no Hono lê e altera a resposta (c.res e next())? Onde a cadeia de middlewares é composta? Cite arquivos e funções. Até 10 linhas.

Confirmado no código atual.

- **Middleware lê/altera a resposta**: um `MiddlewareHandler` é `async (c, next) => {...}`; antes de `await next()` só pode usar `c.req`; `c.res` só existe depois, pois é preenchido pelo handler da rota durante `next()`. Exemplo real: `src/middleware/etag/index.ts` (~linhas 87-134), que lê `c.req.header` antes e `c.res.headers`/`c.res.ok` depois, podendo reatribuir `c.res`.
- **Composição da cadeia**: `compose()` em `src/compose.ts:15` retorna `(context, next) => dispatch(0)`, onde `dispatch(i)` (linha 32) chama `handler(context, () => dispatch(i+1))` — cada `next()` é essa closure recursiva. Após o handler, se `res` existe e `context.finalized === false` (ou houve erro), faz `context.res = res` (linha 67-68).
- **Onde é disparado**: `src/hono-base.ts`, método privado `#dispatch`, que chama `compose(matchResult[0], this.errorHandler, this.#notFoundHandler)`.
