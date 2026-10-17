# hono B rep 3 pergunta 2

> Como um middleware no Hono lê e altera a resposta (c.res e next())? Onde a cadeia de middlewares é composta? Cite arquivos e funções. Até 10 linhas.

`compose` está em `src/compose.ts` (função `compose`, com `dispatch` interno).

- **Cadeia composta**: `compose()` (compose.ts:15) cria `dispatch(i)` recursivo; cada middleware `handler(context, next)` onde `next = () => dispatch(i+1)` (linha 51). É usada em `src/hono-base.ts` ao montar o pipeline de rota/middlewares.
- **Ler/alterar resposta**: dentro de `dispatch`, o middleware chama `await next()` para passar adiante; ao retornar, `res` é o valor devolvido pelo handler, e se `context.finalized === false` (ninguém fechou a resposta ainda) ou houve erro, `context.res = res` (linha 67-69) — é assim que um middleware pode ler `c.res` após `await next()` e sobrescrevê-lo antes de retornar.
