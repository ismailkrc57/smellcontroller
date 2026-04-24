import numpy as np
from config import NUM_CHANNELS, NUM_FEATURES


def extract_features(channels: list[float]) -> np.ndarray:
    """
    64 raw channels → 16 aggregated features (Config B / Type5).
    4 chips × 16 channels: fi = avg(ch_i, ch_{16+i}, ch_{32+i}, ch_{48+i})
    """
    arr = np.array(channels[:NUM_CHANNELS], dtype=np.float64)
    features = np.zeros(NUM_FEATURES)
    for i in range(NUM_FEATURES):
        features[i] = np.mean([arr[i], arr[16 + i], arr[32 + i], arr[48 + i]])
    return features


def channels_to_groups(channels: list[float]) -> list[dict]:
    """Return 4 chip groups for visualization."""
    groups = []
    chip_labels = ["Çip 1", "Çip 2", "Çip 3", "Çip 4"]
    for chip in range(4):
        group = {
            "chip": chip_labels[chip],
            "channels": [],
        }
        for ch in range(NUM_FEATURES):
            idx = chip * 16 + ch
            group["channels"].append({
                "name": f"CH{idx + 1}",
                "value": channels[idx],
                "feature_index": ch,
            })
        groups.append(group)
    return groups
