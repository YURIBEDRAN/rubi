---
id: "armadilha-c-res-so-existe-depois-do-await-next-no-middleware"
tipo: "armadilha"
titulo: "c.res só existe depois do await next() no middleware"
status: "ativo"
arquivos: ["src/context.ts"]
criado: "2026-10-17T19:47:34.795Z"
atualizado: "2026-10-17T19:47:34.795Z"
commit: "5ca49b0"
---

# c.res só existe depois do await next() no middleware

Em um MiddlewareHandler, para setar um header de timing (ex: X-Response-Time) é preciso medir antes do await next() e só então chamar c.header(...) ou c.res.headers.set(...) depois do next(), pois c.res é populado pelo handler da rota durante o next().

## Ligações

- arquivo `src/context.ts`
