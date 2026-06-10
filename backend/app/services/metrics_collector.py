import asyncio
import psutil
import time
from datetime import datetime
from collections import deque
from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)

class MetricsCollector:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MetricsCollector, cls).__new__(cls)
            cls._instance.initialized = False
        return cls._instance

    def __init__(self):
        if self.initialized:
            return
        
        self.history_length = 60  # Keep last 60 data points (e.g. 5 minutes if 5s interval)
        self.interval = 5  # Collect every 5 seconds
        
        # Time-series data buffers
        self.cpu_history: deque = deque(maxlen=self.history_length)
        self.memory_history: deque = deque(maxlen=self.history_length)
        self.request_history: deque = deque(maxlen=self.history_length)
        self.latency_history: deque = deque(maxlen=self.history_length)
        
        # Current counters
        self.total_requests = 0
        self.active_connections = 0
        self.error_count = 0
        self.start_time = datetime.utcnow()
        
        self.running = False
        self.initialized = True

    async def start_collection(self):
        """Start the background metrics collection loop."""
        if self.running:
            return
            
        self.running = True
        logger.info("Starting Metrics Collector...")
        
        while self.running:
            try:
                self._collect_snapshot()
            except Exception as e:
                logger.error(f"Error collecting metrics: {e}")
            
            await asyncio.sleep(self.interval)

    def stop_collection(self):
        self.running = False

    def _collect_snapshot(self):
        """Capture current system state."""
        timestamp = datetime.utcnow().isoformat()
        
        # System Resources
        cpu = psutil.cpu_percent(interval=None)
        memory = psutil.virtual_memory().percent
        
        # Store in history
        self.cpu_history.append({"time": timestamp, "value": cpu})
        self.memory_history.append({"time": timestamp, "value": memory})
        
        # We can also snapshot current request rate if we were tracking it per-second
        # For now, just logging system stats

    def record_request(self):
        """Increment request counter."""
        self.total_requests += 1

    def record_error(self):
        """Increment error counter."""
        self.error_count += 1
        
    def get_metrics(self) -> Dict[str, Any]:
        """Return current metrics and history."""
        return {
            "uptime_seconds": (datetime.utcnow() - self.start_time).total_seconds(),
            "resources": {
                "cpu_current": psutil.cpu_percent(interval=None),
                "memory_current": psutil.virtual_memory().percent,
                "disk_usage": psutil.disk_usage('/').percent
            },
            "throughput": {
                "total_requests": self.total_requests,
                "error_rate": (self.error_count / self.total_requests * 100) if self.total_requests > 0 else 0,
                "error_count": self.error_count
            },
            "history": {
                "cpu": list(self.cpu_history),
                "memory": list(self.memory_history)
            }
        }

# Global instance
metrics_collector = MetricsCollector()
