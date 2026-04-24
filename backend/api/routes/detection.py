import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ml.predictor import predictor

router = APIRouter(prefix="/detection", tags=["detection"])

_history: list[dict] = []
MAX_HISTORY = 50


class PredictRequest(BaseModel):
    channels: list[float]
    temperature: float = 25.0
    humidity: float = 50.0


@router.post("/predict")
def predict(req: PredictRequest):
    if not predictor.is_loaded:
        raise HTTPException(status_code=400, detail="Model yüklü değil. Önce bir model aktif edin.")
    if len(req.channels) < 64:
        raise HTTPException(status_code=400, detail="64 kanal verisi gerekli")

    result = predictor.predict(req.channels, req.temperature, req.humidity)
    result["timestamp"] = time.time()
    _history.insert(0, result)
    if len(_history) > MAX_HISTORY:
        _history.pop()

    return result


@router.get("/history")
def get_history():
    return {"history": _history}


@router.delete("/history")
def clear_history():
    _history.clear()
    return {"ok": True}


@router.get("/status")
def detection_status():
    return {
        "model_loaded": predictor.is_loaded,
        "active_model": predictor.active_model,
        "history_count": len(_history),
    }
