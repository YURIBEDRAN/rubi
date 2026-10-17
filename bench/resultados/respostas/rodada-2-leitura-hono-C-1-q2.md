# hono C rep 1 pergunta 2

> Como um middleware no Hono lê e altera a resposta (c.res e next())? Onde a cadeia de middlewares é composta? Cite arquivos e funções. Até 10 linhas.

Em `src/context.ts:403-432`, o getter/setter `res` guarda a Response em `#res`; o setter mescla headers (preserva `set-cookie` etc.) ao trocar a resposta. Um middleware lê `c.res` e, após `await next()`, pode fazer `c.res = novaResp` (ou mutar headers de `c.res`) para alterar a resposta antes de retornar ao chamador anterior.

A cadeia é composta em `src/compose.ts:15-73`, função `compose()`: cria `dispatch(i)` recursivo (estilo koa-compose) onde `next()` chama `dispatch(i+1)`; o `handler` retornado por cada middleware é atribuído a `context.res` em `compose.ts:67-69` se `context.finalized === false`. `compose()` é usado em `src/hono-base.ts` para montar o pipeline de uma rota antes de despachar a requisição.
