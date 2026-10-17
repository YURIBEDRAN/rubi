# flask D rep 3 pergunta 2

> Quero adicionar um hook que rode depois de toda requisição mesmo quando dá erro. Onde isso se encaixa no ciclo de vida que o Flask usa pro contexto de requisição? Cite arquivos e funções. Até 10 linhas.

Linhas confirmadas no código atual. Resposta:

Esse hook é o `teardown_request` (via `Flask.teardown_request`, registrado em `src/flask/app.py:269`).

Em `Flask.wsgi_app` (`src/flask/app.py:1592`), o `ctx = self.request_context(environ)` e `ctx.push()` ficam fora do `try`, mas o processamento da request (`full_dispatch_request`) fica dentro de um `try/except`, com um `finally` que chama `ctx.pop(error)` (`app.py:1616`) incondicionalmente.

`AppContext.pop` (`src/flask/ctx.py`) chama `app.do_teardown_request(exc)` (`app.py:1420`) antes de remover o contexto — isso roda sempre, com erro ou não, diferente do `after_request`, que é pulado se a exceção não foi tratada e chegou ao WSGI.
