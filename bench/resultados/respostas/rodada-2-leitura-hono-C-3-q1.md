# hono C rep 3 pergunta 1

> Como o Hono escolhe o router padrão e como o SmartRouter decide qual router usar? Cite arquivos e funções principais. Até 10 linhas.

Em `src/hono.ts:28-32`, o construtor de `Hono` usa `options.router` se fornecido; senão cria um `SmartRouter` com `[RegExpRouter, TrieRouter]`.

O `SmartRouter.match()` (`src/router/smart-router/router.ts:21-61`) testa os routers na ordem do array: registra todas as rotas acumuladas no router atual (`router.add`) e chama `router.match`; se o router lançar `UnsupportedPathError` (rota incompatível, ex.: padrões dinâmicos no RegExpRouter), passa para o próximo. No primeiro sucesso, "trava" nele — faz `this.match = router.match.bind(router)` e descarta os demais — tornando essa escolha definitiva para as próximas chamadas.
