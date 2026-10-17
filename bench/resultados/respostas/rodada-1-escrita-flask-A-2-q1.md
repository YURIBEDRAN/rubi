# flask A rep 2 pergunta 1

> Como o Flask torna o objeto global 'request' disponível durante uma requisição e o que acontece no fim dela? Cite arquivos e funções principais. Responda em até 10 linhas.

**Disponibilização:** `Flask.wsgi_app` (src/flask/app.py) cria um `AppContext` via `self.request_context(environ)` e chama `ctx.push()` (`AppContext.push`, src/flask/ctx.py). `push()` faz `_cv_app.set(self)`, armazenando o contexto numa `ContextVar` (`_cv_app`, definida em src/flask/ctx.py).

Os objetos globais `request`, `g`, `session`, `current_app` (src/flask/globals.py) são `werkzeug.local.LocalProxy` ligados a essa mesma `_cv_app`: cada acesso de atributo resolve dinamicamente para o `AppContext` ativo (ex.: `request` → `ctx.request`). Por isso "funcionam" como globais, mas na verdade são por-contexto (thread/task local).

**Fim da requisição:** no `finally` de `wsgi_app`, é chamado `ctx.pop(error)` (`AppContext.pop`, ctx.py), que executa `app.do_teardown_request`, fecha `self._request` (`close()`), executa `app.do_teardown_appcontext`, e por fim `_cv_app.reset(self._cv_token)`, removendo o contexto — tornando `request`/`g`/`session` "unbound" novamente.
