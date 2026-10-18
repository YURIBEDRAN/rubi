#!/usr/bin/env node
// Servidor MCP do Rubi, sem dependências.
//   node mcp-server.mjs                      -> stdio (Claude Code, Claude Desktop, Codex, Gemini CLI, Cursor e qualquer cliente MCP)
//   node mcp-server.mjs --http --porta 8787  -> HTTP pra conector remoto (site e celular)
//      precisa de RUBI_TOKEN; o endpoint fica em /mcp/<token>

import http from 'node:http';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { raizProjeto, nomeProjeto } from './lib/config.mjs';
import { memoriaPessoal, memoriaApp, salvarHandoff, ultimoHandoff, lerDaMemoria, listarProjetosApp } from './lib/memoria.mjs';
import { registrar, TIPOS } from './lib/grafo.mjs';
import { buscarContexto } from './lib/busca.mjs';
import { indiceFresco, lerIndice, gerarMapa, lerMapa, escreverResumo } from './lib/mapa.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const MODO_HTTP = args.includes('--http');
const MODO_APP = MODO_HTTP || process.env.RUBI_MODO === 'app';
const VERSAO = '0.4.0';

// Pasta do projeto: RUBI_PROJECT_DIR, CLAUDE_PROJECT_DIR, os "roots" que o cliente MCP informa, ou a pasta atual.
let DIR_PROJETO = process.env.RUBI_PROJECT_DIR || process.env.CLAUDE_PROJECT_DIR || null;
let CLIENTE = '';

// Onde ler e escrever: no modo projeto, a pasta .rubi do projeto; no app, o vault.
function alvo(projeto) {
  const mp = memoriaPessoal();
  if (MODO_APP) return { m: memoriaApp(projeto || '_geral'), mp, raiz: null, nome: projeto || '_geral' };
  const raiz = raizProjeto(DIR_PROJETO || undefined);
  return raiz ? { m: path.join(raiz, '.rubi'), mp, raiz, nome: nomeProjeto(raiz) } : { m: mp, mp, raiz: null, nome: '_pessoal' };
}
const codigoDe = (a) => (a.raiz ? indiceFresco(a.m, a.raiz) : lerIndice(a.m)?.codigo || { arquivos: {}, modulos: {} });

const txt = (t) => ({ content: [{ type: 'text', text: t }] });
const projetoProp = MODO_APP ? { projeto: { type: 'string', description: 'Short project/topic name (e.g. "thesis", "store"). Default: "_geral".' } } : {};

const FATO = {
  type: 'object',
  properties: {
    tipo: { type: 'string', enum: TIPOS },
    titulo: { type: 'string', description: 'Short and stable; becomes the node name ("Use JWT instead of sessions").' },
    texto: { type: 'string', description: 'The fact and the WHY, in 1-4 sentences.' },
    arquivos: { type: 'array', items: { type: 'string' }, description: 'Files the fact comes from or affects.' },
    liga: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          rel: { type: 'string', description: 'sobre (about), depende_de (depends on), causa (causes), corrige (fixes), usa (uses), parte_de (part of), contradiz (contradicts), relacionado (related)' },
          alvo: { type: 'string', description: 'Title of another node, a file path or a module name.' },
        },
        required: ['alvo'],
      },
    },
    substitui: { type: 'string', description: 'Title of the older fact this one replaces (the old one is marked superseded, never deleted).' },
    status: { type: 'string', enum: ['ativo', 'resolvido'] },
  },
  required: ['tipo', 'titulo', 'texto'],
};

