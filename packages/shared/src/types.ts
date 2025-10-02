
// shared/types.ts
export interface WSMessageBase {
    timestamp?: number
    roomId?: string
}

// Client → Server
export interface WSMessageClient extends WSMessageBase {
    type: 'join-room' | 'leave-room' | 'chat' | 'list-rooms' | 'ping'
    message?: string
}

// Server → Client
export interface WSMessageServer extends WSMessageBase {
    type: 'connected' | 'joined' | 'left' | 'message' | 'room-list' | 'error' | 'pong'
    from?: string
    message?: string
    userId?: string
    subscriptions?: string[]
    rooms?: string[]
    error?: string
}

export const activeRooms = new Set<string>()