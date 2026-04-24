"""
Kentucky Smell-Datasets → SmellController format dönüştürücü.
Çıktı: recordings/ klasörüne eğitime hazır CSV dosyaları
Format: ch1..ch64, temperature, humidity, label
"""
import sys
import os
import re
import pandas as pd
import numpy as np
from pathlib import Path

BASE = Path(__file__).parent / "kentucky_raw"
OUT = Path(__file__).parent.parent / "recordings"
OUT.mkdir(exist_ok=True)

HEADERS = [f"ch{i+1}" for i in range(64)] + ["temperature", "humidity", "label"]


def label_from_filename(fname: str) -> str:
    name = Path(fname).stem
    name = re.sub(r'_\d+$', '', name)       # trailing _1 _2 etc.
    name = name.replace(' ', '_').strip('_')
    return name


def parse_usb_csv(path: Path, label: str) -> pd.DataFrame:
    """fw_2_0_1 format: index, count, s_0..s_63, temperature, humidity"""
    df = pd.read_csv(path, header=0)
    ch_cols = [f"s_{i}" for i in range(64)]
    missing = [c for c in ch_cols if c not in df.columns]
    if missing:
        print(f"  SKIP (missing cols): {path.name}")
        return None
    data = df[ch_cols].values
    temp = df["temperature"].values
    hum  = df["humidity"].values
    rows = np.column_stack([data, temp, hum])
    result = pd.DataFrame(rows, columns=[f"ch{i+1}" for i in range(64)] + ["temperature", "humidity"])
    result["label"] = label
    return result


def parse_annotator_csv(path: Path, label: str) -> pd.DataFrame:
    """fw_3_0_1 format: lines starting with # are metadata, then timestamp,ch0..ch63,temp,hum"""
    rows = []
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            if line.startswith("#") or not line.strip():
                continue
            parts = line.strip().split(",")
            # First field might be a timestamp or numeric index
            # We need exactly 66 numeric fields (64 ch + temp + hum)
            # Try skipping first field if it's a timestamp
            candidates = parts[1:] if len(parts) == 67 else parts
            if len(candidates) != 66:
                continue
            try:
                vals = [float(x) for x in candidates]
                rows.append(vals)
            except ValueError:
                continue

    if not rows:
        print(f"  SKIP (no data rows): {path.name}")
        return None

    result = pd.DataFrame(rows, columns=[f"ch{i+1}" for i in range(64)] + ["temperature", "humidity"])
    result["label"] = label
    return result


def process_all():
    all_dfs = []
    stats = {}

    # fw_2_0_1 — smell_sensor_usb
    usb_dir = BASE / "raw_data" / "fw_2_0_1" / "smell_sensor_usb"
    if usb_dir.exists():
        print("\n[fw_2_0_1 / smell_sensor_usb]")
        for csv in sorted(usb_dir.glob("*.csv")):
            label = label_from_filename(csv.name)
            df = parse_usb_csv(csv, label)
            if df is not None:
                print(f"  {csv.name}  →  {label}  ({len(df)} rows)")
                all_dfs.append(df)
                stats[label] = stats.get(label, 0) + len(df)

    # fw_3_0_1 — smell_annotator
    ann_dir = BASE / "raw_data" / "fw_3_0_1" / "smell_annotator"
    if ann_dir.exists():
        print("\n[fw_3_0_1 / smell_annotator]")
        for csv in sorted(ann_dir.glob("*.csv")):
            label = label_from_filename(csv.name)
            df = parse_annotator_csv(csv, label)
            if df is not None:
                print(f"  {csv.name}  →  {label}  ({len(df)} rows)")
                all_dfs.append(df)
                stats[label] = stats.get(label, 0) + len(df)

    if not all_dfs:
        print("HATA: Hiç veri bulunamadı.")
        return

    combined = pd.concat(all_dfs, ignore_index=True)

    # Save combined
    combined_path = OUT / "kentucky_combined.csv"
    combined.to_csv(combined_path, index=False)
    print(f"\nBirleşik dataset: {combined_path}  ({len(combined)} toplam satır)")

    # Save per-label files
    for label in combined["label"].unique():
        sub = combined[combined["label"] == label]
        out_path = OUT / f"kentucky_{label}.csv"
        sub.to_csv(out_path, index=False)
        print(f"  {out_path.name}  ({len(sub)} satır)")

    print("\n--- Özet ---")
    for label, count in sorted(stats.items()):
        print(f"  {label:40s}  {count:5d} örnek")
    print(f"\nToplam: {len(combined)} örnek, {len(stats)} sınıf")
    print(f"Dosyalar: {OUT}")


if __name__ == "__main__":
    process_all()
