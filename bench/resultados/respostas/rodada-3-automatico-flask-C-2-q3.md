# flask C rep 2 pergunta 3

> Se uma extensão precisa guardar estado por requisição sem usar o objeto g, qual mecanismo do Flask ela deve usar e em que ponto esse estado é limpo? Cite arquivos e funções. Até 10 linhas.

Resposta: a extensão deve usar uma `contextvars.ContextVar` própria (ou guardar atributos diretamente no objeto `AppContext` corrente, obtido via `_cv_app.get()` em `src/flask/globals.py`), e não `g`. Esse `AppContext` é criado por requisição em `AppContext.push` (`src/flask/ctx.py:416`) e destruído em `AppContext.pop` (`src/flask/ctx.py:446`), que roda `Flask.do_teardown_request`/`do_teardown_appcontext` (`src/flask/app.py:1420` e `1453`) e só então chama `_cv_app.reset(self._cv_token)` (`ctx.py:498`), apagando o contexto (e qualquer estado nele ou em ContextVars próprias ligadas a ele). Note que nesta versão `RequestContext` foi fundido em `AppContext` — ambos compartilham a mesma ContextVar `_cv_app`.
