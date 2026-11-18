#!/usr/bin/env python3
"""Nightly risk snapshot for the risk engine page.

Fetches daily adjusted closes for four ETFs standing in for the engine's asset
classes, then measures a fixed $1M portfolio the way the engine does:
EWMA covariance (RiskMetrics, lambda = 0.94), parametric and historical 1-day
VaR and expected shortfall at 99%, component VaR, and correlations now against
their long-run level. Writes one JSON file that the page reads.

Standard library only, so the GitHub Action needs no installs.
Usage: python scripts/risk_snapshot.py data/risk-snapshot.json
"""
import datetime as dt
import json
import math
import os
import sys
import time
import urllib.request

ASSETS = [("SPY", "Equities", "EQ"), ("LQD", "Credit", "CR"), ("DBC", "Commodities", "CM"), ("VNQ", "Real estate", "RE")]
POS = [400_000.0, 300_000.0, 150_000.0, 150_000.0]
LAM = 0.94
Z99 = 2.3263478740408408
PHI_Z99 = math.exp(-Z99 * Z99 / 2) / math.sqrt(2 * math.pi)
HIST = 500      # trading days of history for historical VaR
SERIES = 260    # trading days of VaR history to plot
SEED = 60       # days used to seed the EWMA covariance


def fetch(sym):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}?range=3y&interval=1d&events=div%2Csplit"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; risk-snapshot/1.0)"})
    err = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                data = json.load(r)
            break
        except Exception as e:  # network hiccup or rate limit: back off and retry
            err = e
            time.sleep(5 * (attempt + 1))
    else:
        raise RuntimeError(f"could not fetch {sym}: {err}")
    res = data["chart"]["result"][0]
    off = res["meta"].get("gmtoffset", 0)
    adj = res["indicators"]["adjclose"][0]["adjclose"]
    close = res["indicators"]["quote"][0]["close"]
    # a bar for today is only a close once the exchange has shut (4 pm local, plus a margin)
    local_now = dt.datetime.now(dt.timezone.utc) + dt.timedelta(seconds=off)
    today = local_now.date().isoformat()
    still_open = local_now.hour * 60 + local_now.minute < 16 * 60 + 20
    out = {}
    for t, a, c in zip(res["timestamp"], adj, close):
        d = dt.datetime.fromtimestamp(t + off, dt.timezone.utc).date().isoformat()
        if a and c and not (d == today and still_open):
            out[d] = (a, c)
    return out


def quantile(xs, q):
    s = sorted(xs)
    pos = q * (len(s) - 1)
    lo = math.floor(pos)
    hi = min(lo + 1, len(s) - 1)
    return s[lo] + (s[hi] - s[lo]) * (pos - lo)


def corr_of(cov):
    n = len(cov)
    return [[cov[i][j] / math.sqrt(cov[i][i] * cov[j][j]) for j in range(n)] for i in range(n)]


def avg_pair(c):
    n = len(c)
    vals = [c[i][j] for i in range(n) for j in range(i + 1, n)]
    return sum(vals) / len(vals)


