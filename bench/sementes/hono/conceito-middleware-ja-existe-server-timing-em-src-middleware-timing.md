---
id: "conceito-middleware-ja-existe-server-timing-em-src-middleware-timing"
tipo: "conceito"
titulo: "Middleware já existe: Server-Timing em src/middleware/timing"
status: "ativo"
arquivos: ["src/middleware/timing/timing.ts","src/middleware/timing/index.ts"]
criado: "2026-10-17T19:47:34.795Z"
atualizado: "2026-10-17T19:47:34.795Z"
commit: "5ca49b0"
---

# Middleware já existe: Server-Timing em src/middleware/timing

O repo já tem um middleware pronto para medir tempo por rota: src/middleware/timing/timing.ts, exportado via src/middleware/timing/index.ts (timing(), setMetric, startTime, endTime, wrapTime). Ele seta o header Server-Timing (não um header custom). Útil como referência/base antes de criar um middleware de timing do zero.

## Ligações

- arquivo `src/middleware/timing/timing.ts`
- arquivo `src/middleware/timing/index.ts`
