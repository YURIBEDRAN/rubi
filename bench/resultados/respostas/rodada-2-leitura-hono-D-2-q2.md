# hono D rep 2 pergunta 2

> Como um middleware no Hono lê e altera a resposta (c.res e next())? Onde a cadeia de middlewares é composta? Cite arquivos e funções. Até 10 linhas.

Confirmado contra o código atual — resposta direta:

Um middleware segue o padrão `async (c, next) => { /* antes */ await next(); /* depois, lê/altera c.res */ }` — exemplo real em `src/middleware/etag/index.ts` (~87-134), que após `await next()` lê `c.res.ok`/`c.res.headers` e pode reatribuir `c.res = new Response(...)`. Isso funciona porque `c.res` só é populado pelo handler da rota durante o `next()` (`src/context.ts`).

A cadeia é composta por `compose()` em `src/compose.ts:15`, via `dispatch(i)` recursivo (linha 32): cada middleware recebe `(context, () => dispatch(i+1))` como `next` (linha 51), e se o retorno (`res`) existir e `context.finalized === false`, atribui a `context.res` (linhas 67-69). É chamada em `src/hono-base.ts` dentro do método privado `#dispatch` (linha 425), concretamente na linha 469: `compose(matchResult[0], this.errorHandler, this.#notFoundHandler)`.
