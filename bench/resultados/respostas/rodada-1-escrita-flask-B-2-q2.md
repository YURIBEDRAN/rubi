# flask B rep 2 pergunta 2

> Quero adicionar um hook que rode depois de toda requisição mesmo quando dá erro. Onde isso se encaixa no ciclo de vida que o Flask usa pro contexto de requisição? Cite arquivos e funções. Até 10 linhas.

Use `teardown_request`, registrado via `Flask.teardown_request` (`src/flask/sansio/scaffold.py:516`), que roda sempre, mesmo com exceção.

O fluxo: `Flask.wsgi_app` (`src/flask/app.py:1566`) cria o `AppContext` e faz `ctx.push()`/`ctx.pop(error)` dentro de um `try/finally`. `AppContext.pop` (`src/flask/ctx.py:446`) chama `self.app.do_teardown_request(self, exc)` (`ctx.py:490`), que por sua vez executa os callbacks de `teardown_request_funcs` em ordem reversa (`app.py:1420-1444`), passando a exceção (ou `None`) como argumento.

Se você só precisa fechar algo após a resposta (sem ver o erro), `after_request` também serve, mas não roda quando a view lança exceção não tratada — para isso é só `teardown_request` mesmo. Note a ressalva do `_push_count` (`ctx.py`): com contexto empurrado várias vezes, o teardown só dispara quando o contador zera.
