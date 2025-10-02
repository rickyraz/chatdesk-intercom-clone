import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true, // <-- jangan auto pindah port
    host: "localhost",
  },
  plugins: [solid(), tailwindcss()],
})
