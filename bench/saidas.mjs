#!/usr/bin/env node
// Benchmark do corte de saídas grandes: as mesmas tarefas com o corte desligado (X) e ligado (Y).
// Tarefas com saída de comando grande e resposta conferível automaticamente, inclusive uma em que
// a informação fica no meio da saída (o pior caso pro corte, que guarda começo e fim).
//
//   node bench/saidas.mjs [--reps 3] [--modelo claude-sonnet-5] [--paralelo 4] [--nome saidas-1]
//
// Sem MCP externos (--strict-mcp-config, conectores do claude.ai desligados): eles conectam em tempos diferentes e mudam o contexto ao acaso.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN = path.join(AQUI, '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const REPS = Number(opt('--reps', 3)), MODELO = opt('--modelo', 'claude-sonnet-5'), PARALELO = Number(opt('--paralelo', 4)), NOME = opt('--nome', 'saidas');
const TRAB = fs.mkdtempSync(path.join(os.tmpdir(), 'rubi-saidas-'));
const SAIDA = path.join(AQUI, 'resultados');
const URL = { flask: 'https://github.com/pallets/flask', hono: 'https://github.com/honojs/hono' };

const sh = (cwd, cmd) => execFileSync('bash', ['-c', cmd], { cwd, encoding: 'utf8', maxBuffer: 64 << 20 });
const BUILD = `// build de mentira: muitas etapas, uma falha no meio
for (let i = 1; i <= 1800; i++) {
  const etapa = ['compile', 'bundle', 'lint', 'typecheck'][i % 4];
  console.log(\`[\${String(i).padStart(4, '0')}] \${etapa} packages/pkg-\${i % 97}/src/index.ts ok (\${(i * 7) % 300}ms)\`);
  if (i === 1013) console.log('[1013] ERROR module payments failed: missing environment variable STRIPE_WEBHOOK_SECRET');
}
console.log('build finished: 1799 ok, 1 failed (see log above)');
`;

const TAREFAS = [
  {
    id: 'maiores', repo: 'hono',
    pergunta: 'Using shell commands, get the line count of every .ts file under src/ that is not a test file (exclude *.test.ts). Tell me the 3 largest files and their line counts.',
    gabarito: (dir) => sh(dir, "find src -name '*.ts' ! -name '*.test.ts' -print0 | xargs -0 wc -l | grep -v ' total$' | sort -rn | head -3").trim().split('\n').map((l) => path.posix.basename(l.trim().split(/\s+/)[1])),
    confere: (resp, g) => g.every((b) => resp.includes(b)),
  },
  {
    id: 'grep-meio', repo: 'flask',
    pergunta: 'Run exactly this command: grep -rn "def " src/flask . Based on its output, how many matching lines are in src/flask/app.py, and what is the line number of the last match in that file?',
    gabarito: (dir) => { const l = sh(dir, 'grep -n "def " src/flask/app.py').trim().split('\n'); return [String(l.length), l.at(-1).split(':')[0]]; },
    confere: (resp, g) => g.every((n) => new RegExp(`\\b${n}\\b`).test(resp)),
  },
  {
    id: 'ls-files', repo: 'hono',
    pergunta: 'Run `git ls-files` and use its output to tell me how many files are tracked in the repository and how many of them are under src/middleware/.',
    gabarito: (dir) => [sh(dir, 'git ls-files | wc -l').trim(), sh(dir, 'git ls-files src/middleware | wc -l').trim()],
    confere: (resp, g) => g.every((n) => new RegExp(`\\b${n}\\b`).test(resp.replace(/(\d),(\d{3})/g, '$1$2'))),
  },
  {
    id: 'build-log', repo: 'flask',
    preparar: (dir) => fs.writeFileSync(path.join(dir, 'fake-build.mjs'), BUILD),
    pergunta: 'Run `node fake-build.mjs` and tell me which module failed and why.',
    gabarito: () => ['payments', 'STRIPE_WEBHOOK_SECRET'],
    confere: (resp, g) => g.every((s) => resp.includes(s)),
  },
];

