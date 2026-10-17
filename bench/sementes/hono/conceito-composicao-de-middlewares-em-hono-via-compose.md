---
id: "conceito-composicao-de-middlewares-em-hono-via-compose"
tipo: "conceito"
titulo: "Composição de middlewares em Hono via compose()"
status: "ativo"
arquivos: ["src/compose.ts","src/hono-base.ts"]
liga: [{"rel":"relacionado","alvo":"arquivo:src/middleware/timing/timing.ts"}]
criado: "2026-10-17T19:47:34.795Z"
atualizado: "2026-10-17T19:47:34.795Z"
commit: "5ca49b0"
---

# Composição de middlewares em Hono via compose()

A composição de app.use(...) é feita por compose() em src/compose.ts:15, e disparada pelo método privado #dispatch em src/hono-base.ts:425 (chamado em src/hono-base.ts:469 com compose(matchResult[0], this.errorHandler, this.#notFoundHandler)). Um middleware customizado (ex: medir tempo de resposta) deve ser registrado com app.use() antes das rotas; para medir o tempo total incluindo outros middlewares, registre-o primeiro (mais externo na cadeia).

## Ligações

- relacionado `src/middleware/timing/timing.ts`
- arquivo `src/compose.ts`
- arquivo `src/hono-base.ts`
