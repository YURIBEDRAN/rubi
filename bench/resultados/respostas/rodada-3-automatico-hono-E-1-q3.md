# hono E rep 1 pergunta 3

> Quero um middleware que meça o tempo de cada rota e devolva num header. Onde e como encaixar, considerando a composição de middlewares e o router? Cite arquivos e funções. Até 10 linhas.

Registre como middleware normal e use `await next()` para medir o tempo depois de `next()` retornar (padrão onion/cebola do Hono):

```ts
app.use(async (c, next) => {
  const start = Date.now()
  await next()
  c.header('X-Response-Time', `${Date.now() - start}ms`)
})
```

- `app.use()` empilha no middleware do router (`src/hono-base.ts`); a execução é feita por `compose()` (`src/compose.ts`), que encadeia os handlers em ordem "cebola": cada um roda código antes do `next()`, depois os de baixo (incluindo o handler da rota), depois retoma depois do `next()`.
- Registre esse middleware **antes** das rotas que quer medir (ou com `app.use('*', ...)`), senão ele não entra na composição para elas.
- Use `c.header(...)` (definido em `src/context.ts:500`), não `c.res.headers.set` diretamente, porque o Hono só materializa a resposta final depois que o middleware de cima termina — `c.header()` funciona mesmo que a resposta ainda vá ser definida por um handler abaixo na cadeia.
