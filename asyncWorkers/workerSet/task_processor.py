

import time
from typing import Any, Dict

class TaskProcessor:
    def __init__(self):
        self._handlers: Dict[str, Callable[..., Any]] = {}

    def register(self, name: str, handler: Callable[..., Any]):
        self._handlers[name] = handler

    def unregister(self, name: str):
        if name in self._handlers:
            del self._handlers[name]

    def process(self, task: Dict[str, Any]) -> Any:
        name = task.get("type")
        payload = task.get("payload", {})
        handler = self._handlers.get(name)
        if not handler:
            raise ValueError(f"No handler registered for task type: {name}")
        start = time.time()
        result = handler(**payload)
        duration = time.time() - start
        return {"task": name, "duration": duration, "result": result}
