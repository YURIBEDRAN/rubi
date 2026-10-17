# hono A rep 1 pergunta 3

> Quero um middleware que meça o tempo de cada rota e devolva num header. Onde e como encaixar, considerando a composição de middlewares e o router? Cite arquivos e funções. Até 10 linhas.

O Hono já tem isso embutido: `timing()` em `src/middleware/timing/timing.ts:37`, que usa `performance.now()` e grava em `Server-Timing` no header.

**Onde encaixar:** registre como o *primeiro* middleware, antes das rotas — `app.use(timing())`. Isso importa porque `compose()` (`src/compose.ts:32`, função `dispatch`) executa middlewares no modelo onion: o handler de uma rota só roda dentro do `next()` do middleware anterior. Registrando `timing()` antes do router, ele envolve toda a cadeia (demais middlewares + handler da rota), capturando o tempo total correto.

Se quiser medir só um grupo de rotas, use `app.use('/api/*', timing())` — o path-matching do router (`hono-base.ts`, método `use`/`on`) garante que só entra na composição das rotas casadas.
