# hono B rep 1 pergunta 1

> Como o Hono escolhe o router padrão e como o SmartRouter decide qual router usar? Cite arquivos e funções principais. Até 10 linhas.

**Router padrão** (`src/hono.ts:28-31`): se `options.router` não for passado, o construtor de `Hono` usa `new SmartRouter({ routers: [new RegExpRouter(), new TrieRouter()] })`.

**Decisão do SmartRouter** (`src/router/smart-router/router.ts`):
- `add()` apenas acumula as rotas em `#routes` (ainda não decide nada).
- No primeiro `match()` (linhas 21-61), ele itera os routers candidatos na ordem dada, registra (`add`) todas as rotas pendentes nesse router e chama `router.match(...)`. Se o router lançar `UnsupportedPathError` (padrão de rota que ele não suporta, ex.: TrieRouter não suporta certas regexes complexas que RegExpRouter também rejeitaria, ou vice-versa), o SmartRouter pula para o próximo da lista.
- O primeiro router que não lançar erro "ganha": o SmartRouter substitui `this.match` por `router.match.bind(router)` (linha 46) e fixa `#routers = [router]`, descartando os demais — ou seja, a escolha é feita uma única vez, no primeiro match, e todas as chamadas seguintes já vão direto pro router escolhido.
