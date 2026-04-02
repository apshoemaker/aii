"""Tool 3: Web search via Tavily."""
import os

from langchain_core.tools import tool


def format_search_results(results: list[dict]) -> str:
    lines = []
    for i, r in enumerate(results, 1):
        title = r.get("title", "No title")
        url = r.get("url", "")
        snippet = r.get("content", r.get("snippet", ""))
        lines.append(f"{i}. **{title}**")
        lines.append(f"   {url}")
        lines.append(f"   {snippet}")
        lines.append("")
    return "\n".join(lines) if lines else "No results found."


@tool
async def web_search(query: str) -> str:
    """Search the web for information about the Artemis II mission, orbital mechanics, or NASA updates.

    Args:
        query: The search query string.
    """
    from tavily import TavilyClient

    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        return "Web search unavailable: TAVILY_API_KEY not configured."

    client = TavilyClient(api_key=api_key)
    response = client.search(query=query, max_results=5)
    results = response.get("results", [])
    return format_search_results(results)
