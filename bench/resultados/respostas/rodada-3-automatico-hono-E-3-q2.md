# hono E rep 3 pergunta 2

> Como um middleware no Hono lê e altera a resposta (c.res e next())? Onde a cadeia de middlewares é composta? Cite arquivos e funções. Até 10 linhas.

- `c.res` é um getter/setter em `src/context.ts:403` (`get res()`) e `:414` (`set res(_res)`), que mescla headers (incluindo `set-cookie`) ao sobrescrever a resposta anterior.
- Middleware é uma função `(c, next) => ...`; depois de `await next()`, ela pode ler/alterar `c.res` (ex.: `c.res.headers.set(...)` ou `c.res = new Response(...)`).
- A composição da cadeia (estilo onion/koa) é feita por `compose()` em `src/compose.ts:15`, chamado por `Hono#dispatch` em `src/hono-base.ts`, que percorre os middlewares registrados no `Router` (`src/router.ts`) e encadeia as chamadas de `next()`.
