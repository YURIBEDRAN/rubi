# hono A rep 3 pergunta 3

> Quero um middleware que meça o tempo de cada rota e devolva num header. Onde e como encaixar, considerando a composição de middlewares e o router? Cite arquivos e funções. Até 10 linhas.

Hono já tem isso embutido — não precisa escrever do zero: `src/middleware/timing/timing.ts`, função `timing()`, que usa `performance.now()` e seta o header `Server-Timing` em `c.res.headers`.

Encaixe: registre com `app.use('*', timing())` **antes** das rotas (igual a `hono-base.ts`'s `use`), pois o `compose()` em `src/compose.ts` (`dispatch`) executa os middlewares em ordem de registro e só retorna à função chamadora depois que `next()` resolve — ou seja, código após `await next()` no seu middleware roda depois do handler da rota, com `context.res` já setado, permitindo medir o tempo total e escrever o header antes de a resposta sair.

Se quiser um middleware próprio minimalista, o padrão é: capturar `start = performance.now()` antes de `await next()`, e depois setar `c.res.headers.set('X-Response-Time', ...)` — mas como timing já existe, prefira reusá-lo.
