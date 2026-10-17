# Rubi

> **Só o que vale ouro fica no contexto.**

**Gaste menos token sem perder o fio.** O Rubi é um plugin pro Claude Code (e uma extensão + skill pro app e pro site) que mantém as conversas curtas sozinho, guarda o "onde paramos" num vault markdown que abre no Obsidian e mostra pra onde o seu token está indo.

Inspirado no [ai-memory do Akita](https://github.com/akitaonrails/ai-memory), com outro foco: em vez de levar memória entre agentes diferentes, aqui o objetivo é **cortar o custo de sessões longas** dentro do próprio Claude, sem servidor rodando e sem nenhuma dependência além do Node.

---

## Por que isso existe

A cada mensagem, o Claude relê a conversa inteira. O cache deixa essa releitura mais barata, mas ela continua acontecendo, e o custo cresce com o tamanho da sessão: a mensagem 500 paga pelas 499 anteriores.

O raio-X deste plugin, rodado em 30 dias de uso real (284 sessões), mostrou:

| | |
|---|---|
| Custo que vem de **reler o contexto** (leitura de cache) | **71%** |
| Custo concentrado em sessões que passaram de **150k tokens** | **97%** |
| Sessões que chegaram perto de **1 milhão** de tokens | 68 |
| Contexto que já entra **antes da primeira mensagem** (mediana) | 48k |
| Ferramenta que mais pesou carregada no contexto | Bash (15%) |

O cache funcionava bem (99% de acerto). O problema era a sessão comprida. A simulação com a sessão compactando em 150k e o handoff preservando o fio deu **cerca de 1/3 de economia** no total.

## O que ele faz

```
conversa crescendo...
   │
   ├─ 80% da janela → MEDIDOR avisa o Claude, que salva um HANDOFF no vault
   │                  (objetivo, decisões, arquivos-chave, próximo passo)
   │
   ├─ janela cheia  → o Claude Code COMPACTA sozinho (você não faz nada)
   │                  antes disso, um hook grava no vault o registro do trecho:
   │                  seus pedidos, arquivos alterados, comandos rodados
   │
   └─ logo depois   → um hook devolve o handoff + o registro pro Claude,
                      que continua de onde parou com ~50k em vez de 500k+
```

| Peça | O que faz | Onde |
|---|---|---|
| **Compactação cedo** | Faz o Claude Code compactar em 150k (configurável) em vez de perto de 1M | `CLAUDE_CODE_AUTO_COMPACT_WINDOW` no `settings.json` |
| **Medidor** | Lê o tamanho real do contexto a cada mensagem/ferramenta e pede o handoff antes da compactação | hooks `UserPromptSubmit` e `PostToolUse` |
| **Registro automático** | Antes de cada compactação, salva o que vai sumir: pedidos, arquivos, comandos e a última resposta | hook `PreCompact` |
| **Volta da memória** | Depois da compactação ou do `/clear`, injeta o handoff. Ao abrir uma sessão, mostra só um índice curto | hook `SessionStart` |
| **Guarda de leitura** | Barra a leitura inteira de arquivo gigante (Read ou `cat`) e sugere Grep ou `offset/limit`. Se repetir a mesma chamada, ela passa | hook `PreToolUse` |
| **Vault** | Markdown puro, uma pasta por projeto, com links `[[...]]` pro Obsidian | servidor MCP `rubi` |
| **Raio-X** | Mostra pra onde o token foi: composição do custo, sessões mais caras, ferramentas que mais pesam, cache expirado, simulação | `/rubi:raio-x` |
| **Auditor** | Mostra o que entra fixo em toda sessão (CLAUDE.md, memória, skills, MCP) e sugere cortes | `/rubi:raio-x` |

### Ferramentas MCP

| Ferramenta | Pra quê |
|---|---|
| `rubi_buscar` | Busca nas notas, handoffs e registros (ignora acento, devolve só trechos) |
| `rubi_ler` | Abre um arquivo do vault (não sai da pasta do vault) |
| `rubi_salvar_nota` | Conhecimento durável: decisões, mapas, armadilhas (`substituir` ou `anexar`) |
| `rubi_salvar_handoff` | O "onde paramos" |
| `rubi_ultimo_handoff` | Pega o handoff mais recente do projeto |
| `rubi_projetos` | Lista os projetos do vault |
| `rubi_raio_x` / `rubi_auditar` | Diagnóstico de gasto (só no Claude Code) |

### Skills

- `/rubi:handoff`: salva o "onde paramos" agora (o medidor chama sozinho).
- `/rubi:memoria <assunto>`: busca na memória do projeto, e ensina o Claude a salvar o que vale guardar.
- `/rubi:raio-x`: diagnóstico de gasto com as 3 ações que mais economizam.

---

## Instalação

Precisa de **Node 18+**.

### Claude Code (terminal, VS Code, JetBrains)

Dentro do Claude Code:

```
/plugin marketplace add YURIBEDRAN/rubi
/plugin install rubi@rubi
```

Depois, ligue a compactação cedo e escolha a pasta do vault:

```bash
git clone https://github.com/YURIBEDRAN/rubi
cd rubi
node scripts/instalar.mjs
```

O instalador pergunta a pasta do vault (padrão `~/rubi-vault`) e em quantos tokens compactar (padrão 150000, mínimo 100000). Ele grava `CLAUDE_CODE_AUTO_COMPACT_WINDOW` no `env` do `~/.claude/settings.json` e faz backup em `settings.json.bak-rubi`. Pra voltar ao comportamento padrão: `node scripts/instalar.mjs --desfazer`.

Sem rodar o instalador, o plugin funciona do mesmo jeito, mas o Claude Code só compacta perto do limite do modelo. Nesse caso o medidor avisa em 120k e sugere `/compact`.

> Pra testar sem instalar: `claude --plugin-dir caminho/para/rubi`.

### App de desktop (Claude Desktop)

1. Baixe `rubi.mcpb` em [Releases](https://github.com/YURIBEDRAN/rubi/releases), ou gere com `npm run empacotar`.
2. Abra o arquivo com o Claude Desktop (ou arraste pra **Configurações → Extensões**) e escolha a pasta do vault.
3. Suba também a skill `rubi.zip` (próxima seção). É ela que ensina o Claude a perceber quando a conversa ficou longa.

### Site e celular (claude.ai)

No app e no site não existem hooks, então a parte automática vira comportamento: a skill ensina o Claude a perceber que a conversa ficou longa, oferecer o handoff e continuar numa conversa nova.

**Só a skill (sem servidor nenhum):**
1. Baixe `rubi.zip` em Releases (ou gere com `npm run empacotar`).
2. No claude.ai: **Configurações → Capacidades → Skills → Enviar skill**. A opção de skills precisa estar ativada no seu plano.
3. Quando a conversa ficar longa, o Claude entrega o handoff num bloco pra você colar numa conversa nova.

**Skill + conector (memória salva de verdade, inclusive no celular):**
O mesmo servidor MCP roda em modo HTTP numa VPS sua:

```bash
export RUBI_TOKEN=$(openssl rand -hex 24)   # segredo, vai na URL
export RUBI_VAULT=/srv/rubi-vault
node scripts/mcp-server.mjs --http --porta 8787
```

Ele escuta só em `127.0.0.1`. Coloque um proxy com HTTPS na frente, por exemplo Caddy:

```
rubi.seudominio.com {
  reverse_proxy 127.0.0.1:8787
}
```

No claude.ai: **Configurações → Conectores → Adicionar conector personalizado**, com a URL `https://rubi.seudominio.com/mcp/<RUBI_TOKEN>`. O conector configurado no site também aparece no app de celular.

> **Segurança:** quem tiver essa URL lê e escreve na sua memória. Trate a URL como senha, não guarde segredos no vault e rode o servidor como um usuário sem privilégios. Se quiser o vault igual em todas as máquinas, versione a pasta com git.

---

## Configuração

`~/.rubi/config.json`:

```json
{
  "vault": "D:/Notas/rubi-vault",
  "janela": 150000,
  "avisoPct": 0.8,
  "guarda": { "ativa": true, "maxLinhas": 800, "maxBytes": 80000 }
}
```

| Chave | Padrão | Efeito |
|---|---|---|
| `vault` | `~/rubi-vault` | Pasta do vault (também `RUBI_VAULT`) |
| `janela` | `150000` | Tamanho de referência da sessão. `CLAUDE_CODE_AUTO_COMPACT_WINDOW` tem prioridade |
| `avisoPct` | `0.8` | Em que fração da janela o medidor pede o handoff |
| `guarda.maxLinhas` / `maxBytes` | `800` / `80000` | A partir de onde a leitura inteira de um arquivo é barrada |
| `guarda.ativa` | `true` | Desliga a guarda |

O estado por sessão (o que já foi avisado ou liberado) fica em `~/.rubi/estado/`.

## O vault

```
rubi-vault/
  LEIA-ME.md
  meu-projeto/
    _indice.md                        links pra tudo (gerado)
    notas/decisões.md                 conhecimento durável — edite à vontade
    handoffs/2026-10-17-1530.md       "onde paramos"
    sessoes/2026-10-17-1531-8ab90355.md   registro automático pré-compactação
  _geral/                             notas que não são de um projeto (app/site)
```

O nome do projeto é a pasta raiz do git, ou a pasta atual. Tudo é markdown com frontmatter: dá pra abrir no Obsidian, procurar com `grep`, editar na mão e versionar.

## Raio-X e auditoria

```bash
node scripts/raio-x.mjs --dias 30       # pra onde o token foi
node scripts/auditar.mjs <pasta-do-projeto>   # o que entra fixo em toda sessão
```

Os custos são mostrados em **tokens-equivalentes de input**: leitura de cache vale 0,1, escrita de cache 1,25 (5 min) ou 2 (1 h), output 5. São as proporções da tabela de preços da Anthropic, então o resultado vale pra qualquer modelo e plano, sem chutar valor em dinheiro.

Exemplo do que o auditor costuma achar: um `CLAUDE.md` de 18k tokens relido em toda mensagem, ou 50k tokens de definições de ferramentas de MCP e conectores que o projeto nem usa.

---

## Limites (sendo honesto)

- **Hook não dá `/clear` nem `/compact`.** Quem compacta é o próprio Claude Code, pelo limite configurado. O plugin cuida do antes e do depois.
- **Hook não muda o resumo nativo da compactação.** Por isso o handoff e o registro vão pro vault e são reinjetados logo depois.
- **No app e no site não há medidor exato.** O Claude estima pelo tamanho da conversa, conforme a skill.
- **A compactação tem um custo próprio** (uma chamada que lê o contexto pra resumir). Compactar em 150k sai muito mais barato do que carregar 900k por centenas de mensagens, mas abaixo de ~100k não compensa, e por isso o mínimo é esse.
- **A guarda nega uma vez.** Se o Claude realmente precisar do arquivo inteiro, ele repete a chamada e ela passa.
- A busca é por palavra-chave, sem embeddings. Pra vaults de até alguns milhares de notas, é instantânea.

## Desenvolvimento

```bash
npm test             # 9 testes: medidor, compactação, guarda, busca, MCP stdio e HTTP
npm run empacotar    # gera dist/rubi.mcpb e dist/rubi.zip
claude plugin validate .
```

```
.claude-plugin/   plugin.json + marketplace.json
hooks/hooks.json  SessionStart, UserPromptSubmit, PostToolUse, PreCompact, PreToolUse
skills/           handoff, memoria, raio-x
scripts/
  hook.mjs        todos os hooks (inicio | medidor | pre-compactar | guarda)
  mcp-server.mjs  servidor MCP (stdio e HTTP), sem dependências
  raio-x.mjs      diagnóstico de gasto a partir dos transcripts
  auditar.mjs     diagnóstico do contexto fixo
  instalar.mjs    configura vault e compactação cedo
  empacotar.mjs   gera os pacotes do app
  lib/            config, vault e leitura de transcript
app/
  desktop/manifest.json        extensão do Claude Desktop (.mcpb)
  claude-ai/rubi/  skill pro claude.ai
```

Os hooks nunca quebram a sessão: qualquer erro sai em silêncio. Pra ver o erro, defina `RUBI_DEBUG=1`. O medidor lê só o último 0,5 MB do transcript e roda em ~0,1 s, mesmo com transcripts de 100+ MB.

## Créditos

- O nome vem de **Rubi**nger, e da ideia de guardar só o que é precioso.
- [akitaonrails/ai-memory](https://github.com/akitaonrails/ai-memory): a ideia de memória como wiki markdown versionável, com captura por hooks.
- Feito com o Claude Code.

## Licença

MIT
