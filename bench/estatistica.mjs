#!/usr/bin/env node
// Análise pareada dos benchmarks de economia (economia.mjs e saidas.mjs).
// Para cada comparação: variação relativa por par (mesma repetição, e mesma tarefa no saidas),
// média, IC de 95% com t de Student e p bilateral.
//
//   node bench/estatistica.mjs economia-1 saidas-1

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'resultados');

function lerCsv(nome) {
  const [cab, ...linhas] = fs.readFileSync(path.join(RES, `${nome}.csv`), 'utf8').trim().split('\n');
  const campos = cab.split(',');
  return linhas.map((l) => {
    const v = JSON.parse(`[${l}]`);
    return Object.fromEntries(campos.map((c, i) => [c, typeof v[i] === 'string' && v[i] !== '' && !isNaN(v[i]) ? Number(v[i]) : v[i]]));
  });
}

// t de Student: densidade integrada numericamente (sem dependências)
function pBilateral(t, gl) {
  const c = Math.exp(lgamma((gl + 1) / 2) - lgamma(gl / 2)) / Math.sqrt(gl * Math.PI);
  const f = (x) => c * (1 + (x * x) / gl) ** (-(gl + 1) / 2);
  const a = Math.abs(t), n = 20000, h = a / n;
  let s = 0;
  for (let i = 0; i < n; i++) s += f(i * h + h / 2);
  return Math.max(0, 2 * (0.5 - s * h));
}
function lgamma(x) {
  const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, tmp = x + 5.5; tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (const c of g) ser += c / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}
function tCritico(gl) {
  let lo = 0, hi = 20;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (pBilateral(m, gl) > 0.05) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

function pareado(rel) {
  const n = rel.length, m = rel.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(rel.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1));
  const se = sd / Math.sqrt(n), t = m / se, tc = tCritico(n - 1);
  return { n, m, lo: m - tc * se, hi: m + tc * se, p: pBilateral(t, n - 1) };
}
const pc = (x) => `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(1)}%`;
const linha = (rot, r) => `| ${rot} | ${r.n} | ${pc(r.m)} | ${pc(r.lo)} a ${pc(r.hi)} | ${r.p < 0.001 ? '<0.001' : r.p.toFixed(3)} |`;
const METRICAS = [['custo_usd', 'custo'], ['tokens_equiv', 'tokens-equivalentes'], ['turnos', 'turnos'], ['cache_leitura', 'leitura de cache']];

const saida = [];
for (const nome of process.argv.slice(2)) {
  const d = lerCsv(nome);
  saida.push(`## ${nome}`, '', '| Comparação | pares | variação média | IC 95% | p |', '|---|---|---|---|---|');
  if ('acertos' in d[0]) {
    // fatorial 2x2: A padrão, B corte, C enxuto, D corte + enxuto; par = mesma repetição
    const de = (b, rep) => d.find((l) => l.braco === b && l.rep === rep);
    const reps = [...new Set(d.map((l) => l.rep))];
    const comp = (pares, k) => pareado(pares.map(([x, y]) => de(x[0], x[1])[k] / de(y[0], y[1])[k] - 1));
    for (const [k, rot] of METRICAS) {
      saida.push(linha(`corte (B vs A, D vs C): ${rot}`, comp(reps.flatMap((r) => [[['B', r], ['A', r]], [['D', r], ['C', r]]]), k)));
      saida.push(linha(`enxuto (C vs A, D vs B): ${rot}`, comp(reps.flatMap((r) => [[['C', r], ['A', r]], [['D', r], ['B', r]]]), k)));
      saida.push(linha(`os dois (D vs A): ${rot}`, comp(reps.map((r) => [['D', r], ['A', r]]), k)));
    }
    const ac = (b) => d.filter((l) => l.braco === b).reduce((s, l) => s + l.acertos, 0);
    const tot = (b) => d.filter((l) => l.braco === b).length * 4;
    saida.push('', `Acertos: ${['A', 'B', 'C', 'D'].map((b) => `${b} ${ac(b)}/${tot(b)}`).join(', ')}.`);
    const ctx = (b) => { const v = d.filter((l) => l.braco === b && l.ctx_inicial).map((l) => l.ctx_inicial); return Math.round(v.reduce((a, x) => a + x, 0) / v.length); };
    saida.push(`Contexto inicial médio: ${['A', 'B', 'C', 'D'].map((b) => `${b} ${ctx(b)}`).join(', ')} tokens.`);
  } else {
    // saidas: X sem corte, Y com corte; par = mesma tarefa e repetição
    const tarefas = [...new Set(d.map((l) => l.tarefa))];
    const de = (t, b, r) => d.find((l) => l.tarefa === t && l.braco === b && l.rep === r);
    const reps = [...new Set(d.map((l) => l.rep))];
    for (const [k, rot] of METRICAS) {
      saida.push(linha(`corte, todas as tarefas: ${rot}`, pareado(tarefas.flatMap((t) => reps.map((r) => de(t, 'Y', r)[k] / de(t, 'X', r)[k] - 1)))));
    }
    for (const t of tarefas) saida.push(linha(`corte, ${t}: custo`, pareado(reps.map((r) => de(t, 'Y', r).custo_usd / de(t, 'X', r).custo_usd - 1))));
    const ac = (b) => d.filter((l) => l.braco === b).reduce((s, l) => s + l.certo, 0);
    saida.push('', `Acertos: X ${ac('X')}/${d.length / 2}, Y ${ac('Y')}/${d.length / 2}.`);
  }
  saida.push('');
}
const texto = saida.join('\n');
fs.writeFileSync(path.join(RES, `estatistica-${process.argv.slice(2).join('-')}.md`), `# Estatística pareada\n\n${texto}`);
console.log(texto);
