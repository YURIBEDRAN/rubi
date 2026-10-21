# hono C rep 3 pergunta 2

> Como um middleware no Hono lê e altera a resposta (c.res e next())? Onde a cadeia de middlewares é composta? Cite arquivos e funções. Até 10 linhas.

Um middleware recebe `(c, next)`; chama `await next()` para rodar o próximo handler, podendo ler/alterar `c.res` antes e/ou depois desse `await` (ex.: `src/middleware/compress`, `etag`). Setar `c.res = new Response(...)` usa o setter em `src/context.ts` (`Context#res`), que marca `finalized`.

A cadeia é composta em `src/compose.ts`, função `compose()`, usando a função interna recursiva `dispatch(i)`: cada chamada roda `middleware[i]`, passando `() => dispatch(i+1)` como `next`; o retorno do handler vira `context.res` se `context.finalized === false`. `compose()` é invocado em `src/hono-base.ts` (método privado `#dispatch`, linha ~469) com a lista de handlers casados pela rota.
