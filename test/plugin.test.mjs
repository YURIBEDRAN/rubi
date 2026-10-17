// node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'rubi-teste-'));
const env = { ...process.env, RUBI_HOME: path.join(TMP, 'home'), RUBI_VAULT: path.join(TMP, 'vault'), CLAUDE_CODE_AUTO_COMPACT_WINDOW: '150000' };
Object.assign(process.env, { RUBI_HOME: env.RUBI_HOME, RUBI_VAULT: env.RUBI_VAULT });
const PROJ = path.join(TMP, 'meu-projeto');
fs.mkdirSync(PROJ, { recursive: true });

function hook(acao, entrada, extraEnv = {}) {
  const r = spawnSync(process.execPath, [path.join(RAIZ, 'scripts', 'hook.mjs'), acao], {
    input: JSON.stringify(entrada), env: { ...env, ...extraEnv }, encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout ? JSON.parse(r.stdout).hookSpecificOutput : null;
}

const linha = (o) => JSON.stringify(o) + '\n';
function transcript(nome, ctx, extras = []) {
  const p = path.join(TMP, `${nome}.jsonl`);
  fs.writeFileSync(p,
    linha({ type: 'user', cwd: PROJ, message: { role: 'user', content: 'arruma o login e cria testes' } }) +
    linha({ type: 'assistant', message: { id: 'm1', content: [
      { type: 'text', text: 'Corrigi o login.' },
      { type: 'tool_use', id: 't1', name: 'Edit', input: { file_path: path.join(PROJ, 'login.js') } },
      { type: 'tool_use', id: 't2', name: 'Bash', input: { command: 'npm test', description: 'Roda os testes' } },
    ], usage: { input_tokens: 10, cache_creation_input_tokens: 1000, cache_read_input_tokens: ctx - 1010, output_tokens: 50 } } }) +
    extras.map(linha).join(''));
  return p;
}

test('medidor fica quieto abaixo do limite', () => {
  const out = hook('medidor', { session_id: 's1', hook_event_name: 'PostToolUse', cwd: PROJ, transcript_path: transcript('t-baixo', 50000) });
  assert.equal(out, null);
});

test('medidor pede handoff uma vez ao passar de 80% da janela', () => {
  const t = transcript('t-alto', 130000);
  const out = hook('medidor', { session_id: 's2', hook_event_name: 'PostToolUse', cwd: PROJ, transcript_path: t });
  assert.match(out.additionalContext, /130k de 150k/);
  assert.match(out.additionalContext, /handoff/);
  assert.equal(hook('medidor', { session_id: 's2', hook_event_name: 'PostToolUse', cwd: PROJ, transcript_path: t }), null, 'não repete');
});

test('sem compactação automática, sugere /compact', () => {
  const out = hook('medidor', { session_id: 's3', hook_event_name: 'UserPromptSubmit', cwd: PROJ, transcript_path: transcript('t-sem', 130000) },
    { CLAUDE_CODE_AUTO_COMPACT_WINDOW: '' });
  assert.match(out.additionalContext, /\/compact/);
});

test('pre-compactar salva registro e o início pós-compactação devolve handoff + registro', async () => {
  const { salvarHandoff } = await import(pathToUrl('scripts/lib/vault.mjs'));
  process.env.RUBI_VAULT = env.RUBI_VAULT;
  salvarHandoff('meu-projeto', '# Login\n\n## Próximo passo\n1. escrever teste do logout', { sessao: 's4' });

  const t = transcript('t-compacta', 140000);
  hook('pre-compactar', { session_id: 's4', cwd: PROJ, transcript_path: t, trigger: 'auto' });
  const sessoes = fs.readdirSync(path.join(env.RUBI_VAULT, 'meu-projeto', 'sessoes'));
  assert.equal(sessoes.length, 1);
  const reg = fs.readFileSync(path.join(env.RUBI_VAULT, 'meu-projeto', 'sessoes', sessoes[0]), 'utf8');
  assert.match(reg, /arruma o login/);
  assert.match(reg, /login\.js/);
  assert.match(reg, /Roda os testes/);

  const out = hook('inicio', { session_id: 's4', source: 'compact', cwd: PROJ });
  assert.match(out.additionalContext, /escrever teste do logout/);
  assert.match(out.additionalContext, /Registro automático/);
});

test('início normal só mostra ponteiro curto', () => {
  const out = hook('inicio', { session_id: 's5', source: 'startup', cwd: PROJ });
  assert.match(out.additionalContext, /tem memória no vault/);
  assert.ok(out.additionalContext.length < 1200);
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
  const cat = hook('guarda', { session_id: 's8', tool_name: 'Bash', tool_input: { command: 'cat grande.log' }, cwd: PROJ });
  assert.equal(cat.permissionDecision, 'deny');
});

test('busca acha por palavra sem acento e não sai do vault', async () => {
  const v = await import(pathToUrl('scripts/lib/vault.mjs'));
  v.salvarNota('meu-projeto', 'Decisões', 'Usamos autenticação por sessão porque o cliente não aceita JWT.');
  const r = v.buscar('autenticacao jwt', { projeto: 'meu-projeto' });
  assert.equal(r[0].caminho, 'meu-projeto/notas/Decisões.md');
  assert.match(r[0].trecho, /autenticação por sessão/);
  assert.throws(() => v.lerNota('../../etc/passwd'), /fora do vault/);
  assert.ok(fs.existsSync(path.join(env.RUBI_VAULT, 'meu-projeto', '_indice.md')));
});

test('servidor MCP responde initialize, lista e chama ferramentas', async () => {
  const p = spawn(process.execPath, [path.join(RAIZ, 'scripts', 'mcp-server.mjs')], { env: { ...env, CLAUDE_PROJECT_DIR: PROJ } });
  const respostas = [];
  let buf = '';
  p.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { respostas.push(JSON.parse(buf.slice(0, i))); buf = buf.slice(i + 1); } });
  const enviar = (o) => p.stdin.write(JSON.stringify(o) + '\n');
  enviar({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } });
  enviar({ jsonrpc: '2.0', method: 'notifications/initialized' });
  enviar({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
  enviar({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'rubi_buscar', arguments: { consulta: 'JWT' } } });
  enviar({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'rubi_ultimo_handoff', arguments: {} } });
  for (let t = 0; respostas.length < 4 && t < 50; t++) await new Promise((r) => setTimeout(r, 100));
  p.kill();
  assert.equal(respostas[0].result.serverInfo.name, 'rubi');
  const nomes = respostas[1].result.tools.map((f) => f.name);
  assert.ok(nomes.includes('rubi_raio_x') && nomes.includes('rubi_salvar_handoff'));
  assert.match(respostas[2].result.content[0].text, /Decisões/);
  assert.match(respostas[3].result.content[0].text, /logout/);
});

test('servidor HTTP exige token e responde JSON-RPC', async () => {
  const token = 'x'.repeat(32);
  const p = spawn(process.execPath, [path.join(RAIZ, 'scripts', 'mcp-server.mjs'), '--http', '--porta', '18787'], { env: { ...env, RUBI_TOKEN: token } });
  await new Promise((r) => p.stderr.once('data', r));
  const post = (url, corpo) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
  assert.equal((await post('http://127.0.0.1:18787/mcp/errado', {})).status, 404);
  const r = await post(`http://127.0.0.1:18787/mcp/${token}`, { jsonrpc: '2.0', id: 1, method: 'tools/list' });
  const nomes = (await r.json()).result.tools.map((f) => f.name);
  p.kill();
  assert.ok(nomes.includes('rubi_buscar'));
  assert.ok(!nomes.includes('rubi_raio_x'), 'no modo app não expõe raio-x');
});

function pathToUrl(rel) {
  return new URL(`file:///${path.join(RAIZ, rel).replace(/\\/g, '/')}`).href;
}
