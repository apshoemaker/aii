import asyncio
import pytest


@pytest.mark.asyncio
async def test_screenshot_queue_timeout():
    from tools.screenshot import wait_for_screenshot
    q = asyncio.Queue()
    # Should timeout after 1 second (we pass a short timeout for testing)
    result = await wait_for_screenshot(q, timeout=0.1)
    assert result is None


@pytest.mark.asyncio
async def test_screenshot_queue_receives_data():
    from tools.screenshot import wait_for_screenshot
    q = asyncio.Queue()
    test_data = "iVBORw0KGgoAAAANSUhEUg=="  # fake b64
    await q.put(test_data)
    result = await wait_for_screenshot(q, timeout=1.0)
    assert result == test_data


def test_build_image_content_block():
    from tools.screenshot import build_image_content_block
    b64 = "iVBORw0KGgoAAAANSUhEUg=="
    block = build_image_content_block(b64, "What am I looking at?")
    assert isinstance(block, str)
    assert "image" in block.lower() or "screenshot" in block.lower()
