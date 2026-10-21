# flask C rep 1 pergunta 3

> Se uma extensão precisa guardar estado por requisição sem usar o objeto g, qual mecanismo do Flask ela deve usar e em que ponto esse estado é limpo? Cite arquivos e funções. Até 10 linhas.

Ela deve usar o `contextvars.ContextVar` que o próprio Flask expõe (`_cv_request`/`_cv_app` em `src/flask/globals.py:40` e análogo para request), guardando dados num `ContextVar` próprio ou lendo/escrevendo atributos no objeto de contexto (`AppContext`/`RequestContext` em `src/flask/ctx.py`), em vez de `g`.

Esse estado é limpo quando o contexto é desempilhado: `RequestContext.pop()` (chamado ao final de `App.wsgi_app` em `src/flask/app.py`, dentro do `finally`) executa os teardown handlers e depois `ctx.pop()` reseta o `ContextVar` via `_cv_app.reset(self._cv_token)` (`src/flask/ctx.py:446` em diante), destruindo o `AppContext`/`RequestContext` e tudo que pendia dele.
