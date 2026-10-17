---
id: "conceito-compose-e-chamado-em-dois-pontos-de-hono-base-ts"
tipo: "conceito"
titulo: "compose() é chamado em dois pontos de hono-base.ts"
status: "ativo"
arquivos: ["src/hono-base.ts"]
liga: [{"rel":"usa","alvo":"conceito-compose-monta-a-cadeia-de-middlewares"}]
criado: "2026-10-17T19:47:22.556Z"
atualizado: "2026-10-17T19:47:22.556Z"
commit: "5ca49b0"
---

# compose() é chamado em dois pontos de hono-base.ts

src/hono-base.ts chama compose() em dois lugares: linha ~243 (fallback sem rotas casadas, compose([], app.errorHandler)) e linha ~469 (fluxo principal de dispatch, compose(matchResult[0], this.errorHandler, this.#notFoundHandler) com o array de middlewares casados pela rota).

## Ligações

- usa [[conceito-compose-monta-a-cadeia-de-middlewares]]
- arquivo `src/hono-base.ts`
