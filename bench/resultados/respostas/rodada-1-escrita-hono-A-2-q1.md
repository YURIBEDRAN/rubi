# hono A rep 2 pergunta 1

> Como o Hono escolhe o router padrão e como o SmartRouter decide qual router usar? Cite arquivos e funções principais. Até 10 linhas.

Em `src/hono.ts` (construtor da classe `Hono`), se nenhum `router` é passado nas options, usa-se `new SmartRouter({ routers: [new RegExpRouter(), new TrieRouter()] })` — ou seja, RegExpRouter como preferido, TrieRouter como fallback.

A decisão real está em `SmartRouter.match()` (`src/router/smart-router/router.ts:21-61`): no **primeiro `match()`**, ele itera os `routers` na ordem dada, registra todas as rotas acumuladas (`#routes`) em cada um via `router.add(...)` e tenta `router.match(method, path)`. Se o router lançar `UnsupportedPathError` (ex.: RegExpRouter não suporta certos padrões dinâmicos), o SmartRouter passa para o próximo router do array. O primeiro que não lançar é promovido: `this.match = router.match.bind(router)` e `#routers = [router]`, fixando-o permanentemente (requisições seguintes chamam esse `match` diretamente, sem mais tentativas).
