# flask A rep 3 pergunta 2

> Quero adicionar um hook que rode depois de toda requisição mesmo quando dá erro. Onde isso se encaixa no ciclo de vida que o Flask usa pro contexto de requisição? Cite arquivos e funções. Até 10 linhas.

`teardown_request` roda no `pop()` do contexto, não no `finally` do `wsgi_app`. Fluxo: `Flask.wsgi_app` (`src/flask/app.py`) chama `RequestContext.push()`/`pop()` em `src/flask/ctx.py`; `RequestContext.pop` (ctx.py:~380) chama `app.do_teardown_request()` (app.py:1420) antes de popar, e depois `AppContext.pop` (ctx.py:~496) chama `do_teardown_appcontext` (app.py:1453). Use `@app.teardown_request` para rodar após toda requisição, erro ou não, com `exc` recebendo a exceção se houve.
