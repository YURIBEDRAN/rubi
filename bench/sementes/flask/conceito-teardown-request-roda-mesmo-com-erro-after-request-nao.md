---
id: "conceito-teardown-request-roda-mesmo-com-erro-after-request-nao"
tipo: "conceito"
titulo: "teardown_request roda mesmo com erro, after_request não"
status: "ativo"
arquivos: ["src/flask/app.py"]
liga: [{"rel":"relacionado","alvo":"conceito-ciclo-push-pop-do-contexto-de-requisicao"}]
criado: "2026-10-17T19:45:33.837Z"
atualizado: "2026-10-17T19:45:33.837Z"
commit: "d086db8"
---

# teardown_request roda mesmo com erro, after_request não

Flask.wsgi_app (src/flask/app.py:1592) faz ctx.push()/full_dispatch_request dentro de try/except, com finally (linha ~1605) que sempre chama ctx.pop(error), independente de exceção. AppContext.pop chama app.do_teardown_request(exc) (app.py:1420) e depois do_teardown_appcontext. Por isso, um hook que precisa rodar após toda requisição mesmo em erro deve usar @app.teardown_request, não @app.after_request (que só roda no caminho de sucesso, via finalize_request/full_dispatch_request).

## Ligações

- relacionado [[conceito-ciclo-push-pop-do-contexto-de-requisicao]]
- arquivo `src/flask/app.py`
