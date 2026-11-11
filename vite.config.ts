import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
       //jacques studio '@': path.resolve(import.meta.dirname, '.'),
       '@': path.resolve(__dirname, '.'),
       // jacques '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    //jacques studio server: {
    //jacques studio  hmr: process.env.DISABLE_HMR !== 'true',
    //jacques studio  watch: process.env.DISABLE_HMR === 'true' ? null : {},
    //jacques studio},
    // debut ajouter par jacques 3eme  version
    server: {
    port: 8080, // S'assure que Vite écoute sur le port par défaut de Cloud Shell
    allowedHosts: true as const, // Autorise l'URL générée par Cloud Shell
    hmr: {
      protocol: 'wss',
      clientPort: 443, // Force le client à passer par le port HTTPS sécurisé du cloud
    },
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
    // fin ajouter par jacques 3eme version
    // debut ajouter par jacques seconde version
    // jacques server: {
    // jacques   hmr: false,
    // jacques   watch: process.env.DISABLE_HMR === 'true' ? null : {},
    // jacques },
    // fin ajouter par jacques seconde version
  };
});
