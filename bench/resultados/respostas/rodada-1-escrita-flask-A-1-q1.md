# flask A rep 1 pergunta 1

> Como o Flask torna o objeto global 'request' disponível durante uma requisição e o que acontece no fim dela? Cite arquivos e funções principais. Responda em até 10 linhas.

Agora tenho o suficiente para responder com precisão.

Quando a requisição WSGI chega, `Flask.wsgi_app` (src/flask/app.py:1566) cria um `AppContext`/`RequestContext` via `self.request_context(environ)` e chama `ctx.push()` (`AppContext.push`, ctx.py:416). `push()` guarda o contexto numa `ContextVar` global `_cv_app` (ctx.py:40) e, se houver request, abre a sessão e roteia (`match_request`). O objeto `request` em `flask/globals.py:57` é um `werkzeug.local.LocalProxy` que lê o atributo `"request"` do objeto atual em `_cv_app` — por isso parece "global" mas na verdade é thread/task-local via `ContextVar`.

No fim, o `finally` de `wsgi_app` chama `ctx.pop(error)` (`AppContext.pop`, ctx.py:446), que dispara os callbacks de `teardown_request`/`teardown_appcontext`, reseta o token da `ContextVar` (removendo o contexto) e fecha a sessão — tornando `request` inacessível fora do contexto.
