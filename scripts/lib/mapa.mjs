// Mapa em níveis de zoom (a ideia de resumos hierárquicos do GraphRAG):
//   nível 0  mapa.md            ~500-700 tokens, entra em toda sessão
//   nível 1  modulos/<x>.md     um por módulo, aberto sob demanda
//   nível 2  conhecimento/*.md  os nós, achados pela busca
// A parte automática é recalculada sempre; o resumo escrito pelo Claude
// (entre os marcadores rubi:resumo) é preservado.

import fs from 'node:fs';
import path from 'node:path';
import { garantir, comFrontmatter, separarFrontmatter, idDe, ultimoHandoff } from './memoria.mjs';
import { lerNos, ROTULO } from './grafo.mjs';
import { mapearCodigo } from './codigo.mjs';

const INI = '<!-- rubi:resumo -->', FIM = '<!-- /rubi:resumo -->';
const ARQ_INDICE = '.indice.json';

function resumoSalvo(p) {
  try {
    const t = fs.readFileSync(p, 'utf8');
    const i = t.indexOf(INI), j = t.indexOf(FIM);
    if (i >= 0 && j > i) return t.slice(i + INI.length, j).trim();
  } catch {}
  return '';
}
const blocoResumo = (texto, vazio) => `${INI}\n${texto || vazio}\n${FIM}`;
const base = (f) => path.posix.basename(f);

