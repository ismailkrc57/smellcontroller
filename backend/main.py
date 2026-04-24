from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from api.routes.sensor import router as sensor_router
from api.routes.recording import router as recording_router
from api.routes.training import router as training_router
from api.routes.detection import router as detection_router
from api.websocket import websocket_endpoint

app = FastAPI(title="SmellController API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sensor_router)
app.include_router(recording_router)
app.include_router(training_router)
app.include_router(detection_router)


@app.websocket("/ws/live")
async def ws_live(ws: WebSocket):
    await websocket_endpoint(ws)


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}
