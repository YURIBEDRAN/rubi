# flask A rep 3 pergunta 3

> Se uma extensão precisa guardar estado por requisição sem usar o objeto g, qual mecanismo do Flask ela deve usar e em que ponto esse estado é limpo? Cite arquivos e funções. Até 10 linhas.

Confirmado no código em `src/flask/ctx.py` e `src/flask/app.py`. Resposta:

A extensão deve anexar atributos diretamente ao objeto de contexto ativo (a instância de `AppContext`, que desde a 3.2 unifica app/request context), em vez de usar `flask.g`. Esse objeto é obtido via `_cv_app.get()` (ContextVar definida em `src/flask/globals.py:40`) e é único por request, já que é empurrado em `AppContext.push()` e descartado em `AppContext.pop()` (`src/flask/ctx.py:416` e `446`).

A limpeza ocorre no fim de `AppContext.pop()` (`src/flask/ctx.py:446-504`): primeiro rodam `do_teardown_request`/`do_teardown_appcontext`, depois `_cv_app.reset(self._cv_token)` (linha 498) descarta o contexto — e qualquer atributo custom anexado a ele junto. Esse `pop()` é chamado de dentro de `Flask.wsgi_app` (`src/flask/app.py:1616`, `ctx.pop(error)`), garantindo que o estado não sobreviva ao fim da request.
