# hono E rep 1 pergunta 1

> Como o Hono escolhe o router padrão e como o SmartRouter decide qual router usar? Cite arquivos e funções principais. Até 10 linhas.

- **Padrão**: `src/hono.ts:30-31` instancia `new SmartRouter({ routers: [new RegExpRouter(), new TrieRouter()] })` como router default do `Hono`.
- **Escolha do SmartRouter**: em `SmartRouter.match()` (`src/router/smart-router/router.ts:21`), na primeira chamada ele replica todas as rotas acumuladas (`#routes`) em cada router da lista, na ordem, via `router.add(...)`, e tenta `router.match()`. Se o router lançar `UnsupportedPathError` (padrão não suportado, ex. RegExpRouter com certos patterns), passa pro próximo; senão usa esse resultado.
- Ao achar um que funciona, fixa `this.match = router.match.bind(router)` e descarta os outros (`#routers = [router]`, `#routes = undefined`), tornando a escolha definitiva (cacheada) nas chamadas seguintes — por isso prefere RegExpRouter (mais rápido) e só cai pro TrieRouter quando necessário.
