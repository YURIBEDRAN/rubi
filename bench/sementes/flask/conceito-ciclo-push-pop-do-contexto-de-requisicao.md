---
id: "conceito-ciclo-push-pop-do-contexto-de-requisicao"
tipo: "conceito"
titulo: "Ciclo push/pop do contexto de requisição"
status: "ativo"
arquivos: ["src/flask/app.py","src/flask/ctx.py"]
liga: [{"rel":"relacionado","alvo":"conceito-como-o-proxy-global-request-funciona"}]
criado: "2026-10-17T19:44:56.534Z"
atualizado: "2026-10-17T19:44:56.534Z"
commit: "d086db8"
---

# Ciclo push/pop do contexto de requisição

Flask.wsgi_app (src/flask/app.py ~linha 1592) cria o contexto com self.request_context(environ) e chama ctx.push(). AppContext.push() (src/flask/ctx.py:416) seta _cv_app via _cv_app.set(self), dispara o signal appcontext_pushed, abre a sessão e roda match_request() se houver request. No finally, wsgi_app chama ctx.pop() (ctx.py:446), que roda do_teardown_request, fecha o request (_request.close()), roda do_teardown_appcontext, dá _cv_app.reset(self._cv_token) e dispara appcontext_popped.

## Ligações

- relacionado [[conceito-como-o-proxy-global-request-funciona]]
- arquivo `src/flask/app.py`
- arquivo `src/flask/ctx.py`
