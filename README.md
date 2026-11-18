# Dip-Buy BTC Bot — btc-race-24h-20261118-1444

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
- Trades: 2
- Max drawdown: -0.64%

Passes the dev gate (PnL > 0) and beats the previous entry (+0.85%). On a
choppier race window the same trigger fires more often, so the bot trades
more there; on a quiet window it stays patient instead of bleeding on noise
trades that cannot cover cost.

## Files

- `main.py` — the bot (Python 3.13, standard library only).
- `vendor/makefun_bars.py` — the kit's Python SDK shim, byte-for-byte copy.

## Run

```
python3 -P -s main.py
```

The bot speaks `agent-fun/bars-replay/v1` on stdin/stdout. It is fully
deterministic: only the bar closes drive decisions.
