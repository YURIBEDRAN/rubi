#!/usr/bin/env node
// Raio-X de gasto: varre os transcripts do Claude Code e mostra pra onde o token foi.
// Uso: node raio-x.mjs [pasta-projects] [--dias N]
// Custo em "tokens-equivalentes de input": input 1x, escrita de cache 1.25x (5min) / 2x (1h),
// leitura de cache 0.1x, output 5x. Proporções da tabela da Anthropic, sem depender do preço do modelo.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { partesDoFixo, somarPartes, usoDe, comoTirar } from './lib/fixo.mjs';

const args = process.argv.slice(2);
const diasIdx = args.indexOf('--dias');
const dias = diasIdx >= 0 ? Number(args[diasIdx + 1]) : 30;
const raiz = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--dias')
  || path.join(os.homedir(), '.claude', 'projects');
const desde = Date.now() - dias * 864e5;

const PESO = { input: 1, write5m: 1.25, write1h: 2, read: 0.1, output: 5 };
const tok = (chars) => Math.round(chars / 3.5); // estimativa grosseira chars -> tokens

function* jsonls(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* jsonls(p);
    else if (e.name.endsWith('.jsonl')) yield p;
  }
}

function tamanhoConteudo(c) {
  if (typeof c === 'string') return c.length;
  if (Array.isArray(c)) return c.reduce((s, b) => s + (b.text?.length || (b.type === 'image' ? 5000 : 0)), 0);
  return 0;
}

const total = { input: 0, write5m: 0, write1h: 0, read: 0, output: 0 };
const sessoes = [];
const porFerramenta = {}; // nome -> { n, chars, carrego }
const maioresResultados = [];
let expiracoes = 0, tokensExpiracao = 0;
const usos = new Map(); // ferramenta ou skill -> vezes usada
const fixos = []; // partes do contexto fixo das sessões principais, da mais nova pra mais velha
let custoFixo = 0; // o prefixo fixo, relido (ou reescrito) em toda chamada

for (const arq of jsonls(raiz)) {
  const st = fs.statSync(arq);
  if (st.mtimeMs < desde) continue;
  const linhas = fs.readFileSync(arq, 'utf8').split('\n');
  const vistos = new Set();
  const nomeFerramenta = {};
  const chamadas = []; // contexto por chamada à API, em ordem
  const resultados = []; // { idxChamada, nome, chars, desc }
  const s = { arq, projeto: path.basename(path.dirname(arq)), custo: 0, read: 0, ctx0: 0, pico: 0, chamadas: 0, inicio: null, mtime: st.mtimeMs };
  const anexos = [];
  const subagente = /[\\/]subagents[\\/]|[\\/]agent-[^\\/]*\.jsonl$/.test(arq);

  for (const l of linhas) {
    if (!l) continue;
    let o; try { o = JSON.parse(l); } catch { continue; }
    if (o.timestamp && !s.inicio) s.inicio = o.timestamp;
    // a cópia com as ferramentas é gravada logo depois da primeira resposta
    if (o.attachment && s.chamadas < 2) anexos.push(o.attachment);
    const m = o.message;
    if (!m) continue;
    if (o.type === 'assistant' && m.usage && m.id && !vistos.has(m.id)) {
      vistos.add(m.id);
      const u = m.usage;
      const w1h = u.cache_creation?.ephemeral_1h_input_tokens || 0;
      const w5m = (u.cache_creation_input_tokens || 0) - w1h;
      const r = u.cache_read_input_tokens || 0;
      const inp = u.input_tokens || 0;
      const out = u.output_tokens || 0;
      total.input += inp; total.write5m += w5m; total.write1h += w1h; total.read += r; total.output += out;
      const custo = inp * PESO.input + w5m * PESO.write5m + w1h * PESO.write1h + r * PESO.read + out * PESO.output;
      const ctx = inp + w5m + w1h + r;
      s.custo += custo; s.read += r;
      if (!s.chamadas) s.ctx0 = ctx;
      custoFixo += s.ctx0 * (w5m + w1h > 0.5 * ctx && s.chamadas ? (w1h >= w5m ? PESO.write1h : PESO.write5m) : s.chamadas ? PESO.read : 0);
      s.pico = Math.max(s.pico, ctx);
      // escrita grande no meio da sessão com contexto já grande = cache expirou e foi reescrito
      if (s.chamadas > 0 && w5m + w1h > 30000 && r < (w5m + w1h)) { expiracoes++; tokensExpiracao += w5m + w1h; }
      s.chamadas++;
      chamadas.push(ctx);
    }
    if (Array.isArray(m.content)) {
      for (const b of m.content) {
        if (b.type === 'tool_use') {
          nomeFerramenta[b.id] = { nome: b.name, desc: JSON.stringify(b.input || {}).slice(0, 90) };
          const chave = b.name === 'Skill' && b.input?.skill ? `skill:${b.input.skill}` : b.name;
          usos.set(chave, (usos.get(chave) || 0) + 1);
          if (chave !== b.name) usos.set(b.name, (usos.get(b.name) || 0) + 1);
        }
        if (b.type === 'tool_result') {
          const t = nomeFerramenta[b.tool_use_id] || { nome: '?', desc: '' };
          resultados.push({ idx: chamadas.length, nome: t.nome, desc: t.desc, chars: tamanhoConteudo(b.content) });
        }
      }
    }
  }
  if (!s.chamadas) continue;
  if (!subagente && anexos.some((a) => a.type === 'prompt_snapshot' && a.tools)) fixos.push({ mtime: st.mtimeMs, partes: partesDoFixo(anexos) });
  // "carrego": quantas vezes cada resultado foi relido nas chamadas seguintes (até o fim ou até compactar)
  for (const r of resultados) {
    const relidas = Math.max(0, chamadas.length - r.idx);
    const t = tok(r.chars);
    const f = (porFerramenta[r.nome] ||= { n: 0, tokens: 0, carrego: 0 });
    f.n++; f.tokens += t; f.carrego += t * relidas * PESO.read;
    maioresResultados.push({ ...r, tokens: t, carrego: t * relidas * PESO.read, projeto: s.projeto });
  }
  s.ctxs = chamadas;
  sessoes.push(s);
}

