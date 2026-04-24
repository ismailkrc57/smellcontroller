import asyncio
import csv
import time
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from config import RECORDINGS_DIR
from api.websocket import manager
from sensor.reader import sensor_reader
from sensor.simulator import simulator

router = APIRouter(prefix="/recording", tags=["recording"])

_active: dict = {
    "running": False,
    "label": None,
    "rows": [],
    "start_time": None,
    "file": None,
}


async def _record_callback(parsed: dict):
    if _active["running"]:
        row = parsed["channels"] + [parsed["temperature"], parsed["humidity"], _active["label"]]
        _active["rows"].append(row)


@router.get("/list")
def list_recordings():
    files = []
    for f in sorted(RECORDINGS_DIR.glob("*.csv"), key=lambda x: x.stat().st_mtime, reverse=True):
        size_kb = round(f.stat().st_size / 1024, 1)
        files.append({"name": f.name, "size_kb": size_kb})
    return {"files": files}


class StartRequest(BaseModel):
    label: str


@router.post("/start")
async def start_recording(req: StartRequest):
    if _active["running"]:
        raise HTTPException(status_code=400, detail="Kayıt zaten devam ediyor")
    if manager.mode == "idle":
        raise HTTPException(status_code=400, detail="Önce sensörü bağlayın")

    _active["running"] = True
    _active["label"] = req.label
    _active["rows"] = []
    _active["start_time"] = time.time()

    if manager.mode == "live":
        sensor_reader.add_callback(_record_callback)
    else:
        simulator.add_callback(_record_callback)

    return {"ok": True, "label": req.label}


@router.post("/stop")
async def stop_recording():
    if not _active["running"]:
        raise HTTPException(status_code=400, detail="Aktif kayıt yok")

    _active["running"] = False

    if manager.mode == "live":
        sensor_reader.remove_callback(_record_callback)
    else:
        simulator.remove_callback(_record_callback)

    rows = _active["rows"]
    label = _active["label"]

    if not rows:
        return {"ok": False, "message": "Kaydedilecek veri yok"}

    ts = time.strftime("%Y%m%d_%H%M%S")
    safe_label = label.replace(" ", "_").replace("/", "_")
    filename = f"sensor_data_{safe_label}_{ts}.csv"
    filepath = RECORDINGS_DIR / filename

    headers = [f"ch{i+1}" for i in range(64)] + ["temperature", "humidity", "label"]
    with open(filepath, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)

    return {"ok": True, "file": filename, "rows": len(rows), "duration": round(time.time() - _active["start_time"], 1)}


@router.delete("/{filename}")
def delete_recording(filename: str):
    path = RECORDINGS_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    path.unlink()
    return {"ok": True}


@router.get("/download/{filename}")
def download_recording(filename: str):
    path = RECORDINGS_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    return FileResponse(path, media_type="text/csv", filename=filename)


@router.get("/status")
def recording_status():
    duration = round(time.time() - _active["start_time"], 1) if _active["start_time"] and _active["running"] else 0
    return {
        "running": _active["running"],
        "label": _active["label"],
        "samples": len(_active["rows"]),
        "duration": duration,
    }
