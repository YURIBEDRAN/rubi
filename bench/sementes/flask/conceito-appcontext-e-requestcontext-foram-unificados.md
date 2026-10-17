---
id: "conceito-appcontext-e-requestcontext-foram-unificados"
tipo: "conceito"
titulo: "AppContext e RequestContext foram unificados"
status: "ativo"
arquivos: ["src/flask/ctx.py","src/flask/globals.py"]
criado: "2026-10-17T19:44:56.534Z"
atualizado: "2026-10-17T19:44:56.534Z"
commit: "d086db8"
---

# AppContext e RequestContext foram unificados

Nesta versão do Flask, AppContext e RequestContext são a mesma classe (AppContext em src/flask/ctx.py). Não existe mais uma classe RequestContext separada; o atributo _request dentro de AppContext guarda o objeto Request quando há uma requisição ativa. A ContextVar global passou a ser só _cv_app (em src/flask/globals.py); request_ctx foi deprecado e agora é um alias que retorna app_ctx com warning (globals.py __getattr__).

## Ligações

- arquivo `src/flask/ctx.py`
- arquivo `src/flask/globals.py`
