
import threading
import queue
from typing import Callable, Any

class Worker(threading.Thread):
    def __init__(self, task_queue: queue.Queue, result_handler: Callable[[Any], None], *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.task_queue = task_queue
        self.result_handler = result_handler
        self._stop_event = threading.Event()

    def run(self):
        while not self._stop_event.is_set():
            try:
                func, args, kwargs = self.task_queue.get(timeout=1)
            except queue.Empty:
                continue
            try:
                result = func(*args, **kwargs)
                self.result_handler(result)
            except Exception as e:
                self.result_handler(e)
            finally:
                self.task_queue.task_done()

    def stop(self):
        self._stop_event.set()

class WorkerManager:
    def __init__(self, num_workers: int, result_handler: Callable[[Any], None]):
        self.task_queue = queue.Queue()
        self.workers = [
            Worker(self.task_queue, result_handler, daemon=True)
            for _ in range(num_workers)
        ]

    def start(self):
        for w in self.workers:
            w.start()

    def stop(self):
        for w in self.workers:
            w.stop()
        for w in self.workers:
            w.join()

    def submit(self, func: Callable, *args, **kwargs):
        self.task_queue.put((func, args, kwargs))

    def join(self):
        self.task_queue.join()
