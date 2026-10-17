# flask D rep 1 pergunta 2

> Quero adicionar um hook que rode depois de toda requisição mesmo quando dá erro. Onde isso se encaixa no ciclo de vida que o Flask usa pro contexto de requisição? Cite arquivos e funções. Até 10 linhas.

Isso é `teardown_request`, não `after_request`.

- `Flask.wsgi_app` (`src/flask/app.py:1566`) faz `ctx.push()` e `full_dispatch_request(ctx)` dentro de `try/except`; no `finally` chama `ctx.pop(error)` (linha 1616) — sempre, mesmo com exceção.
- `AppContext.pop` (`src/flask/ctx.py:446`) chama `self.app.do_teardown_request(self, exc)` (linha 490) e depois `do_teardown_appcontext` (linha 496).
- `do_teardown_request` (`app.py:1420`) executa as funções registradas com `@app.teardown_request`, passando o erro (ou `None`).

`after_request` só roda em `finalize_request`, dentro do `full_dispatch_request`, então é pulado se houver exceção não tratada. Use `app.teardown_request` para seu hook.
