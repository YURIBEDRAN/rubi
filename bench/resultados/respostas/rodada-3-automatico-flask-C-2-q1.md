# flask C rep 2 pergunta 1

> Como o Flask torna o objeto global 'request' disponível durante uma requisição e o que acontece no fim dela? Cite arquivos e funções principais. Responda em até 10 linhas.

Agora tenho o que preciso para responder com precisão.

**Disponibilização:** a cada requisição, `Flask.wsgi_app` (`src/flask/app.py:1566`) cria um `AppContext` via `self.request_context(environ)` e chama `ctx.push()` (`src/flask/ctx.py:416`). `push()` guarda o contexto numa `ContextVar` (`_cv_app`, em `src/flask/globals.py:40`) e, se há `_request`, abre a sessão e roda `match_request()`. `request` (e `session`, `g`, `current_app`) são `LocalProxy` (`globals.py:41-61`) que leem essa `ContextVar` a cada acesso, por isso parecem "globais" mas na verdade são locais ao contexto/thread/task atual.

**Fim da requisição:** no `finally` de `wsgi_app`, `ctx.pop(error)` (`ctx.py:446`) executa `do_teardown_request`, fecha o request (`self._request.close()`), roda `do_teardown_appcontext`, reseta a `ContextVar` (`_cv_app.reset(...)`) e envia o sinal `appcontext_popped`. Depois disso, `request` deixa de resolver e levanta `RuntimeError` ("Working outside of request context").
