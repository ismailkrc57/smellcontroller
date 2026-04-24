from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sensor.reader import list_ports
from api.websocket import manager

router = APIRouter(prefix="/sensor", tags=["sensor"])


class ConnectRequest(BaseModel):
    port: str


@router.get("/ports")
def get_ports():
    return {"ports": list_ports()}


@router.get("/status")
def get_status():
    return {
        "connected": manager.mode != "idle",
        "mode": manager.mode,
        "clients": manager.client_count,
    }


@router.post("/connect")
async def connect(req: ConnectRequest):
    try:
        await manager.start_live(req.port)
        return {"ok": True, "port": req.port}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/simulate")
async def start_simulate():
    await manager.start_simulate()
    return {"ok": True, "mode": "simulate"}


@router.post("/disconnect")
async def disconnect():
    await manager.stop()
    return {"ok": True}
