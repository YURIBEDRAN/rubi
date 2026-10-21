# flask E rep 1 pergunta 1

> Como o Flask torna o objeto global 'request' disponível durante uma requisição e o que acontece no fim dela? Cite arquivos e funções principais. Responda em até 10 linhas.

O Flask usa `ContextVar` + proxy: `request` (definido em `src/flask/globals.py`) é um `LocalProxy` que resolve para `_cv_request.get().request` a cada acesso.

No início da requisição, `Flask.wsgi_app` (`src/flask/app.py:1566`) cria um `RequestContext` e chama `ctx.push()` (`src/flask/ctx.py:416`), que faz `_cv_request.set(self)`, tornando o objeto visível globalmente dentro daquela execução/thread/greenlet.

Ao final, dentro de um `try/finally` em `wsgi_app`, é chamado `ctx.pop()` (`src/flask/ctx.py:446`), que reseta a `ContextVar` (`_cv_request.reset(...)`) e dispara o teardown (`do_teardown_request`), removendo a requisição do escopo global.
