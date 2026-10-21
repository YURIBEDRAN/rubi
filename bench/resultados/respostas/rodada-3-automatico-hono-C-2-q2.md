# hono C rep 2 pergunta 2

> Como um middleware no Hono lê e altera a resposta (c.res e next())? Onde a cadeia de middlewares é composta? Cite arquivos e funções. Até 10 linhas.

Um middleware recebe `(c, next)`; chama `await next()` para rodar o resto da cadeia e depois pode ler/alterar `c.res` (ex.: `c.res.headers.set(...)`, ou reatribuir `c.res = new Response(...)`). O setter `res` em `src/context.ts:414` (`Context#res`) mescla headers do response anterior no novo ao reatribuir.

A cadeia é composta em `compose()` em `src/compose.ts:15`, via a função interna `dispatch(i)` (`src/compose.ts:32`), que chama recursivamente `handler(context, () => dispatch(i + 1))` — isso é o `next()` que cada middleware invoca. Depois que o handler retorna, `dispatch` atribui `context.res = res` se ainda não finalizado (`src/compose.ts:67-68`). Essa cadeia é montada pelo roteador e chamada em `src/hono-base.ts` (ex. `Hono#dispatch`/`compose(this.routes, ...)`).
