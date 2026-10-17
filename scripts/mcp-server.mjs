#!/usr/bin/env node
// Servidor MCP da memória, sem dependências.
//   node mcp-server.mjs                      -> stdio (Claude Code e app de desktop)
//   node mcp-server.mjs --http --porta 8787  -> HTTP pra conector remoto (site e celular)
//      precisa de RUBI_TOKEN; o endpoint fica em /mcp/<token>

import http from 'node:http';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { nomeProjeto } from './lib/config.mjs';
import * as vault from './lib/vault.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const MODO_HTTP = args.includes('--http');
const MODO_APP = MODO_HTTP || process.env.RUBI_MODO === 'app';
const projetoPadrao = () => (MODO_APP ? '_geral' : nomeProjeto());
const VERSAO = '0.2.0';

const txt = (t) => ({ content: [{ type: 'text', text: t }] });
const projetoProp = { projeto: { type: 'string', description: 'Pasta do projeto no vault. Padrão: projeto atual (ou "_geral" no app).' } };

const FERRAMENTAS = [
  {
    name: 'rubi_buscar',
    description: 'Busca nas notas, handoffs e registros de sessão do vault. Devolve trechos curtos; use rubi_ler pra abrir um.',
    inputSchema: { type: 'object', properties: { consulta: { type: 'string' }, ...projetoProp, todos_projetos: { type: 'boolean' } }, required: ['consulta'] },
    run: ({ consulta, projeto, todos_projetos }) => {
      const r = vault.buscar(consulta, { projeto: todos_projetos ? undefined : projeto || projetoPadrao() });
      return txt(r.length ? r.map((a) => `### ${a.caminho}\n${a.trecho}`).join('\n\n') : 'Nada encontrado.');
    },
  },
  {
    name: 'rubi_ler',
    description: 'Lê um arquivo do vault pelo caminho devolvido na busca ou no índice.',
    inputSchema: { type: 'object', properties: { caminho: { type: 'string' } }, required: ['caminho'] },
    run: ({ caminho }) => txt(vault.lerNota(caminho)),
  },
  {
    name: 'rubi_salvar_nota',
    description: 'Salva conhecimento durável: decisões e porquês, mapa do código, como rodar, armadilhas. Uma nota por assunto; use modo "anexar" pra acrescentar.',
    inputSchema: {
      type: 'object',
      properties: { titulo: { type: 'string' }, conteudo: { type: 'string' }, modo: { type: 'string', enum: ['substituir', 'anexar'] }, ...projetoProp },
      required: ['titulo', 'conteudo'],
    },
    run: ({ titulo, conteudo, modo, projeto }) => txt(`Salvo em ${vault.salvarNota(projeto || projetoPadrao(), titulo, conteudo, modo)}`),
  },
  {
    name: 'rubi_salvar_handoff',
    description: 'Salva o "onde paramos" pra continuar numa janela nova ou depois da compactação. Markdown curto (até ~1.500 palavras): Objetivo, Estado atual, Decisões, Arquivos-chave, Próximo passo, Armadilhas.',
    inputSchema: { type: 'object', properties: { conteudo: { type: 'string' }, ...projetoProp }, required: ['conteudo'] },
    run: ({ conteudo, projeto }, ctx) => txt(`Handoff salvo em ${vault.salvarHandoff(projeto || projetoPadrao(), conteudo, { sessao: ctx.sessao, origem: MODO_APP ? 'app' : 'claude-code' })}`),
  },
  {
    name: 'rubi_ultimo_handoff',
    description: 'Devolve o handoff mais recente do projeto, pra continuar de onde parou.',
    inputSchema: { type: 'object', properties: { ...projetoProp } },
    run: ({ projeto }) => {
      const h = vault.ultimoHandoff(projeto || projetoPadrao());
      return txt(h ? `(${h.caminho}, ${new Date(h.mtime).toLocaleString('pt-BR')})\n\n${h.texto}` : 'Nenhum handoff salvo ainda.');
    },
  },
  {
    name: 'rubi_projetos',
    description: 'Lista os projetos do vault com contagem de notas, handoffs e sessões.',
    inputSchema: { type: 'object', properties: {} },
    run: () => {
      const ps = vault.listarProjetos();
      return txt(ps.length ? ps.map((p) => `- ${p.projeto}: ${p.notas} notas, ${p.handoffs} handoffs, ${p.sessoes} sessões`).join('\n') : 'Vault vazio.');
    },
  },
];

if (!MODO_APP) {
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
        instructions: 'Memória persistente em markdown. Busque antes de reexplorar; salve decisões com rubi_salvar_nota; salve handoff quando a conversa ficar longa.',
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
