export interface WSMessage {
    type: 'join-room' | 'leave-room' | 'chat' | 'list-rooms' | 'ping'
    roomId?: string
    message?: string
    timestamp?: number
}

export interface WSResponse {
    type: 'connected' | 'joined' | 'left' | 'message' | 'room-list' | 'error' | 'pong'
    userId?: string
    roomId?: string
    from?: string
    message?: string
    subscriptions?: string[]
    rooms?: string[]
    timestamp?: number
    error?: string
}

export const activeRooms = new Set<string>()