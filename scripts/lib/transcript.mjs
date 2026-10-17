// Leitura dos transcripts .jsonl que o Claude Code grava em ~/.claude/projects.

import fs from 'node:fs';

// Tamanho do contexto na última chamada à API. Lê só o fim do arquivo, porque o hook roda toda hora.
export function contextoAtual(arquivo, bytes = 1 << 20) {
  let fd;
  try {
    fd = fs.openSync(arquivo, 'r');
    const tam = fs.fstatSync(fd).size;
    const ini = Math.max(0, tam - bytes);
    const buf = Buffer.alloc(tam - ini);
    fs.readSync(fd, buf, 0, buf.length, ini);
    const linhas = buf.toString('utf8').split('\n');
    for (let i = linhas.length - 1; i >= 0; i--) {
      const l = linhas[i];
      if (!l.includes('"usage"')) continue;
      let o; try { o = JSON.parse(l); } catch { continue; }
      const u = o.message?.usage;
      if (o.type !== 'assistant' || !u || o.isSidechain) continue;
      return (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
    }
  } catch {} finally { if (fd !== undefined) fs.closeSync(fd); }
  return 0;
}

const LIXO = /^<(command-|local-command|system-reminder|task-notification|bash-|user-memory)/;

function textoUsuario(m) {
  const c = m?.content;
  if (typeof c === 'string') return c;
  if (Array.isArray(c) && !c.some((b) => b.type === 'tool_result')) return c.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  return '';
}

const corta = (s, n) => (s.length > n ? s.slice(0, n) + '…' : s);

// Registro objetivo do trecho que vai ser compactado: o que o usuário pediu, o que foi mexido,
// o que foi rodado e a última coisa que o Claude disse. Sem LLM, só extração.
export function registroSessao(arquivo) {
  const linhas = fs.readFileSync(arquivo, 'utf8').split('\n');
  let inicio = 0;
  for (let i = linhas.length - 1; i >= 0; i--) if (linhas[i].includes('"compact_boundary"')) { inicio = i + 1; break; }

  const pedidos = [], arquivos = new Map(), comandos = [];
  let ultimaFala = '', cwd = '';
  for (const l of linhas.slice(inicio)) {
    if (!l) continue;
    let o; try { o = JSON.parse(l); } catch { continue; }
    if (o.isSidechain) continue;
    if (o.cwd) cwd = o.cwd;
    if (o.type === 'user' && !o.isMeta && !o.isCompactSummary) {
      const t = textoUsuario(o.message).trim();
      if (t && !LIXO.test(t)) pedidos.push(corta(t.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '').replace(/<\/?pasted_content[^>]*>/g, '').trim(), 600));
    }
    if (o.type === 'assistant' && Array.isArray(o.message?.content)) {
      for (const b of o.message.content) {
        if (b.type === 'text' && b.text.trim()) ultimaFala = b.text.trim();
        if (b.type !== 'tool_use') continue;
        const inp = b.input || {};
        if (['Edit', 'Write', 'NotebookEdit', 'MultiEdit'].includes(b.name) && inp.file_path) {
          arquivos.set(inp.file_path, (arquivos.get(inp.file_path) || 0) + 1);
        }
        if (b.name === 'Bash' && inp.command) comandos.push(corta(inp.description || inp.command.split('\n')[0], 140));
      }
    }
  }
  return { cwd, pedidos, arquivos: [...arquivos.entries()].sort((a, b) => b[1] - a[1]), comandos, ultimaFala };
}

export function registroEmMarkdown(r) {
  const lista = (itens) => (itens.length ? itens.map((i) => `- ${i}`).join('\n') : '- (nada)');
  return [
    `# Registro automático da sessão`,
    `Pasta: \`${r.cwd}\``,
    `## Pedidos do usuário (${r.pedidos.length})`,
    lista(r.pedidos.slice(-15).map((p) => p.replace(/\n+/g, ' / '))),
    `## Arquivos alterados (${r.arquivos.length})`,
    lista(r.arquivos.slice(0, 40).map(([f, n]) => `\`${f}\` (${n}x)`)),
    `## Comandos rodados (últimos ${Math.min(25, r.comandos.length)} de ${r.comandos.length})`,
    lista(r.comandos.slice(-25)),
    `## Última resposta antes da compactação`,
    corta(r.ultimaFala, 2500) || '(nenhuma)',
  ].join('\n\n');
}
