#!/usr/bin/env node
// Atualiza o mapa do código e o mapa.md de um projeto. Uso: node indexar.mjs [pasta]
// O hook de início roda isto em segundo plano; também dá pra rodar na mão.

import path from 'node:path';
import { raizProjeto, nomeProjeto } from './lib/config.mjs';
import { atualizarIndice } from './lib/mapa.mjs';

const raiz = raizProjeto(process.argv[2] || process.cwd());
if (!raiz) { console.error('Rode dentro de um projeto (não na pasta home).'); process.exit(1); }
const t = Date.now();
const codigo = atualizarIndice(path.join(raiz, '.rubi'), raiz, { projeto: nomeProjeto(raiz) });
console.log(`${Object.keys(codigo.arquivos).length} arquivos, ${Object.keys(codigo.modulos).length} módulos em ${Date.now() - t}ms → ${path.join(raiz, '.rubi', 'mapa.md')}`);
