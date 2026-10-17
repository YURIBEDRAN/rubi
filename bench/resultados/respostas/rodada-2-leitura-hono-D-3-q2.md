# hono D rep 3 pergunta 2

> Como um middleware no Hono lê e altera a resposta (c.res e next())? Onde a cadeia de middlewares é composta? Cite arquivos e funções. Até 10 linhas.

Confirmado contra o código atual: a memória seguia válida.

- **Middleware lê/altera a resposta**: um `MiddlewareHandler` é `async (c, next) => {...}`. Antes do `await next()` só é seguro ler a requisição (`c.req.header(...)`); só depois do `await next()` o handler da rota já populou `c.res`, podendo ler (`c.res.ok`, `c.res.headers`) ou reatribuir (`c.res = new Response(...)`). Exemplo real: `src/middleware/etag/index.ts:87-134` (lê `If-None-Match` antes, decide 304/ETag depois do `next()`).
- **Composição da cadeia**: `compose()` em `src/compose.ts:15-73` recebe o array de middlewares e retorna `dispatch(0)`; cada `dispatch(i)` chama `handler(context, () => dispatch(i+1))`, encadeando recursivamente via `next`. Ao final, se `res` existir e `context.finalized === false` (ou houve erro), faz `context.res = res` (linha 67-68). É invocado pelo `#dispatch` privado em `src/hono-base.ts` (~linhas 425/469).
