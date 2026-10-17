# flask C rep 3 pergunta 3

> Se uma extensão precisa guardar estado por requisição sem usar o objeto g, qual mecanismo do Flask ela deve usar e em que ponto esse estado é limpo? Cite arquivos e funções. Até 10 linhas.

Sem usar `g`, a extensão deve usar uma `contextvars.ContextVar` própria (o mesmo mecanismo que o Flask usa internamente para `g`/`request`), fazendo `token = minha_cv.set(valor)` no início do request e `minha_cv.reset(token)` no fim — seguindo o padrão de `_cv_app`/`_cv_request` em `src/flask/globals.py`.

O ciclo de vida é controlado por `AppContext`/`RequestContext` em `src/flask/ctx.py`:
- `AppContext.push()` (linha 416) faz `self._cv_token = _cv_app.set(self)`.
- `AppContext.pop()` (linha 446) é onde a contextvar é resetada (`_cv_app.reset(self._cv_token)`, mais abaixo na função) e os teardown handlers/sinais (`appcontext_popped`) são disparados.

Esse `pop()` é chamado automaticamente ao fim do `with RequestContext.__exit__` / em `Flask.wsgi_app` (`src/flask/app.py`), garantindo que o estado seja limpo mesmo em exceção — então a extensão deve registrar sua limpeza via `teardown_appcontext`/`teardown_request` (`src/flask/app.py`) ou confiar no `reset()` da própria ContextVar nesse ponto.
