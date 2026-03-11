import asyncio
from datetime import datetime
from typing import Any, AsyncGenerator
import json


class EventBus:
    """Simple in-process event bus for broadcasting agent events to WebSocket clients."""

    def __init__(self):
        self._queue: asyncio.Queue = asyncio.Queue(maxsize=500)

    async def publish(self, event_type: str, data: dict[str, Any]):
        event = {
            "type": event_type,
            "timestamp": datetime.utcnow().isoformat(),
            "data": data,
        }
        try:
            self._queue.put_nowait(event)
        except asyncio.QueueFull:
            # Drop oldest
            self._queue.get_nowait()
            self._queue.put_nowait(event)

    async def subscribe(self) -> AsyncGenerator[dict, None]:
        while True:
            event = await self._queue.get()
            yield event


event_bus = EventBus()
