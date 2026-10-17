// Grafo de conhecimento temporal. Cada nó é um .md em conhecimento/ com tipo,
// ligações e arquivos de origem no frontmatter. Quem extrai os fatos é o próprio
// Claude (no handoff, quando o contexto já está pago); aqui só guardamos com ordem:
// junta duplicados, resolve ligações e, quando uma decisão muda, marca a antiga
// como substituída em vez de apagar.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { garantir, comFrontmatter, separarFrontmatter, listarMd, idDe } from './memoria.mjs';

export const TIPOS = ['decisao', 'conceito', 'bug', 'armadilha', 'preferencia', 'como-fazer', 'tarefa', 'nota'];
export const ROTULO = { decisao: 'decisão', conceito: 'conceito', bug: 'bug', armadilha: 'armadilha', preferencia: 'preferência', 'como-fazer': 'como fazer', tarefa: 'tarefa', nota: 'nota' };

export function lerNos(m) {
  return listarMd(path.join(m, 'conhecimento')).map((p) => {
    const { campos, corpo } = separarFrontmatter(fs.readFileSync(p, 'utf8'));
    const texto = corpo.replace(/^#\s.*\n+/, '').replace(/\n## Ligações[\s\S]*$/, '').trim();
    return {
      id: campos.id || path.basename(p, '.md'), tipo: campos.tipo || 'nota', titulo: campos.titulo || path.basename(p, '.md'),
      status: campos.status || 'ativo', arquivos: campos.arquivos || [], liga: campos.liga || [],
      substitui: campos.substitui, substituido_por: campos.substituido_por,
      criado: campos.criado, atualizado: campos.atualizado, commit: campos.commit,
      texto, caminho: `conhecimento/${path.basename(p)}`, mtime: fs.statSync(p).mtimeMs,
    };
  });
}

function escreverNo(m, no) {
  const links = [
    ...no.liga.map((l) => `- ${l.rel.replace(/_/g, ' ')} ${l.alvo.startsWith('arquivo:') ? `\`${l.alvo.slice(8)}\`` : l.alvo.startsWith('modulo:') ? `[[modulos/${idDe(l.alvo.slice(7))}|${l.alvo.slice(7)}]]` : `[[${l.alvo}]]`}`),
    ...no.arquivos.map((a) => `- arquivo \`${a}\``),
    ...(no.substitui ? [`- substitui [[${no.substitui}]]`] : []),
    ...(no.substituido_por ? [`- substituído por [[${no.substituido_por}]]`] : []),
  ];
  const corpo = `# ${no.titulo}\n\n${no.texto.trim()}\n${links.length ? `\n## Ligações\n\n${links.join('\n')}\n` : ''}`;
  fs.writeFileSync(path.join(m, 'conhecimento', `${no.id}.md`), comFrontmatter({
    id: no.id, tipo: no.tipo, titulo: no.titulo, status: no.status, arquivos: no.arquivos, liga: no.liga,
    substitui: no.substitui, substituido_por: no.substituido_por, criado: no.criado, atualizado: no.atualizado, commit: no.commit,
  }, corpo));
}

const palavras = (s) => new Set(idDe(s).split('-').filter((w) => w.length > 2));
function parecido(a, b) {
  const A = palavras(a), B = palavras(b);
  if (!A.size || !B.size) return 0;
  let i = 0; for (const w of A) if (B.has(w)) i++;
  return i / (A.size + B.size - i);
}

function commitAtual(raiz) {
  if (!raiz) return undefined;
  try { return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: raiz, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return undefined; }
}

// Caminho absoluto ou com ./ vira relativo à raiz do projeto, com barra normal.
export function normalizarArquivo(raiz, f) {
  let p = String(f).trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/:\d+(-\d+)?$/, '');
  if (raiz && path.isAbsolute(p)) {
    const r = path.relative(raiz, p).split(path.sep).join('/');
    if (!r.startsWith('..')) p = r;
  }
  return p;
}

