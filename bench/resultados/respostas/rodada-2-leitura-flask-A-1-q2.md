# flask A rep 1 pergunta 2

> Quero adicionar um hook que rode depois de toda requisição mesmo quando dá erro. Onde isso se encaixa no ciclo de vida que o Flask usa pro contexto de requisição? Cite arquivos e funções. Até 10 linhas.

Use `teardown_request` (não `after_request`), que roda sempre, mesmo com exceção/sem response.

- Registro: `Flask.teardown_request` em `src/flask/sansio/scaffold.py:516`.
- Execução: `Flask.do_teardown_request` em `src/flask/app.py:1420`, chamado por `RequestContext.pop` em `src/flask/ctx.py:490`, dentro de um bloco `_CollectErrors`.
- `RequestContext.pop` roda no `finally` do `wsgi_app` (`src/flask/app.py`), garantindo execução mesmo em erro.
- Diferente de `after_request` (só roda se a view não levantar exceção não tratada).
