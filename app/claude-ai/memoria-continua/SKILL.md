---
name: memoria-continua
description: Evita conversas gigantes que queimam o limite de uso. Quando a conversa fica longa, salva o "onde paramos" e leva o usuário pra uma conversa nova sem perder o fio. Use também quando o usuário disser "continua de onde parei", "lembra disso" ou citar um projeto salvo.
---

# Memória contínua

Toda mensagem numa conversa longa reenvia a conversa inteira. Por isso conversas gigantes gastam o limite de uso muito mais rápido. Esta skill mantém as conversas curtas sem que o usuário perca nada.

## 1. Perceber que a conversa ficou longa

Aqui não existe medidor automático: quem percebe é você. Considere a conversa longa quando acontecer qualquer um destes:
- Passou de umas 25 trocas de mensagem.
- Entraram documentos, planilhas, PDFs ou blocos de código grandes.
- O assunto mudou de fase (terminou uma parte e vai começar outra).
- O usuário reclamou de limite, lentidão ou de você "esquecer" coisas.

Nesse momento, ofereça uma vez, em uma frase: "A conversa ficou longa. Quer que eu salve onde paramos pra você continuar numa conversa nova? Gasta bem menos do seu limite." Se ele recusar, não insista até a próxima mudança de fase.

## 2. Salvar o handoff

Escreva uma nota curta (até ~800 palavras) com:

```markdown
# <assunto em uma linha>
## Objetivo
## O que já foi feito / decidido
## Dados importantes (números, nomes, links, trechos que não podem se perder)
## Próximo passo
```

- **Com o conector Memória Claude** (ferramentas `memoria_*`): salve com `memoria_salvar_handoff`, com `projeto` = um nome curto do assunto (ex.: "tcc", "loja-da-ana"). Diga ao usuário: "Salvo. Abra uma conversa nova e diga: continua de onde parei em <projeto>."
- **Sem conector**: entregue a nota num único bloco de código e diga: "Copie isso, abra uma conversa nova e cole com: continua daqui."

## 3. Continuar numa conversa nova

Se o usuário disser "continua de onde parei" (com ou sem projeto):
- Com conector: `memoria_ultimo_handoff` (use `memoria_projetos` se não souber o nome) e siga a partir do próximo passo, sem pedir pra ele explicar de novo.
- Se ele colar a nota: use-a como contexto e siga.

## 4. Lembrar coisas duráveis

Se o usuário disser "lembra disso", ou surgir algo que vale pra outras conversas (preferência, decisão, dado fixo), salve com `memoria_salvar_nota` (com conector). Antes de pedir pra ele repetir algo que talvez já tenha contado, procure com `memoria_buscar`.

Nunca salve senhas, documentos pessoais ou dados de cartão.
