# flask A rep 1 pergunta 3

> Se uma extensão precisa guardar estado por requisição sem usar o objeto g, qual mecanismo do Flask ela deve usar e em que ponto esse estado é limpo? Cite arquivos e funções. Até 10 linhas.

Use um `contextvars.ContextVar` próprio (o padrão que o Flask usa internamente), ou guarde o atributo diretamente no objeto de contexto ativo em vez de em `g`.

- O Flask faz exatamente isso com `_cv_app` em `src/flask/globals.py`, lido/escrito por `AppContext.push`/`AppContext.pop` em `src/flask/ctx.py:416-499`.
- Uma extensão pode seguir o mesmo padrão: criar seu próprio `ContextVar`, dar `set()` no início da requisição e `reset()` no fim — ou simplesmente anexar um atributo ao `AppContext` atual (acessível via `_cv_app.get()`), que já é por-requisição.
- A limpeza ocorre em `AppContext.pop()` (`ctx.py:498`, `_cv_app.reset(self._cv_token)`), chamado dentro do `finally` de `Flask.wsgi_app` (`src/flask/app.py:1616`, `ctx.pop(error)`) — depois que `do_teardown_request`/`do_teardown_appcontext` já rodaram.
