#!/usr/bin/env node
// Servidor MCP do Rubi, sem dependências.
//   node mcp-server.mjs                      -> stdio (Claude Code e app de desktop)
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
const VERSAO = '0.3.0';

// Onde ler e escrever: no Claude Code, a pasta .rubi do projeto; no app, o vault.
function alvo(projeto) {
  const mp = memoriaPessoal();
  if (MODO_APP) return { m: memoriaApp(projeto || '_geral'), mp, raiz: null, nome: projeto || '_geral' };
  const raiz = raizProjeto();
  return raiz ? { m: path.join(raiz, '.rubi'), mp, raiz, nome: nomeProjeto() } : { m: mp, mp, raiz: null, nome: '_pessoal' };
}
const codigoDe = (a) => (a.raiz ? indiceFresco(a.m, a.raiz) : lerIndice(a.m)?.codigo || { arquivos: {}, modulos: {} });

const txt = (t) => ({ content: [{ type: 'text', text: t }] });
const projetoProp = MODO_APP ? { projeto: { type: 'string', description: 'Nome curto do projeto/assunto (ex.: "tcc", "loja"). Padrão: "_geral".' } } : {};

const FATO = {
  type: 'object',
  properties: {
    tipo: { type: 'string', enum: TIPOS },
    titulo: { type: 'string', description: 'Curto e estável, vira o nome do nó ("Usar JWT em vez de sessão").' },
    texto: { type: 'string', description: 'O fato e o PORQUÊ, em 1-4 frases.' },
    arquivos: { type: 'array', items: { type: 'string' }, description: 'Arquivos de onde o fato vem ou que ele afeta.' },
    liga: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          rel: { type: 'string', description: 'sobre, depende_de, causa, corrige, usa, parte_de, contradiz, relacionado' },
          alvo: { type: 'string', description: 'Título de outro nó, caminho de arquivo ou nome de módulo.' },
        },
        required: ['alvo'],
      },
    },
    substitui: { type: 'string', description: 'Título do fato antigo que este substitui (o antigo é marcado, não apagado).' },
    status: { type: 'string', enum: ['ativo', 'resolvido'] },
  },
  required: ['tipo', 'titulo', 'texto'],
};

