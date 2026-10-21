# hono C rep 2 pergunta 1

> Como o Hono escolhe o router padrão e como o SmartRouter decide qual router usar? Cite arquivos e funções principais. Até 10 linhas.

- **Router padrão**: `src/hono.ts` (classe `Hono`) define no construtor `this.router = new SmartRouter({ routers: [new RegExpRouter(), new TrieRouter()] })` (src/hono.ts:30-31). Presets alternativos: `preset/quick.ts` usa `LinearRouter`+`TrieRouter`; `preset/tiny.ts` usa só `PatternRouter`. Pode ser sobrescrito via `new Hono({ router })`.
- **Decisão do SmartRouter**: em `src/router/smart-router/router.ts`, o método `match()` (linha 21) tenta cada router da lista `#routers` em ordem: registra todas as rotas pendentes nele (`router.add`) e chama `router.match`. Se o router lançar `UnsupportedPathError` (ex.: RegExpRouter não suporta certo padrão), passa para o próximo. O primeiro que funcionar é fixado como `activeRouter`, e `this.match` é rebindado direto pra ele (linha 46) — ou seja, a escolha é feita lazy, na primeira requisição, e congelada depois.
