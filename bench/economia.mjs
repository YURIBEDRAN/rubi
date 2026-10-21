#!/usr/bin/env node
// Benchmark de sessão longa: quatro tarefas seguidas numa sessão só, com saídas grandes que ficam
// no contexto e são relidas nas chamadas seguintes. Desenho fatorial 2x2:
//   corte de saídas (desligado/ligado) x contexto fixo (completo/enxuto, negando ferramentas que as tarefas não usam)
//   A = padrão, B = corte, C = enxuto, D = corte + enxuto
//
//   node bench/economia.mjs [--reps 6] [--modelo claude-sonnet-5] [--paralelo 4] [--nome economia-1]
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
const REPS = Number(opt('--reps', 6)), MODELO = opt('--modelo', 'claude-sonnet-5'), PARALELO = Number(opt('--paralelo', 4)), NOME = opt('--nome', 'economia');
const TRAB = fs.mkdtempSync(path.join(os.tmpdir(), 'rubi-economia-'));
const SAIDA = path.join(AQUI, 'resultados');
// ferramentas que vêm no modo -p e que estas tarefas não usam
const NAO_USADAS = ['Workflow', 'ScheduleWakeup', 'ReportFindings', 'ListAgents'];
const BRACOS = { A: { corte: false, enxuto: false }, B: { corte: true, enxuto: false }, C: { corte: false, enxuto: true }, D: { corte: true, enxuto: true } };

const sh = (cwd, cmd) => execFileSync('bash', ['-c', cmd], { cwd, encoding: 'utf8', maxBuffer: 64 << 20 });
const BUILD = `for (let i = 1; i <= 1800; i++) {
  const etapa = ['compile', 'bundle', 'lint', 'typecheck'][i % 4];
  console.log(\`[\${String(i).padStart(4, '0')}] \${etapa} packages/pkg-\${i % 97}/src/index.ts ok (\${(i * 7) % 300}ms)\`);
  if (i === 1013) console.log('[1013] ERROR module payments failed: missing environment variable STRIPE_WEBHOOK_SECRET');
}
console.log('build finished: 1799 ok, 1 failed (see log above)');
`;

const PERGUNTA = `Do the following four tasks in order, using shell commands as instructed. When all four are done, reply with a numbered list, one short line per task.
1. Run exactly: grep -rn "export " src . From that output, how many matching lines are in src/context.ts, and what is the line number of the last match in that file?
2. Run \`git ls-files\` and use its output to tell how many files are tracked and how many are under src/middleware/.
3. Run \`node fake-build.mjs\` and tell which module failed and why.
4. Get the line count of every .ts file under src/ that is not a test file (exclude *.test.ts) and name the 3 largest files with their line counts.`;

function gabarito(dir) {
  const ctx = sh(dir, 'grep -n "export " src/context.ts').trim().split('\n');
  return {
    t1: [String(ctx.length), ctx.at(-1).split(':')[0]],
    t2: [sh(dir, 'git ls-files | wc -l').trim(), sh(dir, 'git ls-files src/middleware | wc -l').trim()],
    t3: ['payments', 'STRIPE_WEBHOOK_SECRET'],
    t4: sh(dir, "find src -name '*.ts' ! -name '*.test.ts' -print0 | xargs -0 wc -l | grep -v ' total$' | sort -rn | head -3").trim().split('\n').map((l) => path.posix.basename(l.trim().split(/\s+/)[1])),
  };
}
const num = (resp, n) => new RegExp(`(^|[^\\d.])${n}([^\\d]|$)`).test(resp.replace(/(\d),(\d{3})/g, '$1$2'));
function nota(resp, g) {
  return {
    t1: g.t1.every((n) => num(resp, n)) ? 1 : 0,
    t2: g.t2.every((n) => num(resp, n)) ? 1 : 0,
    t3: g.t3.every((s) => resp.includes(s)) ? 1 : 0,
    t4: g.t4.every((b) => resp.includes(b)) ? 1 : 0,
  };
}

