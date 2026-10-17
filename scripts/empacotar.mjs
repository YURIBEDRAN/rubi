#!/usr/bin/env node
// Gera os pacotes do app em dist/:
//   memoria-claude.mcpb   extensão do Claude Desktop (servidor MCP local)
//   memoria-continua.zip  skill pra subir no claude.ai (Configurações > Capacidades > Skills)

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(RAIZ, 'dist');
const DESK = path.join(DIST, 'desktop');
fs.rmSync(DESK, { recursive: true, force: true });
fs.mkdirSync(path.join(DESK, 'server', 'lib'), { recursive: true });

fs.copyFileSync(path.join(RAIZ, 'app', 'desktop', 'manifest.json'), path.join(DESK, 'manifest.json'));
fs.copyFileSync(path.join(RAIZ, 'scripts', 'mcp-server.mjs'), path.join(DESK, 'server', 'mcp-server.mjs'));
for (const f of fs.readdirSync(path.join(RAIZ, 'scripts', 'lib'))) {
  fs.copyFileSync(path.join(RAIZ, 'scripts', 'lib', f), path.join(DESK, 'server', 'lib', f));
}
execSync(`npx -y @anthropic-ai/mcpb pack "${DESK}" "${path.join(DIST, 'memoria-claude.mcpb')}"`, { stdio: 'inherit' });

const zip = path.join(DIST, 'memoria-continua.zip');
fs.rmSync(zip, { force: true });
const pastaSkill = path.join(RAIZ, 'app', 'claude-ai');
// No Windows usa o tar do sistema (o do Git Bash não gera zip).
const tarWin = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe');
execSync(process.platform === 'win32' ? `"${tarWin}" -a -c -f "${zip}" memoria-continua` : `zip -r "${zip}" memoria-continua`, { cwd: pastaSkill, stdio: 'inherit' });
console.log(`\nPronto:\n  ${path.join(DIST, 'memoria-claude.mcpb')}\n  ${zip}`);
