import asyncio
import random
import time
import math
from typing import Callable

NUM_CHANNELS = 64

_BASE = [
    150000, 152000, 160000, 159000, 159000, 680000, 672000, 673000,
    21000, 21000, 21000, 74000, 74000, 74000, 96000, 96000,
    35000, 35000, 15000, 15000, 15000, 5600, 5600, 5600,
    8500, 8500, 8500, 10700, 10700, 10700, 25000, 25000,
    33000, 33000, 26000, 26000, 26000, 12700, 12700, 12700,
    118000, 118000, 119000, 12500, 12500, 12500, 28800, 28800,
    19000, 19000, 5300, 5300, 5300, 13300, 13300, 13300,
    11900, 11900, 11900, 9500, 9500, 9500, 47000, 47000,
]


class SensorSimulator:
    def __init__(self):
        self._running = False
        self._callbacks: list[Callable] = []
        self._t = 0

    @property
    def is_connected(self) -> bool:
        return self._running

    def add_callback(self, cb: Callable):
        self._callbacks.append(cb)

    def remove_callback(self, cb: Callable):
        if cb in self._callbacks:
            self._callbacks.remove(cb)

    async def stream(self):
        self._running = True
        while self._running:
            self._t += 1
            channels = []
            for i, base in enumerate(_BASE):
                noise = random.gauss(0, base * 0.005)
                drift = math.sin(self._t * 0.05 + i * 0.3) * base * 0.02
                channels.append(round(base + noise + drift, 1))

            data = {
                "channels": channels,
                "temperature": round(25.0 + random.gauss(0, 0.2), 2),
                "humidity": round(50.0 + random.gauss(0, 0.5), 2),
                "timestamp": time.time(),
                "simulated": True,
            }

            for cb in list(self._callbacks):
                await cb(data)

            await asyncio.sleep(1.8)

    def stop(self):
        self._running = False


simulator = SensorSimulator()
