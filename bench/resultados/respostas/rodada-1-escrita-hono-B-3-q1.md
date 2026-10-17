# hono B rep 3 pergunta 1

> Como o Hono escolhe o router padrão e como o SmartRouter decide qual router usar? Cite arquivos e funções principais. Até 10 linhas.

- **Padrão**: `src/hono.ts:30-31` cria `new SmartRouter({ routers: [new RegExpRouter(), new TrieRouter()] })` — essa é a classe `Hono` padrão (há variantes `hono-base.ts` sem router fixo).
- **Decisão do SmartRouter**: `src/router/smart-router/router.ts` — no primeiro `match()` (linha 21), ele registra todas as rotas em cada router candidato (linha 36) e testa `router.match()` em ordem (RegExpRouter antes, depois TrieRouter). O primeiro que não lançar `UnsupportedPathError` (ex.: padrões não suportados pelo RegExpRouter, como certos tipos de rotas dinâmicas) "ganha" (linha 38-44).
- Após decidir, ele faz bind do `match` do router vencedor direto na instância (`this.match = router.match.bind(router)`, linha 46) e descarta os demais, então as próximas chamadas pulam a lógica de seleção.
