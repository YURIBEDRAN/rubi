#!/usr/bin/env node
// Enxuga o contexto fixo por projeto, sem IA: olha nos transcripts quais ferramentas nativas pesadas
// nunca foram usadas naquele projeto e sugere negá-las ali (a definição sai do contexto de toda chamada).
//
//   node scripts/enxugar.mjs [--dias 30]                     mostra, por projeto, o que dá pra tirar
//   node scripts/enxugar.mjs --aplicar <pasta-do-projeto>     grava em <pasta>/.claude/settings.local.json
//
// Só mexe em settings.local.json do projeto (não vai pro git), com backup .bak-rubi. Nunca na config global.
// Pra desfazer: apague a regra de "permissions.deny" ou restaure o backup.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const DIAS = Number(opt('--dias', 30));
const APLICAR = opt('--aplicar', null);
const RAIZ = path.join(os.homedir(), '.claude', 'projects');
const desde = Date.now() - DIAS * 864e5;
// ferramentas nativas que pesam e que muita gente nunca usa num projeto; as essenciais (Read, Bash...) ficam de fora
const CANDIDATAS = new Set(['Artifact', 'Workflow', 'ScheduleWakeup', 'SendFeedback', 'ReportFindings', 'ListAgents', 'AskUserQuestion', 'NotebookEdit', 'RemoteTrigger']);
const MIN_SESSOES = 5; // com poucas sessões não dá pra dizer que "nunca usa"

function* jsonls(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) yield* jsonls(p); else if (e.name.endsWith('.jsonl')) yield p;
  }
}

const projetos = new Map(); // pasta do projeto -> { sessoes, chamadas, custo, ferramentas: Map(nome -> tokens), usos: Map }
for (const arq of jsonls(RAIZ)) {
  if (fs.statSync(arq).mtimeMs < desde || /[\\/]subagents[\\/]/.test(arq)) continue;
  let cwd = null, chamadas = 0, custo = 0;
  const vistos = new Set(), defs = new Map(), usos = new Map();
  for (const l of fs.readFileSync(arq, 'utf8').split('\n')) {
    if (!l) continue;
    let o; try { o = JSON.parse(l); } catch { continue; }
    if (!cwd && o.cwd) cwd = o.cwd;
    const a = o.attachment;
    if (a?.type === 'prompt_snapshot' && a.tools) for (const t of a.tools) defs.set(t.name, JSON.stringify(t).length / 6);
    const m = o.message;
    if (o.type === 'assistant' && m?.usage && m.id && !vistos.has(m.id)) {
      vistos.add(m.id); chamadas++;
      const u = m.usage, w1 = u.cache_creation?.ephemeral_1h_input_tokens || 0;
      custo += (u.input_tokens || 0) + ((u.cache_creation_input_tokens || 0) - w1) * 1.25 + w1 * 2 + (u.cache_read_input_tokens || 0) * 0.1 + (u.output_tokens || 0) * 5;
    }
    if (Array.isArray(m?.content)) for (const b of m.content) if (b.type === 'tool_use') usos.set(b.name, (usos.get(b.name) || 0) + 1);
  }
  if (!cwd || !chamadas || cwd.toLowerCase().startsWith(os.tmpdir().toLowerCase())) continue; // pastas temporárias (benchmarks) não são projetos
  const p = projetos.get(cwd) || { sessoes: 0, chamadas: 0, custo: 0, ferramentas: new Map(), usos: new Map() };
  p.sessoes++; p.chamadas += chamadas; p.custo += custo;
  for (const [n, t] of defs) p.ferramentas.set(n, Math.max(p.ferramentas.get(n) || 0, t));
  for (const [n, v] of usos) p.usos.set(n, (p.usos.get(n) || 0) + v);
  projetos.set(cwd, p);
}

function sugestao(p) {
  const tirar = [...p.ferramentas].filter(([n]) => CANDIDATAS.has(n) && !p.usos.get(n)).sort((a, b) => b[1] - a[1]);
  const tokens = tirar.reduce((s, [, t]) => s + t, 0);
  // cada token fixo é relido a 0.1 em toda chamada (estimativa conservadora: ignora a reescrita quando o cache vence)
  const economia = p.custo ? (tokens * 0.1 * p.chamadas) / p.custo : 0;
  return { tirar: tirar.map(([n]) => n), tokens, economia };
}

const norm = (d) => path.resolve(d).toLowerCase();
if (APLICAR) {
  const alvo = [...projetos].find(([cwd]) => norm(cwd) === norm(APLICAR));
  if (!alvo) { console.error(`Sem sessões de ${APLICAR} nos últimos ${DIAS} dias.`); process.exit(1); }
  const [cwd, p] = alvo;
  if (p.sessoes < MIN_SESSOES) { console.error(`Só ${p.sessoes} sessões nesse projeto; poucas pra afirmar que alguma ferramenta não é usada.`); process.exit(1); }
  const { tirar, tokens, economia } = sugestao(p);
  if (!tirar.length) { console.log('Nada a tirar: as ferramentas pesadas foram usadas nesse projeto.'); process.exit(0); }
  const arq = path.join(cwd, '.claude', 'settings.local.json');
  let cfg = {};
  if (fs.existsSync(arq)) { fs.copyFileSync(arq, `${arq}.bak-rubi`); cfg = JSON.parse(fs.readFileSync(arq, 'utf8')); }
  cfg.permissions ||= {};
  cfg.permissions.deny = [...new Set([...(cfg.permissions.deny || []), ...tirar])];
  fs.mkdirSync(path.dirname(arq), { recursive: true });
  fs.writeFileSync(arq, JSON.stringify(cfg, null, 2) + '\n');
  console.log(`Negadas em ${arq}: ${tirar.join(', ')} (~${Math.round(tokens / 100) / 10}k tokens a menos em toda chamada, ≈ ${(economia * 100).toFixed(1)}% do custo desse projeto).`);
  console.log('Vale na próxima sessão. Pra desfazer, tire esses nomes de "permissions.deny".');
} else {
  console.log(`Ferramentas nativas nunca usadas por projeto (${DIAS} dias, projetos com ${MIN_SESSOES}+ sessões):\n`);
  const linhas = [...projetos].filter(([, p]) => p.sessoes >= MIN_SESSOES).map(([cwd, p]) => [cwd, p, sugestao(p)]).filter(([, , s]) => s.tirar.length).sort((a, b) => b[1].custo * b[2].economia - a[1].custo * a[2].economia);
  for (const [cwd, p, s] of linhas.slice(0, 15)) console.log(`  ${cwd}\n    ${p.sessoes} sessões · tirar ${s.tirar.join(', ')} · ~${Math.round(s.tokens / 100) / 10}k tokens · ≈ ${(s.economia * 100).toFixed(1)}% do custo do projeto`);
  if (!linhas.length) console.log('  nada a sugerir.');
  else console.log('\nPra aplicar num projeto: node scripts/enxugar.mjs --aplicar "<pasta>"');
}
