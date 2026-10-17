# hono A rep 2 pergunta 2

> Como um middleware no Hono lê e altera a resposta (c.res e next())? Onde a cadeia de middlewares é composta? Cite arquivos e funções. Até 10 linhas.

A cadeia é montada em `compose()` (src/compose.ts:15-73): `dispatch(i)` chama `handler(context, () => dispatch(i+1))`, ou seja `next()` é o próprio `dispatch` do próximo middleware — recursão que forma a pilha "onion" (código antes do `await next()` roda na entrada, código depois roda na saída, em ordem reversa).

Um middleware lê a resposta via `c.res` (getter em src/context.ts:403) e altera via o setter `c.res =` (src/context.ts:414), que clona a nova Response preservando headers (ex: `set-cookie`) da anterior. Após o handler retornar, `dispatch` (compose.ts:67-69) atribui `context.res = res` se `context.finalized === false`.