const fmt = (n) => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(0) + 'k' : String(Math.round(n));
const pct = (a, b) => b ? (100 * a / b).toFixed(0) + '%' : '-';
const custoTotal = total.input + total.write5m * PESO.write5m + total.write1h * PESO.write1h + total.read * PESO.read + total.output * PESO.output;

console.log(`\n=== RAIO-X (${dias} dias, ${sessoes.length} sessões, ${raiz}) ===\n`);
console.log('Custo total em tokens-equivalentes de input:', fmt(custoTotal));
console.log('Composição do custo:');
for (const [k, v] of Object.entries(total)) console.log(`  ${k.padEnd(8)} ${fmt(v).padStart(7)} tokens  -> ${pct(v * PESO[k], custoTotal)} do custo`);
const cacheTotal = total.read + total.write5m + total.write1h + total.input;
console.log(`Taxa de acerto do cache: ${pct(total.read, cacheTotal)}`);
console.log(`Cache expirado/reescrito no meio da sessão: ${expiracoes}x, ${fmt(tokensExpiracao)} tokens reescritos`);

const ctx0 = sessoes.map((s) => s.ctx0).sort((a, b) => a - b);
console.log(`\nContexto fixo na 1ª chamada (system + CLAUDE.md + memória + ferramentas): mediana ${fmt(ctx0[ctx0.length >> 1])}, máx ${fmt(ctx0.at(-1))}`);

const picos = sessoes.map((s) => s.pico);
const faixa = (a, b) => picos.filter((p) => p >= a && p < b).length;
console.log(`Pico de contexto por sessão: <50k ${faixa(0, 5e4)} | 50-150k ${faixa(5e4, 15e4)} | 150-400k ${faixa(15e4, 4e5)} | >400k ${faixa(4e5, 1e12)}`);
const custoGrandes = sessoes.filter((s) => s.pico >= 15e4).reduce((a, s) => a + s.custo, 0);
console.log(`Sessões que passaram de 150k respondem por ${pct(custoGrandes, custoTotal)} do custo`);

