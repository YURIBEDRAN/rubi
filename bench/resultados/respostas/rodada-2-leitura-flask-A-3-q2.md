# flask A rep 3 pergunta 2

> Quero adicionar um hook que rode depois de toda requisição mesmo quando dá erro. Onde isso se encaixa no ciclo de vida que o Flask usa pro contexto de requisição? Cite arquivos e funções. Até 10 linhas.

No Flask, mas o encaixe certo é no `teardown_request`, não em `after_request` (esse só roda se não houver exceção não tratada).

- Registre com `@app.teardown_request` (`Flask.teardown_request`, `src/flask/sansio/scaffold.py:516`) — recebe a exceção (ou `None`) e roda mesmo em erro.
- Ele é disparado em `RequestContext.pop()` (`src/flask/ctx.py:490`), que chama `app.do_teardown_request(self, exc)` (`src/flask/app.py:1420`) dentro de um `finally`, garantindo execução mesmo com exceção.
- `pop()` por sua vez é chamado no `finally` do `wsgi_app` (`src/flask/app.py`), via `ctx.pop(error)`.
- Se precisar de algo ligado ao app context (não só request), use `teardown_appcontext` (`src/flask/sansio/app.py:828`), chamado em `do_teardown_appcontext` (`app.py:1453`) a partir de `AppContext.pop` (`ctx.py:496`).