const FERRAMENTAS = [
  {
    name: 'rubi_contexto',
    description: 'Search the project memory (decisions, bugs, gotchas, concepts, handoffs) and the code map, combining text, file/function names and graph neighborhood. Use it BEFORE exploring the code. Put synonyms and related words you can think of in `termos`: that is what makes the search understand meaning. Returns short snippets within a token budget.',
    inputSchema: {
      type: 'object',
      properties: {
        pergunta: { type: 'string' },
        termos: { type: 'array', items: { type: 'string' }, description: '3-8 synonyms, technical terms, likely function/file names.' },
        arquivos: { type: 'array', items: { type: 'string' }, description: 'Files you already know are relevant.' },
        orcamento: { type: 'number', description: 'Max tokens in the answer (default 1500).' },
        incluir_substituidos: { type: 'boolean' },
        ...projetoProp,
      },
      required: ['pergunta'],
    },
    run: ({ pergunta, termos = [], arquivos = [], orcamento = 1500, incluir_substituidos, projeto }) => {
      const a = alvo(projeto);
      return txt(buscarContexto({
        m: a.m, mp: a.mp, raiz: a.raiz, codigo: codigoDe(a), pergunta, termos, arquivos,
        orcamento: Math.min(6000, Math.max(300, orcamento)), incluirSubstituidos: !!incluir_substituidos,
      }));
    },
  },
  {
    name: 'rubi_registrar',
    description: 'Store durable knowledge as graph nodes: decisions (with the why), bugs and fixes, gotchas (armadilha), domain concepts, preferences, how-tos (como-fazer). Link them to files and to other nodes. If a decision changed, use `substitui`. Duplicates are merged automatically. Never store secrets.',
    inputSchema: {
      type: 'object',
      properties: {
        fatos: { type: 'array', items: FATO },
        escopo: { type: 'string', enum: ['projeto', 'pessoal'], description: '"pessoal" = applies to every project (user preferences).' },
        ...projetoProp,
      },
      required: ['fatos'],
    },
    run: ({ fatos, escopo, projeto }) => {
      const a = alvo(projeto);
      const m = escopo === 'pessoal' ? a.mp : a.m;
      const codigo = codigoDe(a);
      const r = registrar(m, fatos, { raiz: a.raiz, modulos: Object.keys(codigo.modulos || {}) });
      if (m === a.m) gerarMapa(a.m, codigo, { projeto: a.nome });
      return txt(r.join('\n') || 'Nada registrado (faltou título?).');
    },
  },
  {
    name: 'rubi_mapa',
    description: 'Project map in zoom levels. Without `modulo`: overview (modules, central files ranked by PageRank, stored knowledge). With `modulo`: files, dependencies and knowledge of that module. Call it once at the start of a task.',
    inputSchema: { type: 'object', properties: { modulo: { type: 'string' }, ...projetoProp } },
    run: ({ modulo, projeto }) => {
      const a = alvo(projeto);
      if (a.raiz) indiceFresco(a.m, a.raiz);
      return txt(lerMapa(a.m, modulo) || (modulo ? `Módulo "${modulo}" não encontrado. Veja a lista em rubi_mapa sem argumentos.` : 'Mapa ainda vazio.'));
    },
  },
  {
    name: 'rubi_escrever_resumo',
    description: 'Write the curated summary of the project (alvo "mapa": 3-6 lines, what it is, stack, how to run) or of a module (alvo "modulo:<name>": 2-5 lines, responsibility and caveats). Preserved when the map is rebuilt.',
    inputSchema: { type: 'object', properties: { alvo: { type: 'string' }, texto: { type: 'string' }, ...projetoProp }, required: ['alvo', 'texto'] },
    run: ({ alvo: qual, texto, projeto }) => {
      const a = alvo(projeto);
      return txt(`Resumo salvo em ${escreverResumo(a.m, qual, texto, codigoDe(a), a.nome)}`);
    },
  },
  {
    name: 'rubi_ler',
    description: 'Open a memory item by the path shown by the search or the map (e.g. conhecimento/decisao-x.md). Prefix "pessoal:" for the personal memory.',
    inputSchema: { type: 'object', properties: { caminho: { type: 'string' }, ...projetoProp }, required: ['caminho'] },
    run: ({ caminho, projeto }) => {
      const a = alvo(projeto);
      return txt(caminho.startsWith('pessoal:') ? lerDaMemoria(a.mp, caminho.slice(8)) : lerDaMemoria(a.m, caminho));
    },
  },
  {
    name: 'rubi_salvar_handoff',
    description: 'Save "where we left off" to continue after a context reset or in a new session. Short markdown: Goal, Current state, Decisions, Key files, Next step, Gotchas.',
    inputSchema: { type: 'object', properties: { conteudo: { type: 'string' }, arquivos: { type: 'array', items: { type: 'string' } }, ...projetoProp }, required: ['conteudo'] },
    run: ({ conteudo, arquivos, projeto }, ctx) => {
      const a = alvo(projeto);
      const c = salvarHandoff(a.m, conteudo, { sessao: ctx.sessao, origem: MODO_APP ? 'app' : 'claude-code', arquivos });
      gerarMapa(a.m, codigoDe(a), { projeto: a.nome });
      return txt(`Handoff salvo em ${c}`);
    },
  },
  {
    name: 'rubi_ultimo_handoff',
    description: 'Return the most recent handoff, to continue where you left off.',
    inputSchema: { type: 'object', properties: { ...projetoProp } },
    run: ({ projeto }) => {
      const h = ultimoHandoff(alvo(projeto).m);
      return txt(h ? `(${h.caminho}, ${new Date(h.mtime).toLocaleString('pt-BR')})\n\n${h.texto}` : 'Nenhum handoff salvo ainda.');
    },
  },
];

