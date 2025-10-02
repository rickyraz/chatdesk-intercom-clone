import { Elysia, } from 'elysia'
import { Effect, Console } from "effect"
import { type WSMessageClient, type WSMessageServer, activeRooms } from '@shared/types'

const app = new Elysia({
    websocket: {
        idleTimeout: 10,
        ping(ws, data) {
            console.log(`ping ${data}`)
        },
    }
})
    .get('/effect-example', () => {
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

            const response: WSMessageServer = {
                type: 'connected',
                userId,
                subscriptions,
                timestamp: Date.now()
            }

            ws.send(JSON.stringify(response))
        },

        // message(ws, rawMessage) {
        //     try {
        //         const msg = JSON.parse(rawMessage as string) as WSMessageClient
        //         const userId = ws.data.query.userId as string

        //         switch (msg.type) {
        //             case 'join-room': {
        //                 if (!msg.roomId) {
        //                     ws.send(JSON.stringify({
        //                         type: 'error',
        //                         error: 'roomId required',
        //                         timestamp: Date.now()
        //                     } as WSMessageServer))
        //                     return
        //                 }

        //                 const topicName = `room-${msg.roomId}`
        //                 ws.subscribe(topicName)
        //                 activeRooms.add(msg.roomId)

        //                 console.log(`User ${userId} joined room ${msg.roomId}`)

        //                 // Notify user
        //                 const joinResponse: WSMessageServer = {
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
        //                 } as WSMessageServer))
        //                 break
        //             }

        //             case 'leave-room': {
        //                 if (!msg.roomId) {
        //                     ws.send(JSON.stringify({
        //                         type: 'error',
        //                         error: 'roomId required',
        //                         timestamp: Date.now()
        //                     } as WSMessageServer))
        //                     return
        //                 }

        //                 const topicName = `room-${msg.roomId}`
        //                 ws.unsubscribe(topicName)

        //                 console.log(`User ${userId} left room ${msg.roomId}`)

        //                 // Notify user
        //                 const leaveResponse: WSMessageServer = {
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
        //                 } as WSMessageServer))
        //                 break
        //             }

        //             case 'chat': {
        //                 if (!msg.roomId || !msg.message) {
        //                     ws.send(JSON.stringify({
        //                         type: 'error',
        //                         error: 'roomId and message required',
        //                         timestamp: Date.now()
        //                     } as WSMessageServer))
        //                     return
        //                 }

        //                 // Check if subscribed
        //                 if (!ws.isSubscribed(`room-${msg.roomId}`)) {
        //                     ws.send(JSON.stringify({
        //                         type: 'error',
        //                         error: 'Not subscribed to this room',
        //                         timestamp: Date.now()
        //                     } as WSMessageServer))
        //                     return
        //                 }

        //                 // Broadcast message to room
        //                 const chatResponse: WSMessageServer = {
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
        //                 const roomListResponse: WSMessageServer = {
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
        //                 } as WSMessageServer))
        //                 break
        //             }

        //             default:
        //                 ws.send(JSON.stringify({
        //                     type: 'error',
        //                     error: 'Unknown message type',
        //                     timestamp: Date.now()
        //                 } as WSMessageServer))
        //         }
        //     } catch (error) {
        //         console.error('Message parsing error:', error)
        //         ws.send(JSON.stringify({
        //             type: 'error',
        //             error: 'Invalid message format',
        //             timestamp: Date.now()
        //         } as WSMessageServer))
        //     }
        // },


        message(ws, rawMessage) {
            try {
                // Check apakah sudah object atau masih string
                let msg: WSMessageClient

                if (typeof rawMessage === 'string') {
                    msg = JSON.parse(rawMessage)
                } else if (typeof rawMessage === 'object' && rawMessage !== null) {
                    msg = rawMessage as WSMessageClient
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
                            } as WSMessageServer))
                            return
                        }

                        const topicName = `room-${msg.roomId}`
                        ws.subscribe(topicName)
                        activeRooms.add(msg.roomId)

                        console.log(`User ${userId} joined room ${msg.roomId}`)

                        const joinResponse: WSMessageServer = {
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
                        } as WSMessageServer))
                        break
                    }

                    case 'leave-room': {
                        if (!msg.roomId) {
                            ws.send(JSON.stringify({
                                type: 'error',
                                error: 'roomId required',
                                timestamp: Date.now()
                            } as WSMessageServer))
                            return
                        }

                        const topicName = `room-${msg.roomId}`
                        ws.unsubscribe(topicName)

                        console.log(`User ${userId} left room ${msg.roomId}`)

                        const leaveResponse: WSMessageServer = {
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
                        } as WSMessageServer))
                        break
                    }

                    case 'chat': {
                        if (!msg.roomId || !msg.message) {
                            ws.send(JSON.stringify({
                                type: 'error',
                                error: 'roomId and message required',
                                timestamp: Date.now()
                            } as WSMessageServer))
                            return
                        }

                        if (!ws.isSubscribed(`room-${msg.roomId}`)) {
                            ws.send(JSON.stringify({
                                type: 'error',
                                error: 'Not subscribed to this room',
                                timestamp: Date.now()
                            } as WSMessageServer))
                            return
                        }

                        const chatResponse: WSMessageServer = {
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
                        const roomListResponse: WSMessageServer = {
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
                        } as WSMessageServer))
                        break
                    }

                    default:
                        ws.send(JSON.stringify({
                            type: 'error',
                            error: 'Unknown message type',
                            timestamp: Date.now()
                        } as WSMessageServer))
                }
            } catch (error) {
                console.error('Message parsing error:', error)
                ws.send(JSON.stringify({
                    type: 'error',
                    error: 'Invalid message format',
                    timestamp: Date.now()
                } as WSMessageServer))
            }
        },

        close(ws) {
            const userId = ws.data.query.userId as string
            console.log(`❌ Client disconnected: ${ws.id} (User: ${userId})`)
        }
    })
    .listen(3000)

console.log(`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`)