// Hour-leg momentum bot for cbBTC (CBBTC/USDC, 1-minute bars).
//
// Idea: the dev window is a slow grind with a few multi-hour up-legs. This bot does
// nothing most of the time and only buys a leg that has already proved itself: when
// the close has risen more than 50 bps over the last 60 minutes it buys with the
// whole cash balance, then banks the move at +90 bps over its cost, or gets out on
// a trailing stop of 80 bps below the peak, a hard stop of 50 bps below cost, or
// after 240 bars (4 hours) if the leg never pays. After any exit it waits 30 bars
// before looking for the next leg, so it cannot churn on the same chop. Every
// round trip costs roughly 26 bps in fees, slippage and impact, so the +90 bps
// take-profit and the 50 bps entry filter are both sized well above that cost.
//
// All decisions come from the bars the harness sends (hello, then one batch per
// bar) and the account it reports; nothing is read from the clock, the environment
// or any randomness, so two runs on the same data answer every batch identically.

import { runBars, type BarsState, type Batch, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
/** Entry: 60-minute close-to-close return must beat this, in bps. */
const ENTRY_RETURN_BPS = 50;
/** Entry confirmation: the last 15 minutes must also be rising, so a 60-minute
 *  return left over from an old move that has already rolled over cannot trigger
 *  a buy into a dead leg. */
const CONFIRM_BARS = 15;
/** How many closes of history the entry rule needs. */
const LOOKBACK_BARS = 60;
/** Exit: take profit at this many bps above the position's cost. */
const TAKE_PROFIT_BPS = 90;
/** Exit: trailing stop, bps below the highest position value seen since entry. */
const TRAILING_STOP_BPS = 80;
/** Exit: hard stop, bps below the position's cost. */
const HARD_STOP_BPS = 50;
/** Exit: give up after this many bars holding without a take-profit. */
const MAX_HOLD_BARS = 240;
/** Bars to sit out after an exit before the next entry. */
const COOLDOWN_BARS = 30;
/** Slippage cap on every order, bps from the latest close. */
const MAX_SLIPPAGE_BPS = 100;

const closes: number[] = [];
let holdBars = 0;
let cooldown = 0;
let heldLastBatch = false;
/** Highest position value (micro-USDC) seen since the current entry. */
let peakValue = 0n;

await runBars({
  onBatch(state: BarsState, batch: Batch): (BuyInput | SellInput)[] {
    const bar = batch.bars.find((b) => b.symbol === SYMBOL);
    if (bar !== undefined) closes.push(Number(bar.c));

    const held = state.positions.get(SYMBOL);
    if (held !== undefined) {
      holdBars += 1;
      const value = state.value(SYMBOL, held.qty);
      if (value > peakValue) peakValue = value;
    } else {
      // A position that was there last batch and is gone now means our sell filled.
      if (heldLastBatch) cooldown = COOLDOWN_BARS;
      holdBars = 0;
      peakValue = 0n;
    }
    heldLastBatch = held !== undefined;
    if (cooldown > 0) cooldown -= 1;

    if (state.warmingUp) return [];

    if (held !== undefined) {
      const value = state.value(SYMBOL, held.qty);
      // Position value vs its cost, in bps (integer math, deterministic).
      const pnlBps = Number(((value - held.cost) * 10000n) / held.cost);
      const trailBps = peakValue > 0n ? Number(((value - peakValue) * 10000n) / peakValue) : 0;
      const exit =
        pnlBps >= TAKE_PROFIT_BPS ||
        trailBps <= -TRAILING_STOP_BPS ||
        pnlBps <= -HARD_STOP_BPS ||
        holdBars >= MAX_HOLD_BARS;
      if (exit) {
        return [{ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
      return [];
    }

    if (cooldown > 0 || closes.length <= LOOKBACK_BARS) return [];
    const now = closes[closes.length - 1]!;
    const then = closes[closes.length - 1 - LOOKBACK_BARS]!;
    // 60-minute return in bps, computed from the two closes.
    const retBps = ((now - then) / then) * 10000;
    if (retBps <= ENTRY_RETURN_BPS) return [];
    // Confirmation: the short leg must still be alive at this bar.
    const recent = closes[closes.length - 1 - CONFIRM_BARS]!;
    if (now <= recent) return [];
    const cash = state.cash;
    if (cash < BigInt(state.hello.fees.min_notional_quote_units)) return [];
    return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: cash, max_slippage_bps: MAX_SLIPPAGE_BPS }];
  },
});
