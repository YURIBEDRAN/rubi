# hono E rep 1 pergunta 2

> Como um middleware no Hono lê e altera a resposta (c.res e next())? Onde a cadeia de middlewares é composta? Cite arquivos e funções. Até 10 linhas.

Middleware recebe `(c: Context, next: Next)`; lê/altera via `c.res` (setter em `src/context.ts`, método `res`) e pode chamar `await next()` antes/depois de modificar `c.res` (padrão onion). A composição ocorre em `src/compose.ts`, função `compose()`/`dispatch()`: monta uma cadeia recursiva onde cada `handler(context, () => dispatch(i+1))` é chamado, e após retornar, se `res` existir e `context.finalized === false`, faz `context.res = res` (compose.ts:67-68). Essa `compose` é usada em `src/hono-base.ts` (método `handler`/`dispatch` do app) para montar a lista de middlewares+rota e executá-la por requisição.
