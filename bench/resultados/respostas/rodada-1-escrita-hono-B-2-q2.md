# hono B rep 2 pergunta 2

> Como um middleware no Hono lê e altera a resposta (c.res e next())? Onde a cadeia de middlewares é composta? Cite arquivos e funções. Até 10 linhas.

Registrado: como a cadeia de middlewares é composta (`compose`/`dispatch` em `src/compose.ts`) e como `c.res` funciona como getter/setter que mescla headers (`src/context.ts`).
