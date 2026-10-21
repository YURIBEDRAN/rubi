# flask E rep 1 pergunta 3

> Se uma extensão precisa guardar estado por requisição sem usar o objeto g, qual mecanismo do Flask ela deve usar e em que ponto esse estado é limpo? Cite arquivos e funções. Até 10 linhas.

Mecanismo: um `contextvars.ContextVar` próprio (o mesmo padrão que o Flask usa internamente), e não um atributo em `g`. É assim que `_cv_app` é definido em `src/flask/globals.py:40` e setado em `AppContext.push` (`src/flask/ctx.py:433`, `self._cv_token = _cv_app.set(self)`).

A limpeza ocorre em `AppContext.pop` (`src/flask/ctx.py:498`, `_cv_app.reset(self._cv_token)`), chamado dentro de `RequestContext.pop` (`ctx.py:446`). Isso é disparado no `finally` de `Flask.wsgi_app` (`src/flask/app.py:1616`, `ctx.pop(error)`) — ou seja, ao final de cada request, após o teardown.
