# hono C rep 2 pergunta 2

> Como um middleware no Hono lê e altera a resposta (c.res e next())? Onde a cadeia de middlewares é composta? Cite arquivos e funções. Até 10 linhas.

A cadeia é composta em `compose()` (src/compose.ts:15-73), que gera uma função `dispatch(i)` recursiva: cada middleware recebe `(context, () => dispatch(i+1))`, ou seja, `next` é esse closure que avança o índice e chama o próximo handler.

Um middleware lê `c.res` e o reatribui antes/depois de `await next()`, ex. etag (`src/middleware/etag/index.ts:90,120`): chama `await next()` para rodar o restante da cadeia, depois faz `c.res = new Response(...)` para trocar a resposta (acessando `c.res.headers`, body etc). O próprio `dispatch` também faz `context.res = res` na linha 68 quando o handler retorna uma Response e `context.finalized === false`.
