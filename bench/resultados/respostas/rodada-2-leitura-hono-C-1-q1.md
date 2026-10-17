# hono C rep 1 pergunta 1

> Como o Hono escolhe o router padrão e como o SmartRouter decide qual router usar? Cite arquivos e funções principais. Até 10 linhas.

Hono define o router padrão em `src/hono.ts` (classe `Hono`, linhas ~30-31): sempre instancia `new SmartRouter({ routers: [new RegExpRouter(), new TrieRouter()] })`, com `RegExpRouter` tentado primeiro.

O `SmartRouter.match()` (`src/router/smart-router/router.ts:21-61`) adia a decisão até a primeira chamada real de `match`: nesse momento registra todas as rotas acumuladas e tenta cada router da lista em ordem, usando o primeiro que não lança `UnsupportedPathError` (ex.: padrões não suportados pelo `RegExpRouter`). Ao achar um que funciona, fixa `this.match = router.match.bind(router)` e descarta os demais — a escolha fica permanente para aquela instância.
