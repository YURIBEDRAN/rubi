# flask A rep 2 pergunta 1

> Como o Flask torna o objeto global 'request' disponível durante uma requisição e o que acontece no fim dela? Cite arquivos e funções principais. Responda em até 10 linhas.

Em `src/flask/globals.py`, `request` é um `werkzeug.local.LocalProxy` ligado ao `ContextVar` `_cv_app`, buscando o atributo `"request"` do objeto de contexto ativo. O contexto é criado e empurrado em `Flask.wsgi_app` (`src/flask/app.py:1592-1596`), que chama `AppContext.push()` (`src/flask/ctx.py:416`): esse método faz `_cv_app.set(self)`, tornando o `AppContext` (que guarda `self._request`) acessível via o proxy em qualquer lugar da thread/task atual. Nessa versão do Flask, `RequestContext` foi unificado em `AppContext` (ver os `__getattr__` de compatibilidade em `ctx.py:528` e `globals.py:65`).

No fim da requisição, `wsgi_app` chama `ctx.pop(error)` em um bloco `finally` (`app.py:1616`), que executa `do_teardown_request`, `request.close()`, `do_teardown_appcontext`, reseta o token do `ContextVar` (`ctx.py:498`) e envia o sinal `appcontext_popped`. Depois disso, acessar `request` fora de contexto levanta `RuntimeError` (mensagem `_no_req_msg`).
