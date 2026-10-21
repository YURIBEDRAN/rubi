// Busca híbrida, sem IA própria e sem dependências:
//   1. texto      — BM25 sobre conhecimento, módulos, handoffs, sessões e arquivos
//   2. entidades  — nomes de arquivo e de função citados na pergunta
//   3. grafo      — PageRank personalizado a partir do que bateu (traz os vizinhos
//                   que não têm a palavra buscada; é a ideia do HippoRAG)
// As três listas são fundidas com RRF e cortadas num orçamento de tokens.
// A "busca por significado" fica com o próprio Claude: ele manda `termos`
// relacionados junto com a pergunta.

import fs from 'node:fs';
import path from 'node:path';
import { listarMd, separarFrontmatter, idDe } from './memoria.mjs';
import { lerNos, ROTULO } from './grafo.mjs';
import { lerConfig } from './config.mjs';

// Grafo automático: o que entra sem gastar token (comentário do topo dos arquivos, resumo automático dos
// módulos, arquivos que mudam juntos no git). Dá pra desligar com grafoAutomatico: false, pra comparar.
const automatico = () => lerConfig().grafoAutomatico !== false;

const PARADAS = new Set(('a o e de da do das dos em no na nos nas um uma uns umas que com por para pra pro os as se ao aos como mais mas ou ja nao sim isso esse essa este esta ele ela eles elas seu sua ser ter foi sao tem esta estao the of and to in is it for on with as by be this that are or an at from was were not but how what why when where which who does do did can could should would will use using').split(' '));

const semAcento = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '');

function radical(w) {
  if (w.length > 5 && w.endsWith('coes')) return w.slice(0, -4) + 'cao';
  if (w.length > 4 && (w.endsWith('oes') || w.endsWith('aes'))) return w.slice(0, -3) + 'ao';
  if (w.length > 4 && w.endsWith('is') && !w.endsWith('sis')) return w.slice(0, -2) + 'l';
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

export function tokens(texto) {
  const out = [];
  for (const bruto of String(texto).split(/[^\p{L}\p{N}]+/u)) {
    if (!bruto) continue;
    const partes = bruto.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').split(' ');
    const todas = partes.length > 1 ? [bruto, ...partes] : [bruto];
    for (const p of todas) {
      const w = semAcento(p).toLowerCase();
      if (w.length < 2 || PARADAS.has(w)) continue;
      out.push(radical(w));
    }
  }
  return out;
}

// ---- documentos que podem ser encontrados ----
function documentos({ m, mp, codigo, raiz }) {
  const docs = [];
  const add = (d) => { d.toks = [...tokens(d.titulo), ...tokens(d.titulo), ...tokens(d.titulo), ...tokens(d.texto)]; docs.push(d); };

  const nosProj = lerNos(m), nosPess = mp && mp !== m ? lerNos(mp) : [];
  for (const [lista, pref, peso] of [[nosProj, 'no', 1], [nosPess, 'np', 0.8]]) {
    for (const n of lista) add({ chave: `${pref}:${n.id}`, tipo: n.tipo, titulo: n.titulo, texto: n.texto, peso: n.status === 'substituido' ? 0.3 : peso, no: n, origem: pref === 'np' ? 'pessoal' : 'projeto' });
  }
  for (const p of listarMd(path.join(m, 'modulos'))) {
    const { campos, corpo } = separarFrontmatter(fs.readFileSync(p, 'utf8'));
    const nome = campos.modulo || path.basename(p, '.md');
    // só o resumo conta como texto (as listas de ligação viram ruído): o escrito pelo Claude e, na falta dele,
    // o automático, montado sem IA a partir do README e dos comentários do topo dos arquivos
    const resumo = (corpo.match(/<!-- rubi:resumo -->([\s\S]*?)<!-- \/rubi:resumo -->/)?.[1] || '').replace(/^_.*_$/m, '').trim();
    const auto = !automatico() ? '' : (corpo.match(/<!-- rubi:auto -->([\s\S]*?)<!-- \/rubi:auto -->/)?.[1] || '').trim();
    add({ chave: `mod:${nome}`, tipo: 'modulo', titulo: `módulo ${nome}`, texto: resumo || auto, resumo: resumo || auto, peso: resumo ? 0.8 : auto ? 0.65 : 0.5, caminho: `modulos/${path.basename(p)}` });
  }
  const recentes = (sub, n) => listarMd(path.join(m, sub)).slice(-n);
  for (const [sub, n, peso, tipo] of [['handoffs', 8, 0.7, 'handoff'], ['sessoes', 15, 0.4, 'sessao']]) {
    for (const p of recentes(sub, n)) {
      const { campos, corpo } = separarFrontmatter(fs.readFileSync(p, 'utf8'));
      add({ chave: `${tipo}:${path.basename(p)}`, tipo, titulo: `${tipo} ${path.basename(p, '.md')}`, texto: corpo.slice(0, 6000), peso, caminho: `${sub}/${path.basename(p)}`, arquivos: campos.arquivos || [] });
    }
  }
  for (const [f, a] of Object.entries(codigo?.arquivos || {})) {
    const teste = /(^|\/)(tests?|spec|__tests__)\/|\.(test|spec)\.[^/]+$|_test\.\w+$/.test(f);
    add({ chave: `arq:${f}`, tipo: 'arquivo', titulo: f.replace(/[/._-]/g, ' '), texto: automatico() ? `${a.simbolos.join(' ')} ${a.doc || ''}` : a.simbolos.join(' '), peso: teste ? 0.3 : 0.55, arquivo: f, info: a });
  }
  return docs;
}

function bm25(docs, consulta, { k1 = 1.2, b = 0.75 } = {}) {
  const q = [...new Set(consulta)];
  if (!q.length) return new Map();
  const N = docs.length, media = docs.reduce((s, d) => s + d.toks.length, 0) / Math.max(1, N);
  const df = new Map(q.map((t) => [t, 0]));
  const tfs = docs.map((d) => {
    const tf = new Map();
    for (const t of d.toks) if (df.has(t)) tf.set(t, (tf.get(t) || 0) + 1);
    for (const t of tf.keys()) df.set(t, df.get(t) + 1);
    return tf;
  });
  const notas = new Map();
  docs.forEach((d, i) => {
    let s = 0;
    for (const [t, f] of tfs[i]) {
      const idf = Math.log(1 + (N - df.get(t) + 0.5) / (df.get(t) + 0.5));
      s += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.toks.length) / media)));
    }
    if (s > 0) notas.set(d.chave, s);
  });
  return notas;
}

