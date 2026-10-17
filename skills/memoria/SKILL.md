---
name: memoria
description: Memória persistente do projeto num vault markdown (abre no Obsidian). Use pra buscar contexto antes de reexplorar o código e pra salvar decisões, mapas e armadilhas que valem pras próximas sessões. "/memoria <assunto>" busca.
---

# Memória do projeto

O vault guarda, por projeto: `notas/` (conhecimento durável), `handoffs/` (onde paramos) e `sessoes/` (registro automático feito antes de cada compactação).

## Buscar primeiro

Antes de sair lendo vários arquivos pra entender algo, rode `memoria_buscar` com 2-4 palavras-chave. A busca devolve trechos curtos; abra só o que importar com `memoria_ler`. Se o usuário passou um assunto (`/memoria <assunto>`), busque e resuma o que achou.

## O que salvar (`memoria_salvar_nota`)

Salve quando descobrir algo que custaria caro redescobrir:
- Decisão e o porquê ("usamos X e não Y porque...").
- Mapa: onde fica cada parte do código, entrada, fluxo principal.
- Como rodar, testar e publicar; comandos que funcionam.
- Armadilhas: erro que já aconteceu e a solução.
- Preferências do usuário que valem neste projeto.

Uma nota por assunto, com título estável ("arquitetura", "deploy", "decisões"). Pra acrescentar, use `modo: "anexar"`; não crie nota duplicada. Nada de segredos.

## O que não salvar

O que o próprio código ou o git já dizem, rascunho da conversa e coisas que só valem para esta mensagem.
