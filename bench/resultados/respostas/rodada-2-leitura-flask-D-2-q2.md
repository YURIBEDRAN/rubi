# flask D rep 2 pergunta 2

> Quero adicionar um hook que rode depois de toda requisição mesmo quando dá erro. Onde isso se encaixa no ciclo de vida que o Flask usa pro contexto de requisição? Cite arquivos e funções. Até 10 linhas.

Confirma as linhas: `Flask.wsgi_app` em `src/flask/app.py:1566`.

Use `teardown_request`, não `after_request`. Em `Flask.wsgi_app` (`src/flask/app.py:1566`), o `ctx.push()`/`full_dispatch_request()` roda num `try/finally`: o `finally` sempre chama `ctx.pop(error)`, com ou sem exceção. `AppContext.pop` (`src/flask/ctx.py`) então chama `self.app.do_teardown_request(exc)` (`src/flask/app.py:1420`), que executa os callbacks registrados via `@app.teardown_request`. `after_request` só roda no caminho de sucesso, dentro de `full_dispatch_request`/`finalize_request`.