// ---- grafo unificado: conhecimento + código + módulos + handoffs ----
function montarGrafo(docs, codigo) {
  const viz = new Map();
  const liga = (a, b, w) => {
    if (a === b) return;
    for (const [x, y] of [[a, b], [b, a]]) {
      if (!viz.has(x)) viz.set(x, new Map());
      viz.get(x).set(y, (viz.get(x).get(y) || 0) + w);
    }
  };
  const chaveNo = new Map();
  for (const d of docs) if (d.no) chaveNo.set(d.no.id, d.chave);
  const alvo = (a) => a.startsWith('arquivo:') ? `arq:${a.slice(8)}` : a.startsWith('modulo:') ? `mod:${a.slice(7)}` : chaveNo.get(a);
  for (const d of docs) {
    if (d.no) {
      for (const f of d.no.arquivos) liga(d.chave, `arq:${f}`, 1);
      for (const l of d.no.liga) { const t = alvo(l.alvo); if (t) liga(d.chave, t, 1); }
      if (d.no.substitui && chaveNo.has(d.no.substitui)) liga(d.chave, chaveNo.get(d.no.substitui), 0.3);
    }
    if (d.arquivos) for (const f of d.arquivos) liga(d.chave, `arq:${f}`, 0.5);
  }
  for (const [f, a] of Object.entries(codigo?.arquivos || {})) {
    for (const i of a.imports || []) liga(`arq:${f}`, `arq:${i}`, 0.6);
  }
  // arquivos que mudam juntos no git (peso pela confiança do par)
  if (automatico()) for (const [a, b, c] of codigo?.historico?.pares || []) liga(`arq:${a}`, `arq:${b}`, 0.5 * c);
  // módulo como ponte pros seus arquivos mais centrais: o resumo bate no texto, o grafo leva aos arquivos
  const chaves = new Set(docs.map((d) => d.chave));
  if (automatico()) for (const [nome, info] of Object.entries(codigo?.modulos || {})) {
    if (!chaves.has(`mod:${nome}`)) continue;
    for (const f of info.arquivos.slice(0, 5)) liga(`mod:${nome}`, `arq:${f}`, 0.3);
  }
  return viz;
}

