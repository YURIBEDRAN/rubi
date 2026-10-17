# hono D rep 1 pergunta 1

> Como o Hono escolhe o router padrão e como o SmartRouter decide qual router usar? Cite arquivos e funções principais. Até 10 linhas.

- `src/hono.ts:28-32` — o construtor da classe `Hono` define o router padrão: `options.router ?? new SmartRouter({ routers: [new RegExpRouter(), new TrieRouter()] })`.
- `src/router/smart-router/router.ts` — `SmartRouter.match()` (linha 21) tenta cada router da lista, na ordem, registrando antes todas as rotas acumuladas (`add`) nele; se `router.match` lançar `UnsupportedPathError`, pula pro próximo.
- O primeiro que não lançar erro "ganha": `this.match` é rebindado direto pro `match` desse router (linha 46), `#routers` fica só com ele e `#routes` é descartado — ou seja, a decisão é feita na primeira chamada de `match()` e fica fixa (cache) depois disso.
- Como `RegExpRouter` vem primeiro na lista padrão, ele é preferido quando suporta o padrão de rota; `TrieRouter` é o fallback para rotas que o `RegExpRouter` não suporta (lança `UnsupportedPathError`).
