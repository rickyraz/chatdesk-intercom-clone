import { createSignal, onCleanup, For } from 'solid-js'

interface ServerConfig {
    name: string
    port: number
    color: string
    emoji: string
}

const servers: ServerConfig[] = [
    { name: 'Elysia', port: 3000, color: '#8b5cf6', emoji: '🦊' },
    { name: 'Hono', port: 3001, color: '#f97316', emoji: '🔥' }
]

interface ConnectionState {
    socket: WebSocket | null
    connected: boolean
    messages: string[]
    error: string
}

const WebSocketComparison = () => {
    const [connections, setConnections] = createSignal<Record<string, ConnectionState>>({
        Elysia: { socket: null, connected: false, messages: [], error: '' },
        Hono: { socket: null, connected: false, messages: [], error: '' }
    })

    const [messageInputs, setMessageInputs] = createSignal<Record<string, string>>({
        Elysia: '',
        Hono: ''
    })

    const connectToServer = (serverName: string, port: number) => {
        const ws = new WebSocket(`ws://localhost:${port}/ws`)

        ws.onopen = () => {
            console.log(`🟢 ${serverName}: Connected to server`)
            setConnections(prev => ({
                ...prev,
                [serverName]: { ...prev[serverName], socket: ws, connected: true, error: '' }
            }))
        }

        ws.onmessage = (event) => {
            const timestamp = new Date().toLocaleTimeString()
            const messageWithTime = `[${timestamp}] ${event.data}`

            setConnections(prev => ({
                ...prev,
                [serverName]: {
                    ...prev[serverName],
                    messages: [...prev[serverName].messages, messageWithTime]
                }
            }))
        }

        ws.onclose = () => {
            console.log(`🔴 ${serverName}: Disconnected from server`)
            setConnections(prev => ({
                ...prev,
                [serverName]: { ...prev[serverName], socket: null, connected: false }
            }))
        }

        ws.onerror = (event) => {
            console.error(`❌ ${serverName}: WebSocket error:`, event)
            setConnections(prev => ({
                ...prev,
                [serverName]: { ...prev[serverName], error: 'Connection failed or lost' }
            }))
        }
    }

    const disconnectFromServer = (serverName: string) => {
        const connection = connections()[serverName]
        if (connection.socket) {
            connection.socket.close()
        }
    }

    const sendMessage = (serverName: string) => {
        const connection = connections()[serverName]
        const message = messageInputs()[serverName].trim()

        if (connection.socket && connection.connected && message) {
            connection.socket.send(message)
            setMessageInputs(prev => ({ ...prev, [serverName]: '' }))
        }
    }

    const sendTestMessage = (serverName: string, testMessage: string) => {
        const connection = connections()[serverName]
        if (connection.socket && connection.connected) {
            connection.socket.send(testMessage)
        }
    }

    const clearMessages = (serverName: string) => {
        setConnections(prev => ({
            ...prev,
            [serverName]: { ...prev[serverName], messages: [] }
        }))
    }

    const connectAll = () => {
        servers.forEach(server => {
            connectToServer(server.name, server.port)
        })
    }

    const disconnectAll = () => {
        servers.forEach(server => {
            disconnectFromServer(server.name)
        })
    }

    onCleanup(() => {
        Object.values(connections()).forEach(connection => {
            connection.socket?.close()
        })
    })

    return (
        <div style={{ padding: '20px', 'font-family': 'monospace' }}>
            <h1>🆚 WebSocket Framework Comparison</h1>
            <p>Testing Elysia vs Hono WebSocket implementations side by side</p>

            {/* Global Controls */}
            <div style={{
                margin: '20px 0',
                padding: '15px',
                'background-color': '#2d2d2d',
                'border-radius': '8px'
            }}>
                <h3>🎮 Global Controls</h3>
                <button
                    onClick={connectAll}
                    style={{
                        margin: '5px',
                        padding: '8px 16px',
                        'background-color': '#16a34a',
                        color: 'white',
                        border: 'none',
                        'border-radius': '4px',
                        cursor: 'pointer'
                    }}
                >
                    Connect All
                </button>
                <button
                    onClick={disconnectAll}
                    style={{
                        margin: '5px',
                        padding: '8px 16px',
                        'background-color': '#dc2626',
                        color: 'white',
                        border: 'none',
                        'border-radius': '4px',
                        cursor: 'pointer'
                    }}
                >
                    Disconnect All
                </button>
            </div>

            {/* Server Sections */}
            <div style={{
                display: 'grid',
                'grid-template-columns': '1fr 1fr',
                gap: '20px',
                'max-width': '1400px'
            }}>
                <For each={servers}>
                    {(server) => {
                        const connection = () => connections()[server.name]
                        const messageInput = () => messageInputs()[server.name]

                        return (
                            <div style={{
                                'background-color': '#2d2d2d',
                                'border-radius': '8px',
                                padding: '20px',
                                border: `2px solid ${server.color}`
                            }}>
                                <h2 style={{
                                    'margin-top': '0',
                                    display: 'flex',
                                    'align-items': 'center',
                                    gap: '10px'
                                }}>
                                    {server.emoji} {server.name} WebSocket (Port {server.port})
                                    <span style={{
                                        padding: '4px 8px',
                                        'border-radius': '4px',
                                        'font-size': '12px',
                                        'font-weight': 'bold',
                                        'background-color': connection().connected ? '#16a34a' : '#dc2626',
                                        color: 'white'
                                    }}>
                                        {connection().connected ? 'CONNECTED' : 'DISCONNECTED'}
                                    </span>
                                </h2>

                                {/* Error Display */}
                                {connection().error && (
                                    <div style={{
                                        color: 'red',
                                        'background-color': '#ffebee',
                                        padding: '10px',
                                        'border-radius': '4px',
                                        margin: '10px 0'
                                    }}>
                                        ⚠️ {connection().error}
                                    </div>
                                )}

                                {/* Connection Controls */}
                                <div style={{ margin: '15px 0', display: 'flex', gap: '10px', 'flex-wrap': 'wrap' }}>
                                    <button
                                        onClick={() => connectToServer(server.name, server.port)}
                                        disabled={connection().connected}
                                        style={{
                                            padding: '8px 16px',
                                            'background-color': connection().connected ? '#6b7280' : '#4f46e5',
                                            color: 'white',
                                            border: 'none',
                                            'border-radius': '4px',
                                            cursor: connection().connected ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        Connect
                                    </button>
                                    <button
                                        onClick={() => disconnectFromServer(server.name)}
                                        disabled={!connection().connected}
                                        style={{
                                            padding: '8px 16px',
                                            'background-color': !connection().connected ? '#6b7280' : '#dc2626',
                                            color: 'white',
                                            border: 'none',
                                            'border-radius': '4px',
                                            cursor: !connection().connected ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        Disconnect
                                    </button>
                                </div>

                                {/* Message Input */}
                                <div style={{ margin: '15px 0', display: 'flex', gap: '10px' }}>
                                    <input
                                        type="text"
                                        value={messageInput()}
                                        onInput={(e) => setMessageInputs(prev => ({
                                            ...prev,
                                            [server.name]: e.currentTarget.value
                                        }))}
                                        onKeyPress={(e) => e.key === 'Enter' && sendMessage(server.name)}
                                        placeholder="Enter message..."
                                        disabled={!connection().connected}
                                        style={{
                                            padding: '8px',
                                            border: '1px solid #555',
                                            'border-radius': '4px',
                                            'background-color': '#1a1a1a',
                                            color: 'white',
                                            flex: '1',
                                            'min-width': '200px'
                                        }}
                                    />
                                    <button
                                        onClick={() => sendMessage(server.name)}
                                        disabled={!connection().connected}
                                        style={{
                                            padding: '8px 16px',
                                            'background-color': !connection().connected ? '#6b7280' : '#4f46e5',
                                            color: 'white',
                                            border: 'none',
                                            'border-radius': '4px',
                                            cursor: !connection().connected ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        Send
                                    </button>
                                </div>

                                {/* Test Buttons */}
                                <div style={{ margin: '15px 0', display: 'flex', gap: '10px', 'flex-wrap': 'wrap' }}>
                                    <button
                                        onClick={() => sendTestMessage(server.name, `Hello ${server.name}!`)}
                                        disabled={!connection().connected}
                                        style={{
                                            padding: '6px 12px',
                                            'background-color': !connection().connected ? '#6b7280' : server.color,
                                            color: 'white',
                                            border: 'none',
                                            'border-radius': '4px',
                                            cursor: !connection().connected ? 'not-allowed' : 'pointer',
                                            'font-size': '12px'
                                        }}
                                    >
                                        Test String
                                    </button>
                                    <button
                                        onClick={() => sendTestMessage(server.name, JSON.stringify({ type: 'test', server: server.name, timestamp: Date.now() }))}
                                        disabled={!connection().connected}
                                        style={{
                                            padding: '6px 12px',
                                            'background-color': !connection().connected ? '#6b7280' : server.color,
                                            color: 'white',
                                            border: 'none',
                                            'border-radius': '4px',
                                            cursor: !connection().connected ? 'not-allowed' : 'pointer',
                                            'font-size': '12px'
                                        }}
                                    >
                                        Test JSON
                                    </button>
                                    <button
                                        onClick={() => clearMessages(server.name)}
                                        style={{
                                            padding: '6px 12px',
                                            'background-color': '#6b7280',
                                            color: 'white',
                                            border: 'none',
                                            'border-radius': '4px',
                                            cursor: 'pointer',
                                            'font-size': '12px'
                                        }}
                                    >
                                        Clear
                                    </button>
                                </div>

                                {/* Messages Log */}
                                <div>
                                    <h4>📝 Messages Log:</h4>
                                    <div style={{
                                        "color": "#ffff",
                                        'background-color': '#000',
                                        border: '1px solid #333',
                                        'border-radius': '4px',
                                        padding: '10px',
                                        height: '300px',
                                        'overflow-y': 'auto',
                                        'font-size': '12px',
                                        'white-space': 'pre-wrap'
                                    }}>
                                        <For each={connection().messages}>
                                            {(message) => <div>{message}</div>}
                                        </For>
                                        {connection().messages.length === 0 && (
                                            <div style={{ color: '#666' }}>No messages yet...</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    }}
                </For>
            </div>

            {/* Comparison Notes */}
            <div style={{
                "color": "#ffff",
                'grid-column': '1 / -1',
                'background-color': '#2d2d2d',
                'border-radius': '8px',
                padding: '20px',
                'margin-top': '20px'
            }}>
                <h3>📊 What to Compare</h3>
                <ul style={{ 'line-height': '1.6' }}>
                    <li><strong>Elysia (Port 3000):</strong> Uses parse() hook for each message + lifecycle events</li>
                    <li><strong>Hono (Port 3001):</strong> Uses straightforward onMessage event handlers</li>
                    <li><strong>Check Server Console:</strong> Watch when hooks execute and how they handle messages</li>
                    <li><strong>Performance:</strong> Send rapid messages to both and compare responsiveness</li>
                    <li><strong>Error Handling:</strong> Try invalid JSON and see how each framework handles it</li>
                    <li><strong>Documentation Accuracy:</strong> Compare actual behavior vs what docs claim</li>
                </ul>
            </div>
        </div>
    )
}

export default WebSocketComparison