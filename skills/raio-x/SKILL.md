---
name: raio-x
description: Mostra pra onde o token está indo (raio-X dos transcripts do Claude Code) e o que pesa no contexto fixo de toda sessão (auditoria). Use quando o usuário perguntar de gasto, custo, token, cache, limite de uso ou contexto.
---

# Raio-X de gasto

1. Rode `memoria_raio_x` (padrão 30 dias; use `dias` se o usuário pedir outro período).
2. Rode `memoria_auditar` pra ver o contexto fixo do projeto atual.
3. Responda em linguagem simples:
   - De onde vem a maior parte do custo (normalmente leitura de cache em sessões longas).
   - As 3 ações com maior economia, em ordem, cada uma com o número que justifica.
   - O que o plugin já faz sozinho (compactação cedo + handoff, guarda de leitura) e o que depende do usuário (enxugar CLAUDE.md, desligar MCP que não usa).

Os custos são "tokens-equivalentes de input" (leitura de cache vale 0,1, escrita 1,25-2, output 5), não reais. Não invente valores em reais ou dólares.
