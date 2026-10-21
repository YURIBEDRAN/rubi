// Mapa do código, sem IA: lista os arquivos, lê imports e símbolos com regex,
// monta o grafo "quem importa quem", agrupa em módulos e calcula PageRank
// (arquivo muito importado = central). Incremental: só relê o que mudou.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { cabecaGit, coMudancas } from './historico.mjs';

const EXT = {
  js: 'js', jsx: 'js', mjs: 'js', cjs: 'js', ts: 'js', tsx: 'js', vue: 'js', svelte: 'js',
  py: 'py', go: 'go', rs: 'rs', java: 'jvm', kt: 'jvm', kts: 'jvm', scala: 'jvm',
  rb: 'rb', php: 'php', cs: 'cs', c: 'c', h: 'c', cc: 'c', cpp: 'c', hpp: 'c', hh: 'c',
  swift: 'swift', css: 'css', scss: 'css', sass: 'css', less: 'css', sql: 'sql', dart: 'dart',
};
const IGNORAR = new Set(['node_modules', '.git', 'dist', 'build', 'out', '.next', '.nuxt', 'coverage', 'vendor',
  '__pycache__', '.venv', 'venv', 'env', 'target', 'bin', 'obj', '.idea', '.vscode', '.rubi', '.cache', 'tmp']);
const MAX_ARQUIVOS = 6000, MAX_BYTES = 400_000;

const posix = (p) => p.split(path.sep).join('/');
const ext = (p) => p.slice(p.lastIndexOf('.') + 1).toLowerCase();

function listarArquivos(raiz) {
  try {
    const out = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { cwd: raiz, encoding: 'utf8', maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'ignore'] });
    return out.split('\n').filter((f) => f && EXT[ext(f)] && !f.split('/').some((s) => IGNORAR.has(s))).slice(0, MAX_ARQUIVOS);
  } catch {}
  const achados = [];
  (function andar(dir, rel) {
    if (achados.length >= MAX_ARQUIVOS) return;
    let es = []; try { es = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of es) {
      if (e.name.startsWith('.') && e.name !== '.github') continue;
      if (IGNORAR.has(e.name)) continue;
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) andar(path.join(dir, e.name), r);
      else if (EXT[ext(e.name)]) achados.push(r);
    }
  })(raiz, '');
  return achados;
}

// ---- extração por linguagem ----
const todos = (re, s, g = 1) => { const r = []; for (const m of s.matchAll(re)) if (m[g]) r.push(m[g]); return r; };

