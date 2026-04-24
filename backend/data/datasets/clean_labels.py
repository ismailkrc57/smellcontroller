"""
Kentucky etiketlerini normalize eder ve birleşik temiz dataset oluşturur.
Ayrıca mevcut Astroit verisiyle birleştirir.
"""
import pandas as pd
from pathlib import Path

REC = Path(__file__).parent.parent / "recordings"

# Etiket normalizasyon haritası
LABEL_MAP = {
    "coffee_hkrb":                          "Kahve",
    "normal_hkrb":                          "Ambient_Hava",
    "Ambient_Air":                          "Ambient_Hava",
    "Ambient_Room":                         "Ambient_Hava",
    "Ambient_room":                         "Ambient_Hava",
    "CocaCola":                             "CocaCola",
    "CocaCola_Cold":                        "CocaCola",
    "Dasani_Water":                         "Su",
    "Dasani_Water_Cold":                    "Su",
    "Motts_AppleJuice":                     "Elma_Suyu",
    "Motts_AppleJuice_Cold":                "Elma_Suyu",
    "PureLeaf_SweetTea":                    "Cay",
    "PureLeaf_SweetTea_Cold":               "Cay",
    "RedBull":                              "RedBull",
    "RedBull_Cold":                         "RedBull",
    "Starbucks_Dark_Roast_Coffee_4":        "Kahve",
    "Starbucks_Dark_Roast_Coffee_Hot_1":    "Kahve",
    "Starbucks_Dark_Roast_Coffee_Hot_3":    "Kahve",
    "Starbucks_dark_roast_coffee_hot_2":    "Kahve",
    "Starbucks_Dark_Coffee_Cold":           "Kahve",
}

combined_path = REC / "kentucky_combined.csv"
if not combined_path.exists():
    print("HATA: kentucky_combined.csv bulunamadı. Önce prepare_kentucky.py çalıştırın.")
    exit(1)

df = pd.read_csv(combined_path)
print(f"Ham dataset: {len(df)} satır, sınıflar: {df['label'].unique().tolist()}")

df["label"] = df["label"].map(LABEL_MAP).fillna(df["label"])

# Mevcut Astroit verisi de varsa ekle
astroit_path = REC / "sensor_data.csv"
if astroit_path.exists():
    astroit = pd.read_csv(astroit_path)
    if "label" in astroit.columns:
        print(f"Astroit verisi ekleniyor: {len(astroit)} satır")
        df = pd.concat([df, astroit], ignore_index=True)

out_path = REC / "kentucky_clean.csv"
df.to_csv(out_path, index=False)

print(f"\nTemiz dataset kaydedildi: {out_path}")
print(f"Toplam: {len(df)} satır\n")

print("Sınıf dağılımı:")
counts = df["label"].value_counts()
for label, count in counts.items():
    bar = "█" * (count // 10)
    print(f"  {label:25s}  {count:4d}  {bar}")
