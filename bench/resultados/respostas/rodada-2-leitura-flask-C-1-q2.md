# flask C rep 1 pergunta 2

> Quero adicionar um hook que rode depois de toda requisição mesmo quando dá erro. Onde isso se encaixa no ciclo de vida que o Flask usa pro contexto de requisição? Cite arquivos e funções. Até 10 linhas.

O hook que roda sempre, mesmo com erro, é `teardown_request` (não `after_request`, que é pulado se a exceção escapar de `full_dispatch_request`).

Fluxo em `wsgi_app` (`src/flask/app.py:1566`): `ctx.push()` → `full_dispatch_request` (`:992`, chama `after_request`/`process_response` só no caminho feliz) → exceção vai para `handle_exception` (`:897`) → no `finally` (`:1605`) chama `ctx.pop(error)`.

`RequestContext.pop` (`src/flask/ctx.py:446`) recebe essa exceção e chama `app.do_teardown_request` (`app.py:1420`), que executa as funções registradas com `@app.teardown_request`, passando o erro (ou `None`).
