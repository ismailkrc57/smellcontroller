import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional

from ml.trainer import train, get_status, load_recordings, ALGORITHMS
from ml.predictor import predictor
from config import RECORDINGS_DIR, MODELS_DIR

router = APIRouter(prefix="/training", tags=["training"])


class TrainRequest(BaseModel):
    csv_files: list[str]
    algorithm: str = "knn"
    model_name: str = "my_model"


@router.get("/algorithms")
def list_algorithms():
    return {"algorithms": list(ALGORITHMS.keys())}


@router.post("/start")
async def start_training(req: TrainRequest, background_tasks: BackgroundTasks):
    status = get_status()
    if status["running"]:
        raise HTTPException(status_code=400, detail="Eğitim zaten devam ediyor")

    if req.algorithm not in ALGORITHMS:
        raise HTTPException(status_code=400, detail=f"Geçersiz algoritma: {req.algorithm}")

    for f in req.csv_files:
        if not (RECORDINGS_DIR / f).exists():
            raise HTTPException(status_code=404, detail=f"Dosya bulunamadı: {f}")

    async def run():
        await train(req.csv_files, req.algorithm, req.model_name)

    background_tasks.add_task(run)
    return {"ok": True, "message": "Eğitim başlatıldı"}


@router.get("/status")
def training_status():
    return get_status()


@router.get("/models")
def list_models():
    return {"models": predictor.list_models()}


class LoadModelRequest(BaseModel):
    model_name: str
    label_map: Optional[dict] = None


@router.post("/load-model")
def load_model(req: LoadModelRequest):
    try:
        predictor.load(req.model_name)
        if req.label_map:
            predictor.update_label_map({int(k): v for k, v in req.label_map.items()})
        return {"ok": True, "model": req.model_name}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/active-model")
def active_model():
    return {
        "loaded": predictor.is_loaded,
        "model": predictor.active_model,
        "classes": predictor.classes,
    }
