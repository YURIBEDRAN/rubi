# flask B rep 1 pergunta 2

> Quero adicionar um hook que rode depois de toda requisição mesmo quando dá erro. Onde isso se encaixa no ciclo de vida que o Flask usa pro contexto de requisição? Cite arquivos e funções. Até 10 linhas.

Encontrei: `app.py:1566 wsgi_app` abre o `RequestContext` com `ctx.push()` e usa `try/finally` para chamar `ctx.pop(error)` mesmo em exceção. `ctx.py:446 RequestContext.pop` dispara `app.do_teardown_request` (`app.py:1420`), que executa os callbacks registrados via `@app.teardown_request`. Para rodar algo após toda requisição, inclusive com erro, é esse o hook certo — registre com `app.teardown_request`, não `after_request` (que é pulado em erro não tratado).
