import os
import time

from agenttrace import AgentTrace


tracer = AgentTrace(
    api_key=os.getenv("AGENTTRACE_API_KEY"),
    auto_export=os.getenv("AGENTTRACE_EXPORT", "0") == "1",
)


@tracer.trace_agent(name="Financial Analyst Bot")
def run_financial_agent(stock_ticker: str) -> str:
    with tracer.span(name="Market Search") as span:
        span.log_event(
            "tool_call",
            "Fetching a quarterly financial record",
            ticker=stock_ticker,
        )
        time.sleep(0.1)
        span.set_metric("tokens_used", 420)
        span.set_metric("latency_ms", 100)

    with tracer.span(name="Growth Calculation") as span:
        span.log_event(
            "decision",
            "Application selected year-over-year revenue growth as a comparison metric",
        )
        span.set_metric("calculation_count", 1)

    return f"Analysis for {stock_ticker} complete."


if __name__ == "__main__":
    print(run_financial_agent("AAPL"))
    if tracer.last_trace is not None:
        print(tracer.last_trace.to_dict())
