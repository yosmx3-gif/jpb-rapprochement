import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
       '@': path.resolve(__dirname, '.'),
       // jacques '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    // jacques server: {
    // jacques  // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // jacques  // Do not modify—file watching is disabled to prevent flickering during agent edits.
    // jacques  hmr: process.env.DISABLE_HMR !== 'true',
    // jacques  // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
    // jacques  watch: process.env.DISABLE_HMR === 'true' ? null : {},
    // jacques},

    // debut ajouter par jacques seconde version
    server: {
      hmr: false,
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    // debut ajouter par jacques seconde version

    // debut ajouter par jacques première version
    // jacques server: {
    // jacques   // jacques port: 3000,
    // jacques   port: 8080,
    // jacques   host: true,
    // jacques   // jacques allowedHosts: true,
    // jacques   allowedHosts: ['.cloudshell.dev'],
    // jacques   // Force le protocole HTTPS sécurisé officiel de Google Cloud Shell
    // jacques   hmr: {
    // jacques     clientPort: 443,
    // jacques   },
    // jacques   // Ajoute la redirection pour que l'interface puisse parler au serveur
    // jacques   proxy: {
    // jacques     '/api': {
    // jacques       target: 'http://localhost:3000',
    // jacques       changeOrigin: true,
    // jacques       secure: false,
    // jacques     }
    // jacques   },
    // jacques   // Conserve la désactivation du scan de fichiers pour économiser le processeur
    // jacques   watch: process.env.DISABLE_HMR === 'true' ? null : {},
    // jacques },
    // fin ajouter par jacques seconde version
  };

});
