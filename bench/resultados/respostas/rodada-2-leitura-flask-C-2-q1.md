# flask C rep 2 pergunta 1

> Como o Flask torna o objeto global 'request' disponível durante uma requisição e o que acontece no fim dela? Cite arquivos e funções principais. Responda em até 10 linhas.

`request` é um `LocalProxy` (`src/flask/globals.py:57`) que aponta para a `ContextVar` `_cv_app`. Ele não guarda o objeto em si: em cada acesso chama `_get_current_object`, que lê a `RequestContext`/`AppContext` ativa nessa `ContextVar` e retorna seu atributo `request`.

A requisição entra pelo `Flask.wsgi_app` (`src/flask/app.py`), que cria `self.request_context(environ)` e chama `ctx.push()` (`RequestContext.push` em `src/flask/ctx.py`), que faz `_cv_app.set(self)` — é isso que "liga" o proxy global. No `finally` do `wsgi_app`, `ctx.pop()` é chamado: ele executa as funções de teardown registradas (`teardown_request`/`teardown_appcontext`), envia o sinal `appcontext_popped` e restaura o token anterior da `ContextVar`, tornando `request` novamente inacessível (lançando `RuntimeError`/`_no_req_msg`) fora desse contexto.
