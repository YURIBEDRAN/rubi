# flask C rep 2 pergunta 3

> Se uma extensão precisa guardar estado por requisição sem usar o objeto g, qual mecanismo do Flask ela deve usar e em que ponto esse estado é limpo? Cite arquivos e funções. Até 10 linhas.

Mecanismo: um `contextvars.ContextVar` próprio — o mesmo padrão que o Flask usa internamente (`_cv_app` em `src/flask/globals.py:40`). Em vez de usar `g` (que é só o namespace padrão exposto via essa mesma ContextVar), a extensão guarda seus dados como atributo no objeto `AppContext` daquela requisição (acessível via `app_ctx`/`_cv_app.get()`), já que esse objeto é único por push de contexto.

Limpeza: em `AppContext.pop()` (`src/flask/ctx.py:446`), no token `_cv_app.reset(self._cv_token)` (linha 498) — isso roda depois de `app.do_teardown_request()` (linha 490) e `request.close()` (linha 493), ou seja, depois dos teardown hooks e antes do sinal `appcontext_popped` (linha 502).
