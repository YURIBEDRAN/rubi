# hono C rep 2 pergunta 3

> Quero um middleware que meça o tempo de cada rota e devolva num header. Onde e como encaixar, considerando a composição de middlewares e o router? Cite arquivos e funções. Até 10 linhas.

O Hono já tem isso embutido: `src/middleware/timing/timing.ts`, função `timing()`.

Para a sua própria versão, o padrão é:

```ts
// middleware simples (não precisa de arquivo novo, mas poderia ir em src/middleware/<nome>/index.ts)
app.use('*', async (c, next) => {
  const start = performance.now()
  await next()
  c.header('X-Response-Time', `${performance.now() - start}ms`)
})
```

Encaixe:
- Registre com `app.use()` **antes** de qualquer rota/middleware que você queira medir — `compose()` (`src/compose.ts`) executa em ordem de registro, formando uma cebola (onion), então `await next()` precisa envolver o restante da cadeia.
- Como ele seta header *depois* do `next()`, funciona mesmo compondo com outros middlewares (`src/middleware/combine/index.ts` tem `some`/`every`/`except` se quiser condicionar por rota).
- `Hono#use`/`get`/`post` empilham handlers em `router.add()` (`src/router.ts`), e `hono-base.ts` roda tudo via `compose(...)(c)` no `fetch`/`dispatch` — por isso a ordem de `app.use` importa.
