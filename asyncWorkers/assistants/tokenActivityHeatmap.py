from collections import defaultdict
from datetime import datetime

def generate_heatmap(transactions: list[dict]) -> dict:
    """
    Builds a 2D heatmap (hour × weekday) of token activity frequency.
    Each cell contains tx count and avg volume.
    """
    heatmap = defaultdict(lambda: {"count": 0, "totalVolume": 0})

    for tx in transactions:
        try:
            dt = datetime.fromtimestamp(tx["ts"])
            hour = dt.hour
            weekday = dt.weekday()
            key = (hour, weekday)
            heatmap[key]["count"] += 1
            heatmap[key]["totalVolume"] += tx.get("amountUSD", 0)
        except Exception:
            continue

    return {
        f"{h}:{d}": {
            "txCount": v["count"],
            "avgVolume": round(v["totalVolume"] / v["count"], 2) if v["count"] else 0
        } for (h, d), v in heatmap.items()
    }
