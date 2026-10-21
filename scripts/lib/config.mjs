// Configuração compartilhada: onde fica o vault, o estado e os limites.
// Ordem de prioridade: variável de ambiente > ~/.rubi/config.json > padrão.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export const HOME_MEMORIA = process.env.RUBI_HOME || path.join(os.homedir(), '.rubi');
export const ARQ_CONFIG = path.join(HOME_MEMORIA, 'config.json');

const PADRAO = {
  vault: path.join(os.homedir(), 'rubi-vault'),
  janela: 150000, // tokens em que a sessão deve compactar
  avisoPct: 0.8, // a partir de quanto da janela o medidor pede o handoff
  guarda: { ativa: true, maxLinhas: 800, maxBytes: 80000 },
  colheita: true, // no fim de uma resposta que explorou o código, pede pra registrar o que aprendeu
  colheitaMin: 10, // quantas leituras/buscas sem registro disparam a colheita (benchmark: abaixo disso não compensa)
  lembranca: true, // a cada pedido, injeta o conhecimento relevante do grafo
  lembrancaOrcamento: 700, // tokens no máximo
  grafoAutomatico: true, // comentários do topo, resumo automático dos módulos e co-mudança no git, sem IA
  // saída de comando grande: ficam o começo e o fim, o meio vai pra um arquivo. Desligado por padrão: com a compactação
  // em 150k a economia medida foi ~0,8% e some se 1 em cada 6 cortes obrigar o agente a buscar o meio (bench/saidas.mjs).
  corte: { ativo: false, maxChars: 6000, cabeca: 1500, cauda: 3000 },
};

export function lerConfig() {
  let arq = {};
  try { arq = JSON.parse(fs.readFileSync(ARQ_CONFIG, 'utf8')); } catch {}
  const c = { ...PADRAO, ...arq, guarda: { ...PADRAO.guarda, ...(arq.guarda || {}) }, corte: { ...PADRAO.corte, ...(arq.corte || {}) } };
  // o Claude Desktop pode passar a variável vazia ou sem substituir ("${user_config.vault}") quando o campo fica em branco
  const v = process.env.RUBI_VAULT;
  if (v && !v.includes('${')) c.vault = v;
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

// Raiz do projeto: a pasta raiz do git, senão a pasta atual. Na home não há projeto (null).
export function raizProjeto(dir = process.env.RUBI_PROJECT_DIR || process.env.CLAUDE_PROJECT_DIR || process.cwd()) {
  const d = path.resolve(dir);
  if (d === path.resolve(os.homedir())) return null;
  for (let atual = d; ; ) {
    if (fs.existsSync(path.join(atual, '.git'))) return atual;
    const pai = path.dirname(atual);
    if (pai === atual) return d;
    atual = pai;
  }
}

export function nomeProjeto(dir) {
  const r = raizProjeto(dir);
  return r ? path.basename(r).replace(/[\\/:*?"<>|#^[\]]/g, '-').trim() || '_geral' : '_geral';
}