function importsBrutos(lang, s) {
  switch (lang) {
    case 'js': return [
      ...todos(/(?:import|export)\s[^'"`;]*?from\s*['"]([^'"]+)['"]/g, s),
      ...todos(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g, s),
      ...todos(/require\(\s*['"]([^'"]+)['"]\s*\)/g, s),
      ...todos(/^\s*import\s+['"]([^'"]+)['"]/gm, s),
    ];
    case 'py': return [
      ...[...s.matchAll(/^\s*from\s+([.\w]+)\s+import\s+([\w*, ()]+)/gm)].flatMap((m) => [m[1], ...m[2].replace(/[()]/g, '').split(',').map((x) => `${m[1]}${m[1].endsWith('.') ? '' : '.'}${x.trim().split(/\s+/)[0]}`)]),
      ...todos(/^\s*import\s+([\w.]+)/gm, s),
    ];
    case 'go': return [...s.matchAll(/import\s*(?:\(([\s\S]*?)\)|"([^"]+)")/g)].flatMap((m) => m[2] ? [m[2]] : todos(/"([^"]+)"/g, m[1]));
    case 'rs': return [...todos(/^\s*(?:pub\s+)?mod\s+(\w+)\s*;/gm, s).map((x) => `mod:${x}`), ...todos(/^\s*use\s+crate::([\w:]+)/gm, s).map((x) => `crate:${x}`)];
    case 'jvm': return todos(/^\s*import\s+(?:static\s+)?([\w.]+)/gm, s);
    case 'rb': return [...todos(/require_relative\s+['"]([^'"]+)['"]/g, s).map((x) => `./${x}`)];
    case 'php': return [...todos(/(?:require|include)(?:_once)?\s*\(?\s*['"]([^'"]+)['"]/g, s), ...todos(/^\s*use\s+([\w\\]+)/gm, s).map((x) => `ns:${x}`)];
    case 'c': return todos(/^\s*#\s*include\s+"([^"]+)"/gm, s);
    case 'css': return todos(/@(?:import|use|forward)\s+['"]([^'"]+)['"]/g, s);
    case 'dart': return todos(/^\s*import\s+'([^']+)'/gm, s);
    default: return [];
  }
}

function simbolos(lang, s) {
  let r = [];
  switch (lang) {
    case 'js': r = [
      ...todos(/^\s*export\s+(?:default\s+)?(?:async\s+)?(?:function\*?|class|const|let|var|interface|type|enum)\s+([A-Za-z_$][\w$]*)/gm, s),
      ...todos(/^(?:async\s+)?function\*?\s+([A-Za-z_$][\w$]*)/gm, s), ...todos(/^class\s+([A-Za-z_$][\w$]*)/gm, s),
    ]; break;
    case 'py': r = todos(/^(?:async\s+)?(?:def|class)\s+(\w+)/gm, s); break;
    case 'go': r = [...s.matchAll(/^(?:func\s+(?:\([^)]*\)\s*)?(\w+)|type\s+(\w+))/gm)].map((m) => m[1] || m[2]); break;
    case 'rs': r = todos(/^\s*(?:pub(?:\([\w]+\))?\s+)?(?:async\s+)?(?:fn|struct|enum|trait)\s+(\w+)/gm, s); break;
    case 'jvm': case 'cs': case 'swift': case 'dart': r = todos(/\b(?:class|interface|enum|record|object|struct|protocol)\s+(\w+)/g, s); break;
    case 'rb': r = todos(/^\s*(?:def|class|module)\s+([\w.:?!]+)/gm, s); break;
    case 'php': r = todos(/\b(?:function|class|interface|trait)\s+(\w+)/g, s); break;
    case 'c': r = todos(/^(?:[\w:<>*&]+\s+)+\**(\w+)\s*\([^;{]*\)\s*\{/gm, s); break;
    case 'sql': r = todos(/create\s+(?:or\s+replace\s+)?(?:table|view|function|procedure)\s+(?:if\s+not\s+exists\s+)?([\w."]+)/gi, s); break;
  }
  return [...new Set(r.filter((x) => x && x.length > 1))].slice(0, 40);
}

// Comentário ou docstring do topo do arquivo: o que o próprio autor disse que ele faz.
// Entra na busca por texto e no resumo automático do módulo, sem gastar token.
const RUIDO = /copyright|license|licen[cç]a|spdx|eslint|prettier|@ts-|tslint|jshint|generated|gerado|coding[:=]|use strict/i;
export function docDoTopo(lang, s) {
  const t = s.slice(0, 5000).replace(/^﻿/, '').replace(/^#!.*\n/, '');
  let texto = '';
  if (lang === 'py') texto = t.match(/^\s*(?:#[^\n]*\n\s*)*[rRuUbB]{0,2}("""|''')([\s\S]*?)\1/)?.[2] || '';
  if (!texto) {
    const bloco = t.match(/^\s*\/\*+([\s\S]*?)\*\//);
    const linhas = t.match(/^(?:[ \t]*(?:\/\/[/!]?|#)(?!include|define|pragma|import|!)[^\n]*\n)+/);
    texto = bloco ? bloco[1] : linhas ? linhas[0] : '';
  }
  const limpo = texto.split('\n').map((l) => l.replace(/^\s*(?:\*+|\/\/[/!]?|#+)\s?/, '').trim())
    .filter((l) => l && !RUIDO.test(l) && !/^@\w+/.test(l)).join(' ').replace(/[~=^-]{4,}/g, ' ').replace(/\s+/g, ' ').trim();
  if (limpo.length < 12) return '';
  return limpo.match(/^.{30,240}?[.!?](?=\s|$)/)?.[0] || limpo.slice(0, 240);
}

// ---- resolução de imports para arquivos do projeto ----
function criarResolvedor(lista) {
  const existe = new Set(lista);
  const porNome = new Map(); // basename sem extensão -> [paths]
  for (const f of lista) {
    const b = path.posix.basename(f).replace(/\.[^.]+$/, '');
    if (!porNome.has(b)) porNome.set(b, []);
    porNome.get(b).push(f);
  }
  const porSufixo = (suf) => lista.filter((f) => f.replace(/\.[^.]+$/, '').endsWith(suf));
  const tentar = (base, exts) => {
    for (const e of exts) { const c = path.posix.normalize(base + e); if (existe.has(c)) return c; }
    return null;
  };
  const JS = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.svelte', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];

  return (lang, de, spec) => {
    const dir = path.posix.dirname(de);
    switch (lang) {
      case 'js': {
        if (spec.startsWith('.')) return tentar(path.posix.join(dir, spec), JS);
        if (spec.startsWith('@/') || spec.startsWith('~/')) return tentar(`src/${spec.slice(2)}`, JS) || tentar(spec.slice(2), JS);
        if (spec.startsWith('/')) return tentar(spec.slice(1), JS);
        return null; // pacote externo
      }
      case 'py': {
        let base;
        if (spec.startsWith('.')) {
          const pontos = spec.match(/^\.+/)[0].length;
          let d = dir; for (let i = 1; i < pontos; i++) d = path.posix.dirname(d);
          base = path.posix.join(d, spec.slice(pontos).replace(/\./g, '/'));
        } else base = spec.replace(/\./g, '/');
        return tentar(base, ['.py', '/__init__.py']) || tentar(`src/${base}`, ['.py', '/__init__.py']);
      }
      case 'go': {
        const partes = spec.split('/');
        for (let n = Math.min(3, partes.length); n >= 1; n--) {
          const suf = partes.slice(-n).join('/');
          const f = lista.find((x) => x.endsWith('.go') && path.posix.dirname(x).endsWith(suf));
          if (f) return f;
        }
        return null;
      }
      case 'rs': {
        if (spec.startsWith('mod:')) return tentar(path.posix.join(dir, spec.slice(4)), ['.rs', '/mod.rs']);
        const segs = spec.slice(6).split('::');
        for (let n = segs.length; n >= 1; n--) { const c = tentar(`src/${segs.slice(0, n).join('/')}`, ['.rs', '/mod.rs']); if (c) return c; }
        return null;
      }
      case 'jvm': { const c = porSufixo(spec.replace(/\./g, '/')); return c[0] || null; }
      case 'php': {
        if (spec.startsWith('ns:')) { const c = porSufixo(spec.slice(3).replace(/\\/g, '/')); return c[0] || null; }
        return tentar(path.posix.join(dir, spec), ['']);
      }
      case 'rb': return tentar(path.posix.join(dir, spec), ['.rb', '']);
      case 'c': return tentar(path.posix.join(dir, spec), ['']) || (porNome.get(path.posix.basename(spec).replace(/\.[^.]+$/, '')) || []).find((f) => f.endsWith(spec)) || null;
      case 'css': {
        const b = path.posix.join(dir, spec);
        return tentar(b, ['', '.css', '.scss', '.sass', '.less']) || tentar(path.posix.join(path.posix.dirname(b), `_${path.posix.basename(b)}`), ['.scss', '.sass']);
      }
      case 'dart': return spec.startsWith('package:') ? null : tentar(path.posix.join(dir, spec), ['']);
      default: return null;
    }
  };
}

const CONTEINERES = new Set(['src', 'app', 'apps', 'lib', 'libs', 'packages', 'internal', 'cmd', 'pkg', 'source', 'server', 'client', 'modules', 'services', 'components']);
export function moduloDe(f) {
  const p = f.split('/');
  if (p.length <= 1) return '(raiz)';
  if (CONTEINERES.has(p[0]) && p.length > 2) return `${p[0]}/${p[1]}`;
  return p[0];
}

export function pagerank(nos, arestas, { d = 0.85, iter = 40 } = {}) {
  const n = nos.length, idx = new Map(nos.map((x, i) => [x, i]));
  const saida = Array.from({ length: n }, () => []);
  for (const [a, b] of arestas) if (idx.has(a) && idx.has(b) && a !== b) saida[idx.get(a)].push(idx.get(b));
  let pr = new Float64Array(n).fill(1 / n);
  for (let k = 0; k < iter; k++) {
    const novo = new Float64Array(n).fill((1 - d) / n);
    let pendurado = 0;
    for (let i = 0; i < n; i++) {
      if (!saida[i].length) { pendurado += pr[i]; continue; }
      const parte = (d * pr[i]) / saida[i].length;
      for (const j of saida[i]) novo[j] += parte;
    }
    for (let i = 0; i < n; i++) novo[i] += (d * pendurado) / n;
    pr = novo;
  }
  return Object.fromEntries(nos.map((x, i) => [x, pr[i]]));
}

// Monta (ou atualiza) o mapa do código. `anterior` é o mapa salvo, pra reaproveitar o que não mudou.
export function mapearCodigo(raiz, anterior = null) {
  const lista = listarArquivos(raiz);
  const antigos = anterior?.arquivos || {};
  const resolver = criarResolvedor(lista);
  const arquivos = {};
  for (const f of lista) {
    let st; try { st = fs.statSync(path.join(raiz, f)); } catch { continue; }
    const velho = antigos[f];
    if (velho && velho.mtime === st.mtimeMs && velho.size === st.size && 'doc' in velho) { arquivos[f] = velho; continue; }
    const lang = EXT[ext(f)];
    let s = '';
    if (st.size <= MAX_BYTES) { try { s = fs.readFileSync(path.join(raiz, f), 'utf8'); } catch {} }
    arquivos[f] = { mtime: st.mtimeMs, size: st.size, lang, brutos: [...new Set(importsBrutos(lang, s))].slice(0, 200), simbolos: simbolos(lang, s), doc: docDoTopo(lang, s) };
  }
  // resolve sempre (um arquivo novo pode satisfazer import antigo)
  const arestas = [];
  for (const [f, a] of Object.entries(arquivos)) {
    a.imports = [...new Set(a.brutos.map((b) => resolver(a.lang, f, b)).filter((x) => x && x !== f))];
    for (const i of a.imports) arestas.push([f, i]);
    a.modulo = moduloDe(f);
  }
  const rank = pagerank(Object.keys(arquivos), arestas);
  for (const [f, a] of Object.entries(arquivos)) a.rank = rank[f];
  const modulos = {};
  for (const [f, a] of Object.entries(arquivos)) {
    const m = (modulos[a.modulo] ||= { arquivos: [], rank: 0 });
    m.arquivos.push(f); m.rank += a.rank;
  }
  for (const m of Object.values(modulos)) m.arquivos.sort((x, y) => arquivos[y].rank - arquivos[x].rank);
  // arquivos que mudam juntos no git: só recalcula quando o HEAD muda
  const head = cabecaGit(raiz);
  const historico = !head ? null : anterior?.historico?.head === head ? anterior.historico : { head, pares: coMudancas(raiz, new Set(Object.keys(arquivos))) };
  return { geradoEm: Date.now(), raiz: posix(raiz), arquivos, modulos, historico };
}
