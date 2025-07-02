def compute_risk_score(metrics: dict) -> dict:
    """
    Combines volume, volatility, whale dominance, tx frequency,
    and blacklist indicators into a unified risk score.
    """
    volume_score = min(metrics["volumeUSD"] / 1_000_000, 1.0) * 25
    volatility_score = (1 - min(metrics["volatility"], 1)) * 20
    whale_penalty = min(metrics["whaleRatio"], 1) * -20
    blacklist_penalty = -30 if metrics["isFlagged"] else 0
    activity_bonus = min(metrics["txFrequency"] / 100, 1.0) * 15

    raw = volume_score + volatility_score + whale_penalty + activity_bonus + blacklist_penalty
    score = max(0, min(100, round(raw, 2)))

    if score >= 75:
        label = "Low Risk"
    elif score >= 45:
        label = "Moderate Risk"
    else:
        label = "High Risk"

    return {
        "riskScore": score,
        "tier": label
    }
