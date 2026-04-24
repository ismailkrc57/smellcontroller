import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from sklearn.neighbors import KNeighborsClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from typing import Optional
import time

from config import RECORDINGS_DIR, DATASETS_DIR, MODELS_DIR, NUM_CHANNELS
from ml.feature_extractor import extract_features


ALGORITHMS = {
    "knn": KNeighborsClassifier(n_neighbors=5),
    "random_forest": RandomForestClassifier(n_estimators=100, random_state=42),
    "svm": SVC(kernel="rbf", probability=True, random_state=42),
}

_training_status: dict = {"running": False, "progress": 0, "message": "", "result": None}


def get_status() -> dict:
    return _training_status.copy()


def load_recordings(csv_files: list[str]) -> tuple[np.ndarray, np.ndarray, list[str]]:
    dfs = []
    for fname in csv_files:
        path = RECORDINGS_DIR / fname
        if path.exists():
            df = pd.read_csv(path)
            dfs.append(df)

    if not dfs:
        raise ValueError("Geçerli CSV dosyası bulunamadı")

    combined = pd.concat(dfs, ignore_index=True)

    # Detect label column
    label_col = None
    for col in ["label", "smell", "koku", "class"]:
        if col in combined.columns:
            label_col = col
            break

    if label_col is None:
        raise ValueError("Etiket kolonu bulunamadı (label, smell, koku, class)")

    channel_cols = [c for c in combined.columns if c.startswith("ch") or c.isdigit() or c in [str(i) for i in range(NUM_CHANNELS)]]

    if not channel_cols:
        channel_cols = combined.columns[:NUM_CHANNELS].tolist()

    X_raw = combined[channel_cols].values.astype(np.float64)
    y_raw = combined[label_col].values

    # Extract 16 features from 64 channels if needed
    if X_raw.shape[1] == NUM_CHANNELS:
        X = np.array([extract_features(row) for row in X_raw])
    elif X_raw.shape[1] == 16:
        X = X_raw
    else:
        X = X_raw

    labels = sorted(list(set(y_raw)))
    label_to_id = {l: i for i, l in enumerate(labels)}
    y = np.array([label_to_id[l] for l in y_raw])

    return X, y, labels


async def train(csv_files: list[str], algorithm: str, model_name: str) -> dict:
    global _training_status
    _training_status = {"running": True, "progress": 5, "message": "Veriler yükleniyor...", "result": None}

    try:
        X, y, labels = load_recordings(csv_files)
        _training_status["progress"] = 25
        _training_status["message"] = f"{len(X)} örnek yüklendi. Ölçeklendiriliyor..."

        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=0.2, random_state=42, stratify=y if len(set(y)) > 1 else None
        )

        _training_status["progress"] = 40
        _training_status["message"] = f"{algorithm} modeli eğitiliyor..."

        clf = ALGORITHMS.get(algorithm)
        if clf is None:
            raise ValueError(f"Geçersiz algoritma: {algorithm}")

        import sklearn
        clf_clone = sklearn.clone(clf)
        clf_clone.fit(X_train, y_train)

        _training_status["progress"] = 80
        _training_status["message"] = "Model değerlendiriliyor..."

        y_pred = clf_clone.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        cm = confusion_matrix(y_test, y_pred).tolist()
        report = classification_report(y_test, y_pred, target_names=[str(l) for l in labels], output_dict=True)

        # Save model and scaler
        safe_name = model_name.replace(" ", "_").replace("/", "_")
        if not safe_name.endswith(".pkl"):
            safe_name += ".pkl"

        model_path = MODELS_DIR / safe_name
        scaler_path = MODELS_DIR / "scaler.pkl"

        joblib.dump(clf_clone, model_path)
        joblib.dump(scaler, scaler_path)

        label_map = {i: str(l) for i, l in enumerate(labels)}

        result = {
            "model_name": safe_name,
            "algorithm": algorithm,
            "accuracy": round(accuracy * 100, 2),
            "samples": len(X),
            "classes": labels,
            "label_map": label_map,
            "confusion_matrix": cm,
            "report": report,
        }

        _training_status = {"running": False, "progress": 100, "message": "Eğitim tamamlandı!", "result": result}
        return result

    except Exception as e:
        _training_status = {"running": False, "progress": 0, "message": f"Hata: {str(e)}", "result": None}
        raise
