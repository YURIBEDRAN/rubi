# flask C rep 1 pergunta 2

> Quero adicionar um hook que rode depois de toda requisição mesmo quando dá erro. Onde isso se encaixa no ciclo de vida que o Flask usa pro contexto de requisição? Cite arquivos e funções. Até 10 linhas.

Esse é o `teardown_request`, registrado via `Flask.teardown_request`/`Scaffold.teardown_request` (`sansio/scaffold.py:516`). Ele roda sempre, mesmo com exceção, porque `RequestContext.pop` (`ctx.py:446`) chama `app.do_teardown_request(self, exc)` (`ctx.py:490`) dentro de um `finally`, e `do_teardown_request` (`app.py:1420`) itera `teardown_request_funcs` passando a exceção (ou `None`). O pop acontece no `finally` de `Flask.wsgi_app` (`app.py:1566`), então cobre tanto respostas normais quanto erros não tratados.