function pprGrafo(viz, sementes, { alfa = 0.3, iter = 25 } = {}) {
  const total = [...sementes.values()].reduce((a, b) => a + b, 0);
  if (!total) return new Map();
  const s = new Map([...sementes].map(([k, v]) => [k, v / total]));
  const grau = new Map([...viz].map(([k, m]) => [k, [...m.values()].reduce((a, b) => a + b, 0)]));
  let p = new Map(s);
  for (let k = 0; k < iter; k++) {
    const novo = new Map([...s].map(([x, v]) => [x, alfa * v]));
    for (const [x, px] of p) {
      const vx = viz.get(x);
      if (!vx) { novo.set(x, (novo.get(x) || 0) + (1 - alfa) * px); continue; }
      const g = grau.get(x);
      for (const [y, w] of vx) novo.set(y, (novo.get(y) || 0) + ((1 - alfa) * px * w) / g);
    }
    p = novo;
  }
  return p;
}

const ranking = (mapa) => [...mapa].sort((a, b) => b[1] - a[1]).map(([k]) => k);

function trecho(texto, q, max = 300) {
  const linhas = texto.split(/\n+/).map((l) => l.trim()).filter((l) => l && !l.startsWith('<!--'));
  const qs = new Set(q);
  let melhor = linhas[0] || '', nota = -1;
  for (const l of linhas) {
    const n = tokens(l).filter((t) => qs.has(t)).length;
    if (n > nota) { nota = n; melhor = l; }
  }
  const t = melhor.replace(/\s+/g, ' ');
  return t.length > max ? t.slice(0, max) + '…' : t;
}

function mudouDepois(raiz, no) {
  if (!raiz || !no.atualizado || !no.arquivos.length) return null;
  const quando = Date.parse(no.atualizado) + 120000;
  for (const f of no.arquivos) {
    try { const mt = fs.statSync(path.join(raiz, f)).mtimeMs; if (mt > quando) return { f, mt }; } catch {}
  }
  return null;
}

