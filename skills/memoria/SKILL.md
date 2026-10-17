---
name: memoria
description: Memória do projeto do Rubi, com mapa do código e grafo de conhecimento em .rubi/ (abre no Obsidian). Use pra achar contexto antes de explorar o código e pra guardar decisões, bugs, armadilhas e conceitos. "/rubi:memoria <assunto>" busca.
---

# Memória do projeto (Rubi)

O Rubi guarda o projeto em três níveis, em `.rubi/` na raiz:
- **nível 0:** `mapa.md`, que entra no início de toda sessão. Tem módulos, arquivos centrais e o conhecimento mais importante.
- **nível 1:** `modulos/<x>.md`, aberto com `rubi_mapa(modulo)`.
- **nível 2:** `conhecimento/*.md`, os nós do grafo, achados com `rubi_contexto`.

## Achar antes de explorar

Antes de abrir vários arquivos pra entender algo, chame `rubi_contexto` com:
- `pergunta`: o que você quer saber;
- `termos`: 4-8 sinônimos, termos técnicos e nomes prováveis de função ou arquivo. Você é a parte "semântica" da busca, então capriche;
- `arquivos`: os que você já sabe que importam.

A resposta junta texto, nomes de arquivo e vizinhança no grafo. Por isso traz também o que está ligado ao assunto, mesmo que não use a mesma palavra. Itens marcados com ⚠ apontam pra arquivos que mudaram depois da nota: confirme no código. Pra perguntas amplas, delegue ao agente `rubi-pesquisador`.

Se o usuário passou um assunto (`/rubi:memoria <assunto>`), busque e resuma o que achou.

## Guardar o que vale (`rubi_registrar`)

Registre quando descobrir algo que custaria caro redescobrir:

| tipo | quando |
|---|---|
| `decisao` | escolheu X em vez de Y; **sempre com o porquê** |
| `bug` | o que quebrou, a causa e a correção (`status: resolvido` quando fechar) |
| `armadilha` | o que parece certo e não é; erro que já aconteceu |
| `conceito` | termo do domínio ou peça do sistema ("Checkout", "fila de cobrança") |
| `como-fazer` | como rodar, testar, publicar, migrar |
| `preferencia` | como o usuário quer as coisas (`escopo: "pessoal"` se vale pra todo projeto) |

- Título curto e estável. Texto com 1-4 frases.
- Em `arquivos`, liste os arquivos envolvidos.
- Em `liga`, ligue a outros nós ou módulos (`rel`: sobre, depende_de, causa, corrige, usa, parte_de, contradiz).
- Decisão que mudou? Registre a nova com `substitui: "<título da antiga>"`. A antiga fica marcada, não some.
- O Rubi junta duplicados sozinho; não se preocupe em checar antes.
- Nada de segredos.

## Resumos

Quando entender o projeto ou um módulo e o resumo estiver vazio no mapa, escreva com `rubi_escrever_resumo`:
- alvo `mapa`: 3-6 linhas com o que é, a stack e como rodar;
- alvo `modulo:<nome>`: 2-5 linhas com a responsabilidade e os cuidados.
