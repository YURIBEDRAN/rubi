# flask A rep 3 pergunta 1

> Como o Flask torna o objeto global 'request' disponível durante uma requisição e o que acontece no fim dela? Cite arquivos e funções principais. Responda em até 10 linhas.

Em Flask (versão interessante: aqui `request_ctx` e `app_ctx` já estão unificados), o fluxo é:

1. `Flask.wsgi_app` (`src/flask/app.py:1566`) cria o contexto com `self.request_context(environ)` (linha 1592), que monta um `AppContext` contendo a `Request` em `self._request`.
2. `ctx.push()` (`AppContext.push`, `src/flask/ctx.py:416`) guarda esse contexto numa `ContextVar` (`_cv_app`, definida em `src/flask/globals.py:40`) via `self._cv_token = _cv_app.set(self)`.
3. O objeto global `request` (`globals.py:57`) é um `werkzeug.local.LocalProxy` ligado a essa mesma `ContextVar`, acessando o atributo `"request"` do contexto ativo — por isso `request` "aparece" automaticamente em qualquer código executado durante a requisição, mesmo sem passá-lo explicitamente.
4. Ao final, `wsgi_app` chama `ctx.pop(error)` (linha 1616) em um `finally`. `AppContext.pop` (`ctx.py:446`) executa `do_teardown_request`, fecha a request (`self._request.close()`), executa `do_teardown_appcontext`, e então `_cv_app.reset(self._cv_token)` — removendo o contexto da `ContextVar`, tornando `request` novamente inacessível ("Working outside of request context").