if (MODO_APP) {
  FERRAMENTAS.push({
    name: 'rubi_projetos',
    description: 'List stored projects/topics with knowledge and handoff counts.',
    inputSchema: { type: 'object', properties: {} },
    run: () => {
      const ps = listarProjetosApp();
      return txt(ps.length ? ps.map((p) => `- ${p.projeto}: ${p.conhecimento} nós, ${p.handoffs} handoffs`).join('\n') : 'Nada guardado ainda.');
    },
  });
} else {
  const script = (nome, extra = []) => execFileSync(process.execPath, [path.join(AQUI, nome), ...extra], { encoding: 'utf8', maxBuffer: 1 << 24 });
  FERRAMENTAS.push(
    {
      name: 'rubi_raio_x',
      description: 'Token X-ray of the last N days of Claude Code: cost breakdown, priciest sessions, heaviest tools and a savings simulation. Claude Code only.',
      inputSchema: { type: 'object', properties: { dias: { type: 'number' } } },
      run: ({ dias = 30 }) => txt(script('raio-x.mjs', ['--dias', String(dias)])),
    },
    {
      name: 'rubi_auditar',
      description: 'Measure the fixed context loaded into every session (CLAUDE.md, memory, skills, MCP) and suggest cuts. Claude Code only.',
      inputSchema: { type: 'object', properties: {} },
      run: () => txt(script('auditar.mjs', [DIR_PROJETO || process.cwd()])),
    },
  );
}

// ---- JSON-RPC ----
const INSTRUCOES = {
  app: "Rubi is the user's memory: a knowledge graph per project, stored as markdown. When the user mentions Rubi, or asks to remember, store, recall or continue where they left off, use rubi_registrar, rubi_contexto and rubi_ultimo_handoff. When the conversation gets long, offer to save a handoff with rubi_salvar_handoff.",
  claude: 'Rubi: project map and knowledge graph. Before exploring, rubi_contexto (with related terms). When you learn something durable, rubi_registrar. Long conversation: rubi_salvar_handoff.',
  outro: "Rubi is this project's map and memory (a knowledge graph). 1) At the start of a task, call rubi_mapa once to see the modules, central files and stored knowledge. 2) Before exploring the code, call rubi_contexto with the question plus related terms: it may already know the answer or point to the right file. 3) When you learn something that would be expensive to rediscover (a decision and why, a bug and its fix, a gotcha, how something works), call rubi_registrar, linking it to the files. 4) Before the context gets long or the session ends, save rubi_salvar_handoff.",
};

let CAPS_CLIENTE = {};
let seqPedido = 0;
// Pede ao cliente as pastas do workspace (MCP roots) quando ele suporta e ninguém fixou a pasta.
function pedirRoots(enviar) {
  if (!enviar || !CAPS_CLIENTE.roots || process.env.RUBI_PROJECT_DIR || process.env.CLAUDE_PROJECT_DIR) return;
  enviar({ jsonrpc: '2.0', id: `rubi-roots-${++seqPedido}`, method: 'roots/list' });
}

