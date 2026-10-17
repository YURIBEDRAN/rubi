# flask A rep 3 pergunta 1

> Como o Flask torna o objeto global 'request' disponível durante uma requisição e o que acontece no fim dela? Cite arquivos e funções principais. Responda em até 10 linhas.

Agora tenho os detalhes exatos. Resposta pronta.

No Flask, `request` é um `LocalProxy` (`werkzeug.local.LocalProxy`) definido em `src/flask/globals.py:57`, apontando para o atributo `"request"` de uma `ContextVar` chamada `_cv_app`. A cada requisição, `Flask.wsgi_app()` (`src/flask/app.py:1566`) cria o contexto com `self.request_context(environ)` e chama `ctx.push()` (`AppContext.push`, `src/flask/ctx.py:416`), que faz `_cv_app.set(self)` — nesse momento o proxy `request` passa a resolver para o objeto `Request` guardado nesse contexto (criado via `AppContext.from_environ`, `ctx.py:340`). No `finally` do `wsgi_app`, é chamado `ctx.pop(error)` (`ctx.py:446`), que executa os teardowns (`do_teardown_request`, `request.close()`, `do_teardown_appcontext`), dispara o signal `appcontext_popped` e por fim `_cv_app.reset(self._cv_token)` — removendo o valor da `ContextVar`, de forma que `request` volta a ficar indisponível (levanta `RuntimeError`) fora da requisição.
