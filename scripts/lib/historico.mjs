// Arquivos que mudam juntos no git (acoplamento lógico; Gall et al., 1998; Zimmermann et al., 2004).
// Viram arestas do grafo sem gastar token: quem mexe em A quase sempre mexe em B, mesmo sem import entre eles
// (teste e código, rota e tela, migração e modelo).

import { execFileSync } from 'node:child_process';

const git = (raiz, args) => execFileSync('git', args, { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true });

export function cabecaGit(raiz) {
  try { return git(raiz, ['rev-parse', 'HEAD']).trim(); } catch { return null; }
}

// pares: [a, b, confiança], confiança = commits juntos / (commits do menos alterado + 1), o +1 segura pares vistos poucas vezes
export function coMudancas(raiz, conhecidos, { commits = 400, maxPorCommit = 25, minJuntos = 2, maxPares = 3000 } = {}) {
  let log;
  try { log = git(raiz, ['log', `-n${commits}`, '--no-merges', '--relative', '--name-only', '--format=format:@@']); } catch { return []; }
  const vezes = new Map(), juntos = new Map();
  for (const bloco of log.split('@@')) {
    const fs = [...new Set(bloco.split('\n').map((s) => s.trim()).filter((f) => f && conhecidos.has(f)))].sort();
    if (!fs.length) continue;
    for (const f of fs) vezes.set(f, (vezes.get(f) || 0) + 1);
    if (fs.length < 2 || fs.length > maxPorCommit) continue; // commit gigante (formatação, renomeação) não diz nada
    for (let i = 0; i < fs.length; i++) for (let j = i + 1; j < fs.length; j++) {
      const k = `${fs[i]}\0${fs[j]}`;
      juntos.set(k, (juntos.get(k) || 0) + 1);
    }
  }
  const pares = [];
  for (const [k, n] of juntos) {
    if (n < minJuntos) continue;
    const [a, b] = k.split('\0');
    pares.push([a, b, Math.round((n / (Math.min(vezes.get(a), vezes.get(b)) + 1)) * 100) / 100]);
  }
  return pares.sort((x, y) => y[2] - x[2]).slice(0, maxPares);
}
