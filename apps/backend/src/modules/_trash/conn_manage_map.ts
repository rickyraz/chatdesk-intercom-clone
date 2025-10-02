// State management di luar - global variables (kotor tapi jalan)
const connections = new Map<string, any>()
const messageQueues = new Map<string, any[]>()
const processingFlags = new Map<string, boolean>()

// Helper functions
export async function processQueue(wsId: string) {
    processingFlags.set(wsId, true)
    const queue = messageQueues.get(wsId)
    const ws = connections.get(wsId)

    while (queue && queue.length > 0) {
        const msg = queue.shift()

        try {
            const response = {
                echo: msg,
                server: 'Elysia',
                timestamp: Date.now(),
                clientId: wsId
            }

            ws.send(JSON.stringify(response))

        } catch (e) {
            console.error('Processing failed:', e)
        }

        await new Promise(r => setTimeout(r, 100))
    }

    processingFlags.set(wsId, false)
}

