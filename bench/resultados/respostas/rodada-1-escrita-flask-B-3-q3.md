# flask B rep 3 pergunta 3

> Se uma extensão precisa guardar estado por requisição sem usar o objeto g, qual mecanismo do Flask ela deve usar e em que ponto esse estado é limpo? Cite arquivos e funções. Até 10 linhas.

**Mecanismo:** guardar o estado como atributo no próprio objeto `AppContext` (o mesmo onde vive o `g`), obtido via a contextvar `_cv_app` (`src/flask/globals.py`), ou registrar limpeza com `teardown_appcontext`/`teardown_request`.

**Onde é limpo:** em `AppContext.pop()` (`src/flask/ctx.py:446-499`). Quando `_push_count` chega a 0, ele chama `app.do_teardown_request()` e `app.do_teardown_appcontext()` (linhas 490/496) e depois `_cv_app.reset(self._cv_token)` (linha 498) — isso destrói a referência ao `AppContext`, então qualquer atributo guardado nele (não só em `g`) some junto.

Esse `pop()` é disparado no `finally` de `Flask.wsgi_app` (`src/flask/app.py`, ~linha 1605), garantindo limpeza mesmo com exceção.
