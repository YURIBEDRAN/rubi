---
name: handoff
description: Salva o "onde paramos" e o conhecimento durável da sessão antes da compactação ou de trocar de janela. Use quando o medidor de contexto avisar, quando o usuário pedir /handoff, ou ao fechar uma etapa grande.
---

# Handoff

Três passos, nesta ordem, sem parar pra perguntar ao usuário quando foi o medidor que pediu.

## 1. Registrar o que é durável (`rubi_registrar`)

Agora o contexto inteiro está na sua frente e já foi pago, então extrair custa pouco. Registre os fatos desta sessão que valem além da tarefa:
- decisões, com o porquê;
- bugs, com a causa e a correção;
- armadilhas;
- conceitos novos;
- como fazer.

Ligue cada fato aos arquivos e aos outros nós. Use `substitui` quando uma decisão mudou.

## 2. Resumos que faltam

Se você entendeu um módulo que está sem resumo no mapa, escreva 2-5 linhas com `rubi_escrever_resumo`.

## 3. O handoff (`rubi_salvar_handoff`)

É a nota que você gostaria de receber se acordasse sem memória no meio do trabalho. Ela volta sozinha depois da compactação.

```markdown
# <tarefa em uma linha>

## Objetivo
O que o usuário quer no fim, com as palavras dele quando importar.

## Estado atual
O que está pronto e verificado. O que está pela metade (arquivo e ponto exato).

## Arquivos-chave
- `caminho/arquivo.ext`: papel nesta tarefa

## Próximo passo
1. A próxima ação concreta, com o comando ou o arquivo.

## Armadilhas desta tarefa
- O que já deu errado aqui e como contornar.
```

- Passe também `arquivos` com os arquivos-chave: eles ligam o handoff ao grafo.
- Seja concreto (caminhos, funções, comandos) e curto (até ~1.000 palavras). Não reconte a conversa.
- Não repita no handoff o que você registrou como fato: o fato já volta pela busca.
- Nada de segredos.
- Se foi o usuário que pediu, diga onde salvou e que ele pode dar `/clear`, porque o handoff volta sozinho na janela nova.
