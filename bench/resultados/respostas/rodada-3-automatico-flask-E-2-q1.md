# flask E rep 2 pergunta 1

> Como o Flask torna o objeto global 'request' disponível durante uma requisição e o que acontece no fim dela? Cite arquivos e funções principais. Responda em até 10 linhas.

No sentido estrito, Flask hoje unificou `request_ctx` em `app_ctx`: `request` (em `src/flask/globals.py`) é um `LocalProxy` baseado numa `ContextVar` (`_cv_app`), que resolve para `_cv_app.get().request` a cada acesso.

Quando o WSGI app recebe a requisição, `Flask.wsgi_app` (em `src/flask/app.py`) cria um `AppContext`/`RequestContext` e chama `ctx.push()` (`src/flask/ctx.py:416`), que faz `self._cv_token = _cv_app.set(self)` — é isso que torna o proxy `request` resolvível durante o request. `push()` também dispara `appcontext_pushed` e abre a sessão.

No fim, `ctx.pop()` (`ctx.py:446`) chama `app.do_teardown_request`, fecha `self._request`, chama `app.do_teardown_appcontext`, faz `_cv_app.reset(self._cv_token)` (removendo o contexto, então `request` deixa de resolver) e envia o sinal `appcontext_popped`. `push`/`pop` são acionados automaticamente pelo `with ctx:` (`__enter__`/`__exit__`, `ctx.py:506-515`) usado em `wsgi_app`.
