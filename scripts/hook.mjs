#!/usr/bin/env node
// Todos os hooks do plugin num arquivo só. Uso: node hook.mjs <inicio|medidor|pre-compactar|guarda>
// Recebe o JSON do Claude Code no stdin. Nunca pode quebrar a sessão: qualquer erro sai em silêncio.

import fs from 'node:fs';
import path from 'node:path';
import { lerConfig, lerEstado, salvarEstado, nomeProjeto } from './lib/config.mjs';
import { ultimoHandoff, titulosNotas, salvarSessao, raizVault } from './lib/vault.mjs';
import { contextoAtual, registroSessao, registroEmMarkdown } from './lib/transcript.mjs';

const fmt = (n) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));
const HORA = 36e5;

function responder(evento, extra) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: evento, ...extra } }));
}

// SessionStart: devolve a memória certa pra cada jeito de começar.
function inicio(e) {
  const projeto = nomeProjeto(e.cwd);
  const estado = lerEstado(e.session_id);
  const h = ultimoHandoff(projeto);
  const partes = [];

  if (e.source === 'compact') {
    // A compactação nativa acabou de resumir a conversa. Devolvemos o que o resumo genérico perde.
    if (h && (h.sessao === e.session_id || Date.now() - h.mtime < 6 * HORA)) {
      partes.push(`[rubi] A conversa foi compactada. Este é o handoff que você salvou antes (${h.caminho}). Continue a partir dele:\n\n${h.texto}`);
    }
    if (estado.ultimoRegistro) {
      partes.push(`Registro automático do trecho compactado (pedidos, arquivos e comandos): ${estado.ultimoRegistro} — leia com rubi_ler se faltar algum detalhe.`);
    }
    salvarEstado(e.session_id, { ...estado, avisado: false, proximoAviso: 0 });
  } else if (e.source === 'clear') {
    if (h && Date.now() - h.mtime < 48 * HORA) {
      partes.push(`[rubi] Nova janela. Último handoff do projeto "${projeto}" (${h.caminho}):\n\n${h.texto}`);
    }
  } else {
    // startup/resume: só um ponteiro curto, pra não pesar no contexto fixo.
    const notas = titulosNotas(projeto);
    if (notas.length || h) {
      let t = `[rubi] Projeto "${projeto}" tem memória no vault.`;
      if (notas.length) t += ` Notas: ${notas.slice(0, 30).join(' · ')}${notas.length > 30 ? ` (+${notas.length - 30})` : ''}.`;
      if (h) {
        const objetivo = h.texto.split('\n').find((l) => l.trim() && !l.startsWith('#'))?.trim().slice(0, 200);
        t += ` Último handoff ${new Date(h.mtime).toLocaleString('pt-BR')}: "${objetivo}". Se o usuário quiser continuar de onde parou, use rubi_ultimo_handoff.`;
      }
      t += ' Antes de reexplorar o código, procure com rubi_buscar.';
      partes.push(t);
    }
  }
  if (partes.length) responder('SessionStart', { additionalContext: partes.join('\n\n') });
}

// UserPromptSubmit e PostToolUse: mede o contexto e pede o handoff antes da compactação.
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
    msg += ' Salve AGORA um handoff com a skill "handoff" (ferramenta rubi_salvar_handoff): objetivo, estado atual, decisões, arquivos-chave e próximo passo. Faça isso sem parar pra perguntar ao usuário e depois siga o trabalho normalmente.';
  }
  if (!cfg.compactaSozinho) {
    msg += ` A compactação automática cedo não está ligada: depois do handoff, sugira ao usuário rodar /compact (ou /clear — o handoff volta sozinho na janela nova).`;
  } else {
    msg += ' A conversa vai ser compactada automaticamente logo e o handoff volta pra você em seguida.';
  }
  salvarEstado(e.session_id, { ...estado, avisado: true, proximoAviso: ctx + cfg.janela * 0.5 });
  responder(e.hook_event_name, { additionalContext: msg });
}

// PreCompact: salva no vault o registro objetivo do trecho que vai sumir.
function preCompactar(e) {
  if (!e.transcript_path) return;
  const projeto = nomeProjeto(e.cwd);
  const r = registroSessao(e.transcript_path);
  const caminho = salvarSessao(projeto, registroEmMarkdown(r), e.session_id);
  const estado = lerEstado(e.session_id);
  salvarEstado(e.session_id, { ...estado, ultimoRegistro: caminho });
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

const ACOES = { inicio, medidor, 'pre-compactar': preCompactar, guarda };

try {
  const entrada = fs.readFileSync(0, 'utf8');
  const e = entrada.trim() ? JSON.parse(entrada) : {};
  e.session_id ||= 'sem-sessao';
  fs.mkdirSync(raizVault(), { recursive: true });
  ACOES[process.argv[2]]?.(e);
} catch (err) {
  if (process.env.RUBI_DEBUG) console.error(err);
}
process.exit(0);
