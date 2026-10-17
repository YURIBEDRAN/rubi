#!/usr/bin/env node
// Todos os hooks do plugin num arquivo só. Uso: node hook.mjs <inicio|lembrar|medidor|pre-compactar|colher|guarda>
// Recebe o JSON do Claude Code no stdin. Nunca pode quebrar a sessão: qualquer erro sai em silêncio.

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { lerConfig, lerEstado, salvarEstado, raizProjeto, nomeProjeto } from './lib/config.mjs';
import { memoriaDoProjeto, ultimoHandoff, salvarSessao } from './lib/memoria.mjs';
import { lerIndice, lerMapa, atualizarIndice } from './lib/mapa.mjs';
import { buscarContexto } from './lib/busca.mjs';
import { memoriaPessoal } from './lib/memoria.mjs';
import { normalizarArquivo } from './lib/grafo.mjs';
import { contextoAtual, registroSessao, registroEmMarkdown } from './lib/transcript.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const fmt = (n) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));
const HORA = 36e5;
const F = (n) => `mcp__plugin_rubi_rubi__${n}`;
const GUIA = `Antes de explorar o código, consulte a memória: ${F('rubi_contexto')} (mande termos relacionados). Aprendeu algo durável (como algo funciona, decisão e porquê, bug, armadilha): ${F('rubi_registrar')}. Pergunta ampla sobre o código: agente rubi-pesquisador.`;

function responder(evento, extra) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: evento, ...extra } }));
}