async function tratar(msg, ctx) {
  const { id, method, params = {} } = msg;
  const ok = (result) => ({ jsonrpc: '2.0', id, result });
  const erro = (code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });
  // resposta do cliente a um pedido nosso (roots/list)
  if (!method) {
    const raiz = msg.result?.roots?.find((r) => String(r.uri).startsWith('file:'));
    if (raiz) { try { DIR_PROJETO = fileURLToPath(raiz.uri); } catch {} }
    return null;
  }
  if (method === 'notifications/initialized' || method === 'notifications/roots/list_changed') { pedirRoots(ctx.enviar); return null; }
  if (id === undefined || id === null) return null; // outras notificações
  switch (method) {
    case 'initialize':
      CAPS_CLIENTE = params.capabilities || {};
      CLIENTE = String(params.clientInfo?.name || '').toLowerCase();
      return ok({
        protocolVersion: params.protocolVersion || '2025-06-18',
        capabilities: { tools: {} },
        serverInfo: { name: 'rubi', version: VERSAO },
        // no Claude Code os hooks já injetam o mapa e lembram sozinhos; nos outros clientes a instrução faz esse papel
        instructions: MODO_APP ? INSTRUCOES.app : CLIENTE.includes('claude-code') ? INSTRUCOES.claude : INSTRUCOES.outro,
      });
    case 'ping':
      return ok({});
    case 'tools/list':
      return ok({ tools: FERRAMENTAS.map(({ run, ...f }) => f) });
    case 'tools/call': {
      const f = FERRAMENTAS.find((x) => x.name === params.name);
      if (!f) return erro(-32602, `ferramenta desconhecida: ${params.name}`);
      try {
        return ok(await f.run(params.arguments || {}, ctx));
      } catch (e) {
        return ok({ ...txt(`Erro: ${e.message}`), isError: true });
      }
    }
    default:
      return erro(-32601, `método não suportado: ${method}`);
  }
}

if (MODO_HTTP) {
  const token = process.env.RUBI_TOKEN;
  if (!token || token.length < 24) {
    console.error('Defina RUBI_TOKEN com pelo menos 24 caracteres aleatórios.');
    process.exit(1);
  }
  const porta = Number(args[args.indexOf('--porta') + 1]) || 8787;
  http.createServer(async (req, res) => {
    if (req.url !== `/mcp/${token}`) { res.writeHead(404).end(); return; }
    if (req.method !== 'POST') { res.writeHead(405, { Allow: 'POST' }).end(); return; }
    let corpo = '';
    for await (const c of req) { corpo += c; if (corpo.length > 2e6) { res.writeHead(413).end(); return; } }
    let msg;
    try { msg = JSON.parse(corpo); } catch { res.writeHead(400).end(); return; }
    const lote = Array.isArray(msg);
    const respostas = (await Promise.all((lote ? msg : [msg]).map((m) => tratar(m, {})))).filter(Boolean);
    if (!respostas.length) { res.writeHead(202).end(); return; }
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(lote ? respostas : respostas[0]));
  }).listen(porta, '127.0.0.1', () => console.error(`rubi MCP em http://127.0.0.1:${porta}/mcp/<token>`));
} else {
  // Uma mensagem por linha, respondidas em ordem.
  let buffer = '';
  let fila = Promise.resolve();
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (pedaco) => {
    buffer += pedaco;
    let i;
    while ((i = buffer.indexOf('\n')) >= 0) {
      const linha = buffer.slice(0, i).trim();
      buffer = buffer.slice(i + 1);
      if (!linha) continue;
      let msg;
      try { msg = JSON.parse(linha); } catch { continue; }
      fila = fila.then(async () => {
        const r = await tratar(msg, { sessao: process.env.CLAUDE_SESSION_ID, enviar: (o) => process.stdout.write(JSON.stringify(o) + '\n') });
        if (r) process.stdout.write(JSON.stringify(r) + '\n');
      });
    }
  });
}
