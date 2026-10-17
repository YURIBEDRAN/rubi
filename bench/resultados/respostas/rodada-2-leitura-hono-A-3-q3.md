# hono A rep 3 pergunta 3

> Quero um middleware que meça o tempo de cada rota e devolva num header. Onde e como encaixar, considerando a composição de middlewares e o router? Cite arquivos e funções. Até 10 linhas.

Dá pra ser um middleware comum, sem tocar no router:

```ts
app.use('*', async (c, next) => {
  const start = Date.now()
  await next()
  c.header('X-Response-Time', `${Date.now() - start}ms`)
})
```

Registre-o com `app.use()` **antes** das rotas/outros middlewares (ex. em `app.ts` logo após criar `app`). O motivo: cada handler/middleware que `router.add` empilha é combinado por `compose()` em `src/compose.ts`, chamado em `Hono#dispatch` (`src/hono-base.ts:469`) na ordem em que foram registrados — modelo "onion". Como esse middleware chama `next()` antes de setar o header, ele envolve toda a cadeia (demais middlewares + handler), medindo o tempo total da rota.
