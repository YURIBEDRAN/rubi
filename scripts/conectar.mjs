#!/usr/bin/env node
// Conecta o Rubi a outros agentes de código além do Claude Code.
//
//   node scripts/conectar.mjs <agente> [--projeto <pasta>] [--so-mostrar] [--sem-instrucoes] [--sem-hooks]
//   node scripts/conectar.mjs --listar
//
// Pra cada agente: registra o servidor MCP do Rubi na configuração dele (com backup),
// escreve as instruções no arquivo que ele lê sozinho (AGENTS.md, GEMINI.md, regras do Cursor...)
// e, onde o agente aceita hooks que injetam contexto, liga o mapa no início e a lembrança a cada pedido.
// Formatos arriscados de editar (YAML, JSON com comentários) são só mostrados, pra você colar.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { raizProjeto } from './lib/config.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SERVIDOR = path.join(AQUI, 'mcp-server.mjs').split(path.sep).join('/');
const HOOK = path.join(AQUI, 'hook.mjs').split(path.sep).join('/');
const HOME = os.homedir();
const APPDATA = process.env.APPDATA || path.join(HOME, 'AppData', 'Roaming');
const XDG = process.env.XDG_CONFIG_HOME || path.join(HOME, '.config');

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const valor = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
const SO_MOSTRAR = flag('--so-mostrar');

const INSTRUCOES = `## Rubi (project memory)

This project uses Rubi, a knowledge graph and code map exposed as MCP tools (server \`rubi\`).

1. At the start of a task, call \`rubi_mapa\` once: modules, central files and stored knowledge.
2. Before exploring the code, call \`rubi_contexto\` with the question and 4-8 related terms (synonyms, likely function or file names). It may already know the answer or point to the right file.
3. When you learn something expensive to rediscover (a decision and why, a bug and its fix, a gotcha, how something works), call \`rubi_registrar\` and link it to the files. If a decision changed, use \`substitui\`.
4. Before the context gets long or the session ends, save where you are with \`rubi_salvar_handoff\`. To resume, use \`rubi_ultimo_handoff\`.

Memory lives in \`.rubi/\` as plain markdown (opens in Obsidian). Never store secrets there.`;

// ---- agentes ----
const AGENTES = {
  codex: {
    nome: 'OpenAI Codex (CLI, IDE e app)',
    config: () => path.join(process.env.CODEX_HOME || path.join(HOME, '.codex'), 'config.toml'),
    formato: 'toml',
    instrucoes: 'AGENTS.md',
    hooks: () => ({ arquivo: path.join(process.env.CODEX_HOME || path.join(HOME, '.codex'), 'hooks.json'), inicio: 'SessionStart', pedido: 'UserPromptSubmit' }),
    nota: 'Funciona com modelos da OpenAI e com modelos locais (codex --oss, via Ollama ou LM Studio).',
  },
  gemini: {
    nome: 'Gemini CLI',
    config: () => path.join(HOME, '.gemini', 'settings.json'),
    formato: 'json', chave: 'mcpServers',
    instrucoes: 'GEMINI.md',
    hooks: () => ({ arquivo: path.join(HOME, '.gemini', 'settings.json'), noMesmoArquivo: true, inicio: 'SessionStart', pedido: 'BeforeAgent' }),
  },
  cursor: {
    nome: 'Cursor',
    config: () => path.join(HOME, '.cursor', 'mcp.json'),
    formato: 'json', chave: 'mcpServers', extra: { type: 'stdio', env: { RUBI_PROJECT_DIR: '${workspaceFolder}' } },
    instrucoes: '.cursor/rules/rubi.mdc',
  },
  vscode: {
    nome: 'GitHub Copilot no VS Code',
    config: (proj) => proj && path.join(proj, '.vscode', 'mcp.json'),
    porProjeto: true,
    formato: 'json', chave: 'servers', extra: { type: 'stdio', env: { RUBI_PROJECT_DIR: '${workspaceFolder}' } },
    instrucoes: 'AGENTS.md',
  },
  windsurf: {
    nome: 'Windsurf',
    config: () => [path.join(HOME, '.codeium', 'windsurf', 'mcp_config.json'), path.join(process.platform === 'win32' ? APPDATA : XDG, 'devin', 'mcp_config.json')].find((p) => fs.existsSync(p)) || path.join(HOME, '.codeium', 'windsurf', 'mcp_config.json'),
    formato: 'json', chave: 'mcpServers',
    instrucoes: 'AGENTS.md',
  },
  cline: {
    nome: 'Cline',
    config: () => process.env.CLINE_MCP_SETTINGS_PATH || path.join(HOME, '.cline', 'data', 'settings', 'cline_mcp_settings.json'),
    formato: 'json', chave: 'mcpServers', extra: { disabled: false, autoApprove: [] },
    instrucoes: 'AGENTS.md',
    nota: 'Aceita modelos locais (Ollama, LM Studio) com suporte a ferramentas.',
  },
  opencode: {
    nome: 'OpenCode',
    config: () => path.join(XDG, 'opencode', 'opencode.json'),
    formato: 'json', chave: 'mcp', opencode: true,
    instrucoes: 'AGENTS.md',
    nota: 'Aceita modelos locais por provedor compatível com OpenAI.',
  },
  continue: {
    nome: 'Continue',
    config: (proj) => proj && path.join(proj, '.continue', 'mcpServers', 'rubi.yaml'),
    porProjeto: true,
    formato: 'continue-yaml',
    instrucoes: '.continue/rules/rubi.md',
    nota: 'MCP só funciona no modo agent. Aceita Ollama e LM Studio.',
  },
  goose: {
    nome: 'Goose',
    config: () => process.platform === 'win32' ? path.join(APPDATA, 'Block', 'goose', 'config', 'config.yaml') : path.join(XDG, 'goose', 'config.yaml'),
    formato: 'goose-yaml',
    instrucoes: 'AGENTS.md',
    nota: 'Aceita Ollama.',
  },
  zed: {
    nome: 'Zed',
    config: () => process.platform === 'win32' ? path.join(APPDATA, 'Zed', 'settings.json') : path.join(XDG, 'zed', 'settings.json'),
    formato: 'zed',
    instrucoes: 'AGENTS.md',
    nota: 'O Zed lê só o primeiro arquivo de regras que achar (.rules, .cursorrules, ..., AGENTS.md).',
  },
};

