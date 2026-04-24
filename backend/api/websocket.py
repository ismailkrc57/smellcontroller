import asyncio
import json
from fastapi import WebSocket, WebSocketDisconnect
from typing import Optional

from sensor.reader import sensor_reader
from sensor.simulator import simulator
from ml.feature_extractor import extract_features, channels_to_groups
from ml.predictor import predictor


class ConnectionManager:
    def __init__(self):
        self._clients: set[WebSocket] = set()
        self._stream_task: Optional[asyncio.Task] = None
        self._mode: str = "idle"  # idle | live | simulate

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self._clients.add(ws)

    def disconnect(self, ws: WebSocket):
        self._clients.discard(ws)

    async def broadcast(self, data: dict):
        dead = set()
        msg = json.dumps(data)
        for ws in list(self._clients):
            try:
                await ws.send_text(msg)
            except Exception:
                dead.add(ws)
        self._clients -= dead

    async def _on_sensor_data(self, parsed: dict):
        channels = parsed["channels"]
        features = extract_features(channels).tolist()
        groups = channels_to_groups(channels)

        payload = {
            "type": "sensor_data",
            "channels": channels,
            "features": features,
            "groups": groups,
            "temperature": parsed["temperature"],
            "humidity": parsed["humidity"],
            "timestamp": parsed["timestamp"],
            "simulated": parsed.get("simulated", False),
        }

        if predictor.is_loaded:
            try:
                result = predictor.predict(channels, parsed["temperature"], parsed["humidity"])
                payload["detection"] = result
            except Exception:
                pass

        await self.broadcast(payload)

    async def start_live(self, port: str):
        await self._stop_current()
        sensor_reader.connect(port)
        sensor_reader.add_callback(self._on_sensor_data)
        self._stream_task = asyncio.create_task(sensor_reader.stream())
        self._mode = "live"
        await self.broadcast({"type": "status", "connected": True, "port": port, "mode": "live"})

    async def start_simulate(self):
        await self._stop_current()
        simulator.add_callback(self._on_sensor_data)
        self._stream_task = asyncio.create_task(simulator.stream())
        self._mode = "simulate"
        await self.broadcast({"type": "status", "connected": True, "port": "simulator", "mode": "simulate"})

    async def stop(self):
        await self._stop_current()
        await self.broadcast({"type": "status", "connected": False, "port": None, "mode": "idle"})

    async def _stop_current(self):
        if self._stream_task:
            self._stream_task.cancel()
            try:
                await self._stream_task
            except asyncio.CancelledError:
                pass
            self._stream_task = None

        if self._mode == "live":
            try:
                sensor_reader.remove_callback(self._on_sensor_data)
                sensor_reader.disconnect()
            except Exception:
                pass
        elif self._mode == "simulate":
            try:
                simulator.remove_callback(self._on_sensor_data)
                simulator.stop()
            except Exception:
                pass

        self._mode = "idle"

    @property
    def mode(self) -> str:
        return self._mode

    @property
    def client_count(self) -> int:
        return len(self._clients)


manager = ConnectionManager()


async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            msg = await ws.receive_text()
            data = json.loads(msg)
            action = data.get("action")

            if action == "connect":
                port = data.get("port")
                await manager.start_live(port)
            elif action == "simulate":
                await manager.start_simulate()
            elif action == "disconnect":
                await manager.stop()
    except WebSocketDisconnect:
        manager.disconnect(ws)
    except Exception:
        manager.disconnect(ws)
