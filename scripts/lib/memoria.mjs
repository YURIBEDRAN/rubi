// Uma "memória" é uma pasta com este layout. Tudo markdown; abre no Obsidian.
//
//   mapa.md                   nível 0: visão do projeto (entra em toda sessão)
//   modulos/<modulo>.md       nível 1: um resumo por módulo
//   conhecimento/<tipo>-<x>.md  nível 2: nós do grafo (decisões, bugs, conceitos...)
//   handoffs/AAAA-MM-DD-HHMM.md   "onde paramos"
//   sessoes/AAAA-MM-DD-HHMM-xxxxxxxx.md  registro automático antes da compactação
//   .indice.json              índice derivado (código + busca), recriável
//
// Onde ela mora:
//   projeto  -> <raiz do projeto>/.rubi   (pode ir pro git; o time compartilha)
//   pessoal  -> <vault>/_pessoal          (preferências que valem em todo projeto)
//   app      -> <vault>/<projeto>         (Claude Desktop e claude.ai, sem pasta de projeto)

import fs from 'node:fs';
import path from 'node:path';
import { lerConfig, raizProjeto } from './config.mjs';

export const memoriaPessoal = () => path.join(lerConfig().vault, '_pessoal');
export const memoriaApp = (projeto) => path.join(lerConfig().vault, slug(projeto || '_geral'));

export function memoriaDoProjeto(dir) {
  const r = raizProjeto(dir);
  return r ? path.join(r, '.rubi') : memoriaPessoal();
}

const GITIGNORE = '# índice derivado e registros automáticos: recriáveis, não vão pro git\n.indice.json\nsessoes/\n';

export function garantir(m) {
  for (const sub of ['conhecimento', 'modulos', 'handoffs', 'sessoes']) fs.mkdirSync(path.join(m, sub), { recursive: true });
  const gi = path.join(m, '.gitignore');
  if (!fs.existsSync(gi)) fs.writeFileSync(gi, GITIGNORE);
  return m;
}

const pad = (n) => String(n).padStart(2, '0');
export function carimbo(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export function slug(texto) {
  return String(texto).normalize('NFC').replace(/[\\/:*?"<>|#^[\]]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80) || 'nota';
}

// Nome de arquivo estável e sem acento pra ids de nós: "Decisão JWT" -> "decisao-jwt"
export function idDe(texto) {
  return String(texto).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'no';
}

// Frontmatter: uma chave por linha, valor em JSON (que também é YAML válido pro Obsidian).
export function comFrontmatter(campos, corpo) {
  const linhas = Object.entries(campos).filter(([, v]) => v != null && !(Array.isArray(v) && !v.length)).map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
  return `---\n${linhas.join('\n')}\n---\n\n${corpo.trim()}\n`;
}

export function separarFrontmatter(texto) {
  const t = texto.replace(/\r\n/g, '\n');
  const m = t.match(/^---\n([\s\S]*?)\n---\n*/);
  if (!m) return { campos: {}, corpo: t };
  const campos = {};
  for (const l of m[1].split('\n')) {
    const i = l.indexOf(':');
    if (i < 1) continue;
    const k = l.slice(0, i).trim(), v = l.slice(i + 1).trim();
    try { campos[k] = JSON.parse(v); } catch { campos[k] = v.replace(/^["']|["']$/g, ''); }
  }
  return { campos, corpo: t.slice(m[0].length) };
}

function arquivoLivre(dir, base) {
  let p = path.join(dir, `${base}.md`);
  for (let i = 2; fs.existsSync(p); i++) p = path.join(dir, `${base}-${i}.md`);
  return p;
}

const relativo = (m, p) => path.relative(m, p).split(path.sep).join('/');

export function listarMd(dir) {
  try { return fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort().map((f) => path.join(dir, f)); } catch { return []; }
}

export function salvarHandoff(m, conteudo, { sessao, origem = 'claude', arquivos } = {}) {
  garantir(m);
  const p = arquivoLivre(path.join(m, 'handoffs'), carimbo());
  fs.writeFileSync(p, comFrontmatter({ tipo: 'handoff', sessao, origem, arquivos, criado: new Date().toISOString() }, conteudo));
  return relativo(m, p);
}

export function salvarSessao(m, conteudo, sessao, arquivos) {
  garantir(m);
  const p = arquivoLivre(path.join(m, 'sessoes'), `${carimbo()}-${String(sessao || 'x').slice(0, 8)}`);
  fs.writeFileSync(p, comFrontmatter({ tipo: 'sessao', sessao, arquivos, criado: new Date().toISOString() }, conteudo));
  return relativo(m, p);
}

export function ultimoHandoff(m) {
  const arqs = listarMd(path.join(m, 'handoffs'));
  if (!arqs.length) return null;
  const ultimo = arqs.map((p) => [p, fs.statSync(p).mtimeMs]).sort((a, b) => a[1] - b[1]).at(-1);
  const { campos, corpo } = separarFrontmatter(fs.readFileSync(ultimo[0], 'utf8'));
  return { caminho: relativo(m, ultimo[0]), texto: corpo, sessao: campos.sessao, mtime: ultimo[1] };
}

// Lê um arquivo da memória sem deixar sair dela.
export function lerDaMemoria(m, caminho) {
  const raiz = path.resolve(m);
  const p = path.resolve(raiz, /\.(md|json)$/.test(caminho) ? caminho : `${caminho}.md`);
  if (!p.startsWith(raiz + path.sep)) throw new Error('caminho fora da memória');
  return fs.readFileSync(p, 'utf8');
}

// Projetos de app guardados no vault (modo Claude Desktop / claude.ai).
export function listarProjetosApp() {
  const v = lerConfig().vault;
  try {
    // só pastas com a estrutura do Rubi: o vault pode ser uma pasta com outras coisas (ex.: Downloads)
    return fs.readdirSync(v, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith('.')).map((e) => {
      const n = (s) => listarMd(path.join(v, e.name, s)).length;
      return { projeto: e.name, conhecimento: n('conhecimento'), handoffs: n('handoffs') };
    }).filter((p) => p.conhecimento || p.handoffs);
  } catch { return []; }
}
