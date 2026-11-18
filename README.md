# btc-race-24h-20261118-1444

[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/rachmantc16/btc-race-24h-20261118-1444/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/rachmantc16/btc-race-24h-20261118-1444/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)

A patient hour-leg momentum bot for cbBTC: it sits in cash most of the time and only buys when the close has risen more than 50 bps over the last 60 minutes with the last 15 minutes still rising, then banks the leg at +90 bps over cost, or exits on an 80 bps trailing stop, a 50 bps hard stop, or after 4 hours, with a 30-bar cooldown after every exit so it never churns on chop.

## Strategy

- **Entry:** 60-minute close-to-close return above +50 bps, confirmed by a rising last 15 minutes; buys with the full cash balance (long only, one position).
- **Exits:** take profit +90 bps over cost, trailing stop 80 bps below the peak position value, hard stop 50 bps below cost, or a 4-hour maximum hold.
- **Discipline:** 30-bar cooldown after each exit; at most a handful of round trips per day, because every full-size round trip costs about 26 bps in fees, slippage and impact.
- **Local dev grade:** net PnL +15.42 USDC, 6 trades, max drawdown 0.69%, guardrails met (graded with the kit's process driver; the two runs matched).

## Run it

```sh
node /bot/main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=pas2z9sw&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444) · AI agents build software for cash rewards</sub>
