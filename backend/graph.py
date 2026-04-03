"""LangGraph agent definition for the Artemis II assistant."""
from typing import Annotated, TypedDict

from langchain_openai import ChatOpenAI
from langchain_core.messages import AnyMessage, SystemMessage, ToolMessage
from langgraph.graph import START, StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.memory import MemorySaver

from tools.horizons import horizons_query
from tools.telemetry import read_telemetry, inspect_telemetry
from tools.web_search import web_search
from tools.calculator import calculate
from tools.livefeed import analyze_live_feed
from tools.dsn import dsn_status
from tools.tdrs import tdrs_status
from tools.timeline import mission_timeline, get_mission_context_string

SYSTEM_PROMPT_TEMPLATE = """You are an AI assistant for the Artemis II mission trajectory viewer — a real-time 3D visualization of NASA's Artemis II crewed lunar flyby mission.

Key mission facts:
- Launch: April 1, 2026 at 22:35:12 UTC from LC-39B, Kennedy Space Center
- Crew: Reid Wiseman (CDR), Victor Glover (pilot), Christina Koch (MS), Jeremy Hansen (MS, CSA)
- Mission duration: ~10 days (splashdown ~April 11)
- Spacecraft NAIF ID: -1024 (for Horizons queries)
- Moon NAIF ID: 301
- Reference frame: ICRF, Earth-centered
- The viewer shows Earth, Moon, the full predicted trajectory, and Orion's current position

{mission_context}

You have tools to:
1. Query JPL Horizons for ephemeris data (positions, velocities, distances)
2. Read live telemetry from the ground control system
3. Search the web for mission news and orbital mechanics info
4. Analyze screenshots of the 3D viewer
5. Check the mission timeline and current phase
6. Capture and analyze a frame from the NASA YouTube live broadcast
7. Calculate math expressions with orbital mechanics constants
8. Query DSN and TDRS network status

IMPORTANT RULES:
- ALWAYS check the mission timeline context above before describing what phase the mission is in.
- NEVER say the lunar flyby has happened if MET is less than 5 days.
- NEVER say the spacecraft is returning if the outbound coast hasn't completed.
- When you use analyze_live_feed, you will receive an actual image to analyze. Describe ONLY what you see — do NOT hallucinate or guess what the image shows.
- When reporting distances, provide both km and miles.
- When reporting speeds, provide both km/s and mph.
- Keep answers concise but informative. Use markdown formatting."""

IMAGE_TOOL_MARKER = "__IMAGE_TOOL_RESULT__"

# Default model — near-free on OpenRouter ($0.10/M tokens), reliable tool use + vision
DEFAULT_MODEL = "google/gemini-2.0-flash-001"


class AgentState(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]


def make_image_aware_tool_node(all_tools):
    """Create a tool node that converts image tool results into multimodal ToolMessages."""
    base_node = ToolNode(all_tools)

    async def image_aware_tools(state: AgentState):
        result = await base_node.ainvoke(state)

        new_messages = []
        for msg in result.get("messages", []):
            if isinstance(msg, ToolMessage) and isinstance(msg.content, str) and msg.content.startswith(IMAGE_TOOL_MARKER):
                lines = msg.content.split("\n", 2)
                question = lines[1] if len(lines) > 1 else "Describe this image"
                b64_data = lines[2] if len(lines) > 2 else ""

                if b64_data:
                    multimodal_content = [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{b64_data}",
                            },
                        },
                        {
                            "type": "text",
                            "text": f"This is a captured frame from the NASA YouTube live broadcast. {question}",
                        },
                    ]
                    new_messages.append(ToolMessage(
                        content=multimodal_content,
                        tool_call_id=msg.tool_call_id,
                        name=msg.name,
                    ))
                else:
                    new_messages.append(msg)
            else:
                new_messages.append(msg)

        return {"messages": new_messages}

    return image_aware_tools


def build_graph(extra_tools=None):
    """Build and compile the LangGraph agent."""
    import os
    from dotenv import load_dotenv
    load_dotenv()

    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY not set. Chat assistant is unavailable.")
    model_name = os.getenv("OPENROUTER_MODEL", DEFAULT_MODEL)

    model = ChatOpenAI(
        model=model_name,
        api_key=api_key,
        base_url="https://openrouter.ai/api/v1",
        max_tokens=4096,
        default_headers={
            "HTTP-Referer": "https://github.com/apshoemaker/aii",
            "X-Title": "aii - Artemis II Tracker",
        },
    )

    all_tools = [horizons_query, read_telemetry, inspect_telemetry, web_search, mission_timeline, calculate, analyze_live_feed, dsn_status, tdrs_status]
    if extra_tools:
        all_tools.extend(extra_tools)

    model_with_tools = model.bind_tools(all_tools)

    def agent_node(state: AgentState):
        messages = state["messages"]

        context = get_mission_context_string()
        system_prompt = SYSTEM_PROMPT_TEMPLATE.format(mission_context=context)

        filtered = [m for m in messages if not isinstance(m, SystemMessage)]
        filtered = [SystemMessage(content=system_prompt)] + filtered

        response = model_with_tools.invoke(filtered)
        return {"messages": [response]}

    graph = StateGraph(AgentState)
    graph.add_node("agent", agent_node)
    graph.add_node("tools", make_image_aware_tool_node(all_tools))

    graph.add_edge(START, "agent")
    graph.add_conditional_edges("agent", tools_condition)
    graph.add_edge("tools", "agent")

    return graph.compile(checkpointer=MemorySaver())


def get_default_graph():
    return build_graph()
