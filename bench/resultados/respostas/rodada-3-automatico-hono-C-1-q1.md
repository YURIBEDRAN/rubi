# hono C rep 1 pergunta 1

> Como o Hono escolhe o router padrão e como o SmartRouter decide qual router usar? Cite arquivos e funções principais. Até 10 linhas.

- `Hono` (`src/hono.ts:28-32`): no `options.router` → usa `SmartRouter` com `[RegExpRouter(), TrieRouter()]` (RegExpRouter tem preferência).
- `SmartRouter.match` (`src/router/smart-router/router.ts:21`): na 1ª chamada, registra todas as rotas em cada router da lista, em ordem, e tenta `router.match`; se lançar `UnsupportedPathError` (padrão não suportado, ex. regex complexo no RegExpRouter), passa pro próximo.
- O primeiro router que não lançar erro "ganha": `this.match` é rebindado direto pra ele (`match.bind(router)`) e os demais são descartados — chamadas futuras pulam a lógica de seleção.
