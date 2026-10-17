# hono D rep 3 pergunta 3

> Quero um middleware que meça o tempo de cada rota e devolva num header. Onde e como encaixar, considerando a composição de middlewares e o router? Cite arquivos e funções. Até 10 linhas.

Confirmado no código atual. Resposta:

Já existe um middleware pronto pra isso: `src/middleware/timing/timing.ts` (exporta `timing()` em `src/middleware/timing/index.ts`), que seta o header `Server-Timing` via `c.header()`. Se quiser um header próprio, use o mesmo padrão: registre `app.use(meuTiming())` antes das rotas — ele entra na cadeia que `compose()` (`src/compose.ts:15`) monta e que o `#dispatch` dispara em `src/hono-base.ts:469` (`compose(matchResult[0], this.errorHandler, this.#notFoundHandler)`). Dentro do middleware: marque o tempo antes de `await next()`, e só defina o header depois do `next()`, pois `c.res` só existe após o handler da rota rodar (`src/context.ts`).
