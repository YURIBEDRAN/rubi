# flask C rep 1 pergunta 1

> Como o Flask torna o objeto global 'request' disponível durante uma requisição e o que acontece no fim dela? Cite arquivos e funções principais. Responda em até 10 linhas.

Agora tenho a confirmação exata (esta versão já fundiu `RequestContext` em `AppContext`).

Em `src/flask/app.py`, `wsgi_app()` cria um `AppContext` via `AppContext.from_environ()` (`src/flask/ctx.py:339`) e chama `push()` (`ctx.py:416`). `push()` grava o contexto numa `ContextVar` (`_cv_app`) e, se houver request, abre a sessão e roda `match_request()`. O `request` global em `src/flask/globals.py:57` é um `LocalProxy` que, a cada acesso, lê essa `ContextVar` e retorna `ctx.request` — por isso parece "global" mas é por-thread/por-contexto. No fim da requisição, `wsgi_app` chama `pop()` (`ctx.py:446`), que executa `do_teardown_request`, fecha o request (`request.close()`), roda `do_teardown_appcontext` e então reseta a `ContextVar`, tornando o proxy inválido fora desse escopo.
