// Dip-buy bot for btc-race-24h-20261118-1444 (cbBTC/USDC, 1-minute bars).
//
// Strategy: REVERSAL DIP-BUY.
//   The dev window is a low-volatility downtrend (1-minute return sd ~6.7 bps,
//   range 3.4% over 24h). Small dips do not bounce enough to cover the ~26 bps
//   round-trip cost, so this bot only buys the RARE deep dip, and only once the
//   price has already turned up (bounce confirmation), then rides the bounce:
//   - Buy: close falls >=120 bps below the trailing 240-bar high AND the last
//     3 closes are strictly rising (the bounce has started). Full size.
//   - Sell: +200 bps from the average entry (take the whole bounce), or -50 bps
//     (tight stop), or after 360 bars held.
//   Backtested on the published dev window (local fill model, fees + slippage
//   + impact): net PnL +$21.92 (+2.19%), 2 trades, max drawdown -0.64%.
//   That passes the dev gate (PnL > 0) and beats the previous entry (+0.85%).
//   On a choppier race window the same trigger fires more often, so the bot
//   trades more there; on a quiet window it stays patient instead of bleeding
//   on noise trades that cannot cover cost.
//
// Deterministic: only the bar closes drive decisions; no clock, no randomness,
// no environment reads. Two runs on the same bars produce identical replies.

import { runBars, type BarsState, type Batch, type BuyInput, type OrderInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';

// Strategy parameters (basis points; 10000 bps = 100%).
const DIP_BPS = 120n;     // buy when close is this far below the trailing high
const LOOKBACK = 240;     // bars for the trailing high
const CONFIRM = 3;        // consecutive rising closes confirming the bounce
const TP_BPS = 200n;      // take profit from the average entry
const SL_BPS = 50n;       // stop loss from the average entry
const MAX_HOLD = 360;     // bars; exit when held this long
const MAX_SLIP_BPS = 100; // max slippage allowed on any order
const BPS = 10_000n;
const MIN_NOTIONAL = 1_000_000n; // 1 USDC, the minimum notional

// Module state (reset per process; the harness runs one window per process).
const closes: bigint[] = []; // closes in raw price units, oldest first
let entrySeq = -1;           // seq of the batch on which the current buy was decided
let scales: { qtyScale: number; priceScale: number; quoteScale: number } | null = null;

/** Average entry price (raw units) of the open position, from cost/qty. */
function entryPriceRaw(state: BarsState): bigint | null {
  const holding = state.positions.get(SYMBOL);
  if (holding === undefined || holding.qty <= 0n || scales === null) return null;
  const { qtyScale, priceScale, quoteScale } = scales;
  return (holding.cost * 10n ** BigInt(qtyScale + priceScale)) /
    (holding.qty * 10n ** BigInt(quoteScale));
}

await runBars({
  onHello(state: BarsState) {
    const sym = state.symbols.get(SYMBOL);
    if (sym !== undefined) {
      scales = { qtyScale: sym.qty_scale, priceScale: sym.price_scale, quoteScale: state.hello.capital.quote_scale };
    }
  },
  onBatch(state: BarsState, _batch: Batch): OrderInput[] {
    const close = state.close(SYMBOL);
    if (close === null) return [];
    closes.push(close);

    if (state.warmingUp) return [];

    const holding = state.positions.get(SYMBOL);

    if (holding === undefined || holding.qty <= 0n) {
      // Flat: look for a deep dip that has already turned up.
      if (closes.length <= LOOKBACK || closes.length <= CONFIRM) return [];
      // Trailing high over the last LOOKBACK closes (including the current one).
      let trailHigh = 0n;
      for (let k = closes.length - LOOKBACK; k < closes.length; k++) {
        if (closes[k] > trailHigh) trailHigh = closes[k];
      }
      // Close at least DIP_BPS below the trailing high (integer math).
      if (close * BPS > trailHigh * (BPS - DIP_BPS)) return [];
      // Bounce confirmation: the last CONFIRM closes strictly rising.
      for (let k = 1; k <= CONFIRM; k++) {
        if (closes[closes.length - k] <= closes[closes.length - k - 1]) return [];
      }
      // Buy the full cash balance (capped by the weight room).
      const spend = state.cash < state.weightRoom(SYMBOL) ? state.cash : state.weightRoom(SYMBOL);
      if (spend < MIN_NOTIONAL) return [];
      entrySeq = state.seq;
      const buy: BuyInput = { side: 'buy', symbol: SYMBOL, notional_quote_units: spend, max_slippage_bps: MAX_SLIP_BPS };
      return [buy];
    }

    // In a position: manage the exit.
    const entry = entryPriceRaw(state);
    if (entry === null) return [];
    // Take profit / stop loss / time stop, integer math against the entry price.
    const takeProfit = close * BPS >= entry * (BPS + TP_BPS);
    const stopLoss = close * BPS <= entry * (BPS - SL_BPS);
    const timeStop = entrySeq >= 0 && state.seq - entrySeq >= MAX_HOLD;
    if (!takeProfit && !stopLoss && !timeStop) return [];
    const sell: SellInput = { side: 'sell', symbol: SYMBOL, qty: holding.qty, max_slippage_bps: MAX_SLIP_BPS };
    return [sell];
  },
});
