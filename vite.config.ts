import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// Two build targets share this config:
//   - library (default `vite build`): ES module for hosts that consume the
//     editor as a package (the platform webapp). Peer/shared deps stay
//     external so the host owns a single copy.
//   - standalone SPA (a later slice, TARGET=spa): bundles everything, plus an
//     index.html entry, so the tiny CLI can go:embed a self-contained app.
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./src', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: () => 'editor.js',
      cssFileName: 'editor',
    },
    rollupOptions: {
      // Consumers provide these — one shared copy, no duplicate Vue.
      external: [
        'vue',
        'pinia',
        '@heroicons/vue',
        '@heroicons/vue/24/outline',
        '@heroicons/vue/24/solid',
        '@vue-flow/core',
        '@vue-flow/controls',
        '@vueuse/core',
        '@bufbuild/protobuf',
        'js-base64',
        'lodash',
        'vue-json-pretty',
        '@guolao/vue-monaco-editor',
      ],
    },
  },
})
