"""Tool 4: Scene screenshot capture and analysis."""
import asyncio

from langchain_core.tools import tool


async def wait_for_screenshot(queue: asyncio.Queue, timeout: float = 10.0) -> str | None:
    try:
        return await asyncio.wait_for(queue.get(), timeout=timeout)
    except asyncio.TimeoutError:
        return None


def build_image_content_block(b64_data: str, question: str) -> str:
    return (
        f"[Screenshot of the Artemis II 3D trajectory viewer]\n"
        f"User question about the screenshot: {question}\n"
        f"(Base64 image data available for analysis)"
    )


def create_screenshot_tool(screenshot_queue: asyncio.Queue, request_callback):
    """Create a screenshot tool bound to a specific WebSocket connection's queue.

    Args:
        screenshot_queue: asyncio.Queue that receives base64 PNG data from the client.
        request_callback: async callable that sends a screenshot_request to the client.
    """

    @tool
    async def analyze_screenshot(question: str = "Describe what you see in the 3D viewer") -> str:
        """Capture and analyze the current 3D view of the Artemis II trajectory viewer.
        Use this when the user asks about what's visible on screen or wants you to describe the scene.

        Args:
            question: What to analyze about the screenshot.
        """
        # Ask the client to capture the canvas
        await request_callback()

        # Wait for the screenshot data
        b64_data = await wait_for_screenshot(screenshot_queue)
        if b64_data is None:
            return "Screenshot capture timed out. The 3D viewer may not be responding."

        return build_image_content_block(b64_data, question)

    return analyze_screenshot
