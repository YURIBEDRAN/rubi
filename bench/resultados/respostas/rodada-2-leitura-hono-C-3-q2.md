# hono C rep 3 pergunta 2

> Como um middleware no Hono lê e altera a resposta (c.res e next())? Onde a cadeia de middlewares é composta? Cite arquivos e funções. Até 10 linhas.

Resposta:

A cadeia é composta em `src/compose.ts`, função `compose()` (chamada a partir de `Hono#handleEvent`/`dispatch` em `src/hono-base.ts`). Ela monta um array de `[handler, params]` e retorna uma função `dispatch(i)` recursiva: cada middleware recebe `(context, next)`, onde `next = () => dispatch(i+1)` — `await next()` suspende o middleware atual até os seguintes (e o handler final) terminarem.

A leitura/escrita da resposta é via `c.res` em `src/context.ts`: getter `get res()` (linha 403) cria uma `Response` vazia se ainda não houver; setter `set res()` (linha 414) permite que um middleware substitua a resposta após `await next()`, mesclando headers/cookies da resposta anterior. Em `compose.ts` (linha 67-68), o retorno (`res`) do handler só é gravado em `context.res` se `context.finalized === false` ou se houve erro.
