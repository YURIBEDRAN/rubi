# flask A rep 1 pergunta 1

> Como o Flask torna o objeto global 'request' disponível durante uma requisição e o que acontece no fim dela? Cite arquivos e funções principais. Responda em até 10 linhas.

Confirmado: nesta versão, `AppContext` (em `flask/ctx.py`) unifica app e request context.

**Durante a requisição:** `Flask.wsgi_app` (flask/app.py) cria o `AppContext` e chama `ctx.push()` (flask/ctx.py:416), que faz `self._cv_token = _cv_app.set(self)` numa `ContextVar`. O objeto `request` exportado em `flask/globals.py` é um `werkzeug.local.LocalProxy` que lê esse contextvar a cada acesso de atributo — por isso parece "global" mas na verdade é thread/task-local.

**No fim:** `wsgi_app` chama `ctx.pop()` (ctx.py:446), que decrementa `_push_count`, executa `do_teardown_request`/`do_teardown_appcontext`, fecha `self._request` (`._request.close()`) e por fim `_cv_app.reset(self._cv_token)`, removendo o contexto — a partir daí qualquer acesso a `request` fora de um contexto ativo gera `RuntimeError`.