function claude(cwd, pergunta, home) {
  return new Promise((ok) => {
    const a = ['-p', '--model', MODELO, '--output-format', 'json', '--plugin-dir', PLUGIN, '--allowedTools', 'Bash', 'Read', 'Grep', 'Glob', '--strict-mcp-config'];
    const t = Date.now();
    const q = (s) => (process.platform === 'win32' && /[\s"]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s);
    const p = spawn('claude', a.map(q), { cwd, shell: process.platform === 'win32', env: { ...process.env, ENABLE_CLAUDEAI_MCP_SERVERS: 'false', RUBI_HOME: home, RUBI_VAULT: path.join(home, 'vault') } });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stdin.end(pergunta);
    p.on('close', () => { try { ok({ ...JSON.parse(out), parede_ms: Date.now() - t }); } catch { ok({ erro: out.slice(0, 500), parede_ms: Date.now() - t }); } });
  });
}

const peso = (u) => (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) * 2 + (u.cache_read_input_tokens || 0) * 0.1 + (u.output_tokens || 0) * 5;

async function rodar(t, braco, rep) {
  const dir = path.join(TRAB, `${t.id}-${braco}-${rep}`);
  execFileSync('git', ['clone', '-q', '--depth', '1', URL[t.repo], dir]);
  t.preparar?.(dir);
  const gab = t.gabarito(dir);
  const home = path.join(TRAB, `home-${t.id}-${braco}-${rep}`);
  fs.mkdirSync(home, { recursive: true });
  fs.writeFileSync(path.join(home, 'config.json'), JSON.stringify({ colheita: false, corte: { ativo: braco === 'Y' } }));
  const r = await claude(dir, t.pergunta, home);
  if (!fs.existsSync(path.join(dir, '.rubi', 'mapa.md'))) throw new Error(`plugin não carregou em ${dir}`);
  const cortes = fs.existsSync(path.join(dir, '.rubi', 'saidas')) ? fs.readdirSync(path.join(dir, '.rubi', 'saidas')).length : 0;
  const u = r.usage || {}, resp = String(r.result || '');
  const linha = { tarefa: t.id, braco, rep, certo: t.confere(resp, gab) ? 1 : 0, cortes, custo_usd: r.total_cost_usd ?? null, turnos: r.num_turns ?? null,
    tempo_s: Math.round(r.parede_ms / 1000), cache_escrita: u.cache_creation_input_tokens, cache_leitura: u.cache_read_input_tokens, output: u.output_tokens,
    tokens_equiv: Math.round(peso(u)), erro: r.erro || r.is_error || null, gabarito: gab.join(' / ') };
  fs.mkdirSync(path.join(SAIDA, 'respostas'), { recursive: true });
  fs.writeFileSync(path.join(SAIDA, 'respostas', `${NOME}-${t.id}-${braco}-${rep}.md`), `# ${t.id} ${braco} rep ${rep} (${linha.certo ? 'certo' : 'ERRADO'}; gabarito: ${linha.gabarito})\n\n> ${t.pergunta}\n\n${resp || r.erro || ''}\n`);
  console.log(`${t.id} ${braco}${rep}: ${linha.certo ? 'certo ' : 'ERRADO'} $${linha.custo_usd?.toFixed(3)} ${linha.turnos} turnos, ${linha.cortes} cortes`);
  return linha;
}

const jobs = [];
for (let rep = 1; rep <= REPS; rep++) for (const t of TAREFAS) for (const b of ['X', 'Y']) jobs.push([t, b, rep]);
const todas = [];
for (let i = 0; i < jobs.length; i += PARALELO) todas.push(...(await Promise.all(jobs.slice(i, i + PARALELO).map(([t, b, r]) => rodar(t, b, r)))));

const cab = Object.keys(todas[0]);
fs.writeFileSync(path.join(SAIDA, `${NOME}.csv`), [cab.join(','), ...todas.map((l) => cab.map((k) => JSON.stringify(l[k] ?? '')).join(','))].join('\n') + '\n');
const soma = (b, k, f = () => true) => todas.filter((l) => l.braco === b && f(l)).reduce((s, l) => s + (l[k] || 0), 0);
const md = [`# ${NOME}`, `Modelo ${MODELO}, ${REPS} repetições, ${new Date().toISOString().slice(0, 10)}. X = corte desligado, Y = corte ligado.`, '',
  '| Tarefa | acertos X | acertos Y | custo X | custo Y | turnos X | turnos Y | cortes Y |', '|---|---|---|---|---|---|---|---|',
  ...[...TAREFAS.map((t) => [t.id, (l) => l.tarefa === t.id]), ['**Total**', () => true]].map(([rot, f]) => {
    const cx = soma('X', 'custo_usd', f), cy = soma('Y', 'custo_usd', f);
    return `| ${rot} | ${soma('X', 'certo', f)}/${todas.filter((l) => l.braco === 'X' && f(l)).length} | ${soma('Y', 'certo', f)}/${todas.filter((l) => l.braco === 'Y' && f(l)).length} | $${cx.toFixed(3)} | $${cy.toFixed(3)} (${cy <= cx ? '−' : '+'}${Math.abs(Math.round((1 - cy / cx) * 100))}%) | ${soma('X', 'turnos', f)} | ${soma('Y', 'turnos', f)} | ${soma('Y', 'cortes', f)} |`;
  })].join('\n');
fs.writeFileSync(path.join(SAIDA, `${NOME}.md`), md + '\n');
console.log('\n' + md);
