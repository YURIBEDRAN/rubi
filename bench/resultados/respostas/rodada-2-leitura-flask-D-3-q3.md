# flask D rep 3 pergunta 3

> Se uma extensão precisa guardar estado por requisição sem usar o objeto g, qual mecanismo do Flask ela deve usar e em que ponto esse estado é limpo? Cite arquivos e funções. Até 10 linhas.

Sem usar `g`, a extensão deve guardar o estado como atributo no próprio objeto `AppContext` ativo (obtido via `_cv_app.get()`, `src/flask/globals.py`) — é o mesmo mecanismo que `g` usa internamente (`self.g = app.app_ctx_globals_class()` em `AppContext.__init__`, `src/flask/ctx.py:312`).

Esse estado é limpo em `AppContext.pop()` (`src/flask/ctx.py:446`): depois de rodar `do_teardown_request`/`do_teardown_appcontext` (linhas 490/496), a linha `_cv_app.reset(self._cv_token)` (linha 498) descarta a referência à `ContextVar`, e o próprio objeto `AppContext` (com qualquer atributo customizado) vira elegível para GC. O `pop` é chamado no `finally` de `Flask.wsgi_app` (`src/flask/app.py` ~1605).
