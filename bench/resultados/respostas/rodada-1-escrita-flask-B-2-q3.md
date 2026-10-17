# flask B rep 2 pergunta 3

> Se uma extensão precisa guardar estado por requisição sem usar o objeto g, qual mecanismo do Flask ela deve usar e em que ponto esse estado é limpo? Cite arquivos e funções. Até 10 linhas.

O mecanismo é o próprio objeto de contexto, não o `g`: a extensão pega o `AppContext` ativo via `_cv_app.get()` (ContextVar definida em `src/flask/globals.py:40`) e guarda o estado como atributo nessa instância (classe `AppContext`, `src/flask/ctx.py:260`), em vez de em `ctx.g`.

A limpeza ocorre em `AppContext.pop()` (`src/flask/ctx.py:446`): depois de `do_teardown_appcontext` (linha 496), a chamada `_cv_app.reset(self._cv_token)` (linha 498) descarta a referência ao `AppContext` no ContextVar, liberando a instância (e qualquer atributo da extensão nela) para coleta de lixo.

Atenção: por causa do `_push_count` (linhas 481-484), se o contexto foi empurrado múltiplas vezes (streaming/testes), o reset só acontece quando a contagem chega a 0 — pops intermediários não limpam o estado.
