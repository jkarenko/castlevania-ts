#!/usr/bin/env node
import { spawn } from 'cross-spawn';
import path from 'node:path';
import chokidar from 'chokidar';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

// CONFIG FOR TILESET
const ASEPRITE = process.env.ASEPRITE_BIN || 'aseprite';
const FLAGS = [
    '--batch',
    '--sheet-type', 'grid', // Use grid for predictable tile layout
    '--split-tiles', // Keep this for individual tile data
    '--tile-width', '16',
    '--tile-height', '16',
    '--format', 'json-hash', // Still using json-hash
    '--trim', // Keep trim
    '--ignore-empty', // Ignore empty tiles if any
    '--border-padding', '0', // Usually 0 for grid tilesets
    '--shape-padding', '0', // Usually 0 for grid tilesets
    '--inner-padding', '0'  // Usually 0 for grid tilesets
];

// WATCHER
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const GLOB = `${ROOT}/assets/sprites/tiles/tiles.aseprite`;

console.log(`🔎  Watching tileset ${GLOB} …`);
chokidar.watch(GLOB, {
    ignoreInitial: false,
    awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 50
    }
})
    .on('add', file => exportTileset(file, 'added'))
    .on('change', file => exportTileset(file, 'changed'))
    .on('unlink', file => console.log('🗑️  removed tileset', file))
    .on('all', (event, file) => console.log('[TILES DEBUG]', event, file));

function exportTileset(file, evt) {
    const dir = path.dirname(file);
    const base = path.basename(file, '.aseprite');
    const png = path.join(dir, `${base}.png`);
    const json = path.join(dir, `${base}.json`);

    // Construct the command for tileset export
    const cmd = [ASEPRITE, '-b', file, '--sheet', png, '--data', json, ...FLAGS];

    console.log(`🖼️  ${evt}: ${file} → tileset`);
    spawn(cmd[0], cmd.slice(1), { stdio: 'inherit' })
        .on('error', e => console.error('⚠️  Aseprite tileset error:', e.message));
} 
