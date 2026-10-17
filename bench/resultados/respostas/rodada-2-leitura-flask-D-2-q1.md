# flask D rep 2 pergunta 1

> Como o Flask torna o objeto global 'request' disponível durante uma requisição e o que acontece no fim dela? Cite arquivos e funções principais. Responda em até 10 linhas.

`flask.request` (src/flask/globals.py:57) é um `werkzeug.local.LocalProxy` ligado à ContextVar `_cv_app`. A cada acesso ele resolve dinamicamente `_cv_app.get()` e pega o atributo `.request` do `AppContext` corrente — não é um objeto fixo.

No início da requisição, `Flask.wsgi_app` (src/flask/app.py) cria o `AppContext` e chama `ctx.push()`. `AppContext.push()` (src/flask/ctx.py:416) seta a ContextVar com `_cv_app.set(self)` (linha 433), guardando o token; é isso que torna `request` "visível" dali em diante (isolado por thread/task via contextvars).

No fim, dentro de um `finally`, `wsgi_app` chama `ctx.pop(error)`. `AppContext.pop()` (ctx.py:446) roda os teardowns (`do_teardown_request`/`do_teardown_appcontext`) e then faz `_cv_app.reset(self._cv_token)` (linha 498), removendo o contexto da ContextVar — a partir daí, acessar `request` levanta erro de "working outside of request context".
