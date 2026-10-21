#!/usr/bin/env node
// Benchmark A/B reprodutível: o mesmo trabalho com e sem o Rubi, em clones limpos.
//
//   node bench/rodar.mjs [--reps 3] [--bracos A,B,C,D] [--nome rodada] [--modelo claude-sonnet-5] [--paralelo 6] [--repos flask,hono]
//
// Cada "fluxo" é um clone novo de um repositório onde o Claude responde 3 perguntas
// encadeadas, cada uma numa sessão nova (como dias diferentes de trabalho).
// Braço A: Claude Code puro. Braço B: com o plugin (mapa, grafo, colheita).
// Mede o custo cobrado (total_cost_usd), tokens, turnos e tempo, a partir do
// `claude -p --output-format json`. Resultados em bench/resultados/.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN = path.join(AQUI, '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const REPS = Number(opt('--reps', 2)), MODELO = opt('--modelo', 'claude-sonnet-5'), PARALELO = Number(opt('--paralelo', 4));
const TRAB = fs.mkdtempSync(path.join(os.tmpdir(), 'rubi-bench-'));
const SAIDA = path.join(AQUI, 'resultados');
fs.mkdirSync(SAIDA, { recursive: true });

const SO = opt('--repos', '').split(',').filter(Boolean);
// Braços: A = Claude Code puro; B = Rubi completo (padrão); C = Rubi sem colheita (só lê a memória);
// D = Rubi sem colheita, com um grafo já preenchido (bench/sementes/<repo>), como num projeto maduro.
const BRACOS = opt('--bracos', 'A,B').split(',');
// E = C com o grafo automático (sem IA: comentários do topo, resumos automáticos, co-mudança no git);
// a partir da 0.5 o C desliga o automático, pra comparação direta com o E.
const CONFIG_BRACO = { B: {}, C: { colheita: false, grafoAutomatico: false }, D: { colheita: false }, E: { colheita: false } };
const PROFUNDIDADE = opt('--profundidade', '1'); // commits clonados: o grafo automático usa o histórico do git
const TAREFAS = JSON.parse(fs.readFileSync(path.join(AQUI, 'tarefas.json'), 'utf8')).filter((t) => !SO.length || SO.includes(t.repo));
const FERRAMENTAS_RUBI = ['rubi_contexto', 'rubi_mapa', 'rubi_ler', 'rubi_registrar', 'rubi_escrever_resumo', 'rubi_salvar_handoff'].map((n) => `mcp__plugin_rubi_rubi__${n}`);

