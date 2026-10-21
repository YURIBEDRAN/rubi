# flask C rep 2 pergunta 2

> Quero adicionar um hook que rode depois de toda requisição mesmo quando dá erro. Onde isso se encaixa no ciclo de vida que o Flask usa pro contexto de requisição? Cite arquivos e funções. Até 10 linhas.

Use `teardown_request`, não `after_request`: este último é pulado quando uma exceção não tratada propaga.

- `src/flask/sansio/scaffold.py:516` — decorator `teardown_request` registra a função em `self.teardown_request_funcs`.
- `src/flask/ctx.py:446` — `RequestContext.pop(exc)` roda ao final da requisição (via `app.wsgi_app`), chamando `self.app.do_teardown_request(self, exc)` (linha 490).
- `src/flask/app.py:1420` — `Flask.do_teardown_request` itera `teardown_request_funcs` e chama cada callback passando a exceção (ou `None`).

Roda sempre, mesmo com exceção não tratada, já que `pop` está em `finally` no ciclo da request context.
