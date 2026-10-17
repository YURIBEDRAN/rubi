# flask D rep 1 pergunta 3

> Se uma extensão precisa guardar estado por requisição sem usar o objeto g, qual mecanismo do Flask ela deve usar e em que ponto esse estado é limpo? Cite arquivos e funções. Até 10 linhas.

Use um `contextvars.ContextVar` próprio (como o Flask faz com `_cv_app` em `src/flask/globals.py`), setando o valor em algum ponto de setup da requisição e resetando quando ela termina — não dê piggyback no `g`, que é só um atributo do `AppContext`.

Para limpeza, registre a lógica via `app.teardown_appcontext` (`src/flask/sansio/app.py:828`), pois esses callbacks rodam mesmo com exceção. Eles são disparados por `AppContext.pop()` (`src/flask/ctx.py:446`) através de `Flask.do_teardown_appcontext` (`src/flask/app.py:1453`), chamado no `finally` de `Flask.wsgi_app` (`src/flask/app.py:1592-1605`). Se a extensão usar um ContextVar isolado, ela mesma deve chamar `reset(token)` dentro desse teardown — o Flask só reseta `_cv_app` (`ctx.py:498`), não variáveis de terceiros.
