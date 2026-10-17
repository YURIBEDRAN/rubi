# flask D rep 3 pergunta 1

> Como o Flask torna o objeto global 'request' disponível durante uma requisição e o que acontece no fim dela? Cite arquivos e funções principais. Responda em até 10 linhas.

Confirmado no código atual:

- **`Flask.wsgi_app`** (`src/flask/app.py:1566`, push na 1596) cria o `AppContext` e chama `ctx.push()`.
- **`AppContext.push`** (`src/flask/ctx.py:416`) faz `_cv_app.set(self)` (linha 433), guardando o contexto numa `ContextVar`.
- **`flask.request`** (`src/flask/globals.py:57`) é um `werkzeug.local.LocalProxy(_cv_app, "request", ...)`: a cada acesso ele resolve `_cv_app.get().request` dinamicamente, isolado por thread/task — não é um objeto fixo.
- No fim: `wsgi_app` chama **`ctx.pop(error)`** (`app.py:1616`, dentro de `finally`), que executa `AppContext.pop` (`ctx.py:446`): roda `do_teardown_request`/`do_teardown_appcontext` e por fim `_cv_app.reset(self._cv_token)` (linha 498), removendo o contexto e invalidando o proxy.
