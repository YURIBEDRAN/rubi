# flask E rep 2 pergunta 3

> Se uma extensão precisa guardar estado por requisição sem usar o objeto g, qual mecanismo do Flask ela deve usar e em que ponto esse estado é limpo? Cite arquivos e funções. Até 10 linhas.

Use uma `contextvars.ContextVar` própria (o mesmo mecanismo do `g`), não atributos soltos em outro lugar.

- Declare algo como `_cv_minha_ext: ContextVar = ContextVar("minha_ext")` (padrão em `src/flask/globals.py:40`, `_cv_app`).
- Guarde o valor em `.set(...)` ao entrar no contexto (equivalente a `AppContext.push` em `src/flask/ctx.py:416`).
- A limpeza acontece no `.reset(token)` dentro de `AppContext.pop` (`src/flask/ctx.py:446-498`, especificamente a linha `_cv_app.reset(self._cv_token)` em `ctx.py:498`), chamado ao final do request via `RequestContext.pop`/`app.wsgi_app`'s `finally`.

Se precisar de algo named-spaced, siga o padrão do próprio `g`: ele é só um proxy (`_AppCtxGlobals`) pendurado no `AppContext` guardado nessa mesma ContextVar — então uma extensão pode criar sua própria ContextVar paralela em vez de sobrecarregar `g`.
