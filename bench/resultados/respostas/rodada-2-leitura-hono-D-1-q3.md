# hono D rep 1 pergunta 3

> Quero um middleware que meça o tempo de cada rota e devolva num header. Onde e como encaixar, considerando a composição de middlewares e o router? Cite arquivos e funções. Até 10 linhas.

Já existe um pronto pra isso: `src/middleware/timing/timing.ts` (função `timing()`, exportada em `src/middleware/timing/index.ts`), que mede com `performance.now()` e seta `Server-Timing`. Adapte-o (ou copie o padrão) pra setar seu header custom.

- **Onde encaixar**: registre com `app.use('*', meuMiddleware)` **antes** das rotas/outros middlewares na composição do app (ex: `src/hono.ts` ou onde você monta `app.use(...)`), igual o próprio `timing()` já faz.
- **Como escrever**: marque o `start` antes de `await next()`; só defina o header **depois** do `next()`, porque `c.res` só existe depois que o handler da rota roda durante o `next()` (ver `src/context.ts`).
- **Por quê funciona**: `app.use` empilha na cadeia que o `compose()` (`src/compose.ts:15`) monta; o `#dispatch` (`src/hono-base.ts:469`) chama `compose(matchResult[0], ...)` com os middlewares casados, então ordem de registro = ordem de execução ao redor do handler.
