// src/components/WebSocketChat.tsx
import { createSignal, onMount, onCleanup, For, Show } from 'solid-js'

interface Message {
    from: string
    message: string
    timestamp: number
    roomId?: string
}

interface Room {
    id: string
    active: boolean
}

interface WSResponse {
    type: string
    userId?: string
    roomId?: string
    from?: string
    message?: string
    subscriptions?: string[]
    rooms?: string[]
    timestamp?: number
    error?: string
}

export default function WebsocketSubsSimple() {
    const [userId] = createSignal(`user-${Math.random().toString(36).substr(2, 9)}`)
    const [ws, setWs] = createSignal<WebSocket | null>(null)
    const [connected, setConnected] = createSignal(false)
    const [messages, setMessages] = createSignal<Message[]>([])
    const [rooms, setRooms] = createSignal<Room[]>([
        { id: 'lobby', active: false },
        { id: 'general', active: false },
        { id: 'random', active: false }
    ])
    const [currentRoom, setCurrentRoom] = createSignal<string | null>(null)
    const [messageInput, setMessageInput] = createSignal('')
    const [newRoomInput, setNewRoomInput] = createSignal('')
    const [subscriptions, setSubscriptions] = createSignal<string[]>([])
    const [availableRooms, setAvailableRooms] = createSignal<string[]>([])

    const connect = (initialRoom?: string) => {
        const url = initialRoom
            ? `ws://localhost:3000/ws-2?userId=${userId()}&room=${initialRoom}`
            : `ws://localhost:3000/ws-2?userId=${userId()}`

        const websocket = new WebSocket(url)

        websocket.onopen = () => {
            console.log('Connected to WebSocket')
            setConnected(true)
            setWs(websocket)
        }

        websocket.onmessage = (event) => {
            try {
                const data: WSResponse = JSON.parse(event.data)

                switch (data.type) {
                    case 'connected':
                        console.log('Connection confirmed:', data)
                        setSubscriptions(data.subscriptions || [])

                        if (data.subscriptions) {
                            const roomSubs = data.subscriptions
                                .filter(s => s.startsWith('room-'))
                                .map(s => s.replace('room-', ''))

                            setRooms(prev => prev.map(room => ({
                                ...room,
                                active: roomSubs.includes(room.id)
                            })))

                            if (roomSubs.length > 0) {
                                // Fix: roomSubs[0] bisa undefined, tapi sudah di-check dengan length > 0
                                const firstRoom = roomSubs[0]
                                if (firstRoom) {
                                    setCurrentRoom(firstRoom)
                                }
                            }
                        }
                        break

                    case 'joined':
                        console.log('Joined room:', data.roomId)
                        setRooms(prev => prev.map(room =>
                            room.id === data.roomId
                                ? { ...room, active: true }
                                : room
                        ))
                        setCurrentRoom(data.roomId || null)
                        addMessage({
                            from: 'system',
                            message: `You joined room: ${data.roomId}`,
                            timestamp: data.timestamp || Date.now(),
                            roomId: data.roomId
                        })
                        break

                    case 'left':
                        console.log('Left room:', data.roomId)
                        setRooms(prev => prev.map(room =>
                            room.id === data.roomId
                                ? { ...room, active: false }
                                : room
                        ))
                        addMessage({
                            from: 'system',
                            message: `You left room: ${data.roomId}`,
                            timestamp: data.timestamp || Date.now(),
                            roomId: data.roomId
                        })
                        break

                    case 'message':
                        addMessage({
                            from: data.from || 'unknown',
                            message: data.message || '',
                            timestamp: data.timestamp || Date.now(),
                            roomId: data.roomId
                        })
                        break

                    case 'room-list':
                        setAvailableRooms(data.rooms || [])
                        break

                    case 'error':
                        console.error('WebSocket error:', data.error)
                        addMessage({
                            from: 'error',
                            message: data.error || 'Unknown error',
                            timestamp: data.timestamp || Date.now()
                        })
                        break

                    case 'pong':
                        console.log('Pong received')
                        break
                }
            } catch (error) {
                console.error('Failed to parse message:', error)
            }
        }

        websocket.onerror = (error) => {
            console.error('WebSocket error:', error)
            setConnected(false)
        }

        websocket.onclose = () => {
            console.log('Disconnected from WebSocket')
            setConnected(false)
            setWs(null)
        }
    }

    const disconnect = () => {
        const websocket = ws()
        if (websocket) {
            websocket.close()
            setWs(null)
            setConnected(false)
        }
    }

    const joinRoom = (roomId: string) => {
        const websocket = ws()
        if (!websocket || !connected()) return

        websocket.send(JSON.stringify({
            type: 'join-room',
            roomId
        }))
    }

    const leaveRoom = (roomId: string) => {
        const websocket = ws()
        if (!websocket || !connected()) return

        websocket.send(JSON.stringify({
            type: 'leave-room',
            roomId
        }))
    }

    const sendMessage = () => {
        const websocket = ws()
        const room = currentRoom()
        const message = messageInput().trim()

        if (!websocket || !connected() || !room || !message) return

        websocket.send(JSON.stringify({
            type: 'chat',
            roomId: room,
            message
        }))

        setMessageInput('')
    }

    const createNewRoom = () => {
        const roomId = newRoomInput().trim()
        if (!roomId) return

        setRooms(prev => [...prev, { id: roomId, active: false }])
        setNewRoomInput('')
    }

    const listAvailableRooms = () => {
        const websocket = ws()
        if (!websocket || !connected()) return

        websocket.send(JSON.stringify({
            type: 'list-rooms'
        }))
    }

    const addMessage = (message: Message) => {
        setMessages(prev => [...prev, message])
    }

    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString()
    }

    onMount(() => {
        // Auto connect on mount
    })

    onCleanup(() => {
        disconnect()
    })

    return (
        <div class="min-h-screen bg-gray-900 text-white p-4">
            <div class="max-w-6xl mx-auto">
                <h1 class="text-3xl font-bold mb-6">WebSocket Chat Demo</h1>

                {/* Connection Controls */}
                <div class="bg-gray-800 rounded-lg p-4 mb-4">
                    <div class="flex gap-2 items-center">
                        <span class="text-sm text-gray-400">User ID: {userId()}</span>
                        <div class="flex-1"></div>
                        <Show
                            when={!connected()}
                            fallback={
                                <>
                                    <span class="text-green-400 text-sm">● Connected</span>
                                    <button
                                        onClick={disconnect}
                                        class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
                                    >
                                        Disconnect
                                    </button>
                                </>
                            }
                        >
                            <button
                                onClick={() => connect()}
                                class="px-4 py-2 bg-blue-600 text-blue-500 hover:bg-blue-700 rounded"
                            >
                                Connect (No Room)
                            </button>
                            <button
                                onClick={() => connect('lobby')}
                                class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-blue-500"
                            >
                                Connect to Lobby
                            </button>
                        </Show>
                    </div>

                    <Show when={connected()}>
                        <div class="mt-2 text-xs text-gray-400">
                            Subscriptions: {subscriptions().join(', ')}
                        </div>
                    </Show>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Rooms Sidebar */}
                    <div class="bg-gray-800 rounded-lg p-4 text-blue-400">
                        <h2 class="text-xl font-semibold mb-4">Rooms</h2>

                        <div class="space-y-2 mb-4">
                            <For each={rooms()}>
                                {(room) => (
                                    <div class="flex items-center gap-2">
                                        <button
                                            onClick={() => room.active ? leaveRoom(room.id) : joinRoom(room.id)}
                                            disabled={!connected()}
                                            class={`flex-1 px-3 py-2 rounded text-left ${room.active
                                                ? 'bg-green-600 hover:bg-green-700'
                                                : 'bg-gray-700 hover:bg-gray-600'
                                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                        >
                                            <span class="font-medium">{room.id}</span>
                                            {room.active && <span class="text-xs ml-2">✓</span>}
                                        </button>
                                        <Show when={room.active}>
                                            <button
                                                onClick={() => setCurrentRoom(room.id)}
                                                class={`px-3 py-2 rounded ${currentRoom() === room.id
                                                    ? 'bg-blue-600'
                                                    : 'bg-gray-600 hover:bg-gray-500'
                                                    }`}
                                            >
                                                →
                                            </button>
                                        </Show>
                                    </div>
                                )}
                            </For>
                        </div>

                        {/* Create New Room */}
                        <div class="border-t border-gray-700 pt-4">
                            <h3 class="text-sm font-semibold mb-2">Create Room</h3>
                            <div class="flex gap-2">
                                <input
                                    type="text"
                                    value={newRoomInput()}
                                    onInput={(e) => setNewRoomInput(e.currentTarget.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && createNewRoom()}
                                    placeholder="Room name"
                                    class="flex-1 px-3 py-2 bg-gray-700 rounded text-sm"
                                />
                                <button
                                    onClick={createNewRoom}
                                    class="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* List Available Rooms */}
                        <div class="border-t border-gray-700 pt-4 mt-4">
                            <button
                                onClick={listAvailableRooms}
                                disabled={!connected()}
                                class="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm disabled:opacity-50"
                            >
                                List Active Rooms
                            </button>
                            <Show when={availableRooms().length > 0}>
                                <div class="mt-2 text-xs text-gray-400">
                                    Active: {availableRooms().join(', ')}
                                </div>
                            </Show>
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div class="md:col-span-2 bg-gray-800 rounded-lg p-4 flex flex-col h-[600px]">
                        <div class="flex items-center justify-between mb-4">
                            <h2 class="text-xl font-semibold">
                                <Show when={currentRoom()} fallback="Select a room">
                                    Room: {currentRoom()}
                                </Show>
                            </h2>
                        </div>

                        {/* Messages */}
                        <div class="flex-1 overflow-y-auto mb-4 space-y-2">
                            <For each={messages().filter(m => !m.roomId || m.roomId === currentRoom())}>
                                {(msg) => (
                                    <div class={`p-3 rounded ${msg.from === 'system'
                                        ? 'bg-blue-900/30 text-blue-300'
                                        : msg.from === 'error'
                                            ? 'bg-red-900/30 text-red-300'
                                            : msg.from === userId()
                                                ? 'bg-green-900/30'
                                                : 'bg-gray-700'
                                        }`}>
                                        <div class="flex justify-between items-start">
                                            <span class="font-semibold text-sm">{msg.from}</span>
                                            <span class="text-xs text-gray-400">{formatTime(msg.timestamp)}</span>
                                        </div>
                                        <div class="mt-1">{msg.message}</div>
                                    </div>
                                )}
                            </For>
                        </div>

                        {/* Message Input */}
                        <div class="flex gap-2">
                            <input
                                type="text"
                                value={messageInput()}
                                onInput={(e) => setMessageInput(e.currentTarget.value)}
                                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                placeholder={currentRoom() ? "Type a message..." : "Select a room first"}
                                disabled={!connected() || !currentRoom()}
                                class="flex-1 px-4 py-2 bg-gray-700 rounded disabled:opacity-50"
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!connected() || !currentRoom() || !messageInput().trim()}
                                class="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}