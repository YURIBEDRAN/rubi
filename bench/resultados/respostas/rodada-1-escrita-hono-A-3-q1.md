# hono A rep 3 pergunta 1

> Como o Hono escolhe o router padrão e como o SmartRouter decide qual router usar? Cite arquivos e funções principais. Até 10 linhas.

Com base no código:

- **Default**: no construtor em `src/hono.ts:28-32`, se `options.router` não for passado, o Hono cria `new SmartRouter({ routers: [new RegExpRouter(), new TrieRouter()] })`.
- **SmartRouter** (`src/router/smart-router/router.ts`): `add()` só acumula as rotas (`#routes`), sem escolher router ainda. A decisão ocorre na primeira chamada de `match()`: ele itera a lista `#routers`, registra todas as rotas pendentes em cada um via `router.add(...)` e chama `router.match()`; o **primeiro** que não lançar `UnsupportedPathError` é escolhido como definitivo (`RegExpRouter` tem prioridade por vir primeiro no array). Após escolhido, `this.match` é substituído (bind) pelo `match` desse router, `#routers` fica só com ele e `#routes` é zerado — ou seja, a escolha é feita uma única vez e cacheada para as próximas requisições.
- O preset `tiny` (`src/preset/tiny.ts`) usa só `PatternRouter` diretamente, sem SmartRouter.
