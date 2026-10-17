// O vault: markdown puro, uma pasta por projeto. Abre direto no Obsidian.
//
// <vault>/<projeto>/
//   _indice.md              links pra tudo (gerado)
//   handoffs/AAAA-MM-DD-HHMM.md   "onde paramos" escrito pelo Claude
//   sessoes/AAAA-MM-DD-HHMM-xxxxxxxx.md   registro automático antes de cada compactação
//   notas/<titulo>.md       decisões, mapas, o que vale lembrar

import fs from 'node:fs';
import path from 'node:path';
import { lerConfig } from './config.mjs';

export const raizVault = () => lerConfig().vault;

const pad = (n) => String(n).padStart(2, '0');
export function carimbo(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export function slug(texto) {
  return String(texto).normalize('NFC').replace(/[\\/:*?"<>|#^[\]]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80) || 'nota';
}

function pastaProjeto(projeto, sub = '') {
  const p = path.join(raizVault(), slug(projeto), sub);
  fs.mkdirSync(p, { recursive: true });
  return p;
}

function arquivoLivre(dir, base) {
  let p = path.join(dir, `${base}.md`);
  for (let i = 2; fs.existsSync(p); i++) p = path.join(dir, `${base}-${i}.md`);
  return p;
}

function frontmatter(campos) {
  const linhas = Object.entries(campos).filter(([, v]) => v != null).map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
  return `---\n${linhas.join('\n')}\n---\n\n`;
}

function tirarFrontmatter(texto) {
  return texto.replace(/^---\n[\s\S]*?\n---\n+/, '');
}

const rel = (p) => path.relative(raizVault(), p).split(path.sep).join('/');

export function salvarHandoff(projeto, conteudo, { sessao, origem = 'claude' } = {}) {
  const p = arquivoLivre(pastaProjeto(projeto, 'handoffs'), carimbo());
  fs.writeFileSync(p, frontmatter({ tipo: 'handoff', projeto, sessao, origem, criado: new Date().toISOString() }) + conteudo.trim() + '\n');
  atualizarIndice(projeto);
  return rel(p);
}

export function salvarSessao(projeto, conteudo, sessao) {
  const p = arquivoLivre(pastaProjeto(projeto, 'sessoes'), `${carimbo()}-${String(sessao || 'x').slice(0, 8)}`);
  fs.writeFileSync(p, frontmatter({ tipo: 'sessao', projeto, sessao, criado: new Date().toISOString() }) + conteudo.trim() + '\n');
  atualizarIndice(projeto);
  return rel(p);
}

export function salvarNota(projeto, titulo, conteudo, modo = 'substituir') {
  const p = path.join(pastaProjeto(projeto, 'notas'), `${slug(titulo)}.md`);
  if (modo === 'anexar' && fs.existsSync(p)) {
    fs.appendFileSync(p, `\n\n## ${carimbo()}\n\n${conteudo.trim()}\n`);
  } else {
    fs.writeFileSync(p, frontmatter({ tipo: 'nota', projeto, titulo, atualizado: new Date().toISOString() }) + `# ${titulo}\n\n${conteudo.trim()}\n`);
  }
  atualizarIndice(projeto);
  return rel(p);
}

function listarMd(dir) {
  try {
    return fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort().map((f) => path.join(dir, f));
  } catch { return []; }
}

export function ultimoHandoff(projeto) {
  const arqs = listarMd(path.join(raizVault(), slug(projeto), 'handoffs'));
  const ultimo = arqs.sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs).at(-1);
  if (!ultimo) return null;
  const texto = fs.readFileSync(ultimo, 'utf8');
  const sessao = texto.match(/^sessao: "(.*)"$/m)?.[1];
  return { caminho: rel(ultimo), texto: tirarFrontmatter(texto), sessao, mtime: fs.statSync(ultimo).mtimeMs };
}

export function listarProjetos() {
  try {
    return fs.readdirSync(raizVault(), { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .map((e) => {
        const dir = path.join(raizVault(), e.name);
        const n = (s) => listarMd(path.join(dir, s)).length;
        return { projeto: e.name, notas: n('notas'), handoffs: n('handoffs'), sessoes: n('sessoes') };
      });
  } catch { return []; }
}

export function titulosNotas(projeto) {
  return listarMd(path.join(raizVault(), slug(projeto), 'notas')).map((p) => path.basename(p, '.md'));
}

export function atualizarIndice(projeto) {
  const dir = pastaProjeto(projeto);
  const secao = (titulo, sub, max) => {
    const arqs = listarMd(path.join(dir, sub)).reverse().slice(0, max);
    if (!arqs.length) return '';
    return `## ${titulo}\n\n${arqs.map((p) => `- [[${sub}/${path.basename(p, '.md')}]]`).join('\n')}\n\n`;
  };
  const corpo = `# ${projeto}\n\n` + secao('Notas', 'notas', 200) + secao('Handoffs', 'handoffs', 30) + secao('Sessões', 'sessoes', 30);
  fs.writeFileSync(path.join(dir, '_indice.md'), corpo);
}

// Lê um arquivo do vault sem deixar sair dele.
export function lerNota(caminho) {
  const raiz = path.resolve(raizVault());
  const p = path.resolve(raiz, caminho.endsWith('.md') ? caminho : `${caminho}.md`);
  if (!p.startsWith(raiz + path.sep)) throw new Error('caminho fora do vault');
  return fs.readFileSync(p, 'utf8');
}

// Busca simples e sem dependência: pontua por termo no título (peso 5) e no corpo,
// ignorando acento e caixa. Devolve trechos, não o arquivo inteiro.
// Caractere a caractere, pra manter o mesmo comprimento do original e o trecho bater.
const normalizar = (s) => s.split('').map((c) => c.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()[0] || c).join('');

function* todosMd(dir) {
  let entradas = [];
  try { entradas = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entradas) {
    if (e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* todosMd(p);
    else if (e.name.endsWith('.md') && e.name !== '_indice.md') yield p;
  }
}

export function buscar(consulta, { projeto, limite = 8 } = {}) {
  const termos = normalizar(consulta).split(/[^\p{L}\p{N}_-]+/u).filter((t) => t.length > 1);
  if (!termos.length) return [];
  const raiz = projeto ? path.join(raizVault(), slug(projeto)) : raizVault();
  const achados = [];
  for (const p of todosMd(raiz)) {
    const texto = fs.readFileSync(p, 'utf8');
    const corpo = normalizar(texto);
    const titulo = normalizar(path.basename(p, '.md'));
    let pontos = 0, primeiro = -1;
    for (const t of termos) {
      if (titulo.includes(t)) pontos += 5;
      let i = corpo.indexOf(t), n = 0;
      while (i >= 0 && n < 20) { n++; if (primeiro < 0 || i < primeiro) primeiro = i; i = corpo.indexOf(t, i + t.length); }
      pontos += n;
    }
    if (!pontos) continue;
    // handoffs e sessões antigos valem menos que notas
    const tipo = rel(p).split('/')[1];
    if (tipo === 'sessoes') pontos *= 0.5;
    const ini = Math.max(0, primeiro - 120);
    achados.push({ caminho: rel(p), pontos, trecho: texto.slice(ini, ini + 360).replace(/\s+/g, ' ').trim() });
  }
  return achados.sort((a, b) => b.pontos - a.pontos).slice(0, limite);
}
