# hono A rep 2 pergunta 2

> Como um middleware no Hono lê e altera a resposta (c.res e next())? Onde a cadeia de middlewares é composta? Cite arquivos e funções. Até 10 linhas.

Em `src/compose.ts`, a função `dispatch()` (dentro de `compose()`) é onde a cadeia é composta: cada handler recebe `(context, () => dispatch(i+1))`, ou seja `next` é a chamada recursiva ao próximo middleware. Um middleware lê `c.res` normalmente, chama `await next()`, e depois pode sobrescrever `c.res = novaResposta` (ex.: `c.res = new Response(...)` ou `c.res.headers.set(...)`) — isso acontece após `dispatch` retornar do próximo nível. O próprio `dispatch` (linhas 67-69) só grava `context.res = res` se o handler retornou algo e `context.finalized === false`, respeitando mutações feitas pelo middleware via `next()`. A composição é chamada em `src/hono-base.ts` (método que monta `composeHandler`/`handleEvent` usando `compose(this.routes...)`).
