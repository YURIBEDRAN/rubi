# flask C rep 3 pergunta 1

> Como o Flask torna o objeto global 'request' disponível durante uma requisição e o que acontece no fim dela? Cite arquivos e funções principais. Responda em até 10 linhas.

`request` em `src/flask/globals.py` é um `LocalProxy` (do Werkzeug) sobre a `ContextVar` `_cv_app`, lendo o atributo `"request"` do objeto `AppContext` atual. Quando a requisição chega, o WSGI app (`Flask.wsgi_app` em `src/flask/app.py`) cria um `AppContext` (que nesta versão já engloba o antigo `RequestContext`) e chama `AppContext.push()` (`src/flask/ctx.py:416`), que faz `_cv_token = _cv_app.set(self)` — isso é o que torna `request`/`g`/`session`/`current_app` resolvíveis via proxy durante a requisição.

No fim, `AppContext.pop()` (`ctx.py:446`) roda `app.do_teardown_request`, fecha o request (`self._request.close()`), roda `app.do_teardown_appcontext`, e então `_cv_app.reset(self._cv_token)` — restaurando o estado anterior da context var, o que faz os proxies globais voltarem a ficar "fora de contexto" (erro `_no_req_msg`/`_no_app_msg` se acessados depois).
