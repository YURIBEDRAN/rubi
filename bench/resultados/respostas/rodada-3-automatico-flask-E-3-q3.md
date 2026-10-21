# flask E rep 3 pergunta 3

> Se uma extensão precisa guardar estado por requisição sem usar o objeto g, qual mecanismo do Flask ela deve usar e em que ponto esse estado é limpo? Cite arquivos e funções. Até 10 linhas.

Use um `contextvars.ContextVar` próprio (como o Flask faz com `_cv_app` em `src/flask/globals.py:40`), armazenando o estado num objeto que você mesmo gerencia — nunca escreva no `AppContext`/`g` de outra extensão.

O padrão do próprio Flask: `AppContext.push()` faz `self._cv_token = _cv_app.set(self)` (`src/flask/ctx.py:433`) e `AppContext.pop()` faz `_cv_app.reset(self._cv_token)` (`src/flask/ctx.py:498`), chamado ao final do request via `RequestContext.pop()` (também em `ctx.py`), que por sua vez é disparado em `finally` dentro de `Flask.wsgi_app()` (`src/flask/app.py`).

Ou seja: o mecanismo é um `ContextVar` com `set`/`reset` espelhando push/pop de contexto, e a limpeza ocorre no `pop()` do contexto (app ou request), garantido pelo `finally` em `wsgi_app`.
