# hono B rep 2 pergunta 1

> Como o Hono escolhe o router padrão e como o SmartRouter decide qual router usar? Cite arquivos e funções principais. Até 10 linhas.

- **Padrão:** `src/hono.ts:28-32` — no construtor de `Hono`, se `options.router` não for informado, usa `new SmartRouter({ routers: [new RegExpRouter(), new TrieRouter()] })`.
- **Decisão do SmartRouter:** `src/router/smart-router/router.ts`, método `match()` (linha 21). Na primeira chamada, para cada router na lista (`#routers`), registra todas as rotas acumuladas (`router.add(...)`) e tenta `router.match()`; se lançar `UnsupportedPathError`, pula pro próximo. O primeiro que funcionar "ganha": `this.match` é reatribuído ao `match` desse router vencedor (`match = router.match.bind(router)`), `#routers` é reduzido a só ele, e chamadas futuras vão direto nele (sem re-testar).
