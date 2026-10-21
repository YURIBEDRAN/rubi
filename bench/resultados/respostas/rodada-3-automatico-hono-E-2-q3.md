# hono E rep 2 pergunta 3

> Quero um middleware que meça o tempo de cada rota e devolva num header. Onde e como encaixar, considerando a composição de middlewares e o router? Cite arquivos e funções. Até 10 linhas.

Já existe um middleware pronto pra isso: `src/middleware/timing/timing.ts`, exportado por `src/middleware/timing/index.ts` (`timing()`).

**Onde encaixar**: registre-o o mais externo possível, antes dos demais `app.use`, com `app.use(timing())` em `hono-base.ts`'s `use()` — a composição é feita por `compose()` em `src/compose.ts`, que empilha os middlewares em ordem LIFO (último registrado executa primeiro ao entrar, mas o `timing` precisa envolver tudo, então deve ser o **primeiro** `use`). Como o roteamento ocorre dentro de `Hono#dispatch` (`src/hono-base.ts`), que chama `compose(matchResult, ...)`, qualquer middleware registrado antes das rotas específicas envolve a cadeia inteira, incluindo o handler final.

**Como**: dentro do middleware, marque o tempo antes de `await next()` e sete o header (`c.res.headers.set('X-Response-Time', ...)`) depois — igual ao padrão em `src/middleware/logger/index.ts`, que já faz start/end em volta de `next()`.
