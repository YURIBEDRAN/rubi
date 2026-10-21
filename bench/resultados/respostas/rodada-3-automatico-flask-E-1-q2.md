# flask E rep 1 pergunta 2

> Quero adicionar um hook que rode depois de toda requisição mesmo quando dá erro. Onde isso se encaixa no ciclo de vida que o Flask usa pro contexto de requisição? Cite arquivos e funções. Até 10 linhas.

Use `app.teardown_request(f)` (ou `app.teardown_appcontext(f)` para recursos ligados ao app, não à request).

Esses callbacks rodam em `RequestContext.pop()` (`src/flask/ctx.py:446`), que chama `app.do_teardown_request(exc)` e depois `app.do_teardown_appcontext(exc)` (`src/flask/ctx.py:490,496`, implementados em `src/flask/app.py:1420` e `:1453`). `pop()` roda sempre no `finally` do ciclo da request (`wsgi_app`/`full_dispatch_request`), inclusive quando uma exceção não tratada propaga — por isso `exc` é passado para os teardown funcs. Diferente de `after_request`, que é pulado se a exceção não for capturada antes.
