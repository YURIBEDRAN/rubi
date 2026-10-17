# hono C rep 3 pergunta 3

> Quero um middleware que meça o tempo de cada rota e devolva num header. Onde e como encaixar, considerando a composição de middlewares e o router? Cite arquivos e funções. Até 10 linhas.

O Hono já tem isso pronto: `src/middleware/timing/timing.ts`, exportado via `src/middleware/timing/index.ts`.

Use como middleware normal: `app.use(timing())` antes das rotas (ou só nas que quiser medir), igual outros middlewares em `src/middleware/*`. Ele funciona na composição padrão do `compose()` (`src/compose.ts`) — chama `next()`, mede o tempo decorrido e escreve no header `Server-Timing` via `c.res.headers`/`setMetric` exportado pelo próprio middleware. Para granularidade por rota, chame `startTime`/`endTime` (helpers exportados) dentro do handler específico via `c.set('metric', ...)`, em vez de um middleware global.

Se quiser algo custom (não o builtin), o padrão é: arquivo em `src/middleware/<nome>/index.ts` exportando uma função que retorna `MiddlewareHandler` (tipo em `src/types.ts`), registrado com `app.use()` em `src/hono-base.ts`'s `use()`/`routes` antes do handler final.