// ---- trechos ----
const servidorJson = (ag) => {
  if (ag.opencode) return { type: 'local', command: ['node', SERVIDOR], enabled: true };
  return { command: 'node', args: [SERVIDOR], ...(ag.extra || {}) };
};
const trechoToml = `[mcp_servers.rubi]\ncommand = "node"\nargs = ["${SERVIDOR}"]\n`;
const trechoContinue = `name: rubi\nversion: 0.0.1\nschema: v1\nmcpServers:\n  - name: rubi\n    type: stdio\n    command: node\n    args:\n      - ${SERVIDOR}\n`;
const trechoGoose = `extensions:\n  rubi:\n    name: rubi\n    type: stdio\n    cmd: node\n    args:\n      - ${SERVIDOR}\n    enabled: true\n    timeout: 300\n`;
const trechoZed = `"context_servers": {\n  "rubi": { "command": "node", "args": ["${SERVIDOR}"] }\n}`;

const comandoHook = (acao) => `node "${HOOK}" ${acao}`;

function backup(p) {
  if (fs.existsSync(p)) { const b = `${p}.bak-rubi`; if (!fs.existsSync(b)) fs.copyFileSync(p, b); return b; }
  return null;
}

function lerJson(p) {
  if (!fs.existsSync(p)) return {};
  const t = fs.readFileSync(p, 'utf8');
  if (!t.trim()) return {};
  return JSON.parse(t); // JSON com comentário falha aqui e cai no "só mostrar"
}

function gravarJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  backup(p);
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
}

const relatorio = [];
const mostrar = (titulo, conteudo) => relatorio.push(`\n${titulo}\n${'-'.repeat(titulo.length)}\n${conteudo}`);

function configurarMcp(ag, proj) {
  const arq = ag.config(proj);
  if (!arq) return mostrar('Configuração MCP', 'Esse agente é configurado por projeto: rode de dentro do projeto ou passe --projeto <pasta>.');
  if (ag.formato === 'json') {
    const trecho = JSON.stringify({ [ag.chave]: { rubi: servidorJson(ag) } }, null, 2);
    if (SO_MOSTRAR) return mostrar(`Cole em ${arq}`, trecho);
    try {
      const obj = lerJson(arq);
      obj[ag.chave] = { ...(obj[ag.chave] || {}), rubi: servidorJson(ag) };
      gravarJson(arq, obj);
      relatorio.push(`✓ servidor MCP registrado em ${arq}`);
    } catch {
      mostrar(`Não consegui editar ${arq} com segurança (tem comentários?). Cole isto dentro dele`, trecho);
    }
    return;
  }
  if (ag.formato === 'toml') {
    if (SO_MOSTRAR) return mostrar(`Cole no fim de ${arq}`, trechoToml);
    const atual = fs.existsSync(arq) ? fs.readFileSync(arq, 'utf8') : '';
    if (/^\[mcp_servers\.rubi\]/m.test(atual)) return relatorio.push(`✓ servidor MCP já estava em ${arq}`);
    fs.mkdirSync(path.dirname(arq), { recursive: true });
    backup(arq);
    fs.writeFileSync(arq, `${atual.replace(/\s*$/, '')}\n\n${trechoToml}`);
    return relatorio.push(`✓ servidor MCP registrado em ${arq}`);
  }
  if (ag.formato === 'continue-yaml') {
    if (SO_MOSTRAR || fs.existsSync(arq)) return mostrar(`Crie ${arq} com`, trechoContinue);
    fs.mkdirSync(path.dirname(arq), { recursive: true });
    fs.writeFileSync(arq, trechoContinue);
    return relatorio.push(`✓ servidor MCP criado em ${arq}`);
  }
  if (ag.formato === 'goose-yaml') return mostrar(`Cole em ${arq} (dentro de "extensions:", se já existir)`, trechoGoose);
  if (ag.formato === 'zed') return mostrar(`Cole dentro do objeto principal de ${arq}`, trechoZed);
}

