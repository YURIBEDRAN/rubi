#!/usr/bin/env node
// Auditor do contexto fixo: o que entra em toda sessão antes do primeiro "oi".
// Uso: node auditar.mjs [pasta-do-projeto]

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const projeto = path.resolve(process.argv[2] || process.cwd());
const CLAUDE = path.join(os.homedir(), '.claude');
const tok = (chars) => Math.round(chars / 3.5);
const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
const ler = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } };

const itens = []; // { grupo, nome, tokens, dica }
const add = (grupo, nome, texto, dica) => texto != null && itens.push({ grupo, nome, tokens: tok(texto.length), dica });

// CLAUDE.md: global, e da pasta do projeto pra cima
add('CLAUDE.md', '~/.claude/CLAUDE.md', ler(path.join(CLAUDE, 'CLAUDE.md')));
for (let d = projeto; ; d = path.dirname(d)) {
  for (const n of ['CLAUDE.md', 'CLAUDE.local.md', path.join('.claude', 'CLAUDE.md')]) {
    if (path.join(d, n) !== path.join(CLAUDE, 'CLAUDE.md')) add('CLAUDE.md', path.join(d, n), ler(path.join(d, n)));
  }
  if (path.dirname(d) === d) break;
}

// Memória automática do projeto (só as primeiras ~200 linhas do MEMORY.md entram)
const slugProj = projeto.replace(/[^A-Za-z0-9]/g, '-');
const memoria = ler(path.join(CLAUDE, 'projects', slugProj, 'memory', 'MEMORY.md'));
if (memoria != null) add('Memória', 'MEMORY.md', memoria.split('\n').slice(0, 200).join('\n'));

// Skills: só nome + descrição entram no contexto
function descricoesSkills(raiz, grupo) {
  const achar = function* (dir, prof = 0) {
    if (prof > 6) return;
    let es = []; try { es = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of es) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) yield* achar(p, prof + 1);
      else if (e.name === 'SKILL.md') yield p;
    }
  };
  let n = 0, chars = 0;
  for (const p of achar(raiz)) {
    const fm = (ler(p) || '').match(/^---\n([\s\S]*?)\n---/)?.[1] || '';
    const desc = fm.match(/^description:\s*([\s\S]*?)(?=\n\w+:|$)/m)?.[1] || '';
    n++; chars += desc.length + 40;
  }
  if (n) itens.push({ grupo: 'Skills', nome: `${grupo} (${n} skills)`, tokens: tok(chars) });
}
descricoesSkills(path.join(CLAUDE, 'skills'), '~/.claude/skills');
if (path.join(projeto, '.claude') !== CLAUDE) descricoesSkills(path.join(projeto, '.claude', 'skills'), 'skills do projeto');
descricoesSkills(path.join(CLAUDE, 'plugins', 'cache'), 'plugins instalados');

// MCP configurados
let mcps = [];
try {
  const cj = JSON.parse(ler(path.join(os.homedir(), '.claude.json')) || '{}');
  mcps.push(...Object.keys(cj.mcpServers || {}));
  const chaveProj = Object.keys(cj.projects || {}).find((k) => path.resolve(k) === projeto);
  if (chaveProj) mcps.push(...Object.keys(cj.projects[chaveProj].mcpServers || {}));
} catch {}
try { mcps.push(...Object.keys(JSON.parse(ler(path.join(projeto, '.mcp.json')) || '{}').mcpServers || {})); } catch {}

// Contexto real da 1ª chamada nas últimas sessões deste projeto
function contextoInicialReal() {
  const dir = path.join(CLAUDE, 'projects', slugProj);
  let arqs = [];
  try { arqs = fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl')).map((f) => path.join(dir, f)); } catch { return null; }
  arqs = arqs.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs).slice(0, 10);
  const vals = [];
  for (const a of arqs) {
    for (const l of (ler(a) || '').split('\n')) {
      if (!l.includes('"usage"')) continue;
      try {
        const u = JSON.parse(l).message?.usage;
        if (u) { vals.push((u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0)); break; }
      } catch {}
    }
  }
  return vals.length ? vals.sort((a, b) => a - b)[vals.length >> 1] : null;
}

const real = contextoInicialReal();
const somado = itens.reduce((s, i) => s + i.tokens, 0);

console.log(`\n=== AUDITORIA DO CONTEXTO FIXO — ${projeto} ===\n`);
let grupo = '';
for (const i of itens) {
  if (i.grupo !== grupo) { grupo = i.grupo; console.log(`${grupo}:`); }
  console.log(`  ${fmt(i.tokens).padStart(6)}  ${i.nome}`);
}
console.log(`MCP configurados aqui: ${mcps.length ? mcps.join(', ') : 'nenhum'} (+ conectores do claude.ai, se ligados)`);
console.log(`\nSomado acima: ~${fmt(somado)} tokens`);
if (real) {
  console.log(`Contexto real na 1ª chamada (mediana das últimas sessões): ${fmt(real)} tokens`);
  console.log(`Resto (prompt do sistema + definições de ferramentas/MCP/conectores): ~${fmt(Math.max(0, real - somado))} tokens`);
}

console.log('\nSugestões:');
const sug = [];
const claudeMd = itens.filter((i) => i.grupo === 'CLAUDE.md');
for (const c of claudeMd) if (c.tokens > 2500) sug.push(`${c.nome} tem ${fmt(c.tokens)} tokens. Deixe só regras que valem sempre; detalhes viram notas no vault (memoria_salvar_nota) e são buscados quando precisar.`);
if (memoria && memoria.split('\n').length > 150) sug.push('MEMORY.md passa de 150 linhas: só as primeiras 200 entram. Junte ou apague entradas velhas.');
const skills = itens.filter((i) => i.grupo === 'Skills').reduce((s, i) => s + i.tokens, 0);
if (skills > 3000) sug.push(`Descrições de skills somam ~${fmt(skills)}. Desinstale plugins/skills que não usa (/plugin) ou encurte as descrições.`);
if (real && real - somado > 25000) sug.push(`Há ~${fmt(real - somado)} tokens em ferramentas e prompt do sistema. Conectores do claude.ai e servidores MCP que este projeto não usa podem ser desligados aqui (/mcp).`);
if (!sug.length) sug.push('Nada gritante. O contexto fixo está enxuto.');
for (const s of sug) console.log(`  - ${s}`);
console.log(`\nCada 10k cortados aqui deixam de ser relidos em TODAS as mensagens de TODAS as sessões.`);
