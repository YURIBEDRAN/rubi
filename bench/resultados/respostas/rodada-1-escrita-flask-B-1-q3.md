# flask B rep 1 pergunta 3

> Se uma extensão precisa guardar estado por requisição sem usar o objeto g, qual mecanismo do Flask ela deve usar e em que ponto esse estado é limpo? Cite arquivos e funções. Até 10 linhas.

Registrei 3 fatos no grafo do Rubi: a fusão de `AppContext`/`RequestContext` no Flask desta base, o mecanismo de estado por-requisição sem `g` (atributo direto na instância de `AppContext` via `_cv_app`), e onde isso é limpo (`AppContext.pop`, ctx.py:446-498).
