# flask E rep 2 pergunta 2

> Quero adicionar um hook que rode depois de toda requisição mesmo quando dá erro. Onde isso se encaixa no ciclo de vida que o Flask usa pro contexto de requisição? Cite arquivos e funções. Até 10 linhas.

Use `app.teardown_request` (registra em `scaffold.py:516`, lista em `scaffold.py:167`). Ele é chamado por `app.do_teardown_request` (`app.py:1420`), que é disparado dentro de `RequestContext.pop()` (`ctx.py:446`) — chamado em `finally` pelo `wsgi_app` (`app.py:1566`), então roda mesmo com exceção (o `exc` é passado pro hook).
