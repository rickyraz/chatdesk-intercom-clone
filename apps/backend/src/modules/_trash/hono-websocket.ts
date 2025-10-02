import { Hono } from 'hono'
import { upgradeWebSocket, websocket } from 'hono/bun'

const app = new Hono()

// State dan decorators seperti Elysia
const appState = {
    version: 4,
    akuadalah: "ricky"
}

const getDate = () => Date.now()

// HTTP routes
app.get('/', (c) => {
    return c.json({ hello: 'Hono' })
})

app.get('/user/:id', (c) => {
    const id = c.req.param('id')
    return c.text(`${id} ${appState.version} ${getDate()}`)
})

app.get('/version', (c) => {
    return c.text(`${appState.version} ${appState.akuadalah} ${getDate()}`)
})

app.post('/form', async (c) => {
    const body = await c.req.json()
    return c.json(body)
})

// WebSocket route dengan logging yang sama
app.get('/ws', upgradeWebSocket((c) => {
    console.log('🔄 HONO UPGRADE: Processing WebSocket upgrade')

    // Access headers saat upgrade
    const headers = c.req.header()
    console.log('   Headers available:', Object.keys(headers))
    console.log('   Origin:', headers.origin)
    console.log('   User-Agent:', headers['user-agent'])

    return {
        onOpen(event, ws) {
            console.log('✅ HONO WEBSOCKET CONNECTED')
            console.log(`   Event:`, event?.type || 'open')
            console.log(`   WebSocket ready state:`, ws.readyState)
            ws.send('Welcome to Hono WebSocket server!')
        },

        onMessage(event, ws) {
            const message = event.data

            console.log('📦 HONO MESSAGE RECEIVED')
            console.log(`   Raw message: ${message}`)
            console.log(`   Type: ${typeof message}`)

            // Parse JSON jika memungkinkan
            let parsedMessage
            if (typeof message === 'string') {
                try {
                    parsedMessage = JSON.parse(message)
                    console.log('   Parsed as JSON:', parsedMessage)
                } catch {
                    console.log('   Keeping as string')
                    parsedMessage = message
                }
            } else {
                parsedMessage = message
            }

            console.log('📨 HONO MESSAGE HANDLER')
            console.log(`   Processed data:`, parsedMessage)

            // Echo response
            ws.send(`Hono Echo: ${JSON.stringify(parsedMessage)}`)
        },

        onClose(event, ws) {
            console.log('❌ HONO WEBSOCKET DISCONNECTED')
            console.log(`   Code: ${event?.code}`)
            console.log(`   Code: ${event?.code}`)
            console.log(`   Reason: ${event?.reason}`)
            console.log(`   props: ${Object.keys(event)}`)
            console.log(`   isTrusted: ${event.isTrusted}`)
        },

        onError(event, ws) {
            console.log('💥 HONO WEBSOCKET ERROR')
            console.log(`   Error:`, event)
        }
    }
}))

console.log('🔥 Hono server starting on port 3001')

export default {
    port: 3001,
    fetch: app.fetch,
    websocket, // ✅ Required for Bun adapter
}