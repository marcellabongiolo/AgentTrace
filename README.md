```markdown
<div align="center">

# 🌲 AgentTrace (Open-Source AI Agent Observability)

**The open-source black box for autonomous AI agents.**  
Trace reasoning trees, debug failing execution loops, and enforce safety guardrails in real time.

[Quickstart](#quickstart) • [Features](#key-features) • [Architecture](#architecture) • [Documentation](#documentation) • [Discord](#)

</div>

---

## 🛑 The Problem

When autonomous AI agents run in production, standard logging fails. Agents operate in dynamic loops—executing tools, re-evaluating context, and branching logic. When an agent enters an infinite loop, hallucinates a tool argument, or burns through tokens, traditional logs offer no visibility into **why** the decision was made.

## ✨ Key Features

- **🌳 Thought Tree Visualization:** View agent execution as interactive decision trees, not flat lines of text.
- **⏱️ Time-Travel Debugging:** Replay any historic execution step, modify prompts or variables, and branch execution deterministically.
- **🛑 Real-Time Guardrails & Kill-Switches:** Automatically halt execution when agents exceed budget limits or enter recursive loops.
- **⚡ Low-Overhead SDK:** Asynchronous gRPC telemetry adds $<2\text{ms}$ latency overhead to your agent workflows.
- **🔌 Native Integrations:** Out-of-the-box support for LangChain, AutoGen, CrewAI, and native OpenAI/Anthropic APIs.

---

## 🏗️ Architecture Overview


```

┌─────────────────┐       gRPC       ┌────────────────────────┐
│  AI Agent App   │ ───────────────> │ AgentTrace Ingestion   │
│  (Python/Node)  │  (Async Stream)  └───────────┬────────────┘
└─────────────────┘                              │
▼
┌────────────────────────┐
│   Stream Processor     │
│  (Guardrail Engine)    │
└───────────┬────────────┘
│
┌────────────────────────┴────────────────────────┐
▼                                                 ▼
┌─────────────────────┐                           ┌─────────────────────┐
│  ClickHouse Engine  │                           │   Graph Database    │
│ (Metrics & Latency) │                           │  (Reasoning Trees)  │
└─────────────────────┘                           └─────────────────────┘

```

---

## 🚀 Quickstart

### 1. Install the SDK

```bash
pip install agenttrace

```

### 2. Initialize and Instrument Your Agent

```python
from agenttrace import AgentTrace
from openai import OpenAI

# Initialize AgentTrace client
tracer = AgentTrace(api_key="your-agenttrace-key")
client = OpenAI()

@tracer.trace_agent(name="Financial Analyst Agent")
def run_agent(user_query: str):
    # Start a root reasoning span
    with tracer.span(name="Market Data Retrieval") as span:
        prompt = f"Analyze market data for: {user_query}"
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}]
        )
        
        # Log thoughts, tool calls, and observations
        span.log_thought(response.choices[0].message.content)
        span.set_metric("tokens_used", response.usage.total_tokens)

    return response

if __name__ == "__main__":
    run_agent("AAPL Quarterly Report")

```

---

## 📊 Self-Hosting via Docker Compose

To run the full AgentTrace observability stack locally:

```bash
git clone [https://github.com/your-org/agenttrace.git](https://github.com/your-org/agenttrace.git)
cd agenttrace
docker-compose up -d

```

Access the Web Dashboard at `http://localhost:3000`.

---

## 🛣️ Roadmap

* [x] Basic OpenTelemetry SDK for Python
* [x] Thought Tree rendering in Web UI
* [ ] Time-Travel Prompt Replay Engine
* [ ] TypeScript/Node.js SDK
* [ ] Automated Hallucination & Drift Detection

---

## 📄 License

AgentTrace is open-source software licensed under the [Apache 2.0 License](https://www.google.com/search?q=LICENSE&utm_source=gemini).

```

```
