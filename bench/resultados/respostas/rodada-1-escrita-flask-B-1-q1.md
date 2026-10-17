# flask B rep 1 pergunta 1

> Como o Flask torna o objeto global 'request' disponível durante uma requisição e o que acontece no fim dela? Cite arquivos e funções principais. Responda em até 10 linhas.

Em `src/flask/globals.py`, `request` é um `LocalProxy` (do Werkzeug) ligado à `ContextVar _cv_app`, buscando o atributo `"request"` do `AppContext` ativo — por isso parece "global" mas na verdade resolve por thread/task via contextvars.

Quem popula isso é `AppContext.push()` em `src/flask/ctx.py:416`, chamado por `Flask.wsgi_app` (via `RequestContext`/`AppContext` em `src/flask/app.py`) a cada requisição: faz `_cv_app.set(self)`, abre a sessão e roteia (`match_request`).

No fim, `AppContext.pop()` (`ctx.py:446`) é chamado (normalmente num `finally` dentro de `wsgi_app`): executa as funções de `teardown_request`/`teardown_appcontext`, dispara os signals `request_tearing_down`/`appcontext_popped` e então reseta a `ContextVar`, fazendo `request` voltar a ficar "unbound" (lançando erro de "working outside of request context" se acessado depois).
