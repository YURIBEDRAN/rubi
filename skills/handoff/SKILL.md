---
name: handoff
description: Salva o "onde paramos" no vault pra continuar depois da compactação ou numa janela nova sem perder o fio. Use quando o medidor de contexto avisar, quando o usuário pedir /handoff, ou ao fechar uma etapa grande.
---

# Handoff

Escreva a nota que você mesmo gostaria de receber se acordasse sem memória no meio deste trabalho. Ela volta pro contexto sozinha depois da compactação (ou do `/clear`), então precisa bastar pra continuar sem reler a conversa.

## Formato

```markdown
# <tarefa em uma linha>

## Objetivo
O que o usuário quer no fim, com as palavras dele quando importar.

## Estado atual
O que já está pronto e verificado. O que está pela metade (arquivo e ponto exato).

## Decisões
- <decisão> — porque <motivo>. (Inclua o que foi descartado, pra não reabrir.)

## Arquivos-chave
- `caminho/arquivo.ext` — papel dele nesta tarefa

## Próximo passo
1. A próxima ação concreta, com o comando ou arquivo.
2. ...

## Armadilhas
- O que já deu errado e como contornar. Preferências do usuário que valem aqui.
```

## Regras

- Concreto: caminhos, nomes de função, comandos, números. Nada de "trabalhamos no módulo".
- Curto: até ~1.500 palavras. Não reconte a conversa; registre o estado.
- Não inclua segredos (tokens, senhas, .env).
- Salve com a ferramenta `rubi_salvar_handoff` (servidor MCP `rubi`).
- Se foi o medidor que pediu, salve e siga o trabalho sem perguntar nada ao usuário.
- Se foi o usuário que pediu, diga onde salvou e que ele pode dar `/clear`: o handoff volta sozinho na janela nova.
- Decisões que valem além desta tarefa também vão pra uma nota permanente (`rubi_salvar_nota`).
