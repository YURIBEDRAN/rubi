// node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'rubi-teste-'));
const env = { ...process.env, RUBI_HOME: path.join(TMP, 'home'), RUBI_VAULT: path.join(TMP, 'vault'), CLAUDE_CODE_AUTO_COMPACT_WINDOW: '150000' };
delete env.CLAUDE_PROJECT_DIR;
Object.assign(process.env, { RUBI_HOME: env.RUBI_HOME, RUBI_VAULT: env.RUBI_VAULT });
const lib = (nome) => import(pathToFileURL(path.join(RAIZ, 'scripts', 'lib', nome)).href);

// Projeto de exemplo: um app de loja pequeno em TS + Python
const PROJ = path.join(TMP, 'loja');
const MEM = path.join(PROJ, '.rubi');
const escrever = (rel, txt) => { fs.mkdirSync(path.dirname(path.join(PROJ, rel)), { recursive: true }); fs.writeFileSync(path.join(PROJ, rel), txt); };
fs.mkdirSync(path.join(PROJ, '.git'), { recursive: true });
escrever('src/checkout/Checkout.tsx', "import { aplicarCupom } from '../desconto/cupom';\nimport { api } from '@/lib/api';\nexport function Checkout() {}\n");
escrever('src/desconto/cupom.ts', "import { api } from '../lib/api';\nexport function aplicarCupom(total: number) { return total; }\n");
escrever('src/lib/api.ts', 'export const api = {};\nexport function get() {}\n');
escrever('src/auth/login.ts', "import { api } from '../lib/api';\nexport async function login() {}\n");
escrever('worker/fila.py', 'from worker import cobranca\n\ndef processar():\n    pass\n');
escrever('worker/cobranca.py', 'class Cobranca:\n    pass\n');
escrever('worker/__init__.py', '');

