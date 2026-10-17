# hono B rep 3 pergunta 3

> Quero um middleware que meça o tempo de cada rota e devolva num header. Onde e como encaixar, considerando a composição de middlewares e o router? Cite arquivos e funções. Até 10 linhas.

Registrado: 3 fatos sobre o middleware `timing` existente, a composição via `compose()`/`#dispatch`, e a armadilha de `c.res` só existir após `await next()`.
