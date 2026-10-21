# hono C rep 3 pergunta 1

> Como o Hono escolhe o router padrão e como o SmartRouter decide qual router usar? Cite arquivos e funções principais. Até 10 linhas.

Hono padrão (`src/hono.ts:28-31`) usa `SmartRouter({ routers: [RegExpRouter, TrieRouter] })` quando nenhum `router` é passado nas options.

O `SmartRouter` (`src/router/smart-router/router.ts`) só decide na primeira chamada de `match()`: tenta cada router da lista em ordem, chamando `router.add` com as rotas acumuladas e depois `router.match`; se um router lança `UnsupportedPathError` (padrões que ele não suporta, ex. RegExpRouter com certas rotas dinâmicas), passa pro próximo. O primeiro que não lançar erro "vence" — `this.match` é rebindado direto pro `match` desse router e `#routers` é reduzido a só ele, então as próximas chamadas pulam a lógica de seleção.
