# hono D rep 2 pergunta 1

> Como o Hono escolhe o router padrão e como o SmartRouter decide qual router usar? Cite arquivos e funções principais. Até 10 linhas.

- **Padrão:** `src/hono.ts:30-31` instancia `new SmartRouter({ routers: [new RegExpRouter(), new TrieRouter()] })` — essa é a classe `Hono` padrão (default export).
- **SmartRouter:** `src/router/smart-router/router.ts`. No primeiro `match(method, path)` (linha 21), ele replica todas as rotas registradas (`#routes`) em cada router candidato, na ordem do array, e tenta `router.match(...)`. Se o router lançar `UnsupportedPathError`, passa para o próximo; o primeiro que não lançar "ganha".
- Após decidir, trava nesse router: substitui `this.match` por `router.match.bind(router)` e zera `#routers`/`#routes`, então chamadas futuras vão direto nele (sem repetir a escolha). `activeRouter` (linha 63) expõe o router vencedor.
