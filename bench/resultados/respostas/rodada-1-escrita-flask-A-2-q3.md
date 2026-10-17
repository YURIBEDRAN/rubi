# flask A rep 2 pergunta 3

> Se uma extensão precisa guardar estado por requisição sem usar o objeto g, qual mecanismo do Flask ela deve usar e em que ponto esse estado é limpo? Cite arquivos e funções. Até 10 linhas.

**Mecanismo:** anexar o estado como atributo no próprio objeto `request` (ex.: `request._minha_ext = {...}`), já que ele é recriado a cada requisição — não use `g`, que vive no `AppContext` e pode sobreviver a pushes sem request.

**Criação:** `AppContext.from_environ()` (`src/flask/ctx.py`) instancia um `Request` novo por requisição e o guarda em `self._request`.

**Limpeza:** ao final da requisição, `AppContext.pop()` (`src/flask/ctx.py`) chama `self._request.close()` (libera arquivos/stream) e depois `_cv_app.reset(self._cv_token)`, descartando o `AppContext` (e o `request` com ele) do `ContextVar _cv_app` definido em `src/flask/globals.py`. A partir daí o objeto perde todas as referências vivas e é coletado pelo GC.
