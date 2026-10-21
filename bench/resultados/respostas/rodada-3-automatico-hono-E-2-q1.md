# hono E rep 2 pergunta 1

> Como o Hono escolhe o router padrão e como o SmartRouter decide qual router usar? Cite arquivos e funções principais. Até 10 linhas.

- `src/hono.ts:30-31` (`Hono.router` default): instancia `new SmartRouter({ routers: [new RegExpRouter(), new TrieRouter()] })`.
- `SmartRouter.match()` em `src/router/smart-router/router.ts:21-61`: na **primeira** chamada a `match`, tenta cada router da lista em ordem, replaying todas as rotas (`router.add(...)`) antes de chamar `router.match`.
- Se o router lançar `UnsupportedPathError` (padrão de rota não suportado, ex. certas regex no TrieRouter vs RegExpRouter), passa pro próximo da lista (`continue`).
- O primeiro que não lançar erro "vence": `this.#routers = [router]` e `this.match = router.match.bind(router)` — a partir daí o SmartRouter delega diretamente, sem mais tentativa/replay.
