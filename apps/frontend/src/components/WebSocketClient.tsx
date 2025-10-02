// frontend/src/components/WebSocketClient.tsx
import { createSignal, onMount, onCleanup } from 'solid-js'

const WebSocketClient = () => {
    const [socket, setSocket] = createSignal<WebSocket | null>(null)
    const [message, setMessage] = createSignal('')
    const [messages, setMessages] = createSignal<string[]>([])
    const [connected, setConnected] = createSignal(false)

    const [error, setError] = createSignal('')

    onMount(() => {
        const ws = new WebSocket('ws://localhost:3000/ws')

        ws.onopen = () => {
            console.log('Connected to server')
            setConnected(true)
        }

        ws.onmessage = (event) => {
            setMessages(prev => [...prev, event.data])
        }

        ws.onclose = () => {
            console.log('Disconnected from server')
            setConnected(false)
        }

        ws.onerror = (event) => {
            console.error('WebSocket error:', event)
            setError('Connection failed or lost')
        }


        setSocket(ws)
    })

    onCleanup(() => {
        socket()?.close()
    })

    const sendMessage = () => {
        if (socket() && message().trim()) {
            socket()!.send(message())
            setMessage('')
        }
    }

    return (
        <div style={{ padding: '20px' }}>
            <h1>WebSocket Echo Test</h1>
            <p>Status: {connected() ? '🟢 Connected' : '🔴 Disconnected'}</p>

            {error() && (
                <p style={{ color: 'red', "background-color": '#ffebee', padding: '10px', "border-radius": '4px' }}>
                    ⚠️ {error()}
                </p>
            )}


            <div style={{ margin: '20px 0' }}>
                <input
                    type="text"
                    value={message()}
                    onInput={(e) => setMessage(e.currentTarget.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                />
                <button onClick={sendMessage} disabled={!connected()}>
                    Send
                </button>
            </div>

            <div>
                <h3>Messages:</h3>
                <ul>
                    {messages().map((msg,) => (
                        <li>{msg}</li>
                    ))}
                </ul>
            </div>
        </div>
    )
}

export default WebSocketClient