// Monta a resposta: o melhor que cabe no orçamento.
export function buscarContexto({ m, mp, raiz, codigo, pergunta = '', termos = [], arquivos = [], orcamento = 1500, incluirSubstituidos = false, limite = 12, soConhecimento = false }) {
  const docs = documentos({ m, mp, codigo, raiz });
  const porChave = new Map(docs.map((d) => [d.chave, d]));
  const q = tokens([pergunta, ...termos].join(' '));
  const texto = bm25(docs, q);

  // entidades: arquivos pedidos + nomes de arquivo/símbolo citados
  const entidades = new Map();
  const qset = new Set(tokens([pergunta, ...termos].join(' ')).concat([pergunta, ...termos].join(' ').toLowerCase().split(/[^\w./-]+/)));
  for (const a of arquivos) {
    const p = String(a).replace(/\\/g, '/').replace(/^\.\//, '');
    for (const f of Object.keys(codigo?.arquivos || {})) if (f === p || f.endsWith(`/${p}`)) entidades.set(`arq:${f}`, 2);
  }
  for (const [f, a] of Object.entries(codigo?.arquivos || {})) {
    const base = path.posix.basename(f).toLowerCase(), semExt = base.replace(/\.[^.]+$/, '');
    if (qset.has(base) || (semExt.length > 3 && qset.has(semExt))) entidades.set(`arq:${f}`, Math.max(entidades.get(`arq:${f}`) || 0, 1));
    if (a.simbolos.some((s) => s.length > 3 && qset.has(s.toLowerCase()))) entidades.set(`arq:${f}`, Math.max(entidades.get(`arq:${f}`) || 0, 0.8));
  }

  const viz = montarGrafo(docs, codigo);
  const sementes = new Map(entidades);
  const topTexto = ranking(texto).slice(0, 8);
  const maxT = texto.get(topTexto[0]) || 1;
  for (const k of topTexto) sementes.set(k, (sementes.get(k) || 0) + texto.get(k) / maxT);
  const grafo = pprGrafo(viz, sementes);
  for (const k of [...grafo.keys()]) if (sementes.has(k) || k.startsWith('mod:')) grafo.delete(k); // o grafo traz o que é novo; módulo é só ponte
  // tira o viés pra hubs (arquivo que todo mundo importa) e corta a cauda fraca
  for (const [k, v] of grafo) grafo.set(k, v / Math.sqrt(viz.get(k)?.size || 1));
  const topoGrafo = Math.max(0, ...grafo.values());
  for (const [k, v] of grafo) if (v < topoGrafo * 0.15) grafo.delete(k);

  const rrf = new Map();
  for (const lista of [ranking(texto), ranking(entidades), ranking(grafo).slice(0, 40)]) {
    lista.forEach((k, i) => rrf.set(k, (rrf.get(k) || 0) + 1 / (60 + i)));
  }
  for (const [k, v] of rrf) rrf.set(k, v * (porChave.get(k)?.peso ?? 0.5));

  let ordem = ranking(rrf).filter((k) => porChave.has(k));
  if (!incluirSubstituidos) ordem = ordem.filter((k) => porChave.get(k).no?.status !== 'substituido');
  // lembrança automática: só conhecimento, e só se algo bateu de verdade no texto ou pelo nome
  if (soConhecimento) {
    const conhecimento = (k) => /^(no|np|handoff):/.test(k);
    if (!ordem.some((k) => conhecimento(k) && (texto.has(k) || entidades.has(k)))) return null;
    ordem = ordem.filter(conhecimento);
  }

  const motivo = (k) => {
    if (entidades.has(k)) return 'citado';
    if (texto.has(k)) return null;
    let melhor = null, w = 0;
    for (const [y, peso] of viz.get(k) || []) if (sementes.has(y) && peso * sementes.get(y) > w) { w = peso * sementes.get(y); melhor = y; }
    const d = melhor && porChave.get(melhor);
    return d ? `ligado a ${d.no ? `"${d.titulo}"` : d.arquivo || d.titulo}` : 'vizinho no grafo';
  };

  const maxChars = orcamento * 3.5;
  const blocos = [];
  let usados = 0;
  for (const k of ordem.slice(0, limite * 2)) {
    if (blocos.length >= limite) break;
    const d = porChave.get(k);
    const mot = motivo(k);
    let b;
    if (d.no) {
      const n = d.no, extras = [];
      if (n.arquivos.length) extras.push(n.arquivos.slice(0, 3).map((f) => `\`${f}\``).join(', '));
      if (n.substitui) extras.push(`substitui "${porChave.get(`no:${n.substitui}`)?.titulo || n.substitui}"`);
      if (n.status === 'substituido') extras.push(`SUBSTITUÍDO por ${n.substituido_por}`);
      const mud = d.origem === 'projeto' && mudouDepois(raiz, n);
      if (mud) extras.push(`⚠ ${mud.f} mudou depois desta nota`);
      if (mot) extras.push(mot);
      b = `[${ROTULO[n.tipo] || n.tipo}${d.origem === 'pessoal' ? ', pessoal' : ''}] ${n.titulo} — ${n.caminho}\n  ${extras.length ? extras.join(' · ') + '\n  ' : ''}${trecho(n.texto, q)}`;
    } else if (d.tipo === 'arquivo') {
      const a = d.info, qs = new Set(q);
      const simb = [...a.simbolos].sort((x, y) => tokens(y).some((t) => qs.has(t)) - tokens(x).some((t) => qs.has(t))).slice(0, 8);
      const usadoPor = Object.values(codigo.arquivos).filter((o) => o.imports?.includes(d.arquivo)).length;
      b = `[arquivo] ${d.arquivo} — módulo ${a.modulo}${usadoPor ? `, usado por ${usadoPor}` : ''}${mot ? ` · ${mot}` : ''}${simb.length ? `\n  ${simb.join(', ')}` : ''}`;
    } else if (d.tipo === 'modulo') {
      const info = codigo?.modulos?.[k.slice(4)];
      b = `[módulo] ${k.slice(4)} — ${d.caminho}${info ? ` (${info.arquivos.length} arquivos)` : ''}\n  ${d.resumo ? trecho(d.resumo, q) : `centrais: ${(info?.arquivos || []).slice(0, 4).join(', ')}`}`;
    } else {
      b = `[${d.tipo}] ${d.caminho}${mot ? ` · ${mot}` : ''}\n  ${trecho(d.texto, q)}`;
    }
    if (usados + b.length > maxChars && blocos.length) break;
    blocos.push(b); usados += b.length;
  }
  if (!blocos.length) return soConhecimento ? null : 'Nada na memória sobre isso ainda. Se descobrir algo durável, registre com rubi_registrar.';
  if (soConhecimento) return blocos.join('\n\n');
  return blocos.join('\n\n') + `\n\n(${blocos.length} itens, ~${Math.round(usados / 3.5)} tokens. Abra um item com rubi_ler; zoom no módulo com rubi_mapa.)`;
}
