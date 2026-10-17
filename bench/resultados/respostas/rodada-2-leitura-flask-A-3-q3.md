# flask A rep 3 pergunta 3

> Se uma extensão precisa guardar estado por requisição sem usar o objeto g, qual mecanismo do Flask ela deve usar e em que ponto esse estado é limpo? Cite arquivos e funções. Até 10 linhas.

Confirmado no código em `src\flask\ctx.py`.

**Mecanismo:** desde a fusão (versão 3.2+) de `RequestContext` em `AppContext`, o objeto de contexto ativo (acessível via a contextvar `_cv_app` em `src\flask\globals.py`, exposta pelos proxies `app_ctx`/`request_ctx`) é uma instância única de `AppContext` por requisição (`src\flask\ctx.py:260`). Uma extensão pode setar atributos arbitrários diretamente nessa instância (ex.: `ctx = _cv_app.get(); ctx.minha_extensao = ...`), em vez de usar o namespace `g` (`self.g`, linha 312).

**Quando é limpo:** em `AppContext.pop()` (`src\flask\ctx.py:446-504`). Depois de rodar `do_teardown_request`/`do_teardown_appcontext`, a linha `_cv_app.reset(self._cv_token)` (linha 498) desfaz a contextvar; sem mais referências, o próprio objeto `AppContext` (e qualquer atributo custom nele) é descartado pelo GC — não existe limpeza atributo-a-atributo, é o contexto inteiro que morre.
