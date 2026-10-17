# hono A rep 1 pergunta 2

> Como um middleware no Hono lê e altera a resposta (c.res e next())? Onde a cadeia de middlewares é composta? Cite arquivos e funções. Até 10 linhas.

A cadeia é composta em `compose()` (src/compose.ts:15-73), que recebe o array de middlewares casados pela rota e retorna uma função `dispatch(i)` recursiva (estilo koa-compose).

Um middleware recebe `(c, next)`; ao chamar `next()` ele invoca `dispatch(i+1)`, executando o próximo middleware/handler antes de continuar — por isso código após `await next()` roda "no caminho de volta", podendo ler/alterar `c.res` (ex.: `c.res = c.res.clone()` ou setar headers) depois que o handler final já escreveu a resposta.

É chamado em `Hono.dispatch`/`#dispatch` (src/hono-base.ts:469-473, `compose(matchResult[0], this.errorHandler, this.#notFoundHandler)` seguido de `composed(c)`), e também na linha 243 para o caso de rota única sem necessidade de compor.

Dentro de `dispatch(i)` (compose.ts:67-69), o retorno do handler só é gravado em `context.res` se `context.finalized === false` (ou se houve erro), permitindo que um middleware "envolvente" sobrescreva a resposta de um handler interno após o `next()` retornar.
