---
id: "como-fazer-padrao-de-middleware-que-le-altera-c-res-apos-next"
tipo: "como-fazer"
titulo: "Padrão de middleware que lê/altera c.res após next()"
status: "ativo"
arquivos: ["src/middleware/etag/index.ts"]
liga: [{"rel":"relacionado","alvo":"conceito-compose-monta-a-cadeia-de-middlewares"}]
criado: "2026-10-17T19:47:22.556Z"
atualizado: "2026-10-17T19:47:22.556Z"
commit: "5ca49b0"
---

# Padrão de middleware que lê/altera c.res após next()

Middleware padrão Hono: async function mw(c, next) { ...antes...; await next(); ...depois, lê/altera c.res...}. Exemplo real em src/middleware/etag/index.ts (linhas ~87-134): lê c.req.header antes do next(), e depois do await next() lê c.res.ok, c.res.headers, e pode reatribuir c.res = new Response(...) (ex. para responder 304) ou apenas setar um header no c.res existente.

## Ligações

- relacionado [[conceito-compose-monta-a-cadeia-de-middlewares]]
- arquivo `src/middleware/etag/index.ts`