function claude(cwd, pergunta, home, braco) {
  return new Promise((ok) => {
    const a = ['-p', '--model', MODELO, '--output-format', 'json', '--plugin-dir', PLUGIN, '--allowedTools', 'Bash', 'Read', 'Grep', 'Glob', '--strict-mcp-config'];
    if (BRACOS[braco].enxuto) a.push('--settings', JSON.stringify({ permissions: { deny: NAO_USADAS } }));
    const t = Date.now();
    const q = (s) => (process.platform === 'win32' && /[\s"{}]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s);
    const p = spawn('claude', a.map(q), { cwd, shell: process.platform === 'win32', env: { ...process.env, ENABLE_CLAUDEAI_MCP_SERVERS: 'false', RUBI_HOME: home, RUBI_VAULT: path.join(home, 'vault') } });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stdin.end(pergunta);
    p.on('close', () => { try { ok({ ...JSON.parse(out), parede_ms: Date.now() - t }); } catch { ok({ erro: out.slice(0, 500), parede_ms: Date.now() - t }); } });
  });
}

const peso = (u) => (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) * 2 + (u.cache_read_input_tokens || 0) * 0.1 + (u.output_tokens || 0) * 5;

// contexto da primeira chamada, lido do transcript da sessão (mostra o efeito do contexto enxuto)
function ctxInicial(sessao) {
  const dir = path.join(os.homedir(), '.claude', 'projects');
  for (const d of fs.readdirSync(dir)) {
    const f = path.join(dir, d, `${sessao}.jsonl`);
    if (!fs.existsSync(f)) continue;
    for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
      if (!l.includes('"usage"')) continue;
      try { const u = JSON.parse(l).message.usage; return u.input_tokens + u.cache_creation_input_tokens + u.cache_read_input_tokens; } catch {}
    }
  }
  return null;
}

async function rodar(braco, rep) {
  const dir = path.join(TRAB, `hono-${braco}-${rep}`);
  execFileSync('git', ['clone', '-q', '--depth', '1', 'https://github.com/honojs/hono', dir]);
  fs.writeFileSync(path.join(dir, 'fake-build.mjs'), BUILD);
  const g = gabarito(dir);
  const home = path.join(TRAB, `home-${braco}-${rep}`);
  fs.mkdirSync(home, { recursive: true });
  fs.writeFileSync(path.join(home, 'config.json'), JSON.stringify({ colheita: false, corte: { ativo: BRACOS[braco].corte } }));
  const r = await claude(dir, PERGUNTA, home, braco);
  if (!fs.existsSync(path.join(dir, '.rubi', 'mapa.md'))) throw new Error(`plugin não carregou em ${dir}`);
  const resp = String(r.result || ''), n = nota(resp, g), u = r.usage || {};
  const cortes = fs.existsSync(path.join(dir, '.rubi', 'saidas')) ? fs.readdirSync(path.join(dir, '.rubi', 'saidas')).length : 0;
  const linha = { braco, rep, acertos: n.t1 + n.t2 + n.t3 + n.t4, ...n, cortes, ctx_inicial: r.session_id ? ctxInicial(r.session_id) : null,
    custo_usd: r.total_cost_usd ?? null, turnos: r.num_turns ?? null, tempo_s: Math.round(r.parede_ms / 1000),
    cache_escrita: u.cache_creation_input_tokens, cache_leitura: u.cache_read_input_tokens, output: u.output_tokens, tokens_equiv: Math.round(peso(u)), erro: r.erro || r.is_error || null };
  fs.mkdirSync(path.join(SAIDA, 'respostas'), { recursive: true });
  fs.writeFileSync(path.join(SAIDA, 'respostas', `${NOME}-${braco}-${rep}.md`), `# ${braco} rep ${rep}: ${linha.acertos}/4\n\nGabarito: ${JSON.stringify(g)}\n\n${resp || r.erro || ''}\n`);
  console.log(`${braco}${rep}: ${linha.acertos}/4  $${linha.custo_usd?.toFixed(3)}  ${linha.turnos} turnos  ${cortes} cortes  ctx0 ${linha.ctx_inicial}`);
  return linha;
}

const jobs = [];
for (let rep = 1; rep <= REPS; rep++) for (const b of Object.keys(BRACOS)) jobs.push([b, rep]);
const todas = [];
for (let i = 0; i < jobs.length; i += PARALELO) todas.push(...(await Promise.all(jobs.slice(i, i + PARALELO).map(([b, r]) => rodar(b, r)))));

const cab = Object.keys(todas[0]);
fs.writeFileSync(path.join(SAIDA, `${NOME}.csv`), [cab.join(','), ...todas.map((l) => cab.map((k) => JSON.stringify(l[k] ?? '')).join(','))].join('\n') + '\n');
const med = (b, k) => { const v = todas.filter((l) => l.braco === b).map((l) => l[k] || 0); return v.reduce((s, x) => s + x, 0) / v.length; };
const md = [`# ${NOME}`, `Modelo ${MODELO}, ${REPS} repetições, ${new Date().toISOString().slice(0, 10)}. Uma sessão com 4 tarefas seguidas no Hono.`, '',
  '| Braço | acertos (de 4) | custo médio | vs A | turnos | contexto inicial | cortes |', '|---|---|---|---|---|---|---|',
  ...Object.keys(BRACOS).map((b) => `| ${b} ${JSON.stringify(BRACOS[b])} | ${med(b, 'acertos').toFixed(2)} | $${med(b, 'custo_usd').toFixed(3)} | ${b === 'A' ? '' : `${((med(b, 'custo_usd') / med('A', 'custo_usd') - 1) * 100).toFixed(1)}%`} | ${med(b, 'turnos').toFixed(1)} | ${Math.round(med(b, 'ctx_inicial'))} | ${med(b, 'cortes').toFixed(1)} |`)].join('\n');
fs.writeFileSync(path.join(SAIDA, `${NOME}.md`), md + '\n');
console.log('\n' + md);
