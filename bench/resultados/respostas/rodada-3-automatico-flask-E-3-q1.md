# flask E rep 3 pergunta 1

> Como o Flask torna o objeto global 'request' disponível durante uma requisição e o que acontece no fim dela? Cite arquivos e funções principais. Responda em até 10 linhas.

Nesta versão (Flask 3.x atual), `request` não é mais pushado separadamente: ele é um atributo da própria `AppContext` em `src/flask/ctx.py`. O `LocalProxy` global `request` (definido em `src/flask/globals.py:57`, junto com `current_app`, `g` e `session`) aponta para o `ContextVar` `_cv_app` e lê o atributo `"request"` do objeto `AppContext` guardado ali.

No início da requisição, `Flask.wsgi_app`/`full_dispatch_request` (em `src/flask/app.py`) cria um `AppContext` contendo o `Request` e chama `AppContext.push()` (`src/flask/ctx.py:416`), que faz `_cv_app.set(self)` — a partir daí `request`/`g`/`session` resolvem para esse contexto em qualquer ponto da pilha de chamadas, mesmo sem passá-lo explicitamente.

No fim, `AppContext.pop()` (`ctx.py:446`) é chamado: executa `app.do_teardown_request`, fecha o request (`self._request.close()`), executa `app.do_teardown_appcontext`, e por fim `_cv_app.reset(self._cv_token)`, removendo o contexto do `ContextVar` — depois disso, acessar `request` fora de contexto levanta o erro "working outside of request context".
