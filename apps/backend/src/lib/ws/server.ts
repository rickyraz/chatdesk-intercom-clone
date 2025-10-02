//  # setup global ws server

// Client (WebSocket)
//    ↓
// lib/websocket/server.ts   # routing message ke domain
//    ↓
// chat/ws/events.ts         # handler pesan chat
//    ↓
// chat/service.ts           # business logic (EffectTS, DB call, dsb)
//    ↓
// lib/websocket/eventBus.ts # optional: publish ke cluster lain
//    ↓
// Client(s)                 # broadcast / send reply
