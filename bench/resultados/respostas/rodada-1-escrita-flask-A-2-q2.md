# flask A rep 2 pergunta 2

> Quero adicionar um hook que rode depois de toda requisição mesmo quando dá erro. Onde isso se encaixa no ciclo de vida que o Flask usa pro contexto de requisição? Cite arquivos e funções. Até 10 linhas.

Hooks disponíveis dependem se precisa ou não da response já montada:

- `app.teardown_request(f)` → registra em `Flask.do_teardown_request` (`src/flask/app.py:1420`), chamado por `RequestContext.pop` (`src/flask/ctx.py:490`), dentro do `finally` do `wsgi_app` (`src/flask/app.py:1566`). Roda sempre, mesmo com exceção não tratada, mas não recebe a `Response`.
- `app.after_request(f)` → só roda em `finalize_request` (`app.py:1021`), chamado dentro de `full_dispatch_request` (`app.py:992`); **não** roda se uma exceção subir sem ser tratada por um error handler.

Para "depois de toda requisição, mesmo com erro", use `teardown_request`.
