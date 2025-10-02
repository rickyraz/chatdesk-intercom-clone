# chatdesk-intercom-clone

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.21. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

```
                  ┌────────────┐
                  │   Client   │
                  │ (Browser,  │
                  │   Mobile)  │
                  └─────┬──────┘
                        │
                (Sticky LB + Anycast DNS)
                        │
        ┌───────────────┼────────────────┐
        │               │                │
   ┌────▼─────┐    ┌────▼─────┐    ┌─────▼─────┐
   │ WS Node  │    │ WS Node  │    │ WS Node   │   (Regional clusters)
   │ (Elysia) │    │ (Elysia) │    │ (Elysia)  │
   └────┬─────┘    └────┬─────┘    └─────┬─────┘
        │               │                │
        └───────┬───────┴────────────────┘
                │
         ┌──────▼──────┐
         │ Event Bus   │  (Redis / NATS / Kafka)
         └──────┬──────┘
                │
  ┌─────────────┼───────────────┐
  │             │               │
┌─▼───┐    ┌────▼────┐     ┌────▼────┐
│ DB  │    │ Worker  │     │ Search  │
│(C* )│    │ (async) │     │ (ES)    │
└─────┘    └─────────┘     └─────────┘

```

- Monolithic core (Elysia WS server with clear modular structure).
- Distributed data layer (DB + cache/pubsub).
- Event-driven background workers.
- Multi-regional deployment for latency & resilience.
= Custom automation by consuming events.

📐 Diagram dengan Custom Protocol
```
                  ┌──────────────┐
                  │    Client    │
                  │ (App/Browser)│
                  └───────┬──────┘
                          │
                ┌─────────▼──────────┐
                │ WebSocket (RFC6455)│  ← Transport
                └─────────┬──────────┘
                          │
                ┌─────────▼─────────┐
                │ Custom Protocol   │  ← Nexus / MTProto / custom frames
                │ - Auth handshake  │
                │ - Msg envelope    │
                │ - Stream mux      │
                │ - ACK/reconnect   │
                └─────────┬─────────┘
                          │
        ┌─────────────────▼────────────────────┐
        │ Monolithic Core (WS Server Handlers) │
        │ - Chat events                        │
        │ - Notification events                │
        │ - Presence                           │
        └─────────┬───────────────┬────────────┘
                  │               │
            ┌─────▼─────┐   ┌─────▼─────┐
            │ Event Bus │   │  Workers  │
            │ (Redis/   │   │ (Async bg │
            │  Kafka)   │   │  jobs)    │
            └─────┬─────┘   └─────┬─────┘
                  │               │
          ┌───────▼────────┐ ┌────▼─────┐
          │  DB (Cassandra)│ │ Search   │
          └────────────────┘ └──────────┘
```

- Message envelopes (type, metadata, payload).
- ACK / delivery receipts.
- Multiplexing (beberapa stream dalam 1 socket).
- Reconnect/resume session.
- Auth handshake.

📝 Penempatan Custom Protocol
👉 Jadi posisi custom protocol itu tepat di antara WebSocket transport dan application logic.
Semua WS node hanya bicara pakai custom protocol, bukan raw JSON bebas.
Klien (web/mobile SDK) juga pakai library client yang paham protokol ini.
Ini bikin sistem lebih terstandarisasi & future-proof (misalnya upgrade schema, tambahin compression, atau multiplexing).