function claude(cwd, pergunta, comRubi, home) {
  return new Promise((ok) => {
    const a = ['-p', '--model', MODELO, '--output-format', 'json'];
    if (comRubi) a.push('--plugin-dir', PLUGIN);
    a.push('--allowedTools', 'Read', 'Grep', 'Glob', 'Task', ...(comRubi ? FERRAMENTAS_RUBI : []));
    const t = Date.now();
    // no Windows o `claude` é um .cmd e precisa de shell: aspas em tudo que tem espaço
    const q = (s) => (process.platform === 'win32' && /[\s"]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s);
    const p = spawn('claude', a.map(q), { cwd, shell: process.platform === 'win32', env: { ...process.env, ENABLE_CLAUDEAI_MCP_SERVERS: 'false', RUBI_HOME: home, RUBI_VAULT: path.join(home, 'vault') } });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stdin.end(pergunta);
    p.on('close', () => {
      try { const j = JSON.parse(out); ok({ ...j, parede_ms: Date.now() - t }); } catch { ok({ erro: out.slice(0, 500), parede_ms: Date.now() - t }); }
    });
  });
}

const peso = (u) => (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) * 2 + (u.cache_read_input_tokens || 0) * 0.1 + (u.output_tokens || 0) * 5;

async function fluxo({ repo, url, perguntas }, braco, rep) {
  const dir = path.join(TRAB, `${repo}-${braco}-${rep}`);
  execFileSync('git', ['clone', '-q', '--depth', PROFUNDIDADE, url, dir]);
  const home = path.join(TRAB, `home-${repo}-${braco}-${rep}`);
  if (braco !== 'A') { fs.mkdirSync(home, { recursive: true }); fs.writeFileSync(path.join(home, 'config.json'), JSON.stringify(CONFIG_BRACO[braco] || {})); }
  if (braco === 'D') {
    const sem = path.join(AQUI, 'sementes', repo), dest = path.join(dir, '.rubi', 'conhecimento');
    fs.mkdirSync(dest, { recursive: true });
    for (const f of fs.readdirSync(sem)) fs.copyFileSync(path.join(sem, f), path.join(dest, f));
  }
  const linhas = [];
  for (const [i, q] of perguntas.entries()) {
    const r = await claude(dir, q, braco !== 'A', home);
    const u = r.usage || {};
    const linha = {
      repo, braco, rep, pergunta: i + 1, custo_usd: r.total_cost_usd ?? null, turnos: r.num_turns ?? null, tempo_s: Math.round(r.parede_ms / 1000),
      input: u.input_tokens, cache_escrita: u.cache_creation_input_tokens, cache_leitura: u.cache_read_input_tokens, output: u.output_tokens,
      tokens_equiv: Math.round(peso(u)), erro: r.erro || r.is_error || null,
    };
    linhas.push(linha);
    fs.mkdirSync(path.join(SAIDA, 'respostas'), { recursive: true });
    fs.writeFileSync(path.join(SAIDA, 'respostas', `${opt('--nome', 'RESUMO')}-${repo}-${braco}-${rep}-q${i + 1}.md`), `# ${repo} ${braco} rep ${rep} pergunta ${i + 1}\n\n> ${q}\n\n${r.result || r.erro || ''}\n`);
    console.log(`${repo} ${braco}${rep} q${i + 1}: $${linha.custo_usd?.toFixed(3)} ${linha.turnos} turnos ${linha.tempo_s}s`);
  }
  const nos = braco !== 'A' ? (fs.existsSync(path.join(dir, '.rubi', 'conhecimento')) ? fs.readdirSync(path.join(dir, '.rubi', 'conhecimento')).length : 0) : null;
  // garantia: no braço B o plugin tem que ter rodado (o mapa é criado no início da sessão)
  if (braco !== 'A' && !fs.existsSync(path.join(dir, '.rubi', 'mapa.md'))) throw new Error(`plugin não carregou em ${dir}`);
  return linhas.map((l) => ({ ...l, nos_no_grafo_ao_fim: nos }));
}

const jobs = [];
for (const t of TAREFAS) for (let rep = 1; rep <= REPS; rep++) for (const braco of BRACOS) jobs.push([t, braco, rep]);
const todas = [];
for (let i = 0; i < jobs.length; i += PARALELO) {
  const lote = await Promise.all(jobs.slice(i, i + PARALELO).map(([t, b, r]) => fluxo(t, b, r)));
  todas.push(...lote.flat());
}

const cab = Object.keys(todas[0]);
fs.writeFileSync(path.join(SAIDA, `${opt('--nome', 'RESUMO')}.csv`), [cab.join(','), ...todas.map((l) => cab.map((k) => l[k] ?? '').join(','))].join('\n') + '\n');

// resumo: média por repetição, por braço, com variação contra o braço A
const SAIDA_NOME = opt('--nome', 'RESUMO');
const media = (f) => todas.filter(f).reduce((s, l) => s + (l.custo_usd || 0), 0) / REPS;
const turnos = (f) => todas.filter(f).reduce((s, l) => s + (l.turnos || 0), 0) / REPS;
const recortes = [['**Total**', () => true], ...TAREFAS.map((t) => [t.repo, (l) => l.repo === t.repo]), ...[1, 2, 3].map((q) => [`Sessão ${q}`, (l) => l.pergunta === q])];
const cab2 = `| Recorte | ${BRACOS.map((b) => `${b}`).join(' | ')} |`;
const linhas2 = recortes.map(([rot, f]) => {
  const base = media((l) => l.braco === 'A' && f(l));
  return `| ${rot} | ${BRACOS.map((b) => { const v = media((l) => l.braco === b && f(l)); return `$${v.toFixed(3)}${b !== 'A' && base ? ` (${v <= base ? '−' : '+'}${Math.abs(Math.round((1 - v / base) * 100))}%)` : ''} · ${turnos((l) => l.braco === b && f(l)).toFixed(1)}t`; }).join(' | ')} |`;
});
const md = [`# ${SAIDA_NOME}`, `Modelo ${MODELO}, ${REPS} repetições, ${new Date().toISOString().slice(0, 10)}. Custo médio por repetição (3 sessões) e turnos.`, '', cab2, `|---|${BRACOS.map(() => '---').join('|')}|`, ...linhas2].join('\n');
fs.writeFileSync(path.join(SAIDA, `${SAIDA_NOME}.md`), md + '\n');
console.log('\n' + md);