function hook(acao, entrada, extraEnv = {}) {
  const r = spawnSync(process.execPath, [path.join(RAIZ, 'scripts', 'hook.mjs'), acao], { input: JSON.stringify(entrada), env: { ...env, ...extraEnv }, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout ? JSON.parse(r.stdout).hookSpecificOutput : null;
}

const linha = (o) => JSON.stringify(o) + '\n';
function transcript(nome, ctx) {
  const p = path.join(TMP, `${nome}.jsonl`);
  fs.writeFileSync(p,
    linha({ type: 'user', cwd: PROJ, message: { role: 'user', content: 'arruma o cupom no checkout' } }) +
    linha({ type: 'assistant', message: { id: 'm1', content: [
      { type: 'text', text: 'Corrigi o cupom.' },
      { type: 'tool_use', id: 't1', name: 'Edit', input: { file_path: path.join(PROJ, 'src', 'desconto', 'cupom.ts') } },
      { type: 'tool_use', id: 't2', name: 'Bash', input: { command: 'npm test', description: 'Roda os testes' } },
    ], usage: { input_tokens: 10, cache_creation_input_tokens: 1000, cache_read_input_tokens: ctx - 1010, output_tokens: 50 } } }));
  return p;
}

// ---------------------------------------------------------------- código
test('mapa do código resolve imports (relativo, alias, python) e acha o arquivo central', async () => {
  const { mapearCodigo } = await lib('codigo.mjs');
  const c = mapearCodigo(PROJ);
  assert.deepEqual(c.arquivos['src/checkout/Checkout.tsx'].imports.sort(), ['src/desconto/cupom.ts', 'src/lib/api.ts']);
  assert.deepEqual(c.arquivos['worker/fila.py'].imports.sort(), ['worker/__init__.py', 'worker/cobranca.py'], 'pacote + submódulo');
  assert.ok(c.arquivos['src/desconto/cupom.ts'].simbolos.includes('aplicarCupom'));
  const top = Object.entries(c.arquivos).sort((a, b) => b[1].rank - a[1].rank)[0][0];
  assert.equal(top, 'src/lib/api.ts', 'quem é mais importado é o mais central');
  assert.ok(c.modulos['src/desconto'] && c.modulos.worker);
});

// ---------------------------------------------------------------- grafo
test('registrar cria nós, junta duplicados, liga e substitui sem apagar', async () => {
  const { registrar, lerNos } = await lib('grafo.mjs');
  registrar(MEM, [
    { tipo: 'armadilha', titulo: 'Cupom aplicado duas vezes', texto: 'O desconto rodava antes do total ser recalculado.', arquivos: ['src/desconto/cupom.ts'], liga: [{ rel: 'sobre', alvo: 'Checkout' }] },
    { tipo: 'decisao', titulo: 'Sessão em cookie', texto: 'Login guarda sessão em cookie.', arquivos: [path.join(PROJ, 'src/auth/login.ts')] },
  ], { raiz: PROJ });
  registrar(MEM, [{ tipo: 'armadilha', titulo: 'Cupom aplicado 2 vezes', texto: 'Acontece também no carrinho.' }], { raiz: PROJ });
  registrar(MEM, [{ tipo: 'decisao', titulo: 'Usar JWT em vez de sessão', texto: 'Stateless, roda em edge.', arquivos: ['src/auth/login.ts'], substitui: 'Sessão em cookie' }], { raiz: PROJ });
  const nos = lerNos(MEM);
  const cupom = nos.filter((n) => n.tipo === 'armadilha');
  assert.equal(cupom.length, 1, 'título parecido do mesmo tipo vira o mesmo nó');
  assert.match(cupom[0].texto, /carrinho/);
  assert.ok(nos.some((n) => n.id === 'conceito-checkout'), 'ligação pra algo novo cria o conceito');
  const velha = nos.find((n) => n.titulo === 'Sessão em cookie');
  assert.equal(velha.status, 'substituido');
  assert.equal(velha.substituido_por, 'decisao-usar-jwt-em-vez-de-sessao');
  assert.deepEqual(nos.find((n) => n.tipo === 'decisao' && n.status === 'ativo').arquivos, ['src/auth/login.ts'], 'caminho absoluto vira relativo');
  assert.match(fs.readFileSync(path.join(MEM, 'conhecimento', 'armadilha-cupom-aplicado-duas-vezes.md'), 'utf8'), /\[\[conceito-checkout\]\]/, 'link pro Obsidian');
});

// ---------------------------------------------------------------- busca
test('busca acha pelo grafo o que não tem a palavra, respeita orçamento e esconde o substituído', async () => {
  const { atualizarIndice } = await lib('mapa.mjs');
  const { buscarContexto } = await lib('busca.mjs');
  const codigo = atualizarIndice(MEM, PROJ, { projeto: 'loja' });
  const r = buscarContexto({ m: MEM, raiz: PROJ, codigo, pergunta: 'problema ao finalizar compra', termos: ['checkout'], orcamento: 800 });
  assert.match(r, /Cupom aplicado duas vezes/, 'veio pela ligação com Checkout, sem a palavra "compra"');
  assert.match(r, /ligado a/);
  assert.ok(r.length < 800 * 3.5 + 200);
  const s = buscarContexto({ m: MEM, raiz: PROJ, codigo, pergunta: 'como guardamos a sessão do login' });
  assert.match(s, /Usar JWT/);
  assert.doesNotMatch(s, /\] Sessão em cookie/, 'decisão substituída não aparece');
  assert.match(s, /substitui "Sessão em cookie"/);
  const a = buscarContexto({ m: MEM, raiz: PROJ, codigo, pergunta: 'onde fica aplicarCupom' });
  assert.match(a, /\[arquivo\] src\/desconto\/cupom\.ts.*citado/);
});

test('nota fica marcada quando o arquivo dela muda depois', async () => {
  const { buscarContexto } = await lib('busca.mjs');
  const { indiceFresco } = await lib('mapa.mjs');
  const futuro = new Date(Date.now() + 10 * 60e3);
  fs.utimesSync(path.join(PROJ, 'src/desconto/cupom.ts'), futuro, futuro);
  const r = buscarContexto({ m: MEM, raiz: PROJ, codigo: indiceFresco(MEM, PROJ), pergunta: 'cupom duas vezes' });
  assert.match(r, /⚠ src\/desconto\/cupom\.ts mudou depois/);
});

// ---------------------------------------------------------------- mapa
test('mapa nível 0 é curto e o resumo escrito pelo Claude sobrevive à regeneração', async () => {
  const { escreverResumo, gerarMapa, lerMapa, lerIndice } = await lib('mapa.mjs');
  const codigo = lerIndice(MEM).codigo;
  escreverResumo(MEM, 'mapa', 'Loja online: React + API Node + worker Python de cobrança.', codigo, 'loja');
  escreverResumo(MEM, 'modulo:src/desconto', 'Regras de cupom e promoções.', codigo, 'loja');
  gerarMapa(MEM, codigo, { projeto: 'loja' });
  const m = lerMapa(MEM);
  assert.match(m, /Loja online/);
  assert.match(m, /src\/desconto.*Regras de cupom/);
  assert.match(m, /Decisões:.*Usar JWT/);
  assert.doesNotMatch(m, /Sessão em cookie/);
  assert.ok(m.length / 3.5 < 900, `mapa com ~${Math.round(m.length / 3.5)} tokens`);
  assert.match(lerMapa(MEM, 'src/desconto'), /Cupom aplicado duas vezes/);
});

// ---------------------------------------------------------------- hooks
test('medidor fica quieto abaixo do limite e pede registro + handoff uma vez', () => {
  assert.equal(hook('medidor', { session_id: 's1', hook_event_name: 'PostToolUse', cwd: PROJ, transcript_path: transcript('t-baixo', 50000) }), null);
  const t = transcript('t-alto', 130000);
  const out = hook('medidor', { session_id: 's2', hook_event_name: 'PostToolUse', cwd: PROJ, transcript_path: t });
  assert.match(out.additionalContext, /130k de 150k/);
  assert.match(out.additionalContext, /rubi_registrar/);
  assert.match(out.additionalContext, /rubi_salvar_handoff/);
  assert.equal(hook('medidor', { session_id: 's2', hook_event_name: 'PostToolUse', cwd: PROJ, transcript_path: t }), null, 'não repete');
  const sem = hook('medidor', { session_id: 's3', hook_event_name: 'UserPromptSubmit', cwd: PROJ, transcript_path: t }, { CLAUDE_CODE_AUTO_COMPACT_WINDOW: '' });
  assert.match(sem.additionalContext, /\/compact/);
});

test('início injeta o mapa; compactação grava registro e devolve o handoff', async () => {
  const ini = hook('inicio', { session_id: 's4', source: 'startup', cwd: PROJ });
  assert.match(ini.additionalContext, /Mapa do projeto/);
  assert.match(ini.additionalContext, /Loja online/);
  assert.match(ini.additionalContext, /rubi_contexto/);

  const { salvarHandoff } = await lib('memoria.mjs');
  salvarHandoff(MEM, '# Cupom\n\n## Próximo passo\n1. teste do carrinho', { sessao: 's4' });
  hook('pre-compactar', { session_id: 's4', cwd: PROJ, transcript_path: transcript('t-c', 140000), trigger: 'auto' });
  const sessoes = fs.readdirSync(path.join(MEM, 'sessoes'));
  assert.equal(sessoes.length, 1);
  const reg = fs.readFileSync(path.join(MEM, 'sessoes', sessoes[0]), 'utf8');
  assert.match(reg, /arruma o cupom/);
  assert.match(reg, /arquivos: \["src\/desconto\/cupom.ts"\]/, 'registro ligado ao arquivo no grafo');
  const pos = hook('inicio', { session_id: 's4', source: 'compact', cwd: PROJ });
  assert.match(pos.additionalContext, /teste do carrinho/);
  assert.match(pos.additionalContext, /Registro automático/);
  assert.ok(fs.readFileSync(path.join(MEM, '.gitignore'), 'utf8').includes('.indice.json'));
});

test('lembrança automática: o pedido do usuário já traz o conhecimento relevante', () => {
  const r = hook('lembrar', { session_id: 'l1', hook_event_name: 'UserPromptSubmit', cwd: PROJ, prompt: 'o desconto do cupom está sendo aplicado duas vezes no carrinho' });
  assert.match(r.additionalContext, /Da memória do projeto/);
  assert.match(r.additionalContext, /Cupom aplicado duas vezes/);
  assert.ok(r.additionalContext.length < 700 * 3.5 + 300);
  assert.equal(hook('lembrar', { session_id: 'l2', hook_event_name: 'UserPromptSubmit', cwd: PROJ, prompt: 'gere um poema sobre o mar azul' }), null, 'nada relevante, nada injetado');
  assert.equal(hook('lembrar', { session_id: 'l3', hook_event_name: 'UserPromptSubmit', cwd: PROJ, prompt: '/rubi:raio-x' }), null, 'comando não dispara');
});

test('colheita: depois de explorar sem registrar, pede o registro uma vez', () => {
  const leituras = (n, extra = []) => {
    const p = path.join(TMP, `colhe-${n}-${extra.length}.jsonl`);
    const usos = [...Array.from({ length: n }, (_, i) => ({ type: 'tool_use', id: `r${i}`, name: 'Read', input: { file_path: 'x' } })), ...extra];
    fs.writeFileSync(p, linha({ type: 'assistant', message: { id: 'a', content: usos } }));
    return p;
  };
  const r = spawnSync(process.execPath, [path.join(RAIZ, 'scripts', 'hook.mjs'), 'colher'], { input: JSON.stringify({ session_id: 'c1', cwd: PROJ, transcript_path: leituras(12) }), env, encoding: 'utf8' });
  const out = JSON.parse(r.stdout);
  assert.equal(out.decision, 'block');
  assert.match(out.reason, /rubi_registrar/);
  const de_novo = spawnSync(process.execPath, [path.join(RAIZ, 'scripts', 'hook.mjs'), 'colher'], { input: JSON.stringify({ session_id: 'c1', cwd: PROJ, transcript_path: leituras(12), stop_hook_active: true }), env, encoding: 'utf8' });
  assert.equal(de_novo.stdout, '', 'não entra em loop');
  const registrou = spawnSync(process.execPath, [path.join(RAIZ, 'scripts', 'hook.mjs'), 'colher'], { input: JSON.stringify({ session_id: 'c2', cwd: PROJ, transcript_path: leituras(6, [{ type: 'tool_use', id: 'g', name: 'mcp__plugin_rubi_rubi__rubi_registrar', input: {} }]) }), env, encoding: 'utf8' });
  assert.equal(registrou.stdout, '', 'quem já registrou não é cobrado');
  const pouco = spawnSync(process.execPath, [path.join(RAIZ, 'scripts', 'hook.mjs'), 'colher'], { input: JSON.stringify({ session_id: 'c3', cwd: PROJ, transcript_path: leituras(6) }), env, encoding: 'utf8' });
  assert.equal(pouco.stdout, '', 'pouca exploração não dispara');
});

test('guarda barra arquivo gigante uma vez e libera na segunda', () => {
  const grande = path.join(PROJ, 'grande.log');
  fs.writeFileSync(grande, 'linha de log bem comprida aqui\n'.repeat(5000));
  const e = { session_id: 's6', tool_name: 'Read', tool_input: { file_path: grande }, cwd: PROJ };
  const out = hook('guarda', e);
  assert.equal(out.permissionDecision, 'deny');
  assert.match(out.permissionDecisionReason, /5001 linhas/);
  assert.equal(hook('guarda', e), null);
  assert.equal(hook('guarda', { ...e, session_id: 's7', tool_input: { file_path: grande, limit: 100 } }), null, 'com limit passa');
  assert.equal(hook('guarda', { session_id: 's8', tool_name: 'Bash', tool_input: { command: 'cat grande.log' }, cwd: PROJ }).permissionDecision, 'deny');
});

// ---------------------------------------------------------------- MCP
function mcpStdio(extraEnv) {
  const p = spawn(process.execPath, [path.join(RAIZ, 'scripts', 'mcp-server.mjs')], { env: { ...env, ...extraEnv } });
  const respostas = new Map();
  let buf = '';
  p.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const r = JSON.parse(buf.slice(0, i)); respostas.set(r.id, r); buf = buf.slice(i + 1); } });
  let id = 0;
  const chamar = async (method, params) => {
    const meu = ++id;
    p.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: meu, method, params }) + '\n');
    for (let t = 0; !respostas.has(meu) && t < 100; t++) await new Promise((r) => setTimeout(r, 50));
    return respostas.get(meu);
  };
  return { chamar, fechar: () => p.kill() };
}

