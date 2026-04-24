import asyncio
import serial
import serial.tools.list_ports
from typing import Optional, Callable
import time

from config import SERIAL_BAUD, SERIAL_TIMEOUT, NUM_CHANNELS


def list_ports() -> list[dict]:
    ports = serial.tools.list_ports.comports()
    result = []
    for p in ports:
        result.append({
            "device": p.device,
            "description": p.description or "Unknown",
            "hwid": p.hwid or "",
            "manufacturer": p.manufacturer or "",
        })
    return result


def parse_line(line: str) -> Optional[dict]:
    line = line.strip()
    if not line.startswith("start;"):
        return None
    if "Sensor Board not inserted" in line:
        return None

    parts = line.replace("start;", "").split(";")
    # Expect 64 channels + temperature + humidity = 66 values
    if len(parts) < 66:
        return None

    try:
        channels = [float(parts[i]) for i in range(NUM_CHANNELS)]
        temperature = float(parts[64])
        humidity = float(parts[65])
        return {
            "channels": channels,
            "temperature": temperature,
            "humidity": humidity,
            "timestamp": time.time(),
        }
    except (ValueError, IndexError):
        return None


class SensorReader:
    def __init__(self):
        self._serial: Optional[serial.Serial] = None
        self._port: Optional[str] = None
        self._running = False
        self._callbacks: list[Callable] = []

    @property
    def is_connected(self) -> bool:
        return self._serial is not None and self._serial.is_open

    @property
    def port(self) -> Optional[str]:
        return self._port

    def connect(self, port: str) -> bool:
        try:
            if self._serial and self._serial.is_open:
                self._serial.close()
            self._serial = serial.Serial(port, baudrate=SERIAL_BAUD, timeout=SERIAL_TIMEOUT)
            self._port = port
            # Request firmware info
            self._serial.write(b"G\n")
            return True
        except serial.SerialException as e:
            self._serial = None
            self._port = None
            raise RuntimeError(f"Port açılamadı: {e}")

    def disconnect(self):
        self._running = False
        if self._serial and self._serial.is_open:
            self._serial.close()
        self._serial = None
        self._port = None

    def add_callback(self, cb: Callable):
        self._callbacks.append(cb)

    def remove_callback(self, cb: Callable):
        self._callbacks.discard(cb) if hasattr(self._callbacks, "discard") else None
        if cb in self._callbacks:
            self._callbacks.remove(cb)

    async def stream(self):
        self._running = True
        loop = asyncio.get_event_loop()
        while self._running and self._serial and self._serial.is_open:
            try:
                if self._serial.in_waiting:
                    raw = await loop.run_in_executor(None, self._serial.readline)
                    line = raw.decode("utf-8", errors="replace")
                    parsed = parse_line(line)
                    if parsed:
                        for cb in list(self._callbacks):
                            await cb(parsed)
                else:
                    await asyncio.sleep(0.05)
            except Exception:
                await asyncio.sleep(0.1)


sensor_reader = SensorReader()
