# KiteAlerts

Webhook notifications when specific on-chain events happen on Kite Mainnet.

> v0.1 ships single-node webhook delivery, polling KiteScan every 30s. Discord/Telegram/email channels and KiteIndex-Lite integration are planned for v0.2.

## Stack

- **api** — Hono + better-sqlite3 (rules + delivery log) + in-process polling watcher
- **web** — Vite + React 19 + Tailwind v4 dashboard for managing rules

## Quick start

```bash
pnpm install
pnpm --filter api dev   # http://localhost:8788
pnpm --filter web dev   # http://localhost:3000
```

## Rule model

A rule says: *"watch this address, in this direction, optionally above this value — when something matches, POST to this webhook."*

Supported match types:

- `address_receives` — any incoming tx
- `address_sends` — any outgoing tx
- `contract_called` — `to == address` and method present

`min_value_wei` filters out small-value matches.

## Webhook payload

```json
{
  "rule_id": "uuid",
  "rule_name": "Treasury inbound",
  "match_type": "address_receives",
  "address": "0x…",
  "tx": {
    "hash": "0x…",
    "block_number": 123,
    "timestamp": "…",
    "from": "0x…",
    "to": "0x…",
    "value_wei": "100000000000000000",
    "method": null
  },
  "delivered_at": "2026-05-21T…Z"
}
```

## Deduplication

Deliveries are recorded per `(rule_id, tx_hash)` with a `UNIQUE` constraint so the same match never fires twice.

## What's PREVIEW

- Multiple delivery channels (Discord, Telegram, email)
- KiteIndex Lite GraphQL subscription (replaces polling)
- User accounts via KiteAuth
- Retry queue + exponential backoff (current behavior: one attempt per match)

## License

MIT
