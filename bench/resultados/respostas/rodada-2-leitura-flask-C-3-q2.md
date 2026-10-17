# flask C rep 3 pergunta 2

> Quero adicionar um hook que rode depois de toda requisição mesmo quando dá erro. Onde isso se encaixa no ciclo de vida que o Flask usa pro contexto de requisição? Cite arquivos e funções. Até 10 linhas.

Good — this is Flask 3.2+ where `AppContext`/`RequestContext` merged. Now I have everything needed to answer precisely.

## Resposta

Use `@app.teardown_request` (ou `@app.teardown_appcontext` se não precisar do `request`) — roda sempre, mesmo com exceção não tratada.

Fluxo: `Flask.wsgi_app` (`src/flask/app.py:1566`) empurra o contexto e chama `full_dispatch_request`; erros caem no `except` e viram `error`, mas no `finally` (linha 1605) ele garante o teardown mesmo assim. O pop de fato acontece em `AppContext.pop` (`src/flask/ctx.py:446`), que chama `self.app.do_teardown_request(self, exc)` (`src/flask/app.py:1420`) passando a exceção — e depois `do_teardown_appcontext`. Desde a 3.2, `AppContext` e `RequestContext` são a mesma classe (`ctx.py:260`).
