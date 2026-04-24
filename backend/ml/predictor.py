import joblib
import numpy as np
from pathlib import Path
from typing import Optional
from config import MODELS_DIR, LABEL_MAP
from ml.feature_extractor import extract_features


class SmellPredictor:
    def __init__(self):
        self._model = None
        self._scaler = None
        self._model_name: Optional[str] = None
        self._label_map: dict = LABEL_MAP
        self._expected_features: Optional[int] = None

    def load(self, model_name: str) -> bool:
        model_path = MODELS_DIR / model_name
        scaler_path = MODELS_DIR / "scaler.pkl"

        if not model_path.exists():
            raise FileNotFoundError(f"Model bulunamadı: {model_name}")

        self._model = joblib.load(model_path)
        self._scaler = joblib.load(scaler_path) if scaler_path.exists() else None
        self._model_name = model_name

        # Detect expected feature count from scaler
        if self._scaler and hasattr(self._scaler, 'n_features_in_'):
            self._expected_features = self._scaler.n_features_in_
        else:
            self._expected_features = None
        return True

    def list_models(self) -> list[dict]:
        models = []
        for f in MODELS_DIR.glob("*.pkl"):
            if "scaler" not in f.name:
                size_kb = round(f.stat().st_size / 1024, 1)
                models.append({"name": f.name, "size_kb": size_kb})
        return models

    def update_label_map(self, label_map: dict):
        self._label_map = label_map

    def _build_features(self, channels: list[float], temperature: float = 25.0, humidity: float = 50.0) -> np.ndarray:
        n = self._expected_features
        if n == 66:
            # Old model: 64 raw channels + temperature + humidity
            return np.array(channels[:64] + [temperature, humidity], dtype=np.float64).reshape(1, -1)
        elif n == 16 or n is None:
            return extract_features(channels).reshape(1, -1)
        else:
            # Fallback: use raw channels up to expected count
            return np.array(channels[:n], dtype=np.float64).reshape(1, -1)

    def predict(self, channels: list[float], temperature: float = 25.0, humidity: float = 50.0) -> dict:
        if self._model is None:
            raise RuntimeError("Model yüklenmedi")

        features = self._build_features(channels, temperature, humidity)

        if self._scaler:
            features = self._scaler.transform(features)

        prediction = self._model.predict(features)[0]
        label = self._label_map.get(int(prediction), str(prediction))

        confidence = {}
        if hasattr(self._model, "predict_proba"):
            proba = self._model.predict_proba(features)[0]
            classes = self._model.classes_
            for cls, prob in zip(classes, proba):
                name = self._label_map.get(int(cls), str(cls))
                confidence[name] = round(float(prob) * 100, 1)
        else:
            confidence[label] = 100.0

        return {
            "label": label,
            "class_id": int(prediction),
            "confidence": confidence,
            "model": self._model_name,
        }

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    @property
    def active_model(self) -> Optional[str]:
        return self._model_name


predictor = SmellPredictor()
