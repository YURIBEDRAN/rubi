# flask A rep 2 pergunta 2

> Quero adicionar um hook que rode depois de toda requisição mesmo quando dá erro. Onde isso se encaixa no ciclo de vida que o Flask usa pro contexto de requisição? Cite arquivos e funções. Até 10 linhas.

Use `teardown_request`, não `after_request` — `after_request` só roda em respostas bem-sucedidas.

- `app.py:1566` `wsgi_app` chama `full_dispatch_request` num `try`, e no `finally` (`app.py:1616`) faz `ctx.pop(error)`, passando a exceção se houver.
- `ctx.RequestContext.pop()` (`ctx.py`) chama `app.do_teardown_request(exc)` (`app.py:1420`), que executa todas as funções registradas com `@app.teardown_request`.
- Registre com `app.teardown_request(func)`; `func` recebe `exc` (None se não houve erro).
