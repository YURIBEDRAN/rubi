# hono E rep 3 pergunta 1

> Como o Hono escolhe o router padrão e como o SmartRouter decide qual router usar? Cite arquivos e funções principais. Até 10 linhas.

- **Default router:** `src/hono.ts` (classe `Hono`, constructor) — `this.router = options.router ?? new SmartRouter({ routers: [new RegExpRouter(), new TrieRouter()] })`. Se nada for passado, usa `SmartRouter` combinando `RegExpRouter` e `TrieRouter`.
- **Decisão do SmartRouter:** `src/router/smart-router/router.ts`, método `match()`. Na primeira chamada, ele repassa as rotas acumuladas (`add()`) e tenta cada router da lista em ordem, chamando `router.match()`. Se um router lançar `UnsupportedPathError` (padrão não suportado, ex.: certas regex complexas no `RegExpRouter`), passa pro próximo; o primeiro que não lançar erro "ganha" e fica fixado via `this.match = router.match.bind(router)` — ou seja, a escolha é feita de forma lazy, no primeiro `match`, e depois cacheada (não é reavaliada a cada requisição).