console.log('\nTop 10 sessões mais caras:');
for (const s of [...sessoes].sort((a, b) => b.custo - a.custo).slice(0, 10))
  console.log(`  ${fmt(s.custo).padStart(7)}  pico ${fmt(s.pico).padStart(5)}  ${String(s.chamadas).padStart(4)} chamadas  ${s.inicio?.slice(0, 10)}  ${s.projeto}`);

console.log('\nFerramentas (tokens que entraram | custo de carregar isso nas chamadas seguintes):');
for (const [n, f] of Object.entries(porFerramenta).sort((a, b) => b[1].carrego - a[1].carrego).slice(0, 12))
  console.log(`  ${n.padEnd(28)} ${String(f.n).padStart(5)}x  ${fmt(f.tokens).padStart(6)}  carrego ${fmt(f.carrego).padStart(6)} (${pct(f.carrego, custoTotal)})`);

console.log('\nTop 10 resultados de ferramenta mais caros de carregar:');
for (const r of maioresResultados.sort((a, b) => b.carrego - a.carrego).slice(0, 10))
  console.log(`  ${fmt(r.carrego).padStart(6)}  ${fmt(r.tokens).padStart(5)} tok  ${r.nome}  ${r.desc}`);

// Simulação: se a cada vez que o contexto passa de LIMITE a sessão fosse trocada por uma nova
// começando com o contexto fixo + um handoff de ~8k, quanto custaria só a leitura de cache?
console.log('\nSimulação de handoff automático (só leitura de cache, crescimento igual ao real):');
const leituraReal = sessoes.reduce((a, s) => a + s.read, 0);
for (const LIMITE of [100e3, 150e3, 250e3]) {
  let leitura = 0, trocas = 0, reescrita = 0;
  for (const s of sessoes) {
    let base = 0;
    for (let i = 0; i < s.ctxs.length; i++) {
      const ctx = s.ctxs[i] - base;
      if (ctx > LIMITE) { base = s.ctxs[i] - (s.ctx0 + 8000); trocas++; reescrita += (s.ctx0 + 8000) * PESO.write1h; }
      if (s.ctxs[i] < base) base = 0; // sessão real compactou
      leitura += Math.max(0, s.ctxs[i] - base);
    }
  }
  const economia = (leituraReal - leitura) * PESO.read - reescrita;
  console.log(`  limite ${fmt(LIMITE)}: ${trocas} trocas de janela, economia ~${pct(economia, custoTotal)} do custo total`);
}

// O que ocupa o contexto fixo, quanto custa e quanto é de fato usado.
if (fixos.length) {
  const recentes = fixos.sort((a, b) => b.mtime - a.mtime).slice(0, 20).map((f) => f.partes);
  const partes = somarPartes(recentes);
  const medianaCtx0 = ctx0[ctx0.length >> 1] || 1;
  const porMil = (custoFixo / custoTotal) / medianaCtx0 * 1000;
  console.log(`\nContexto fixo (média das ${recentes.length} sessões principais mais recentes; estimativa, confira com /context):`);
  console.log(`  ele é ${pct(custoFixo, custoTotal)} do custo; cada 1k tokens a menos nele ≈ ${(porMil * 100).toFixed(2)}% do custo (mais, com compactação cedo)`);
  for (const p of partes.slice(0, 14)) {
    const u = usoDe(p, usos);
    const uso = u == null ? '' : u === 0 ? '  nunca usado no período' : `  usado ${u}x`;
    console.log(`  ${fmt(p.tokens).padStart(5)}  ${p.chave}${p.presenca < 0.95 ? ` (em ${Math.round(p.presenca * 100)}% das sessões)` : ''}${uso}`);
  }
  const candidatos = partes.filter((p) => p.tokens >= 500 && ['ferramenta', 'mcp', 'skills'].includes(p.tipo) && (usoDe(p, usos) ?? 99) <= 2);
  if (candidatos.length) {
    console.log('\n  Pouco ou nunca usados, e pesando em toda mensagem:');
    for (const p of candidatos.slice(0, 8)) console.log(`  - ${p.chave} (~${fmt(p.tokens)}, ≈ ${(p.tokens / 1000 * porMil * 100).toFixed(1)}% do custo): ${comoTirar(p)}`);
  }
}