const FERRAMENTAS = [
  {
    name: 'rubi_contexto',
    description: 'Busca no conhecimento do projeto (decisões, bugs, armadilhas, conceitos, handoffs) e no mapa do código, combinando texto, nomes de arquivo/função e vizinhança no grafo. Use ANTES de explorar o código. Mande em `termos` sinônimos e palavras relacionadas que você imagina: é isso que faz a busca entender significado. Devolve trechos curtos dentro do orçamento.',
    inputSchema: {
      type: 'object',
      properties: {
        pergunta: { type: 'string' },
        termos: { type: 'array', items: { type: 'string' }, description: '3-8 sinônimos, termos técnicos, nomes prováveis de função/arquivo.' },
        arquivos: { type: 'array', items: { type: 'string' }, description: 'Arquivos que você já sabe que importam.' },
        orcamento: { type: 'number', description: 'Máximo de tokens na resposta (padrão 1500).' },
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
    description: 'Guarda conhecimento durável como nós de um grafo: decisões (com o porquê), bugs e correções, armadilhas, conceitos do domínio, preferências, como fazer. Ligue aos arquivos e a outros nós. Se uma decisão mudou, use `substitui`. Duplicados são unidos automaticamente. Nunca guarde segredos.',
    inputSchema: {
      type: 'object',
      properties: {
        fatos: { type: 'array', items: FATO },
        escopo: { type: 'string', enum: ['projeto', 'pessoal'], description: '"pessoal" = vale em todos os projetos (preferências do usuário).' },
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
    description: 'Mapa do projeto em níveis. Sem `modulo`: visão geral (módulos, arquivos centrais, conhecimento). Com `modulo`: arquivos, dependências e conhecimento daquele módulo.',
    inputSchema: { type: 'object', properties: { modulo: { type: 'string' }, ...projetoProp } },
    run: ({ modulo, projeto }) => {
      const a = alvo(projeto);
      if (a.raiz) indiceFresco(a.m, a.raiz);
      return txt(lerMapa(a.m, modulo) || (modulo ? `Módulo "${modulo}" não encontrado. Veja a lista em rubi_mapa sem argumentos.` : 'Mapa ainda vazio.'));
    },
  },
  {
    name: 'rubi_escrever_resumo',
    description: 'Escreve o resumo curado do projeto (alvo "mapa": 3-6 linhas — o que é, stack, como rodar) ou de um módulo (alvo "modulo:<nome>": 2-5 linhas — responsabilidade, entradas, cuidados). Fica preservado quando o mapa é recalculado.',
    inputSchema: { type: 'object', properties: { alvo: { type: 'string' }, texto: { type: 'string' }, ...projetoProp }, required: ['alvo', 'texto'] },
    run: ({ alvo: qual, texto, projeto }) => {
      const a = alvo(projeto);
      return txt(`Resumo salvo em ${escreverResumo(a.m, qual, texto, codigoDe(a), a.nome)}`);
    },
  },
  {
    name: 'rubi_ler',
    description: 'Abre um item da memória pelo caminho que a busca ou o mapa mostraram (ex.: conhecimento/decisao-x.md). Prefixe "pessoal:" pra memória pessoal.',
    inputSchema: { type: 'object', properties: { caminho: { type: 'string' }, ...projetoProp }, required: ['caminho'] },
    run: ({ caminho, projeto }) => {
      const a = alvo(projeto);
      return txt(caminho.startsWith('pessoal:') ? lerDaMemoria(a.mp, caminho.slice(8)) : lerDaMemoria(a.m, caminho));
    },
  },
  {
    name: 'rubi_salvar_handoff',
    description: 'Salva o "onde paramos" pra continuar depois da compactação ou numa janela nova. Markdown curto: Objetivo, Estado atual, Decisões, Arquivos-chave, Próximo passo, Armadilhas.',
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
    description: 'Devolve o handoff mais recente, pra continuar de onde parou.',
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
    description: 'Lista os projetos/assuntos guardados, com contagem de conhecimento e handoffs.',
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
      description: 'Raio-X de gasto de token dos últimos N dias do Claude Code: composição do custo, sessões mais caras, ferramentas que mais pesam e simulação de economia.',
      inputSchema: { type: 'object', properties: { dias: { type: 'number' } } },
      run: ({ dias = 30 }) => txt(script('raio-x.mjs', ['--dias', String(dias)])),
    },
    {
      name: 'rubi_auditar',
      description: 'Mede o que entra fixo em toda sessão (CLAUDE.md, memória, skills, MCPs) e sugere cortes.',
      inputSchema: { type: 'object', properties: {} },
      run: () => txt(script('auditar.mjs', [process.env.CLAUDE_PROJECT_DIR || process.cwd()])),
    },
  );
}

// ---- JSON-RPC ----
async function tratar(msg, ctx) {
  const { id, method, params = {} } = msg;
  const ok = (result) => ({ jsonrpc: '2.0', id, result });
  const erro = (code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });
  if (id === undefined || id === null) return null; // notificação
  switch (method) {
    case 'initialize':
      return ok({
        protocolVersion: params.protocolVersion || '2025-06-18',
        capabilities: { tools: {} },
        serverInfo: { name: 'rubi', version: VERSAO },
        instructions: 'Rubi: mapa e grafo de conhecimento do projeto. Antes de explorar, rubi_contexto (com termos relacionados). Ao aprender algo durável, rubi_registrar. Conversa longa: rubi_salvar_handoff.',
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
        const r = await tratar(msg, { sessao: process.env.CLAUDE_SESSION_ID });
        if (r) process.stdout.write(JSON.stringify(r) + '\n');
      });
    }
  });
}
