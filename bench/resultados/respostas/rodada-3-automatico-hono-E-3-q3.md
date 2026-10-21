# hono E rep 3 pergunta 3

> Quero um middleware que meça o tempo de cada rota e devolva num header. Onde e como encaixar, considerando a composição de middlewares e o router? Cite arquivos e funções. Até 10 linhas.

O Hono já tem isso em `src/middleware/timing/timing.ts` (`timing()`, exportado por `src/middleware/timing/index.ts`). Não precisa criar outro — basta usar:

```ts
import { timing } from 'hono/timing'
app.use(timing())  // em app.ts, antes das rotas
```

Como encaixa na composição (`src/compose.ts`): `compose()` empilha os handlers numa cadeia de `dispatch`/`next`; `app.use(timing())` registra isso como middleware global via `Hono.use` (`src/hono-base.ts`), então ele roda **antes** do handler da rota e, no `await next()`, espera a rota terminar para então setar o header `Server-Timing` na resposta — por isso precisa estar montado antes de qualquer `app.get/post(...)` cuja rota você quer medir (middlewares registrados depois na mesma rota não são cobertos pela medição).
