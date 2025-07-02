import math
from collections import Counter

def analyze_entropy(addresses: list[str]) -> dict:
    """
    Calculates the Shannon entropy and Gini coefficient for wallet distribution.
    Useful to detect decentralization vs. whale dominance.
    """
    total = len(addresses)
    if total == 0:
        return {"entropy": 0, "gini": 1, "walletCount": 0}

    freq = Counter(addresses)
    counts = list(freq.values())
    n = len(counts)
    sum_counts = sum(counts)

    entropy = -sum((c / sum_counts) * math.log2(c / sum_counts) for c in counts)

    sorted_counts = sorted(counts)
    gini_numer = sum((2 * i - n - 1) * x for i, x in enumerate(sorted_counts, 1))
    gini = gini_numer / (n * sum_counts) if sum_counts else 1

    return {
        "entropy": round(entropy, 3),
        "gini": round(gini, 3),
        "walletCount": n
    }
