# hono A rep 3 pergunta 2

> Como um middleware no Hono lê e altera a resposta (c.res e next())? Onde a cadeia de middlewares é composta? Cite arquivos e funções. Até 10 linhas.

Em Hono, um middleware lê/altera a resposta via `c.res`: o setter em `src/context.ts:414` (`set res`) reconstrói a `Response` com `createResponseInstance`, mesclando/substituindo headers (inclusive `set-cookie`) da resposta antiga na nova; o getter em `src/context.ts:403` expõe a `Response` atual. O middleware chama `await next()` para disparar o próximo handler da cadeia e, depois que ele retorna, pode inspecionar/mutar `c.res` (padrão "onion").

A composição da cadeia é feita em `compose()` em `src/compose.ts:15`, que percorre o array de middlewares construindo recursivamente a função `dispatch`, encadeando cada handler via `next()` (semelhante ao `koa-compose`).
