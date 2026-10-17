# hono A rep 2 pergunta 1

> Como o Hono escolhe o router padrão e como o SmartRouter decide qual router usar? Cite arquivos e funções principais. Até 10 linhas.

- **Padrão**: `Hono` (`src/hono.ts:28-32`) instancia `new SmartRouter({ routers: [new RegExpRouter(), new TrieRouter()] })` como `this.router`, na ordem de preferência RegExpRouter → TrieRouter.
- **Decisão do SmartRouter**: em `match()` (`src/router/smart-router/router.ts:21-61`), ele replica as rotas acumuladas (`#routes`) em cada router da lista e tenta `router.match()` em ordem; o primeiro que não lançar `UnsupportedPathError` é escolhido, via `this.match = router.match.bind(router)` e `this.#routers = [router]` (cacheia a escolha para chamadas futuras).
- Ou seja: tenta RegExpRouter primeiro (mais rápido); se o path usa recursos não suportados por ele (ex: wildcards complexos), cai para o TrieRouter.
