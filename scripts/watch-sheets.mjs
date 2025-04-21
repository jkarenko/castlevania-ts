#!/usr/bin/env node
import { spawn } from 'cross-spawn';
import path from 'node:path';
import chokidar from 'chokidar';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

// CONFIG
const ASEPRITE = process.env.ASEPRITE_BIN || 'aseprite';
const FLAGS = [
    '--batch',
    '--sheet-type', 'rows',
    '--format', 'json-array',
    '--list-tags',
    '--trim',
    '--shape-padding', '2'
];

// WATCHER
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const GLOBS = [
    `${ROOT}/assets/sprites/player/player.aseprite`,
    // `${ROOT}/assets/sprites/tiles/tiles.aseprite` // Removed, handled by watch-tiles.mjs
];


console.log(`🔎  Watching ${GLOBS.filter(g => !g.startsWith('//')).length} animation pattern(s) …`);
chokidar.watch(GLOBS.filter(g => !g.startsWith('//')), {
    ignoreInitial: false,
    awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 50
    }
})
    .on('add', file => exportSheet(file, 'added'))
    .on('change', file => exportSheet(file, 'changed'))
    .on('unlink', file => console.log('🗑️  removed sheet', file))
    .on('all', (event, file) => console.log('[SHEETS DEBUG]', event, file));

function exportSheet(file, evt) {
    const dir = path.dirname(file);
    const base = path.basename(file, '.aseprite');
    const png = path.join(dir, `${base}.png`);
    const json = path.join(dir, `${base}.json`);

    const cmd = [ASEPRITE, '-b', file, '--sheet', png, '--data', json, ...FLAGS];
    console.log(`🎨  ${evt}: ${file} → sheet`);
    spawn(cmd[0], cmd.slice(1), { stdio: 'inherit' })
        .on('error', e => console.error('⚠️  Aseprite sheet error:', e.message));
}
