# Deem Lifecycle State Machine — Draft

```
MINTED → OWNED → REDEEMED → SECONDARY_MARKET → OWNED(new) → ...
  │         │         │              │
  │         │         │              └─ Tertiary: owner authorises copy
  │         │         │                 → new MINTED at lower tier
  │         │         │
  │         │         └─ Redemption recorded on-chain
  │         │            NFC/QR enters "used" state
  │         │            Deem stays in collection
  │         │
  │         └─ Owner can: redeem, sell, hold, collect
  │
  └─ Certificate issued, NFC activated, QR valid
```

## States
- **MINTED** — created, certificate issued, NFC/QR activated
- **OWNED** — held by a user, unredeemed
- **REDEEMED** — discount/experience used, Deem retained in collection
- **LISTED** — on secondary market for sale
- **TRANSFERRED** — ownership changed (sale completed)
- **COPIED** — tertiary copy authorised by owner (new Deem minted at lower tier)

## Blockchain (Background)
Every state transition is an on-chain event. Users never see this.
Technology: TBD (Solana candidate — low cost, fast, environmentally light).
