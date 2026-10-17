# flask A rep 1 pergunta 3

> Se uma extensão precisa guardar estado por requisição sem usar o objeto g, qual mecanismo do Flask ela deve usar e em que ponto esse estado é limpo? Cite arquivos e funções. Até 10 linhas.

Em Flask, uma extensão deve guardar estado atrelado ao próprio objeto `RequestContext` (não ao `g`, que é escopo de app context): atribuir um atributo customizado em `flask.request_ctx` (via `_request_ctx_stack`/`copy_current_request_context` ou simplesmente `ctx = _cv_request.get(); ctx.minha_extensao = ...`), já que esse objeto vive exatamente um request.

- Definição: `RequestContext` em `src/flask/ctx.py:~380` em diante.
- Push: `RequestContext.push()` (`src/flask/ctx.py:416`) — cria/empilha o contexto no `ContextVar` `_cv_request`.
- Limpeza: `RequestContext.pop()` (`src/flask/ctx.py:446`), chamado ao final do request (via `Flask.wsgi_app`/`full_dispatch_request` no `app.py`, ou ao saída do `with app.test_request_context(): ...`), que reseta o `ContextVar` e descarta o objeto — é aí que o estado atribuído a ele desaparece.
