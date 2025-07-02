def predict_volume_burst(data: list[float], sensitivity: float = 1.6) -> dict:
    """
    Detects burst activity based on sudden volume growth and momentum.
    Returns signal strength and flags for sharpness.
    """
    if len(data) < 6:
        return {"burst": False, "signal": 0.0, "momentum": 0.0}

    trailing = sum(data[-6:-3]) / 3
    recent = sum(data[-3:]) / 3
    momentum = recent - trailing
    signal_strength = round(recent / (trailing + 1e-6), 2)

    return {
        "burst": signal_strength > sensitivity and momentum > 0,
        "signal": signal_strength,
        "momentum": round(momentum, 2)
    }
