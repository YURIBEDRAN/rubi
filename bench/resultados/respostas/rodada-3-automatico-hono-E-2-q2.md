# hono E rep 2 pergunta 2

> Como um middleware no Hono lê e altera a resposta (c.res e next())? Onde a cadeia de middlewares é composta? Cite arquivos e funções. Até 10 linhas.

Resposta:

- Um middleware é `async (c, next) => { ... await next(); ... }`. Ele lê a resposta via `c.res` (getter/setter em `src/context.ts`), chama `next()` para rodar o próximo da cadeia, e pode substituir a resposta com `c.res = novaResponse` antes ou depois do `await next()`.
- A composição ocorre em `compose()` em `src/compose.ts`, função interna `dispatch(i)` (linha 32): chama `handler(context, () => dispatch(i+1))` recursivamente, e após cada handler retornar, se houve `res` e `context.finalized === false`, faz `context.res = res` (linha 67-68).
- `compose` é invocado em `src/hono-base.ts:469` (`Hono.prototype.dispatch`), com a lista de handlers casados pelo router.
