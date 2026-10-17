# flask C rep 1 pergunta 3

> Se uma extensão precisa guardar estado por requisição sem usar o objeto g, qual mecanismo do Flask ela deve usar e em que ponto esse estado é limpo? Cite arquivos e funções. Até 10 linhas.

Isso confirma: nesta versão (3.2+), `RequestContext` foi fundida em `AppContext` (`src/flask/ctx.py:260`), que é empurrada a cada request/comando CLI.

**Resposta:**

Sem usar `g`, a extensão deve guardar o estado como atributo no próprio objeto `request` (`flask.request`, instância de `Request`) ou diretamente na `AppContext` ativa (obtida via `flask.ctx._cv_app.get()`), ambos vinculados ao ciclo de vida da requisição.

Esse estado é limpo quando `AppContext.pop()` executa (`src/flask/ctx.py:446`): ao zerar `_push_count`, ela roda os `teardown_request` funcs e depois os `teardown_appcontext` (ver docstring da classe, `ctx.py:271-273`), reseta o `contextvars.Token` (`_cv_app`) e o objeto `AppContext` — com `request` e qualquer atributo anexado a ele — é descartado. Note que `AppContext` hoje cobre tanto app context quanto request context (nota de versão 3.2 em `ctx.py:286-293`).
