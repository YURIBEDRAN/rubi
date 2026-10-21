# flask E rep 3 pergunta 2

> Quero adicionar um hook que rode depois de toda requisição mesmo quando dá erro. Onde isso se encaixa no ciclo de vida que o Flask usa pro contexto de requisição? Cite arquivos e funções. Até 10 linhas.

Use `teardown_request` — roda sempre, mesmo com exceção não tratada.

- Registre com `@app.teardown_request` (definido em `sansio/scaffold.py:516`).
- É chamado por `Flask.do_teardown_request` em `app.py:1420`, que percorre `teardown_request_funcs`.
- Quem dispara isso é `RequestContext.pop()` em `ctx.py:490`, dentro do `finally` do `wsgi_app` (`app.py:1566`), garantindo execução mesmo em erro.
- Se precisar só do objeto `Response` em caminho feliz, use `after_request`/`finalize_request` (`app.py:1021`) — mas esse não roda se a exceção escapar sem handler.