// Resumo do módulo sem IA: o README da pasta e o que os arquivos centrais dizem de si no topo.
// Só vai pra página do módulo e pra busca; o mapa nível 0 (que entra em toda sessão) não cresce.
function resumoAutomatico(nome, info, codigo) {
  const linhas = [];
  if (codigo.raiz && nome !== '(raiz)') {
    for (const n of ['README.md', 'readme.md', 'README']) {
      let md;
      try { md = fs.readFileSync(path.join(codigo.raiz, nome, n), 'utf8'); } catch { continue; }
      const par = md.split(/\n\s*\n/).map((p) => p.trim()).find((p) => p && !/^(#|!\[|\[!\[|<|```|---)/.test(p));
      if (par) linhas.push(par.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '').replace(/\s+/g, ' ').slice(0, 300));
      break;
    }
  }
  for (const f of info.arquivos.filter((f) => codigo.arquivos[f]?.doc).slice(0, 4)) linhas.push(`${base(f)}: ${codigo.arquivos[f].doc}`);
  return linhas.join('\n');
}

export function lerIndice(m) {
  try { return JSON.parse(fs.readFileSync(path.join(m, ARQ_INDICE), 'utf8')); } catch { return null; }
}

// Atualiza o mapa do código (incremental) e regera mapa.md + modulos/.
export function atualizarIndice(m, raiz, { projeto } = {}) {
  garantir(m);
  const anterior = lerIndice(m);
  const codigo = raiz ? mapearCodigo(raiz, anterior?.codigo) : { arquivos: {}, modulos: {} };
  fs.writeFileSync(path.join(m, ARQ_INDICE), JSON.stringify({ versao: 1, codigo }));
  gerarMapa(m, codigo, { projeto: projeto || (raiz ? path.basename(raiz) : 'memória') });
  return codigo;
}

// Índice pronto pra consulta: usa o salvo se for recente, senão atualiza.
export function indiceFresco(m, raiz, maxIdadeMs = 5 * 60e3) {
  const i = lerIndice(m);
  if (i?.codigo && Date.now() - i.codigo.geradoEm < maxIdadeMs) return i.codigo;
  return atualizarIndice(m, raiz);
}

export function gerarMapa(m, codigo, { projeto }) {
  garantir(m);
  const nos = lerNos(m).filter((n) => n.status !== 'substituido');
  const mods = Object.entries(codigo.modulos || {}).sort((a, b) => b[1].rank - a[1].rank);
  const arqMod = (f) => codigo.arquivos[f]?.modulo;

  // ---- nível 1: uma página por módulo ----
  const linhaModulo = {};
  for (const [nome, info] of mods) {
    const p = path.join(m, 'modulos', `${idDe(nome)}.md`);
    const resumo = resumoSalvo(p);
    linhaModulo[nome] = resumo.split('\n').find((l) => l.trim() && !l.startsWith('_'))?.trim().slice(0, 140) || '';
    const depende = new Set(), usadoPor = new Set();
    for (const f of info.arquivos) for (const i of codigo.arquivos[f].imports || []) if (arqMod(i) !== nome) depende.add(arqMod(i));
    for (const [f, a] of Object.entries(codigo.arquivos)) if (a.modulo !== nome && (a.imports || []).some((i) => arqMod(i) === nome)) usadoPor.add(a.modulo);
    const ligados = nos.filter((n) => n.arquivos.some((f) => arqMod(f) === nome || f.startsWith(`${nome}/`)) || n.liga.some((l) => l.alvo === `modulo:${nome}`));
    const corpo = [
      `# Módulo ${nome}`,
      blocoResumo(resumo, '_Sem resumo ainda. Quando entender o módulo, escreva 2-5 linhas com rubi_escrever_resumo (alvo "modulo:' + nome + '")._'),
      (() => { const a = resumoAutomatico(nome, info, codigo); return a ? `## Do próprio código (automático)\n<!-- rubi:auto -->\n${a}\n<!-- /rubi:auto -->` : ''; })(),
      `## Arquivos (${info.arquivos.length}, por centralidade)`,
      info.arquivos.slice(0, 30).map((f) => `- \`${f}\`${codigo.arquivos[f].simbolos.length ? ` — ${codigo.arquivos[f].simbolos.slice(0, 6).join(', ')}` : ''}`).join('\n') + (info.arquivos.length > 30 ? `\n- … +${info.arquivos.length - 30}` : ''),
      depende.size ? `## Depende de\n${[...depende].map((x) => `[[modulos/${idDe(x)}|${x}]]`).join(' · ')}` : '',
      usadoPor.size ? `## Usado por\n${[...usadoPor].map((x) => `[[modulos/${idDe(x)}|${x}]]`).join(' · ')}` : '',
      ligados.length ? `## Conhecimento ligado\n${ligados.map((n) => `- [[conhecimento/${n.id}|${n.titulo}]] (${ROTULO[n.tipo]})`).join('\n')}` : '',
    ].filter(Boolean).join('\n\n');
    fs.writeFileSync(p, comFrontmatter({ tipo: 'modulo', modulo: nome, arquivos: info.arquivos.length }, corpo));
  }

  // ---- nível 0: mapa.md ----
  const pMapa = path.join(m, 'mapa.md');
  const visao = resumoSalvo(pMapa);
  const centrais = Object.entries(codigo.arquivos).sort((a, b) => b[1].rank - a[1].rank).slice(0, 10).map(([f]) => `\`${f}\``);
  const porTipo = (t, max = 6) => nos.filter((n) => n.tipo === t && (t !== 'bug' || n.status !== 'resolvido'))
    .sort((a, b) => String(b.atualizado).localeCompare(String(a.atualizado))).slice(0, max)
    .map((n) => `[[conhecimento/${n.id}|${n.titulo}]]`);
  const conhecimento = [['decisao', 'Decisões'], ['armadilha', 'Armadilhas'], ['bug', 'Bugs abertos'], ['preferencia', 'Preferências'], ['como-fazer', 'Como fazer'], ['conceito', 'Conceitos']]
    .map(([t, r]) => { const l = porTipo(t); return l.length ? `- **${r}:** ${l.join(' · ')}` : ''; }).filter(Boolean);
  const h = ultimoHandoff(m);
  const objetivo = h?.texto.split('\n').find((l) => l.trim() && !l.startsWith('#'))?.trim().slice(0, 160);

  const corpo = [
    `# Mapa: ${projeto}`,
    blocoResumo(visao, '_Sem visão geral ainda. Quando entender o projeto, escreva 3-6 linhas (o que é, stack, como rodar) com rubi_escrever_resumo (alvo "mapa")._'),
    mods.length ? `## Módulos\n${mods.slice(0, 12).map(([n, i]) => `- [[modulos/${idDe(n)}|${n}]] (${i.arquivos.length})${linhaModulo[n] ? ` — ${linhaModulo[n]}` : ` — centrais: ${i.arquivos.slice(0, 3).map(base).join(', ')}`}`).join('\n')}${mods.length > 12 ? `\n- … +${mods.length - 12} módulos` : ''}` : '',
    centrais.length ? `## Arquivos centrais\n${centrais.join(' · ')}` : '',
    conhecimento.length ? `## Conhecimento (${nos.length} nós)\n${conhecimento.join('\n')}` : '',
    h ? `## Último handoff\n${new Date(h.mtime).toLocaleString('pt-BR')} — ${objetivo || ''} ([[${h.caminho.replace(/\.md$/, '')}]])` : '',
    '_Zoom: rubi_mapa(modulo) · busca: rubi_contexto · guardar: rubi_registrar_',
  ].filter(Boolean).join('\n\n');
  fs.writeFileSync(pMapa, comFrontmatter({ tipo: 'mapa', projeto, atualizado: new Date().toISOString() }, corpo));
}

export function lerMapa(m, modulo) {
  const p = modulo ? path.join(m, 'modulos', `${idDe(modulo)}.md`) : path.join(m, 'mapa.md');
  try { return separarFrontmatter(fs.readFileSync(p, 'utf8')).corpo; } catch { return null; }
}

// O Claude escreve o resumo curado do projeto ("mapa") ou de um módulo ("modulo:<nome>").
export function escreverResumo(m, alvo, texto, codigo, projeto) {
  const p = alvo === 'mapa' ? path.join(m, 'mapa.md') : path.join(m, 'modulos', `${idDe(alvo.replace(/^modulo:/, ''))}.md`);
  garantir(m);
  if (!fs.existsSync(p)) fs.writeFileSync(p, `${INI}\n${FIM}\n`);
  const t = fs.readFileSync(p, 'utf8');
  const i = t.indexOf(INI), j = t.indexOf(FIM);
  const novo = i >= 0 && j > i ? t.slice(0, i) + blocoResumo(texto.trim()) + t.slice(j + FIM.length) : `${blocoResumo(texto.trim())}\n\n${t}`;
  fs.writeFileSync(p, novo);
  if (codigo) gerarMapa(m, codigo, { projeto });
  return path.relative(m, p).split(path.sep).join('/');
}