// fatos: [{ tipo, titulo, texto, arquivos?, liga?: [{rel, alvo}], substitui? }]
export function registrar(m, fatos, { raiz, modulos = [] } = {}) {
  garantir(m);
  const nos = lerNos(m);
  const porId = new Map(nos.map((n) => [n.id, n]));
  const agora = new Date().toISOString();
  const commit = commitAtual(raiz);
  const resultado = [];

  const acharNo = (ref, tipo) => {
    const id = idDe(ref);
    if (porId.has(ref)) return porId.get(ref);
    for (const n of porId.values()) if (n.id === id || n.id === `${n.tipo}-${id}` || idDe(n.titulo) === id) return n;
    let melhor = null, nota = 0;
    for (const n of porId.values()) {
      if (tipo && n.tipo !== tipo) continue;
      const s = parecido(n.titulo, ref);
      if (s > nota) { nota = s; melhor = n; }
    }
    return nota >= 0.75 ? melhor : null;
  };

  const resolverAlvo = (alvo) => {
    const a = String(alvo).trim();
    if (a.startsWith('arquivo:') || a.startsWith('modulo:')) return a;
    const no = acharNo(a);
    if (no) return no.id;
    if (modulos.includes(a)) return `modulo:${a}`;
    if (/[/\\]/.test(a) || /\.[a-z0-9]{1,5}$/i.test(a)) return `arquivo:${normalizarArquivo(raiz, a)}`;
    // conceito novo: cria um nó mínimo pra ligação não ficar solta
    const id = `conceito-${idDe(a)}`;
    const stub = { id, tipo: 'conceito', titulo: a, status: 'ativo', arquivos: [], liga: [], texto: '(criado a partir de uma ligação; complete quando souber mais)', criado: agora, atualizado: agora, commit };
    porId.set(id, stub); escreverNo(m, stub);
    return id;
  };

  for (const f of fatos) {
    const tipo = TIPOS.includes(f.tipo) ? f.tipo : 'nota';
    if (!f.titulo || !String(f.titulo).trim()) continue;
    const arquivos = [...new Set((f.arquivos || []).map((a) => normalizarArquivo(raiz, a)))];
    const liga = (f.liga || []).filter((l) => l && l.alvo).map((l) => ({ rel: idDe(l.rel || 'relacionado').replace(/-/g, '_'), alvo: resolverAlvo(l.alvo) }));
    let no = acharNo(f.titulo, tipo);
    let acao;
    if (no && no.tipo === tipo && no.status !== 'substituido') {
      // mesmo assunto: acrescenta em vez de duplicar
      const texto = String(f.texto || '').trim();
      if (texto && !no.texto.includes(texto)) no.texto += `\n\n**${agora.slice(0, 10)}:** ${texto}`;
      no.arquivos = [...new Set([...no.arquivos, ...arquivos])];
      for (const l of liga) if (!no.liga.some((x) => x.rel === l.rel && x.alvo === l.alvo)) no.liga.push(l);
      no.atualizado = agora; no.commit = commit || no.commit;
      if (f.status) no.status = f.status;
      acao = 'atualizado';
    } else {
      let id = `${tipo}-${idDe(f.titulo)}`;
      for (let i = 2; porId.has(id); i++) id = `${tipo}-${idDe(f.titulo)}-${i}`;
      no = { id, tipo, titulo: String(f.titulo).trim(), status: f.status || 'ativo', arquivos, liga, texto: String(f.texto || '').trim(), criado: agora, atualizado: agora, commit };
      porId.set(id, no);
      acao = 'criado';
    }
    if (f.substitui) {
      const velho = acharNo(f.substitui);
      if (velho && velho.id !== no.id) {
        velho.status = 'substituido'; velho.substituido_por = no.id; velho.atualizado = agora;
        no.substitui = velho.id;
        escreverNo(m, velho);
        acao += `, substitui ${velho.id}`;
      }
    }
    escreverNo(m, no);
    resultado.push(`${acao}: ${no.caminho || `conhecimento/${no.id}.md`}`);
  }
  return resultado;
}
