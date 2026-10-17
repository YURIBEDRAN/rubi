---
id: "armadilha-push-pop-suportam-contagem-push-count-para-pushes-multiplos"
tipo: "armadilha"
titulo: "push/pop suportam contagem (push_count) para pushes múltiplos"
status: "ativo"
arquivos: ["src/flask/ctx.py"]
criado: "2026-10-17T19:44:56.534Z"
atualizado: "2026-10-17T19:44:56.534Z"
commit: "d086db8"
---

# push/pop suportam contagem (push_count) para pushes múltiplos

AppContext.push()/pop() usam _push_count para suportar pushes repetidos (streaming, testes): só o primeiro push seta a ContextVar/dispara signals, e só o último pop faz teardown de fato. Importante lembrar disso ao debugar contexto 'não sai' ou sinais duplicados.

## Ligações

- arquivo `src/flask/ctx.py`