// Atualiza o índice do código sem travar o início da sessão.
function indexarEmSegundoPlano(raiz) {
  try {
    spawn(process.execPath, [path.join(AQUI, 'indexar.mjs'), raiz], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  } catch {}
}

// SessionStart: devolve a memória certa pra cada jeito de começar.
function inicio(e) {
  const raiz = raizProjeto(e.cwd);
  const m = memoriaDoProjeto(e.cwd);
  const estado = lerEstado(e.session_id);
  const partes = [];

  if (raiz) {
    // primeira vez no projeto: indexa já (é rápido); depois, só em segundo plano
    if (!lerIndice(m)) atualizarIndice(m, raiz, { projeto: nomeProjeto(e.cwd) });
    else indexarEmSegundoPlano(raiz);
  }
  const h = ultimoHandoff(m);
  const mapa = lerMapa(m);

  if (e.source === 'compact') {
    // A compactação nativa acabou de resumir a conversa. Devolvemos o que o resumo genérico perde.
    if (h && (h.sessao === e.session_id || Date.now() - h.mtime < 6 * HORA)) {
      partes.push(`[rubi] A conversa foi compactada. Este é o handoff que você salvou antes (${h.caminho}). Continue a partir dele:\n\n${h.texto}`);
    }
    if (estado.ultimoRegistro) {
      partes.push(`Registro automático do trecho compactado (pedidos, arquivos e comandos): ${estado.ultimoRegistro}. Abra com rubi_ler se faltar algum detalhe.`);
    }
    salvarEstado(e.session_id, { ...estado, avisado: false, proximoAviso: 0 });
  } else if (e.source === 'clear') {
    if (h && Date.now() - h.mtime < 48 * HORA) partes.push(`[rubi] Nova janela. Último handoff (${h.caminho}):\n\n${h.texto}`);
  }
  if (mapa && e.source !== 'compact') partes.push(`[rubi] Mapa do projeto (nível 0; zoom com rubi_mapa):\n\n${mapa.trim()}`);
  if (partes.length || raiz) partes.push(`[rubi] ${GUIA}`);
  if (partes.length) responder('SessionStart', { additionalContext: partes.join('\n\n') });
}

// Mede o contexto e pede handoff + registro antes da compactação.
function medidor(e) {
  if (!e.transcript_path) return;
  const cfg = lerConfig();
  const ctx = contextoAtual(e.transcript_path, 512 * 1024);
  if (!ctx) return;
  const estado = lerEstado(e.session_id);
  const limite = Math.max(estado.proximoAviso || 0, cfg.janela * cfg.avisoPct);

  // Caiu bem abaixo do limite: houve compactação; rearma o aviso.
  if (estado.avisado && ctx < cfg.janela * cfg.avisoPct * 0.6) {
    salvarEstado(e.session_id, { ...estado, avisado: false, proximoAviso: 0 });
    return;
  }
  if (ctx < limite || (estado.avisado && cfg.compactaSozinho)) return;

  let msg = `[rubi] Contexto em ${fmt(ctx)} de ${fmt(cfg.janela)} tokens.`;
  if (!estado.avisado) {
    msg += ' Antes da compactação, sem parar pra perguntar ao usuário:'
      + ' (1) rubi_registrar com os fatos duráveis desta sessão (decisões e o porquê, bugs e correções, armadilhas, conceitos), ligando aos arquivos;'
      + ' (2) se entendeu um módulo que está sem resumo, rubi_escrever_resumo;'
      + ' (3) rubi_salvar_handoff (skill "handoff"): objetivo, estado atual, arquivos-chave e próximo passo.'
      + ' Depois siga o trabalho normalmente.';
  }
  if (!cfg.compactaSozinho) {
    msg += ' A compactação automática cedo não está ligada: depois do handoff, sugira ao usuário rodar /compact (ou /clear; o handoff volta sozinho na janela nova).';
  } else {
    msg += ' A conversa vai ser compactada automaticamente logo e o handoff volta pra você em seguida.';
  }
  salvarEstado(e.session_id, { ...estado, avisado: true, proximoAviso: ctx + cfg.janela * 0.5 });
  return msg;
}

function medidorHook(e) {
  const msg = medidor(e);
  if (msg) responder(e.hook_event_name, { additionalContext: msg });
}

// UserPromptSubmit: lembrança automática. Busca no grafo pelo que o usuário acabou de pedir e
// entrega o conhecimento relevante antes de o Claude começar a explorar. Sem turno extra.
function lembrar(e) {
  const partes = [];
  const cfg = lerConfig();
  const raiz = raizProjeto(e.cwd);
  const prompt = String(e.prompt || '');
  if (cfg.lembranca !== false && raiz && prompt.trim().length >= 12 && !prompt.trim().startsWith('/')) {
    const m = memoriaDoProjeto(e.cwd);
    const codigo = lerIndice(m)?.codigo || { arquivos: {}, modulos: {} };
    const achado = buscarContexto({ m, mp: memoriaPessoal(), raiz, codigo, pergunta: prompt.slice(0, 2000), orcamento: cfg.lembrancaOrcamento || 700, limite: 6, soConhecimento: true });
    if (achado) partes.push(`[rubi] Da memória do projeto, relevante pra este pedido. Use como ponto de partida: vá direto aos arquivos citados em vez de explorar o projeto, e só confira no código o que for alterar:\n\n${achado}`);
  }
  const msg = medidor(e);
  if (msg) partes.push(msg);
  if (partes.length) responder('UserPromptSubmit', { additionalContext: partes.join('\n\n') });
}

// PreCompact: salva o registro objetivo do trecho que vai sumir, ligado aos arquivos mexidos.
function preCompactar(e) {
  if (!e.transcript_path) return;
  const raiz = raizProjeto(e.cwd);
  const r = registroSessao(e.transcript_path);
  const arquivos = r.arquivos.map(([f]) => normalizarArquivo(raiz, f)).filter((f) => !f.startsWith('..') && !path.isAbsolute(f)).slice(0, 60);
  const caminho = salvarSessao(memoriaDoProjeto(e.cwd), registroEmMarkdown(r), e.session_id, arquivos);
  const estado = lerEstado(e.session_id);
  salvarEstado(e.session_id, { ...estado, ultimoRegistro: caminho });
}

// Stop: se o Claude explorou o código e não guardou nada, pede pra registrar antes de encerrar.
// É a hora mais barata pra extrair conhecimento: o que ele descobriu ainda está no contexto.
const EXPLORA = new Set(['Read', 'Grep', 'Glob']);
function colher(e) {
  const cfg = lerConfig();
  if (!cfg.colheita || e.stop_hook_active || !e.transcript_path || !raizProjeto(e.cwd)) return;
  const estado = lerEstado(e.session_id);
  let explora = 0, registra = 0, fd;
  try {
    // lê só o que chegou desde a última vez
    fd = fs.openSync(e.transcript_path, 'r');
    const tam = fs.fstatSync(fd).size;
    const ini = Math.min(estado.colheitaOffset || 0, tam);
    const buf = Buffer.alloc(tam - ini);
    fs.readSync(fd, buf, 0, buf.length, ini);
    for (const m of buf.toString('utf8').matchAll(/"type":"tool_use","id":"[^"]*","name":"([^"]+)"/g)) {
      if (EXPLORA.has(m[1])) explora++;
      if (/rubi_registrar|rubi_salvar_handoff/.test(m[1])) registra++;
    }
    estado.colheitaOffset = tam;
  } catch { return; } finally { if (fd !== undefined) fs.closeSync(fd); }
  const pendente = registra ? 0 : (estado.exploradoSemRegistro || 0) + explora;
  if (pendente < cfg.colheitaMin) { salvarEstado(e.session_id, { ...estado, exploradoSemRegistro: pendente }); return; }
  salvarEstado(e.session_id, { ...estado, exploradoSemRegistro: 0 });
  process.stdout.write(JSON.stringify({
    decision: 'block',
    reason: `[rubi] Antes de encerrar: você explorou o código (${pendente} leituras/buscas) e nada foi guardado. Registre com ${F('rubi_registrar')} de 1 a 5 fatos duráveis que descobriu (como algo funciona, onde fica, armadilhas, decisões), ligados aos arquivos, pra próxima sessão não precisar reler. Seja breve. Se não houver nada que valha guardar, só encerre sem comentar.`,
  }));
}

// PreToolUse (Read e Bash): barra leitura de arquivo gigante inteiro. Na segunda tentativa passa.
const BINARIOS = /\.(png|jpe?g|gif|webp|bmp|ico|pdf|ipynb|svg)$/i;

function tamanhoArquivo(p) {
  try {
    const st = fs.statSync(p);
    if (!st.isFile()) return null;
    if (st.size < 20000) return { bytes: st.size, linhas: 0 };
    const buf = fs.readFileSync(p);
    let linhas = 1;
    for (let i = 0; i < buf.length; i++) if (buf[i] === 10) linhas++;
    return { bytes: st.size, linhas };
  } catch { return null; }
}

function guarda(e) {
  const cfg = lerConfig();
  if (!cfg.guarda.ativa) return;
  const inp = e.tool_input || {};
  let alvo = null;
  if (e.tool_name === 'Read') {
    if (inp.offset != null || inp.limit != null || !inp.file_path) return;
    alvo = inp.file_path;
  } else if (e.tool_name === 'Bash' || e.tool_name === 'PowerShell') {
    const m = String(inp.command || '').match(/^\s*(?:cat|type|Get-Content|gc)\s+("[^"]+"|'[^']+'|[^\s|;&<>]+)\s*$/i);
    if (!m) return;
    alvo = path.resolve(e.cwd || process.cwd(), m[1].replace(/^["']|["']$/g, ''));
  } else return;
  if (BINARIOS.test(alvo)) return;

  const t = tamanhoArquivo(alvo);
  if (!t || (t.bytes <= cfg.guarda.maxBytes && t.linhas <= cfg.guarda.maxLinhas)) return;

  const estado = lerEstado(e.session_id);
  const liberados = estado.liberados || [];
  if (liberados.includes(alvo)) return;
  salvarEstado(e.session_id, { ...estado, liberados: [...liberados, alvo].slice(-200) });

  const tokens = Math.round(t.bytes / 3.5);
  responder('PreToolUse', {
    permissionDecision: 'deny',
    permissionDecisionReason:
      `[rubi] ${path.basename(alvo)} tem ${t.linhas || '?'} linhas (~${fmt(tokens)} tokens) e ficaria no contexto até o fim da sessão, ` +
      'sendo relido a cada mensagem. Use Grep pra achar o trecho certo, ou Read com offset/limit. ' +
      'Se precisar mesmo do arquivo inteiro, repita exatamente a mesma chamada que ela passa.',
  });
}

const ACOES = { inicio, medidor: medidorHook, lembrar, 'pre-compactar': preCompactar, guarda, colher };

try {
  const entrada = fs.readFileSync(0, 'utf8');
  const e = entrada.trim() ? JSON.parse(entrada) : {};
  e.session_id ||= 'sem-sessao';
  ACOES[process.argv[2]]?.(e);
} catch (err) {
  if (process.env.RUBI_DEBUG) console.error(err);
}
process.exit(0);
