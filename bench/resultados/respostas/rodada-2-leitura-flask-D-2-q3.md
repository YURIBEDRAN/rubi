# flask D rep 2 pergunta 3

> Se uma extensão precisa guardar estado por requisição sem usar o objeto g, qual mecanismo do Flask ela deve usar e em que ponto esse estado é limpo? Cite arquivos e funções. Até 10 linhas.

Sem usar `g`, a extensão deve guardar atributos diretamente no objeto `AppContext` atual (`src/flask/ctx.py:260`), obtido via `_cv_app.get()` (ex.: `flask.globals._cv_app`) — já que, nesta versão, `AppContext`/`RequestContext` são unificados nessa classe.

Esse estado é limpo no `pop()` do contexto: `AppContext.pop` (`src/flask/ctx.py:446`) chama `_cv_app.reset(self._cv_token)` (linha 498), descartando a referência ao contexto (e seus atributos) inteiro. O `pop` é disparado no `finally` de `Flask.wsgi_app` (`src/flask/app.py:~1605`), após `app.do_teardown_request`/`do_teardown_appcontext` (`app.py:1420` e `1453`) — ou seja, o estado existe até o fim do teardown da requisição/contexto.
