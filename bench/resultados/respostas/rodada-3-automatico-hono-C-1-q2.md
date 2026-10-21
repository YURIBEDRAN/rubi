# hono C rep 1 pergunta 2

> Como um middleware no Hono lê e altera a resposta (c.res e next())? Onde a cadeia de middlewares é composta? Cite arquivos e funções. Até 10 linhas.

Em Hono, `c.res` é um getter/setter em `src/context.ts:403-432` — `set res()` mescla headers/cookies do novo Response com o anterior via `createResponseInstance`, então um middleware pode ler `c.res` e sobrescrevê-lo (ex.: `c.res.headers.set(...)` ou `c.res = new Response(...)`) após `await next()`.

A cadeia é montada em `compose()` (`src/compose.ts:15`), baseado no `koa-compose`: cada handler recebe `(context, next)`, chama `await next()` para passar ao próximo, e o resultado final acumulado fica em `context.res`. Essa função é usada pelo router em `src/hono-base.ts` (método `compose`/`dispatch` da classe `Hono`), que monta a lista de middlewares+handler por rota e invoca `compose(...)(c)` para cada request.
