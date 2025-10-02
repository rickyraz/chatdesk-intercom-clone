import { Elysia, } from 'elysia'
import { Effect, Console } from "effect"
// import { activeRooms, type WSMessage, type WSResponse } from './modules/_simple/subs'
// import { WSMessage, WSResponse, activeRooms } from "@shared/types"
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

// ---

const app = new Elysia({
    websocket: {
        idleTimeout: 10,
        ping(ws, data) {
            console.log(`ping ${data}`)
        },
    }
})
    .get('/', () => {
        return {
            hello: 'Elysia'
        }
    })
    .state('version', 4)
    .state('akuadalah', "ricky")
    .decorate('getDate', () => Date.now())
    .get('/user/:id', ({ params: { id }, store: { version, }, getDate }) => `${id} ${version} ${getDate()}`)
    .get('/version', ({
        getDate,
        store: { version, akuadalah }
    }) => `${version} ${akuadalah} ${getDate()}`)
    .post('/form', ({ body }) => body)
    .get('/ok', function* () {
        yield 1
        yield 2
        const program = Console.log("Hello, World!")
        Effect.runSync(program)
    }).get('/effect-example', () => {
        const program = Effect.gen(function* () {
            yield* Console.log("Processing request with Effect-ts")
            const currentTime = Date.now()
            const message = `Effect-ts response at ${currentTime}`
            return {
                success: true,
                message,
                timestamp: currentTime
            }
        })

        return Effect.runSync(program)
    })
    .ws('/ws', {
        // Connection Phase: transform() → beforeHandle() → open()
        // Message Phase: parse() → message() (setiap kali ada message)
        sendPings: true,  // automatic ping/pong
        maxPayloadLength: 16 * 1024 * 1024, // 16MB
        idleTimeout: 10,

        // ✅ Transform: Executed before validation during upgrade
        transform(context) {
            console.log('🔄 TRANSFORM: Processing upgrade context')
            console.log('   Available properties:', Object.keys(context))
            // Process HTTP context before upgrade
        },

        // ✅ Parse: Parse HTTP request BEFORE upgrading to WebSocket
        // parse(context) {
        //     console.log('📦 PARSE: HTTP upgrade request')
        //     console.log('   Context keys:', Object.keys(context))
        //     // This is for HTTP upgrade parsing, not message parsing
        //     return context.body // Will be undefined for upgrade requests
        // },

        // parse(message) {
        //     console.log('📦 PARSE: Processing incoming message')
        //     console.log(`   Raw message: ${message}`)
        //     console.log(`   Type: ${typeof message}`)

        //     // Handle different message types properly
        //     if (typeof message === 'string') {
        //         console.log('   Processing as string')
        //         try {
        //             const parsed = JSON.parse(message)
        //             console.log('   Successfully parsed JSON:', parsed)
        //             return parsed
        //         } catch (e) {
        //             console.log('   Not JSON, keeping as string')
        //             return message
        //         }
        //     } else if (typeof message === 'object' && message !== null) {
        //         console.log('   Already an object:', message)
        //         return message
        //     } else {
        //         console.log('   Unknown type, returning as-is')
        //         return message
        //     }
        // },


        // Ini jalan saat HTTP → WebSocket upgrade (sekali saja)
        // Hook untuk memproses request sebelum upgrade ke WebSocket
        // ✅ BeforeHandle: Validate before HTTP → WebSocket upgrade  
        beforeHandle(context) {
            console.log('🚀 BEFORE_HANDLE: About to upgrade to WebSocket')
            // Based on your logs, headers are directly on context
            if (context.headers) {
                console.log('Headers:', context.headers)
            }
        },

        // ✅ Open: WebSocket connection established
        open(ws) {
            console.log('✅ WEBSOCKET OPEN: Client connected')
            console.log(`   ID: ${ws.id}`)
            console.log(`   Address: ${ws.remoteAddress}`)
            ws.send('Welcome to WebSocket server!')
        },

        // ✅ Message: Handle incoming WebSocket messages
        // NOTE: Message parsing is handled automatically by Elysia
        // message(ws, message) {
        //     console.log('📨 WEBSOCKET MESSAGE')
        //     console.log(`   From: ${ws.id}`)
        //     console.log(`   Raw message: ${message}`)
        //     console.log(`   Type: ${typeof message}`)

        //     // Echo the message back
        //     ws.send(`Echo: ${message}`)
        // },

        message(ws, rawMessage) {
            console.log('📨 WEBSOCKET MESSAGE HANDLER (NO PARSE)')
            console.log(`   From: ${ws.id}`)
            console.log(`   Raw message: ${rawMessage}`)
            console.log(`   Type: ${typeof rawMessage}`)

            // Manual parsing in message handler
            let processedMessage = rawMessage

            if (typeof rawMessage === 'string') {
                console.log('   Received string message')
                try {
                    processedMessage = JSON.parse(rawMessage)
                    console.log('   Successfully parsed JSON:', processedMessage)
                } catch (e) {
                    console.log('   Not JSON, keeping as string')
                    processedMessage = rawMessage
                }
            } else if (typeof rawMessage === 'object' && rawMessage !== null) {
                console.log('   Received object message:', rawMessage)
                processedMessage = rawMessage
            }

            console.log(`   Final processed data:`, processedMessage)

            // Echo response dengan format yang konsisten
            const response = {
                echo: processedMessage,
                server: 'Elysia (No Parse)',
                timestamp: Date.now(),
                clientId: ws.id,
                originalType: typeof rawMessage
            }

            ws.send(JSON.stringify(response))
        },

        // ✅ Close: WebSocket disconnected
        close(ws) {
            console.log('❌ WEBSOCKET CLOSE')
            console.log(`   ID: ${ws.id}`)
        }
    })
    .ws('/ws-2', {
        sendPings: true,
        maxPayloadLength: 16 * 1024 * 1024,
        idleTimeout: 120,

        beforeHandle(context) {
            const userId = context.query.userId

            if (!userId) {
                return new Response('userId required in query params', {
                    status: 400
                })
            }
        },

        open(ws) {
            const userId = ws.data.query.userId as string
            const initialRoom = ws.data.query.room as string | undefined

            // Always subscribe to personal channel
            ws.subscribe(`user-${userId}`)

            // Subscribe to global announcements
            ws.subscribe('global')

            const subscriptions: string[] = [
                `user-${userId}`,
                'global'
            ]

            // Optional initial room
            if (initialRoom) {
                ws.subscribe(`room-${initialRoom}`)
                subscriptions.push(`room-${initialRoom}`)
                activeRooms.add(initialRoom)
            }

            console.log(`✅ Client connected: ${ws.id} (User: ${userId})`)

            const response: WSResponse = {
                type: 'connected',
                userId,
                subscriptions,
                timestamp: Date.now()
            }

            ws.send(JSON.stringify(response))
        },

        // message(ws, rawMessage) {
        //     try {
        //         const msg = JSON.parse(rawMessage as string) as WSMessage
        //         const userId = ws.data.query.userId as string

        //         switch (msg.type) {
        //             case 'join-room': {
        //                 if (!msg.roomId) {
        //                     ws.send(JSON.stringify({
        //                         type: 'error',
        //                         error: 'roomId required',
        //                         timestamp: Date.now()
        //                     } as WSResponse))
        //                     return
        //                 }

        //                 const topicName = `room-${msg.roomId}`
        //                 ws.subscribe(topicName)
        //                 activeRooms.add(msg.roomId)

        //                 console.log(`User ${userId} joined room ${msg.roomId}`)

        //                 // Notify user
        //                 const joinResponse: WSResponse = {
        //                     type: 'joined',
        //                     roomId: msg.roomId,
        //                     timestamp: Date.now()
        //                 }
        //                 ws.send(JSON.stringify(joinResponse))

        //                 // Broadcast to room
        //                 ws.publish(topicName, JSON.stringify({
        //                     type: 'message',
        //                     from: 'system',
        //                     roomId: msg.roomId,
        //                     message: `User ${userId} joined the room`,
        //                     timestamp: Date.now()
        //                 } as WSResponse))
        //                 break
        //             }

        //             case 'leave-room': {
        //                 if (!msg.roomId) {
        //                     ws.send(JSON.stringify({
        //                         type: 'error',
        //                         error: 'roomId required',
        //                         timestamp: Date.now()
        //                     } as WSResponse))
        //                     return
        //                 }

        //                 const topicName = `room-${msg.roomId}`
        //                 ws.unsubscribe(topicName)

        //                 console.log(`User ${userId} left room ${msg.roomId}`)

        //                 // Notify user
        //                 const leaveResponse: WSResponse = {
        //                     type: 'left',
        //                     roomId: msg.roomId,
        //                     timestamp: Date.now()
        //                 }
        //                 ws.send(JSON.stringify(leaveResponse))

        //                 // Broadcast to room
        //                 ws.publish(topicName, JSON.stringify({
        //                     type: 'message',
        //                     from: 'system',
        //                     roomId: msg.roomId,
        //                     message: `User ${userId} left the room`,
        //                     timestamp: Date.now()
        //                 } as WSResponse))
        //                 break
        //             }

        //             case 'chat': {
        //                 if (!msg.roomId || !msg.message) {
        //                     ws.send(JSON.stringify({
        //                         type: 'error',
        //                         error: 'roomId and message required',
        //                         timestamp: Date.now()
        //                     } as WSResponse))
        //                     return
        //                 }

        //                 // Check if subscribed
        //                 if (!ws.isSubscribed(`room-${msg.roomId}`)) {
        //                     ws.send(JSON.stringify({
        //                         type: 'error',
        //                         error: 'Not subscribed to this room',
        //                         timestamp: Date.now()
        //                     } as WSResponse))
        //                     return
        //                 }

        //                 // Broadcast message to room
        //                 const chatResponse: WSResponse = {
        //                     type: 'message',
        //                     from: userId,
        //                     roomId: msg.roomId,
        //                     message: msg.message,
        //                     timestamp: Date.now()
        //                 }

        //                 ws.publish(`room-${msg.roomId}`, JSON.stringify(chatResponse))

        //                 console.log(`Message from ${userId} in room ${msg.roomId}: ${msg.message}`)
        //                 break
        //             }

        //             case 'list-rooms': {
        //                 const roomListResponse: WSResponse = {
        //                     type: 'room-list',
        //                     rooms: Array.from(activeRooms),
        //                     timestamp: Date.now()
        //                 }
        //                 ws.send(JSON.stringify(roomListResponse))
        //                 break
        //             }

        //             case 'ping': {
        //                 ws.send(JSON.stringify({
        //                     type: 'pong',
        //                     timestamp: Date.now()
        //                 } as WSResponse))
        //                 break
        //             }

        //             default:
        //                 ws.send(JSON.stringify({
        //                     type: 'error',
        //                     error: 'Unknown message type',
        //                     timestamp: Date.now()
        //                 } as WSResponse))
        //         }
        //     } catch (error) {
        //         console.error('Message parsing error:', error)
        //         ws.send(JSON.stringify({
        //             type: 'error',
        //             error: 'Invalid message format',
        //             timestamp: Date.now()
        //         } as WSResponse))
        //     }
        // },


        message(ws, rawMessage) {
            try {
                // Check apakah sudah object atau masih string
                let msg: WSMessage

                if (typeof rawMessage === 'string') {
                    msg = JSON.parse(rawMessage)
                } else if (typeof rawMessage === 'object' && rawMessage !== null) {
                    msg = rawMessage as WSMessage
                } else {
                    throw new Error('Invalid message format')
                }

                const userId = ws.data.query.userId as string

                switch (msg.type) {
                    case 'join-room': {
                        if (!msg.roomId) {
                            ws.send(JSON.stringify({
                                type: 'error',
                                error: 'roomId required',
                                timestamp: Date.now()
                            } as WSResponse))
                            return
                        }

                        const topicName = `room-${msg.roomId}`
                        ws.subscribe(topicName)
                        activeRooms.add(msg.roomId)

                        console.log(`User ${userId} joined room ${msg.roomId}`)

                        const joinResponse: WSResponse = {
                            type: 'joined',
                            roomId: msg.roomId,
                            timestamp: Date.now()
                        }
                        ws.send(JSON.stringify(joinResponse))

                        ws.publish(topicName, JSON.stringify({
                            type: 'message',
                            from: 'system',
                            roomId: msg.roomId,
                            message: `User ${userId} joined the room`,
                            timestamp: Date.now()
                        } as WSResponse))
                        break
                    }

                    case 'leave-room': {
                        if (!msg.roomId) {
                            ws.send(JSON.stringify({
                                type: 'error',
                                error: 'roomId required',
                                timestamp: Date.now()
                            } as WSResponse))
                            return
                        }

                        const topicName = `room-${msg.roomId}`
                        ws.unsubscribe(topicName)

                        console.log(`User ${userId} left room ${msg.roomId}`)

                        const leaveResponse: WSResponse = {
                            type: 'left',
                            roomId: msg.roomId,
                            timestamp: Date.now()
                        }
                        ws.send(JSON.stringify(leaveResponse))

                        ws.publish(topicName, JSON.stringify({
                            type: 'message',
                            from: 'system',
                            roomId: msg.roomId,
                            message: `User ${userId} left the room`,
                            timestamp: Date.now()
                        } as WSResponse))
                        break
                    }

                    case 'chat': {
                        if (!msg.roomId || !msg.message) {
                            ws.send(JSON.stringify({
                                type: 'error',
                                error: 'roomId and message required',
                                timestamp: Date.now()
                            } as WSResponse))
                            return
                        }

                        if (!ws.isSubscribed(`room-${msg.roomId}`)) {
                            ws.send(JSON.stringify({
                                type: 'error',
                                error: 'Not subscribed to this room',
                                timestamp: Date.now()
                            } as WSResponse))
                            return
                        }

                        const chatResponse: WSResponse = {
                            type: 'message',
                            from: userId,
                            roomId: msg.roomId,
                            message: msg.message,
                            timestamp: Date.now()
                        }

                        // ws.publish(`room-${msg.roomId}`, JSON.stringify(chatResponse))

                        const responseString = JSON.stringify(chatResponse)

                        // Broadcast ke subscribers lain
                        ws.publish(`room-${msg.roomId}`, responseString)

                        // Echo ke sender sendiri
                        ws.send(responseString)

                        console.log(`Message from ${userId} in room ${msg.roomId}: ${msg.message}`)
                        break
                    }

                    case 'list-rooms': {
                        const roomListResponse: WSResponse = {
                            type: 'room-list',
                            rooms: Array.from(activeRooms),
                            timestamp: Date.now()
                        }
                        ws.send(JSON.stringify(roomListResponse))
                        break
                    }

                    case 'ping': {
                        ws.send(JSON.stringify({
                            type: 'pong',
                            timestamp: Date.now()
                        } as WSResponse))
                        break
                    }

                    default:
                        ws.send(JSON.stringify({
                            type: 'error',
                            error: 'Unknown message type',
                            timestamp: Date.now()
                        } as WSResponse))
                }
            } catch (error) {
                console.error('Message parsing error:', error)
                ws.send(JSON.stringify({
                    type: 'error',
                    error: 'Invalid message format',
                    timestamp: Date.now()
                } as WSResponse))
            }
        },

        close(ws) {
            const userId = ws.data.query.userId as string
            console.log(`❌ Client disconnected: ${ws.id} (User: ${userId})`)
        }
    })
    // .ws('/ws4', {
    //     sendPings: true,
    //     maxPayloadLength: 16 * 1024 * 1024,
    //     idleTimeout: 10,

    //     transform(context) {
    //         console.log('🔄 TRANSFORM')
    //     },

    //     beforeHandle(context) {
    //         console.log('🚀 BEFORE_HANDLE')
    //         if (context.headers) {
    //             console.log('Headers:', context.headers)
    //         }
    //     },

    //     open(ws) {
    //         console.log('✅ WEBSOCKET OPEN:', ws.id)

    //         // Setup state - manual, prone to leaks
    //         connections.set(ws.id, ws)
    //         messageQueues.set(ws.id, [])
    //         processingFlags.set(ws.id, false)

    //         ws.send('Welcome to WebSocket server!')
    //     },

    //     message(ws, rawMessage) {
    //         console.log('📨 MESSAGE from:', ws.id)

    //         // Manual parsing
    //         let processedMessage = rawMessage
    //         if (typeof rawMessage === 'string') {
    //             try {
    //                 processedMessage = JSON.parse(rawMessage)
    //             } catch (e) {
    //                 processedMessage = rawMessage
    //             }
    //         }

    //         // Add to queue - no backpressure
    //         const queue = messageQueues.get(ws.id)
    //         if (queue) {
    //             // Race condition: bisa unlimited growth
    //             if (queue.length >= 1000) {
    //                 console.warn('Queue full, dropping message')
    //                 return
    //             }

    //             queue.push(processedMessage)

    //             // Race condition: multiple messages trigger this
    //             if (!processingFlags.get(ws.id)) {
    //                 processQueue(ws.id).catch(e => {
    //                     console.error('Process error:', e)
    //                     // Cleanup? Retry? Unclear
    //                 })
    //             }
    //         }
    //     },

    //     close(ws) {
    //         console.log('❌ WEBSOCKET CLOSE:', ws.id)

    //         // Manual cleanup - kalau error di open, incomplete
    //         connections.delete(ws.id)
    //         messageQueues.delete(ws.id)
    //         processingFlags.delete(ws.id)

    //         // processQueue yang masih jalan? No cancellation
    //     }
    // })
    .listen(3000)

console.log(`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`)