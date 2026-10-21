# flask C rep 3 pergunta 2

> Quero adicionar um hook que rode depois de toda requisição mesmo quando dá erro. Onde isso se encaixa no ciclo de vida que o Flask usa pro contexto de requisição? Cite arquivos e funções. Até 10 linhas.

Use `teardown_request`, não `after_request`: este último é pulado se a view lançar exceção não tratada.

O hook se encaixa em `RequestContext.pop` (`src/flask/ctx.py:446`), que chama `self.app.do_teardown_request(self, exc)` (`ctx.py:490`). `Flask.do_teardown_request` (`src/flask/app.py:1420`) itera `teardown_request_funcs` (registrados via `teardown_request` em `src/flask/sansio/scaffold.py:516`) e passa a exceção (ou `None`) pra cada função.

Esse pop acontece no `finally` do `wsgi_app`, então roda tanto no caminho feliz quanto quando a exceção propagou.
