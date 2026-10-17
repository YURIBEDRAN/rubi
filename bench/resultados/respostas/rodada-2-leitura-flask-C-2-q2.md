# flask C rep 2 pergunta 2

> Quero adicionar um hook que rode depois de toda requisição mesmo quando dá erro. Onde isso se encaixa no ciclo de vida que o Flask usa pro contexto de requisição? Cite arquivos e funções. Até 10 linhas.

`teardown_request` roda no `finally` de `RequestContext.pop()` (`src/flask/ctx.py:446-490`), chamando `self.app.do_teardown_request(self, exc)` (`src/flask/app.py:1420`). Essa `pop` é executada pelo `finally` em `wsgi_app` (`src/flask/app.py`), então roda sempre — sucesso, exceção tratada por `handle_exception`/`handle_user_exception`, ou exceção não tratada. Registre com `@app.teardown_request` (armazenado em `teardown_request_funcs`, `src/flask/sansio/scaffold.py:167,546`); recebe a exceção (ou `None`) como argumento.
