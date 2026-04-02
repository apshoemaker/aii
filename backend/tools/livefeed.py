"""Tool 8: NASA Live Feed frame capture and analysis.

Captures a single frame from the NASA YouTube live stream using yt-dlp + ffmpeg,
then returns it as base64 for Claude's vision analysis.
"""
import asyncio
import base64
import os
import tempfile

from langchain_core.tools import tool

YOUTUBE_URL = "https://www.youtube.com/watch?v=6RwfNBtepa4"


def build_ytdlp_command(url: str) -> list[str]:
    """Build yt-dlp command to extract the best stream URL."""
    return [
        "yt-dlp",
        "--get-url",
        "--format", "best[height<=720]",
        "--no-playlist",
        url,
    ]


def build_ffmpeg_command(stream_url: str, output_path: str) -> list[str]:
    """Build ffmpeg command to grab a single frame from a stream."""
    return [
        "ffmpeg",
        "-y",                    # overwrite output
        "-i", stream_url,
        "-frames:v", "1",       # grab exactly 1 frame
        "-q:v", "2",            # high quality JPEG
        "-vf", "scale=1280:-1", # cap width at 1280px
        output_path,
    ]


async def run_subprocess(cmd: list[str], timeout: float = 30.0) -> tuple[int, str, str]:
    """Run a subprocess asynchronously with timeout."""
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        return proc.returncode, stdout.decode(), stderr.decode()
    except asyncio.TimeoutError:
        proc.kill()
        await proc.communicate()
        return -1, "", "Process timed out"


def frame_to_base64(path: str) -> str | None:
    """Read an image file and return base64-encoded string."""
    try:
        with open(path, "rb") as f:
            data = f.read()
        if len(data) < 100:
            return None
        return base64.b64encode(data).decode("utf-8")
    except (FileNotFoundError, OSError):
        return None


async def capture_live_frame(url: str = YOUTUBE_URL) -> str:
    """Capture a single frame from the YouTube live stream.

    Returns either a descriptive string with base64 data reference,
    or an error message if capture fails.
    """
    # Step 1: Get stream URL via yt-dlp
    ytdlp_cmd = build_ytdlp_command(url)
    returncode, stdout, stderr = await run_subprocess(ytdlp_cmd, timeout=15.0)

    if returncode != 0:
        return f"Failed to extract stream URL from NASA live feed: {stderr.strip()}"

    stream_url = stdout.strip().split("\n")[0]
    if not stream_url:
        return "Failed to extract stream URL: yt-dlp returned empty output"

    # Step 2: Grab a frame via ffmpeg
    tmp = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
    tmp.close()

    try:
        ffmpeg_cmd = build_ffmpeg_command(stream_url, tmp.name)
        returncode, stdout, stderr = await run_subprocess(ffmpeg_cmd, timeout=15.0)

        if returncode != 0:
            return f"Failed to capture frame from live stream: {stderr.strip()}"

        # Step 3: Convert to base64
        b64 = frame_to_base64(tmp.name)
        if not b64:
            return "Failed to read captured frame — file may be empty or corrupt"

        return (
            f"[NASA Live Feed Frame Captured]\n"
            f"A single frame has been captured from the NASA YouTube live broadcast.\n"
            f"Base64 image data ({len(b64)} chars) is available for analysis.\n"
            f"IMAGE_DATA:{b64}"
        )
    finally:
        try:
            os.unlink(tmp.name)
        except OSError:
            pass


@tool
async def analyze_live_feed(question: str = "Describe what is currently being shown on the NASA live broadcast") -> str:
    """Capture and analyze a frame from the NASA YouTube live broadcast.
    Use this when the user asks about what NASA TV is showing, what's on the live feed,
    or wants to know what's happening in the broadcast.

    Args:
        question: What to analyze about the live feed frame.
    """
    result = await capture_live_frame()

    if "IMAGE_DATA:" in result:
        parts = result.split("IMAGE_DATA:")
        b64_data = parts[1]
        # Return a special marker that our custom tool node will convert
        # into a proper multimodal ToolMessage with image content blocks
        return f"__IMAGE_TOOL_RESULT__\n{question}\n{b64_data}"

    return f"Could not capture live feed: {result}"
