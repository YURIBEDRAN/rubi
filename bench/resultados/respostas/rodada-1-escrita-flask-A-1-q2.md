# flask A rep 1 pergunta 2

> Quero adicionar um hook que rode depois de toda requisição mesmo quando dá erro. Onde isso se encaixa no ciclo de vida que o Flask usa pro contexto de requisição? Cite arquivos e funções. Até 10 linhas.

Use `@app.teardown_request`, não `after_request` — este último é pulado quando a view levanta exceção não tratada.

Ciclo de vida: `RequestContext.pop()` em `src/flask/ctx.py` chama `app.do_teardown_request(exc)` (`src/flask/app.py:1420`), que executa os callbacks registrados via `teardown_request` (`src/flask/sansio/scaffold.py:516`) em ordem reversa, passando a exceção (ou `None`) para cada um, e por fim envia o sinal `request_tearing_down`.