def main(path):
    raw = [fetch(sym) for sym, _, _ in ASSETS]
    dates = sorted(set.intersection(*(set(r) for r in raw)))
    if len(dates) < HIST + SEED + 2:
        raise RuntimeError(f"only {len(dates)} common days of prices")

    n = len(ASSETS)
    rets = [[math.log(raw[i][dates[t]][0] / raw[i][dates[t - 1]][0]) for i in range(n)] for t in range(1, len(dates))]
    rdates = dates[1:]

    # EWMA covariance, seeded with the sample covariance of the first SEED days
    seed = rets[:SEED]
    mu = [sum(r[i] for r in seed) / SEED for i in range(n)]
    S = [[sum((r[i] - mu[i]) * (r[j] - mu[j]) for r in seed) / (SEED - 1) for j in range(n)] for i in range(n)]
    var_series = []
    for t in range(SEED, len(rets)):
        r = rets[t]
        S = [[LAM * S[i][j] + (1 - LAM) * r[i] * r[j] for j in range(n)] for i in range(n)]
        sp = math.sqrt(sum(POS[i] * S[i][j] * POS[j] for i in range(n) for j in range(n)))
        var_series.append((rdates[t], Z99 * sp))   # tomorrow's 99% VaR, known at today's close

    # today's figures, from the latest EWMA covariance
    Sw = [sum(S[i][j] * POS[j] for j in range(n)) for i in range(n)]
    sp = math.sqrt(sum(POS[i] * Sw[i] for i in range(n)))
    var_p = Z99 * sp
    es_p = sp * PHI_Z99 / 0.01
    comp = [POS[i] * Sw[i] / sp * Z99 for i in range(n)]
    standalone = [Z99 * POS[i] * math.sqrt(S[i][i]) for i in range(n)]

    # historical simulation: today's positions through the last HIST days of returns
    losses = [-sum(POS[i] * (math.exp(r[i]) - 1) for i in range(n)) for r in rets[-HIST:]]
    var_h = quantile(losses, 0.99)
    tail = [x for x in losses if x >= var_h]
    es_h = sum(tail) / len(tail)

    # long-run correlation: plain sample over the same window
    win = rets[-HIST:]
    m = [sum(r[i] for r in win) / len(win) for i in range(n)]
    L = [[sum((r[i] - m[i]) * (r[j] - m[j]) for r in win) / (len(win) - 1) for j in range(n)] for i in range(n)]
    c_now, c_long = corr_of(S), corr_of(L)

    last, prev = dates[-1], dates[-2]
    year = rets[-252:]
    assets = []
    for i, (sym, name, short) in enumerate(ASSETS):
        yr = [r[i] for r in year]
        ym = sum(yr) / len(yr)
        assets.append({
            "ticker": sym, "name": name, "short": short, "position": POS[i],
            "close": round(raw[i][last][1], 2),
            "change": round(math.exp(rets[-1][i]) - 1, 5),
            "volEwma": round(math.sqrt(S[i][i] * 252), 4),
            "vol1y": round(math.sqrt(sum((x - ym) ** 2 for x in yr) / (len(yr) - 1) * 252), 4),
            "componentVar": round(comp[i]),
            "standaloneVar": round(standalone[i]),
        })

    snap = {
        "asOf": last,
        "previous": prev,
        "generated": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
        "source": "Yahoo Finance daily adjusted closes",
        "portfolio": sum(POS),
        "pnl1d": round(sum(POS[i] * (math.exp(rets[-1][i]) - 1) for i in range(n))),
        "assets": assets,
        "var": {
            "ewma99": round(var_p), "es99": round(es_p), "ewma99_10d": round(var_p * math.sqrt(10)),
            "hist99": round(var_h), "histEs99": round(es_h), "histDays": HIST,
            "undiversified": round(sum(standalone)),
        },
        "corr": {
            "now": [[round(v, 3) for v in row] for row in c_now],
            "long": [[round(v, 3) for v in row] for row in c_long],
            "avgNow": round(avg_pair(c_now), 3), "avgLong": round(avg_pair(c_long), 3),
        },
        "series": {
            "dates": [d for d, _ in var_series[-SERIES:]],
            "var": [round(v) for _, v in var_series[-SERIES:]],
        },
    }

    # nothing new (a holiday, or a rerun the same night): leave the file alone so there is no commit
    if os.path.exists(path):
        with open(path) as f:
            try:
                # Yahoo's adjusted closes wobble in the last digit between calls, so compare trading days, not bytes
                if json.load(f).get("asOf") == snap["asOf"]:
                    print(f"snapshot already current for {snap['asOf']}")
                    return
            except ValueError:
                pass
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w") as f:
        json.dump(snap, f, separators=(",", ":"))
        f.write("\n")
    print(f"wrote {path} for {snap['asOf']}: 1-day 99% VaR ${var_p:,.0f}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "data/risk-snapshot.json")
