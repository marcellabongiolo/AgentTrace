import time
from agenttrace.sdk import AgentTrace

# Inicializa o rastreador de testes
tracer = AgentTrace(api_key="at_live_123456789")

@tracer.trace_agent(name="Financial Analyst Bot")
def run_financial_agent(stock_ticker: str):
    # Simula um passo de decisão e execução do agente
    with tracer.span(name="Market Search") as span:
        span.log_thought(f"Fetching latest quarterly report for {stock_ticker}...")
        time.sleep(0.5)  # Simula tempo de resposta da API
        span.set_metric("tokens_used", 420)
        span.end()

    return f"Analysis for {stock_ticker} complete."

if __name__ == "__main__":
    run_financial_agent("AAPL")
