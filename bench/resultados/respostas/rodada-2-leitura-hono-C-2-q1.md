# hono C rep 2 pergunta 1

> Como o Hono escolhe o router padrão e como o SmartRouter decide qual router usar? Cite arquivos e funções principais. Até 10 linhas.

- **Padrão**: `Hono` (`src/hono.ts:28-32`, construtor) usa `SmartRouter` com `[RegExpRouter(), TrieRouter()]` como padrão.
- **Decisão do SmartRouter**: `SmartRouter.match()` (`src/router/smart-router/router.ts:21-61`) tenta cada router da lista, em ordem, registrando todas as rotas (`router.add`) e chamando `router.match`; se o router lançar `UnsupportedPathError`, pula para o próximo.
- O **primeiro que funcionar** vence: `match` é sobrescrito (`this.match = router.match.bind(router)`), `#routers` é reduzido a só esse router e `#routes` é zerado — ou seja, a escolha acontece de forma lazy, na primeira requisição, e fica fixada depois.
