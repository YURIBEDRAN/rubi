# hono A rep 3 pergunta 1

> Como o Hono escolhe o router padrão e como o SmartRouter decide qual router usar? Cite arquivos e funções principais. Até 10 linhas.

Em `src/hono.ts:28-32`, o construtor de `Hono` usa `options.router` se fornecido, senão cria `new SmartRouter({ routers: [new RegExpRouter(), new TrieRouter()] })` — esse é o default.

O `SmartRouter` (`src/router/smart-router/router.ts`) é "lazy": `add()` só acumula as rotas (`#routes`). No primeiro `match()` (linha 21), ele tenta cada router da lista, em ordem, registrando todas as rotas nele e chamando `router.match()`; se o router lançar `UnsupportedPathError` (ex.: RegExpRouter não suporta certos padrões dinâmicos), pula para o próximo. O primeiro que funcionar é fixado como router ativo (`this.match = router.match.bind(router)`, `#routers = [router]`), então os `match()` seguintes vão direto nele — na prática, RegExpRouter é preferido por performance e TrieRouter serve de fallback.