test('MCP stdio: registrar e consultar pelo grafo, no projeto atual', async () => {
  const s = mcpStdio({ CLAUDE_PROJECT_DIR: PROJ });
  assert.equal((await s.chamar('initialize', { protocolVersion: '2025-06-18' })).result.serverInfo.name, 'rubi');
  const nomes = (await s.chamar('tools/list')).result.tools.map((f) => f.name);
  for (const n of ['rubi_contexto', 'rubi_registrar', 'rubi_mapa', 'rubi_escrever_resumo', 'rubi_salvar_handoff', 'rubi_raio_x']) assert.ok(nomes.includes(n), n);
  const reg = await s.chamar('tools/call', { name: 'rubi_registrar', arguments: { fatos: [{ tipo: 'como-fazer', titulo: 'Rodar o worker', texto: 'python -m worker.fila com REDIS_URL definido.', arquivos: ['worker/fila.py'] }] } });
  assert.match(reg.result.content[0].text, /criado: conhecimento\/como-fazer-rodar-o-worker\.md/);
  const ctx = await s.chamar('tools/call', { name: 'rubi_contexto', arguments: { pergunta: 'como subir a fila de cobrança', termos: ['worker', 'redis'] } });
  assert.match(ctx.result.content[0].text, /Rodar o worker/);
  const mapa = await s.chamar('tools/call', { name: 'rubi_mapa', arguments: { modulo: 'worker' } });
  assert.match(mapa.result.content[0].text, /Rodar o worker/);
  s.fechar();
});

