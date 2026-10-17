// Configuração compartilhada: onde fica o vault, o estado e os limites.
// Ordem de prioridade: variável de ambiente > ~/.memoria-claude/config.json > padrão.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export const HOME_MEMORIA = process.env.MEMORIA_HOME || path.join(os.homedir(), '.memoria-claude');
export const ARQ_CONFIG = path.join(HOME_MEMORIA, 'config.json');

const PADRAO = {
  vault: path.join(os.homedir(), 'memoria-claude-vault'),
  janela: 150000, // tokens em que a sessão deve compactar
  avisoPct: 0.8, // a partir de quanto da janela o medidor pede o handoff
  guarda: { ativa: true, maxLinhas: 800, maxBytes: 80000 },
};

export function lerConfig() {
  let arq = {};
  try { arq = JSON.parse(fs.readFileSync(ARQ_CONFIG, 'utf8')); } catch {}
  const c = { ...PADRAO, ...arq, guarda: { ...PADRAO.guarda, ...(arq.guarda || {}) } };
  if (process.env.MEMORIA_VAULT) c.vault = process.env.MEMORIA_VAULT;
  const janelaEnv = Number(process.env.CLAUDE_CODE_AUTO_COMPACT_WINDOW);
  if (janelaEnv > 0) c.janela = janelaEnv;
  c.compactaSozinho = janelaEnv > 0;
  return c;
}

export function salvarConfig(parcial) {
  fs.mkdirSync(HOME_MEMORIA, { recursive: true });
  let atual = {};
  try { atual = JSON.parse(fs.readFileSync(ARQ_CONFIG, 'utf8')); } catch {}
  fs.writeFileSync(ARQ_CONFIG, JSON.stringify({ ...atual, ...parcial }, null, 2));
}

// Estado por sessão (o que o medidor já avisou, o que a guarda já barrou).
const DIR_ESTADO = path.join(HOME_MEMORIA, 'estado');

export function lerEstado(sessao) {
  try { return JSON.parse(fs.readFileSync(path.join(DIR_ESTADO, `${sessao}.json`), 'utf8')); } catch { return {}; }
}

export function salvarEstado(sessao, estado) {
  fs.mkdirSync(DIR_ESTADO, { recursive: true });
  fs.writeFileSync(path.join(DIR_ESTADO, `${sessao}.json`), JSON.stringify(estado));
}

// Nome do projeto: pasta raiz do git, senão a pasta atual. A home vira "_geral".
export function nomeProjeto(dir = process.env.CLAUDE_PROJECT_DIR || process.cwd()) {
  let d = path.resolve(dir);
  if (d === path.resolve(os.homedir())) return '_geral';
  for (let atual = d; ; ) {
    if (fs.existsSync(path.join(atual, '.git'))) { d = atual; break; }
    const pai = path.dirname(atual);
    if (pai === atual) break;
    atual = pai;
  }
  return path.basename(d).replace(/[\\/:*?"<>|#^[\]]/g, '-').trim() || '_geral';
}
