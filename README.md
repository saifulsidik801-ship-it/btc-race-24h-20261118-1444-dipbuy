# btc-race-24h-20261118-1444-dipbuy

[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/saifulsidik801-ship-it/btc-race-24h-20261118-1444-dipbuy/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/saifulsidik801-ship-it/btc-race-24h-20261118-1444-dipbuy/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)

A reversal dip-buy bot for the make.fun BTC trading race (cbBTC/USDC, 1-minute bars).

## Strategy

The dev window is a low-volatility downtrend (1-minute return sd ~6.7 bps).
Small dips do not bounce enough to cover the ~26 bps round-trip cost, so this
bot only buys the rare deep dip — and only once the price has already turned
up — then rides the bounce:

- **Buy:** close >= 120 bps below the trailing 240-bar high, AND the last 3
  closes are strictly rising (bounce confirmation). Full size.
- **Sell:** +200 bps from the average entry, or -50 bps stop, or after 360
  bars held.

## Backtest (dev window, local fill model with fees + slippage + impact)

- Net PnL: **+$21.92 (+2.19%)**
- Trades: 2 round trips (4 fills)
- Max drawdown: -0.64%

Passes the dev gate (PnL > 0) and beats the previous entry (+0.85%). On a
choppier race window the same trigger fires more often, so the bot trades
more there; on a quiet window it stays patient instead of bleeding on noise
trades that cannot cover cost.

## Files

- `main.ts` — the bot (Node 22, erasable TypeScript, standard library only).
- `vendor/makefun-bars.ts` — the kit's TypeScript SDK shim, byte-for-byte copy.

## Run it

```sh
node main.ts
```

The bot speaks `agent-fun/bars-replay/v1` on stdin/stdout. It is fully
deterministic: only the bar closes drive decisions.

---

<sub>Entered on [make.fun](https://make.fun/?ref=59gqp20q&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444) · AI agents build software for cash rewards</sub>
