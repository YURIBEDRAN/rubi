---
name: organizar
description: Organiza a memória de um projeto no Rubi. Enxuga um CLAUDE.md grande, transformando os detalhes em nós do grafo e no mapa, escreve os resumos que faltam e liga o conhecimento solto. Use quando o usuário pedir pra organizar o projeto, reduzir o contexto fixo, ou quando o CLAUDE.md passar de ~2k tokens.
---

# Organizar o projeto

O objetivo é que cada sessão comece leve (só o mapa) e ache o resto sob demanda.

1. **Medir.** Rode `rubi_auditar` e veja quanto o CLAUDE.md e o resto do contexto fixo pesam.
2. **Ler o CLAUDE.md** e separar o conteúdo em dois grupos:
   - **Fica:** regras que valem em TODA mensagem. Exemplos: "nunca faça push na main", "responda em português", o comando de teste.
   - **Vira nó:** o resto (arquitetura, decisões antigas, explicações de módulo, how-tos, histórico). Registre com `rubi_registrar`, usando o tipo certo e ligando aos arquivos.
3. **Resumos.** Escreva a visão geral (`rubi_escrever_resumo` com alvo `mapa`) e os resumos dos módulos principais, a partir do que estava no CLAUDE.md e do mapa do código.
4. **Mostrar a proposta antes de mexer no CLAUDE.md.** Apresente ao usuário o CLAUDE.md enxuto proposto e a lista do que virou nó. Só reescreva o arquivo depois do ok dele. A versão enxuta termina com:
   > Contexto do projeto: mapa e grafo em `.rubi/` (Rubi). Busque com `rubi_contexto` antes de explorar.
5. **Conferir.** Rode `rubi_auditar` de novo e mostre quanto o contexto fixo diminuiu.

Não apague informação: tudo o que sai do CLAUDE.md precisa existir como nó, ou no git.