function configurarHooks(ag) {
  if (!ag.hooks || flag('--sem-hooks')) return;
  const h = ag.hooks();
  const bloco = {
    [h.inicio]: [{ hooks: [{ type: 'command', command: comandoHook('inicio'), timeout: 30 }] }],
    [h.pedido]: [{ hooks: [{ type: 'command', command: comandoHook('lembrar'), timeout: 10 }] }],
  };
  if (SO_MOSTRAR) return mostrar(`Hooks (cole em ${h.arquivo}, na chave "hooks")`, JSON.stringify({ hooks: bloco }, null, 2));
  try {
    const obj = lerJson(h.arquivo);
    obj.hooks = obj.hooks || {};
    for (const [evento, lista] of Object.entries(bloco)) {
      const existentes = (obj.hooks[evento] || []).filter((g) => !JSON.stringify(g).includes('hook.mjs'));
      obj.hooks[evento] = [...existentes, ...lista];
    }
    gravarJson(h.arquivo, obj);
    relatorio.push(`✓ hooks (mapa no início, lembrança a cada pedido) em ${h.arquivo}`);
  } catch {
    mostrar(`Não consegui editar ${h.arquivo}. Hooks pra colar`, JSON.stringify({ hooks: bloco }, null, 2));
  }
}

const INI = '<!-- rubi:inicio -->', FIM = '<!-- rubi:fim -->';
function escreverInstrucoes(ag, proj) {
  if (flag('--sem-instrucoes')) return;
  if (!proj) return mostrar('Instruções', `Rode de dentro de um projeto (ou use --projeto) pra eu escrever as instruções em ${ag.instrucoes}.`);
  const arq = path.join(proj, ag.instrucoes);
  const corpo = arq.endsWith('.mdc') ? `---\ndescription: Rubi project memory (MCP)\nalwaysApply: true\n---\n\n${INSTRUCOES}\n` : `${INI}\n${INSTRUCOES}\n${FIM}\n`;
  if (SO_MOSTRAR) return mostrar(`Instruções pra ${arq}`, corpo);
  fs.mkdirSync(path.dirname(arq), { recursive: true });
  if (arq.endsWith('.mdc') || !fs.existsSync(arq)) { fs.writeFileSync(arq, corpo); return relatorio.push(`✓ instruções em ${arq}`); }
  const atual = fs.readFileSync(arq, 'utf8');
  const i = atual.indexOf(INI), j = atual.indexOf(FIM);
  const novo = i >= 0 && j > i ? atual.slice(0, i) + corpo.trim() + atual.slice(j + FIM.length) : `${atual.replace(/\s*$/, '')}\n\n${corpo}`;
  backup(arq);
  fs.writeFileSync(arq, novo);
  relatorio.push(`✓ instruções em ${arq}`);
}

// ---- principal ----
const nome = args.find((a) => !a.startsWith('--') && a !== valor('--projeto'));
if (flag('--listar') || !nome || !AGENTES[nome]) {
  console.log('Uso: node scripts/conectar.mjs <agente> [--projeto <pasta>] [--so-mostrar] [--sem-instrucoes] [--sem-hooks]\n\nAgentes:');
  for (const [k, a] of Object.entries(AGENTES)) console.log(`  ${k.padEnd(9)} ${a.nome}${a.hooks ? '  (com hooks)' : ''}`);
  console.log('\nClaude Code: use o plugin (/plugin install rubi@rubi). Claude Desktop: rubi.mcpb.');
  process.exit(nome && !AGENTES[nome] ? 1 : 0);
}

const ag = AGENTES[nome];
const proj = raizProjeto(valor('--projeto') || process.cwd());
configurarMcp(ag, proj);
configurarHooks(ag);
escreverInstrucoes(ag, proj);

console.log(`Rubi → ${ag.nome}\n`);
console.log(relatorio.join('\n'));
if (ag.nota) console.log(`\nObs.: ${ag.nota}`);
console.log(`\nReinicie o ${ag.nome} e peça: "use o rubi_mapa pra ver o mapa deste projeto".`);
if (!SO_MOSTRAR) console.log('Backups dos arquivos alterados ficam ao lado deles, com final .bak-rubi.');
