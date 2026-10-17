# hono A rep 3 pergunta 2

> Como um middleware no Hono lê e altera a resposta (c.res e next())? Onde a cadeia de middlewares é composta? Cite arquivos e funções. Até 10 linhas.

Um middleware recebe `(c, next)`; chama `await next()` para executar o restante da cadeia e depois pode ler/alterar a resposta via `c.res` (getter/setter em `src/context.ts:403` e `:414`, que mescla headers/cookies ao invés de sobrescrever a Response). A cadeia é composta em `src/compose.ts`, função `compose()` (linha 15), que gera `dispatch(i)`: cada chamada roda `handler(context, () => dispatch(i+1))` e, se o handler retornar uma Response, atribui `context.res = res` (linha 68) quando ainda não finalizado. `compose()` é invocado em `src/hono-base.ts:469` dentro de `Hono#dispatch`, que executa `composed(c)` e retorna `context.res`.
