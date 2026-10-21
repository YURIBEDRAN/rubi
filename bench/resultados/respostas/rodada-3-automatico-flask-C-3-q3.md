# flask C rep 3 pergunta 3

> Se uma extensão precisa guardar estado por requisição sem usar o objeto g, qual mecanismo do Flask ela deve usar e em que ponto esse estado é limpo? Cite arquivos e funções. Até 10 linhas.

Confirmado nesta versão (Flask 3.2+, `RequestContext` já mesclado em `AppContext`).

**Mecanismo:** além de `g` (que é só `self.g`, uma instância de `_AppCtxGlobals`), uma extensão pode guardar estado anexando atributos diretamente ao objeto de contexto ativo — obtido via `flask.ctx.AppContext` / proxy `app_ctx` em `src/flask/globals.py:41-45` (contextvar `_cv_app`, linha 40). O contexto é criado e populado em `AppContext.__init__` (`src/flask/ctx.py:300-337`) e ativado em `AppContext.push` (linha 416), onde `self._cv_token = _cv_app.set(self)`.

**Limpeza:** ocorre em `AppContext.pop` (`src/flask/ctx.py:446-504`): após rodar `do_teardown_request`/`request.close()`/`do_teardown_appcontext`, a linha `_cv_app.reset(self._cv_token)` (linha 498) desfaz o contextvar e o objeto inteiro (com qualquer atributo extra que a extensão tenha anexado) é descartado — não há reuso entre requests.
