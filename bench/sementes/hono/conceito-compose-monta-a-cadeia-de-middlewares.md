---
id: "conceito-compose-monta-a-cadeia-de-middlewares"
tipo: "conceito"
titulo: "compose() monta a cadeia de middlewares"
status: "ativo"
arquivos: ["src/compose.ts"]
criado: "2026-10-17T19:47:22.556Z"
atualizado: "2026-10-17T19:47:22.556Z"
commit: "5ca49b0"
---

# compose() monta a cadeia de middlewares

src/compose.ts exporta compose(middleware, onError, onNotFound) que retorna uma função (context, next) => Promise<Context>. Internamente usa dispatch(i) recursivo: cada handler recebe (context, () => dispatch(i+1)) como next. Após o handler retornar, se res existir e context.finalized === false (ou isError), faz context.res = res — por isso middlewares executados 'depois' do await next() ainda conseguem ler/alterar c.res antes dele ser finalizado.

## Ligações

- arquivo `src/compose.ts`
