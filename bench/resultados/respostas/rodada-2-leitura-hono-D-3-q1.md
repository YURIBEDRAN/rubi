# hono D rep 3 pergunta 1

> Como o Hono escolhe o router padrão e como o SmartRouter decide qual router usar? Cite arquivos e funções principais. Até 10 linhas.

**Padrão (`src/hono.ts:28-32`):** no construtor do `Hono`, `this.router` recebe `options.router` se fornecida, senão instancia `new SmartRouter({ routers: [new RegExpRouter(), new TrieRouter()] })`.

**Decisão do SmartRouter (`src/router/smart-router/router.ts`):** `add()` só acumula rotas em `#routes`. No primeiro `match()` (`router.ts:21-61`), ele itera os `#routers` na ordem dada, re-adiciona todas as rotas em cada um e tenta `match`; se o router lançar `UnsupportedPathError` (padrão de rota que ele não suporta, ex. RegExpRouter com certos wildcards), passa pro próximo. O primeiro que não lançar erro "ganha": `this.match` é rebindado direto pro `match` dele (`router.ts:46`) e os demais são descartados (`#routers = [router]`), então chamadas seguintes vão direto ao router escolhido — sem re-testar.
