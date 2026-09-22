import time
import uuid
import json
from typing import Optional, Dict, Any

class Span:
    """Representa um passo na árvore de raciocínio do agente."""
    def __init__(self, name: str, parent_id: Optional[str] = None):
        self.span_id = str(uuid.uuid4())
        self.parent_id = parent_id
        self.name = name
        self.start_time = time.time()
        self.end_time: Optional[float] = None
        self.thoughts = []
        self.metrics = {}

    def log_thought(self, content: str):
        """Registra o pensamento ou decisão gerada pela IA."""
        self.thoughts.append({
            "timestamp": time.time(),
            "content": content
        })
        print(f"[AgentTrace] 🧠 Thought logged: {content[:60]}...")

    def set_metric(self, key: str, value: Any):
        """Registra métricas como tokens usados ou latência."""
        self.metrics[key] = value

    def end(self):
        self.end_time = time.time()
        duration = round(self.end_time - self.start_time, 4)
        print(f"[AgentTrace] ⏱️ Span '{self.name}' completed in {duration}s")


class AgentTrace:
    """Cliente principal da plataforma de observabilidade."""
    def __init__(self, api_key: str = "dev_key"):
        self.api_key = api_key
        print(f"[AgentTrace] Initialized SDK (API Key: {self.api_key[:4]}***)")

    def trace_agent(self, name: str):
        """Decorador para rastrear execuções de funções de agentes."""
        def decorator(func):
            def wrapper(*args, **kwargs):
                print(f"\n[AgentTrace] 🚀 Starting trace for Agent: '{name}'")
                result = func(*args, **kwargs)
                print(f"[AgentTrace] ✅ Finished trace for Agent: '{name}'\n")
                return result
            return wrapper
        return decorator

    def span(self, name: str) -> Span:
        return Span(name=name)
