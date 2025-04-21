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
const GLOB = `${ROOT}/assets/sprites/player/player.aseprite`;

console.log(`🔎  Watching ${GLOB} …`);
chokidar.watch(GLOB, {
    ignoreInitial: false,
    awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 50
    }
})
    .on('add', file => exportSheet(file, 'added'))
    .on('change', file => exportSheet(file, 'changed'))
    .on('unlink', file => console.log('🗑️  removed', file))
    .on('all', (event, file) => console.log('[DEBUG]', event, file));

function exportSheet(file, evt) {
    const dir = path.dirname(file);
    const base = path.basename(file, '.aseprite');
    const png = path.join(dir, `${base}.png`);
    const json = path.join(dir, `${base}.json`);

    const cmd = [ASEPRITE, '-b', file, '--sheet', png, '--data', json, ...FLAGS];
    console.log(`🎨  ${evt}: ${file} → sheet`);
    spawn(cmd[0], cmd.slice(1), { stdio: 'inherit' })
        .on('error', e => console.error('⚠️  Aseprite error:', e.message));
}
