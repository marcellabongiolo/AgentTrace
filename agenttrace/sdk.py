import time
import uuid
import json
import requests
from typing import Optional, Dict, Any, List

class Span:
    """Representa um passo individual na árvore de raciocínio do agente."""
    def __init__(self, name: str, parent_id: Optional[str] = None):
        self.span_id = str(uuid.uuid4())
        self.parent_id = parent_id
        self.name = name
        self.start_time = time.time()
        self.end_time: Optional[float] = None
        self.thoughts: List[Dict[str, Any]] = []
        self.metrics: Dict[str, Any] = {}

    def log_thought(self, content: str):
        """Registra o raciocínio ou decisão da IA."""
        self.thoughts.append({
            "timestamp": time.time(),
            "content": content
        })
        print(f"[AgentTrace] 🧠 Thought: {content[:60]}...")

    def set_metric(self, key: str, value: Any):
        """Registra métricas como tokens, latência ou custo."""
        self.metrics[key] = value

    def end(self):
        self.end_time = time.time()
        duration = round(self.end_time - self.start_time, 4)
        print(f"[AgentTrace] ⏱️ Span '{self.name}' concluído em {duration}s")

    def to_dict((self) -> Dict[str, Any]:
        """Converte o span para formato JSON/Dicionário."""
        return {
            "span_id": self.span_id,
            "parent_id": self.parent_id,
            "name": self.name,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "duration": round((self.end_time - self.start_time), 4) if self.end_time else None,
            "thoughts": self.thoughts,
            "metrics": self.metrics,
        }

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.end()


class AgentTrace:
    """Cliente de observabilidade para envio de dados de telemetria."""
    def __init__(self, api_key: str = "dev_key", endpoint: str = "http://localhost:8000/api/v1/traces"):
        self.api_key = api_key
        self.endpoint = endpoint
        print(f"[AgentTrace] SDK Inicializado | Endpoint: {self.endpoint}")

    def send_trace(self, trace_data: Dict[str, Any]):
        """Envia os dados do rastro para o backend da plataforma."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        try:
            # Em produção envia HTTP POST, em dev simula envio
            print(f"[AgentTrace] 📡 Enviando rastro {trace_data['trace_id']} para o servidor...")
        except Exception as e:
            print(f"[AgentTrace] ⚠️ Falha ao transmitir telemetria: {e}")

    def trace_agent(self, name: str):
        """Decorador principal para rastrear a execução de um agente."""
        def decorator(func):
            def wrapper(*args, **kwargs):
                trace_id = str(uuid.uuid4())
                print(f"\n[AgentTrace] 🚀 Iniciando Trace [{trace_id}] para o Agente: '{name}'")
                
                start_time = time.time()
                result = func(*args, **kwargs)
                total_duration = round(time.time() - start_time, 4)
                
                print(f"[AgentTrace] ✅ Trace finalizado em {total_duration}s\n")
                return result
            return wrapper
        return decorator

    def span(self, name: str) -> Span:
        return Span(name=name)
