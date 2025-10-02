import { serve } from "bun"
import honoApp from "./hono-websocket"

console.log('🔥 Starting Hono WebSocket server...')

// ✅ Menggunakan export yang sudah include websocket handler
serve({
    port: honoApp.port,
    fetch: honoApp.fetch,
    websocket: honoApp.websocket, // Required untuk WebSocket di Bun
})

console.log(`🔥 Hono server is running at http://localhost:3001`)
console.log(`📡 WebSocket endpoint: ws://localhost:3001/ws`)
console.log(`🆚 Compare with Elysia at http://localhost:3000`)