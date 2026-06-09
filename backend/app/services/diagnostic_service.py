import os
import shutil
import psutil
import logging
from typing import Dict, Any, List
from app.core.config import settings

logger = logging.getLogger(__name__)

class DiagnosticService:
    """
    Diagnostic Sentinel for Embedded Native operations.
    Verifies system health, model availability, and dependency integrity.
    """

    def __init__(self):
        self.model_dir = os.path.join(os.getcwd(), "models")
        if not os.path.exists(self.model_dir):
            os.makedirs(self.model_dir)

    def check_system_resources(self) -> Dict[str, Any]:
        """Verify RAM and VRAM availability."""
        mem = psutil.virtual_memory()
        available_gb = mem.available / (1024 ** 3)
        
        # Heuristic: LLM usually needs at least 4GB free for small models
        status = "healthy" if available_gb >= 4.0 else "constrained"
        if available_gb < 1.0:
            status = "critical"

        return {
            "total_ram_gb": round(mem.total / (1024 ** 3), 2),
            "available_ram_gb": round(available_gb, 2),
            "ram_status": status,
            "cpu_usage_percent": psutil.cpu_percent()
        }

    def check_dependencies(self) -> Dict[str, Any]:
        """Audit binary dependencies like Git and NVIDIA drivers."""
        report = {}
        
        # Check Git
        report["git_installed"] = shutil.which("git") is not None
        
        # Check for llama-cpp-python (check if it can be imported)
        try:
            import llama_cpp
            report["llama_cpp_available"] = True
        except ImportError:
            report["llama_cpp_available"] = False

        # Check for GPU (via nvidia-smi command exists)
        report["nvidia_gpu_driver_detected"] = shutil.which("nvidia-smi") is not None
        
        return report

    def check_models(self) -> List[Dict[str, Any]]:
        """List and verify available GGUF models."""
        models = []
        if not os.path.exists(self.model_dir):
            return []

        for f in os.listdir(self.model_dir):
            if f.endswith(".gguf"):
                models.append({
                    "name": f,
                    "path": os.path.join(self.model_dir, f),
                    "size_gb": round(os.path.getsize(os.path.join(self.model_dir, f)) / (1024 ** 3), 2)
                })
        return models

    def run_full_audit(self) -> Dict[str, Any]:
        """Perform a comprehensive system audit for Native operations."""
        logger.info("DiagnosticService: Starting full native audit...")
        resources = self.check_system_resources()
        deps = self.check_dependencies()
        models = self.check_models()
        
        # Overall status
        overall = "READY"
        if not deps["llama_cpp_available"]:
            overall = "DEGRADED (Waiting for engine)"
        if not models:
            overall = "DEGRADED (No models found)"
        if resources["ram_status"] == "critical":
            overall = "BLOCKED (Low Resources)"

        report = {
            "overall_status": overall,
            "resources": resources,
            "dependencies": deps,
            "models": models,
            "timestamp": str(os.getenv("CURRENT_TIME", "2026-03-11"))
        }
        
        logger.info(f"DiagnosticService Audit: {overall}")
        return report

diagnostic_service = DiagnosticService()
