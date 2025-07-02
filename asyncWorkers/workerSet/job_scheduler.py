
import threading
import time
from typing import Callable, Any

class JobScheduler:
    def __init__(self, interval: float):
        self.interval = interval
        self._jobs: list[tuple[Callable[..., Any], tuple, dict]] = []
        self._timer: threading.Timer | None = None
        self._lock = threading.Lock()
        self._running = False

    def add_job(self, func: Callable, *args, **kwargs):
        with self._lock:
            self._jobs.append((func, args, kwargs))

    def remove_job(self, func: Callable):
        with self._lock:
            self._jobs = [(f, a, k) for f, a, k in self._jobs if f != func]

    def _run(self):
        with self._lock:
            for func, args, kwargs in self._jobs:
                try:
                    func(*args, **kwargs)
                except Exception:
                    pass
        if self._running:
            self._timer = threading.Timer(self.interval, self._run)
            self._timer.start()

    def start(self):
        if self._running:
            return
        self._running = True
        self._timer = threading.Timer(self.interval, self._run)
        self._timer.start()

    def stop(self):
        self._running = False
        if self._timer:
            self._timer.cancel()
            self._timer = None
