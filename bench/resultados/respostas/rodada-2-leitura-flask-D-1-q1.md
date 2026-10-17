# flask D rep 1 pergunta 1

> Como o Flask torna o objeto global 'request' disponível durante uma requisição e o que acontece no fim dela? Cite arquivos e funções principais. Responda em até 10 linhas.

Em cada requisição, `Flask.wsgi_app` (src/flask/app.py:1566) cria um `AppContext` via `self.request_context(environ)` (app.py:1501) e chama `ctx.push()` dentro de um `try` (app.py:1596).

`AppContext.push()` (src/flask/ctx.py:416) seta a contextvar global `_cv_app` (definida em src/flask/globals.py:40) com `_cv_app.set(self)` e, se houver uma `Request` associada (`self._request`), chama `match_request()` para rotear.

O proxy `request` (globals.py:57) é um `werkzeug.local.LocalProxy(_cv_app, "request", ...)`: a cada atributo acessado ele faz `_cv_app.get()` e pega `.request` desse `AppContext` — por isso parece "global" mas é isolado por thread/task.

No `finally` do `wsgi_app` (app.py:1616), `ctx.pop(error)` é chamado sempre, mesmo com exceção. `AppContext.pop()` (ctx.py:446) reseta a contextvar, roda `app.do_teardown_request`/`do_teardown_appcontext` e, se havia request, fecha o objeto (`self._request.close()`).
