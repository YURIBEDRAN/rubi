# flask A rep 2 pergunta 3

> Se uma extensão precisa guardar estado por requisição sem usar o objeto g, qual mecanismo do Flask ela deve usar e em que ponto esse estado é limpo? Cite arquivos e funções. Até 10 linhas.

No Flask, uma extensão que precisa de estado por requisição sem usar `g` deve guardar esse estado como atributo direto no próprio objeto de contexto (`AppContext`, que desde a 3.2 absorveu o antigo `RequestContext`) — o mesmo objeto que hoje guarda `g`, `request` e `session`.

- O contexto é criado por requisição em `Flask.wsgi_app` (`src/flask/app.py:1592`, `ctx = self.request_context(environ)`) e empilhado em `AppContext.push` (`src/flask/ctx.py:416`), que faz `self._cv_token = _cv_app.set(self)` (linha 433) — `_cv_app` é o `ContextVar` definido em `src/flask/globals.py`.
- Uma extensão pode pegar esse objeto com `_cv_app.get()` e setar um atributo arbitrário nele (é o padrão usado antes de `g` existir, análogo ao antigo `_app_ctx_stack.top`).
- A limpeza ocorre em `AppContext.pop` (`src/flask/ctx.py:446`), chamado no `finally` de `wsgi_app` (`app.py:1616`, `ctx.pop(error)`): após rodar os teardowns, faz `_cv_app.reset(self._cv_token)` (`ctx.py:498`), descartando o objeto (e qualquer atributo nele) junto com o contexto.
