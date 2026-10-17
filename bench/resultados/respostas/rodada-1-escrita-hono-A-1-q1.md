# hono A rep 1 pergunta 1

> Como o Hono escolhe o router padrão e como o SmartRouter decide qual router usar? Cite arquivos e funções principais. Até 10 linhas.

Em `src/hono.ts:28-31` (classe `Hono`), o router padrão é `new SmartRouter({ routers: [new RegExpRouter(), new TrieRouter()] })`, usado quando nenhum `router` é passado nas options.

O `SmartRouter` (`src/router/smart-router/router.ts`) só decide na primeira chamada a `match()`: ele registra todas as rotas acumuladas em cada router candidato, na ordem do array, e tenta `router.match()`. Se o router lançar `UnsupportedPathError` (padrão de rota que ele não suporta, ex. regex complexo no RegExpRouter), passa pro próximo; caso contrário, aquele router "ganha" — `SmartRouter` substitui seu próprio `match` pelo `match` do vencedor (bind) e descarta os demais, fixando a escolha para todas as chamadas seguintes.
