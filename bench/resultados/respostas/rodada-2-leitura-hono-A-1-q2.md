# hono A rep 1 pergunta 2

> Como um middleware no Hono lê e altera a resposta (c.res e next())? Onde a cadeia de middlewares é composta? Cite arquivos e funções. Até 10 linhas.

Resposta:

A cadeia é composta em `compose()` em **src/compose.ts** (linhas 15-73). Ele recebe o array de middlewares e retorna a função `dispatch(i)` (linhas 32-71), que chama `handler(context, () => dispatch(i + 1))` — esse segundo argumento é o `next()` que o middleware invoca. É um padrão onion/koa-compose: cada `dispatch` avança o índice, chama o próximo handler recursivamente e, ao retornar, faz `context.res = res` (linha 68) se o handler retornou uma Response e `context.finalized === false`.

Um middleware lê/altera a resposta assim:
```js
await next()           // executa o restante da cadeia
c.res.headers.set(...) // lê/modifica depois que a resposta "voltou"
```
`c.res` é o getter/setter em **src/context.ts** (`get res()` linha 403, `set res()` linha 414) — o setter mescla headers/cookies da resposta antiga ao atribuir uma nova (linhas 414-432).
