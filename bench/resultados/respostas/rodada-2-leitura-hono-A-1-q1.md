# hono A rep 1 pergunta 1

> Como o Hono escolhe o router padrão e como o SmartRouter decide qual router usar? Cite arquivos e funções principais. Até 10 linhas.

- **Default:** em `src/hono.ts` (classe `Hono`), o construtor define `this.router = options.router ?? new SmartRouter({ routers: [new RegExpRouter(), new TrieRouter()] })`. O preset `src/preset/quick.ts` usa `[LinearRouter(), TrieRouter()]` em vez disso.
- **Decisão do SmartRouter** (`src/router/smart-router/router.ts`): `add()` só acumula rotas; a escolha real ocorre na primeira chamada de `match()`. Ele testa os routers na ordem do array, aplicando `router.add(...)` para cada rota e chamando `router.match()`; se o router lançar `UnsupportedPathError` (ex.: RegExpRouter não suporta certos padrões), passa para o próximo. O primeiro que não lançar erro "vence": `this.match` é substituído (`.bind`) pelo `match` desse router e `#routers` é reduzido a `[router]`, fixando a escolha para as chamadas seguintes (sem repetir a seleção).
