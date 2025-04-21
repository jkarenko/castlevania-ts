import { defineConfig } from 'vite';
import ViteRestart from 'vite-plugin-restart';

export default defineConfig({
    base: './',
    plugins: [
        ViteRestart({
            reload: [
                'assets/sprites/player/player.png',
                'assets/sprites/player/player.json'
            ]
        })
    ],
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    phaser: ['phaser']
                }
            }
        },
    },
    server: {
        port: 8080,
    }
});
