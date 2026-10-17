---
id: "conceito-como-o-proxy-global-request-funciona"
tipo: "conceito"
titulo: "Como o proxy global 'request' funciona"
status: "ativo"
arquivos: ["src/flask/globals.py"]
criado: "2026-10-17T19:44:56.534Z"
atualizado: "2026-10-17T19:44:56.534Z"
commit: "d086db8"
---

# Como o proxy global 'request' funciona

flask.request (definido em src/flask/globals.py:57) é um werkzeug.local.LocalProxy(_cv_app, "request", ...). A cada acesso ele lê _cv_app.get() (contextvars, isolado por thread/task) e retorna o atributo .request desse AppContext. Não é um objeto global real, é resolvido dinamicamente por requisição.

## Ligações

- arquivo `src/flask/globals.py`
