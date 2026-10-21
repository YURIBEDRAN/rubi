// Do que é feito o contexto fixo: o que já está na conversa antes da primeira mensagem
// (prompt do sistema, definições de ferramentas, servidores MCP, skills, arquivos de instrução).
// Ele é relido em toda chamada, então cada 1k tokens dele pesa na sessão inteira.
// O Claude Code grava uma cópia disso no transcript (anexos prompt_snapshot, skill_listing etc.).

// Tokens estimados por caractere. Calibrado com o Claude Code 2.1.280: tirar a ferramenta Workflow
// (8,9k caracteres em JSON) baixou o contexto em 1.479 tokens, ou seja, ~6 caracteres por token.
const POR_TOKEN_TEXTO = 3.5;
const POR_TOKEN_JSON = 6;
const servidor = (nome) => nome.split('__')[1] || nome;

// anexos: os registros `attachment` do início de um transcript, antes da primeira resposta.
export function partesDoFixo(anexos) {
  const partes = new Map();
  const add = (chave, tipo, tokens, uso) => {
    const p = partes.get(chave) || { chave, tipo, tokens: 0, uso };
    p.tokens += tokens;
    partes.set(chave, p);
  };
  // um transcript pode ter mais de uma cópia do prompt; vale a última antes da primeira resposta
  const snap = anexos.filter((a) => a.type === 'prompt_snapshot' && a.tools).at(-1);
  if (snap) {
    const sp = Array.isArray(snap.systemPrompt) ? snap.systemPrompt.join('') : String(snap.systemPrompt || '');
    add('prompt do sistema', 'sistema', sp.length / POR_TOKEN_TEXTO);
    for (const t of snap.tools) {
      const tok = JSON.stringify(t).length / POR_TOKEN_JSON;
      if (t.name.startsWith('mcp__')) add(`MCP ${servidor(t.name)} (ferramentas carregadas)`, 'mcp', tok, { mcp: servidor(t.name) });
      else add(`ferramenta ${t.name}`, 'ferramenta', tok, { ferramenta: t.name });
    }
  }
  for (const a of anexos) {
    if (a.type === 'deferred_tools_delta') {
      (a.addedNames || []).forEach((n, i) => {
        const tok = String(a.addedLines?.[i] ?? n).length / POR_TOKEN_TEXTO + 1;
        if (n.startsWith('mcp__')) add(`MCP ${servidor(n)} (nomes das ferramentas)`, 'mcp', tok, { mcp: servidor(n) });
        else add('nomes das ferramentas nativas adiadas', 'sistema', tok);
      });
    } else if (a.type === 'mcp_instructions_delta') {
      (a.addedNames || []).forEach((n, i) => add(`MCP ${n} (instruções)`, 'mcp', String(a.addedBlocks?.[i] || '').length / POR_TOKEN_TEXTO, { mcpNome: n }));
    } else if (a.type === 'skill_listing' && a.content) {
      for (const l of String(a.content).split(/\n(?=- )/)) {
        const nome = l.replace(/^- /, '').split(': ')[0].trim();
        const plugin = nome.includes(':') ? nome.split(':')[0] : null;
        add(plugin ? `skills do plugin ${plugin}` : 'skills sem plugin (pessoais ou de plugins antigos)', 'skills', l.length / POR_TOKEN_TEXTO, plugin ? { plugin } : { skillsSoltas: true });
      }
    } else if (a.type === 'agent_listing_delta') {
      add('lista de subagentes', 'sistema', (a.addedLines || []).join('\n').length / POR_TOKEN_TEXTO);
    } else if (a.type === 'instructions') {
      for (const f of a.files || []) {
        const nome = String(f.path || '').replace(/\\/g, '/').split('/').slice(-2).join('/');
        add(`arquivo ${nome}`, 'instrucoes', String(f.content || '').length / POR_TOKEN_TEXTO);
      }
    }
  }
  return [...partes.values()];
}

// Junta várias sessões: tokens médios quando aparece e em quantas sessões aparece.
export function somarPartes(listas) {
  const soma = new Map();
  for (const lista of listas) for (const p of lista) {
    const s = soma.get(p.chave) || { ...p, tokens: 0, sessoes: 0 };
    s.tokens += p.tokens; s.sessoes++;
    soma.set(p.chave, s);
  }
  return [...soma.values()].map((s) => ({ ...s, tokens: s.tokens / s.sessoes, presenca: s.sessoes / listas.length })).sort((a, b) => b.tokens - a.tokens);
}

// Quantas vezes aquilo foi usado no período (chamadas de ferramenta e de skill).
export function usoDe(parte, usos) {
  const u = parte.uso;
  if (!u) return null;
  if (u.ferramenta) return usos.get(u.ferramenta) || 0;
  if (u.mcp) return [...usos].filter(([n]) => n.startsWith(`mcp__${u.mcp}__`)).reduce((s, [, v]) => s + v, 0);
  if (u.mcpNome) {
    const alvo = u.mcpNome.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    return [...usos].filter(([n]) => n.startsWith('mcp__') && n.toLowerCase().includes(alvo)).reduce((s, [, v]) => s + v, 0);
  }
  if (u.plugin) return [...usos].filter(([n]) => n.startsWith(`skill:${u.plugin}:`)).reduce((s, [, v]) => s + v, 0);
  if (u.skillsSoltas) return [...usos].filter(([n]) => n.startsWith('skill:') && !n.slice(6).includes(':')).reduce((s, [, v]) => s + v, 0);
  return null;
}

export function comoTirar(parte) {
  if (parte.tipo === 'ferramenta') return `negar no projeto: .claude/settings.json -> "permissions": { "deny": ["${parte.uso.ferramenta}"] }`;
  if (parte.tipo === 'mcp') return 'desligar o servidor nos projetos que não usam (/mcp) ou remover o conector';
  if (parte.tipo === 'skills') return 'desativar o plugin que não usa (/plugin)';
  if (parte.tipo === 'instrucoes') return 'enxugar com /rubi:organizar';
  return 'parte do Claude Code, não dá pra tirar';
}
