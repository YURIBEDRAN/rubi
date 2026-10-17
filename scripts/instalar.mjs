#!/usr/bin/env node
// Configura o memoria-claude na máquina:
//   1. escolhe a pasta do vault (~/.memoria-claude/config.json)
//   2. liga a compactação automática cedo no ~/.claude/settings.json (com backup)
// Uso: node instalar.mjs [--vault <pasta>] [--janela 150000] [--sim]
//      node instalar.mjs --desfazer   (tira a compactação cedo do settings.json)

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline/promises';
import { lerConfig, salvarConfig, ARQ_CONFIG } from './lib/config.mjs';

const args = process.argv.slice(2);
const valor = (nome) => { const i = args.indexOf(nome); return i >= 0 ? args[i + 1] : undefined; };
const SETTINGS = path.join(os.homedir(), '.claude', 'settings.json');
const CHAVE = 'CLAUDE_CODE_AUTO_COMPACT_WINDOW';

function lerSettings() {
  try { return JSON.parse(fs.readFileSync(SETTINGS, 'utf8')); } catch (e) {
    if (e.code === 'ENOENT') return {};
    throw new Error(`Não consegui ler ${SETTINGS}: ${e.message}. Corrija o JSON e rode de novo.`);
  }
}

function gravarSettings(s) {
  fs.mkdirSync(path.dirname(SETTINGS), { recursive: true });
  if (fs.existsSync(SETTINGS)) fs.copyFileSync(SETTINGS, `${SETTINGS}.bak-memoria`);
  fs.writeFileSync(SETTINGS, JSON.stringify(s, null, 2) + '\n');
}

if (args.includes('--desfazer')) {
  const s = lerSettings();
  if (s.env?.[CHAVE]) { delete s.env[CHAVE]; gravarSettings(s); console.log(`Removido ${CHAVE} de ${SETTINGS}.`); }
  else console.log('Nada a desfazer.');
  process.exit(0);
}

const atual = lerConfig();
let vault = valor('--vault');
let janela = Number(valor('--janela')) || 0;

if (!args.includes('--sim') && process.stdin.isTTY) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  vault ||= (await rl.question(`Pasta do vault [${atual.vault}]: `)).trim() || atual.vault;
  janela ||= Number((await rl.question('Compactar a conversa em quantos tokens? (100000 a 1000000) [150000]: ')).trim()) || 150000;
  rl.close();
}
vault = path.resolve(vault || atual.vault);
janela = Math.min(1e6, Math.max(1e5, janela || 150000));

fs.mkdirSync(vault, { recursive: true });
const leiame = path.join(vault, 'LEIA-ME.md');
if (!fs.existsSync(leiame)) {
  fs.writeFileSync(leiame, `# Vault do memoria-claude

Uma pasta por projeto:

- \`notas/\` conhecimento durável (decisões, mapas, armadilhas). Pode editar à vontade.
- \`handoffs/\` "onde paramos", escritos pelo Claude antes de compactar ou trocar de janela.
- \`sessoes/\` registro automático de cada trecho compactado.
- \`_indice.md\` gerado sozinho, com links pra tudo.

Abra esta pasta como vault no Obsidian pra navegar pelos links.
`);
}
salvarConfig({ vault, janela });

const s = lerSettings();
s.env = { ...(s.env || {}), [CHAVE]: String(janela) };
gravarSettings(s);

console.log(`
memoria-claude configurado.
  Vault:        ${vault}
  Config:       ${ARQ_CONFIG}
  Compactação:  ${janela} tokens (${CHAVE} em ${SETTINGS}; backup em settings.json.bak-memoria)

Agora instale o plugin dentro do Claude Code:
  /plugin marketplace add YURIBEDRAN/memoria-claude
  /plugin install memoria-claude@memoria-claude

Vale pras sessões novas. Pra desfazer a compactação cedo: node scripts/instalar.mjs --desfazer
`);