test('MCP HTTP (app): exige token, guarda por projeto no vault e não expõe raio-x', async () => {
  const token = 'x'.repeat(32);
  const p = spawn(process.execPath, [path.join(RAIZ, 'scripts', 'mcp-server.mjs'), '--http', '--porta', '18787'], { env: { ...env, RUBI_TOKEN: token } });
  await new Promise((r) => p.stderr.once('data', r));
  const post = (url, corpo) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) }).then((r) => (r.status === 200 ? r.json() : r.status));
  const url = `http://127.0.0.1:18787/mcp/${token}`;
  assert.equal(await post('http://127.0.0.1:18787/mcp/errado', {}), 404);
  const nomes = (await post(url, { jsonrpc: '2.0', id: 1, method: 'tools/list' })).result.tools.map((f) => f.name);
  assert.ok(nomes.includes('rubi_projetos') && !nomes.includes('rubi_raio_x'));
  fs.mkdirSync(path.join(env.RUBI_VAULT, 'pasta-qualquer-do-usuario'), { recursive: true });
  await post(url, { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'rubi_registrar', arguments: { projeto: 'tcc', fatos: [{ tipo: 'preferencia', titulo: 'Citações em ABNT', texto: 'A orientadora exige ABNT.' }] } } });
  const r = await post(url, { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'rubi_contexto', arguments: { projeto: 'tcc', pergunta: 'formato das referências', termos: ['citação', 'abnt', 'norma'] } } });
  const lista = await post(url, { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'rubi_projetos', arguments: {} } });
  p.kill();
  assert.match(lista.result.content[0].text, /tcc/);
  assert.doesNotMatch(lista.result.content[0].text, /pasta-qualquer/, 'pasta sem memória do Rubi não é projeto');
  assert.match(r.result.content[0].text, /Citações em ABNT/);
  assert.ok(fs.existsSync(path.join(env.RUBI_VAULT, 'tcc', 'conhecimento', 'preferencia-citacoes-em-abnt.md')));
});
